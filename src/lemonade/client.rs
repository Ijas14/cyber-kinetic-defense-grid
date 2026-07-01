use crate::compiler::violation::Violation;
use crate::lemonade::config::LlmConfig;
use crate::server::ServerEvent;
use reqwest::Client;
use serde_json::json;
use tokio::sync::broadcast;
use tokio::sync::RwLock;
use futures::StreamExt;
use std::sync::Arc;

pub struct LemonadeClient {
    client: Client,
    /// Shared, live-editable configuration.
    pub config: Arc<RwLock<LlmConfig>>,
}

impl LemonadeClient {
    pub fn new(config: Arc<RwLock<LlmConfig>>) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    /// Sends a tiny dummy request to force model weights into VRAM.
    pub async fn warmup(&self) -> Result<(), String> {
        let cfg = self.config.read().await;
        let model = cfg.model.clone();
        let endpoint = cfg.endpoint.clone();
        drop(cfg);

        println!("[LLM] model   : {}", model);
        println!("[LLM] endpoint: {}", endpoint);
        println!("[LLM] Warming up model (loading into VRAM)...");

        let request_body = json!({
            "model": model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 1
        });

        match self.client.post(&endpoint).json(&request_body).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    println!("[LLM] Model loaded into VRAM and ready.");
                    Ok(())
                } else {
                    let err_text = response.text().await.unwrap_or_default();
                    Err(format!("LLM server returned error: {}", err_text))
                }
            }
            Err(e) => Err(format!("Failed to connect to LLM server: {}", e)),
        }
    }

    /// Sends the unload request for the currently configured model.
    pub async fn unload(&self) {
        let model_name = self.config.read().await.model.clone();
        self.unload_by_name(&model_name).await;
    }

    /// Sends the unload request for a specific model name.
    /// Used when swapping models so the old model name is preserved.
    pub async fn unload_by_name(&self, model_name: &str) {
        let endpoint = self.config.read().await.endpoint.clone();
        println!("[LLM] Unloading model '{}' from VRAM...", model_name);

        let base_url = endpoint
            .trim_end_matches("/chat/completions")
            .trim_end_matches("/v1")
            .trim_end_matches('/');

        let unload_url = format!("{}/v1/unload", base_url);

        match self.client
            .post(&unload_url)
            .json(&json!({ "model_name": model_name }))
            .send()
            .await
        {
            Ok(resp) => println!("[LLM] Model unloaded (HTTP {}).", resp.status()),
            Err(e)   => eprintln!("[LLM] Unload request failed: {}", e),
        }
    }

    /// Spawns a task to stream LLM explanations for a violation across three personas sequentially.
    #[allow(clippy::collapsible_if)]
    pub fn explain_violation(
        &self,
        violation: &Violation,
        tx: broadcast::Sender<ServerEvent>,
    ) -> tokio::task::JoinHandle<()> {
        let client = self.client.clone();
        let config = self.config.clone();
        let prompt = format!(
            "An industrial control system detected a physical impossibility: \
             Violation: {} - {}\n\
             Explain why this physical state is impossible.",
            violation.code, violation.message
        );

        tokio::spawn(async move {
            let cfg = config.read().await;
            let model = cfg.model.clone();
            let endpoint = cfg.endpoint.clone();
            let temperature = cfg.temperature;
            let max_tokens = cfg.max_tokens;
            drop(cfg);

            let personas = vec![
                ("PhysicsAnalyst", "You are an industrial physics AI. Be extremely brief. Output exactly 2 bullet points under 80 words total: first bullet explains the violated physical law in one plain-English sentence; second bullet gives the key equation proving it is impossible, using LaTeX. No preamble."),
                ("IncidentCommander", "You are a SOC Incident Commander. Be extremely brief. Output exactly 2 bullet points under 80 words total: first bullet states the MITRE ATT&CK TTP and severity; second bullet gives one immediate containment action. No preamble, no filler."),
                ("FieldOperator", "You are a plant floor operator receiving an urgent alert. Be extremely brief and direct — no jargon, no preamble. Output exactly 2 bullet points: first bullet is the plain-English cause in one sentence; second bullet starts with 'IMMEDIATE ACTION:' and gives one specific physical step (valve, pump, or sensor to check). Strictly under 80 words total."),
            ];

            for (persona_id, system_prompt) in personas {
                let request_body = json!({
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": &prompt}
                    ],
                    "stream": true,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                });

                match client.post(&endpoint).json(&request_body).send().await {
                    Ok(response) => {
                        let mut stream = response.bytes_stream();
                        while let Some(chunk_result) = stream.next().await {
                            if let Ok(chunk) = chunk_result {
                                let text = String::from_utf8_lossy(&chunk);
                                for line in text.lines() {
                                    if line.starts_with("data: ") {
                                        let data = line.trim_start_matches("data: ");
                                        if data == "[DONE]" {
                                            let _ = tx.send(ServerEvent::PersonaExplanationChunk {
                                                persona_id: persona_id.to_string(),
                                                chunk: "[DONE]".to_string()
                                            });
                                            continue; // Don't break immediately to consume stream
                                        }
                                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                                            if let Some(content) = json
                                                .get("choices")
                                                .and_then(|c| c.get(0))
                                                .and_then(|c| c.get("delta"))
                                                .and_then(|d| d.get("content"))
                                                .and_then(|c| c.as_str())
                                            {
                                                let _ = tx.send(ServerEvent::PersonaExplanationChunk {
                                                    persona_id: persona_id.to_string(),
                                                    chunk: content.to_string()
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        let _ = tx.send(ServerEvent::PersonaExplanationChunk {
                            persona_id: persona_id.to_string(),
                            chunk: format!("\n[LLM Connection Error: {}]", e)
                        });
                    }
                }
                
                // Brief pause before next persona
                tokio::time::sleep(std::time::Duration::from_millis(250)).await;
            }
        })
    }
}

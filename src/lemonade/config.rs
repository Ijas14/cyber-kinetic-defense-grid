use serde::{Deserialize, Serialize};
use std::env;

/// Runtime-configurable LLM settings, loaded from env vars at startup.
/// Can be updated at runtime via the `/api/config` endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    pub model: String,
    pub endpoint: String,
    pub temperature: f64,
    pub max_tokens: u64,
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            model: env::var("CKDG_MODEL")
                .unwrap_or_else(|_| "Qwen3.5-2B-GGUF".to_string()),
            endpoint: env::var("CKDG_LLM_ENDPOINT")
                .unwrap_or_else(|_| "http://localhost:8000/v1/chat/completions".to_string()),
            temperature: env::var("CKDG_LLM_TEMPERATURE")
                .ok().and_then(|v| v.parse().ok()).unwrap_or(0.3),
            max_tokens: env::var("CKDG_LLM_MAX_TOKENS")
                .ok().and_then(|v| v.parse().ok()).unwrap_or(400),
        }
    }
}

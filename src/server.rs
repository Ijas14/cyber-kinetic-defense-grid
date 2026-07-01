use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex, RwLock};
use tower_http::services::ServeDir;
use std::time::Duration;

use crate::compiler::violation::Violation;
use crate::lemonade::config::LlmConfig;
use crate::physics::state::MachineState;
use crate::telemetry::replay::{ReplayEngine, AttackScenario};
use crate::lemonade::client::LemonadeClient;

#[derive(Clone, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum ServerEvent {
    StateUpdate(MachineState),
    ViolationDetected(Violation),
    PersonaExplanationChunk {
        persona_id: String,
        chunk: String,
    },
}

pub struct AppState {
    pub tx: broadcast::Sender<ServerEvent>,
    pub replay_engine: Arc<Mutex<ReplayEngine>>,
    pub llm_config: Arc<RwLock<LlmConfig>>,
    pub llm_client: Arc<LemonadeClient>,
}

pub async fn run_server() {
    let (tx, _rx) = broadcast::channel(100);

    let replay_engine = Arc::new(Mutex::new(ReplayEngine::new()));
    let llm_config = Arc::new(RwLock::new(LlmConfig::default()));
    let llm_client = Arc::new(LemonadeClient::new(llm_config.clone()));

    if let Err(e) = llm_client.warmup().await {
        eprintln!("\n[FATAL] Failed to load LLM model into VRAM: {}", e);
        eprintln!("Please ensure the Lemonade LLM server is running and the model is available.");
        std::process::exit(1);
    }

    let app_state = Arc::new(AppState {
        tx: tx.clone(),
        replay_engine: replay_engine.clone(),
        llm_config: llm_config.clone(),
        llm_client: llm_client.clone(),
    });

    // Physics Loop (60Hz) & Broadcast Loop (20Hz)
    let tx_clone = tx.clone();
    let replay_engine_clone = replay_engine.clone();
    let llm_client_loop = llm_client.clone();

    tokio::spawn(async move {
        let mut physics_interval = tokio::time::interval(Duration::from_millis(16)); // ~60Hz
        let mut broadcast_interval = tokio::time::interval(Duration::from_millis(50)); // 20Hz

        let mut last_state: Option<MachineState> = None;
        let mut active_violations: Vec<String> = Vec::new();
        let mut current_scenario = AttackScenario::None;
        let mut current_explanation_task: Option<tokio::task::JoinHandle<()>> = None;

        loop {
            tokio::select! {
                _ = physics_interval.tick() => {
                    let mut engine = replay_engine_clone.lock().await;
                    let current_state = engine.tick(16);

                    if engine.scenario != current_scenario {
                        active_violations.clear();
                        current_scenario = engine.scenario;
                        last_state = None;

                        if let Some(task) = current_explanation_task.take() {
                            task.abort();
                        }
                    }

                    let frame_violations = crate::compiler::engine::compile_frame(
                        &current_state,
                        last_state.as_ref()
                    );

                    let mut explained_this_frame = false;
                    for violation in frame_violations {
                        if !active_violations.contains(&violation.code.to_string()) {
                            active_violations.push(violation.code.to_string());
                            let _ = tx_clone.send(ServerEvent::ViolationDetected(violation.clone()));

                            if !explained_this_frame {
                                if let Some(task) = current_explanation_task.take() {
                                    task.abort();
                                }
                                current_explanation_task = Some(llm_client_loop.explain_violation(&violation, tx_clone.clone()));
                                explained_this_frame = true;
                            }
                        }
                    }

                    last_state = Some(current_state);
                }
                _ = broadcast_interval.tick() => {
                    if let Some(state) = &last_state {
                        let _ = tx_clone.send(ServerEvent::StateUpdate(state.clone()));
                    }
                }
            }
        }
    });

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/api/attack/:scenario", axum::routing::post(attack_handler))
        .route("/api/config", get(get_config_handler).post(post_config_handler))
        .nest_service("/", ServeDir::new("frontend/dist"))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Listening on http://localhost:3000");

    let llm_client_shutdown = llm_client.clone();

    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            let _ = tokio::signal::ctrl_c().await;
            println!("\n[System] Shutdown signal received. Cleaning up...");
            llm_client_shutdown.unload().await;
            println!("[System] Exiting cleanly.");
        })
        .await
        .unwrap();
}

async fn get_config_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let cfg = state.llm_config.read().await;
    Json(cfg.clone())
}

async fn post_config_handler(
    State(state): State<Arc<AppState>>,
    Json(new_cfg): Json<LlmConfig>,
) -> impl IntoResponse {
    // Capture the old model name before overwriting so we can unload it.
    let old_model = {
        let cfg = state.llm_config.read().await;
        cfg.model.clone()
    };

    let model_changed = old_model != new_cfg.model;

    println!("[Config] Updating LLM config: model={}, endpoint={}", new_cfg.model, new_cfg.endpoint);
    {
        let mut cfg = state.llm_config.write().await;
        *cfg = new_cfg;
    }

    if model_changed {
        let client = state.llm_client.clone();
        // Spawn so the HTTP response returns immediately while the swap happens in background.
        tokio::spawn(async move {
            // 1. Unload the previously loaded model by name.
            client.unload_by_name(&old_model).await;
            // 2. Warmup (load into VRAM) the new model.
            if let Err(e) = client.warmup().await {
                eprintln!("[Config] Failed to load new model into VRAM: {}", e);
            }
        });
    }

    Json(serde_json::json!({ "status": "ok", "model_changed": model_changed }))
}

async fn attack_handler(
    axum::extract::Path(scenario): axum::extract::Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let mut engine = state.replay_engine.lock().await;
    match scenario.as_str() {
        "stuxnet"     => engine.scenario = AttackScenario::Stuxnet,
        "triton"      => engine.scenario = AttackScenario::Triton,
        "nightdragon" => engine.scenario = AttackScenario::NightDragon,
        _             => engine.scenario = AttackScenario::None,
    }
    (axum::http::StatusCode::OK, "Attack scenario updated")
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.tx.subscribe();
    while let Ok(event) = rx.recv().await {
        if let Ok(msg) = serde_json::to_string(&event) {
            if socket.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    }
}

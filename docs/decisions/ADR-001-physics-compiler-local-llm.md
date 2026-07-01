# ADR-001: Deterministic Physics Compiler + Local LLM Explainability

## Status
Accepted

## Date
2026-06-30

## Context

Industrial Control System (ICS) anomaly detection systems historically fall into two failure modes:

1. **Hard-rule systems** (e.g., traditional SCADA alarms) — precise and auditable, but produce binary alerts with no context. Operators receive an alarm code and must mentally reconstruct why it fired.
2. **ML-based anomaly detectors** — flexible, but opaque. A model that learned "this sensor pattern is bad" cannot explain *why* the pattern violates physics. In safety-critical environments, an unexplainable alert is often ignored.

The Cyber-Kinetic Defense Grid needs to be both **trustworthy** (verifiable, air-gap safe) and **actionable** (operators understand what happened and why within seconds).

## Decision

Separate detection from explanation using a two-layer architecture:

**Layer 1 — Deterministic Physics Compiler (Rust)**
Validates every telemetry frame against closed-form physical laws:
- `ERR_THERMO_001`: Energy conservation — `Q = mcΔT` must hold given the measured heater power
- `ERR_FLOW_001`: Pressure-flow continuity — flow cannot be non-zero through a physically closed valve
- `ERR_MASS_001`: Mass conservation — tank level cannot drop in a closed-loop system with no outlet

This layer is the **trust anchor**. It produces violations deterministically with no model inference.

**Layer 2 — Local LLM Explanation Engine (AMD Lemonade)**
Only invoked *after* Layer 1 confirms a violation. Given the violation code and message, the LLM generates a 2-sentence human-readable explanation citing the specific physical law broken. Runs entirely on-device via the Lemonade OpenAI-compatible API.

## Alternatives Considered

### Cloud LLM (GPT-4, Claude, Gemini)
- Pros: Highest explanation quality
- Cons: Requires internet connectivity; ICS networks are air-gapped; telemetry data leaving the network is a security violation; adds latency; adds a cloud dependency for a safety-critical system
- **Rejected**: Fundamentally incompatible with air-gapped deployment

### Pure ML Anomaly Detector (LSTM / autoencoder)
- Pros: Can detect novel attack patterns without explicit rule encoding
- Cons: Black-box decisions; no explanation; requires training data; sensitive to distribution shift from attack injection
- **Rejected**: Unexplainable alerts are ignored in practice; training overhead is prohibitive for a demo

### Pure Rules Engine (No LLM)
- Pros: Fully deterministic, zero inference cost
- Cons: Alarm codes without natural-language explanation require specialist knowledge to interpret; poor operator UX
- **Rejected**: The explainability layer is the primary differentiator for the AMD Lemonade submission

## Consequences

- The physics compiler is the authoritative arbiter of truth. The LLM cannot override or suppress a violation.
- Explanation quality scales with model size. `Qwen3.5-2B-GGUF` is sufficient for demos; `Qwen3-4B-Instruct-2507-GGUF` produces more physically precise explanations.
- The system is fully functional with no LLM running — violations still fire; only the streaming explanation is absent.
- All LLM configuration (model, endpoint, temperature) is externalized to environment variables, enabling zero-code model switching.

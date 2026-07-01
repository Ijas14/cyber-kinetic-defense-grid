# Spec: Cyber-Kinetic Defense Grid

## Objective

Build a single-binary, pure-Rust native desktop application that detects physically impossible
states in industrial control system (ICS) telemetry using deterministic constraint equations —
not ML — and explains those violations to human operators via a locally-running LLM served by
AMD Lemonade.

**Primary users:**
- **Plant Operator:** Asks "What is wrong with my machine?" — wants plain-language explanation
- **SOC Analyst:** Asks "Why is this physically impossible?" — wants full constraint context

**Submission target:** AMD Lemonade Challenge  
**Success:** Judge runs `./ckdg`, sees a thermal loop, clicks "Replay Stuxnet", a red violation
fires in <1ms, and an AI explanation streams from a local model in under 5 seconds.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | Rust | 1.97-nightly |
| Edition | 2024 | — |
| GUI framework | eframe + egui | 0.35.0 |
| Live charts | egui_plot | 0.36.0 |
| HTTP client | reqwest | 0.12 |
| Async runtime | tokio | 1 |
| Serialization | serde + serde_json | 1 |
| Local AI | AMD Lemonade | localhost:8000 |

**No web stack. No Axum. No HTML/CSS/JS. One binary.**

---

## Commands

```bash
# Build (release)
cargo build --release

# Build (debug, fast iteration)
cargo build

# Run
cargo run --release

# Run (debug)
cargo run

# Tests
cargo test

# Tests (verbose)
cargo test -- --nocapture

# Clippy
cargo clippy -- -D warnings

# Format
cargo fmt

# Check only (no artifact)
cargo check
```

---

## Project Structure

```
cyber-kinetic-defense-grid/
├── src/
│   ├── main.rs               # eframe::run_native entry point
│   ├── app.rs                 # CkdgApp struct, implements eframe::App
│   ├── physics/
│   │   ├── mod.rs
│   │   ├── state.rs           # MachineState: tank, pump, heater, valve, sensors
│   │   ├── constraints.rs     # The 4 constraint equations (pure functions)
│   │   └── transitions.rs     # Legal state transition rules
│   ├── telemetry/
│   │   ├── mod.rs
│   │   ├── generator.rs       # Normal telemetry tick (60 Hz synthetic)
│   │   └── replay.rs          # Attack replay: load JSON, inject overrides
│   ├── compiler/
│   │   ├── mod.rs
│   │   ├── violation.rs       # ViolationType enum, Violation struct
│   │   └── engine.rs          # compile(state) -> Vec<Violation>
│   ├── lemonade/
│   │   ├── mod.rs
│   │   └── client.rs          # POST /v1/chat/completions, SSE stream
│   └── ui/
│       ├── mod.rs
│       ├── pid.rs             # Painter-based P&ID schematic
│       ├── violations.rs      # Scrollable violation log panel
│       ├── explanation.rs     # Streaming LLM text panel
│       └── controls.rs        # Replay buttons, persona toggle
├── attacks/
│   ├── stuxnet.json           # Sensor freeze + power ramp pattern
│   ├── triton.json            # Safety interlock override pattern
│   └── mitm.json              # Impossible rate-of-change pattern
├── docs/
│   ├── SPEC.md                # This file
│   └── PLAN.md                # Task breakdown
├── tests/
│   ├── physics_tests.rs       # Constraint equation unit tests
│   ├── compiler_tests.rs      # compile() integration tests
│   └── replay_tests.rs        # Attack pattern deserialization tests
├── Cargo.toml
├── README.md
└── LICENSE
```

---

## Code Style

### Naming conventions
- Structs: `PascalCase` — `MachineState`, `Violation`, `CompilerReport`
- Enums: `PascalCase` — `ViolationType`, `Persona`, `ReplayMode`
- Functions: `snake_case` — `compile_frame`, `run_replay`, `render_pid`
- Constants: `SCREAMING_SNAKE` — `HEATER_CP_WATER`, `MIN_VALVE_DELAY_MS`
- Error codes: string constants, `ERR_` prefix — `ERR_THERMO_001`

### Style reference (from EDI_DOCTOR patterns)
```rust
/// Compile a single telemetry frame against all physical constraints.
///
/// Returns a list of violations found. Empty vec means the state is physically valid.
/// This function is pure — no side effects, no I/O, deterministic.
pub fn compile_frame(state: &MachineState, prev: Option<&MachineState>) -> Vec<Violation> {
    let mut violations = Vec::new();
    check_energy_conservation(state, &mut violations);
    check_mass_conservation(state, &mut violations);
    check_pressure_flow(state, &mut violations);
    if let Some(p) = prev {
        check_state_transitions(state, p, &mut violations);
    }
    violations
}
```

### Key conventions
- **Pure functions for physics.** `compile_frame` has zero side effects. Tests don't need mocks.
- **Structured errors, not strings.** `Violation` is a typed struct, not `String`.
- **No `unwrap()` in library code.** Use `?`, `if let`, or explicit error handling.
- **Doc comments on all public items.** `///` not `//`.
- **egui panels in strict order.** Side panels first, `CentralPanel` last.

---

## Testing Strategy

**Framework:** Rust built-in (`cargo test`)  
**Test location:** `tests/` for integration, inline `#[cfg(test)]` for unit  
**Coverage target:** 100% of constraint equations and compiler logic

### Test levels
| Level | What | Where |
|-------|------|-------|
| Unit | Each constraint equation in isolation | `src/physics/constraints.rs` inline |
| Unit | `ViolationType` serialization | `src/compiler/violation.rs` inline |
| Integration | `compile_frame` with known-bad states | `tests/compiler_tests.rs` |
| Integration | Attack pattern deserialization | `tests/replay_tests.rs` |
| Manual | egui renders correctly | Visual inspection during dev |
| Manual | Lemonade responds to violation JSON | Live spike test |

### Critical test: the physics is mathematically certain
```rust
#[test]
fn closed_valve_with_flow_is_impossible() {
    let state = MachineState {
        valve_open: false,
        flow_rate_lpm: 50.0,  // 50 L/min through closed valve
        ..Default::default()
    };
    let violations = compile_frame(&state, None);
    assert!(violations.iter().any(|v| v.code == "ERR_FLOW_001"));
}
```

---

## Boundaries

**Always do:**
- Run `cargo clippy -- -D warnings` before considering a task complete
- Run `cargo test` before considering a task complete
- Keep `compile_frame` a pure function — no I/O, no side effects
- Keep physics constraint equations as standalone `fn` calls, not methods

**Ask first:**
- Adding any new dependency to `Cargo.toml`
- Changing the `Violation` struct fields (breaks tests and Lemonade prompt templates)
- Changing the attack JSON schema
- Increasing scope (new physical system, new protocol)

**Never do:**
- Add ML-based detection to the physics compiler
- Add real Modbus/OPC UA parsing (scope creep, zero demo value)
- Add a web server or HTTP API
- Add a second physical system before the first is fully polished
- Use `unwrap()` or `expect()` outside of `main.rs` and test setup

---

## Success Criteria

The application is complete when:

- [ ] `cargo build --release` produces a single binary with no warnings
- [ ] `cargo test` passes 100% with no warnings
- [ ] Binary opens an egui window with a P&ID diagram of the thermal loop
- [ ] Sensor values update in real-time (60 Hz synthetic telemetry)
- [ ] "Replay Stuxnet" button injects the attack pattern and triggers ≥1 violation in <10ms
- [ ] "Replay Triton" button injects the attack pattern and triggers ≥1 violation in <10ms
- [ ] "Replay MITM" button injects the attack pattern and triggers ≥1 violation in <10ms
- [ ] Violations appear in the log panel with `ERR_` code, violated law, and expected vs actual
- [ ] Clicking a violation sends it to Lemonade and streams a response in the explanation panel
- [ ] Persona toggle changes the LLM system prompt (Plant Operator / SOC Analyst)
- [ ] Application runs and demoes completely offline except for Lemonade on localhost

---

## Open Questions

- [ ] **Lemonade port:** Is it 8000, 8080, or configurable? Verify during Task 1 spike.
- [ ] **Streaming API:** Does Lemonade's SSE use standard `data:` lines? Verify during Task 1 spike.
- [ ] **egui `Painter`:** Is the painting API sufficient for clean P&ID rendering, or do we need pre-drawn PNG assets? Spike in Task 3.
- [ ] **Challenge submission format:** Video? GitHub repo? Live demo? Check Discord before Task 7.

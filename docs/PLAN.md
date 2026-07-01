# Implementation Plan: Cyber-Kinetic Defense Grid

## Overview

Build the project bottom-up: data types first, then physics, then compiler, then telemetry,
then Lemonade client, then UI. Each layer depends only on the layer below it. The egui UI is
the last thing we touch — it is just a consumer of the compiler output.

## Architecture Decisions

- **No global state.** `CkdgApp` owns everything. Physics state is passed by value per frame.
- **Sync physics, async Lemonade.** The 60Hz physics loop is synchronous. Lemonade HTTP calls are spawned to a `tokio` runtime and communicate back via `std::sync::mpsc`.
- **Attack replay is an override mask.** The generator produces a normal `MachineState` tick, then the replay layer applies a partial override. This keeps the two concerns separate.
- **Violations are typed, not strings.** `ViolationType` is an enum. `Violation` carries the numeric expected and actual values so the LLM prompt is precise.

## Dependency Graph

```
attacks/*.json
    └── telemetry::replay

physics::state (MachineState)
    ├── physics::constraints (pure fns)
    ├── physics::transitions (pure fns)
    ├── telemetry::generator
    └── compiler::engine
            └── compiler::violation (Violation struct)
                    └── lemonade::client (consumes Violation)

All of the above feed into:
    └── app::CkdgApp
            └── ui::{pid, violations, explanation, controls}
```

---

## Phase 1: Foundation — Types, Physics, Compiler

### Task 1: Cargo scaffold + Lemonade spike
**Description:** Initialize the Cargo project, verify eframe compiles on this machine,
and confirm Lemonade is reachable and returns coherent output.

**Acceptance criteria:**
- [ ] `cargo new --name ckdg cyber-kinetic-defense-grid` succeeds
- [ ] `Cargo.toml` has correct deps (eframe 0.35, egui_plot 0.36, reqwest 0.12, tokio, serde)
- [ ] `cargo build` compiles a working "hello egui" window (blank, dark theme)
- [ ] Manual spike: `curl http://localhost:8000/v1/models` returns a model list OR we document the fallback (CPU inference)

**Verify:** `cargo build` — no errors, no warnings. Window opens.  
**Dependencies:** None  
**Files:** `Cargo.toml`, `src/main.rs`  
**Scope:** S

---

### Task 2: Core types — `MachineState` and `Violation`
**Description:** Define the two central data types that every other module depends on.
`MachineState` represents one telemetry frame. `Violation` represents one detected impossibility.

**Acceptance criteria:**
- [ ] `MachineState` has fields: `tank_level_l`, `pump_on`, `pump_flow_lpm`, `pump_power_w`, `heater_on`, `heater_power_w`, `heater_temp_c`, `valve_open`, `valve_position_pct`, `downstream_pressure_kpa`, `timestamp_ms`
- [ ] `MachineState` implements `Default`, `Clone`, `Debug`, `serde::Serialize`, `serde::Deserialize`
- [ ] `ViolationType` enum covers: `EnergyConservation`, `MassConservation`, `PressureFlowContradiction`, `IllegalStateTransition`
- [ ] `Violation` struct has: `code: &'static str`, `violation_type: ViolationType`, `message: String`, `expected: f64`, `actual: f64`, `unit: &'static str`
- [ ] All types have `///` doc comments

**Verify:** `cargo test` — inline tests for `Default::default()` values pass  
**Dependencies:** Task 1  
**Files:** `src/physics/state.rs`, `src/compiler/violation.rs`  
**Scope:** S

---

### Task 3: Physics constraint equations (pure functions)
**Description:** Implement the four constraint equations as pure, testable functions.
This is the core of the entire project — the math that detects lies.

**The four laws:**
1. **ERR_ENERGY_001** — Conservation of energy: if `heater_on && heater_power_w > 0`, then `ΔT/Δt` must be `≥ power / (mass × Cp)`. Use `mass = tank_level_l × 1.0 kg/L`, `Cp = 4186 J/(kg·K)`.
2. **ERR_FLOW_001** — Pressure-flow contradiction: if `valve_open == false`, then `pump_flow_lpm` must be `< 1.0` (tolerance for sensor noise).
3. **ERR_MASS_001** — Conservation of mass: if `pump_on && valve_open`, then `tank_level_l` must be decreasing or `pump_flow_lpm < 1.0`.
4. **ERR_TRANS_001** — Illegal state transition: valve cannot go from `false` to `true` in `< 150ms` (mechanical delay).

**Acceptance criteria:**
- [ ] Each constraint is a standalone `fn check_*(state, prev) -> Option<Violation>` 
- [ ] `compile_frame(state, prev) -> Vec<Violation>` collects all violations
- [ ] Unit tests cover: clean state (no violations), each violation individually, edge cases (zero flow, zero level)
- [ ] All tests pass with `cargo test`

**Verify:** `cargo test physics` — all tests pass. `cargo clippy` — clean.  
**Dependencies:** Task 2  
**Files:** `src/physics/constraints.rs`, `src/physics/transitions.rs`, `src/compiler/engine.rs`  
**Scope:** M

---

### Checkpoint: Phase 1
- [ ] `cargo test` — all tests pass, zero warnings
- [ ] `cargo clippy -- -D warnings` — clean
- [ ] Core physics equations are verified mathematically correct by inspection
- [ ] Human reviews the violation codes and messages before proceeding

---

## Phase 2: Telemetry — Generator and Attack Replay

### Task 4: Normal telemetry generator
**Description:** Implement a function that generates a realistic normal `MachineState` tick.
The generator maintains internal state and advances it by one frame (16ms = 60Hz).

**Acceptance criteria:**
- [ ] `TelemetryGenerator::new()` returns a generator with a valid initial state
- [ ] `generator.tick(dt_ms)` returns the next `MachineState` with smooth, physically consistent transitions
- [ ] Normal ticks produce zero violations when passed through `compile_frame`
- [ ] Generator is deterministic given the same seed (for reproducible demos)

**Verify:** `cargo test telemetry` — generates 1000 frames, none produce violations.  
**Dependencies:** Task 3  
**Files:** `src/telemetry/generator.rs`  
**Scope:** S

---

### Task 5: Attack replay engine + JSON patterns
**Description:** Implement the replay engine that loads a JSON attack pattern and overrides
specific fields of the normal generator output for a defined duration.

**Attack JSON schema:**
```json
{
  "name": "Stuxnet Pattern",
  "description": "Sensor T-101 frozen while heater power ramps",
  "duration_ms": 5000,
  "overrides": [
    { "at_ms": 0,    "field": "heater_power_w", "value": 1000.0 },
    { "at_ms": 500,  "field": "heater_power_w", "value": 3000.0 },
    { "at_ms": 1000, "field": "heater_power_w", "value": 5000.0 },
    { "at_ms": 0,    "field": "heater_temp_c",  "value": 22.0 }
  ]
}
```

**Acceptance criteria:**
- [ ] `attacks/stuxnet.json`, `attacks/triton.json`, `attacks/mitm.json` are valid and load without error
- [ ] `ReplayEngine::load(path)` deserializes a pattern
- [ ] `replay.apply(state, elapsed_ms)` merges overrides at the correct time offsets
- [ ] Stuxnet pattern causes `ERR_ENERGY_001` to fire within the first 500ms of replay
- [ ] Triton pattern causes `ERR_FLOW_001` to fire
- [ ] MITM pattern causes `ERR_TRANS_001` to fire

**Verify:** `cargo test replay` — all three patterns produce expected violation types.  
**Dependencies:** Task 4  
**Files:** `src/telemetry/replay.rs`, `attacks/stuxnet.json`, `attacks/triton.json`, `attacks/mitm.json`  
**Scope:** M

---

### Checkpoint: Phase 2
- [ ] `cargo test` — 100% pass
- [ ] All three attack patterns produce correct violations deterministically
- [ ] Human reviews violation messages for clarity and accuracy before UI work begins

---

## Phase 3: Lemonade Client

### Task 6: Lemonade async client
**Description:** Implement a non-blocking HTTP client that posts a violation to Lemonade and
streams the response back via an `mpsc` channel so the UI can render tokens as they arrive.

**Acceptance criteria:**
- [ ] `LemonadeClient::new(base_url, model)` constructs a client
- [ ] `client.explain(violation, persona, tx: Sender<String>)` spawns a tokio task
- [ ] The task POSTs to `/v1/chat/completions` with `stream: true`
- [ ] System prompt is selected by `Persona` enum (`Operator` / `SocAnalyst`)
- [ ] Each SSE `data:` chunk is parsed and sent to `tx` as a `String` token
- [ ] A final `data: [DONE]` closes the channel
- [ ] If Lemonade is unavailable, the channel receives a single `"[Lemonade offline]"` message — no crash

**Verify:** Manual spike — run against real Lemonade, confirm streaming tokens appear. OR if offline: unit test that the offline fallback message is sent.  
**Dependencies:** Task 2  
**Files:** `src/lemonade/client.rs`  
**Scope:** M

---

### Checkpoint: Phase 3
- [ ] Lemonade client tested against real instance OR offline fallback confirmed
- [ ] Streaming works end-to-end (tokens arrive incrementally, not as one block)
- [ ] No `unwrap()` calls outside test setup

---

## Phase 4: egui Application

### Task 7: App skeleton + panel layout
**Description:** Build `CkdgApp` implementing `eframe::App`. Wire up the four panels
(P&ID left, violation log top-right, explanation bottom-right, controls as toolbar).
No real content yet — just layout, colors, and the 60Hz repaint loop.

**Acceptance criteria:**
- [ ] Window opens with dark background (`#0d0d0d` or similar)
- [ ] Three-panel layout renders without overlap
- [ ] `ctx.request_repaint()` called each frame for continuous 60Hz update
- [ ] Persona toggle (Plant Operator / SOC Analyst) renders and toggles state
- [ ] Three attack replay buttons render (Stuxnet, Triton, MITM)

**Verify:** `cargo run` — window opens, panels visible, buttons clickable (no behavior yet).  
**Dependencies:** Task 1  
**Files:** `src/app.rs`, `src/ui/mod.rs`, `src/ui/controls.rs`  
**Scope:** M

---

### Task 8: P&ID diagram (custom Painter)
**Description:** Render the thermal loop as a live P&ID schematic using egui's `Painter` API.
Components are drawn as shapes; pipes are lines; sensor values are overlaid as text.
Colors transition green → amber → red based on violation state.

**Component layout:**
```
Tank (rect) → Pump (circle) → Heater (rect) → Valve (rect/line) → back to Tank
Sensors: level (on Tank), flow (on pipe), temp (on Heater), pressure (after Valve)
```

**Acceptance criteria:**
- [ ] All 4 components drawn as recognizable shapes with labels
- [ ] Pipe connections drawn as lines between components
- [ ] Each sensor shows its current value as numeric text (e.g. "22.4°C")
- [ ] Component color is green when no violations, red when any violation targets that component
- [ ] Sensor value animates smoothly (no jitter)

**Verify:** `cargo run` — live sensor values update visibly, manual replay triggers red color.  
**Dependencies:** Task 7, Task 4  
**Files:** `src/ui/pid.rs`  
**Scope:** M

---

### Task 9: Violation log panel
**Description:** Render a scrollable list of violations. Each entry shows error code,
violated law, expected vs. actual, and a timestamp. Clicking an entry triggers Lemonade.

**Acceptance criteria:**
- [ ] Violation log scrolls when entries exceed panel height
- [ ] Each entry has: `[ERR_CODE]` in red, constraint name, `Expected: X | Actual: Y unit`
- [ ] New violations are appended to the top (most recent first)
- [ ] Clicking a violation entry calls `LemonadeClient::explain()`
- [ ] Selected entry is highlighted

**Verify:** Manual — replay Stuxnet, three violations appear in log, clicking one triggers Lemonade.  
**Dependencies:** Task 7, Task 5, Task 6  
**Files:** `src/ui/violations.rs`  
**Scope:** S

---

### Task 10: LLM explanation panel + full integration
**Description:** Render the streaming Lemonade response as text that appears token-by-token.
Wire the full loop: normal tick → physics tick → compile → violations → click → explain → stream.

**Acceptance criteria:**
- [ ] Explanation panel shows a placeholder "Click a violation to explain it" when idle
- [ ] After clicking, text streams in incrementally (not all at once)
- [ ] Persona toggle changes both the system prompt AND a visible label in the panel header
- [ ] Operator mode uses plain language; SOC mode uses technical constraint language
- [ ] If Lemonade is offline, shows `"[Lemonade offline — running in physics-only mode]"`
- [ ] Full loop works: normal mode → all green; Stuxnet replay → violation fires → click → explanation streams

**Verify:** Full demo walkthrough — normal → Stuxnet → click violation → operator explanation streams → toggle to SOC → replay → click → SOC explanation streams.  
**Dependencies:** Tasks 8, 9, 6  
**Files:** `src/ui/explanation.rs`, `src/app.rs` (wiring)  
**Scope:** M

---

### Checkpoint: Phase 4
- [ ] `cargo build --release` — single binary, zero warnings
- [ ] Full demo walkthrough passes all success criteria from SPEC.md
- [ ] Application is self-contained — demoes completely offline except Lemonade on localhost

---

## Phase 5: Hardening + Polish

### Task 11: Code review + simplification
**Description:** Review all modules against the five axes: correctness, security, performance,
maintainability, scope compliance. Remove any dead code, simplify any over-engineered paths.
Run `code-review-and-quality` and `code-simplification` skills.

**Acceptance criteria:**
- [ ] `cargo clippy -- -D warnings` — clean
- [ ] No `unwrap()` outside main.rs and test setup
- [ ] No module is >200 lines (if so, split it)
- [ ] All public items have `///` doc comments

**Verify:** `cargo test && cargo clippy -- -D warnings`  
**Dependencies:** Task 10  
**Files:** All source files  
**Scope:** M

---

### Task 12: README + challenge submission
**Description:** Write the challenge submission README. Must answer: what it is, why local AI,
how to run it, and what the demo shows. Include a screenshot or GIF.

**Acceptance criteria:**
- [ ] README has: project title, one-line tagline, "Why local AI" section, install + run instructions, demo walkthrough, architecture diagram (ASCII), and license
- [ ] `LICENSE` file is MIT
- [ ] All three attack JSON files are committed
- [ ] `cargo build --release` instructions tested from a clean clone

**Verify:** Human reads and approves README before submission.  
**Dependencies:** Task 11  
**Files:** `README.md`, `LICENSE`  
**Scope:** S

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lemonade can't run on Radeon 6500M (4GB VRAM) | High | Task 1 spike. Fallback: CPU inference (slower but functional for demo) |
| egui Painter insufficient for P&ID diagram | Medium | Task 8 early. Fallback: PNG component assets composited in UI |
| Scope creep (second physical system, Modbus parsing) | High | `NEVER DO` list in SPEC.md. Enforce every task. |
| Attack patterns don't trigger violations reliably | Medium | Task 5 has explicit test assertions per pattern |
| `edition = "2024"` build issues | Low | Rust 1.97-nightly confirmed. Fallback: `edition = "2021"` |
| Challenge spots fill before submission | High | Join Discord now, verify remaining spots before Task 1 |

## Open Questions

- [ ] Confirm Lemonade endpoint and streaming format (Task 1 spike)
- [ ] Confirm challenge submission format (video / repo / live) before Task 12

use crate::compiler::violation::Violation;
use crate::physics::state::MachineState;
use crate::physics::constraints::{check_energy_conservation, check_mass_conservation, check_pressure_flow};
use crate::physics::transitions::check_state_transitions;

/// Compile a single telemetry frame against all physical constraints.
///
/// Returns a list of violations found. Empty vec means the state is physically valid.
/// This function is pure — no side effects, no I/O, deterministic.
pub fn compile_frame(state: &MachineState, prev: Option<&MachineState>) -> Vec<Violation> {
    let mut violations = Vec::new();
    
    check_energy_conservation(state, prev, &mut violations);
    check_mass_conservation(state, prev, &mut violations);
    check_pressure_flow(state, prev, &mut violations);
    
    if let Some(p) = prev {
        check_state_transitions(state, p, &mut violations);
    }
    
    violations
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compile_frame_clean() {
        let prev = MachineState {
            timestamp_ms: 0,
            tank_level_l: 100.0,
            ..Default::default()
        };
        let state = MachineState {
            timestamp_ms: 100,
            tank_level_l: 100.0,
            ..Default::default()
        };
        
        let violations = compile_frame(&state, Some(&prev));
        assert!(violations.is_empty());
    }
}

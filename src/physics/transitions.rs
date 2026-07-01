use crate::compiler::violation::{Violation, ViolationType};
use crate::physics::state::MachineState;

/// Check for illegal state transitions that violate mechanical limits.
///
/// For example, a physical valve cannot transition from fully closed to fully open
/// in less time than its mechanical actuation limit.
pub fn check_state_transitions(state: &MachineState, prev: &MachineState, violations: &mut Vec<Violation>) {
    let dt_ms = state.timestamp_ms.saturating_sub(prev.timestamp_ms);
    if dt_ms == 0 { return; }
    let dt_s = dt_ms as f64 / 1000.0;
    
    // Assume minimum mechanical delay to fully open/close the valve is 150ms.
    // So max rate of change is 1.0 / 0.150 percent per second.
    let max_rate = 1.0 / 0.150;
    
    let position_change = (state.valve_position_pct - prev.valve_position_pct).abs();
    let actual_rate = position_change / dt_s;
    
    // Allow a tiny tolerance for floating point math
    if actual_rate > max_rate + 0.001 {
        violations.push(Violation {
            code: "ERR_TRANS_001",
            violation_type: ViolationType::IllegalStateTransition,
            message: "Valve position changed faster than its physical mechanical limit. Possible network injection or spoofed telemetry.".to_string(),
            expected: max_rate,
            actual: actual_rate,
            unit: "pct/s",
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_illegal_state_transition() {
        let prev = MachineState {
            timestamp_ms: 0,
            valve_position_pct: 0.0,
            ..Default::default()
        };
        let state = MachineState {
            timestamp_ms: 10, // 10ms
            valve_position_pct: 1.0, // Went from 0 to 100% in 10ms!
            ..Default::default()
        };
        let mut violations = Vec::new();
        check_state_transitions(&state, &prev, &mut violations);
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].code, "ERR_TRANS_001");
    }
}

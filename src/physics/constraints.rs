use crate::compiler::violation::{Violation, ViolationType};
use crate::physics::state::MachineState;

/// Check the First Law of Thermodynamics: Conservation of Energy.
///
/// If the heater is drawing power, the water temperature must rise accordingly.
/// Equation: Power = mass * Cp * dT/dt
pub fn check_energy_conservation(state: &MachineState, prev: Option<&MachineState>, violations: &mut Vec<Violation>) {
    let Some(prev_state) = prev else { return };
    
    let dt_ms = state.timestamp_ms.saturating_sub(prev_state.timestamp_ms);
    if dt_ms == 0 { return; }
    let dt_s = dt_ms as f64 / 1000.0;
    
    // Mass = Volume * Density (assume 1 kg/L for water)
    let mass_kg = state.tank_level_l;
    if mass_kg <= 0.0 { return; }
    
    // Specific heat capacity of water ~ 4186 J/(kg*K)
    let cp = 4186.0;
    
    if state.heater_on && state.heater_power_w > 0.0 {
        let expected_dt_dt = state.heater_power_w / (mass_kg * cp);
        let actual_dt_dt = (state.heater_temp_c - prev_state.heater_temp_c) / dt_s;
        
        // Allow some tolerance for heat loss to the environment
        let tolerance = 0.1;
        
        if actual_dt_dt < expected_dt_dt - tolerance {
            violations.push(Violation {
                code: "ERR_THERMO_001",
                violation_type: ViolationType::EnergyConservation,
                message: "Heater is drawing power but temperature is not rising at the expected physical rate. Possible spoofed temperature sensor or bypassed heater element.".to_string(),
                expected: expected_dt_dt,
                actual: actual_dt_dt,
                unit: "°C/s",
            });
        }
    }
}

/// Check the logical relationship between pressure and flow.
///
/// If the main valve is physically closed, flow rate must be zero (with sensor noise tolerance).
pub fn check_pressure_flow(state: &MachineState, _prev: Option<&MachineState>, violations: &mut Vec<Violation>) {
    if state.valve_position_pct < 0.01 && state.pump_flow_lpm > 1.0 {
        violations.push(Violation {
            code: "ERR_FLOW_001",
            violation_type: ViolationType::PressureFlowContradiction,
            message: "Valve is physically closed but flow is detected. Possible overridden safety interlock or spoofed flow sensor.".to_string(),
            expected: 0.0,
            actual: state.pump_flow_lpm,
            unit: "L/min",
        });
    }
}

/// Check the Conservation of Mass.
///
/// In a closed loop system, the total mass (tank level) must remain constant.
pub fn check_mass_conservation(state: &MachineState, prev: Option<&MachineState>, violations: &mut Vec<Violation>) {
    let Some(prev_state) = prev else { return };
    
    let level_diff = (state.tank_level_l - prev_state.tank_level_l).abs();
    // Allow a small tolerance for sensor noise
    if level_diff > 0.1 {
        violations.push(Violation {
            code: "ERR_MASS_001",
            violation_type: ViolationType::MassConservation,
            message: "Tank level changed in a closed-loop system. Conservation of mass violated. Possible leak or spoofed level sensor.".to_string(),
            expected: 0.0,
            actual: level_diff,
            unit: "L",
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pressure_flow_violation() {
        let state = MachineState {
            valve_position_pct: 0.0,
            pump_flow_lpm: 5.0,
            ..Default::default()
        };
        let mut violations = Vec::new();
        check_pressure_flow(&state, None, &mut violations);
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].code, "ERR_FLOW_001");
    }
    
    #[test]
    fn test_energy_conservation_violation() {
        let prev = MachineState {
            timestamp_ms: 0,
            heater_temp_c: 20.0,
            tank_level_l: 100.0,
            ..Default::default()
        };
        let state = MachineState {
            timestamp_ms: 1000, // 1 second
            heater_on: true,
            heater_power_w: 418600.0, // Should raise 100kg by 1 degree per second
            heater_temp_c: 20.0, // Temperature did not change!
            tank_level_l: 100.0,
            ..Default::default()
        };
        let mut violations = Vec::new();
        check_energy_conservation(&state, Some(&prev), &mut violations);
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].code, "ERR_THERMO_001");
        assert_eq!(violations[0].expected, 1.0); // 418600 / (100 * 4186)
        assert_eq!(violations[0].actual, 0.0);
    }
}

use serde::{Deserialize, Serialize};

/// Represents a single telemetry frame containing the full state of the physical system.
///
/// This state is validated by the physics compiler to detect physically impossible combinations
/// of sensor values, which indicate spoofing, hardware failure, or cyber-kinetic attacks.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct MachineState {
    /// The current water level in the tank (liters).
    pub tank_level_l: f64,
    /// Whether the pump is currently receiving power and commanded ON.
    pub pump_on: bool,
    /// The actual flow rate through the pump (liters per minute).
    pub pump_flow_lpm: f64,
    /// The electrical power drawn by the pump (Watts).
    pub pump_power_w: f64,
    /// Whether the heater is currently receiving power and commanded ON.
    pub heater_on: bool,
    /// The electrical power drawn by the heater (Watts).
    pub heater_power_w: f64,
    /// The temperature of the water at the heater output (Celsius).
    pub heater_temp_c: f64,
    /// Whether the main control valve is currently commanded OPEN.
    pub valve_open: bool,
    /// The actual physical position of the valve (0.0 = fully closed, 1.0 = fully open).
    pub valve_position_pct: f64,
    /// The fluid pressure measured downstream of the valve (kPa).
    pub downstream_pressure_kpa: f64,
    /// The timestamp of this telemetry frame in milliseconds since simulation start.
    pub timestamp_ms: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_machine_state_default() {
        let state = MachineState::default();
        assert_eq!(state.tank_level_l, 0.0);
        assert!(!state.pump_on);
        assert_eq!(state.pump_flow_lpm, 0.0);
        assert_eq!(state.timestamp_ms, 0);
    }
}

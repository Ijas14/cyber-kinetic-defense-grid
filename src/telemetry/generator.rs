use crate::physics::state::MachineState;

/// Generates synthetic, physically-consistent telemetry for the thermal loop.
///
/// This generator produces the "ground truth" normal state of the machine.
/// Attack replays will later override fields from this output to inject lies.
pub struct TelemetryGenerator {
    state: MachineState,
    time_accumulator_ms: u64,
}

impl Default for TelemetryGenerator {
    fn default() -> Self {
        Self::new()
    }
}

impl TelemetryGenerator {
    pub fn new() -> Self {
        let initial_state = MachineState {
            tank_level_l: 100.0,
            pump_on: true,
            pump_flow_lpm: 12.0,
            pump_power_w: 120.0,
            heater_on: true,
            heater_power_w: 420000.0,
            heater_temp_c: 25.0, // Ambient starting temp
            valve_open: true,
            valve_position_pct: 1.0,
            downstream_pressure_kpa: 300.0,
            timestamp_ms: 0,
        };
        
        Self {
            state: initial_state,
            time_accumulator_ms: 0,
        }
    }
    
    /// Advance the simulation by `dt_ms` and return the new state.
    pub fn tick(&mut self, dt_ms: u64) -> MachineState {
        self.time_accumulator_ms += dt_ms;
        self.state.timestamp_ms = self.time_accumulator_ms;
        
        let dt_s = dt_ms as f64 / 1000.0;
        
        // Simple deterministic smooth physical simulation.
        
        if self.state.heater_on {
            let mass = self.state.tank_level_l; // 1 kg/L
            let cp = 4186.0;
            
            // Annealing / thermal control loop:
            // Start slowing down heater power once temperature crosses 70°C, aiming for 90°C plateau.
            let threshold = 70.0;
            let target = 90.0;
            
            if self.state.heater_temp_c > threshold {
                let progress = (self.state.heater_temp_c - threshold) / (target - threshold);
                // Scale power down to 5% as we approach target
                let scale = 1.0 - progress.clamp(0.0, 0.95);
                self.state.heater_power_w = 420000.0 * scale;
            } else {
                self.state.heater_power_w = 420000.0;
            }

            let expected_dt_dt = self.state.heater_power_w / (mass * cp);
            
            // Just add exactly the expected energy to avoid thermo violations.
            self.state.heater_temp_c += expected_dt_dt * dt_s;
        }
        
        // Flow and pressure logic
        if self.state.valve_open {
            if self.state.valve_position_pct < 1.0 {
                self.state.valve_position_pct += (1.0 / 0.150) * dt_s;
                if self.state.valve_position_pct > 1.0 {
                    self.state.valve_position_pct = 1.0;
                }
            }
            self.state.pump_flow_lpm = 12.0 * self.state.valve_position_pct;
            self.state.downstream_pressure_kpa = 300.0 * self.state.valve_position_pct;
        } else {
            if self.state.valve_position_pct > 0.0 {
                self.state.valve_position_pct -= (1.0 / 0.150) * dt_s;
                if self.state.valve_position_pct < 0.0 {
                    self.state.valve_position_pct = 0.0;
                }
            }
            self.state.pump_flow_lpm = 0.0;
            self.state.downstream_pressure_kpa = 0.0;
        }
        
        self.state.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::compiler::engine::compile_frame;

    #[test]
    fn test_generator_produces_clean_frames() {
        let mut generator = TelemetryGenerator::new();
        let mut prev = generator.tick(0);
        
        for _ in 0..1000 {
            let state = generator.tick(16); // ~60Hz tick
            let violations = compile_frame(&state, Some(&prev));
            assert!(violations.is_empty(), "Generator produced physical violations: {:?}", violations);
            prev = state;
        }
    }
}

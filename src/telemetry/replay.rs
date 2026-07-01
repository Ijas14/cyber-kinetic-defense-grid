use crate::physics::state::MachineState;
use crate::telemetry::generator::TelemetryGenerator;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttackScenario {
    None,
    /// Spoofs flow sensor (says normal) while physically closing the valve.
    /// Violates: PressureFlowContradiction
    Stuxnet,
    /// Spoofs temperature (says cool) while maximizing the heater.
    /// Violates: EnergyConservation
    Triton,
    /// Spoofs tank level (says stable) while actually pumping water out (open loop leak).
    /// Violates: MassConservation
    NightDragon,
}

pub struct ReplayEngine {
    generator: TelemetryGenerator,
    pub scenario: AttackScenario,
    ticks_in_scenario: u64,
    frozen_temp_c: f64,
}

impl Default for ReplayEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl ReplayEngine {
    pub fn new() -> Self {
        Self {
            generator: TelemetryGenerator::new(),
            scenario: AttackScenario::None,
            ticks_in_scenario: 0,
            frozen_temp_c: 25.0,
        }
    }

    pub fn set_scenario(&mut self, scenario: AttackScenario) {
        if self.scenario != scenario {
            self.scenario = scenario;
            self.ticks_in_scenario = 0;
        }
    }

    pub fn tick(&mut self, dt_ms: u64) -> MachineState {
        // Get the "ground truth" state
        let mut state = self.generator.tick(dt_ms);
        
        if self.scenario != AttackScenario::None {
            self.ticks_in_scenario += 1;
        }

        match self.scenario {
            AttackScenario::None => {
                // Continuously track the true temperature so we can freeze it exactly
                // where it was when an attack is injected.
                self.frozen_temp_c = state.heater_temp_c;
            }
            AttackScenario::Stuxnet => {
                // Physical reality: valve is closed.
                state.valve_open = false;
                state.valve_position_pct = 0.0;
                
                // Cyber lie: flow is normal.
                state.pump_flow_lpm = 12.0;
            }
            AttackScenario::Triton => {
                // Physical reality: heater is blasting at maximum power.
                state.heater_on = true;
                state.heater_power_w = 1_200_000.0; // 3x normal — impossible to ignore

                // Cyber lie: sensor reports temperature perfectly stable.
                // prev_state will have naturally rising temp; this frame pins it
                // exactly where it was before the attack.
                state.heater_temp_c = self.frozen_temp_c;
            }
            AttackScenario::NightDragon => {
                // Physical reality: system is leaking (mass decreasing).
                // But the generator produces a closed loop (stable mass).
                // So the "true" physical state would have less mass, but we need to create
                // a violation where the mass is changing in a closed loop, or vice versa.
                // If we spoof the level to be 100.0, but the true state (if leaking) is 90.0... wait.
                // To violate Mass Conservation: `dLevel/dt` must be non-zero in a closed loop.
                // Let's have the cyber lie say the tank level is dropping rapidly (e.g. 1L per tick) 
                // even though the pump is off and valve is closed!
                // Wait, if it says it's dropping rapidly, that's a mass conservation violation.
                // Let's do:
                let leak_amount = self.ticks_in_scenario as f64 * 0.5; // 0.5L per tick drop
                state.tank_level_l = 100.0 - leak_amount;
            }
        }
        
        state
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::compiler::engine::compile_frame;

    #[test]
    fn test_stuxnet_scenario() {
        let mut engine = ReplayEngine::new();
        engine.set_scenario(AttackScenario::Stuxnet);
        
        let prev = engine.tick(0);
        let current = engine.tick(16);
        
        let violations = compile_frame(&current, Some(&prev));
        assert!(violations.iter().any(|v| v.code == "ERR_FLOW_001"));
    }

    #[test]
    fn test_triton_scenario() {
        let mut engine = ReplayEngine::new();
        let prev = engine.tick(0); // Tick 0 with None
        
        engine.set_scenario(AttackScenario::Triton);
        let current = engine.tick(1000); // Advance 1 second
        
        let violations = compile_frame(&current, Some(&prev));
        assert!(violations.iter().any(|v| v.code == "ERR_THERMO_001"));
    }

    #[test]
    fn test_nightdragon_scenario() {
        let mut engine = ReplayEngine::new();
        let prev = engine.tick(0);
        
        engine.set_scenario(AttackScenario::NightDragon);
        let current = engine.tick(1000);
        
        let violations = compile_frame(&current, Some(&prev));
        assert!(violations.iter().any(|v| v.code == "ERR_MASS_001"));
    }
}

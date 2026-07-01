use serde::{Deserialize, Serialize};

/// Categories of physical laws and logical constraints that can be violated.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ViolationType {
    /// Violation of the First Law of Thermodynamics (Conservation of Energy).
    EnergyConservation,
    /// Violation of the Law of Conservation of Mass.
    MassConservation,
    /// Logical contradiction between pressure and flow rates.
    PressureFlowContradiction,
    /// A state transition that violates physical inertia or mechanical limits.
    IllegalStateTransition,
}

/// A structured report of a detected physical impossibility.
///
/// These violations are generated deterministically by the physics compiler
/// and fed into the AI layer for human explanation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Violation {
    /// A unique, stable error code (e.g., "ERR_THERMO_001").
    pub code: &'static str,
    /// The category of physical law violated.
    pub violation_type: ViolationType,
    /// A succinct, technical description of the contradiction.
    pub message: String,
    /// The numeric value expected by the laws of physics.
    pub expected: f64,
    /// The actual numeric value reported by the telemetry stream.
    pub actual: f64,
    /// The unit of measurement for `expected` and `actual` (e.g., "°C/s", "L/min").
    pub unit: &'static str,
}

export type MachineState = {
  pump_on: boolean;
  pump_flow_lpm: number;
  heater_on: boolean;
  heater_temp_c: number;
  heater_power_w: number;
  valve_open: boolean;
  valve_position_pct: number;
  tank_level_l: number;
};

export type Violation = {
  code: string;
  message: string;
};

export type ServerEvent =
  | { type: 'StateUpdate'; payload: MachineState }
  | { type: 'ViolationDetected'; payload: Violation }
  | { type: 'PersonaExplanationChunk'; payload: { persona_id: PersonaId, chunk: string } };

export type PersonaId = 'PhysicsAnalyst' | 'IncidentCommander' | 'FieldOperator';

export type TimelineEntry = {
  id: number;
  ts: string;
  kind: 'info' | 'attack' | 'violation';
  text: string;
};

export type Scenario = 'none' | 'stuxnet' | 'triton' | 'nightdragon';

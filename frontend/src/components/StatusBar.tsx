import type { MachineState } from '../types';
import { Wifi, WifiOff } from 'lucide-react';

interface Props {
  connected: boolean;
  state: MachineState | null;
  hasViolation: boolean;
  activeScenario: string;
}

export default function StatusBar({ connected, state, hasViolation, activeScenario }: Props) {
  const status = !connected
    ? { label: 'DISCONNECTED', color: 'var(--text-3)', dot: 'dot-dim' }
    : hasViolation
    ? { label: 'ATTACK DETECTED', color: 'var(--red)', dot: 'dot-red' }
    : { label: 'NOMINAL OPERATION', color: 'var(--green)', dot: 'dot-green' };

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 20px',
      height: 52,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(7,11,20,0.9)',
      backdropFilter: 'blur(8px)',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'linear-gradient(135deg, #00d4ff33, #a855f733)',
          border: '1px solid rgba(0,212,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'var(--cyan)',
          fontFamily: 'var(--mono)',
        }}>⬡</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '0.02em' }}>
            CKDG
          </div>
          <div className="label">Cyber-Kinetic Defense Grid</div>
        </div>
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px' }} />

      {/* System status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`dot ${status.dot}`} />
        <span style={{ fontSize: 12, fontWeight: 600, color: status.color, fontFamily: 'var(--mono)' }}>
          {status.label}
        </span>
      </div>

      {/* Telemetry pills */}
      {state && (
        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
          <Pill label="TEMP" value={`${state.heater_temp_c.toFixed(1)}°C`} alert={state.heater_temp_c > 80} />
          <Pill label="FLOW" value={`${state.pump_flow_lpm.toFixed(1)} L/m`} alert={false} />
          <Pill label="LEVEL" value={`${state.tank_level_l.toFixed(1)} L`}
            alert={state.tank_level_l < 20 || state.tank_level_l > 130}
          />
          <Pill label="VALVE" value={state.valve_open ? 'OPEN' : 'CLOSED'} alert={!state.valve_open} />
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Scenario badge */}
      {activeScenario !== 'none' && (
        <div style={{
          background: 'rgba(255,45,91,0.12)',
          border: '1px solid rgba(255,45,91,0.35)',
          borderRadius: 20, padding: '3px 12px',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          color: 'var(--red)', fontFamily: 'var(--mono)',
          animation: 'pulse-red 2s ease-in-out infinite',
        }}>
          ⚡ {activeScenario.toUpperCase()}
        </div>
      )}

      {/* Connection icon */}
      <div style={{ color: connected ? 'var(--cyan)' : 'var(--text-3)' }}>
        {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
      </div>
    </header>
  );
}

function Pill({ label, value, alert }: { label: string; value: string; alert: boolean }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${alert ? 'rgba(255,45,91,0.4)' : 'var(--border)'}`,
      borderRadius: 20, padding: '2px 10px',
      display: 'flex', alignItems: 'center', gap: 6,
      transition: 'all 0.3s ease',
    }}>
      <span className="label">{label}</span>
      <span style={{
        fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 500,
        color: alert ? 'var(--red)' : 'var(--text-1)',
        transition: 'color 0.3s',
      }}>{value}</span>
    </div>
  );
}

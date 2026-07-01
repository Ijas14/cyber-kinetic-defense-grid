import type { MachineState } from '../types';

interface Props {
  connected: boolean;
  state: MachineState | null;
  hasViolation: boolean;
}

export default function Header({ connected, state, hasViolation }: Props) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center',
      padding: '14px 20px',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
      background: 'var(--bg)',
    }}>
      {/* Title */}
      <div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700,
          letterSpacing: '0.05em', color: 'var(--text-1)',
        }}>
          CYBER-KINETIC DEFENSE SYSTEM
        </div>
        <div style={{ fontSize: 11, color: '#00d4ff', marginTop: 2, letterSpacing: '0.04em' }}>
          Autonomous Telemetry Compiler &amp; Diagnostic Engine
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Pill dot="dot-green" label="PHYSICS CORE: 60Hz" />
        <Pill dot={connected ? 'dot-cyan' : 'dot-dim'} label={`UI TICK: ${connected ? '26Hz' : 'OFFLINE'}`} />
        {hasViolation && (
          <div style={{
            background: 'rgba(248,81,73,0.12)', border: '1px solid rgba(248,81,73,0.5)',
            borderRadius: 4, padding: '3px 10px',
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)',
            letterSpacing: '0.08em', animation: 'pulse 1.2s ease-in-out infinite',
          }}>
            ⚡ ATTACK ACTIVE
          </div>
        )}
        {state && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 4 }}>
            <SmallPill label="TEMP" value={`${state.heater_temp_c.toFixed(1)}°C`} alert={state.heater_temp_c > 80} />
            <SmallPill label="LEVEL" value={`${state.tank_level_l.toFixed(0)}L`} alert={state.tank_level_l < 10} />
          </div>
        )}
      </div>
    </header>
  );
}

function Pill({ dot, label }: { dot: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 4, padding: '4px 10px',
    }}>
      <span className={`dot ${dot}`} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.06em' }}>
        {label}
      </span>
    </div>
  );
}

function SmallPill({ label, value, alert }: { label: string; value: string; alert: boolean }) {
  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${alert ? 'rgba(248,81,73,0.5)' : 'var(--border)'}`,
      borderRadius: 4, padding: '3px 8px',
      fontFamily: 'var(--mono)', fontSize: 10,
      color: alert ? 'var(--red)' : 'var(--text-2)',
    }}>
      {label}: <span style={{ color: alert ? 'var(--red)' : 'var(--text-1)' }}>{value}</span>
    </div>
  );
}

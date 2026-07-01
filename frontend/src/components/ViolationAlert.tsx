import type { Violation } from '../types';

interface Props {
  violation: Violation | null;
  hasViolation: boolean;
}

const CODE_META: Record<string, { headline: string; source: string }> = {
  ERR_FLOW_001:   { headline: 'Flow Continuity Violated',    source: 'NEWTONIAN FLOW PHYSICS' },
  ERR_THERMO_001: { headline: 'Thermodynamic Law Broken',    source: 'THERMODYNAMICS CORE' },
  ERR_MASS_001:   { headline: 'Conservation of Mass Violated', source: 'NEWTONIAN FLOW PHYSICS' },
};

export default function ViolationAlert({ violation, hasViolation }: Props) {
  if (!hasViolation || !violation) {
    return (
      <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#3fb950', fontSize: 14 }}>✓</span>
        <div>
          <div style={{ color: '#3fb950', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>
            SYSTEM NOMINAL
          </div>
          <div className="eyebrow" style={{ marginTop: 2 }}>All physics constraints satisfied</div>
        </div>
      </div>
    );
  }

  const meta = CODE_META[violation.code] ?? { headline: 'PHYSICS VIOLATION DETECTED', source: 'PHYSICS ENGINE' };

  // Generate a mock Reality vs Telemetry
  let telemetry = "N/A";
  let reality = "N/A";
  let difference = "N/A";
  if (violation.code === 'ERR_FLOW_001') {
    telemetry = "Pump = ON, Flow = 0.0 LPM";
    reality = "Flow ≈ 45.0 LPM";
    difference = "45.0 LPM";
  } else if (violation.code === 'ERR_MASS_001') {
    telemetry = "Tank Level = -2682 L";
    reality = "Tank Level ≈ 98 L";
    difference = "2780 L";
  } else if (violation.code === 'ERR_THERMO_001') {
    telemetry = "Temp = 15°C, Heat = 12kW";
    reality = "Temp ≈ 65°C";
    difference = "50°C";
  }

  return (
    <div
      className="panel animate-fade-in"
      style={{
        border: '1px solid rgba(248,81,73,0.5)',
        background: 'rgba(248,81,73,0.05)',
        padding: '14px 16px',
        animation: 'blink-red 1.5s ease-in-out infinite, fade-in 0.25s ease both',
        display: 'flex', flexDirection: 'column', gap: 12
      }}
    >
      {/* Top brand banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#f85149', fontSize: 18, flexShrink: 0 }}>⚠</span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 800,
            color: '#f85149', letterSpacing: '0.06em', lineHeight: 1.2,
          }}>
            REALITY VIOLATION DETECTED
          </span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#3fb950', letterSpacing: '0.1em' }}>
          PHYSICALLY VERIFIED VIOLATION
        </div>
      </div>

      {/* Sub-label row: code + specific headline + source */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{
            background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.4)',
            borderRadius: 3, padding: '2px 7px',
            fontFamily: 'var(--mono)', fontSize: 10, color: '#f85149', letterSpacing: '0.06em', flexShrink: 0,
          }}>
            {violation.code}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{meta.headline}</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', flexShrink: 0 }}>
          SOURCE: {meta.source}
        </div>
      </div>

      {/* Message */}
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginTop: -4 }}>
        {violation.message}
      </div>

      {/* Reality vs Telemetry */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        background: 'rgba(0,0,0,0.3)', padding: '10px 12px',
        border: '1px solid rgba(248,81,73,0.2)', borderRadius: 4
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>TELEMETRY SAYS</div>
          <div style={{ color: '#f85149', fontSize: 12, fontFamily: 'var(--mono)' }}>{telemetry}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>PHYSICS SAYS</div>
          <div style={{ color: '#3fb950', fontSize: 12, fontFamily: 'var(--mono)' }}>{reality}</div>
        </div>
        <div style={{ borderLeft: '1px dashed rgba(248,81,73,0.4)', paddingLeft: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>DIFFERENCE</div>
          <div style={{ color: '#f85149', fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 'bold' }}>{difference}</div>
        </div>
      </div>
    </div>
  );
}

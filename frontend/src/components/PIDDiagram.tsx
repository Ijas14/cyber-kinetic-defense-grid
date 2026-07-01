import type { MachineState } from '../types';

interface Props {
  state: MachineState | null;
  hasViolation: boolean;
  activeScenario: string;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

const SCENARIO_INFO: Record<string, { label: string; year: string; desc: string }> = {
  stuxnet:     { label: 'STUXNET',     year: '2010', desc: 'Iranian nuclear centrifuge sabotage\nFlow sensor spoofing' },
  triton:      { label: 'TRITON',      year: '2017', desc: 'Saudi petrochemical SIS attack\nSafety system compromise' },
  nightdragon: { label: 'NIGHTDRAGON', year: '2011', desc: 'Global energy sector espionage\nLevel sensor spoofing' },
};

export default function PIDDiagram({ state, hasViolation, activeScenario }: Props) {
  const flow    = clamp((state?.pump_flow_lpm ?? 0) / 20, 0, 1);
  const level   = clamp((state?.tank_level_l ?? 100) / 150, 0, 1);
  const temp    = clamp(((state?.heater_temp_c ?? 20) - 20) / 180, 0, 1);
  const valveOpen  = state?.valve_open ?? true;
  const pumpOn     = state?.pump_on ?? false;
  const heaterOn   = state?.heater_on ?? false;
  const power      = state?.heater_power_w ?? 0;

  const pumpColor  = pumpOn ? '#3fb950' : '#30363d';
  const heaterColor = heaterOn ? (power > 200000 ? '#f85149' : temp > 0.5 ? '#e3b341' : '#e3b341') : '#30363d';
  const valveColor = valveOpen ? '#3fb950' : '#f85149';
  const flowColor  = hasViolation ? '#f85149' : '#3fb950';
  const dashSpeed  = flow > 0.05 ? `${1.2 / (flow + 0.1)}s` : '3s';
  const shakeClass = hasViolation ? 'animate-shake' : '';
  const scenario   = SCENARIO_INFO[activeScenario];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Panel label */}
      <div className="eyebrow" style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)' }}>
        P&amp;ID DIAGRAM
      </div>

      {/* Diagram area */}
      <div style={{
        flex: 1, position: 'relative', padding: 14, minHeight: 0,
      }}>
        {/* Red dashed attack border */}
        <div style={{
          position: 'absolute', inset: 10,
          border: `1.5px dashed ${hasViolation ? 'rgba(248,81,73,0.7)' : 'rgba(48,54,61,0.8)'}`,
          borderRadius: 6,
          transition: 'border-color 0.4s ease',
          pointerEvents: 'none',
          animation: hasViolation ? 'blink-red 1.5s ease-in-out infinite' : 'none',
        }} />

        {/* Attack replay overlay — top right inside box */}
        {scenario && (
          <div style={{
            position: 'absolute', top: 18, right: 18, zIndex: 10,
            background: 'rgba(13,17,23,0.92)',
            border: '1px solid rgba(248,81,73,0.5)',
            borderRadius: 4, padding: '8px 12px',
            maxWidth: 180,
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9, color: '#f85149',
              letterSpacing: '0.1em', marginBottom: 4,
            }}>
              ATTACK REPLAY ACTIVE
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-1)', fontWeight: 700, marginBottom: 4 }}>
              {scenario.label} ({scenario.year})
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {scenario.desc}
            </div>
          </div>
        )}

        {/* SVG */}
        <svg
          viewBox="0 0 500 300"
          width="100%" height="100%"
          className={shakeClass}
          style={{ overflow: 'visible', maxHeight: '100%' }}
        >
          <defs>
            <filter id="glow-green">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ── PIPES ── */}
          {/* Tank bottom → Pump */}
          <line x1="140" y1="200" x2="260" y2="200"
            stroke="rgba(48,54,61,0.6)" strokeWidth="7" strokeLinecap="round"/>
          <line x1="140" y1="200" x2="260" y2="200"
            stroke={flowColor} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="10 10" strokeOpacity={flow > 0.05 ? 0.9 : 0.2}
            style={{ animation: `flow-dash ${dashSpeed} linear infinite` }}
            filter={hasViolation ? 'url(#glow-red)' : undefined}
          />

          {/* Pump → Valve (up then right) */}
          <polyline points="280,200 280,80 280,80"
            fill="none" stroke="rgba(48,54,61,0.6)" strokeWidth="7" strokeLinecap="round"/>
          <line x1="280" y1="200" x2="280" y2="80"
            stroke={flowColor} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="10 10" strokeOpacity={flow > 0.05 ? 0.9 : 0.2}
            style={{ animation: `flow-dash ${dashSpeed} linear infinite`, animationDelay: '0.3s' }}
            filter={hasViolation ? 'url(#glow-red)' : undefined}
          />

          {/* Horizontal top: pump-top → valve */}
          <line x1="280" y1="80" x2="322" y2="80"
            stroke="rgba(48,54,61,0.6)" strokeWidth="7" strokeLinecap="round"/>
          <line x1="280" y1="80" x2="322" y2="80"
            stroke={flowColor} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="10 10" strokeOpacity={flow > 0.05 ? 0.9 : 0.2}
            style={{ animation: `flow-dash ${dashSpeed} linear infinite`, animationDelay: '0.5s' }}
          />

          {/* Valve → Heater (right segment) */}
          <line x1="348" y1="80" x2="368" y2="80"
            stroke="rgba(48,54,61,0.6)" strokeWidth="7" strokeLinecap="round"/>
          <line x1="348" y1="80" x2="368" y2="80"
            stroke={valveOpen ? flowColor : '#f85149'} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="10 10" strokeOpacity={valveOpen ? 0.9 : 0.2}
            style={{ animation: `flow-dash ${dashSpeed} linear infinite`, animationDelay: '0.7s' }}
          />

          {/* Heater → Tank return */}
          <polyline points="400,120 400,200 140,200"
            fill="none" stroke="rgba(48,54,61,0.6)" strokeWidth="7" strokeLinecap="round"/>
          <polyline points="400,120 400,200 140,200"
            fill="none" stroke={hasViolation && activeScenario==='nightdragon' ? '#f85149' : flowColor}
            strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="10 10" strokeOpacity={flow > 0.05 ? 0.7 : 0.2}
            style={{ animation: `flow-dash ${dashSpeed} linear infinite`, animationDelay: '0.9s' }}
            filter={hasViolation && activeScenario==='nightdragon' ? 'url(#glow-red)' : undefined}
          />

          {/* ── TANK ── */}
          <rect x="60" y="100" width="80" height="130" rx="3"
            fill="rgba(22,27,34,0.9)" stroke="rgba(48,54,61,0.8)" strokeWidth="1.5"/>
          <rect x="61" y={100 + 130*(1-level)} width="78" height={130*level} rx="2"
            fill={hasViolation && activeScenario==='nightdragon' ? 'rgba(248,81,73,0.2)' : 'rgba(0,212,255,0.12)'}
            style={{ transition: 'all 0.4s' }}
          />
          <line x1="61" x2="139"
            y1={100 + 130*(1-level)} y2={100 + 130*(1-level)}
            stroke={hasViolation && activeScenario==='nightdragon' ? '#f85149' : '#00d4ff'}
            strokeWidth="1.5"
            filter={hasViolation && activeScenario==='nightdragon' ? 'url(#glow-red)' : undefined}
          />
          <text x="100" y="95" textAnchor="middle" fill="var(--text-2)" fontSize="9" fontFamily="var(--mono)">TANK</text>
          <text x="100" y="245" textAnchor="middle"
            fill={hasViolation && activeScenario==='nightdragon' ? '#f85149' : '#00d4ff'}
            fontSize="12" fontFamily="var(--mono)" fontWeight="700">
            {(state?.tank_level_l ?? 0).toFixed(0)} L
          </text>

          {/* ── PUMP ── */}
          <circle cx="280" cy="200" r="22"
            fill="rgba(22,27,34,0.9)" stroke={pumpColor} strokeWidth="1.8"
            filter={pumpOn ? 'url(#glow-green)' : undefined}
          />
          <g transform="translate(280,200)">
            <g style={{ transformOrigin:'0 0', animation: pumpOn ? `spin ${0.8/(flow+0.1)}s linear infinite` : 'none' }}>
              {[0,45,90,135].map(angle => (
                <line key={angle}
                  x1={Math.cos(angle*Math.PI/180)*-12} y1={Math.sin(angle*Math.PI/180)*-12}
                  x2={Math.cos(angle*Math.PI/180)*12}  y2={Math.sin(angle*Math.PI/180)*12}
                  stroke={pumpColor} strokeWidth="2.5" strokeLinecap="round"
                />
              ))}
            </g>
            <circle r="4" fill={pumpColor} fillOpacity="0.4"/>
          </g>
          <text x="280" y="233" textAnchor="middle" fill="var(--text-2)" fontSize="9" fontFamily="var(--mono)">PUMP</text>
          <text x="280" y="245" textAnchor="middle" fill={pumpColor} fontSize="11" fontFamily="var(--mono)">
            {(state?.pump_flow_lpm ?? 0).toFixed(0)} LPM
          </text>

          {/* ── VALVE ── */}
          <polygon points="335,67 322,80 335,93 348,80"
            fill="rgba(22,27,34,0.9)" stroke={valveColor} strokeWidth="1.8"
            filter={valveOpen ? 'url(#glow-green)' : 'url(#glow-red)'}
          />
          {!valveOpen && (
            <>
              <line x1="324" y1="70" x2="346" y2="90" stroke="#f85149" strokeWidth="1.5"/>
              <line x1="346" y1="70" x2="324" y2="90" stroke="#f85149" strokeWidth="1.5"/>
            </>
          )}
          <text x="335" y="54" textAnchor="middle" fill="var(--text-2)" fontSize="9" fontFamily="var(--mono)">VALVE</text>
          <text x="335" y="106" textAnchor="middle" fill={valveColor} fontSize="10" fontFamily="var(--mono)">
            {valveOpen ? `${(state?.valve_position_pct ?? 0).toFixed(0)}%` : 'CLOSED'}
          </text>

          {/* ── HEATER ── */}
          <rect x="368" y="80" width="64" height="60" rx="3"
            fill="rgba(22,27,34,0.9)" stroke={heaterColor} strokeWidth="1.8"
            filter={heaterOn && power > 200000 ? 'url(#glow-red)' : undefined}
            style={{ transition: 'stroke 0.4s' }}
          />
          {[92, 102, 112, 122, 132].map((y, i) => (
            <line key={i} x1="376" y1={y} x2="424" y2={y}
              stroke={heaterColor} strokeWidth="2" strokeOpacity={heaterOn ? 0.8 : 0.2}
              strokeLinecap="round"
            />
          ))}
          <text x="400" y="76" textAnchor="middle" fill="var(--text-2)" fontSize="9" fontFamily="var(--mono)">HEATER</text>
          <text x="400" y="156" textAnchor="middle" fill={heaterColor} fontSize="12" fontFamily="var(--mono)" fontWeight="700">
            {(state?.heater_temp_c ?? 0).toFixed(1)} °C
          </text>

          {/* Spoofed sensor callouts */}
          {activeScenario === 'stuxnet' && (
            <g>
              <circle cx="220" cy="200" r="8" fill="rgba(248,81,73,0.15)" stroke="#f85149" strokeWidth="1"/>
              <text x="220" y="204" textAnchor="middle" fill="#f85149" fontSize="8" fontWeight="700">!</text>
              <text x="220" y="215" textAnchor="middle" fill="#f85149" fontSize="8" fontFamily="var(--mono)">FT-SPOOFED</text>
            </g>
          )}
          {activeScenario === 'triton' && (
            <g>
              <circle cx="368" cy="100" r="8" fill="rgba(248,81,73,0.15)" stroke="#f85149" strokeWidth="1"/>
              <text x="368" y="104" textAnchor="middle" fill="#f85149" fontSize="8" fontWeight="700">!</text>
              <text x="368" y="116" textAnchor="middle" fill="#f85149" fontSize="8" fontFamily="var(--mono)">TT-SPOOFED</text>
            </g>
          )}
          {activeScenario === 'nightdragon' && (
            <g>
              <circle cx="60" cy="165" r="8" fill="rgba(248,81,73,0.15)" stroke="#f85149" strokeWidth="1"/>
              <text x="60" y="169" textAnchor="middle" fill="#f85149" fontSize="8" fontWeight="700">!</text>
              <text x="60" y="180" textAnchor="middle" fill="#f85149" fontSize="8" fontFamily="var(--mono)">LT-SPOOFED</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

import type { Scenario } from '../types';

interface Props {
  active: Scenario;
  onAttack: (s: Scenario) => void;
}

const ATTACKS: { id: Scenario; icon: string; label: string; sub: string; color: string }[] = [
  { id: 'stuxnet',     icon: '⇄', label: 'Stuxnet',     sub: 'Flow spoofing',  color: '#58a6ff' },
  { id: 'triton',      icon: '🔥', label: 'Triton',      sub: 'Temp spoofing',  color: '#f97316' },
  { id: 'nightdragon', icon: '◇', label: 'NightDragon', sub: 'Level spoofing', color: '#a855f7' },
];

const BTN_BASE: React.CSSProperties = {
  background: '#161b22',
  border: '1px solid #21262d',
  borderRadius: 8,
  padding: '14px 16px',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 0.15s, background 0.15s',
  width: '100%',
};

export default function AttackPanel({ active, onAttack }: Props) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #21262d',
      borderRadius: 8,
      padding: '12px 14px',
    }}>
      {/* Label */}
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#484f58',
        marginBottom: 10,
      }}>
        THREAT INJECTION
      </div>

      {/* 4-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>

        {/* Attack buttons */}
        {ATTACKS.map((a) => {
          const isActive = active === a.id;
          return (
            <button
              key={a.id}
              onClick={() => onAttack(a.id)}
              style={{
                ...BTN_BASE,
                background: isActive ? `color-mix(in srgb, ${a.color} 10%, #161b22)` : '#161b22',
                borderColor: isActive ? `${a.color}66` : '#21262d',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = `color-mix(in srgb, ${a.color} 8%, #161b22)`;
                el.style.borderColor = `${a.color}44`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = isActive ? `color-mix(in srgb, ${a.color} 10%, #161b22)` : '#161b22';
                el.style.borderColor = isActive ? `${a.color}66` : '#21262d';
              }}
            >
              {/* Icon + label */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                marginBottom: 6,
              }}>
                <span style={{ fontSize: 14, lineHeight: 1, color: a.color }}>{a.icon}</span>
                <span style={{
                  fontSize: 13, fontWeight: 500, color: a.color,
                  fontFamily: 'var(--font)', letterSpacing: 0,
                }}>
                  {a.label}
                </span>
              </div>
              {/* Subtitle */}
              <div style={{ fontSize: 11, color: '#6e7681', fontFamily: 'var(--font)' }}>
                {a.sub}
              </div>
            </button>
          );
        })}

        {/* Restore Safety */}
        <button
          onClick={() => onAttack('none')}
          style={{
            ...BTN_BASE,
            background: active === 'none' ? 'rgba(63,185,80,0.08)' : '#161b22',
            borderColor: active === 'none' ? 'rgba(63,185,80,0.4)' : '#21262d',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 6, textAlign: 'center',
            padding: '14px 12px',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = 'rgba(63,185,80,0.06)';
            el.style.borderColor = 'rgba(63,185,80,0.3)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = active === 'none' ? 'rgba(63,185,80,0.08)' : '#161b22';
            el.style.borderColor = active === 'none' ? 'rgba(63,185,80,0.4)' : '#21262d';
          }}
        >
          <span style={{
            fontSize: 20,
            color: active === 'none' ? '#3fb950' : '#484f58',
            transition: 'color 0.15s',
            lineHeight: 1,
          }}>
            ✓
          </span>
          <span style={{
            fontSize: 13, fontWeight: 500,
            color: active === 'none' ? '#3fb950' : '#8b949e',
            transition: 'color 0.15s',
            fontFamily: 'var(--font)',
          }}>
            Restore Safety
          </span>
        </button>
      </div>
    </div>
  );
}

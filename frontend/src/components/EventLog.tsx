import type { TimelineEntry } from '../types';

interface Props {
  entries: TimelineEntry[];
}

const KIND_COLOR: Record<string, string> = {
  info:      'var(--text-2)',
  attack:    '#e3b341',
  violation: '#f85149',
};

export default function EventLog({ entries }: Props) {
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <span className="eyebrow">EVENT TIMELINE</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {entries.length === 0 && (
          <div style={{ padding: '10px 14px', color: 'var(--text-2)', fontSize: 11, fontStyle: 'italic' }}>
            No events yet
          </div>
        )}
        {[...entries].reverse().map((e) => (
          <div
            key={e.id}
            className="animate-fade-in"
            style={{
              display: 'flex', gap: 14, padding: '5px 14px',
              alignItems: 'baseline',
            }}
            onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--surface-hi)')}
            onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
          >
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-2)',
              flexShrink: 0, minWidth: 38,
            }}>
              {e.ts.split(':').slice(0,2).join(':')}
            </span>
            <span style={{
              fontSize: 12, color: KIND_COLOR[e.kind] ?? 'var(--text-2)',
              lineHeight: 1.5,
            }}>
              {e.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

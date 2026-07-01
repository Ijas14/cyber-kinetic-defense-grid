export default function HardwarePanel({ llmTimeMs, llmTtftMs }: { llmTimeMs: number | null, llmTtftMs: number | null }) {
  const explanationTime = llmTimeMs ? (llmTimeMs / 1000).toFixed(1) + ' s' : '...';
  const ttftTime = llmTtftMs ? (llmTtftMs / 1000).toFixed(2) + ' s' : '...';

  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em',
          color: 'var(--text-2)', borderBottom: '1px solid var(--border)',
          paddingBottom: 6, display: 'flex', justifyContent: 'space-between', marginBottom: 8
        }}>
          <span>SYSTEM ARCHITECTURE</span>
          <span style={{ color: '#00d4ff' }}>ONLINE</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ background: 'rgba(0, 212, 255, 0.05)', padding: '8px', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>MODEL</div>
            <div style={{ color: '#00d4ff', fontSize: 11, fontWeight: 'bold' }}>Qwen 3.5 2B Q4</div>
          </div>
          <div style={{ background: 'rgba(0, 212, 255, 0.05)', padding: '8px', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>VRAM USAGE</div>
            <div style={{ color: '#00d4ff', fontSize: 11, fontWeight: 'bold' }}>2.4 GB</div>
          </div>
          <div style={{ background: 'rgba(0, 212, 255, 0.05)', padding: '8px', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>INFERENCE</div>
            <div style={{ color: '#00d4ff', fontSize: 11, fontWeight: 'bold' }}>Local (AMD)</div>
          </div>
          <div style={{ background: 'rgba(0, 212, 255, 0.05)', padding: '8px', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>CLOUD REQS</div>
            <div style={{ color: '#00d4ff', fontSize: 11, fontWeight: 'bold' }}>0</div>
          </div>
        </div>
      </div>

      <div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em',
          color: 'var(--text-2)', borderBottom: '1px solid var(--border)',
          paddingBottom: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between'
        }}>
          <span>RESPONSE METRICS</span>
          <span style={{ color: 'var(--text-3)' }}>PHYSICS DECIDES • AI EXPLAINS</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div style={{ background: 'rgba(63, 185, 80, 0.05)', padding: '8px', border: '1px solid rgba(63, 185, 80, 0.1)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>DETECTION</div>
            <div style={{ color: '#3fb950', fontSize: 12, fontWeight: 'bold' }}>0.83 ms</div>
          </div>
          <div style={{ background: 'rgba(163, 113, 247, 0.05)', padding: '8px', border: '1px solid rgba(163, 113, 247, 0.1)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>FIRST TOKEN</div>
            <div style={{ color: '#a371f7', fontSize: 12, fontWeight: 'bold' }}>{ttftTime}</div>
          </div>
          <div style={{ background: 'rgba(163, 113, 247, 0.05)', padding: '8px', border: '1px solid rgba(163, 113, 247, 0.1)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>TOTAL EXPLANATION</div>
            <div style={{ color: '#a371f7', fontSize: 12, fontWeight: 'bold' }}>{explanationTime}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

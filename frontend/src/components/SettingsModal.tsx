import { useState, useEffect } from 'react';

interface LlmConfig {
  model: string;
  endpoint: string;
  temperature: number;
  max_tokens: number;
}

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [config, setConfig] = useState<LlmConfig>({
    model: '',
    endpoint: '',
    temperature: 0.3,
    max_tokens: 150,
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((data: LlmConfig) => setConfig(data))
      .catch(() => setErrorMsg('Failed to load config'));
  }, []);

  const save = async () => {
    setStatus('saving');
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Unknown error');
      setStatus('error');
    }
  };

  const field = (
    label: string,
    key: keyof LlmConfig,
    type: 'text' | 'number' = 'text',
    hint?: string
  ) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--text-2)', letterSpacing: '0.1em', marginBottom: 6,
      }}>
        {label}
      </label>
      <input
        id={`settings-${key}`}
        type={type}
        step={type === 'number' ? (key === 'temperature' ? 0.05 : 10) : undefined}
        value={config[key]}
        onChange={e => setConfig(prev => ({
          ...prev,
          [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value,
        }))}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(22,27,34,0.9)',
          border: '1px solid var(--border)',
          borderRadius: 4, padding: '8px 10px',
          fontFamily: 'var(--mono)', fontSize: 13,
          color: 'var(--text-1)',
          outline: 'none',
        }}
      />
      {hint && (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-2)', marginTop: 4 }}>
          {hint}
        </p>
      )}
    </div>
  );

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-2)' }}>
            ⚙ LLM CONFIGURATION
          </span>
          <button
            id="settings-close"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-2)', fontSize: 16, lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 8px' }}>
          {field('MODEL NAME', 'model', 'text', 'Must match the model name loaded in Lemonade')}
          {field('LLM ENDPOINT', 'endpoint', 'text', 'OpenAI-compatible completions URL')}
          {field('TEMPERATURE', 'temperature', 'number', 'Lower = more deterministic (0.0 – 1.0)')}
          {field('MAX TOKENS', 'max_tokens', 'number', 'Maximum tokens per explanation')}

          {status === 'error' && (
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#f85149', marginBottom: 12 }}>
              ✕ {errorMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '12px 20px', borderTop: '1px solid var(--border)',
        }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, padding: '7px 16px',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text-2)', cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            id="settings-save"
            onClick={save}
            disabled={status === 'saving'}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, padding: '7px 16px',
              background: status === 'saved' ? '#3fb950' : '#00d4ff',
              border: 'none', borderRadius: 4, color: '#0d1117',
              cursor: status === 'saving' ? 'wait' : 'pointer',
              fontWeight: 700, letterSpacing: '0.06em',
              transition: 'background 0.3s',
            }}
          >
            {status === 'saving' ? 'SAVING...' : status === 'saved' ? '✓ SAVED' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Props {
  text: string;
  loading: boolean;
}

export default function AIPanel({ text, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [text]);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>🧠</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-2)' }}>
            AI DIAGNOSTICS
          </span>
        </div>
        {loading && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#00d4ff', letterSpacing: '0.08em' }}>
            🔄 ANALYSING...
          </span>
        )}
        {!loading && text && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#3fb950', letterSpacing: '0.08em' }}>
            ● QWEN 3.5 2B
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        fontFamily: 'var(--mono)', fontSize: 15, lineHeight: 1.8,
        color: '#00d4ff',
      }}>
        {!text && !loading && (
          <span style={{ color: 'var(--text-2)', fontStyle: 'italic', fontSize: 11 }}>
            Awaiting attack injection to trigger diagnostic analysis...
          </span>
        )}
        <div style={{ color: 'var(--text-1)' }} className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p: ({node, ...props}) => <p style={{ margin: '0 0 10px 0' }} {...props} />
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
        {loading && <span style={{ color: '#00d4ff', opacity: 0.7 }}> ▊</span>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

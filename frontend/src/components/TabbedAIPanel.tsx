import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { PersonaId } from '../types';

export type PersonaStatus = 'idle' | 'queued' | 'streaming' | 'completed';

interface Props {
  explanations: Record<PersonaId, string>;
  status: Record<PersonaId, PersonaStatus>;
}

const TABS: { id: PersonaId; label: string; icon: string }[] = [
  { id: 'PhysicsAnalyst', label: 'PHYSICS', icon: '🔬' },
  { id: 'IncidentCommander', label: 'INCIDENT', icon: '📋' },
  { id: 'FieldOperator', label: 'OPERATIONS', icon: '👷' },
];

export default function TabbedAIPanel({ explanations, status }: Props) {
  const [activeTab, setActiveTab] = useState<PersonaId>('PhysicsAnalyst');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-switch to the currently streaming tab
  useEffect(() => {
    const streamingTab = TABS.find(t => status[t.id] === 'streaming');
    if (streamingTab) {
      setActiveTab(streamingTab.id);
    }
  }, [status]);

  // Auto-scroll when the active explanation changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [explanations[activeTab]]);

  const activeText = explanations[activeTab];
  const activeStatus = status[activeTab];

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const s = status[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '9px 4px', background: isActive ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                border: 'none', borderRight: '1px solid var(--border)',
                borderBottom: isActive ? '2px solid #00d4ff' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background 0.2s',
              }}
            >
              <span style={{ fontSize: 13 }}>{tab.icon}</span>
              <span style={{ 
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.05em', 
                color: isActive ? '#00d4ff' : 'var(--text-2)',
                fontWeight: isActive ? 'bold' : 'normal'
              }}>
                {tab.label}
              </span>
              {/* Status Indicator */}
              <span style={{ fontSize: 10, marginLeft: 2 }}>
                {s === 'completed' && <span style={{ color: '#3fb950' }}>●</span>}
                {s === 'streaming' && <span style={{ color: '#00d4ff' }}>▊</span>}
                {s === 'queued' && <span style={{ color: 'var(--text-3)' }}>◌</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        fontFamily: 'var(--mono)', fontSize: 15, lineHeight: 1.8,
        color: '#00d4ff',
      }}>
        {!activeText && activeStatus === 'idle' && (
          <span style={{ color: 'var(--text-2)', fontStyle: 'italic', fontSize: 11 }}>
            Awaiting attack injection to trigger analysis...
          </span>
        )}
        {!activeText && activeStatus === 'queued' && (
          <span style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: 11 }}>
            Waiting for previous adapter to finish...
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
            {activeText}
          </ReactMarkdown>
        </div>
        {activeStatus === 'streaming' && <span style={{ color: '#00d4ff', opacity: 0.7 }}> ▊</span>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

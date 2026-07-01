import { useEffect, useRef, useState, useCallback } from 'react';
import type { MachineState, Violation, TimelineEntry, Scenario } from './types';
import Header from './components/Header';
import PIDDiagram from './components/PIDDiagram';
import ViolationAlert from './components/ViolationAlert';
import TabbedAIPanel from './components/TabbedAIPanel';
import AttackPanel from './components/AttackPanel';
import EventLog from './components/EventLog';
import SettingsModal from './components/SettingsModal';
import HardwarePanel from './components/HardwarePanel';

let eventIdCounter = 0;
function makeEntry(kind: TimelineEntry['kind'], text: string): TimelineEntry {
  return { id: eventIdCounter++, ts: new Date().toLocaleTimeString(), kind, text };
}

export default function App() {
  const [connected, setConnected]       = useState(false);
  const [state, setState]               = useState<MachineState | null>(null);
  const [violation, setViolation]       = useState<Violation | null>(null);
  const [hasViolation, setHasViolation] = useState(false);
  const [explanations, setExplanations] = useState<Record<import('./types').PersonaId, string>>({
    PhysicsAnalyst: '',
    IncidentCommander: '',
    FieldOperator: ''
  });
  const [personaStatus, setPersonaStatus] = useState<Record<import('./types').PersonaId, import('./components/TabbedAIPanel').PersonaStatus>>({
    PhysicsAnalyst: 'idle',
    IncidentCommander: 'idle',
    FieldOperator: 'idle'
  });
  const [scenario, setScenario]         = useState<Scenario>('none');
  const [showSettings, setShowSettings] = useState(false);
  const [log, setLog]                   = useState<TimelineEntry[]>([
    makeEntry('info', 'System restored to nominal operating state.'),
  ]);
  const [llmTimeMs, setLlmTimeMs] = useState<number | null>(null);
  const [llmTtftMs, setLlmTtftMs] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const attackAbortRef = useRef<AbortController | null>(null);
  const llmStartRef = useRef<number | null>(null);

  const pushLog = useCallback((e: TimelineEntry) => {
    setLog(prev => [...prev.slice(-99), e]);
  }, []);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(`ws://${window.location.hostname}:3000/ws`);
      wsRef.current = ws;
      ws.onopen = () => { setConnected(true); pushLog(makeEntry('info', 'WebSocket connected.')); };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { type: string; payload: unknown };
          if (msg.type === 'StateUpdate') {
            setState(msg.payload as MachineState);
          } else if (msg.type === 'ViolationDetected') {
            const v = msg.payload as Violation;
            setViolation(v); setHasViolation(true);
            setExplanations({
              PhysicsAnalyst: '',
              IncidentCommander: '',
              FieldOperator: ''
            });
            setPersonaStatus({
              PhysicsAnalyst: 'queued',
              IncidentCommander: 'queued',
              FieldOperator: 'queued'
            });
            setLlmTimeMs(null);
            setLlmTtftMs(null);
            llmStartRef.current = Date.now();
            pushLog(makeEntry('violation', `Violation Detected: ${v.code}`));
          } else if (msg.type === 'PersonaExplanationChunk') {
            const { persona_id, chunk } = msg.payload as { persona_id: import('./types').PersonaId, chunk: string };
            
            // Record TTFT on first chunk
            setLlmTtftMs(prev => {
              if (prev === null && llmStartRef.current && chunk !== '[DONE]') {
                return Date.now() - llmStartRef.current;
              }
              return prev;
            });

            if (chunk === '[DONE]') {
              setPersonaStatus(prev => {
                const next = { ...prev, [persona_id]: 'completed' as const };
                // If all are completed, calculate total time
                if (Object.values(next).every(s => s === 'completed')) {
                  if (llmStartRef.current) {
                    setLlmTimeMs(Date.now() - llmStartRef.current);
                  }
                }
                return next;
              });
            } else {
              setPersonaStatus(prev => ({ ...prev, [persona_id]: 'streaming' }));
              setExplanations(prev => ({ ...prev, [persona_id]: prev[persona_id] + chunk }));
            }
          }
        } catch { /* ignore */ }
      };
      ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => wsRef.current?.close();
  }, [pushLog]);

  const handleAttack = useCallback(async (s: Scenario) => {
    // Cancel any previous in-flight attack request to prevent race conditions
    if (attackAbortRef.current) {
      attackAbortRef.current.abort();
    }
    const controller = new AbortController();
    attackAbortRef.current = controller;

    setScenario(s);
    if (s === 'none') {
      setHasViolation(false); setViolation(null);
      setExplanations({
        PhysicsAnalyst: '',
        IncidentCommander: '',
        FieldOperator: ''
      });
      setPersonaStatus({
        PhysicsAnalyst: 'idle',
        IncidentCommander: 'idle',
        FieldOperator: 'idle'
      });
      setLlmTimeMs(null);
      pushLog(makeEntry('info', 'Safety restored — system nominal.'));
    } else {
      pushLog(makeEntry('attack', `Attack Injected: ${s.toUpperCase()}`));
    }
    try {
      await fetch(`http://${window.location.hostname}:3000/api/attack/${s}`, {
        method: 'POST',
        signal: controller.signal,
      });
    } catch (err) {
      // Ignore AbortError — it means a newer click superseded this one
      if (err instanceof Error && err.name !== 'AbortError') {
        pushLog(makeEntry('info', 'Backend unreachable.'));
      }
    }
  }, [pushLog]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar: Header + gear button */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Header connected={connected} state={state} hasViolation={hasViolation} />
        </div>
        <button
          id="open-settings"
          title="LLM Configuration"
          onClick={() => setShowSettings(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-2)', fontSize: 18, padding: '0 16px',
            lineHeight: 1, transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#00d4ff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
        >
          ⚙
        </button>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Main: P&ID left, panels right */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10, padding: '10px 14px 8px',
      }}>
        {/* Left column */}
        <div style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: 8, minHeight: 0 }}>
          {/* Left — P&ID panel */}
          <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PIDDiagram state={state} hasViolation={hasViolation} activeScenario={scenario} />
          </div>
          
          {/* Bottom Left — Hardware Panel */}
          <HardwarePanel llmTimeMs={llmTimeMs} llmTtftMs={llmTtftMs} />
        </div>

        {/* Right column */}
        <div style={{
          display: 'grid',
          gridTemplateRows: 'auto 1fr 160px',
          gap: 8, minHeight: 0,
        }}>
          <ViolationAlert violation={violation} hasViolation={hasViolation} />
          <TabbedAIPanel explanations={explanations} status={personaStatus} />
          <EventLog entries={log} />
        </div>
      </div>

      {/* Bottom — Attack panel */}
      <div style={{ padding: '0 14px 12px' }}>
        <AttackPanel active={scenario} onAttack={handleAttack} />
      </div>
    </div>
  );
}

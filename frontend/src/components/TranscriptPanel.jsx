// src/components/TranscriptPanel.jsx
import { useEffect, useRef, useState } from 'react';

const STATUS_COLOR = { idle: 'text-muted', waiting: 'text-subtle animate-pulse', connecting: 'text-accent animate-pulse', active: 'text-jade', paused: 'text-subtle', error: 'text-ember', disabled: 'text-muted' };
const STATUS_LABEL = { idle: 'Off', waiting: 'Waiting for call…', connecting: 'Connecting…', active: 'Live', paused: 'Paused', error: 'Error', disabled: 'Off' };

export default function TranscriptPanel({ lines, interim, status, error, enabled, onToggle, onClear, username }) {
  const [tab,       setTab]       = useState('subtitles');
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (tab === 'transcript' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, tab]);

  const finalLines = lines.filter(l => l.isFinal).slice(-2);

  return (
    <div className={`card overflow-hidden transition-all ${collapsed ? 'h-9' : tab === 'transcript' ? 'h-52' : 'h-auto min-h-[6rem]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0 h-9">
        <div className="flex gap-1">
          {['subtitles', 'transcript'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-2.5 py-0.5 text-[10px] rounded font-medium capitalize transition-colors ${tab === t ? 'bg-accent/20 text-accent-bright' : 'text-muted hover:text-subtle'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`text-[9px] font-mono uppercase tracking-widest ${STATUS_COLOR[status] || 'text-muted'}`}>
            ● {STATUS_LABEL[status] || status}
          </span>
          {lines.length > 0 && (
            <button onClick={onClear} className="text-[9px] font-mono text-muted hover:text-ember transition-colors">clear</button>
          )}
          {/* Toggle switch */}
          <button onClick={onToggle} title={enabled ? 'Disable transcription' : 'Enable transcription'}
            className={`relative w-7 h-3.5 rounded-full transition-colors ${enabled ? 'bg-accent' : 'bg-border'}`}>
            <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
          </button>
          <button onClick={() => setCollapsed(v => !v)} className="text-muted hover:text-subtle">
            <svg className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error bar */}
      {error && !collapsed && <div className="px-3 py-1 bg-ember/10 text-ember text-[10px] font-mono border-b border-ember/20">⚠ {error}</div>}

      {/* Content */}
      {!collapsed && enabled && (
        tab === 'subtitles'
          ? <SubtitleView lines={finalLines} interim={interim} username={username} />
          : <TranscriptView lines={lines} interim={interim} username={username} scrollRef={scrollRef} />
      )}
      {!collapsed && !enabled && (
        <div className="px-3 py-4 text-center text-xs text-muted">Transcription off — toggle to enable</div>
      )}
    </div>
  );
}

function SubtitleView({ lines, interim, username }) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2">
      {lines.map(l => (
        <div key={l.id} className={`text-xs rounded-lg px-2.5 py-1.5 max-w-[80%] ${l.speaker === 'local' ? 'self-end bg-accent/15 border border-accent/20 text-right' : 'self-start bg-surface border border-border'}`}>
          <div className={`text-[9px] font-mono mb-0.5 ${l.speaker === 'local' ? 'text-accent-bright' : 'text-jade'}`}>{l.username}</div>
          {l.text}
        </div>
      ))}
      {interim && (
        <div className="self-end text-xs italic opacity-60 px-2.5 py-1 rounded-lg border border-dashed border-accent/30 max-w-[80%]">
          {interim}<span className="inline-block w-0.5 h-3 bg-white/60 ml-0.5 animate-pulse align-middle" />
        </div>
      )}
      {lines.length === 0 && !interim && <p className="text-[10px] text-muted text-center py-2 font-mono">Listening… start speaking</p>}
    </div>
  );
}

function TranscriptView({ lines, interim, username, scrollRef }) {
  return (
    <div ref={scrollRef} className="flex flex-col gap-2 px-3 py-2 overflow-y-auto h-full">
      {lines.length === 0 && <p className="text-[10px] text-muted text-center py-3 font-mono">No transcript yet</p>}
      {lines.map(l => (
        <div key={l.id} className={`flex flex-col ${l.speaker === 'local' ? 'items-end' : 'items-start'}`}>
          <span className={`text-[9px] font-mono mb-0.5 ${l.speaker === 'local' ? 'text-accent-bright' : 'text-jade'}`}>{l.username}</span>
          <div className={`text-xs px-3 py-1.5 rounded-xl max-w-[80%] ${l.speaker === 'local' ? 'bg-accent/15 border border-accent/20' : 'bg-surface border border-border'}`}>{l.text}</div>
        </div>
      ))}
      {interim && <div className="flex flex-col items-end opacity-60"><span className="text-[9px] font-mono text-accent-bright mb-0.5">{username}</span><div className="text-xs italic px-3 py-1.5 rounded-xl border border-dashed border-accent/30">{interim}<span className="inline-block w-0.5 h-3 bg-white/60 ml-0.5 animate-pulse align-middle" /></div></div>}
    </div>
  );
}

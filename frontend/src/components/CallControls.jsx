// src/components/CallControls.jsx
function Btn({ onClick, disabled, danger, active, title, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`w-13 h-13 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 focus:outline-none
        ${danger  ? 'bg-ember hover:bg-red-400 text-white shadow-lg shadow-ember/30'
        : active  ? 'bg-surface border border-ember/50 text-ember'
        :           'bg-surface border border-border hover:border-accent/50 text-subtle hover:text-white'}`}>
      {children}
    </button>
  );
}

export default function CallControls({ isMicMuted, isCameraOff, onToggleMic, onToggleCamera, onHangUp, disabled }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Btn onClick={onToggleMic} disabled={disabled} active={isMicMuted} title={isMicMuted ? 'Unmute mic' : 'Mute mic'}>
        {isMicMuted
          ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/></svg>
          : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
        }
      </Btn>

      <Btn onClick={onHangUp} danger title="End call">
        <svg className="w-5 h-5 rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
        </svg>
      </Btn>

      <Btn onClick={onToggleCamera} disabled={disabled} active={isCameraOff} title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}>
        {isCameraOff
          ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="1" y1="1" x2="23" y2="23"/><path d="M15.54 15.54A4 4 0 018.46 8.46M20 20L4 4"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 01-4.24-4.24M1 1l22 22"/></svg>
          : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
        }
      </Btn>
    </div>
  );
}

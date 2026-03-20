// src/components/VideoPane.jsx
export default function VideoPane({ videoRef, label, isPrimary, isPiP, isMuted, isCameraOff, isMicMuted, isActive }) {
  if (isPiP) {
    return (
      <div className="absolute bottom-3 right-3 w-40 aspect-video rounded-xl overflow-hidden border border-border shadow-2xl z-10">
        {isCameraOff
          ? <div className="w-full h-full bg-surface flex items-center justify-center text-2xl">👤</div>
          : <video ref={videoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-cover scale-x-[-1]" />
        }
        <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-1">
          {isMicMuted && <span className="text-ember text-[9px]">🎤✗</span>}
          <span className="text-[9px] text-white/80 font-mono truncate">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden border transition-colors ${isActive ? 'border-accent/30' : 'border-border'}`}>
      {!isActive && (
        <div className="absolute inset-0 bg-surface flex flex-col items-center justify-center gap-3 z-10">
          <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-xl">👤</div>
          <p className="text-subtle text-xs font-mono">Waiting for partner…</p>
        </div>
      )}
      <video ref={videoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-cover bg-surface" />
      {isActive && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse" />
          <span className="text-[10px] font-mono text-white/90">{label}</span>
        </div>
      )}
    </div>
  );
}

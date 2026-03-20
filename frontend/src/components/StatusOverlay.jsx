// src/components/StatusOverlay.jsx
const STATUS = {
  idle:             { icon: '⏳', title: 'Waiting for Partner',     sub: 'Share the room code and wait for someone to join', spin: true },
  'acquiring-media':{ icon: '🎥', title: 'Requesting Camera & Mic', sub: 'Allow access when your browser prompts you',  spin: true },
  connecting:       { icon: null, title: 'Connecting to Partner',   sub: 'Establishing encrypted P2P connection…',      spin: true },
  reconnecting:     { icon: '🔄', title: 'Reconnecting…',           sub: 'Connection interrupted — trying to restore',  spin: true },
  ended:            { icon: '👋', title: 'Call Ended',              sub: 'Your session has finished',                   spin: false },
  error:            { icon: '⚠️', title: 'Connection Error',        sub: null,                                          spin: false },
};

export default function StatusOverlay({ status, error }) {
  const cfg = STATUS[status] || STATUS.idle;
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl">
      {cfg.spin
        ? <div className="relative w-14 h-14 mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div className="absolute inset-0 rounded-full border-2 border-t-accent border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            {cfg.icon && <div className="absolute inset-0 flex items-center justify-center text-xl">{cfg.icon}</div>}
          </div>
        : cfg.icon && <div className="text-4xl mb-4">{cfg.icon}</div>
      }
      <h3 className="text-white font-semibold text-base mb-1.5">{cfg.title}</h3>
      <p className="text-subtle text-xs text-center max-w-xs">
        {status === 'error' ? (error || 'An unexpected error occurred.') : cfg.sub}
      </p>
    </div>
  );
}

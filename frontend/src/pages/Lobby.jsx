// src/pages/Lobby.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' }, { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'fr', label: '🇫🇷 French' },  { code: 'de', label: '🇩🇪 German' },
  { code: 'pt', label: '🇧🇷 Portuguese' },{ code: 'ja', label: '🇯🇵 Japanese' },
  { code: 'zh', label: '🇨🇳 Mandarin' }, { code: 'ko', label: '🇰🇷 Korean' },
  { code: 'ar', label: '🇸🇦 Arabic' },   { code: 'hi', label: '🇮🇳 Hindi' },
  { code: 'ru', label: '🇷🇺 Russian' },  { code: 'it', label: '🇮🇹 Italian' },
];

const genRoom = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function Lobby() {
  const navigate = useNavigate();
  const [username,   setUsername]   = useState('');
  const [roomId,     setRoomId]     = useState('');
  const [nativeLang, setNativeLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');

  const join = (e) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim()) return;
    navigate(`/room/${roomId.trim().toUpperCase()}?username=${encodeURIComponent(username.trim())}&language=${nativeLang}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-void">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/20 border border-accent/30 mb-4">
            <span className="text-accent text-2xl font-bold">LL</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">LinguaLink</h1>
          <p className="text-subtle text-sm">P2P language exchange with live AI transcription</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <form onSubmit={join} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-subtle mb-1.5 uppercase tracking-wider">Your Name</label>
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter your name" maxLength={30} required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-white placeholder-muted text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Languages */}
            <div className="grid grid-cols-2 gap-3">
              {[['I speak', nativeLang, setNativeLang], ['I\'m learning', targetLang, setTargetLang]].map(([label, val, set]) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-subtle mb-1.5 uppercase tracking-wider">{label}</label>
                  <select value={val} onChange={e => set(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent transition-colors">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Room code */}
            <div>
              <label className="block text-xs font-semibold text-subtle mb-1.5 uppercase tracking-wider">Room Code</label>
              <div className="flex gap-2">
                <input
                  value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())}
                  placeholder="e.g. AB12CD" maxLength={10} required
                  className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-white placeholder-muted text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-accent transition-colors"
                />
                <button type="button" onClick={() => setRoomId(genRoom())} className="btn-ghost text-xs px-3 whitespace-nowrap">
                  New Room
                </button>
              </div>
              <p className="text-xs text-muted mt-1.5">Share this code with your partner — both must use the same code.</p>
            </div>

            <button type="submit" disabled={!username.trim() || !roomId.trim()}
              className="btn-primary w-full py-3 text-sm">
              Join Call →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

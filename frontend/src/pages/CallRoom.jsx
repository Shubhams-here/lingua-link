// src/pages/CallRoom.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import useWebRTC        from '../hooks/useWebRTC';
import useTranscription from '../hooks/useTranscription';
import socket           from '../utils/socket';
import VideoPane        from '../components/VideoPane';
import CallControls     from '../components/CallControls';
import StatusOverlay    from '../components/StatusOverlay';
import TranscriptPanel  from '../components/TranscriptPanel';

export default function CallRoom() {
  const { roomId }     = useParams();
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const username       = sp.get('username') || 'You';
  const language       = sp.get('language')  || 'en';

  // Track socket.id — needed for the transcription WebSocket auth
  const [socketId, setSocketId] = useState(null);
  useEffect(() => {
    const onConnect    = () => setSocketId(socket.id);
    const onDisconnect = () => setSocketId(null);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setSocketId(socket.id);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, []);

  const {
    localVideoRef, remoteVideoRef,
    callStatus, isMicMuted, isCameraOff, connectionQuality, error,
    localStream, toggleMic, toggleCamera, hangUp,
  } = useWebRTC({ roomId, username });

  const [txEnabled, setTxEnabled] = useState(true);

  const { transcriptLines, interimText, txStatus, txError, clearTranscript } = useTranscription({
    localStream, socketId, roomId, username, language,
    callStatus, isMicMuted, isEnabled: txEnabled,
  });

  const handleHangUp = () => { hangUp(); navigate('/'); };

  return (
    <div className="flex flex-col h-screen bg-void overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
            <span className="text-accent text-xs font-bold">LL</span>
          </div>
          <span className="font-semibold text-white text-sm">LinguaLink</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          {callStatus === 'connected' && (
            <span className="flex items-center gap-1.5 text-jade">
              <span className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse inline-block" />
              LIVE
            </span>
          )}
          <span className="text-muted">{roomId}</span>
          {connectionQuality && (
            <span className={connectionQuality === 'good' ? 'text-jade' : 'text-ember'}>
              ● {connectionQuality}
            </span>
          )}
        </div>
      </header>

      {/* Main — video + transcript */}
      <main className="flex-1 flex flex-col min-h-0 p-3 gap-3">
        {/* Video */}
        <div className="relative flex-1 min-h-0">
          <VideoPane videoRef={remoteVideoRef} isActive={callStatus === 'connected'} label="Partner" isPrimary />
          <VideoPane videoRef={localVideoRef}  isMuted isPiP label={username} isCameraOff={isCameraOff} isMicMuted={isMicMuted} />
          {callStatus !== 'connected' && <StatusOverlay status={callStatus} error={error} />}
        </div>

        {/* Transcript */}
        <div className="shrink-0">
          <TranscriptPanel
            lines={transcriptLines} interim={interimText}
            status={txStatus} error={txError}
            enabled={txEnabled} onToggle={() => setTxEnabled(v => !v)}
            onClear={clearTranscript} username={username}
          />
        </div>
      </main>

      {/* Controls */}
      <footer className="shrink-0 pb-5">
        <CallControls
          isMicMuted={isMicMuted} isCameraOff={isCameraOff}
          onToggleMic={toggleMic} onToggleCamera={toggleCamera}
          onHangUp={handleHangUp}
          disabled={callStatus === 'ended' || callStatus === 'error'}
        />
      </footer>
    </div>
  );
}

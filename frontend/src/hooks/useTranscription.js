// src/hooks/useTranscription.js
import { useEffect, useRef, useState, useCallback } from 'react';
import socket from '../utils/socket';

const BACKEND_WS = (() => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return 'ws://localhost:5000';
  // Convert http(s) URL to ws(s) URL
  return apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
})();
const CHUNK_MS   = 250;
const MIME_LIST  = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

export default function useTranscription({ localStream, socketId, roomId, username, language = 'en', callStatus, isMicMuted, isEnabled }) {
  const wsRef       = useRef(null);
  const recorderRef = useRef(null);
  const wsReady     = useRef(false);
  const chunkBuf    = useRef([]);

  const [lines,       setLines]       = useState([]);
  const [interim,     setInterim]     = useState('');
  const [txStatus,    setTxStatus]    = useState('idle');
  const [txError,     setTxError]     = useState(null);

  const appendLine = useCallback((line) => {
    setLines(prev => {
      const next = [...prev, { ...line, id: Date.now() + Math.random() }];
      return next.length > 300 ? next.slice(-300) : next;
    });
  }, []);

  // Listen for partner's transcript coming via socket relay
  useEffect(() => {
    const onRemote = ({ speakerUsername, text, language: lang }) => {
      if (!text) return;
      appendLine({ speaker: 'remote', username: speakerUsername || 'Partner', text, language: lang, isFinal: true, timestamp: Date.now() });
    };
    socket.on('transcript:remote', onRemote);
    return () => socket.off('transcript:remote', onRemote);
  }, [appendLine]);

  // Show 'waiting' status when enabled but call isn't connected yet
  useEffect(() => {
    if (isEnabled && callStatus !== 'connected') {
      setTxStatus('waiting');
    } else if (!isEnabled) {
      setTxStatus('idle');
    }
  }, [isEnabled, callStatus]);

  // Main transcription pipeline
  useEffect(() => {
    if (!isEnabled || callStatus !== 'connected' || !socketId || !roomId) return;

    let alive = true;
    const stream = localStream?.current;
    if (!stream) { console.warn('[Tx] No local stream available'); return; }

    // Build WebSocket to backend transcription server
    const params = new URLSearchParams({ socketId, roomId, language, username: encodeURIComponent(username) });
    const ws = new WebSocket(`${BACKEND_WS}/transcription?${params}`);
    wsRef.current = ws;
    setTxStatus('connecting');

    ws.onopen = () => { console.log('[Tx] WS open'); };

    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'ready') {
          wsReady.current = true;
          setTxStatus('active');
          // Drain any buffered chunks
          chunkBuf.current.forEach(c => ws.readyState === 1 && ws.send(c));
          chunkBuf.current = [];
        } else if (msg.type === 'transcript') {
          if (msg.isFinal) {
            setInterim('');
            appendLine({ speaker: 'local', username, text: msg.text, language: msg.language, isFinal: true, confidence: msg.confidence, timestamp: Date.now() });
          } else {
            setInterim(msg.text);
          }
        } else if (msg.type === 'utterance_end') {
          setInterim(prev => { if (prev) appendLine({ speaker: 'local', username, text: prev, language, isFinal: true, timestamp: Date.now() }); return ''; });
        } else if (msg.type === 'error') {
          setTxError(msg.message);
        }
      } catch {}
    };

    ws.onclose = (e) => {
      wsReady.current = false;
      if (!alive) return;
      if (e.code === 1011) {
        setTxStatus('error');
        setTxError('Transcription server error — check if Deepgram API key is valid');
      } else {
        setTxStatus('idle');
      }
    };
    ws.onerror = () => { setTxStatus('error'); setTxError('Could not connect to transcription service'); };

    // Start MediaRecorder on audio-only stream
    const audioStream = new MediaStream(stream.getAudioTracks());
    const mime = MIME_LIST.find(m => MediaRecorder.isTypeSupported(m)) || '';
    let recorder;
    try {
      recorder = new MediaRecorder(audioStream, { ...(mime && { mimeType: mime }), audioBitsPerSecond: 64000 });
    } catch (e) { console.warn('[Tx] MediaRecorder error:', e.message); return; }

    recorderRef.current = recorder;

    recorder.ondataavailable = async ({ data }) => {
      if (!data || data.size === 0) return;
      const buf = await data.arrayBuffer();
      if (!wsReady.current) { if (chunkBuf.current.length < 100) chunkBuf.current.push(buf); return; }
      if (ws.readyState === 1) ws.send(buf);
    };

    recorder.start(CHUNK_MS);
    console.log('[Tx] MediaRecorder started');

    return () => {
      alive = false;
      if (recorder.state !== 'inactive') recorder.stop();
      if (ws.readyState === 1) { try { ws.send(JSON.stringify({ type: 'stop' })); } catch {} ws.close(1000); }
      wsReady.current = false;
      chunkBuf.current = [];
    };
  }, [isEnabled, callStatus, socketId, roomId, language, username]);

  // Pause/resume on mic mute
  useEffect(() => {
    const r = recorderRef.current;
    if (!r) return;
    if (isMicMuted && r.state === 'recording') { r.pause(); setTxStatus('paused'); }
    else if (!isMicMuted && r.state === 'paused') { r.resume(); setTxStatus('active'); }
  }, [isMicMuted]);

  return {
    transcriptLines: lines,
    interimText:     interim,
    txStatus,
    txError,
    clearTranscript: () => { setLines([]); setInterim(''); },
  };
}

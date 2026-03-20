// src/hooks/useWebRTC.js
import { useEffect, useRef, useState, useCallback } from 'react';
import socket from '../utils/socket';
import { RTC_CONFIG, MEDIA_CONSTRAINTS } from '../utils/webrtcConfig';

export default function useWebRTC({ roomId, username }) {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);  // RTCPeerConnection
  const localStream    = useRef(null);  // MediaStream
  const iceQueue       = useRef([]);    // ICE candidates buffered before remoteDesc is set

  const [callStatus,        setCallStatus]        = useState('idle');
  const [isMicMuted,        setIsMicMuted]        = useState(false);
  const [isCameraOff,       setIsCameraOff]       = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(null);
  const [error,             setError]             = useState(null);

  // ── Get camera + mic ──────────────────────────────────────────────────────
  const getMedia = useCallback(async () => {
    if (localStream.current) return localStream.current;
    
    setCallStatus('acquiring-media');
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      console.log('[WebRTC] ✅ Got local media (audio + video)');
      return stream;
    } catch (e) {
      // If the camera is in use by another browser/app, fall back to audio-only
      // instead of killing the call entirely.
      if (e.name === 'NotReadableError' || e.name === 'AbortError') {
        console.warn('[WebRTC] ⚠ Camera unavailable (' + e.name + '), falling back to audio-only');
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({
            audio: MEDIA_CONSTRAINTS.audio,
            video: false,
          });
          localStream.current = audioOnly;
          if (localVideoRef.current) localVideoRef.current.srcObject = audioOnly;
          setIsCameraOff(true);
          console.log('[WebRTC] ✅ Got local media (audio-only fallback)');
          return audioOnly;
        } catch (audioErr) {
          // Even audio failed — surface a clear error
          const msg = mediaErrMsg(audioErr);
          setError(msg);
          setCallStatus('error');
          throw audioErr;
        }
      }
      const msg = mediaErrMsg(e);
      setError(msg);
      setCallStatus('error');
      throw e;
    }
  }, []);

  // ── Build RTCPeerConnection ───────────────────────────────────────────────
  const buildPC = useCallback((stream) => {
    // Close any existing PC first
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Add all local tracks to the connection
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // When remote tracks arrive, attach to the remote video element
    pc.ontrack = ({ streams }) => {
      console.log('[WebRTC] ✅ Remote track received');
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
      }
    };

    // Send our ICE candidates to the other peer via the signaling server
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit('webrtc:ice-candidate', { roomId, candidate: candidate.toJSON() });
      }
    };

    // Log ICE connection state changes and update UI status
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log('[WebRTC] ICE state:', s);
      if      (s === 'connected' || s === 'completed') setCallStatus('connected');
      else if (s === 'disconnected') setCallStatus('reconnecting');
      else if (s === 'failed') { setError('P2P connection failed. Check your network.'); setCallStatus('error'); }
      else if (s === 'closed') setCallStatus('ended');
    };

    console.log('[WebRTC] ✅ PeerConnection created');
    return pc;
  }, [roomId]);

  // ── Add any ICE candidates that arrived before remoteDescription was set ──
  const drainICEQueue = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !iceQueue.current.length) return;
    console.log('[WebRTC] Draining', iceQueue.current.length, 'queued ICE candidates');
    for (const c of [...iceQueue.current]) {
      try { await pc.addIceCandidate(c); } catch (e) { console.warn('[WebRTC] ICE drain error:', e.message); }
    }
    iceQueue.current = [];
  }, []);

  // ── Stop all tracks and close the peer connection ─────────────────────────
  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleanup');
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    iceQueue.current = [];
  }, []);

  // ── Mic / Camera toggles ──────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMicMuted(v => !v);
  }, []);

  const toggleCamera = useCallback(() => {
    localStream.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(v => !v);
  }, []);

  const hangUp = useCallback(() => {
    socket.emit('call:end', { roomId });
    cleanup();
    setCallStatus('ended');
  }, [roomId, cleanup]);

  // ── MAIN EFFECT ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    // Called when the signaling server confirms both peers are in the room.
    // shouldCreateOffer = true  → this peer creates the Offer (second to join)
    // shouldCreateOffer = false → this peer waits for an Offer (first to join)
    const onRoomReady = async ({ shouldCreateOffer }) => {
      if (!alive) return;
      console.log('[WebRTC] room:ready — createOffer?', shouldCreateOffer);

      try {
        const stream = await getMedia();
        if (!alive) return;

        setCallStatus('connecting');
        const pc = buildPC(stream);

        if (shouldCreateOffer) {
          // Create Offer → setLocalDescription → send to peer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', { roomId, offer: pc.localDescription });
          console.log('[WebRTC] ✅ Offer sent');
        }
        // If not creating offer: just wait — the other peer will send their Offer
      } catch (e) {
        if (alive) { setError('Could not start call: ' + e.message); setCallStatus('error'); }
      }
    };

    // Received an Offer from the other peer → create Answer
    const onOffer = async ({ offer }) => {
      if (!alive) return;
      console.log('[WebRTC] Received offer');
      try {
        // If we don't have a PC yet (e.g. this peer joined second), build one
        let pc = pcRef.current;
        if (!pc) {
          const stream = localStream.current || await getMedia();
          if (!alive) return;
          pc = buildPC(stream);
          setCallStatus('connecting');
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainICEQueue();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { roomId, answer: pc.localDescription });
        console.log('[WebRTC] ✅ Answer sent');
      } catch (e) {
        console.error('[WebRTC] Offer handling error:', e);
        if (alive) setError('Handshake error: ' + e.message);
      }
    };

    // Received the Answer to our Offer → finalize the connection
    const onAnswer = async ({ answer }) => {
      if (!alive) return;
      console.log('[WebRTC] Received answer');
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await drainICEQueue();
        console.log('[WebRTC] ✅ Answer applied — connection establishing');
      } catch (e) {
        console.error('[WebRTC] Answer error:', e);
      }
    };

    // Received an ICE candidate from the other peer
    const onICE = async ({ candidate }) => {
      if (!alive || !candidate) return;
      const pc = pcRef.current;
      const rtcCandidate = new RTCIceCandidate(candidate);

      // If remoteDescription isn't set yet, queue it — add it after setRemoteDescription
      if (!pc || !pc.remoteDescription) {
        iceQueue.current.push(rtcCandidate);
        return;
      }
      try { await pc.addIceCandidate(rtcCandidate); }
      catch (e) { console.warn('[WebRTC] ICE add error:', e.message); }
    };

    const onPeerLeft = () => {
      if (!alive) return;
      console.log('[WebRTC] Peer left the room');
      setCallStatus('ended');
      cleanup();
    };

    const onRoomFull = () => {
      if (!alive) return;
      setError('Room is full — max 2 people per room.');
      setCallStatus('error');
    };

    // Register all socket event listeners
    socket.on('room:ready',           onRoomReady);
    socket.on('webrtc:offer',         onOffer);
    socket.on('webrtc:answer',        onAnswer);
    socket.on('webrtc:ice-candidate', onICE);
    socket.on('call:peer-left',       onPeerLeft);
    socket.on('room:full',            onRoomFull);

    // ── Connect socket and join room ────────────────────────────────────────
    // KEY FIX: socket.connect() is async. We must wait for the 'connect'
    // event before emitting room:join, otherwise the server never receives it.
    const joinRoom = () => {
      if (!alive) return;
      console.log('[WebRTC] ✅ Emitting room:join →', roomId);
      socket.emit('room:join', { roomId, username });
    };

    const initConnection = async () => {
      try {
        // Request media right away so the user isn't stuck waiting for the other person to join
        await getMedia();
        if (alive) setCallStatus('idle');
      } catch (err) {
        // Errors are already handled in getMedia, but we catch here to allow joining the room anyway
        console.warn('Initial media request failed, continuing to join room');
      }
      
      if (socket.connected) {
        // Socket is already connected (e.g. navigated within the app)
        joinRoom();
      } else {
        // Wait for connection to complete, then join
        socket.once('connect', joinRoom);
        socket.connect();
      }
    };

    initConnection();

    // ── Cleanup on unmount ──────────────────────────────────────────────────
    return () => {
      alive = false;
      socket.off('room:ready',           onRoomReady);
      socket.off('webrtc:offer',         onOffer);
      socket.off('webrtc:answer',        onAnswer);
      socket.off('webrtc:ice-candidate', onICE);
      socket.off('call:peer-left',       onPeerLeft);
      socket.off('room:full',            onRoomFull);
      socket.off('connect',              joinRoom);
      cleanup();
    };
  // We only want this effect to run once per roomId+username combination.
  // All the callback functions (getMedia, buildPC, etc.) are stable refs
  // via useCallback, so it's safe to omit them from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, username]);

  return {
    localVideoRef,
    remoteVideoRef,
    callStatus,
    isMicMuted,
    isCameraOff,
    connectionQuality,
    error,
    localStream,   // exposed for useTranscription
    toggleMic,
    toggleCamera,
    hangUp,
  };
}

function mediaErrMsg(err) {
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
    return 'Camera/mic permission denied. Click the 🔒 icon in your browser address bar → allow camera & mic → refresh.';
  if (err.name === 'NotFoundError')
    return 'No camera or microphone found. Please connect a device.';
  if (err.name === 'NotReadableError')
    return 'Camera/mic is being used by another app. Close it and try again.';
  return `Media error (${err.name}): ${err.message}`;
}

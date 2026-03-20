// backend/src/transcription/transcriptionServer.js
import { WebSocketServer } from 'ws';
import { DeepgramSession } from './deepgramSession.js';

export const attachTranscriptionServer = (httpServer, io) => {
  const sessions = new Map();

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url.split('?')[0];
    if (pathname === '/transcription') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (browserWs, req) => {
    const url      = new URL(req.url, 'http://localhost');
    const socketId = url.searchParams.get('socketId');
    const language = url.searchParams.get('language') || 'en-US';
    const roomId   = url.searchParams.get('roomId');
    const username = decodeURIComponent(url.searchParams.get('username') || 'Anonymous');

    if (!socketId || !io.sockets.sockets.has(socketId)) {
      browserWs.close(4001, 'Invalid socketId');
      return;
    }

    console.log(`[Transcription] Browser WS connected: socket=${socketId}, room=${roomId}, lang=${language}, user=${username}`);
    const key = `${socketId}:${roomId}`;
    sessions.get(key)?.close();

    const dg = new DeepgramSession({
      socketId, language,
      onTranscript: ({ text, isFinal, isUtteranceEnd, confidence }) => {
        if (isUtteranceEnd) { safeSend(browserWs, { type: 'utterance_end' }); return; }
        if (!text) return;
        safeSend(browserWs, { type: 'transcript', text, isFinal, confidence, language });
        if (isFinal) {
          const sock = io.sockets.sockets.get(socketId);
          if (sock) sock.to(roomId).emit('transcript:remote', { speakerUsername: username, text, language });
        }
      },
      onError:  (err) => safeSend(browserWs, { type: 'error', message: err.message }),
      onClose:  ()    => { sessions.delete(key); safeSend(browserWs, { type: 'session_closed' }); },
    });

    dg.open()
      .then(() => { console.log(`[Transcription] ✅ Deepgram session opened for ${username}`); sessions.set(key, dg); safeSend(browserWs, { type: 'ready', language }); })
      .catch((err) => { console.error(`[Transcription] ❌ Deepgram session failed for ${username}:`, err.message); safeSend(browserWs, { type: 'error', message: err.message }); browserWs.close(1011); });

    browserWs.on('message', (data) => {
      if (typeof data === 'string') {
        try { const m = JSON.parse(data); if (m.type === 'stop') { dg.close(); sessions.delete(key); } } catch {}
        return;
      }
      sessions.get(key)?.send(Buffer.isBuffer(data) ? data : Buffer.from(data));
    });

    browserWs.on('close', () => { sessions.get(key)?.close(); sessions.delete(key); });
  });

  return { closeAll: () => { sessions.forEach(s => s.close()); sessions.clear(); wss.close(); } };
};

function safeSend(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    try { ws.send(JSON.stringify(payload)); } catch {}
  }
}

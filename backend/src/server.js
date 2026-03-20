// backend/src/server.js
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

const PORT   = process.env.PORT   || 5000;
const MONGO  = process.env.MONGO_URI;
const DGKEY  = process.env.DEEPGRAM_API_KEY;
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
                  .split(',').map(s => s.trim());

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: ORIGINS, credentials: true }));
app.use(express.json());
app.get('/health', (_, res) => res.json({ ok: true }));

// ── HTTP + Socket.io ──────────────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: ORIGINS, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// ── Signaling ─────────────────────────────────────────────────────────────────
// Map<socketId → roomId> for fast O(1) lookup on disconnect
const socketRoomMap = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] connect   ${socket.id}`);

  // ── room:join ──────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomId, username }) => {
    if (!roomId) return;

    const room = io.sockets.adapter.rooms.get(roomId);
    const size = room ? room.size : 0;

    if (size >= 2) {
      socket.emit('room:full');
      console.log(`[Socket] room:full  ${roomId}`);
      return;
    }

    socket.join(roomId);
    socketRoomMap.set(socket.id, roomId);
    console.log(`[Socket] room:join  ${socket.id} (${username}) → ${roomId}  [${size + 1}/2]`);

    // Tell this socket how many peers were already in the room
    socket.emit('room:joined', { peerCount: size });

    if (size === 1) {
      // Both peers present — the SECOND joiner creates the offer
      socket.emit('room:ready', { shouldCreateOffer: true });
      socket.to(roomId).emit('room:ready', { shouldCreateOffer: false });
      console.log(`[Socket] room:ready ${roomId}`);
    }
  });

  // ── WebRTC signaling relay ─────────────────────────────────────────────────
  socket.on('webrtc:offer',         ({ roomId, offer })     => socket.to(roomId).emit('webrtc:offer',         { offer }));
  socket.on('webrtc:answer',        ({ roomId, answer })    => socket.to(roomId).emit('webrtc:answer',        { answer }));
  socket.on('webrtc:ice-candidate', ({ roomId, candidate }) => socket.to(roomId).emit('webrtc:ice-candidate', { candidate }));

  // ── Disconnect / hang up ───────────────────────────────────────────────────
  const leaveRoom = () => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('call:peer-left');
    socket.leave(roomId);
    socketRoomMap.delete(socket.id);
    console.log(`[Socket] disconnect ${socket.id} left ${roomId}`);
  };

  socket.on('call:end',   leaveRoom);
  socket.on('disconnect', leaveRoom);
});

// ── Transcription WebSocket (optional — only if Deepgram key is set) ──────────
if (DGKEY) {
  if (DGKEY.length < 20) {
    console.warn('[Server] ⚠  DEEPGRAM_API_KEY looks too short — transcription may fail');
  }
  const { attachTranscriptionServer } = await import('./transcription/transcriptionServer.js');
  attachTranscriptionServer(httpServer, io);
  console.log('[Server] Transcription WS attached at /transcription');
} else {
  console.log('[Server] ⚠  DEEPGRAM_API_KEY not set — transcription disabled');
}

// ── MongoDB (optional) ────────────────────────────────────────────────────────
if (MONGO) {
  try {
    await mongoose.connect(MONGO);
    console.log('[Server] MongoDB connected');
  } catch (e) {
    console.warn('[Server] MongoDB connection failed:', e.message);
  }
}

// ── Listen ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n[Server] ✅ Running on http://localhost:${PORT}`);
  console.log(`[Server]    CORS allowed: ${ORIGINS.join(', ')}\n`);
});

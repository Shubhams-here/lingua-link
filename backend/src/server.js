import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

// ── ENV ───────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGO_URI;
const DGKEY = process.env.DEEPGRAM_API_KEY;
const envOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [];
const ORIGINS = [...new Set([...envOrigins, 'http://localhost:5173', 'https://shubham-lingua-link.vercel.app'])];

// ── EXPRESS ───────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: ORIGINS, credentials: true }));
app.use(express.json());

// Trust proxy headers on Render (needed for correct HTTPS/WSS handling behind their load balancer)
app.set('trust proxy', 1);

app.get('/health', (_, res) => res.json({ ok: true, timestamp: Date.now() }));

// ── HTTP + SOCKET.IO ──────────────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // IMPORTANT: polling first, then upgrade to websocket.
  // Many PaaS (Render, Heroku, Railway) need the initial HTTP long-polling
  // handshake to succeed before they can upgrade the connection to WebSocket.
  transports: ['polling', 'websocket'],
  // Allow upgrades from polling → ws
  allowUpgrades: true,
  // Increase timeouts for free-tier cold starts (Render spins down after 15 min inactivity)
  pingTimeout: 60000,
  pingInterval: 25000,
  // Increase connection timeout for slow cold starts
  connectTimeout: 45000,
  // Allow EIO v3 clients (backward compat)
  allowEIO3: true,
});

// ── SOCKET LOGIC ──────────────────────────────────────────────────────────────
const socketRoomMap = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] connect ${socket.id}`);

  socket.on('room:join', ({ roomId, username }) => {
    if (!roomId) return;

    const room = io.sockets.adapter.rooms.get(roomId);
    
    // Check if the current socket is already in the room (e.g., due to React StrictMode re-running effects)
    const isAlreadyInRoom = room ? room.has(socket.id) : false;
    
    // If not already in the room, and the room currently has 2 people, reject.
    if (!isAlreadyInRoom && room && room.size >= 2) {
      socket.emit('room:full');
      return;
    }

    // Join the room (if they are already in it, this is a safe no-op)
    socket.join(roomId);
    socketRoomMap.set(socket.id, roomId);

    // Re-check size *after* joining to know the true peer count
    const newRoomSize = io.sockets.adapter.rooms.get(roomId).size;

    socket.emit('room:joined', { peerCount: newRoomSize - 1 });

    // Only emit room:ready to initiate the handshake when the 2nd distinct user successfully joins
    // We only want to trigger this if they were NOT already in the room to avoid double-triggering
    if (!isAlreadyInRoom && newRoomSize === 2) {
      socket.emit('room:ready', { shouldCreateOffer: true });
      socket.to(roomId).emit('room:ready', { shouldCreateOffer: false });
    }
  });

  socket.on('webrtc:offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('webrtc:offer', { offer });
  });

  socket.on('webrtc:answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('webrtc:answer', { answer });
  });

  socket.on('webrtc:ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('webrtc:ice-candidate', { candidate });
  });

  const leaveRoom = () => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;

    socket.to(roomId).emit('call:peer-left');
    socket.leave(roomId);
    socketRoomMap.delete(socket.id);

    console.log(`[Socket] disconnect ${socket.id}`);
  };

  socket.on('call:end', leaveRoom);
  socket.on('disconnect', leaveRoom);
});

// ── START SERVER (ASYNC SAFE) ─────────────────────────────────────────────────
const startServer = async () => {
  try {
    // MongoDB (non-fatal — server still works for WebRTC without DB)
    if (MONGO) {
      try {
        await mongoose.connect(MONGO);
        console.log('✅ MongoDB Connected');
      } catch (mongoErr) {
        console.warn('⚠️ MongoDB connection failed (server will continue without DB):', mongoErr.message);
      }
    } else {
      console.log('⚠️ MONGO_URI not set — running without database');
    }

    // Deepgram (optional)
    if (DGKEY) {
      if (DGKEY.length < 20) {
        console.warn('⚠️ DEEPGRAM_API_KEY looks invalid');
      }

      const { attachTranscriptionServer } = await import('./transcription/transcriptionServer.js');
      attachTranscriptionServer(httpServer, io);

      console.log('✅ Transcription enabled');
    } else {
      console.log('⚠️ Transcription disabled (no API key)');
    }

    // Start server — bind to 0.0.0.0 for Render (required for external access)
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Allowed origins: ${ORIGINS.join(', ')}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
};

startServer();
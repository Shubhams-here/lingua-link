// src/utils/socket.js
/**
 * Socket.io singleton client.
 *
 * IMPORTANT: We connect directly to the backend port (5000), NOT through the
 * Vite dev server (5173). This avoids Vite proxy WebSocket quirks that can
 * cause silent failures when Socket.io tries to upgrade to WebSocket.
 *
 * The backend already has CORS configured for http://localhost:5173 so this
 * cross-origin connection works fine.
 */
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Always log socket events so you can see them in the browser console
socket.on('connect',       () => console.log('[Socket] ✅ connected  id:', socket.id));
socket.on('disconnect',    (r) => console.log('[Socket] ❌ disconnected:', r));
socket.on('connect_error', (e) => console.error('[Socket] 🔴 error:', e.message));

export default socket;

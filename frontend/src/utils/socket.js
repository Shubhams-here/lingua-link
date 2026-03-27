// src/utils/socket.js
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

console.log('[Socket] Connecting to:', BACKEND_URL);

const socket = io(BACKEND_URL, {
  autoConnect: false,
  // CRITICAL: polling first is required for PaaS like Render.
  // The load balancer needs an initial HTTP request before upgrading to WebSocket.
  transports: ['polling', 'websocket'],
  // Upgrade from polling to websocket when available
  upgrade: true,
  // Reconnection settings — generous for free-tier cold starts
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  // Increase timeout for Render cold starts (can take 30-50s on free tier)
  timeout: 60000,
  // Send credentials (cookies) for CORS
  withCredentials: true,
});

socket.on('connect', () => console.log('[Socket] ✅ connected id:', socket.id));
socket.on('disconnect', (reason) => {
  console.log('[Socket] ❌ disconnected:', reason);
  // If the server disconnected us, auto-reconnect
  if (reason === 'io server disconnect') {
    socket.connect();
  }
});
socket.on('connect_error', (e) => {
  console.error('[Socket] 🔴 connect_error:', e.message);
});
socket.on('reconnect_attempt', (attempt) => {
  console.log('[Socket] 🔄 reconnect attempt', attempt);
});
socket.on('reconnect', (attempt) => {
  console.log('[Socket] ✅ reconnected after', attempt, 'attempts');
});

export default socket;
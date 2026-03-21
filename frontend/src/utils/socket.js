// src/utils/socket.js
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname ? `http://${window.location.hostname}:5000` : undefined);

const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ['polling', 'websocket'], // Polling first is essential for many server environments (e.g. Render, Heroku) before upgrading
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => console.log('[Socket] ✅ connected id:', socket.id));
socket.on('disconnect', (r) => console.log('[Socket] ❌ disconnected:', r));
socket.on('connect_error', (e) => console.error('[Socket] 🔴 error:', e.message));

export default socket;
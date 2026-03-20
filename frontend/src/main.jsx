// src/main.jsx
// NOTE: StrictMode is intentionally disabled.
// StrictMode mounts → unmounts → remounts every component in dev,
// which causes the socket to connect, disconnect, and reconnect — breaking
// the room:join flow. Disable it for this real-time app.
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);

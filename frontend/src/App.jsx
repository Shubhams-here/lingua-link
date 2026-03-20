// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Lobby    from './pages/Lobby';
import CallRoom from './pages/CallRoom';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<Lobby />} />
        <Route path="/room/:roomId" element={<CallRoom />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

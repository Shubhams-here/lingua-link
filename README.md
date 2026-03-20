# LinguaLink — P2P Language Exchange

## Prerequisites
- Node.js v18+
- MongoDB running locally OR a MongoDB Atlas URI
- Deepgram API key (free at deepgram.com) — optional, only needed for transcription

---

## Setup (3 steps)

### Step 1 — Backend
```bash
cd backend
# Edit .env — fill in your MONGO_URI and DEEPGRAM_API_KEY
npm install
npm run dev
```
You should see:
```
[Server] ✅ Running on http://localhost:5000
[Server]    CORS allowed: http://localhost:5173
```

### Step 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```
You should see:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### Step 3 — Test
1. Open **two browser tabs** at `http://localhost:5173`
2. In **Tab 1**: Enter name "Alice", click "New Room", click "Join Call"
3. In **Tab 2**: Enter name "Bob", paste the same room code, click "Join Call"
4. Allow camera and mic permissions in both tabs
5. The call should connect — you'll see video and live subtitles

---

## Troubleshooting

### Still stuck on "Initializing…"?
Open browser DevTools → Console tab. You should see:
```
[Socket] ✅ connected  id: xxxx
[WebRTC] ✅ Emitting room:join → ROOMCODE
[WebRTC] room:ready — createOffer? true/false
[WebRTC] ✅ Got local media
```

If you see `[Socket] 🔴 error: ...` instead:
- Make sure the backend is running on port 5000
- Make sure nothing else is using port 5000
- Check that `backend/.env` has the correct values

### Camera/mic permission denied?
Click the 🔒 lock icon in the browser address bar → allow Camera and Microphone → refresh.

### MongoDB connection error?
The app works without MongoDB — signaling and video calls function fine. Only call logs won't be saved. You can set `MONGO_URI=` (empty) in .env to skip it.

---

## Project Structure
```
lingua-link/
├── backend/
│   ├── .env                         ← Edit this with your credentials
│   ├── package.json
│   └── src/
│       ├── server.js                ← Main entry (Express + Socket.io)
│       ├── config/db.js
│       ├── middleware/errorHandler.js
│       ├── models/{User,CallLog}.js
│       ├── socket/signalingHandler.js
│       └── transcription/
│           ├── deepgramSession.js
│           └── transcriptionServer.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx                 ← StrictMode disabled (intentional)
        ├── App.jsx
        ├── utils/{socket,webrtcConfig}.js
        ├── hooks/{useWebRTC,useTranscription}.js
        ├── pages/{Lobby,CallRoom}.jsx
        └── components/{VideoPane,CallControls,StatusOverlay,TranscriptPanel}.jsx
```

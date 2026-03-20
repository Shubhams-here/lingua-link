// backend/src/transcription/deepgramSession.js
import WebSocket from 'ws';

const DEEPGRAM_URL = 'wss://api.deepgram.com/v1/listen';

export class DeepgramSession {
  constructor({ socketId, language = 'en-US', onTranscript, onError, onClose }) {
    this._socketId    = socketId;
    this._language    = language;
    this._onTranscript = onTranscript;
    this._onError     = onError;
    this._onClose     = onClose;
    this._ws          = null;
    this._ready       = false;
    this._closed      = false;
    this._buffer      = [];
    this._keepAlive   = null;
  }

  open() {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        model: 'nova-2',
        language: this._language,
        interim_results: 'true',
        utterance_end_ms: '1000',
        vad_events: 'true',
        endpointing: '300',
        punctuate: 'true',
        smart_format: 'true',
      });

      this._ws = new WebSocket(`${DEEPGRAM_URL}?${params}`, {
        headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
      });

      const timeout = setTimeout(() => {
        reject(new Error('Deepgram connection timed out'));
        this._ws.terminate();
      }, 8000);

      this._ws.on('open', () => {
        console.log(`[Deepgram] ✅ Connected (lang=${this._language}, socket=${this._socketId})`);
        clearTimeout(timeout);
        this._ready = true;
        this._buffer.forEach(chunk => this._wsSend(chunk));
        this._buffer = [];
        this._keepAlive = setInterval(() => {
          if (this._ready) this._wsSend(JSON.stringify({ type: 'KeepAlive' }));
        }, 8000);
        resolve();
      });

      this._ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'Results') {
            const alt  = msg.channel?.alternatives?.[0];
            const text = alt?.transcript?.trim();
            if (text) this._onTranscript({ text, isFinal: msg.is_final, confidence: alt.confidence });
          } else if (msg.type === 'UtteranceEnd') {
            this._onTranscript({ text: null, isFinal: true, isUtteranceEnd: true });
          } else if (msg.type === 'Error') {
            this._onError(new Error(msg.message));
          }
        } catch (parseErr) { console.warn('[Deepgram] Failed to parse message:', parseErr.message); }
      });

      this._ws.on('error', (err) => {
        console.error('[Deepgram] ❌ Connection error:', err.message);
        clearTimeout(timeout);
        this._ready = false;
        this._onError(err);
        reject(err);
      });

      this._ws.on('close', () => {
        this._ready = false;
        clearInterval(this._keepAlive);
        if (!this._closed) { this._closed = true; this._onClose(); }
      });
    });
  }

  send(chunk) {
    if (this._closed) return;
    if (!this._ready) { if (this._buffer.length < 50) this._buffer.push(chunk); return; }
    this._wsSend(chunk);
  }

  close() {
    if (this._closed) return;
    this._closed = true;
    this._ready  = false;
    clearInterval(this._keepAlive);
    if (this._ws) {
      try { this._ws.send(JSON.stringify({ type: 'CloseStream' })); } catch {}
      setTimeout(() => { if (this._ws.readyState !== WebSocket.CLOSED) this._ws.terminate(); }, 1500);
    }
  }

  _wsSend(data) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(data, (err) => { if (err) console.warn('[Deepgram] send error:', err.message); });
    }
  }
}

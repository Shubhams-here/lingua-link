// backend/src/models/CallLog.js
import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema({
  roomId:    { type: String, required: true },
  participants: [{ socketId: String, username: String, joinedAt: Date }],
  transcript: [{
    speaker:    String,
    text:       String,
    language:   String,
    confidence: Number,
    timestamp:  { type: Date, default: Date.now },
  }],
  durationSeconds: { type: Number, default: 0 },
  status:    { type: String, enum: ['active','ended'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  endedAt:   Date,
}, { timestamps: true });

export default mongoose.model('CallLog', callLogSchema);

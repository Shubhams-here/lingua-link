// backend/src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username:       { type: String, required: true, unique: true, trim: true },
  email:          { type: String, unique: true, lowercase: true, trim: true },
  nativeLanguage: { type: String, default: 'en' },
  targetLanguage: { type: String, default: 'es' },
  socketId:       { type: String, default: null },
  isOnline:       { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('User', userSchema);

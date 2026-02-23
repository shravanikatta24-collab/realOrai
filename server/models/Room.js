// models/Room.js
const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  username: String,
  socketId: String,
  score: { type: Number, default: 0 },
  answers: [{ questionIndex: Number, answer: String, correct: Boolean, points: Number }],
  joinedAt: { type: Date, default: Date.now }
});

const RoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  adminSocketId: { type: String },
  players: [PlayerSchema],
  gameStatus: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  currentQuestionIndex: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);

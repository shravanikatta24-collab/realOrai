// models/Question.js
const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'image'], required: true },
  content: { type: String, required: true }, // text content or image URL
  imageUrl: { type: String }, // for image type questions
  correctAnswer: { type: String, enum: ['REAL', 'AI'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', QuestionSchema);

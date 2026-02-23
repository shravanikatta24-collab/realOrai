// routes/admin.js
const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Room = require('../models/Room');

// Middleware: verify admin password from header
const adminAuth = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Admin login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: process.env.ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// --- Question CRUD ---
router.get('/questions', adminAuth, async (req, res) => {
  const questions = await Question.find().sort({ createdAt: -1 });
  res.json(questions);
});

router.post('/questions', adminAuth, async (req, res) => {
  try {
    const q = new Question(req.body);
    await q.save();
    res.json(q);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/questions/:id', adminAuth, async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(q);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/questions/:id', adminAuth, async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- Room management ---
router.get('/rooms', adminAuth, async (req, res) => {
  const rooms = await Room.find().populate('questions');
  res.json(rooms);
});

router.delete('/rooms/:code', adminAuth, async (req, res) => {
  await Room.findOneAndDelete({ roomCode: req.params.code });
  res.json({ success: true });
});

module.exports = router;

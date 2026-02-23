// index.js - Main server entry point
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const adminRoutes = require('./routes/admin');
const gameHandler = require('./socket/gameHandler');

const app = express();
const server = http.createServer(app);

// ── Socket.io setup ─────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// ── Middleware ──────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Socket handlers ─────────────────────────────────────────────────────
gameHandler(io);

// ── MongoDB connection ──────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realOrai')
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

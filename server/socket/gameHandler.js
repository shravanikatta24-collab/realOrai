// socket/gameHandler.js
const Room = require('../models/Room');
const Question = require('../models/Question');
const { v4: uuidv4 } = require('uuid');

// Active timers map: roomCode -> timeoutId
const activeTimers = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Calculate score: 10 base + remaining seconds bonus
function calcScore(remainingSeconds) {
  return 10 + Math.max(0, Math.floor(remainingSeconds));
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ── ADMIN: Create room ──────────────────────────────────────────────
    socket.on('admin:createRoom', async ({ password }, callback) => {
      if (password !== process.env.ADMIN_PASSWORD) return callback({ error: 'Unauthorized' });

      const roomCode = generateRoomCode();
      const room = new Room({ roomCode, adminSocketId: socket.id });
      await room.save();

      socket.join(roomCode);
      socket.data.isAdmin = true;
      socket.data.roomCode = roomCode;

      console.log(`Room created: ${roomCode}`);
      callback({ roomCode });
    });

    // ── ADMIN: Rejoin room (after page refresh) ─────────────────────────
    socket.on('admin:joinRoom', async ({ password, roomCode }, callback) => {
      if (password !== process.env.ADMIN_PASSWORD) return callback({ error: 'Unauthorized' });

      const room = await Room.findOne({ roomCode }).populate('questions');
      if (!room) return callback({ error: 'Room not found' });

      room.adminSocketId = socket.id;
      await room.save();

      socket.join(roomCode);
      socket.data.isAdmin = true;
      socket.data.roomCode = roomCode;

      callback({ room: sanitizeRoom(room) });
    });

    // ── ADMIN: Start game ───────────────────────────────────────────────
    socket.on('admin:startGame', async ({ roomCode, password }, callback) => {
      if (password !== process.env.ADMIN_PASSWORD) return callback?.({ error: 'Unauthorized' });

      const room = await Room.findOne({ roomCode });
      if (!room) return callback?.({ error: 'Room not found' });
      if (room.gameStatus !== 'waiting') return callback?.({ error: 'Game already started' });

      // Pick 20 random questions from bank
      const allQuestions = await Question.find();
      if (allQuestions.length < 1) return callback?.({ error: 'No questions in bank' });

      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(20, shuffled.length));

      room.questions = selected.map(q => q._id);
      room.gameStatus = 'active';
      room.currentQuestionIndex = 0;
      await room.save();

      console.log(`Game started in room ${roomCode} with ${selected.length} questions`);

      // Start first question
      sendQuestion(io, roomCode, selected, 0);
      callback?.({ success: true });
    });

    // ── PLAYER: Join room ───────────────────────────────────────────────
    socket.on('player:join', async ({ username, roomCode }, callback) => {
      const room = await Room.findOne({ roomCode });
      if (!room) return callback({ error: 'Room not found' });
      if (room.gameStatus === 'ended') return callback({ error: 'Game has ended' });

      // Check duplicate username
      const existing = room.players.find(p => p.username.toLowerCase() === username.toLowerCase());
      if (existing) {
        // Allow reconnect by updating socketId
        existing.socketId = socket.id;
        await room.save();
        socket.join(roomCode);
        socket.data.username = username;
        socket.data.roomCode = roomCode;

        // Notify admin
        io.to(room.adminSocketId).emit('room:playerUpdate', { players: room.players });
        return callback({ success: true, reconnected: true });
      }

      // Add new player
      room.players.push({ username, socketId: socket.id });
      await room.save();

      socket.join(roomCode);
      socket.data.username = username;
      socket.data.roomCode = roomCode;

      // Notify admin of new player
      if (room.adminSocketId) {
        io.to(room.adminSocketId).emit('room:playerUpdate', { players: room.players });
      }

      console.log(`Player ${username} joined room ${roomCode}`);
      callback({ success: true });
    });

    // ── PLAYER: Submit answer ───────────────────────────────────────────
    socket.on('player:answer', async ({ roomCode, questionIndex, answer, remainingSeconds }) => {
      const room = await Room.findOne({ roomCode }).populate('questions');
      if (!room || room.gameStatus !== 'active') return;
       // stale answer
if (questionIndex !== room.currentQuestionIndex) {
  console.log(`Stale answer rejected: got ${questionIndex}, expected ${room.currentQuestionIndex}`);
  return;
}

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      // Check if already answered this question
      const alreadyAnswered = player.answers.find(a => a.questionIndex === questionIndex);
      if (alreadyAnswered) return;

      const question = room.questions[questionIndex];
      if (!question) return;

      const correct = String(answer).trim() === String(question.correctAnswer).trim();
      const points = correct ? calcScore(remainingSeconds) : 0;

      player.answers.push({ questionIndex, answer, correct, points });
      player.score += points;
      await room.save();

      // Send result to this player
    socket.emit('player:answerResult', { correct, points, correctAnswer: question.correctAnswer });

    // Update scoreboard for admin
    if (room.adminSocketId) {
      io.to(room.adminSocketId).emit('admin:scoreUpdate', {
        players: room.players.map(p => ({ username: p.username, score: p.score }))
      });
    }

    // Check if all players have answered
    const totalPlayers = room.players.length;
    const answeredPlayers = room.players.filter(p => 
      p.answers.find(a => a.questionIndex === questionIndex)
    ).length;

    if (answeredPlayers >= totalPlayers) {
      // All players answered - clear timer and move to next question
      if (activeTimers[roomCode]) clearTimeout(activeTimers[roomCode]);
      
      // Reveal correct answer
      io.to(roomCode).emit('game:questionEnd', {
        correctAnswer: question.correctAnswer,
        nextIn: 3
      });

      // Update admin scoreboard
      io.to(room.adminSocketId).emit('admin:scoreUpdate', {
        players: room.players.map(p => ({ username: p.username, score: p.score }))
      });

      // Move to next question
      setTimeout(async () => {
        const updatedRoom = await Room.findOne({ roomCode });
        if (updatedRoom && updatedRoom.gameStatus === 'active') {
          const allQuestions = await Question.find({ _id: { $in: updatedRoom.questions } });
          sendQuestion(io, roomCode, allQuestions, questionIndex + 1);
        }
      }, 3000);
    }
    // ── Disconnect ──────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Players stay in room with their score (reconnect support)
    });
  });
};

// ── Send a question to all players in room ──────────────────────────────
async function sendQuestion(io, roomCode, questions, index) {
  if (index >= questions.length) {
    // Game over
    await endGame(io, roomCode);
    return;
  }

  const question = questions[index];
  const QUESTION_DURATION = 20; // seconds

  // Update room's currentQuestionIndex
  await Room.findOneAndUpdate({ roomCode }, { currentQuestionIndex: index });

  // Send question (without revealing answer)
  const questionPayload = {
    index,
    total: questions.length,
    type: question.type,
    content: question.content,
    imageUrl: question.imageUrl,
    duration: QUESTION_DURATION
  };

  io.to(roomCode).emit('game:question', questionPayload);
  console.log(`Room ${roomCode}: Question ${index + 1}/${questions.length}`);

  // Clear any existing timer for this room
  if (activeTimers[roomCode]) clearTimeout(activeTimers[roomCode]);

  // Auto-advance after duration
  activeTimers[roomCode] = setTimeout(async () => {
    // Mark all non-answerers as wrong (timeout)
    const room = await Room.findOne({ roomCode }).populate('questions');
    if (!room || room.gameStatus !== 'active') return;

    for (const player of room.players) {
      const answered = player.answers.find(a => a.questionIndex === index);
      if (!answered) {
        player.answers.push({ questionIndex: index, answer: null, correct: false, points: 0 });
      }
    }
    await room.save();

    // Reveal correct answer to all
    io.to(roomCode).emit('game:questionEnd', {
      correctAnswer: question.correctAnswer,
      nextIn: 3 // seconds before next question
    });

    // Update admin scoreboard
    const adminRoom = await Room.findOne({ roomCode });
    if (adminRoom?.adminSocketId) {
      io.to(adminRoom.adminSocketId).emit('admin:scoreUpdate', {
        players: adminRoom.players.map(p => ({ username: p.username, score: p.score }))
      });
    }

    // Next question after short delay
    setTimeout(() => {
      sendQuestion(io, roomCode, questions, index + 1);
    }, 3000);

  }, QUESTION_DURATION * 1000);
}

// ── End game ─────────────────────────────────────────────────────────────
async function endGame(io, roomCode) {
  const room = await Room.findOne({ roomCode });
  if (!room) return;

  room.gameStatus = 'ended';
  await room.save();

  // Sort players by score
  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  // Send each player their rank
  for (let i = 0; i < sorted.length; i++) {
    const player = sorted[i];
    const playerSocket = io.sockets.sockets.get(player.socketId);
    if (playerSocket) {
      playerSocket.emit('game:ended', { score: player.score, rank: i + 1, total: sorted.length });
    }
  }

  // Send full leaderboard to admin
  if (room.adminSocketId) {
    io.to(room.adminSocketId).emit('admin:gameEnded', { players: sorted });
  }

  delete activeTimers[roomCode];
  console.log(`Game ended in room ${roomCode}`);
}

function sanitizeRoom(room) {
  return {
    roomCode: room.roomCode,
    gameStatus: room.gameStatus,
    players: room.players,
    currentQuestionIndex: room.currentQuestionIndex
  };
}

// socket/gameHandler.js
const Room = require('../models/Room');
const Question = require('../models/Question');

const activeTimers = {};
const questionCache = {};

function calcScore(remainingSeconds) {
  return 10 + Math.max(0, Math.floor(remainingSeconds));
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('admin:createRoom', async ({ password }, callback) => {
      if (password !== process.env.ADMIN_PASSWORD) return callback({ error: 'Unauthorized' });
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const room = new Room({ roomCode, adminSocketId: socket.id });
      await room.save();
      socket.join(roomCode);
      socket.data.isAdmin = true;
      socket.data.roomCode = roomCode;
      console.log(`Room created: ${roomCode}`);
      callback({ roomCode });
    });

    socket.on('admin:joinRoom', async ({ password, roomCode }, callback) => {
      if (password !== process.env.ADMIN_PASSWORD) return callback({ error: 'Unauthorized' });
      const room = await Room.findOne({ roomCode }).populate('questions');
      if (!room) return callback({ error: 'Room not found' });
      room.adminSocketId = socket.id;
      await room.save();
      socket.join(roomCode);
      socket.data.isAdmin = true;
      socket.data.roomCode = roomCode;
      callback({ room });
    });

    socket.on('admin:startGame', async ({ roomCode, password }, callback) => {
      if (password !== process.env.ADMIN_PASSWORD) return callback?.({ error: 'Unauthorized' });
      const room = await Room.findOne({ roomCode });
      if (!room) return callback?.({ error: 'Room not found' });
      if (room.gameStatus !== 'waiting') return callback?.({ error: 'Game already started' });
      const allQuestions = await Question.find();
      if (allQuestions.length < 1) return callback?.({ error: 'No questions in bank' });
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(20, shuffled.length));
      room.questions = selected.map(q => q._id);
      room.gameStatus = 'active';
      room.currentQuestionIndex = 0;
      await room.save();
      questionCache[roomCode] = selected;
      console.log(`Game started in room ${roomCode} with ${selected.length} questions`);
      sendQuestion(io, roomCode, selected, 0);
      callback?.({ success: true });
    });

    socket.on('player:join', async ({ username, roomCode }, callback) => {
      const room = await Room.findOne({ roomCode });
      if (!room) return callback({ error: 'Room not found' });
      if (room.gameStatus === 'ended') return callback({ error: 'Game has ended' });
      const existing = room.players.find(p => p.username.toLowerCase() === username.toLowerCase());
      if (existing) {
        existing.socketId = socket.id;
        await room.save();
        socket.join(roomCode);
        socket.data.username = username;
        socket.data.roomCode = roomCode;
        io.to(room.adminSocketId).emit('room:playerUpdate', { players: room.players });
        return callback({ success: true, reconnected: true });
      }
      room.players.push({ username, socketId: socket.id });
      await room.save();
      socket.join(roomCode);
      socket.data.username = username;
      socket.data.roomCode = roomCode;
      if (room.adminSocketId) {
        io.to(room.adminSocketId).emit('room:playerUpdate', { players: room.players });
      }
      console.log(`Player ${username} joined room ${roomCode}`);
      callback({ success: true });
    });

    socket.on('player:answer', async ({ roomCode, questionIndex, answer, remainingSeconds }) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.gameStatus !== 'active') return;
        if (questionIndex !== room.currentQuestionIndex) return;
        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) return;
        const alreadyAnswered = player.answers.find(a => a.questionIndex === questionIndex);
        if (alreadyAnswered) return;
        const questions = questionCache[roomCode];
        if (!questions) return;
        const question = questions[questionIndex];
        if (!question) return;
        const correct = String(answer).trim() === String(question.correctAnswer).trim();
        const points = correct ? calcScore(remainingSeconds) : 0;
        player.answers.push({ questionIndex, answer, correct, points });
        player.score += points;
        await room.save();

        socket.emit('player:answerResult', { correct, points, correctAnswer: question.correctAnswer });

        // Get fresh room data for accurate cumulative scores
        const freshRoom = await Room.findOne({ roomCode });

        if (freshRoom.adminSocketId) {
          io.to(freshRoom.adminSocketId).emit('admin:scoreUpdate', {
            players: freshRoom.players.map(p => ({ username: p.username, score: p.score }))
          });
        }

        const totalPlayers = freshRoom.players.length;
        const answeredCount = freshRoom.players.filter(p =>
          p.answers.some(a => a.questionIndex === questionIndex)
        ).length;

        console.log(`Room ${roomCode}: ${answeredCount}/${totalPlayers} answered Q${questionIndex}`);

        if (answeredCount >= totalPlayers) {
          console.log(`All players answered Q${questionIndex} - advancing`);
          if (activeTimers[roomCode]) {
            clearTimeout(activeTimers[roomCode]);
            delete activeTimers[roomCode];
          }
          io.to(roomCode).emit('game:questionEnd', {
            correctAnswer: question.correctAnswer,
            nextIn: 3
          });
          if (freshRoom.adminSocketId) {
            io.to(freshRoom.adminSocketId).emit('admin:scoreUpdate', {
              players: freshRoom.players.map(p => ({ username: p.username, score: p.score }))
            });
          }
          setTimeout(() => {
            const cached = questionCache[roomCode];
            if (cached) sendQuestion(io, roomCode, cached, questionIndex + 1);
          }, 3000);
        }
      } catch (err) {
        console.error('Error processing answer:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

async function sendQuestion(io, roomCode, questions, index) {
  if (index >= questions.length) {
    await endGame(io, roomCode);
    return;
  }
  const question = questions[index];
  const QUESTION_DURATION = 20;
  await Room.findOneAndUpdate({ roomCode }, { currentQuestionIndex: index });
  const questionPayload = {
    index,
    total: questions.length,
    type: question.type,
    content: question.content,
    imageUrl: question.imageUrl,
    duration: QUESTION_DURATION
  };
  io.to(roomCode).emit('game:question', questionPayload);
  console.log(`Room ${roomCode}: Sending Q${index + 1}/${questions.length}`);
  if (activeTimers[roomCode]) {
    clearTimeout(activeTimers[roomCode]);
    delete activeTimers[roomCode];
  }
  activeTimers[roomCode] = setTimeout(async () => {
    try {
      console.log(`Timer expired for Q${index} in room ${roomCode}`);
      const room = await Room.findOne({ roomCode });
      if (!room || room.gameStatus !== 'active') return;
      if (room.currentQuestionIndex !== index) return;
      for (const player of room.players) {
        const answered = player.answers.find(a => a.questionIndex === index);
        if (!answered) {
          player.answers.push({ questionIndex: index, answer: null, correct: false, points: 0 });
        }
      }
      await room.save();
      const freshRoom = await Room.findOne({ roomCode });
      io.to(roomCode).emit('game:questionEnd', {
        correctAnswer: question.correctAnswer,
        nextIn: 3
      });
      if (freshRoom.adminSocketId) {
        io.to(freshRoom.adminSocketId).emit('admin:scoreUpdate', {
          players: freshRoom.players.map(p => ({ username: p.username, score: p.score }))
        });
      }
      setTimeout(() => {
        sendQuestion(io, roomCode, questions, index + 1);
      }, 3000);
    } catch (err) {
      console.error('Timer error:', err);
    }
  }, QUESTION_DURATION * 1000);
}

async function endGame(io, roomCode) {
  try {
    const room = await Room.findOne({ roomCode });
    if (!room) return;
    room.gameStatus = 'ended';
    await room.save();
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    for (let i = 0; i < sorted.length; i++) {
      const player = sorted[i];
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.emit('game:ended', { score: player.score, rank: i + 1, total: sorted.length });
      }
    }
    if (room.adminSocketId) {
      io.to(room.adminSocketId).emit('admin:gameEnded', { players: sorted });
      io.to(room.adminSocketId).emit('admin:scoreUpdate', {
        players: sorted.map(p => ({ username: p.username, score: p.score }))
      });
    }
    delete activeTimers[roomCode];
    delete questionCache[roomCode];
    console.log(`Game ended in room ${roomCode}`);
  } catch (err) {
    console.error('End game error:', err);
  }
}
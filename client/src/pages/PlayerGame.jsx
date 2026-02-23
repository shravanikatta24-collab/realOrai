import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import TimerRing from '../components/TimerRing';

export default function PlayerGame() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('waiting'); // waiting | question | result | ended
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [result, setResult] = useState(null); // { correct, points, correctAnswer }
  const [timeLeft, setTimeLeft] = useState(20);
  const [totalScore, setTotalScore] = useState(0);
  const [finalData, setFinalData] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const playerData = JSON.parse(sessionStorage.getItem('player') || '{}');

  useEffect(() => {
    if (!playerData.username) {
      navigate('/join');
      return;
    }

    // Listen for new questions
    socket.on('game:question', (q) => {
      setQuestion(q);
      setSelectedAnswer(null);
      setResult(null);
      setTimeLeft(q.duration);
      setPhase('question');
      startTimeRef.current = Date.now();

      // Start countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, q.duration - elapsed);
        setTimeLeft(remaining);
        if (remaining <= 0) clearInterval(timerRef.current);
      }, 100);
    });

    // Question ended (time up or everyone answered)
    socket.on('game:questionEnd', ({ correctAnswer }) => {
      clearInterval(timerRef.current);
      setPhase('result');
      // If no answer selected, show timeout result
      setResult(prev => prev || { correct: false, points: 0, correctAnswer, timeout: true });
    });

    // Answer result from server
    socket.on('player:answerResult', (res) => {
      setResult(res);
      setTotalScore(prev => prev + res.points);
      setPhase('result');
    });

    // Game ended
    socket.on('game:ended', (data) => {
      clearInterval(timerRef.current);
      setFinalData(data);
      setPhase('ended');
    });

    return () => {
      clearInterval(timerRef.current);
      socket.off('game:question');
      socket.off('game:questionEnd');
      socket.off('player:answerResult');
      socket.off('game:ended');
    };
  }, []);

  const handleAnswer = (answer) => {
    if (selectedAnswer || phase !== 'question') return;
    setSelectedAnswer(answer);

    const remaining = timeLeft;
    socket.emit('player:answer', {
      roomCode: playerData.roomCode,
      questionIndex: question.index,
      answer,
      remainingSeconds: remaining
    });
  };

  // ── Waiting screen ──────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="glass p-10 text-center max-w-md w-full"
        >
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="font-display text-2xl neon-text mb-2" style={{color:'#00f5ff'}}>
            READY PLAYER
          </h2>
          <p className="text-white/60 text-xl font-bold mb-6">{playerData.username}</p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:'0ms'}} />
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:'150ms'}} />
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:'300ms'}} />
          </div>
          <p className="text-white/40 mt-4 text-sm">Waiting for admin to start the game...</p>
        </motion.div>
      </div>
    );
  }

  // ── Game ended screen ───────────────────────────────────────────────
  if (phase === 'ended' && finalData) {
    const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
    const rankEmojis = ['🥇', '🥈', '🥉'];
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/10 to-transparent" />
        </div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="glass p-10 text-center max-w-md w-full"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: 3, duration: 0.5 }}
            className="text-7xl mb-6"
          >
            {finalData.rank <= 3 ? rankEmojis[finalData.rank - 1] : '🎖️'}
          </motion.div>
          <h2 className="font-display text-3xl font-black mb-2" style={{color: rankColors[finalData.rank-1] || '#fff'}}>
            RANK #{finalData.rank}
          </h2>
          <p className="text-white/40 mb-6">out of {finalData.total} players</p>
          <div className="glass p-6 mb-6">
            <p className="text-white/50 text-sm font-display tracking-widest mb-1">FINAL SCORE</p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
              className="font-display text-5xl font-black neon-text"
              style={{color:'#00f5ff'}}
            >
              {totalScore}
            </motion.p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="btn-cyan rounded-xl py-3 px-8 font-display font-bold tracking-wider"
          >
            PLAY AGAIN
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Question screen ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10 py-8">
      {question && (
        <AnimatePresence mode="wait">
          <motion.div
            key={question.index}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="glass px-4 py-2 flex items-center gap-2">
                <span className="font-display text-xs text-white/40 tracking-wider">QUESTION</span>
                <span className="font-display text-lg font-bold" style={{color:'#00f5ff'}}>
                  {question.index + 1}/{question.total}
                </span>
              </div>
              <div className="glass px-4 py-2 flex items-center gap-2">
                <span className="font-display text-xs text-white/40 tracking-wider">SCORE</span>
                <span className="font-display text-lg font-bold" style={{color:'#39ff14'}}>{totalScore}</span>
              </div>
            </div>

            {/* Timer */}
            <div className="flex justify-center mb-6">
              <TimerRing timeLeft={timeLeft} duration={question.duration} />
            </div>

            {/* Question card */}
            <div className="glass p-6 mb-6">
              <p className="text-xs font-display tracking-widest text-white/30 mb-4 uppercase">
                {question.type === 'image' ? '📷 Image Question' : '📝 Text Question'} — Is this REAL or AI?
              </p>

              {question.type === 'image' ? (
                <div className="rounded-xl overflow-hidden mb-2">
                  <img
                    src={question.imageUrl || question.content}
                    alt="Question"
                    className="w-full object-cover max-h-64"
                    onError={e => { e.target.src = 'https://placehold.co/600x300/0a0a1a/00f5ff?text=Image+Not+Found'; }}
                  />
                  {question.content && question.content !== question.imageUrl && (
                    <p className="mt-3 text-white/80 text-lg leading-relaxed">{question.content}</p>
                  )}
                </div>
              ) : (
                <p className="text-white text-xl md:text-2xl leading-relaxed font-semibold">
                  "{question.content}"
                </p>
              )}
            </div>

            {/* Result overlay */}
            <AnimatePresence>
              {phase === 'result' && result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass p-4 mb-4 text-center border-2 ${result.correct ? 'border-green-400' : 'border-red-500'}`}
                >
                  <p className={`font-display text-xl font-bold ${result.correct ? 'text-green-400' : 'text-red-400'}`}>
                    {result.timeout ? '⏰ TIME\'S UP!' : result.correct ? '✅ CORRECT!' : '❌ WRONG!'}
                  </p>
                  {result.correct && (
                    <p className="text-white/60 mt-1">+{result.points} points</p>
                  )}
                  {!result.correct && (
                    <p className="text-white/50 mt-1">
                      Correct answer: <span className="font-bold text-white">{result.correctAnswer}</span>
                    </p>
                  )}
                  <p className="text-white/30 text-xs mt-2 animate-pulse">Next question loading...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Answer buttons */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={!selectedAnswer ? { scale: 1.03 } : {}}
                whileTap={!selectedAnswer ? { scale: 0.97 } : {}}
                onClick={() => handleAnswer('REAL')}
                disabled={!!selectedAnswer || phase === 'result'}
                className={`btn-real ${selectedAnswer === 'REAL' ? 'selected' : ''} ${selectedAnswer && selectedAnswer !== 'REAL' ? 'opacity-40' : ''}`}
              >
                ✅ REAL
              </motion.button>
              <motion.button
                whileHover={!selectedAnswer ? { scale: 1.03 } : {}}
                whileTap={!selectedAnswer ? { scale: 0.97 } : {}}
                onClick={() => handleAnswer('AI')}
                disabled={!!selectedAnswer || phase === 'result'}
                className={`btn-ai ${selectedAnswer === 'AI' ? 'selected' : ''} ${selectedAnswer && selectedAnswer !== 'AI' ? 'opacity-40' : ''}`}
              >
                🤖 AI
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

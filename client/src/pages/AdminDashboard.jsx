import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';

const SERVER = 'https://realorai-9ofc.onrender.com';
export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminToken = sessionStorage.getItem('adminToken');
  const [tab, setTab] = useState('rooms'); // rooms | questions

  // Rooms state
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);

  // Questions state
  const [questions, setQuestions] = useState([]);
  const [editingQ, setEditingQ] = useState(null);
  const [qForm, setQForm] = useState({ type: 'text', content: '', imageUrl: '', correctAnswer: 'REAL' });
  const [showQForm, setShowQForm] = useState(false);

  useEffect(() => {
    if (!adminToken) { navigate('/admin'); return; }
    fetchRooms();
    fetchQuestions();
  }, []);

  // Socket listeners for room events
  useEffect(() => {
    socket.on('room:playerUpdate', ({ players }) => {
      setPlayers(players);
    });
    socket.on('admin:scoreUpdate', ({ players }) => {
      setScores([...players].sort((a, b) => b.score - a.score));
    });
    socket.on('admin:gameEnded', ({ players }) => {
      setScores([...players].sort((a, b) => b.score - a.score));
      setGameEnded(true);
    });
    return () => {
      socket.off('room:playerUpdate');
      socket.off('admin:scoreUpdate');
      socket.off('admin:gameEnded');
    };
  }, []);

  const headers = { 'x-admin-password': adminToken, 'Content-Type': 'application/json' };

  const fetchRooms = async () => {
    const res = await fetch(`${SERVER}/api/admin/rooms`, { headers });
    const data = await res.json();
    setRooms(data);
  };

  const fetchQuestions = async () => {
    const res = await fetch(`${SERVER}/api/admin/questions`, { headers });
    const data = await res.json();
    setQuestions(data);
  };

  const createRoom = () => {
    socket.emit('admin:createRoom', { password: adminToken }, (res) => {
      if (res.error) { alert(res.error); return; }
      setActiveRoom(res.roomCode);
      setPlayers([]);
      setScores([]);
      setGameEnded(false);
      fetchRooms();
    });
  };

  const startGame = () => {
    if (!activeRoom) return;
    socket.emit('admin:startGame', { roomCode: activeRoom, password: adminToken }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const deleteRoom = async (code) => {
    if (!confirm(`Delete room ${code}?`)) return;
    await fetch(`${SERVER}/api/admin/rooms/${code}`, { method: 'DELETE', headers });
    if (activeRoom === code) setActiveRoom(null);
    fetchRooms();
  };

  const rejoinRoom = (code) => {
    socket.emit('admin:joinRoom', { password: adminToken, roomCode: code }, (res) => {
      if (res.error) { alert(res.error); return; }
      setActiveRoom(code);
      setPlayers(res.room.players || []);
      setGameEnded(res.room.gameStatus === 'ended');
    });
  };

  const saveQuestion = async () => {
    const method = editingQ ? 'PUT' : 'POST';
    const url = editingQ ? `${SERVER}/api/admin/questions/${editingQ._id}` : `${SERVER}/api/admin/questions`;
    const res = await fetch(url, { method, headers, body: JSON.stringify(qForm) });
    if (res.ok) {
      setShowQForm(false);
      setEditingQ(null);
      setQForm({ type: 'text', content: '', imageUrl: '', correctAnswer: 'REAL' });
      fetchQuestions();
    }
  };

  const editQuestion = (q) => {
    setEditingQ(q);
    setQForm({ type: q.type, content: q.content, imageUrl: q.imageUrl || '', correctAnswer: q.correctAnswer });
    setShowQForm(true);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return;
    await fetch(`${SERVER}/api/admin/questions/${id}`, { method: 'DELETE', headers });
    fetchQuestions();
  };

  if (!adminToken) return null;

  return (
    <div className="min-h-screen relative z-10 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black" style={{color:'#ff006e'}}>
            ADMIN PANEL
          </h1>
          <p className="text-white/30 text-sm">Real or AI — Game Control</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem('adminToken'); navigate('/admin'); }}
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          Logout →
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['rooms', 'questions'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-display text-sm tracking-widest px-5 py-2.5 rounded-lg transition-all ${
              tab === t
                ? 'bg-pink-500/20 border border-pink-500/50 text-pink-400'
                : 'glass text-white/40 hover:text-white/70'
            }`}
          >
            {t === 'rooms' ? '🏠 ROOMS' : '❓ QUESTIONS'}
          </button>
        ))}
      </div>

      {/* ── ROOMS TAB ────────────────────────────────────────────────── */}
      {tab === 'rooms' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Room management */}
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createRoom}
              className="btn-pink rounded-xl py-3 px-6 font-display font-bold tracking-wider w-full"
            >
              + CREATE NEW ROOM
            </motion.button>

            {/* Active room control */}
            <AnimatePresence>
              {activeRoom && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-pink p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white/40 text-xs font-display tracking-widest mb-1">ACTIVE ROOM</p>
                      <p className="font-display text-3xl font-black tracking-widest" style={{color:'#00f5ff'}}>
                        {activeRoom}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startGame}
                      className="btn-cyan rounded-xl py-2 px-5 font-display font-bold text-sm tracking-wider"
                    >
                      ▶ START GAME
                    </motion.button>
                  </div>

                  <div className="mb-3">
                    <p className="text-white/40 text-xs font-display tracking-widest mb-2">
                      PLAYERS ({players.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {players.length === 0 ? (
                        <p className="text-white/20 text-sm">No players yet...</p>
                      ) : players.map((p, i) => (
                        <motion.div
                          key={p.socketId || i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                        >
                          <span className="text-white/80">{p.username}</span>
                          <span className="font-display text-xs" style={{color:'#39ff14'}}>{p.score}pts</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* All rooms list */}
            <div>
              <p className="text-white/30 text-xs font-display tracking-widest mb-3">ALL ROOMS</p>
              <div className="space-y-2">
                {rooms.map(r => (
                  <div key={r.roomCode} className="glass p-4 flex items-center justify-between">
                    <div>
                      <span className="font-display font-bold tracking-widest" style={{color:'#00f5ff'}}>{r.roomCode}</span>
                      <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-display ${
                        r.gameStatus === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                        r.gameStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>{r.gameStatus}</span>
                      <span className="ml-2 text-white/30 text-xs">{r.players?.length || 0} players</span>
                    </div>
                    <div className="flex gap-2">
                      {r.gameStatus !== 'ended' && (
                        <button
                          onClick={() => rejoinRoom(r.roomCode)}
                          className="text-cyan-400 hover:text-cyan-300 text-xs font-display px-3 py-1 border border-cyan-400/30 rounded"
                        >
                          MANAGE
                        </button>
                      )}
                      <button
                        onClick={() => deleteRoom(r.roomCode)}
                        className="text-red-400 hover:text-red-300 text-xs font-display px-3 py-1 border border-red-400/30 rounded"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))}
                {rooms.length === 0 && <p className="text-white/20 text-sm">No rooms created yet</p>}
              </div>
            </div>
          </div>

          {/* Right: Live scoreboard */}
          <div>
            <p className="text-white/30 text-xs font-display tracking-widest mb-3">
              LIVE SCOREBOARD {gameEnded && <span className="text-yellow-400">— GAME ENDED</span>}
            </p>
            <div className="glass p-4 space-y-2 max-h-[600px] overflow-y-auto">
              {scores.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-8">No scores yet</p>
              ) : scores.map((p, i) => {
                const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
                const color = rankColors[i] || '#fff';
                return (
                  <motion.div
                    key={p.username}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
                  >
                    <span className="font-display text-lg font-black w-8 text-center" style={{color}}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                    </span>
                    <span className="flex-1 font-semibold text-white/80">{p.username}</span>
                    <motion.span
                      key={p.score}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="font-display font-black text-xl"
                      style={{color: '#39ff14', textShadow: '0 0 10px #39ff14'}}
                    >
                      {p.score}
                    </motion.span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── QUESTIONS TAB ─────────────────────────────────────────────── */}
      {tab === 'questions' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-white/40 text-sm">{questions.length} questions in bank</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setEditingQ(null);
                setQForm({ type: 'text', content: '', imageUrl: '', correctAnswer: 'REAL' });
                setShowQForm(true);
              }}
              className="btn-pink rounded-xl py-2 px-5 font-display font-bold text-sm tracking-wider"
            >
              + ADD QUESTION
            </motion.button>
          </div>

          {/* Question form modal */}
          <AnimatePresence>
            {showQForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && setShowQForm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="glass-pink p-6 w-full max-w-lg"
                >
                  <h3 className="font-display text-xl font-bold mb-4" style={{color:'#ff006e'}}>
                    {editingQ ? 'EDIT QUESTION' : 'ADD QUESTION'}
                  </h3>

                  <div className="space-y-4">
                    {/* Type */}
                    <div>
                      <label className="text-white/50 text-xs font-display tracking-wider block mb-2">TYPE</label>
                      <div className="flex gap-2">
                        {['text', 'image'].map(t => (
                          <button
                            key={t}
                            onClick={() => setQForm(f => ({...f, type: t}))}
                            className={`flex-1 py-2 rounded-lg font-display text-sm font-bold tracking-wider transition-all ${
                              qForm.type === t ? 'bg-pink-500/30 border border-pink-500 text-pink-300' : 'glass text-white/40'
                            }`}
                          >
                            {t === 'text' ? '📝 TEXT' : '📷 IMAGE'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <label className="text-white/50 text-xs font-display tracking-wider block mb-2">
                        {qForm.type === 'image' ? 'CAPTION / DESCRIPTION (optional)' : 'QUESTION TEXT'}
                      </label>
                      <textarea
                        className="input-cyber"
                        rows={3}
                        placeholder={qForm.type === 'text' ? 'Enter the statement or claim...' : 'Optional caption...'}
                        value={qForm.content}
                        onChange={e => setQForm(f => ({...f, content: e.target.value}))}
                      />
                    </div>

                    {/* Image URL */}
                    {qForm.type === 'image' && (
                      <div>
                        <label className="text-white/50 text-xs font-display tracking-wider block mb-2">IMAGE URL</label>
                        <input
                          className="input-cyber"
                          placeholder="https://example.com/image.jpg"
                          value={qForm.imageUrl}
                          onChange={e => setQForm(f => ({...f, imageUrl: e.target.value}))}
                        />
                        {qForm.imageUrl && (
                          <img src={qForm.imageUrl} alt="Preview" className="mt-2 rounded-lg max-h-32 object-cover" />
                        )}
                      </div>
                    )}

                    {/* Correct answer */}
                    <div>
                      <label className="text-white/50 text-xs font-display tracking-wider block mb-2">CORRECT ANSWER</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setQForm(f => ({...f, correctAnswer: 'REAL'}))}
                          className={`flex-1 py-3 rounded-lg font-display text-sm font-bold tracking-wider transition-all ${
                            qForm.correctAnswer === 'REAL' ? 'bg-green-500/30 border border-green-500 text-green-300' : 'glass text-white/40'
                          }`}
                        >
                          ✅ REAL
                        </button>
                        <button
                          onClick={() => setQForm(f => ({...f, correctAnswer: 'AI'}))}
                          className={`flex-1 py-3 rounded-lg font-display text-sm font-bold tracking-wider transition-all ${
                            qForm.correctAnswer === 'AI' ? 'bg-pink-500/30 border border-pink-500 text-pink-300' : 'glass text-white/40'
                          }`}
                        >
                          🤖 AI
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => { setShowQForm(false); setEditingQ(null); }}
                        className="flex-1 glass py-3 rounded-xl text-white/50 font-display text-sm"
                      >
                        CANCEL
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        onClick={saveQuestion}
                        className="flex-1 btn-pink py-3 rounded-xl font-display font-bold text-sm tracking-wider"
                      >
                        {editingQ ? 'SAVE CHANGES' : 'ADD QUESTION'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Questions list */}
          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="glass p-10 text-center text-white/30">
                <p className="text-4xl mb-3">❓</p>
                <p>No questions yet. Add some to get started!</p>
              </div>
            ) : questions.map((q, i) => (
              <motion.div
                key={q._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-4 flex gap-4 items-start"
              >
                <span className={`text-xs font-display px-2 py-1 rounded font-bold mt-1 flex-shrink-0 ${
                  q.type === 'text' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {q.type === 'text' ? '📝 TEXT' : '📷 IMG'}
                </span>
                {q.type === 'image' && q.imageUrl && (
                  <img src={q.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm truncate">{q.content || '(no caption)'}</p>
                  {q.imageUrl && <p className="text-white/30 text-xs truncate mt-0.5">{q.imageUrl}</p>}
                </div>
                <span className={`text-xs font-display font-bold px-2 py-1 rounded flex-shrink-0 ${
                  q.correctAnswer === 'REAL' ? 'bg-green-500/20 text-green-400' : 'bg-pink-500/20 text-pink-400'
                }`}>
                  {q.correctAnswer === 'REAL' ? '✅ REAL' : '🤖 AI'}
                </span>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => editQuestion(q)}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-display p-1.5 border border-cyan-400/30 rounded"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteQuestion(q._id)}
                    className="text-red-400 hover:text-red-300 text-xs font-display p-1.5 border border-red-400/30 rounded"
                  >
                    🗑️
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

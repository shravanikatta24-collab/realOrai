import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import socket from '../socket';

export default function PlayerJoin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = () => {
    if (!username.trim() || !roomCode.trim()) {
      setError('Please fill in both fields');
      return;
    }
    setLoading(true);
    setError('');

    socket.emit('player:join', { username: username.trim(), roomCode: roomCode.trim().toUpperCase() }, (res) => {
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        // Store player info and navigate to game
        sessionStorage.setItem('player', JSON.stringify({ username: username.trim(), roomCode: roomCode.trim().toUpperCase() }));
        navigate('/game');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-8 w-full max-w-md"
      >
        <button
          onClick={() => navigate('/')}
          className="text-white/40 hover:text-white/70 mb-6 flex items-center gap-2 transition-colors"
        >
          ← Back
        </button>

        <h1 className="font-display text-3xl font-bold neon-text mb-2" style={{color:'#00f5ff'}}>
          JOIN GAME
        </h1>
        <p className="text-white/40 mb-8">Enter your details to join the arena</p>

        <div className="space-y-4">
          <div>
            <label className="text-white/60 text-sm mb-2 block font-display tracking-wider">USERNAME</label>
            <input
              className="input-cyber"
              placeholder="Enter your name..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={20}
            />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-2 block font-display tracking-wider">ROOM CODE</label>
            <input
              className="input-cyber uppercase tracking-widest"
              placeholder="Enter room code..."
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={6}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-400 text-sm"
            >
              ⚠️ {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleJoin}
            disabled={loading}
            className="btn-cyan rounded-xl py-4 w-full font-display font-bold text-lg tracking-wider disabled:opacity-50 mt-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                JOINING...
              </span>
            ) : 'JOIN GAME →'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

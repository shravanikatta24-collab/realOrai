import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative z-10 px-4">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pink-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="mb-4"
        >
          <span className="text-7xl md:text-9xl font-display font-black tracking-tight">
            <span className="neon-text-green" style={{color:'#39ff14'}}>REAL</span>
            <span className="text-white/30 mx-4">OR</span>
            <span className="neon-text-pink" style={{color:'#ff006e'}}>AI</span>
          </span>
        </motion.div>
        <p className="text-white/50 font-body text-lg md:text-xl tracking-widest uppercase">
          The Ultimate Multiplayer Guessing Game
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-6 w-full max-w-md"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/join')}
          className="btn-cyan rounded-xl py-4 px-8 font-display font-bold text-lg tracking-wider w-full"
        >
          🎮 PLAY
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/admin')}
          className="btn-pink rounded-xl py-4 px-8 font-display font-bold text-lg tracking-wider w-full"
        >
          ⚙️ ADMIN
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-20 grid grid-cols-3 gap-8 text-center max-w-lg"
      >
        {[
          { icon: '⚡', label: 'Real-time', desc: 'Live multiplayer' },
          { icon: '🧠', label: '20 Questions', desc: 'Per game' },
          { icon: '🏆', label: 'Ranked', desc: 'Speed scoring' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 + i * 0.15 }}
            className="glass p-4"
          >
            <div className="text-3xl mb-1">{item.icon}</div>
            <div className="font-display text-xs text-cyan-400 tracking-wider">{item.label}</div>
            <div className="text-white/40 text-xs mt-1">{item.desc}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('adminToken', data.token);
        navigate('/admin/dashboard');
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-pink-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-pink p-8 w-full max-w-md"
      >
        <button
          onClick={() => navigate('/')}
          className="text-white/40 hover:text-white/70 mb-6 flex items-center gap-2 transition-colors"
        >
          ← Back
        </button>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="font-display text-3xl font-bold neon-text-pink mb-2" style={{color:'#ff006e'}}>
            ADMIN
          </h1>
          <p className="text-white/40 text-sm">Enter admin password to continue</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            className="input-cyber"
            placeholder="Admin password..."
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ borderColor: 'rgba(255,0,110,0.3)' }}
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm"
            >
              ⚠️ {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={loading}
            className="btn-pink rounded-xl py-4 w-full font-display font-bold text-lg tracking-wider disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                VERIFYING...
              </span>
            ) : 'LOGIN →'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

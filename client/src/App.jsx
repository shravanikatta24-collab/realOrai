import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import PlayerJoin from './pages/PlayerJoin';
import PlayerGame from './pages/PlayerGame';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/join" element={<PlayerJoin />} />
      <Route path="/game" element={<PlayerGame />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

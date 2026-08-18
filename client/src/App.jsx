import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Room from './pages/Room';
import Game from './pages/Game';
import Result from './pages/Result';
import Solo from './pages/Solo';
import History from './pages/History';
import Leaderboard from './pages/Leaderboard';

export default function App() {
  return (
    <AuthProvider>
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/game/:roomId" element={<Game />} />
          <Route path="/result/:roomId" element={<Result />} />
          <Route path="/solo" element={<Solo />} />
          <Route path="/history" element={<History />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
    </AuthProvider>
  );
}

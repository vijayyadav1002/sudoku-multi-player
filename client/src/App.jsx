import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Home from './pages/Home';
import Room from './pages/Room';
import Game from './pages/Game';
import Result from './pages/Result';
import Solo from './pages/Solo';

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/game/:roomId" element={<Game />} />
          <Route path="/result/:roomId" element={<Result />} />
          <Route path="/solo" element={<Solo />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

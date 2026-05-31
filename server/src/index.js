import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomsRouter from './routes/rooms.js';
import gamesRouter from './routes/games.js';
import { registerGameHandlers } from './socket/gameHandlers.js';

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use('/api/rooms', roomsRouter);
app.use('/api/games', gamesRouter);

io.on('connection', (socket) => {
  io.emit('online-count', io.engine.clientsCount);
  socket.on('disconnect', () => {
    io.emit('online-count', io.engine.clientsCount);
  });
  registerGameHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

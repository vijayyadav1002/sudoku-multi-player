import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
import { generatePuzzle } from '../game/sudokuGenerator.js';
import {
  createRoom, getRoom, addPlayer, getOpponent,
  updatePlayerCell, calcProgress, findRoomBySocketId, deleteRoom,
} from '../game/roomManager.js';

export function registerGameHandlers(io, socket) {
  socket.on('create-room', ({ nickname, difficulty }, callback) => {
    try {
      const roomId = nanoid();
      const { puzzle, solution } = generatePuzzle(difficulty);
      createRoom(roomId, difficulty, puzzle, solution);
      addPlayer(roomId, socket.id, nickname);
      socket.join(roomId);
      callback({ ok: true, roomId, puzzle, solution, difficulty });
    } catch {
      callback({ ok: false, error: 'Failed to create room' });
    }
  });

  socket.on('join-room', ({ roomId, nickname }, callback) => {
    const room = getRoom(roomId);
    if (!room) return callback({ ok: false, error: 'Room not found' });
    if (room.status !== 'waiting') return callback({ ok: false, error: 'Game already started' });
    if (room.players.length >= 2) return callback({ ok: false, error: 'Room is full' });

    addPlayer(roomId, socket.id, nickname);
    socket.join(roomId);

    room.status = 'playing';
    room.startedAt = new Date();

    const creator = room.players[0];

    // Notify creator that opponent joined, send puzzle data in case they need it
    socket.to(roomId).emit('opponent-joined', {
      opponentNickname: nickname,
      puzzle: room.puzzle,
      solution: room.solution,
      difficulty: room.difficulty,
    });

    callback({
      ok: true,
      roomId,
      puzzle: room.puzzle,
      solution: room.solution,
      difficulty: room.difficulty,
      opponentNickname: creator.nickname,
    });
  });

  socket.on('cell-update', ({ roomId, index, value }) => {
    const room = getRoom(roomId);
    if (!room || room.status !== 'playing') return;
    if (index < 0 || index > 80) return;
    if (value !== 0 && (value < 1 || value > 9)) return;
    // Prevent overwriting given cells
    if (room.puzzle[index] !== 0) return;

    const result = updatePlayerCell(roomId, socket.id, index, value);
    if (!result) return;

    const { player } = result;
    const progress = calcProgress(player.board, room.puzzle, room.solution);
    player.progress = progress;

    const opponent = getOpponent(roomId, socket.id);
    if (opponent) {
      io.to(opponent.socketId).emit('opponent-progress', { progress });
    }

    if (progress === 100 && !player.completed) {
      player.completed = true;
      player.completedAt = new Date();
      room.status = 'finished';
      room.winner = socket.id;

      const duration = Math.round((player.completedAt - room.startedAt) / 1000);

      io.to(roomId).emit('game-over', {
        winnerSocketId: socket.id,
        winnerNickname: player.nickname,
        loserNickname: opponent?.nickname ?? null,
        loserProgress: opponent?.progress ?? 0,
        duration,
      });

      setTimeout(() => deleteRoom(roomId), 30_000);
    }
  });

  socket.on('leave-game', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;
    if (room.status === 'waiting') {
      deleteRoom(roomId);
    } else if (room.status === 'playing') {
      room.status = 'finished';
      socket.to(roomId).emit('opponent-disconnected');
      setTimeout(() => deleteRoom(roomId), 5_000);
    }
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocketId(socket.id);
    if (!room) return;

    if (room.status === 'waiting') {
      deleteRoom(room.id);
    } else if (room.status === 'playing') {
      room.status = 'finished';
      socket.to(room.id).emit('opponent-disconnected');
      setTimeout(() => deleteRoom(room.id), 5_000);
    }
  });
}

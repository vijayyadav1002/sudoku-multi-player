import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
import { generatePuzzle } from '../game/sudokuGenerator.js';
import {
  createRoom, getRoom, addPlayer, removePlayer,
  getPlayerSummaries, isHost, startGame, buildLeaderboard,
  updatePlayerCell, calcProgress, findRoomBySocketId, deleteRoom,
  MAX_PLAYERS,
} from '../game/roomManager.js';

function handleLeaveOrDisconnect(io, socket, room) {
  if (!room) return;

  if (room.status === 'waiting') {
    if (isHost(room.id, socket.id)) {
      io.to(room.id).emit('room-closed', { reason: 'host-left' });
      deleteRoom(room.id);
    } else {
      const result = removePlayer(room.id, socket.id);
      if (result) {
        const summaries = getPlayerSummaries(room);
        socket.to(room.id).emit('player-joined', {
          players: summaries,
          canStart: summaries.length >= 2,
        });
      }
    }
  } else if (room.status === 'playing') {
    const result = removePlayer(room.id, socket.id);
    if (!result) return;
    const { player } = result;

    if (room.players.length === 0) {
      deleteRoom(room.id);
    } else if (room.players.length === 1) {
      room.status = 'finished';
      const leaderboard = buildLeaderboard(room);
      const winner = room.players[0];
      io.to(room.id).emit('game-over', {
        leaderboard,
        winnerSocketId: winner.socketId,
        winnerNickname: winner.nickname,
        difficulty: room.difficulty,
        totalDuration: room.startedAt
          ? Math.round((Date.now() - room.startedAt) / 1000)
          : null,
        autoWin: true,
      });
      setTimeout(() => deleteRoom(room.id), 30_000);
    } else {
      const remainingPlayers = getPlayerSummaries(room);
      socket.to(room.id).emit('player-left', {
        socketId: player.socketId,
        nickname: player.nickname,
        remainingPlayers,
        autoWin: false,
      });
    }
  }
}

export function registerGameHandlers(io, socket) {
  socket.on('create-room', ({ nickname, difficulty }, callback) => {
    try {
      const roomId = nanoid();
      const { puzzle, solution } = generatePuzzle(difficulty);
      createRoom(roomId, difficulty, puzzle, solution, socket.id);
      addPlayer(roomId, socket.id, nickname);
      socket.join(roomId);
      const room = getRoom(roomId);
      const players = getPlayerSummaries(room);
      callback({
        ok: true,
        roomId,
        puzzle,
        solution,
        difficulty,
        isHost: true,
        players,
      });
    } catch {
      callback({ ok: false, error: 'Failed to create room' });
    }
  });

  socket.on('join-room', ({ roomId, nickname }, callback) => {
    const room = getRoom(roomId);
    if (!room) return callback({ ok: false, error: 'Room not found' });
    if (room.status !== 'waiting') return callback({ ok: false, error: 'Game already started' });
    if (room.players.length >= MAX_PLAYERS) return callback({ ok: false, error: 'Room is full' });

    addPlayer(roomId, socket.id, nickname);
    socket.join(roomId);

    const summaries = getPlayerSummaries(room);
    socket.to(roomId).emit('player-joined', {
      players: summaries,
      canStart: summaries.length >= 2,
    });

    callback({
      ok: true,
      roomId,
      puzzle: room.puzzle,
      solution: room.solution,
      difficulty: room.difficulty,
      players: summaries,
    });
  });

  socket.on('start-game', ({ roomId }, callback) => {
    const room = getRoom(roomId);
    if (!room) return callback({ ok: false, error: 'Room not found' });
    if (!isHost(roomId, socket.id)) return callback({ ok: false, error: 'Only the host can start' });
    if (room.status !== 'waiting') return callback({ ok: false, error: 'Game already started' });
    if (room.players.length < 2) return callback({ ok: false, error: 'Need at least 2 players' });

    startGame(roomId);

    io.to(roomId).emit('game-started', {
      puzzle: room.puzzle,
      solution: room.solution,
      difficulty: room.difficulty,
      players: getPlayerSummaries(room),
      startedAt: room.startedAt.getTime(),
    });

    callback({ ok: true });
  });

  socket.on('cell-update', ({ roomId, index, value }) => {
    const room = getRoom(roomId);
    if (!room || room.status !== 'playing') return;
    if (index < 0 || index > 80) return;
    if (value !== 0 && (value < 1 || value > 9)) return;
    if (room.puzzle[index] !== 0) return;

    const result = updatePlayerCell(roomId, socket.id, index, value);
    if (!result) return;

    const { player } = result;
    const progress = calcProgress(player.board, room.puzzle, room.solution);
    player.progress = progress;

    io.to(roomId).emit('players-progress', {
      updates: room.players.map(p => ({ socketId: p.socketId, progress: p.progress })),
    });

    if (progress === 100 && !player.completed) {
      player.completed = true;
      player.completedAt = new Date();
      room.status = 'finished';
      room.winner = socket.id;

      const leaderboard = buildLeaderboard(room);
      const duration = Math.round((player.completedAt - room.startedAt) / 1000);

      io.to(roomId).emit('game-over', {
        leaderboard,
        winnerSocketId: socket.id,
        winnerNickname: player.nickname,
        difficulty: room.difficulty,
        totalDuration: duration,
        autoWin: false,
      });

      setTimeout(() => deleteRoom(roomId), 30_000);
    }
  });

  socket.on('leave-game', ({ roomId }) => {
    const room = getRoom(roomId);
    handleLeaveOrDisconnect(io, socket, room);
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocketId(socket.id);
    handleLeaveOrDisconnect(io, socket, room);
  });
}

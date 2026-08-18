import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
import { generatePuzzle } from '../game/sudokuGenerator.js';
import {
  createRoom, getRoom, addPlayer, removePlayer,
  getPlayerSummaries, isHost, startGame, buildLeaderboard,
  updatePlayerCell, calcProgress, findRoomBySocketId, deleteRoom,
  getPublicRooms, MAX_PLAYERS, updateRoomDifficulty,
} from '../game/roomManager.js';

function broadcastPublicRooms(io) {
  io.to('lobby').emit('public-rooms-updated', { rooms: getPublicRooms() });
}

const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const ALLOWED_EMOTES = new Set(['🔥', '💀', '😤', '🎉', '🤯', '👀']);

function handleLeaveOrDisconnect(io, socket, room) {
  if (!room) return;

  if (room.status === 'waiting') {
    if (isHost(room.id, socket.id)) {
      io.to(room.id).emit('room-closed', { reason: 'host-left' });
      deleteRoom(room.id);
      broadcastPublicRooms(io);
    } else {
      const result = removePlayer(room.id, socket.id);
      if (result) {
        const summaries = getPlayerSummaries(room);
        socket.to(room.id).emit('player-left', {
          socketId: result.player.socketId,
          nickname: result.player.nickname,
          remainingPlayers: summaries,
          canStart: summaries.length >= 2,
        });
        broadcastPublicRooms(io);
      }
    }
  } else if (room.status === 'playing') {
    const result = removePlayer(room.id, socket.id);
    if (!result) return;
    const { player } = result;

    if (room.players.length === 0) {
      deleteRoom(room.id);
      broadcastPublicRooms(io);
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
  socket.on('join-lobby', () => {
    socket.join('lobby');
    socket.emit('online-count', io.engine.clientsCount);
    socket.emit('public-rooms-updated', { rooms: getPublicRooms() });
  });

  socket.on('leave-lobby', () => {
    socket.leave('lobby');
  });

  socket.on('create-room', ({ nickname, difficulty, isPublic }, callback) => {
    try {
      const selectedDifficulty = ALLOWED_DIFFICULTIES.has(difficulty) ? difficulty : 'medium';
      const roomId = nanoid();
      const { puzzle, solution } = generatePuzzle(selectedDifficulty);
      createRoom(roomId, selectedDifficulty, puzzle, solution, socket.id, isPublic ?? false);
      addPlayer(roomId, socket.id, nickname);
      socket.join(roomId);
      const room = getRoom(roomId);
      const players = getPlayerSummaries(room);
      callback({
        ok: true,
        roomId,
        puzzle,
        solution,
        difficulty: selectedDifficulty,
        isHost: true,
        isPublic: room.isPublic,
        players,
      });
      broadcastPublicRooms(io);
    } catch {
      callback({ ok: false, error: 'Failed to create room' });
    }
  });

  socket.on('join-room', ({ roomId, nickname }, callback) => {
    const room = getRoom(roomId);
    if (!room) return callback({ ok: false, error: 'Room not found' });
    if (room.status !== 'waiting') return callback({ ok: false, error: 'Game already started' });
    if (room.players.length >= MAX_PLAYERS) return callback({ ok: false, error: 'Room is full' });

    const alreadyJoined = room.players.some(p => p.socketId === socket.id);
    addPlayer(roomId, socket.id, nickname);
    socket.join(roomId);

    const summaries = getPlayerSummaries(room);
    if (!alreadyJoined) {
      socket.to(roomId).emit('player-joined', {
        players: summaries,
        canStart: summaries.length >= 2,
      });
    }

    broadcastPublicRooms(io);

    callback({
      ok: true,
      roomId,
      puzzle: room.puzzle,
      solution: room.solution,
      difficulty: room.difficulty,
      players: summaries,
    });
  });

  socket.on('change-difficulty', ({ roomId, difficulty }, callback) => {
    const room = getRoom(roomId);
    if (!room) return callback({ ok: false, error: 'Room not found' });
    if (!isHost(roomId, socket.id)) return callback({ ok: false, error: 'Only the host can change difficulty' });
    if (room.status !== 'waiting') return callback({ ok: false, error: 'Game already started' });
    if (!ALLOWED_DIFFICULTIES.has(difficulty)) return callback({ ok: false, error: 'Invalid difficulty' });

    const { puzzle, solution } = generatePuzzle(difficulty);
    const updatedRoom = updateRoomDifficulty(roomId, difficulty, puzzle, solution);
    if (!updatedRoom) return callback({ ok: false, error: 'Failed to update difficulty' });

    const payload = {
      difficulty: updatedRoom.difficulty,
      players: getPlayerSummaries(updatedRoom),
    };
    io.to(roomId).emit('room-updated', payload);
    broadcastPublicRooms(io);
    callback({ ok: true, ...payload });
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

    broadcastPublicRooms(io);
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

  socket.on('emote', ({ roomId, emote }) => {
    const room = getRoom(roomId);
    if (!room || room.status !== 'playing') return;
    if (!ALLOWED_EMOTES.has(emote)) return;
    if (!room.players.some(p => p.socketId === socket.id)) return;

    socket.to(roomId).emit('emote', {
      socketId: socket.id,
      emote,
    });
  });

  socket.on('leave-game', ({ roomId }) => {
    const room = getRoom(roomId);
    handleLeaveOrDisconnect(io, socket, room);
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocketId(socket.id);
    handleLeaveOrDisconnect(io, socket, room);
  });
}

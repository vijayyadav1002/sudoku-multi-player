export const rooms = new Map();
export const MAX_PLAYERS = 10;

export function createRoom(id, difficulty, puzzle, solution, hostSocketId, isPublic = false) {
  const room = {
    id,
    difficulty,
    puzzle: [...puzzle],
    solution: [...solution],
    players: [],
    status: 'waiting',
    winner: null,
    startedAt: null,
    createdAt: new Date(),
    hostSocketId,
    isPublic: isPublic ?? false,
  };
  rooms.set(id, room);
  return room;
}

export function getPublicRooms() {
  const result = [];
  for (const room of rooms.values()) {
    if (room.isPublic && room.status === 'waiting' && room.players.length < MAX_PLAYERS) {
      result.push({
        id: room.id,
        difficulty: room.difficulty,
        playerCount: room.players.length,
        maxPlayers: MAX_PLAYERS,
        hostNickname: room.players.find(p => p.socketId === room.hostSocketId)?.nickname ?? 'Unknown',
        createdAt: room.createdAt.getTime(),
      });
    }
  }
  return result;
}

export function getRoom(id) {
  return rooms.get(id) ?? null;
}

export function deleteRoom(id) {
  rooms.delete(id);
}

export function addPlayer(roomId, socketId, nickname) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.players.length >= MAX_PLAYERS) return null;
  const existing = room.players.find(p => p.socketId === socketId);
  if (existing) return existing;
  const player = {
    socketId,
    nickname,
    board: [...room.puzzle],
    progress: 0,
    completed: false,
    completedAt: null,
  };
  room.players.push(player);
  return player;
}

export function updateRoomDifficulty(roomId, difficulty, puzzle, solution) {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'waiting') return null;
  room.difficulty = difficulty;
  room.puzzle = [...puzzle];
  room.solution = [...solution];
  room.players.forEach((player) => {
    player.board = [...puzzle];
    player.progress = 0;
    player.completed = false;
    player.completedAt = null;
  });
  return room;
}

export function removePlayer(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const idx = room.players.findIndex(p => p.socketId === socketId);
  if (idx === -1) return null;
  const [player] = room.players.splice(idx, 1);
  return { room, player };
}

export function getPlayerSummaries(room) {
  return room.players.map(p => ({
    socketId: p.socketId,
    nickname: p.nickname,
    isHost: p.socketId === room.hostSocketId,
  }));
}

export function getOtherPlayers(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.players.filter(p => p.socketId !== socketId);
}

export function isHost(roomId, socketId) {
  const room = rooms.get(roomId);
  return room?.hostSocketId === socketId;
}

export function startGame(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.status = 'playing';
  room.startedAt = new Date();
  return room;
}

export function buildLeaderboard(room) {
  const players = [...room.players];
  players.sort((a, b) => {
    if (a.completed && b.completed) return a.completedAt - b.completedAt;
    if (a.completed) return -1;
    if (b.completed) return 1;
    return b.progress - a.progress;
  });
  return players.map((p, i) => ({
    rank: i + 1,
    socketId: p.socketId,
    nickname: p.nickname,
    progress: p.progress,
    completedAt: p.completedAt ? p.completedAt.getTime() : null,
    duration: p.completedAt && room.startedAt
      ? Math.round((p.completedAt - room.startedAt) / 1000)
      : null,
  }));
}

export function updatePlayerCell(roomId, socketId, index, value) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const player = room.players.find(p => p.socketId === socketId);
  if (!player) return null;
  player.board[index] = value;
  return { room, player };
}

export function calcProgress(board, puzzle, solution) {
  const blanks = puzzle.filter(v => v === 0).length;
  if (blanks === 0) return 100;
  const correct = board.reduce((acc, v, i) =>
    acc + (puzzle[i] === 0 && v === solution[i] ? 1 : 0), 0);
  return Math.round((correct / blanks) * 100);
}

export function findRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.socketId === socketId)) return room;
  }
  return null;
}

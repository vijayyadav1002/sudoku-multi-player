export const rooms = new Map();

export function createRoom(id, difficulty, puzzle, solution) {
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
  };
  rooms.set(id, room);
  return room;
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

export function getOpponent(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return room.players.find(p => p.socketId !== socketId) ?? null;
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

import { Router } from 'express';
import { getRoom, MAX_PLAYERS } from '../game/roomManager.js';
import { generatePuzzle } from '../game/sudokuGenerator.js';

const router = Router();

const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];

router.get('/puzzle', (req, res) => {
  const difficulty = ALLOWED_DIFFICULTIES.includes(req.query.difficulty)
    ? req.query.difficulty
    : 'medium';
  const { puzzle, solution } = generatePuzzle(difficulty);
  res.json({ puzzle, solution });
});

router.get('/:id', (req, res) => {
  const room = getRoom(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({
    id: room.id,
    difficulty: room.difficulty,
    status: room.status,
    playerCount: room.players.length,
    maxPlayers: MAX_PLAYERS,
    canJoin: room.status === 'waiting' && room.players.length < MAX_PLAYERS,
  });
});

export default router;

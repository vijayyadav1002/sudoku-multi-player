import { Router } from 'express';
import { getRoom } from '../game/roomManager.js';

const router = Router();

router.get('/:id', (req, res) => {
  const room = getRoom(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({
    id: room.id,
    difficulty: room.difficulty,
    status: room.status,
    playerCount: room.players.length,
    canJoin: room.status === 'waiting' && room.players.length < 2,
  });
});

export default router;

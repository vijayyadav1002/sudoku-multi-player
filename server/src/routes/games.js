import { Router } from 'express';
import { supabase, getUserFromToken } from '../lib/supabase.js';

const router = Router();

const VALID_MODES = ['solo', 'battle'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

router.post('/', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'DB not configured' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { mode, difficulty, playerCount, winnerNickname, totalDuration, players } = req.body;

  if (!VALID_MODES.includes(mode)) return res.status(400).json({ error: 'Invalid mode' });
  if (!VALID_DIFFICULTIES.includes(difficulty)) return res.status(400).json({ error: 'Invalid difficulty' });
  if (!Array.isArray(players) || players.length === 0) return res.status(400).json({ error: 'No players' });

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      mode,
      difficulty,
      player_count: playerCount ?? players.length,
      winner_nickname: winnerNickname ?? null,
      total_duration_seconds: totalDuration ?? null,
    })
    .select()
    .single();

  if (gameError) {
    console.error('Failed to insert game:', gameError);
    return res.status(500).json({ error: 'Failed to save game' });
  }

  const playerRows = players.map(p => ({
    game_id: game.id,
    user_id: p.isMe ? user.id : null,
    nickname: p.nickname,
    outcome: p.outcome,
    rank: p.rank ?? null,
    progress: p.progress ?? 0,
    duration_seconds: p.duration ?? null,
  }));

  const { error: playersError } = await supabase.from('game_players').insert(playerRows);
  if (playersError) {
    console.error('Failed to insert players:', playersError);
    return res.status(500).json({ error: 'Failed to save players' });
  }

  res.json({ ok: true, gameId: game.id });
});

router.get('/leaderboard', async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'DB not configured' });

  const [winsRes, timesRes] = await Promise.all([
    // Top 10 by battle wins
    supabase.rpc('leaderboard_wins'),
    // Best times per difficulty (solo)
    supabase.rpc('leaderboard_times'),
  ]);

  if (winsRes.error || timesRes.error) {
    console.error(winsRes.error || timesRes.error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }

  res.json({ wins: winsRes.data, times: timesRes.data });
});

export default router;

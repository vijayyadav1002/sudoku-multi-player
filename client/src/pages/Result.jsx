import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { saveGame } from '../lib/api';
import { formatDuration } from '../lib/sudokuHelpers';
import { avatarGradient, getPlayerPaletteId, initials } from '../lib/players';

const CONFETTI_COLORS = [
  'oklch(0.82 0.16 80)',
  'oklch(0.72 0.18 285)',
  'oklch(0.78 0.16 200)',
  'oklch(0.74 0.18 25)',
  'oklch(0.78 0.18 150)',
  'oklch(0.78 0.16 330)',
];

function Confetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    left: `${(i / 36) * 100 + Math.random() * 4}%`,
    delay: `${(Math.random() * 1.5).toFixed(2)}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotate: `${Math.random() * 360}deg`,
  }));
  return (
    <>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{ left: p.left, animationDelay: p.delay, background: p.color, transform: `rotate(${p.rotate})` }}
        />
      ))}
    </>
  );
}

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const state = location.state;

  if (!state) { navigate('/'); return null; }

  const { leaderboard = [], winnerSocketId, winnerNickname, totalDuration, autoWin } = state;
  const mySocketId = state.mySocketId ?? socket.id;
  const isWinner = autoWin || winnerSocketId === mySocketId;
  const myEntry = leaderboard.find(e => e.socketId === mySocketId);
  const myRank = myEntry?.rank ?? null;
  const { session } = useAuth();

  useEffect(() => {
    const record = {
      outcome: isWinner ? 'win' : 'loss',
      winnerNickname: winnerNickname ?? '',
      difficulty: state.difficulty || 'medium',
      duration: totalDuration ?? null,
      playerCount: leaderboard.length,
      myRank: myRank ?? leaderboard.length,
      myProgress: myEntry?.progress ?? 0,
      date: new Date().toISOString(),
    };
    const prev = JSON.parse(localStorage.getItem('sudoku-battle-history') || '[]');
    localStorage.setItem('sudoku-battle-history', JSON.stringify([record, ...prev].slice(0, 20)));

    if (session?.access_token && !autoWin) {
      saveGame({
        mode: 'battle',
        difficulty: state.difficulty || 'medium',
        playerCount: leaderboard.length,
        winnerNickname: winnerNickname ?? null,
        totalDuration: totalDuration ?? null,
        players: leaderboard.map(entry => ({
          isMe: entry.socketId === mySocketId,
          nickname: entry.nickname,
          outcome: entry.socketId === winnerSocketId ? 'win' : 'loss',
          rank: entry.rank,
          progress: entry.progress,
          duration: entry.duration ?? null,
        })),
      }, session.access_token);
    }
  }, []);

  const sorted = [...leaderboard].sort((a, b) => a.rank - b.rank);

  // Podium visual order: 2nd | 1st | 3rd
  const podiumSlots = [sorted[1], sorted[0], sorted[2]];
  const podiumClasses = ['second', 'first', 'third'];
  const podiumMedals = ['🥈', '🥇', '🥉'];

  return (
    <div className="screen">
      <div className="bg-orbs"><div className="orb a" /><div className="orb b" /><div className="orb c" /></div>
      <div className="bg-grid" />

      <div className="modal-backdrop">
        <div className="victory-card card" style={{ position: 'relative', overflow: 'hidden' }}>
          {isWinner && <Confetti />}

          <div style={{ fontSize: 52 }}>{isWinner ? '🏆' : '💪'}</div>
          <h2 style={{ color: isWinner ? 'oklch(0.92 0.14 80)' : 'var(--text)' }}>
            {autoWin ? 'All opponents left — you win!' : isWinner ? 'You won!' : `${winnerNickname} won!`}
          </h2>
          {totalDuration != null && !autoWin && (
            <p className="sub">
              Winner's time:{' '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--text)' }}>
                {formatDuration(totalDuration)}
              </span>
            </p>
          )}

          {sorted.length > 0 && (
            <div className="podium">
              {podiumSlots.map((entry, vi) => {
                if (!entry) return <div key={`empty-${vi}`} />;
                const idx = leaderboard.findIndex(e => e.socketId === entry.socketId);
                const pid = entry.socketId === mySocketId && state.avatarId
                  ? state.avatarId
                  : getPlayerPaletteId(idx);
                const isMe = entry.socketId === mySocketId;
                return (
                  <div key={entry.socketId} className={`podium-spot ${podiumClasses[vi]}`}>
                    <div
                      className="opp-mini-avatar"
                      style={{ background: avatarGradient(pid), width: 38, height: 38, fontSize: 14, borderRadius: 11 }}
                    >
                      {initials(entry.nickname)}
                    </div>
                    <div className="podium-rank">{podiumMedals[vi]}</div>
                    <div className="podium-name">{isMe ? 'You' : entry.nickname}</div>
                    <div className="podium-time">
                      {entry.duration != null ? formatDuration(entry.duration) : `${entry.progress ?? 0}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Play again →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

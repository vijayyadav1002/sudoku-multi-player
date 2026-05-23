import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { formatDuration } from '../lib/sudokuHelpers';

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const state = location.state;

  if (!state) {
    navigate('/');
    return null;
  }

  const { leaderboard = [], winnerSocketId, winnerNickname, totalDuration, autoWin } = state;
  const mySocketId = state.mySocketId ?? socket.id;
  const isWinner = winnerSocketId === mySocketId;
  const myEntry = leaderboard.find(e => e.socketId === mySocketId);
  const myRank = myEntry?.rank ?? null;

  const [history, setHistory] = useState(() =>
    JSON.parse(localStorage.getItem('sudoku-battle-history') || '[]')
  );

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
    const updated = [record, ...prev].slice(0, 20);
    localStorage.setItem('sudoku-battle-history', JSON.stringify(updated));
    setHistory(updated);
  }, []);

  const headerEmoji = autoWin ? '🏆' : isWinner ? '🏆' : '💪';
  const headerText = autoWin
    ? 'All opponents left — you win!'
    : isWinner
    ? 'You won!'
    : `${winnerNickname} won!`;

  return (
    <div className="min-h-full bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Result card */}
        <div
          className={`rounded-2xl p-6 shadow-xl ${
            isWinner || autoWin
              ? 'bg-green-950 border border-green-700'
              : 'bg-slate-800 border border-slate-600'
          }`}
        >
          <div className="text-center mb-4">
            <div className="text-5xl mb-3">{headerEmoji}</div>
            <h1 className={`text-2xl font-bold ${isWinner || autoWin ? 'text-green-400' : 'text-slate-100'}`}>
              {headerText}
            </h1>
            {totalDuration != null && !autoWin && (
              <p className="text-slate-400 text-sm mt-1">
                Winner's time: <span className="font-mono font-bold text-white">{formatDuration(totalDuration)}</span>
              </p>
            )}
          </div>

          {/* Leaderboard */}
          <div className="space-y-1.5">
            {leaderboard.map((entry) => {
              const isMe = entry.socketId === mySocketId;
              const isFirst = entry.rank === 1;
              return (
                <div
                  key={entry.socketId}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                    isMe
                      ? 'bg-indigo-900/60 border border-indigo-700'
                      : 'bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`font-bold w-6 text-center flex-shrink-0 ${
                      isFirst ? 'text-yellow-400' : 'text-slate-500'
                    }`}
                  >
                    #{entry.rank}
                  </span>
                  <span className="text-slate-200 truncate flex-1">
                    {entry.nickname}
                    {isMe && <span className="text-slate-500 ml-1">(you)</span>}
                  </span>
                  <span className={`font-bold tabular-nums flex-shrink-0 ${isFirst ? 'text-yellow-400' : 'text-slate-300'}`}>
                    {entry.progress}%
                  </span>
                  <span className="font-mono text-slate-500 text-xs flex-shrink-0 w-12 text-right">
                    {entry.duration != null ? formatDuration(entry.duration) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Play again */}
        <button
          onClick={() => navigate('/')}
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl py-3.5 transition-colors"
        >
          Play Again
        </button>

        {/* Battle history */}
        {history.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-4">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Battle History</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {history.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm px-1 py-1.5 border-b border-slate-700/50 last:border-0">
                  <span className={`text-xs font-bold w-5 ${r.outcome === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                    {r.outcome === 'win' ? 'W' : 'L'}
                  </span>
                  <span className="text-slate-300 capitalize w-12">{r.difficulty}</span>
                  <span className="text-slate-400 flex-1 truncate text-xs">
                    #{r.myRank ?? '?'}/{r.playerCount ?? '?'} · {r.winnerNickname ? `${r.winnerNickname} won` : ''}
                  </span>
                  <span className="font-mono text-white text-xs">
                    {r.duration != null ? formatDuration(r.duration) : '—'}
                  </span>
                  <span className="text-slate-500 text-xs w-14 text-right">
                    {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

  const { opponentDisconnected, winnerSocketId, winnerNickname, loserNickname, loserProgress, duration } = state;
  const isWinner = winnerSocketId === socket.id;
  const myNickname = state.nickname;
  const opponentNickname = state.opponentNickname || 'Opponent';

  const [history, setHistory] = useState(() =>
    JSON.parse(localStorage.getItem('sudoku-battle-history') || '[]')
  );

  useEffect(() => {
    if (opponentDisconnected) return;
    const record = {
      outcome: isWinner ? 'win' : 'loss',
      opponentNickname,
      difficulty: state.difficulty || 'medium',
      duration: duration ?? null,
      loserProgress: loserProgress ?? 0,
      date: new Date().toISOString(),
    };
    const prev = JSON.parse(localStorage.getItem('sudoku-battle-history') || '[]');
    const updated = [record, ...prev].slice(0, 20);
    localStorage.setItem('sudoku-battle-history', JSON.stringify(updated));
    setHistory(updated);
  }, []);

  return (
    <div className="min-h-full bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Result card */}
        <div
          className={`rounded-2xl p-8 text-center shadow-xl ${
            opponentDisconnected
              ? 'bg-slate-800 border border-slate-600'
              : isWinner
              ? 'bg-green-950 border border-green-700'
              : 'bg-slate-800 border border-slate-600'
          }`}
        >
          <div className="text-6xl mb-4">
            {opponentDisconnected ? '🔌' : isWinner ? '🏆' : '💪'}
          </div>

          <h1
            className={`text-3xl font-bold mb-1 ${
              isWinner && !opponentDisconnected ? 'text-green-400' : 'text-slate-100'
            }`}
          >
            {opponentDisconnected
              ? 'Opponent left'
              : isWinner
              ? 'You won!'
              : `${winnerNickname} won!`}
          </h1>

          {opponentDisconnected ? (
            <p className="text-slate-400 text-sm mt-2">Your opponent disconnected from the game.</p>
          ) : (
            <>
              <p className="text-slate-400 text-sm mb-6">
                {isWinner
                  ? `You finished before ${loserNickname}!`
                  : `Keep practicing — you'll get them next time!`}
              </p>

              {/* Score breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm bg-slate-800/50 rounded-xl px-4 py-3">
                  <span className="text-slate-300">{myNickname} (you)</span>
                  <span className={`font-bold text-lg ${isWinner ? 'text-green-400' : 'text-slate-200'}`}>
                    {isWinner ? '100%' : `${loserProgress}%`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm bg-slate-800/50 rounded-xl px-4 py-3">
                  <span className="text-slate-300">{opponentNickname}</span>
                  <span className={`font-bold text-lg ${!isWinner ? 'text-green-400' : 'text-slate-200'}`}>
                    {isWinner ? `${loserProgress}%` : '100%'}
                  </span>
                </div>

                {duration != null && (
                  <div className="pt-2 border-t border-slate-700/50">
                    <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Winner's time</p>
                    <p className="text-3xl font-mono font-bold text-white">
                      {formatDuration(duration)}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={() => navigate('/')}
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl py-3.5 transition-colors"
        >
          Play Again
        </button>

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
                  <span className="text-slate-400 flex-1 truncate">vs {r.opponentNickname}</span>
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

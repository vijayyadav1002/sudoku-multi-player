import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from '../lib/sudokuHelpers';

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function Leaderboard() {
  const navigate = useNavigate();
  const [wins, setWins] = useState([]);
  const [times, setTimes] = useState([]);
  const [activeTab, setActiveTab] = useState('wins');
  const [activeDifficulty, setActiveDifficulty] = useState('medium');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/games/leaderboard`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setWins(data.wins ?? []);
        setTimes(data.times ?? []);
      })
      .catch(() => setError('Failed to load leaderboard.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredTimes = times.filter(r => r.difficulty === activeDifficulty);

  return (
    <div className="min-h-full bg-slate-900 text-white flex flex-col">
      <div className="flex flex-col w-full max-w-lg mx-auto p-4 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-slate-200">Leaderboard</h1>
          <div className="w-12" />
        </div>

        {/* Tab toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('wins')}
            className={`py-2.5 rounded-xl font-medium text-sm transition-colors ${
              activeTab === 'wins'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Most Wins
          </button>
          <button
            onClick={() => setActiveTab('times')}
            className={`py-2.5 rounded-xl font-medium text-sm transition-colors ${
              activeTab === 'times'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Best Times
          </button>
        </div>

        {loading && (
          <p className="text-slate-500 text-sm text-center py-8">Loading…</p>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center py-8">{error}</p>
        )}

        {!loading && !error && activeTab === 'wins' && (
          <div className="bg-slate-800 rounded-2xl p-4">
            {wins.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No battles yet.</p>
            ) : (
              <div className="space-y-1">
                {wins.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm px-1 py-2.5 border-b border-slate-700/50 last:border-0">
                    <span className={`font-bold w-6 text-center flex-shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                      #{i + 1}
                    </span>
                    <span className="text-slate-200 flex-1 truncate">{r.nickname}</span>
                    <span className="font-bold text-white tabular-nums">{r.wins}</span>
                    <span className="text-slate-500 text-xs">wins</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === 'times' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  onClick={() => setActiveDifficulty(d)}
                  className={`py-2 rounded-xl font-medium capitalize text-sm transition-colors ${
                    activeDifficulty === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="bg-slate-800 rounded-2xl p-4">
              {filteredTimes.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No solo games on {activeDifficulty} yet.</p>
              ) : (
                <div className="space-y-1">
                  {filteredTimes.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm px-1 py-2.5 border-b border-slate-700/50 last:border-0">
                      <span className={`font-bold w-6 text-center flex-shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                        #{i + 1}
                      </span>
                      <span className="text-slate-200 flex-1 truncate">{r.nickname}</span>
                      <span className="font-mono font-bold text-white">{formatDuration(r.best_time)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

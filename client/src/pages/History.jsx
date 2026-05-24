import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from '../lib/sudokuHelpers';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

function readLocalHistory(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [soloHistory, setSoloHistory] = useState(() => readLocalHistory('sudoku-solo-history'));
  const [battleHistory, setBattleHistory] = useState(() => readLocalHistory('sudoku-battle-history'));
  const [activeTab, setActiveTab] = useState(() =>
    soloHistory.length > 0 ? 'solo' : 'battles'
  );
  const [dbLoading, setDbLoading] = useState(false);

  useEffect(() => {
    if (!user || !supabase) return;
    setDbLoading(true);

    supabase
      .from('game_players')
      .select(`outcome, rank, progress, duration_seconds, games(mode, difficulty, winner_nickname, player_count, total_duration_seconds, played_at)`)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data) return;

        const solo = data
          .filter(r => r.games?.mode === 'solo')
          .map(r => ({
            difficulty: r.games.difficulty,
            time: r.duration_seconds,
            date: r.games.played_at,
          }));

        const battles = data
          .filter(r => r.games?.mode === 'battle')
          .map(r => ({
            outcome: r.outcome,
            winnerNickname: r.games.winner_nickname ?? '',
            difficulty: r.games.difficulty,
            duration: r.games.total_duration_seconds,
            playerCount: r.games.player_count,
            myRank: r.rank,
            myProgress: r.progress,
            date: r.games.played_at,
          }));

        if (solo.length > 0) setSoloHistory(solo);
        if (battles.length > 0) setBattleHistory(battles);
      })
      .finally(() => setDbLoading(false));
  }, [user]);

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
          <h1 className="text-lg font-bold text-slate-200">
          Play History{dbLoading && <span className="text-slate-500 text-sm font-normal ml-2">syncing…</span>}
        </h1>
          <div className="w-12" />
        </div>

        {/* Tab toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('solo')}
            className={`py-2.5 rounded-xl font-medium text-sm transition-colors ${
              activeTab === 'solo'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Solo {soloHistory.length > 0 && `(${soloHistory.length})`}
          </button>
          <button
            onClick={() => setActiveTab('battles')}
            className={`py-2.5 rounded-xl font-medium text-sm transition-colors ${
              activeTab === 'battles'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Battles {battleHistory.length > 0 && `(${battleHistory.length})`}
          </button>
        </div>

        {/* Solo list */}
        {activeTab === 'solo' && (
          <div className="bg-slate-800 rounded-2xl p-4">
            {soloHistory.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No solo games yet.</p>
            ) : (
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {soloHistory.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm px-1 py-2 border-b border-slate-700/50 last:border-0">
                    <span className="text-slate-500 w-6">#{i + 1}</span>
                    <span className="text-slate-300 capitalize flex-1">{r.difficulty}</span>
                    <span className="font-mono text-white">{formatDuration(r.time)}</span>
                    <span className="text-slate-500 text-xs ml-3 w-14 text-right">
                      {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Battle list */}
        {activeTab === 'battles' && (
          <div className="bg-slate-800 rounded-2xl p-4">
            {battleHistory.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No battles yet.</p>
            ) : (
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {battleHistory.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm px-1 py-2 border-b border-slate-700/50 last:border-0">
                    <span className={`text-xs font-bold w-5 ${r.outcome === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                      {r.outcome === 'win' ? 'W' : 'L'}
                    </span>
                    <span className="text-slate-300 capitalize w-12">{r.difficulty}</span>
                    <span className="text-slate-400 flex-1 truncate text-xs">#{r.myRank ?? '?'}/{r.playerCount ?? '?'} · {r.winnerNickname ? `${r.winnerNickname} won` : ''}</span>
                    <span className="font-mono text-white text-xs">
                      {r.duration != null ? formatDuration(r.duration) : '—'}
                    </span>
                    <span className="text-slate-500 text-xs w-14 text-right">
                      {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

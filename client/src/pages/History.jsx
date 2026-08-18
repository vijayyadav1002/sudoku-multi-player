import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from '../lib/sudokuHelpers';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

function readLocalHistory(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark">
        <span className="on" /><span /><span className="on" />
        <span /><span className="on" /><span />
        <span className="on" /><span /><span className="on" />
      </div>
      <span>Sudoku Battle</span>
    </div>
  );
}

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [soloHistory, setSoloHistory] = useState(() => readLocalHistory('sudoku-solo-history'));
  const [battleHistory, setBattleHistory] = useState(() => readLocalHistory('sudoku-battle-history'));
  const [activeTab, setActiveTab] = useState(() => soloHistory.length > 0 ? 'solo' : 'battles');
  const [dbLoading, setDbLoading] = useState(false);

  useEffect(() => {
    if (!user || !supabase) return;
    setDbLoading(true);
    supabase
      .from('game_players')
      .select(`outcome, rank, progress, duration_seconds, games(mode, difficulty, winner_nickname, player_count, total_duration_seconds, created_at)`)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data) return;
        const solo = data.filter(r => r.games?.mode === 'solo').map(r => ({
          difficulty: r.games.difficulty, time: r.duration_seconds, date: r.games.created_at,
        }));
        const battles = data.filter(r => r.games?.mode === 'battle').map(r => ({
          outcome: r.outcome, winnerNickname: r.games.winner_nickname ?? '',
          difficulty: r.games.difficulty, duration: r.games.total_duration_seconds,
          playerCount: r.games.player_count, myRank: r.rank, myProgress: r.progress, date: r.games.created_at,
        }));
        if (solo.length > 0) setSoloHistory(solo);
        if (battles.length > 0) setBattleHistory(battles);
      })
      .finally(() => setDbLoading(false));
  }, [user]);

  return (
    <div className="screen">
      <div className="bg-orbs"><div className="orb a" /><div className="orb b" /><div className="orb c" /></div>
      <div className="bg-grid" />

      <div className="topbar">
        <Logo />
        <div className="topbar-actions">
          {dbLoading && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Syncing…</span>}
          <button className="btn-ghost" style={{ padding: '8px 14px' }} onClick={() => navigate('/')}>← Back</button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '20px 28px 60px', display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
          Play History
        </h1>

        {/* Tabs */}
        <div className="lb-tabgroup" style={{ alignSelf: 'flex-start' }}>
          <button className={`lb-tab${activeTab === 'solo' ? ' active' : ''}`} onClick={() => setActiveTab('solo')}>
            Solo {soloHistory.length > 0 && `(${soloHistory.length})`}
          </button>
          <button className={`lb-tab${activeTab === 'battles' ? ' active' : ''}`} onClick={() => setActiveTab('battles')}>
            Battles {battleHistory.length > 0 && `(${battleHistory.length})`}
          </button>
        </div>

        {/* Solo list */}
        {activeTab === 'solo' && (
          <div className="card lb-table">
            {soloHistory.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No solo games yet.</p>
            ) : (
              <>
                <div className="lb-row lb-row-head solo">
                  <span>#</span>
                  <span>Difficulty</span>
                  <span>Time</span>
                  <span>Date</span>
                  <span></span>
                  <span></span>
                </div>
                {soloHistory.map((r, i) => (
                  <div key={i} className="lb-row solo">
                    <span className="lb-rank">#{i + 1}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 600, textTransform: 'capitalize' }}>{r.difficulty}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{formatDuration(r.time)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                      {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span /><span />
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Battle list */}
        {activeTab === 'battles' && (
          <div className="card lb-table">
            {battleHistory.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No battles yet.</p>
            ) : (
              <>
                <div className="lb-row lb-row-head" style={{ gridTemplateColumns: '40px 60px 1fr 80px 80px 80px 80px' }}>
                  <span>#</span>
                  <span>Result</span>
                  <span>Winner</span>
                  <span>Diff</span>
                  <span>Rank</span>
                  <span>Time</span>
                  <span>Date</span>
                </div>
                {battleHistory.map((r, i) => (
                  <div key={i} className="lb-row" style={{ gridTemplateColumns: '40px 60px 1fr 80px 80px 80px 80px' }}>
                    <span className="lb-rank">#{i + 1}</span>
                    <span style={{
                      fontWeight: 700, fontSize: 12,
                      color: r.outcome === 'win' ? 'oklch(0.78 0.18 150)' : 'oklch(0.7 0.22 25)',
                    }}>
                      {r.outcome === 'win' ? 'WIN' : 'LOSS'}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.winnerNickname || '—'}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'capitalize' }}>{r.difficulty}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-dim)' }}>
                      #{r.myRank ?? '?'}/{r.playerCount ?? '?'}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {r.duration != null ? formatDuration(r.duration) : '—'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

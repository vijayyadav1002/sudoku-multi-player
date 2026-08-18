import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../lib/sudokuHelpers';
import { avatarGradient, getPlayerPaletteId, initials } from '../lib/players';

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const DIFFICULTIES = ['easy', 'medium', 'hard'];

const TIERS = [
  { name: 'Diamond', dot: 'oklch(0.78 0.16 200)', bg: 'oklch(0.78 0.16 200 / 0.12)', border: 'oklch(0.78 0.16 200 / 0.3)', min: 50 },
  { name: 'Platinum', dot: 'oklch(0.75 0.1 250)', bg: 'oklch(0.75 0.1 250 / 0.12)', border: 'oklch(0.75 0.1 250 / 0.3)', min: 20 },
  { name: 'Gold', dot: 'oklch(0.82 0.16 80)', bg: 'oklch(0.82 0.16 80 / 0.12)', border: 'oklch(0.82 0.16 80 / 0.3)', min: 10 },
  { name: 'Silver', dot: 'oklch(0.75 0.02 250)', bg: 'oklch(0.75 0.02 250 / 0.12)', border: 'oklch(0.75 0.02 250 / 0.3)', min: 5 },
  { name: 'Bronze', dot: 'oklch(0.65 0.12 60)', bg: 'oklch(0.65 0.12 60 / 0.12)', border: 'oklch(0.65 0.12 60 / 0.3)', min: 0 },
];

function getTier(wins) {
  return TIERS.find(t => wins >= t.min) ?? TIERS[TIERS.length - 1];
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

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user, enabled: authEnabled } = useAuth();
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
  const displayList = activeTab === 'wins' ? wins : filteredTimes;
  const podium = displayList.slice(0, 3);
  const tableRows = displayList.slice(3);

  return (
    <div className="screen">
      <div className="bg-orbs"><div className="orb a" /><div className="orb b" /><div className="orb c" /></div>
      <div className="bg-grid" />

      <div className="topbar">
        <Logo />
        <div className="topbar-actions">
          <button className="btn-ghost" style={{ padding: '8px 14px' }} onClick={() => navigate('/')}>← Back</button>
        </div>
      </div>

      <div className="lb-wrap">
        {/* Head */}
        <div className="lb-head">
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Leaderboard</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: 15, margin: 0 }}>
              Top players across all Sudoku Battle matches
            </p>
          </div>
          {authEnabled && user && (
            <div className="lb-you-card">
              <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 8 }}>Your profile</div>
              <div className="num-big">{user.user_metadata?.full_name?.split(' ')[0] || 'Player'}</div>
              <div className="lb-you-stats">
                <div><div className="lbl">Rank</div><div className="val">—</div></div>
                <div><div className="lbl">Wins</div><div className="val">—</div></div>
                <div><div className="lbl">Games</div><div className="val">—</div></div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="lb-tabs">
          <div className="lb-tabgroup">
            <button
              className={`lb-tab${activeTab === 'wins' ? ' active' : ''}`}
              onClick={() => setActiveTab('wins')}
            >
              🏆 Most Wins
            </button>
            <button
              className={`lb-tab${activeTab === 'times' ? ' active' : ''}`}
              onClick={() => setActiveTab('times')}
            >
              ⚡ Best Times
            </button>
          </div>
          {activeTab === 'times' && (
            <div className="lb-segments">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  className={`lb-seg${activeDifficulty === d ? ' active' : ''}`}
                  onClick={() => setActiveDifficulty(d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px 0' }}>Loading…</p>
        )}
        {error && (
          <p style={{ color: 'oklch(0.7 0.22 25)', textAlign: 'center', padding: '60px 0' }}>{error}</p>
        )}

        {!loading && !error && displayList.length === 0 && (
          <div className="lb-cta">
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>No data yet</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                {activeTab === 'wins'
                  ? 'Be the first to win a battle!'
                  : `No solo ${activeDifficulty} completions recorded yet.`}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Play now →</button>
          </div>
        )}

        {!loading && !error && displayList.length > 0 && (
          <>
            {/* Podium */}
            <div className="lb-podium">
              {[podium[1], podium[0], podium[2]].map((entry, vi) => {
                if (!entry) return <div key={`empty-${vi}`} />;
                const rank = vi === 0 ? 2 : vi === 1 ? 1 : 3;
                const cls = rank === 1 ? 'first' : rank === 2 ? 'second' : 'third';
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                return (
                  <div key={entry.nickname} className={`lb-podium-spot ${cls}`}>
                    <div className="lb-medal">{medal}</div>
                    <div
                      className="opp-mini-avatar"
                      style={{ background: avatarGradient(getPlayerPaletteId(rank - 1)), width: 42, height: 42, fontSize: 16, borderRadius: 12 }}
                    >
                      {initials(entry.nickname)}
                    </div>
                    <div className="lb-podium-name">{entry.nickname}</div>
                    <div className="lb-podium-score">
                      {activeTab === 'wins' ? entry.wins : formatDuration(entry.best_time)}
                    </div>
                    <div className="lb-podium-sub">
                      {activeTab === 'wins' ? 'wins' : activeDifficulty}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table */}
            {tableRows.length > 0 && (
              <div className="card lb-table">
                <div className={`lb-row lb-row-head${activeTab === 'times' ? ' solo' : ''}`}>
                  <span>Rank</span>
                  <span>Player</span>
                  {activeTab === 'wins' ? (
                    <>
                      <span>Wins</span>
                      <span>Tier</span>
                      <span>Win rate</span>
                      <span>Games</span>
                      <span>Losses</span>
                    </>
                  ) : (
                    <>
                      <span>Best time</span>
                      <span>Difficulty</span>
                      <span></span>
                      <span></span>
                    </>
                  )}
                </div>
                {tableRows.map((entry, i) => {
                  const rank = i + 4;
                  const tier = activeTab === 'wins' ? getTier(entry.wins) : null;
                  const winRate = entry.wins && entry.games
                    ? Math.round((entry.wins / entry.games) * 100)
                    : 0;
                  return (
                    <div key={entry.nickname} className={`lb-row${activeTab === 'times' ? ' solo' : ''}`}>
                      <span className="lb-rank">#{rank}</span>
                      <div className="lb-player">
                        <div
                          className="opp-mini-avatar"
                          style={{ background: avatarGradient(getPlayerPaletteId(rank - 1)), width: 32, height: 32, fontSize: 12, borderRadius: 9 }}
                        >
                          {initials(entry.nickname)}
                        </div>
                        <div>
                          <div className="lb-pname">{entry.nickname}</div>
                        </div>
                      </div>
                      {activeTab === 'wins' ? (
                        <>
                          <span className="lb-num lb-elo">{entry.wins}</span>
                          <span className="lb-num">
                            {tier && (
                              <span className="lb-tier" style={{ background: tier.bg, borderColor: tier.border, color: 'var(--text)' }}>
                                <span className="lb-tier-dot" style={{ background: tier.dot }} />
                                {tier.name}
                              </span>
                            )}
                          </span>
                          <span className="lb-num">
                            {winRate}%
                            <div className="lb-winbar">
                              <i style={{ width: `${winRate}%`, background: 'var(--p1)' }} />
                            </div>
                          </span>
                          <span className="lb-num">{entry.games ?? '—'}</span>
                          <span className="lb-num">{entry.losses ?? '—'}</span>
                        </>
                      ) : (
                        <>
                          <span className="lb-num" style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                            {formatDuration(entry.best_time)}
                          </span>
                          <span className="lb-num" style={{ textTransform: 'capitalize' }}>{entry.difficulty}</span>
                          <span className="lb-num" />
                          <span className="lb-num" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="lb-cta">
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Ready to climb the ranks?</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>
              Join a battle and compete with players worldwide
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Play now →</button>
        </div>
      </div>
    </div>
  );
}

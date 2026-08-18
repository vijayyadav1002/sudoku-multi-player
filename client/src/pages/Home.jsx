import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { PLAYER_PALETTE, avatarGradient } from '../lib/players';
import { formatDuration } from '../lib/sudokuHelpers';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

function fmtCount(n) {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtTime(seconds) {
  if (seconds == null) return '—';
  return formatDuration(seconds);
}

const DIFFICULTIES = ['easy', 'medium', 'hard'];

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

export default function Home() {
  const socket = useSocket();
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle, signOut, enabled: authEnabled } = useAuth();

  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState(() => localStorage.getItem('sb-avatar') || 'p1');
  const [roomCode, setRoomCode] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [mode, setMode] = useState(null); // null | 'create' | 'join' | 'solo'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [diffFilter, setDiffFilter] = useState('All');
  const [isPublic, setIsPublic] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(null);
  const [matchesToday, setMatchesToday] = useState(null);
  const [avgSolveTime, setAvgSolveTime] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) { setRoomCode(joinCode.toUpperCase()); setMode('join'); }
  }, []);

  useEffect(() => {
    if (user && !nickname) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
      if (name) setNickname(name.split(' ')[0].slice(0, 20));
    }
  }, [user]);

  useEffect(() => {
    socket.emit('join-lobby');
    function handleRoomsUpdated({ rooms }) {
      setPublicRooms(rooms);
      setRoomsLoading(false);
    }
    socket.on('public-rooms-updated', handleRoomsUpdated);
    socket.on('online-count', setOnlineCount);
    return () => {
      socket.emit('leave-lobby');
      socket.off('public-rooms-updated', handleRoomsUpdated);
      socket.off('online-count', setOnlineCount);
    };
  }, [socket]);

  useEffect(() => {
    fetch(`${SOCKET_URL}/api/games/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setMatchesToday(data.matchesToday);
        setAvgSolveTime(data.avgSolveTime);
      })
      .catch(() => {});
  }, []);

  function saveAvatar(id) {
    setAvatarId(id);
    localStorage.setItem('sb-avatar', id);
  }

  function handleCreate() {
    if (!nickname.trim()) return setError('Enter a nickname first');
    if (!socket.connected) return setError('Not connected — please refresh.');
    setLoading(true); setError('');
    const timeout = setTimeout(() => { setLoading(false); setError('Server not responding.'); }, 10_000);
    socket.emit('create-room', { nickname: nickname.trim(), difficulty, isPublic }, (res) => {
      clearTimeout(timeout); setLoading(false);
      if (!res.ok) return setError(res.error || 'Failed to create room');
      navigate(`/room/${res.roomId}`, { state: { puzzle: res.puzzle, solution: res.solution, difficulty: res.difficulty, nickname: nickname.trim(), isHost: true, isPublic: res.isPublic, players: res.players, avatarId } });
    });
  }

  function handleJoinPublicRoom(roomId) {
    if (!nickname.trim()) return setError('Enter a nickname first');
    if (!socket.connected) return setError('Not connected — please refresh.');
    setLoading(true); setError('');
    const timeout = setTimeout(() => { setLoading(false); setError('Server not responding.'); }, 10_000);
    socket.emit('join-room', { roomId, nickname: nickname.trim() }, (res) => {
      clearTimeout(timeout); setLoading(false);
      if (!res.ok) return setError(res.error || 'Room no longer available');
      navigate(`/room/${res.roomId}`, { state: { puzzle: res.puzzle, solution: res.solution, difficulty: res.difficulty, nickname: nickname.trim(), isHost: false, players: res.players, avatarId } });
    });
  }

  function handleJoin(code) {
    const joinCode = (code || roomCode).trim().toUpperCase();
    if (!nickname.trim()) return setError('Enter a nickname first');
    if (!joinCode) return setError('Enter a room code');
    if (!socket.connected) return setError('Not connected — please refresh.');
    setLoading(true); setError('');
    const timeout = setTimeout(() => { setLoading(false); setError('Server not responding.'); }, 10_000);
    socket.emit('join-room', { roomId: joinCode, nickname: nickname.trim() }, (res) => {
      clearTimeout(timeout); setLoading(false);
      if (!res.ok) return setError(res.error || 'Failed to join room');
      navigate(`/room/${res.roomId}`, { state: { puzzle: res.puzzle, solution: res.solution, difficulty: res.difficulty, nickname: nickname.trim(), isHost: false, players: res.players, avatarId } });
    });
  }

  const filteredRooms = diffFilter === 'All'
    ? publicRooms
    : publicRooms.filter(r => r.difficulty === diffFilter.toLowerCase());

  return (
    <div className="screen">
      <div className="bg-orbs">
        <div className="orb a" /><div className="orb b" /><div className="orb c" />
      </div>
      <div className="bg-grid" />

      {/* Topbar */}
      <div className="topbar">
        <Logo />
        <div className="topbar-actions">
          <div className="pill"><span className="dot-live" /> {fmtCount(onlineCount)} online</div>
          <button className="btn-ghost" style={{ padding: '8px 14px' }} onClick={() => navigate('/leaderboard')}>
            🏆 Leaderboard
          </button>
          <button className="btn-ghost" style={{ padding: '8px 14px' }} onClick={() => navigate('/history')}>
            History
          </button>
          {authEnabled && (
            user ? (
              <div className="pill" style={{ paddingLeft: 6, gap: 8, cursor: 'pointer' }} onClick={signOut}>
                <div className="opp-mini-avatar" style={{ background: avatarGradient(avatarId), width: 22, height: 22, fontSize: 10, borderRadius: 6 }}>
                  {(user.user_metadata?.full_name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 13 }}>{user.user_metadata?.full_name?.split(' ')[0] || 'You'}</span>
              </div>
            ) : (
              <button className="btn-ghost" style={{ padding: '8px 14px' }} onClick={signInWithGoogle} disabled={authLoading}>
                Sign in
              </button>
            )
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="home-main">
        <div className="home-hero">
          <div className="eyebrow">
            <span className="dot-live" /> New: 10-player rooms · host can start anytime
          </div>
          <h1 className="hero-title">
            Race friends to <span className="gradient">cracking the grid</span>.
          </h1>
          <p className="hero-sub">
            Up to ten players, same puzzle, live progress. First to finish wins.
          </p>
          <div className="hero-stats">
            <div className="hero-stat"><div className="num">{fmtCount(onlineCount)}</div><div className="lbl">online now</div></div>
            <div className="hero-stat"><div className="num">{fmtCount(matchesToday)}</div><div className="lbl">matches today</div></div>
            <div className="hero-stat"><div className="num">{fmtTime(avgSolveTime)}</div><div className="lbl">avg solve</div></div>
          </div>
        </div>

        {/* CTA card */}
        <div className="home-cta">
          <div className="cta-card card">
            {/* Nickname */}
            <div className="field">
              <label className="field-label">Your nickname</label>
              <input
                className="text-input"
                placeholder="e.g. SudokuMaster99"
                value={nickname}
                maxLength={20}
                autoFocus
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && mode === 'join') handleJoin(); if (e.key === 'Enter' && mode === 'create') handleCreate(); }}
              />
            </div>

            {/* Color picker */}
            <div className="field">
              <label className="field-label">Pick a color</label>
              <div className="avatar-picker">
                {PLAYER_PALETTE.slice(0, 6).map(p => (
                  <div
                    key={p.id}
                    className={`avatar-opt${avatarId === p.id ? ' selected' : ''}`}
                    style={{ background: avatarGradient(p.id) }}
                    onClick={() => saveAvatar(p.id)}
                  >
                    {(nickname || 'U').slice(0,1).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {error && <p style={{ color: 'oklch(0.7 0.22 25)', fontSize: 13, margin: '0 0 4px' }}>{error}</p>}

            {/* Mode: default */}
            {mode === null && (
              <div className="space-y-2">
                <div className="action-row">
                  <button className="btn btn-primary" onClick={() => { setError(''); setMode('create'); }}>Create room</button>
                  <button className="btn btn-secondary" onClick={() => { setError(''); setMode('join'); }}>Join with code</button>
                </div>
                <button className="btn-ghost" style={{ padding: '10px 14px', fontSize: 13, justifyContent: 'center', display: 'flex', width: '100%' }} onClick={() => { setError(''); setMode('solo'); }}>
                  Play solo →
                </button>
              </div>
            )}

            {/* Create */}
            {mode === 'create' && (
              <div>
                <div className="field">
                  <label className="field-label">Difficulty</label>
                  <div className="diff-row">
                    {[{ id: 'easy', sub: '~3 min' }, { id: 'medium', sub: '~5 min' }, { id: 'hard', sub: '~9 min' }].map(d => (
                      <div key={d.id} className={`diff-opt${difficulty === d.id ? ' active' : ''}`} onClick={() => setDifficulty(d.id)}>
                        {d.id.charAt(0).toUpperCase() + d.id.slice(1)}<small>{d.sub}</small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Visibility</label>
                  <div className="diff-row">
                    <div className={`diff-opt${!isPublic ? ' active' : ''}`} onClick={() => setIsPublic(false)}>
                      🔒 Private<small>invite only</small>
                    </div>
                    <div className={`diff-opt${isPublic ? ' active' : ''}`} onClick={() => setIsPublic(true)}>
                      🌐 Public<small>open lobby</small>
                    </div>
                  </div>
                </div>
                <div className="action-row">
                  <button className="btn btn-secondary" onClick={() => { setError(''); setMode(null); }}>Back</button>
                  <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>{loading ? 'Creating…' : 'Create room'}</button>
                </div>
              </div>
            )}

            {/* Join */}
            {mode === 'join' && (
              <div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label className="field-label">Room code</label>
                  <input
                    className="text-input"
                    placeholder="XXXXXX"
                    value={roomCode}
                    maxLength={6}
                    onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center', fontSize: 22 }}
                  />
                </div>
                <div className="action-row">
                  <button className="btn btn-secondary" onClick={() => { setError(''); setMode(null); }}>Back</button>
                  <button className="btn btn-primary" onClick={() => handleJoin()} disabled={loading}>{loading ? 'Joining…' : 'Join room'}</button>
                </div>
              </div>
            )}

            {/* Solo */}
            {mode === 'solo' && (
              <div>
                <div className="field">
                  <label className="field-label">Difficulty</label>
                  <div className="diff-row">
                    {[{ id: 'easy', sub: '~3 min' }, { id: 'medium', sub: '~5 min' }, { id: 'hard', sub: '~9 min' }].map(d => (
                      <div key={d.id} className={`diff-opt${difficulty === d.id ? ' active' : ''}`} onClick={() => setDifficulty(d.id)}>
                        {d.id.charAt(0).toUpperCase() + d.id.slice(1)}<small>{d.sub}</small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="action-row">
                  <button className="btn btn-secondary" onClick={() => { setError(''); setMode(null); }}>Back</button>
                  <button className="btn btn-primary" onClick={() => navigate('/solo', { state: { difficulty, nickname: nickname.trim(), avatarId } })}>Start solo</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Public room browser */}
      <section className="rooms-browser">
        <div className="rooms-head">
          <div>
            <h2 className="rooms-title">
              <span>🌐</span> Public rooms · live <span className="dot-live" style={{ marginLeft: 8 }} />
            </h2>
            <div className="rooms-sub">Jump into any open match. Private rooms need an invite code.</div>
          </div>
          <div className="rooms-filter">
            {['All', 'Easy', 'Medium', 'Hard'].map(d => (
              <button key={d} className={`lb-seg${diffFilter === d ? ' active' : ''}`} onClick={() => setDiffFilter(d)}>{d}</button>
            ))}
          </div>
        </div>
        <div className="rooms-grid">
          {roomsLoading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 14 }}>
              Loading rooms…
            </div>
          ) : filteredRooms.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 14 }}>
              No public rooms right now — create one above!
            </div>
          ) : (
            filteredRooms.map(r => {
              const full = r.playerCount >= r.maxPlayers;
              const diffLabel = r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1);
              return (
                <div key={r.id} className={`room-tile card${full ? ' full' : ''}`} onClick={() => !full && handleJoinPublicRoom(r.id)}>
                  <div className="room-tile-head">
                    <span className="vis-chip vis-chip-public">🌐 Public</span>
                    <span className="qroom-code" style={{ marginLeft: 'auto', color: 'var(--text-faint)' }}>{r.id}</span>
                  </div>
                  <div className="room-tile-host">
                    <div className="opp-mini-avatar" style={{ background: avatarGradient('p1') }}>{r.hostNickname.slice(0,2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.hostNickname}'s room</div>
                      <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{diffLabel}</div>
                    </div>
                  </div>
                  <div className="room-tile-foot">
                    <div className="stack">
                      {Array.from({ length: r.playerCount }).map((_, i) => (
                        <div key={`p-${i}`} style={{ background: avatarGradient(`p${(i % 6) + 1}`) }}>{i + 1}</div>
                      ))}
                      {Array.from({ length: r.maxPlayers - r.playerCount }).map((_, i) => (
                        <div key={`e-${i}`} className="stack-empty">+</div>
                      ))}
                    </div>
                    <div className="room-tile-info">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.playerCount}<span style={{ color: 'var(--text-faint)' }}>/{r.maxPlayers}</span></div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
                        waiting
                      </div>
                    </div>
                  </div>
                  {full && <div className="room-tile-full">Room full</div>}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

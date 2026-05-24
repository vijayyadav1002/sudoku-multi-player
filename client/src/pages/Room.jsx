import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { avatarGradient, getPlayerPaletteId, initials } from '../lib/players';

const MAX_PLAYERS = 10;

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

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const state = location.state;

  const [players, setPlayers] = useState(state?.players ?? []);
  const [canStart, setCanStart] = useState((state?.players?.length ?? 0) >= 2);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [difficulty, setDifficulty] = useState(state?.difficulty || 'medium');
  const isPublic = state?.isPublic ?? false;

  useEffect(() => {
    if (!state?.nickname) { navigate('/'); return; }

    function handlePlayerJoined({ players: updated, canStart: cs }) {
      setPlayers(updated); setCanStart(cs);
    }
    function handlePlayerLeft({ remainingPlayers, canStart: cs }) {
      setPlayers(remainingPlayers);
      setCanStart(cs ?? remainingPlayers.length >= 2);
    }
    function handleGameStarted(data) {
      navigate(`/game/${roomId}`, { state: { puzzle: data.puzzle, solution: data.solution, difficulty: data.difficulty, nickname: state.nickname, players: data.players, isHost: state.isHost, mySocketId: socket.id, avatarId: state.avatarId } });
    }
    function handleRoomClosed() { navigate('/'); }

    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('game-started', handleGameStarted);
    socket.on('room-closed', handleRoomClosed);
    return () => {
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('game-started', handleGameStarted);
      socket.off('room-closed', handleRoomClosed);
    };
  }, [socket, roomId, navigate, state]);

  function handleStart() {
    setStarting(true); setError('');
    socket.emit('start-game', { roomId }, (res) => {
      if (!res.ok) { setStarting(false); setError(res.error || 'Failed to start game'); }
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(roomId).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); });
  }
  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/?join=${roomId}`).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); });
  }
  function leave() { socket.emit('leave-game', { roomId }); navigate('/'); }

  if (!state?.nickname) return null;

  return (
    <div className="screen">
      <div className="bg-orbs"><div className="orb a" /><div className="orb b" /><div className="orb c" /></div>
      <div className="bg-grid" />

      <div className="topbar">
        <Logo />
        <div className="topbar-actions">
          <button className="btn-ghost" style={{ padding: '8px 14px' }} onClick={leave}>← Leave room</button>
        </div>
      </div>

      <div className="lobby">
        <div className="lobby-head">
          <div>
            <h1>Waiting room <span className={`vis-chip ${isPublic ? 'vis-chip-public' : 'vis-chip-private'}`} style={{ marginLeft: 14, verticalAlign: 'middle', fontSize: 12 }}>{isPublic ? '🌐 Public' : '🔒 Private'}</span></h1>
            <div className="sub">{isPublic ? 'This room is visible in the public lobby — anyone can join.' : 'Share the code below — only people with the invite can join.'}</div>
          </div>
          <div className="room-code-pill">
            <div>
              <div className="label">Room code</div>
              <div className="code">{roomId}</div>
            </div>
            <button className="icon-btn" title="Copy code" onClick={copyCode}>{codeCopied ? '✓' : '⧉'}</button>
            <button className="icon-btn" title="Copy link" onClick={copyLink}>{linkCopied ? '✓' : '↗'}</button>
          </div>
        </div>

        <div className="lobby-grid">
          {/* Players card */}
          <div className="players-card card">
            <div className="players-head">
              <h3>Players</h3>
              <span className="players-count">{players.length} / {MAX_PLAYERS}</span>
            </div>
            <div className="players-list">
              {players.map((p, i) => {
                const pid = getPlayerPaletteId(i);
                const isMe = p.socketId === socket.id;
                return (
                  <div className="player-slot" key={p.socketId} style={{ '--accent-c': `var(--p${(i % 6) + 1})` }}>
                    <div className="avatar" style={{ background: isMe && state.avatarId ? avatarGradient(state.avatarId) : avatarGradient(pid) }}>
                      {initials(p.nickname)}
                    </div>
                    <div className="p-info">
                      <div className="p-name">
                        {p.nickname}
                        {isMe && <span className="p-tag">You</span>}
                        {p.isHost && <span className="p-tag" style={{ background: 'oklch(0.82 0.16 80 / 0.2)', color: 'oklch(0.82 0.16 80)' }}>Host</span>}
                      </div>
                      <div className="p-meta">Joined</div>
                    </div>
                  </div>
                );
              })}
              {Array.from({ length: MAX_PLAYERS - players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="player-slot empty">+ Open slot</div>
              ))}
            </div>
          </div>

          {/* Settings card */}
          <div className="settings-card card">
            {state.isHost && (
              <div>
                <h3 style={{ marginBottom: 12 }}>Difficulty</h3>
                <div className="diff-row">
                  {[{ id: 'easy', sub: '~3 min' }, { id: 'medium', sub: '~5 min' }, { id: 'hard', sub: '~9 min' }].map(d => (
                    <div key={d.id} className={`diff-opt${difficulty === d.id ? ' active' : ''}`} onClick={() => setDifficulty(d.id)}>
                      {d.id.charAt(0).toUpperCase() + d.id.slice(1)}<small>{d.sub}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p style={{ color: 'oklch(0.7 0.22 25)', fontSize: 13 }}>{error}</p>}

            <div className="start-row">
              <button className="btn btn-secondary" onClick={leave}>Leave</button>
              {state.isHost ? (
                <button
                  className="btn btn-primary"
                  onClick={handleStart}
                  disabled={!canStart || starting}
                  style={!canStart || starting ? { opacity: 0.5 } : undefined}
                >
                  {starting ? 'Starting…' : canStart ? `Start · ${players.length} player${players.length === 1 ? '' : 's'}` : 'Waiting for players…'}
                </button>
              ) : (
                <div className="pill">
                  <span className="dot-live" /> Waiting for host to start…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

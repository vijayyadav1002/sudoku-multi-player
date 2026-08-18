import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import SudokuBoard from '../components/SudokuBoard';
import NumberPad from '../components/NumberPad';
import Timer from '../components/Timer';
import { calcClientProgress, isCellGiven, toMilestone } from '../lib/sudokuHelpers';
import { avatarGradient, getPlayerPaletteId, initials } from '../lib/players';

const EMOTES = ['🔥', '💀', '😤', '🎉', '🤯', '👀'];

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

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const state = location.state;

  const mySocketId = state?.mySocketId ?? socket.id;

  const [board, setBoard] = useState(() =>
    state?.puzzle ? [...state.puzzle] : []
  );
  const [selectedCell, setSelectedCell] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [notesMode, setNotesMode] = useState(false);
  const [activePlayers, setActivePlayers] = useState(state?.players ?? []);
  const [playersProgress, setPlayersProgress] = useState(() => {
    const map = new Map();
    (state?.players ?? []).forEach(p => map.set(p.socketId, 0));
    return map;
  });
  const [gameOver, setGameOver] = useState(false);
  const [feedItems, setFeedItems] = useState([]);
  const [opponentEmotes, setOpponentEmotes] = useState({});
  const activePlayersRef = useRef(activePlayers);
  const disconnectTimer = useRef(null);

  useEffect(() => { activePlayersRef.current = activePlayers; }, [activePlayers]);

  useEffect(() => {
    if (!state?.puzzle) { navigate('/'); return; }

    function handlePlayersProgress({ updates }) {
      setPlayersProgress(prev => {
        const next = new Map(prev);
        updates.forEach(({ socketId, progress }) => next.set(socketId, toMilestone(progress)));
        return next;
      });
    }

    function handlePlayerLeft({ socketId, nickname, remainingPlayers }) {
      setActivePlayers(remainingPlayers);
      setPlayersProgress(prev => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      addFeedItem(null, `${nickname} left the game`, '👋');
    }

    function handleGameOver(data) {
      setGameOver(true);
      navigate(`/result/${roomId}`, { state: { ...state, ...data } });
    }

    function handleEmote({ socketId, emote }) {
      const player = activePlayersRef.current.find(p => p.socketId === socketId);
      setOpponentEmotes(prev => ({ ...prev, [socketId]: { emote, key: Date.now() } }));
      if (player) addFeedItem(socketId, `${player.nickname} reacted ${emote}`, emote);
    }

    socket.on('players-progress', handlePlayersProgress);
    socket.on('player-left', handlePlayerLeft);
    socket.on('game-over', handleGameOver);
    socket.on('emote', handleEmote);

    return () => {
      socket.off('players-progress', handlePlayersProgress);
      socket.off('player-left', handlePlayerLeft);
      socket.off('game-over', handleGameOver);
      socket.off('emote', handleEmote);
      clearTimeout(disconnectTimer.current);
    };
  }, [socket, navigate, roomId, state]);

  function addFeedItem(socketId, text, icon) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setFeedItems(prev => [{ socketId, text, icon, time, id: Date.now() + Math.random() }, ...prev].slice(0, 20));
  }

  function handleQuit() {
    socket.emit('leave-game', { roomId });
    navigate('/');
  }

  const handleCellChange = useCallback((index, value) => {
    if (gameOver || !state?.puzzle) return;
    if (isCellGiven(state.puzzle, index)) return;
    const previousValue = board[index];
    if (previousValue === value) return;

    const next = [...board];
    next[index] = value;
    const progress = toMilestone(calcClientProgress(next, state.puzzle, state.solution));
    setUndoStack(prev => [{ index, previousValue }, ...prev].slice(0, 100));
    setBoard(next);
    setPlayersProgress(pm => new Map(pm).set(mySocketId, progress));
    socket.emit('cell-update', { roomId, index, value });
  }, [board, socket, roomId, state, gameOver, mySocketId]);

  const handleUndo = useCallback(() => {
    if (gameOver || !state?.puzzle || undoStack.length === 0) return;
    const [last, ...rest] = undoStack;
    const next = [...board];
    next[last.index] = last.previousValue;
    const progress = toMilestone(calcClientProgress(next, state.puzzle, state.solution));
    setUndoStack(rest);
    setBoard(next);
    setSelectedCell(last.index);
    setPlayersProgress(pm => new Map(pm).set(mySocketId, progress));
    socket.emit('cell-update', { roomId, index: last.index, value: last.previousValue });
  }, [board, gameOver, mySocketId, roomId, socket, state, undoStack]);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  function handleNumberPad(num) {
    if (selectedCell === null) return;
    if (isCellGiven(state.puzzle, selectedCell)) return;
    handleCellChange(selectedCell, num);
  }

  function handleClear() {
    if (selectedCell === null) return;
    handleCellChange(selectedCell, 0);
  }

  function sendEmote(emote) {
    socket.emit('emote', { roomId, emote });
    addFeedItem(mySocketId, `You reacted ${emote}`, emote);
  }

  if (!state?.puzzle) return null;

  const sortedPlayers = [
    ...activePlayers.filter(p => p.socketId === mySocketId),
    ...activePlayers.filter(p => p.socketId !== mySocketId),
  ];

  const miniLeaderboard = [...activePlayers].sort((a, b) =>
    (playersProgress.get(b.socketId) ?? 0) - (playersProgress.get(a.socketId) ?? 0)
  );

  const leadingId = miniLeaderboard[0]?.socketId;

  return (
    <div className="screen">
      <div className="bg-orbs"><div className="orb a" /><div className="orb b" /><div className="orb c" /></div>
      <div className="bg-grid" />

      <div className="game">
        {/* Topbar */}
        <div className="game-topbar">
          <div className="left">
            <Logo />
            <span className="diff-chip">{state.difficulty}</span>
            <span className="room-tag">{roomId}</span>
          </div>
          <div className="center">
            <Timer running={!gameOver} />
          </div>
          <div className="right">
            {!gameOver && (
              <button className="btn-ghost" style={{ padding: '8px 14px' }} onClick={handleQuit}>
                ← Quit
              </button>
            )}
          </div>
        </div>

        {/* Left rail: players */}
        <div className="rail">
          <div className="rail-head">
            <span className="ttl">Players</span>
            <span className="ct">{activePlayers.length} active</span>
          </div>
          {sortedPlayers.map((player) => {
            const isMe = player.socketId === mySocketId;
            const idx = activePlayers.findIndex(p => p.socketId === player.socketId);
            const pid = isMe && state.avatarId ? state.avatarId : getPlayerPaletteId(idx);
            const progress = playersProgress.get(player.socketId) ?? 0;
            const isLeading = player.socketId === leadingId && activePlayers.length > 1;
            const emoteData = opponentEmotes[player.socketId];
            return (
              <div
                key={player.socketId}
                className={`opponent${isMe ? ' me' : ''}${isLeading && !isMe ? ' leading' : ''}`}
                style={{ '--accent-c': `var(--p${(idx % 6) + 1})` }}
              >
                {emoteData && (
                  <span key={emoteData.key} className="opp-emote">{emoteData.emote}</span>
                )}
                <div className="opp-head">
                  <div className="opp-mini-avatar" style={{ background: avatarGradient(pid) }}>
                    {initials(player.nickname)}
                  </div>
                  <div>
                    <div className="opp-name">
                      {player.nickname}
                      {isMe && <span className="you-tag">You</span>}
                    </div>
                    <div className="opp-status">
                      <span className={`pulse${gameOver ? ' off' : ''}`} />
                      {progress >= 100 ? 'Finished!' : 'Solving…'}
                    </div>
                  </div>
                </div>
                <div className="opp-bar">
                  <i style={{ width: `${progress}%`, background: `var(--p${(idx % 6) + 1})` }} />
                </div>
                <div className="opp-stats">
                  <span className="pct">{progress}%</span>
                  <span>{progress >= 100 ? '✓ done' : `${81 - Math.round(progress * 0.81)} left`}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: board + numpad */}
        <div className="board-wrap">
          <SudokuBoard
            board={board}
            puzzle={state.puzzle}
            solution={state.solution}
            onCellChange={handleCellChange}
            disabled={gameOver}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
          />
          <NumberPad
            onNumber={handleNumberPad}
            onClear={handleClear}
            onUndo={handleUndo}
            disabled={gameOver || selectedCell === null}
            undoDisabled={gameOver || undoStack.length === 0}
            notesMode={notesMode}
            onToggleNotes={() => setNotesMode(n => !n)}
          />
          <p style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
            ← → ↑ ↓ navigate · 1–9 fill · Backspace erase · ⌘/Ctrl-Z undo
          </p>
        </div>

        {/* Right: activity feed */}
        <div className="activity card">
          <div className="activity-head">
            <span>Live</span>
            <span style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>
              {activePlayers.length} players
            </span>
          </div>

          {/* Mini leaderboard */}
          <div className="leader-mini">
            <div className="ttl">Standings</div>
            {miniLeaderboard.map((p, i) => {
              const idx = activePlayers.findIndex(ap => ap.socketId === p.socketId);
              const pid = p.socketId === mySocketId && state.avatarId ? state.avatarId : getPlayerPaletteId(idx);
              return (
                <div className="leader-row" key={p.socketId}>
                  <span className="pos">{i + 1}</span>
                  <div
                    className="opp-mini-avatar"
                    style={{ background: avatarGradient(pid), width: 20, height: 20, fontSize: 9, borderRadius: 5 }}
                  >
                    {initials(p.nickname)}
                  </div>
                  <span className="nm">{p.socketId === mySocketId ? 'You' : p.nickname}</span>
                  <span className="pct">{playersProgress.get(p.socketId) ?? 0}%</span>
                </div>
              );
            })}
          </div>

          {/* Feed */}
          <div className="activity-feed">
            {feedItems.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>
                Game events will appear here
              </div>
            ) : (
              feedItems.map(item => {
                const idx = activePlayers.findIndex(p => p.socketId === item.socketId);
                const pid = item.socketId === mySocketId && state.avatarId ? state.avatarId : getPlayerPaletteId(idx >= 0 ? idx : 0);
                return (
                  <div key={item.id} className="feed-item">
                    <div className="fi-avatar" style={{ background: avatarGradient(pid), fontSize: 12 }}>
                      {item.socketId ? initials(activePlayers.find(p => p.socketId === item.socketId)?.nickname || '?') : item.icon}
                    </div>
                    <div>
                      <div className="fi-body">{item.text}</div>
                      <div className="fi-time">{item.time}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Emotes */}
          <div className="emote-bar">
            {EMOTES.map(e => (
              <div key={e} className="emote" onClick={() => sendEmote(e)} role="button" tabIndex={0}>
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

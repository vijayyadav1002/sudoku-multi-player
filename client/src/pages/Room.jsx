import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const MAX_PLAYERS = 10;

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

  useEffect(() => {
    if (!state?.nickname) {
      navigate('/');
      return;
    }

    function handlePlayerJoined({ players: updated, canStart: cs }) {
      setPlayers(updated);
      setCanStart(cs);
    }

    function handlePlayerLeft({ remainingPlayers, canStart: cs }) {
      setPlayers(remainingPlayers);
      setCanStart(cs ?? remainingPlayers.length >= 2);
    }

    function handleGameStarted(data) {
      navigate(`/game/${roomId}`, {
        state: {
          puzzle: data.puzzle,
          solution: data.solution,
          difficulty: data.difficulty,
          nickname: state.nickname,
          players: data.players,
          isHost: state.isHost,
          mySocketId: socket.id,
        },
      });
    }

    function handleRoomClosed() {
      navigate('/');
    }

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
    setStarting(true);
    setError('');
    socket.emit('start-game', { roomId }, (res) => {
      if (!res.ok) {
        setStarting(false);
        setError(res.error || 'Failed to start game');
      }
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(roomId).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  function copyLink() {
    const url = `${window.location.origin}/?join=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  if (!state?.nickname) return null;

  return (
    <div className="min-h-full bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          {/* Room code */}
          <div className="text-center">
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Room Code</p>
            <p className="text-4xl font-bold font-mono tracking-[0.2em] text-indigo-400 select-all">
              {roomId}
            </p>
            <p className="text-slate-500 text-xs mt-1 capitalize">{state.difficulty} difficulty</p>
          </div>

          {/* Copy buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyCode}
              className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              {codeCopied ? '✓ Copied' : 'Copy Code'}
            </button>
            <button
              onClick={copyLink}
              className="py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {linkCopied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>

          {/* Player list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-xs uppercase tracking-widest">Players</p>
              <p className="text-slate-500 text-xs">{players.length}/{MAX_PLAYERS}</p>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {players.map((p) => (
                <div
                  key={p.socketId}
                  className="flex items-center gap-2.5 bg-slate-900 rounded-xl px-3 py-2"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isHost ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                  <span className="text-slate-200 text-sm truncate flex-1">{p.nickname}</span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {p.socketId === socket.id && (
                      <span className="text-xs text-slate-500">(you)</span>
                    )}
                    {p.isHost && (
                      <span className="text-xs text-indigo-400 font-medium">host</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Status / Start */}
          {state.isHost ? (
            <div className="space-y-2">
              {!canStart && (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-slate-400 text-sm">Waiting for players to join…</span>
                </div>
              )}
              <button
                onClick={handleStart}
                disabled={!canStart || starting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors"
              >
                {starting ? 'Starting…' : 'Start Game'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-slate-400 text-sm">Waiting for host to start…</span>
            </div>
          )}

          <button
            onClick={() => {
              socket.emit('leave-game', { roomId });
              navigate('/');
            }}
            className="w-full text-slate-600 hover:text-slate-400 text-sm transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

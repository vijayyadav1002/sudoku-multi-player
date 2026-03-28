import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const state = location.state;

  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!state?.puzzle) {
      navigate('/');
      return;
    }

    function handleOpponentJoined(data) {
      navigate(`/game/${roomId}`, {
        state: {
          puzzle: data.puzzle ?? state.puzzle,
          solution: data.solution ?? state.solution,
          difficulty: data.difficulty ?? state.difficulty,
          nickname: state.nickname,
          opponentNickname: data.opponentNickname,
        },
      });
    }

    socket.on('opponent-joined', handleOpponentJoined);
    return () => socket.off('opponent-joined', handleOpponentJoined);
  }, [socket, roomId, navigate, state]);

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

  if (!state?.puzzle) return null;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
          {/* Waiting indicator */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-slate-300 text-sm font-medium">Waiting for opponent…</span>
            </div>
            <p className="text-slate-500 text-xs">Share the code below with your friend</p>
          </div>

          {/* Room code display */}
          <div className="bg-slate-900 rounded-2xl py-6 px-4">
            <p className="text-slate-500 text-xs uppercase tracking-widest mb-2">Room Code</p>
            <p className="text-5xl font-bold font-mono tracking-[0.2em] text-indigo-400 select-all">
              {roomId}
            </p>
          </div>

          {/* Copy buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyCode}
              className="py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              {codeCopied ? '✓ Copied' : 'Copy Code'}
            </button>
            <button
              onClick={copyLink}
              className="py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {linkCopied ? '✓ Copied' : 'Copy Link'}
            </button>
          </div>

          {/* Game info */}
          <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
            <span>Playing as <span className="text-slate-300">{state.nickname}</span></span>
            <span>·</span>
            <span className="capitalize">{state.difficulty}</span>
          </div>

          <button
            onClick={() => {
              socket.emit('leave-game', { roomId });
              navigate('/');
            }}
            className="text-slate-600 hover:text-slate-400 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function Home() {
  const socket = useSocket();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill room code from ?join= query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setRoomCode(joinCode.toUpperCase());
      setMode('join');
    }
  }, []);

  function handleCreate() {
    if (!nickname.trim()) return setError('Enter a nickname first');
    if (!socket.connected) return setError('Not connected to server. Please refresh the page.');
    setLoading(true);
    setError('');

    const timeout = setTimeout(() => {
      setLoading(false);
      setError('Server not responding. Please try again.');
    }, 10_000);

    socket.emit('create-room', { nickname: nickname.trim(), difficulty }, (res) => {
      clearTimeout(timeout);
      setLoading(false);
      if (!res.ok) return setError(res.error || 'Failed to create room');
      navigate(`/room/${res.roomId}`, {
        state: {
          puzzle: res.puzzle,
          solution: res.solution,
          difficulty: res.difficulty,
          nickname: nickname.trim(),
        },
      });
    });
  }

  function handleJoin() {
    if (!nickname.trim()) return setError('Enter a nickname first');
    if (!roomCode.trim()) return setError('Enter a room code');
    if (!socket.connected) return setError('Not connected to server. Please refresh the page.');
    setLoading(true);
    setError('');

    const timeout = setTimeout(() => {
      setLoading(false);
      setError('Server not responding. Please try again.');
    }, 10_000);

    socket.emit('join-room', { roomId: roomCode.trim().toUpperCase(), nickname: nickname.trim() }, (res) => {
      clearTimeout(timeout);
      setLoading(false);
      if (!res.ok) return setError(res.error || 'Failed to join room');
      navigate(`/game/${res.roomId}`, {
        state: {
          puzzle: res.puzzle,
          solution: res.solution,
          difficulty: res.difficulty,
          nickname: nickname.trim(),
          opponentNickname: res.opponentNickname,
        },
      });
    });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      if (mode === 'create') handleCreate();
      else if (mode === 'join') handleJoin();
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">&#9776;</div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Sudoku Battle</h1>
          <p className="text-slate-400 mt-2 text-sm">Real-time Sudoku competition</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. SudokuMaster99"
              maxLength={20}
              autoFocus
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:outline-none focus:border-indigo-500 placeholder-slate-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Mode selection */}
          {mode === null && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => { setError(''); setMode('create'); }}
                className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl py-3 transition-colors"
              >
                Create Room
              </button>
              <button
                onClick={() => { setError(''); setMode('join'); }}
                className="bg-slate-700 hover:bg-slate-600 active:bg-slate-900 text-white font-semibold rounded-xl py-3 transition-colors border border-slate-600"
              >
                Join Room
              </button>
            </div>
          )}

          {/* Create flow */}
          {mode === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2.5 rounded-xl font-medium capitalize text-sm transition-colors ${
                        difficulty === d
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setError(''); setMode(null); }}
                  className="flex-1 bg-slate-700 text-slate-300 rounded-xl py-3 hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </div>
          )}

          {/* Join flow */}
          {mode === 'join' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:outline-none focus:border-green-500 placeholder-slate-500 uppercase tracking-[0.3em] font-mono text-center text-xl transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setError(''); setMode(null); }}
                  className="flex-1 bg-slate-700 text-slate-300 rounded-xl py-3 hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
                >
                  {loading ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Two players · Same puzzle · First to finish wins
        </p>
      </div>
    </div>
  );
}

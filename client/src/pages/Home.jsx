import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function Home() {
  const socket = useSocket();
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle, signOut, enabled: authEnabled } = useAuth();

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

  // Pre-fill nickname from Google profile
  useEffect(() => {
    if (user && !nickname) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
      if (name) setNickname(name.split(' ')[0].slice(0, 20));
    }
  }, [user]);

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
          isHost: true,
          players: res.players,
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
      navigate(`/room/${res.roomId}`, {
        state: {
          puzzle: res.puzzle,
          solution: res.solution,
          difficulty: res.difficulty,
          nickname: nickname.trim(),
          isHost: false,
          players: res.players,
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
    <div className="min-h-full bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">&#9776;</div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Sudoku Battle</h1>
          <p className="text-slate-400 mt-2 text-sm">Real-time Sudoku competition</p>
        </div>

        {/* Auth bar */}
        {authEnabled && (
          <div className="flex items-center justify-between mb-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  {user.user_metadata?.avatar_url && (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      className="w-7 h-7 rounded-full"
                    />
                  )}
                  <span className="text-slate-300 text-sm truncate max-w-[160px]">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={authLoading}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 text-sm font-medium rounded-xl px-4 py-2 w-full justify-center transition-colors shadow"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {authLoading ? 'Loading...' : 'Sign in with Google'}
              </button>
            )}
          </div>
        )}

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
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-3">
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
              <button
                onClick={() => { setError(''); setMode('solo'); }}
                className="w-full bg-slate-700 hover:bg-slate-600 active:bg-slate-900 text-slate-300 font-semibold rounded-xl py-3 transition-colors border border-slate-600"
              >
                Solo
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

          {/* Solo flow */}
          {mode === 'solo' && (
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
                  onClick={() => navigate('/solo', { state: { difficulty, nickname: nickname.trim() } })}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-3 transition-colors"
                >
                  Start
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-6 mt-2">
          <button
            onClick={() => navigate('/history')}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            History
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Leaderboard
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Up to 10 players · Same puzzle · First to finish wins
        </p>
      </div>
    </div>
  );
}

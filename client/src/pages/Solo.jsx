import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SudokuBoard from '../components/SudokuBoard';
import NumberPad from '../components/NumberPad';
import { calcClientProgress, isCellGiven, formatDuration } from '../lib/sudokuHelpers';

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function toMilestone(progress) {
  if (progress >= 100) return 100;
  if (progress >= 75) return 75;
  if (progress >= 50) return 50;
  if (progress >= 25) return 25;
  return 0;
}

export default function Solo() {
  const navigate = useNavigate();
  const location = useLocation();
  const nickname = location.state?.nickname || '';

  const [difficulty, setDifficulty] = useState(location.state?.difficulty || 'medium');
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [board, setBoard] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const elapsedRef = useRef(0);
  const [history, setHistory] = useState(() =>
    JSON.parse(localStorage.getItem('sudoku-solo-history') || '[]')
  );

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      elapsedRef.current += 1;
      setDisplayElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  async function loadPuzzle(diff) {
    setLoading(true);
    setError('');
    setCompleted(false);
    setProgress(0);
    setSelectedCell(null);
    elapsedRef.current = 0;
    setDisplayElapsed(0);
    setTimerRunning(false);
    try {
      const res = await fetch(`${API_URL}/api/rooms/puzzle?difficulty=${diff}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPuzzle(data.puzzle);
      setSolution(data.solution);
      setBoard([...data.puzzle]);
      setTimerRunning(true);
    } catch {
      setError('Failed to load puzzle. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPuzzle(difficulty);
  }, []);

  const handleCellChange = useCallback((index, value) => {
    if (completed || !puzzle) return;
    if (isCellGiven(puzzle, index)) return;
    setBoard(prev => {
      const next = [...prev];
      next[index] = value;
      const p = calcClientProgress(next, puzzle, solution);
      setProgress(toMilestone(p));
      if (p === 100) {
        setTimerRunning(false);
        const t = elapsedRef.current;
        setFinalTime(t);
        setCompleted(true);
        const record = { difficulty, time: t, date: new Date().toISOString() };
        const prev = JSON.parse(localStorage.getItem('sudoku-solo-history') || '[]');
        const updated = [record, ...prev].slice(0, 20);
        localStorage.setItem('sudoku-solo-history', JSON.stringify(updated));
        setHistory(updated);
      }
      return next;
    });
  }, [puzzle, solution, completed]);

  function handleNumberPad(num) {
    if (selectedCell === null) return;
    handleCellChange(selectedCell, num);
  }

  function handleClear() {
    if (selectedCell === null) return;
    handleCellChange(selectedCell, 0);
  }

  function handlePlayAgain() {
    loadPuzzle(difficulty);
  }

  function handleChangeDifficulty(diff) {
    setDifficulty(diff);
    loadPuzzle(diff);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading puzzle…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => loadPuzzle(difficulty)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 py-3 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-green-950 border border-green-700 rounded-2xl p-8 text-center shadow-xl">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-green-400 mb-1">
              {nickname ? `Well done, ${nickname}!` : 'Puzzle Solved!'}
            </h1>
            <p className="text-slate-400 text-sm mb-6 capitalize">{difficulty} difficulty</p>
            <div className="bg-slate-800/50 rounded-xl px-4 py-4">
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Time</p>
              <p className="text-4xl font-mono font-bold text-white">{formatDuration(finalTime)}</p>
            </div>
          </div>

          <button
            onClick={handlePlayAgain}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-3.5 transition-colors"
          >
            Play Again
          </button>

          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                onClick={() => handleChangeDifficulty(d)}
                className={`py-2.5 rounded-xl font-medium capitalize text-sm transition-colors ${
                  d === difficulty
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl py-3 transition-colors"
          >
            Home
          </button>

          {history.length > 0 && (
            <div className="bg-slate-800 rounded-2xl p-4">
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Your Records</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {history.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm px-1 py-1.5 border-b border-slate-700/50 last:border-0">
                    <span className="text-slate-500 w-6">#{i + 1}</span>
                    <span className="text-slate-300 capitalize flex-1">{r.difficulty}</span>
                    <span className="font-mono text-white">{formatDuration(r.time)}</span>
                    <span className="text-slate-500 text-xs ml-3 w-14 text-right">
                      {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex flex-col items-center gap-4 p-4 pb-6 w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← Home
          </button>
          <h1 className="text-lg font-bold text-slate-200">Solo</h1>
          <span className="font-mono text-slate-300 text-lg tabular-nums">
            {formatDuration(displayElapsed)}
          </span>
        </div>

        {/* Progress + difficulty */}
        <div className="w-full flex items-center justify-between">
          <div className="flex-1 bg-slate-700 rounded-full h-2 mr-3">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-slate-400 text-xs capitalize flex-shrink-0">{difficulty}</span>
        </div>

        {/* Board */}
        <SudokuBoard
          board={board}
          puzzle={puzzle}
          onCellChange={handleCellChange}
          disabled={completed}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
        />

        {/* Number pad */}
        <NumberPad
          onNumber={handleNumberPad}
          onClear={handleClear}
          disabled={completed || selectedCell === null}
        />
      </div>
    </div>
  );
}

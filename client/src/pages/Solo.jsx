import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SudokuBoard from '../components/SudokuBoard';
import NumberPad from '../components/NumberPad';
import { calcClientProgress, isCellGiven, formatDuration, toMilestone } from '../lib/sudokuHelpers';
import { useAuth } from '../context/AuthContext';
import { saveGame } from '../lib/api';

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
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

export default function Solo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const nickname = location.state?.nickname || '';

  const [difficulty, setDifficulty] = useState(location.state?.difficulty || 'medium');
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [board, setBoard] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [notesMode, setNotesMode] = useState(false);
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
    setLoading(true); setError(''); setCompleted(false);
    setProgress(0); setSelectedCell(null);
    setUndoStack([]);
    elapsedRef.current = 0; setDisplayElapsed(0); setTimerRunning(false);
    try {
      const res = await fetch(`${API_URL}/api/rooms/puzzle?difficulty=${diff}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPuzzle(data.puzzle); setSolution(data.solution);
      setBoard([...data.puzzle]); setTimerRunning(true);
    } catch {
      setError('Failed to load puzzle. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPuzzle(difficulty); }, []);

  const handleCellChange = useCallback((index, value) => {
    if (completed || !puzzle) return;
    if (isCellGiven(puzzle, index)) return;
    const previousValue = board[index];
    if (previousValue === value) return;

    const next = [...board];
    next[index] = value;
    setUndoStack(prev => [{ index, previousValue }, ...prev].slice(0, 100));
    setBoard(next);

    const p = calcClientProgress(next, puzzle, solution);
    setProgress(toMilestone(p));
    if (p === 100) {
      setTimerRunning(false);
      const t = elapsedRef.current;
      setFinalTime(t);
      setCompleted(true);
      const record = { difficulty, time: t, date: new Date().toISOString() };
      const prev2 = JSON.parse(localStorage.getItem('sudoku-solo-history') || '[]');
      const updated = [record, ...prev2].slice(0, 20);
      localStorage.setItem('sudoku-solo-history', JSON.stringify(updated));
      setHistory(updated);
      if (session?.access_token) {
        saveGame({
          mode: 'solo', difficulty, playerCount: 1,
          winnerNickname: nickname || 'Player', totalDuration: t,
          players: [{ isMe: true, nickname: nickname || 'Player', outcome: 'completed', rank: 1, progress: 100, duration: t }],
        }, session.access_token);
      }
    }
  }, [board, puzzle, solution, completed, difficulty, nickname, session]);

  const handleUndo = useCallback(() => {
    if (completed || undoStack.length === 0) return;
    const [last, ...rest] = undoStack;
    const next = [...board];
    next[last.index] = last.previousValue;
    setUndoStack(rest);
    setBoard(next);
    setSelectedCell(last.index);
    setProgress(toMilestone(calcClientProgress(next, puzzle, solution)));
  }, [board, completed, puzzle, solution, undoStack]);

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
    handleCellChange(selectedCell, num);
  }

  function handleClear() {
    if (selectedCell === null) return;
    handleCellChange(selectedCell, 0);
  }

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="bg-orbs"><div className="orb a" /><div className="orb b" /><div className="orb c" /></div>
        <div className="bg-grid" />
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Loading puzzle…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="bg-orbs"><div className="orb a" /><div className="orb b" /><div className="orb c" /></div>
        <div className="bg-grid" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'oklch(0.7 0.22 25)', marginBottom: 16 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => loadPuzzle(difficulty)}>Try again</button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="screen">
        <div className="bg-orbs"><div className="orb a" /><div className="orb b" /><div className="orb c" /></div>
        <div className="bg-grid" />
        <div className="modal-backdrop">
          <div className="victory-card card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52 }}>🎉</div>
            <h2 style={{ color: 'oklch(0.92 0.14 80)' }}>
              {nickname ? `Well done, ${nickname}!` : 'Puzzle Solved!'}
            </h2>
            <p className="sub" style={{ textTransform: 'capitalize' }}>{difficulty} · Solo</p>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--stroke)', borderRadius: 16, padding: '20px 32px', margin: '0 0 24px', display: 'inline-block' }}>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Your time</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', color: 'oklch(0.92 0.14 80)' }}>
                {formatDuration(finalTime)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
              <button className="btn btn-primary" onClick={() => loadPuzzle(difficulty)}>Play again →</button>
            </div>

            <div className="diff-row">
              {DIFFICULTIES.map(d => (
                <div
                  key={d}
                  className={`diff-opt${difficulty === d ? ' active' : ''}`}
                  onClick={() => { setDifficulty(d); loadPuzzle(d); }}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                  <small>{d === 'easy' ? '~3 min' : d === 'medium' ? '~5 min' : '~9 min'}</small>
                </div>
              ))}
            </div>

            {history.length > 0 && (
              <div style={{ marginTop: 20, textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                  Your records
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                  {history.slice(0, 8).map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--stroke)' }}>
                      <span style={{ color: 'var(--text-faint)', width: 20, textAlign: 'center' }}>#{i + 1}</span>
                      <span style={{ color: 'var(--text-dim)', textTransform: 'capitalize', flex: 1 }}>{r.difficulty}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{formatDuration(r.time)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="bg-orbs"><div className="orb a" /><div className="orb b" /><div className="orb c" /></div>
      <div className="bg-grid" />

      <div className="topbar">
        <Logo />
        <div className="topbar-actions">
          <span className="diff-chip" style={{ fontSize: 11 }}>{difficulty}</span>
          <div className="timer-pill" style={{ fontSize: 14, padding: '6px 14px' }}>
            <span className="dot" />
            {formatDuration(displayElapsed)}
          </div>
          <button className="btn-ghost" style={{ padding: '8px 14px' }} onClick={() => navigate('/')}>← Home</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '20px 24px 40px', position: 'relative', zIndex: 1 }}>
        {/* Progress */}
        <div style={{ width: '100%', maxWidth: 580, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--p1)', borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-dim)', minWidth: 36 }}>
            {progress}%
          </span>
        </div>

        <SudokuBoard
          board={board}
          puzzle={puzzle}
          solution={solution}
          onCellChange={handleCellChange}
          disabled={completed}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
        />

        <NumberPad
          onNumber={handleNumberPad}
          onClear={handleClear}
          onUndo={handleUndo}
          disabled={completed || selectedCell === null}
          undoDisabled={completed || undoStack.length === 0}
          notesMode={notesMode}
          onToggleNotes={() => setNotesMode(n => !n)}
        />

        <p style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
          ← → ↑ ↓ navigate · 1–9 fill · Backspace erase · ⌘/Ctrl-Z undo
        </p>
      </div>
    </div>
  );
}

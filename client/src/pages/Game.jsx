import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import SudokuBoard from '../components/SudokuBoard';
import NumberPad from '../components/NumberPad';
import PlayerStatus from '../components/PlayerStatus';
import Timer from '../components/Timer';
import { calcClientProgress, isCellGiven } from '../lib/sudokuHelpers';

function toMilestone(progress) {
  if (progress >= 100) return 100;
  if (progress >= 75) return 75;
  if (progress >= 50) return 50;
  if (progress >= 25) return 25;
  return 0;
}

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const state = location.state;

  const [board, setBoard] = useState(() =>
    state?.puzzle ? [...state.puzzle] : []
  );
  const [selectedCell, setSelectedCell] = useState(null);
  const [myProgress, setMyProgress] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  useEffect(() => {
    if (!state?.puzzle) {
      navigate('/');
      return;
    }

    function handleOpponentProgress({ progress }) {
      setOpponentProgress(toMilestone(progress));
    }

    function handleGameOver(data) {
      setGameOver(true);
      navigate(`/result/${roomId}`, {
        state: { ...state, ...data },
      });
    }

    function handleOpponentDisconnected() {
      navigate(`/result/${roomId}`, {
        state: { ...state, opponentDisconnected: true },
      });
    }

    socket.on('opponent-progress', handleOpponentProgress);
    socket.on('game-over', handleGameOver);
    socket.on('opponent-disconnected', handleOpponentDisconnected);

    return () => {
      socket.off('opponent-progress', handleOpponentProgress);
      socket.off('game-over', handleGameOver);
      socket.off('opponent-disconnected', handleOpponentDisconnected);
    };
  }, [socket, navigate, roomId, state]);

  function handleQuit() {
    socket.emit('leave-game', { roomId });
    navigate('/');
  }

  const handleCellChange = useCallback((index, value) => {
    if (gameOver || !state?.puzzle) return;
    if (isCellGiven(state.puzzle, index)) return;

    setBoard(prev => {
      const next = [...prev];
      next[index] = value;
      const progress = calcClientProgress(next, state.puzzle, state.solution);
      setMyProgress(toMilestone(progress));
      socket.emit('cell-update', { roomId, index, value });
      return next;
    });
  }, [socket, roomId, state, gameOver]);

  function handleNumberPad(num) {
    if (selectedCell === null) return;
    if (isCellGiven(state.puzzle, selectedCell)) return;
    handleCellChange(selectedCell, num);
  }

  function handleClear() {
    if (selectedCell === null) return;
    handleCellChange(selectedCell, 0);
  }

  if (!state?.puzzle) return null;

  const opponentNickname = state.opponentNickname || 'Opponent';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex flex-col items-center gap-4 p-4 pb-6 w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg font-bold text-slate-200">Sudoku Battle</h1>
          <div className="flex items-center gap-3">
            {!gameOver && (
              showQuitConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">Quit?</span>
                  <button
                    onClick={handleQuit}
                    className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowQuitConfirm(false)}
                    className="text-slate-500 hover:text-slate-400 text-xs transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowQuitConfirm(true)}
                  className="text-slate-500 hover:text-red-400 text-sm transition-colors"
                >
                  Quit
                </button>
              )
            )}
            <Timer running={!gameOver} />
          </div>
        </div>

        {/* Player statuses */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <PlayerStatus
            nickname={state.nickname}
            progress={myProgress}
            isYou
          />
          <PlayerStatus
            nickname={opponentNickname}
            progress={opponentProgress}
            isOpponent
          />
        </div>

        {/* Sudoku board */}
        <SudokuBoard
          board={board}
          puzzle={state.puzzle}
          solution={state.solution}
          onCellChange={handleCellChange}
          disabled={gameOver}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
        />

        {/* Number pad */}
        <NumberPad
          onNumber={handleNumberPad}
          onClear={handleClear}
          disabled={gameOver || selectedCell === null}
        />

        <p className="text-slate-600 text-xs capitalize">
          {state.difficulty} · Room {roomId}
        </p>
      </div>
    </div>
  );
}

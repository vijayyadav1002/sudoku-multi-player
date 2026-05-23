import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import SudokuBoard from '../components/SudokuBoard';
import NumberPad from '../components/NumberPad';
import PlayerProgressStrip from '../components/PlayerProgressStrip';
import Timer from '../components/Timer';
import { calcClientProgress, isCellGiven } from '../lib/sudokuHelpers';

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
  const [activePlayers, setActivePlayers] = useState(state?.players ?? []);
  const [playersProgress, setPlayersProgress] = useState(() => {
    const map = new Map();
    (state?.players ?? []).forEach(p => map.set(p.socketId, 0));
    return map;
  });
  const [gameOver, setGameOver] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [disconnectMsg, setDisconnectMsg] = useState(null);
  const disconnectTimer = useRef(null);

  useEffect(() => {
    if (!state?.puzzle) {
      navigate('/');
      return;
    }

    function handlePlayersProgress({ updates }) {
      setPlayersProgress(prev => {
        const next = new Map(prev);
        updates.forEach(({ socketId, progress }) => next.set(socketId, progress));
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
      setDisconnectMsg(`${nickname} left the game`);
      clearTimeout(disconnectTimer.current);
      disconnectTimer.current = setTimeout(() => setDisconnectMsg(null), 3000);
    }

    function handleGameOver(data) {
      setGameOver(true);
      navigate(`/result/${roomId}`, {
        state: { ...state, ...data },
      });
    }

    socket.on('players-progress', handlePlayersProgress);
    socket.on('player-left', handlePlayerLeft);
    socket.on('game-over', handleGameOver);

    return () => {
      socket.off('players-progress', handlePlayersProgress);
      socket.off('player-left', handlePlayerLeft);
      socket.off('game-over', handleGameOver);
      clearTimeout(disconnectTimer.current);
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
      setPlayersProgress(pm => new Map(pm).set(mySocketId, progress));
      socket.emit('cell-update', { roomId, index, value });
      return next;
    });
  }, [socket, roomId, state, gameOver, mySocketId]);

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

  const boardWidth = 'min(calc(100vw - 2rem), 400px)';

  return (
    <div className="min-h-full bg-slate-900 text-white flex flex-col">
      <div className="flex flex-col items-center gap-4 p-4 pb-6 w-full">
        <div className="flex flex-col gap-4 w-full" style={{ maxWidth: boardWidth }}>
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

        {/* Disconnect banner */}
        {disconnectMsg && (
          <div className="w-full bg-slate-700 text-slate-300 text-xs text-center rounded-lg py-2 px-3">
            {disconnectMsg}
          </div>
        )}

        {/* Player progress strip */}
        <PlayerProgressStrip
          players={activePlayers}
          playersProgress={playersProgress}
          mySocketId={mySocketId}
        />

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
    </div>
  );
}

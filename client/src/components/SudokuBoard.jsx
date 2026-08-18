import { useRef, useEffect } from 'react';
import SudokuCell from './SudokuCell';

export default function SudokuBoard({ board, puzzle, solution, onCellChange, disabled, selectedCell, onSelectCell }) {
  const cellRefs = useRef([]);

  useEffect(() => {
    if (selectedCell !== null && cellRefs.current[selectedCell]) {
      cellRefs.current[selectedCell].focus({ preventScroll: true });
    }
  }, [selectedCell]);

  return (
    <div className="board-wrap">
      <div role="grid" aria-label="Sudoku board" className="board">
        {Array.from({ length: 81 }, (_, i) => (
          <SudokuCell
            key={i}
            ref={el => { cellRefs.current[i] = el; }}
            index={i}
            board={board}
            puzzle={puzzle}
            solution={solution}
            onChange={(idx, val) => !disabled && onCellChange(idx, val)}
            selected={selectedCell === i}
            onSelect={(idx) => !disabled && onSelectCell(idx)}
          />
        ))}
      </div>
    </div>
  );
}

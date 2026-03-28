import { useRef, useEffect } from 'react';
import SudokuCell from './SudokuCell';

export default function SudokuBoard({ board, puzzle, onCellChange, disabled, selectedCell, onSelectCell }) {
  const cellRefs = useRef([]);

  useEffect(() => {
    if (selectedCell !== null && cellRefs.current[selectedCell]) {
      cellRefs.current[selectedCell].focus({ preventScroll: true });
    }
  }, [selectedCell]);

  function handleChange(index, value) {
    if (disabled) return;
    onCellChange(index, value);
  }

  function handleSelect(index) {
    if (disabled) return;
    onSelectCell(index);
  }

  return (
    <div
      role="grid"
      aria-label="Sudoku board"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(9, 1fr)',
        border: '2px solid #475569',
        borderRadius: '8px',
        overflow: 'hidden',
        width: 'min(calc(100vw - 2rem), 400px)',
        aspectRatio: '1 / 1',
      }}
    >
      {Array.from({ length: 81 }, (_, i) => (
        <SudokuCell
          key={i}
          ref={el => { cellRefs.current[i] = el; }}
          index={i}
          board={board}
          puzzle={puzzle}
          onChange={handleChange}
          selected={selectedCell === i}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

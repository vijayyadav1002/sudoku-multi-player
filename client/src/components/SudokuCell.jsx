import { forwardRef } from 'react';
import { isCellGiven } from '../lib/sudokuHelpers';

const SudokuCell = forwardRef(function SudokuCell(
  { index, board, puzzle, solution, onChange, selected, onSelect, ownerColor },
  ref
) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const given = isCellGiven(puzzle, index);
  const value = board[index];
  const blockAlt = (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 1;

  const classes = [
    'cell',
    `row${row}`,
    `col${col}`,
    given && 'given',
    selected && 'selected',
    !given && value && 'own',
    blockAlt && 'block-alt',
  ].filter(Boolean).join(' ');

  function handleKeyDown(e) {
    if (given) return;
    if (e.key >= '1' && e.key <= '9') { onChange(index, parseInt(e.key)); }
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { onChange(index, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (col < 8) onSelect(index + 1); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); if (col > 0) onSelect(index - 1); }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); if (row < 8) onSelect(index + 9); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); if (row > 0) onSelect(index - 9); }
  }

  return (
    <div
      ref={ref}
      tabIndex={given ? -1 : 0}
      role="gridcell"
      className={classes}
      style={ownerColor && !given ? { color: ownerColor } : undefined}
      onClick={() => onSelect(index)}
      onFocus={() => !given && onSelect(index)}
      onKeyDown={handleKeyDown}
    >
      {value !== 0 && <span className="digit">{value}</span>}
    </div>
  );
});

export default SudokuCell;

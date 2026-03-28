import { forwardRef } from 'react';
import { isCellGiven } from '../lib/sudokuHelpers';

const SudokuCell = forwardRef(function SudokuCell(
  { index, board, puzzle, onChange, selected, onSelect },
  ref
) {
  const row = Math.floor(index / 9);
  const col = index % 9;

  const given = isCellGiven(puzzle, index);
  const value = board[index];

  const borderRight = col === 2 || col === 5
    ? '2px solid #475569'
    : '1px solid #1e293b';
  const borderBottom = row === 2 || row === 5
    ? '2px solid #475569'
    : '1px solid #1e293b';

  let bgColor = '#1e293b';
  if (given) bgColor = '#0f172a';
  if (selected && !given) bgColor = '#312e81';

  const textColor = given ? '#f1f5f9' : '#cbd5e1';

  function handleKeyDown(e) {
    if (given) return;
    if (e.key >= '1' && e.key <= '9') {
      onChange(index, parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      onChange(index, 0);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (col < 8) onSelect(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (col > 0) onSelect(index - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (row < 8) onSelect(index + 9);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (row > 0) onSelect(index - 9);
    }
  }

  return (
    <div
      ref={ref}
      tabIndex={given ? -1 : 0}
      role="gridcell"
      aria-label={`Row ${row + 1} col ${col + 1}${value ? ` value ${value}` : ' empty'}`}
      onClick={() => !given && onSelect(index)}
      onFocus={() => !given && onSelect(index)}
      onKeyDown={handleKeyDown}
      style={{
        borderRight,
        borderBottom,
        backgroundColor: bgColor,
        color: textColor,
        fontWeight: given ? 700 : 500,
        cursor: given ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem',
        userSelect: 'none',
        outline: selected && !given ? '2px solid #6366f1' : 'none',
        outlineOffset: '-2px',
        transition: 'background-color 0.15s',
      }}
    >
      {value !== 0 ? value : ''}
    </div>
  );
});

export default SudokuCell;

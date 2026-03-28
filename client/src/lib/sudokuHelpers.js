export function isCellGiven(puzzle, index) {
  return puzzle[index] !== 0;
}

export function isCellCorrect(board, solution, index) {
  return board[index] !== 0 && board[index] === solution[index];
}

export function isCellWrong(board, solution, index) {
  return board[index] !== 0 && board[index] !== solution[index];
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function calcClientProgress(board, puzzle, solution) {
  const blanks = puzzle.filter(v => v === 0).length;
  if (blanks === 0) return 100;
  const correct = board.reduce((acc, v, i) =>
    acc + (puzzle[i] === 0 && v === solution[i] ? 1 : 0), 0);
  return Math.round((correct / blanks) * 100);
}

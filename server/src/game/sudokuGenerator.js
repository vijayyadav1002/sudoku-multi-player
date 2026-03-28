function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(board, row, col, num) {
  for (let c = 0; c < 9; c++) {
    if (board[row * 9 + c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (board[r * 9 + col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[(br + r) * 9 + (bc + c)] === num) return false;
    }
  }
  return true;
}

function findEmpty(board) {
  for (let i = 0; i < 81; i++) {
    if (board[i] === 0) return [Math.floor(i / 9), i % 9];
  }
  return null;
}

function fillBoard(board) {
  const empty = findEmpty(board);
  if (!empty) return true;
  const [row, col] = empty;
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const num of nums) {
    if (isValid(board, row, col, num)) {
      board[row * 9 + col] = num;
      if (fillBoard(board)) return true;
      board[row * 9 + col] = 0;
    }
  }
  return false;
}

function countSolutions(board, limit = 2) {
  const empty = findEmpty(board);
  if (!empty) return 1;
  const [row, col] = empty;
  let count = 0;
  for (let num = 1; num <= 9; num++) {
    if (isValid(board, row, col, num)) {
      board[row * 9 + col] = num;
      count += countSolutions(board, limit);
      board[row * 9 + col] = 0;
      if (count >= limit) return count;
    }
  }
  return count;
}

const REMOVALS = { easy: 35, medium: 45, hard: 52 };

export function generatePuzzle(difficulty = 'medium') {
  const solution = Array(81).fill(0);
  fillBoard(solution);

  const puzzle = [...solution];
  const target = REMOVALS[difficulty] ?? 45;
  const indices = shuffle([...Array(81).keys()]);
  let removed = 0;

  for (const idx of indices) {
    if (removed >= target) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    if (countSolutions([...puzzle]) === 1) {
      removed++;
    } else {
      puzzle[idx] = backup;
    }
  }

  return { puzzle, solution };
}

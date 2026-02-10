export const cloneGrid = (grid: number[][]) =>
  grid.map((row) => [...row]);

export const findEmpty = (grid: number[][]) => {
  for (let row = 0; row < grid.length; row += 1) {
    const rowValues = grid[row];
    if (!rowValues) continue;
    for (let col = 0; col < rowValues.length; col += 1) {
      if (rowValues[col] === -1) {
        return { row, col };
      }
    }
  }
  return { row: 0, col: 0 };
};

export const isAdjacent = (
  a: { row: number; col: number },
  b: { row: number; col: number }
) => {
  const dRow = Math.abs(a.row - b.row);
  const dCol = Math.abs(a.col - b.col);
  return (dRow === 1 && dCol === 0) || (dRow === 0 && dCol === 1);
};

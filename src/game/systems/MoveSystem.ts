import { cloneGrid, findEmpty, isAdjacent } from "./GridSystem";

export const tryMove = (
  grid: number[][],
  row: number,
  col: number
) => {
  const sourceRow = grid[row];
  const sourceValue = sourceRow?.[col];
  if (sourceValue === undefined || sourceValue === -1) {
    return { moved: false, grid };
  }

  const empty = findEmpty(grid);
  if (!isAdjacent(empty, { row, col })) {
    return { moved: false, grid };
  }

  const next = cloneGrid(grid);
  const emptyRow = next[empty.row];
  const selectedRow = next[row];
  if (!emptyRow || !selectedRow) {
    return { moved: false, grid };
  }

  emptyRow[empty.col] = sourceValue;
  selectedRow[col] = -1;
  return { moved: true, grid: next };
};

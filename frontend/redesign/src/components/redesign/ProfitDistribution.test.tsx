import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfitDistributionTable, type ProfitDistribution } from './ProfitDistribution.tsx';

const profitDist: ProfitDistribution = {
  '-6': { ipc: -6, prob: 0.01 },
  '-5': { ipc: -5, prob: 0.03 },
  '-4': { ipc: -4, prob: 0.01 },
  '0': { ipc: 0, prob: 0.95 },
};

describe('profit confidence columns', () => {
  it('keeps confidence based on the full distribution and always draws the extremes', () => {
    render(
      <ProfitDistributionTable
        profitDist={profitDist}
        hideUnlikely="5"
        probabilityDecimals={2}
        ipcDecimals={2}
      />,
    );

    const table = screen.getByRole('table', { name: 'Profit distribution' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);

    // Columns: badge, exact, "or better", "or worse", IPC.
    const cells = rows.map((row) => within(row).getAllByRole('cell'));

    // The first extreme row anchors the reverse direction at 100%.
    expect(cells[0][1]).toHaveTextContent('1.00%');
    expect(cells[0][2]).toHaveTextContent('1.00%');
    expect(cells[0][3]).toHaveTextContent('100.00%');

    // The hidden 3% row still counts: the 5th-percentile row is 5% "or better".
    expect(cells[1][2]).toHaveTextContent('5.00%');
    expect(cells[1][3]).toHaveTextContent('96.00%');

    // The last extreme row anchors the forward direction at 100%.
    expect(cells[2][2]).toHaveTextContent('100.00%');
    expect(cells[2][3]).toHaveTextContent('95.00%');
  });
});

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MultiwaveOutput } from 'aacalc2';
import { Results, type ResultsSettings } from './Results.tsx';

const settings: ResultsSettings = {
  ipcDiffDisplay: 'absolute',
  hideUnlikely: '5',
  probabilityDecimals: 2,
  ipcDecimals: 2,
};

function output(): MultiwaveOutput {
  return {
    attack: { survives: [0.5], ipcLoss: [30], incrementalLoss: [30], cumulativeIpcLoss: [30] },
    defense: { survives: [0.5], ipcLoss: [30], incrementalLoss: [30], cumulativeIpcLoss: [30] },
    casualtiesInfo: {
      attack: {
        // The two extreme rows are always drawn, even below the threshold.
        first: { amount: 0.01, ipcLoss: 0, survivors: '10 Art', casualties: '', retreaters: '' },
        // Hidden by the filter, but it must still count towards the confidence
        // percentages of the visible rows.
        hidden: {
          amount: 0.03,
          ipcLoss: 1,
          survivors: '9 Inf',
          casualties: '1 Inf',
          retreaters: '',
        },
        // Kept because it crosses the 5th percentile (and is not an extreme).
        boundary: {
          amount: 0.01,
          ipcLoss: 2,
          survivors: '8 Inf',
          casualties: '2 Inf',
          retreaters: '',
        },
        last: { amount: 0.95, ipcLoss: 70, survivors: '', casualties: '10 Inf', retreaters: '' },
      },
      defense: {},
    },
    casualtiesInfoArr: {},
    profitDistribution: [],
    takesTerritory: [0.5],
    rounds: [5],
    waves: 1,
    complexity: 0,
  };
}

describe('casualty confidence columns', () => {
  it('keeps confidence based on the full distribution and always draws the extremes', () => {
    render(<Results result={output()} numWaves={1} settings={settings} />);

    const table = screen.getByRole('table', { name: 'attack casualty table' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);

    // Columns: badge, exact, "or better", "or worse", survivors, casualties, IPC.
    const cells = rows.map((row) => within(row).getAllByRole('cell'));

    // The first extreme row anchors the reverse direction at 100%.
    expect(cells[0][2]).toHaveTextContent('1.00%');
    expect(cells[0][3]).toHaveTextContent('100.00%');

    // The hidden 3% row still counts: the boundary row is 5% "or better".
    expect(cells[1][2]).toHaveTextContent('5.00%');
    expect(cells[1][3]).toHaveTextContent('96.00%');

    // The last extreme row anchors the forward direction at 100%.
    expect(cells[2][2]).toHaveTextContent('100.00%');
    expect(cells[2][3]).toHaveTextContent('95.00%');
  });
});

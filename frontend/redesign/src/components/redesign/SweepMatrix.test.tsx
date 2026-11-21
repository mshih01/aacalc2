import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SweepMatrix } from './SweepMatrix.tsx';
import type { BatchRow } from '../../utils/batchEval.ts';

function makeRow(ool: string, retreat: string, profit: number, defLoss: number): BatchRow {
  return {
    group: 'sweep',
    name: `${ool} × ${retreat}`,
    status: 'ok',
    factors: { OOL: ool, Retreat: retreat },
    profit,
    defLoss,
    attLoss: 0,
    defSurv: 0.5,
    attSurv: 0.5,
    takes: 0.5,
    rounds: 1,
    runtimeMs: 1,
  };
}

const rows = [
  makeRow('inf first', 'no retreat', 10, 100),
  makeRow('inf first', 'EV retreat', 20, 200),
  makeRow('art first', 'no retreat', 30, 300),
  makeRow('art first', 'EV retreat', 40, 400),
];

afterEach(() => {
  cleanup();
});

describe('SweepMatrix', () => {
  it('renders one row and column per axis level', () => {
    render(<SweepMatrix rows={rows} ipcDecimals={1} probabilityDecimals={2} />);

    expect(screen.getByText('Combination matrix')).toBeInTheDocument();
    expect(screen.getByText('OOL ↓ / Retreat →')).toBeInTheDocument();
    expect(screen.getAllByText('inf first')).toHaveLength(1);
    expect(screen.getAllByText('art first')).toHaveLength(1);
    expect(screen.getAllByText('no retreat')).toHaveLength(1);
    expect(screen.getAllByText('EV retreat')).toHaveLength(1);
    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.getByText('40.0')).toBeInTheDocument();
  });

  it('switches the displayed metric', () => {
    render(<SweepMatrix rows={rows} ipcDecimals={1} probabilityDecimals={2} />);

    fireEvent.change(screen.getByLabelText('Sweep matrix metric'), {
      target: { value: 'defLoss' },
    });

    expect(screen.getByText('100.0')).toBeInTheDocument();
    expect(screen.getByText('400.0')).toBeInTheDocument();
    expect(screen.queryByText('10.0')).not.toBeInTheDocument();
  });

  it('shows skipped and errored combinations without a value', () => {
    render(
      <SweepMatrix
        rows={[
          { ...rows[0], status: 'skipped', note: 'too complex' },
          { ...rows[1], status: 'error', note: 'boom' },
        ]}
        ipcDecimals={1}
        probabilityDecimals={2}
      />,
    );

    expect(screen.getByText('skipped')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('does not render for anything other than two axes', () => {
    const row = rows[0];
    const { container } = render(
      <SweepMatrix
        rows={[{ ...row, factors: { OOL: 'inf first' } }]}
        ipcDecimals={1}
        probabilityDecimals={2}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

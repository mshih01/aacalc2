import { useMemo, useState } from 'react';
import type { BatchMetrics, BatchRow } from '../../utils/batchEval.ts';
import { formatFixed, formatPercent } from '../../utils/display.ts';
import { factorAxes } from '../../utils/sweep.ts';
import { SelectField } from './primitives.tsx';

type MetricKey = keyof BatchMetrics;

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: 'profit', label: 'Profit' },
  { key: 'defLoss', label: 'Defender loss' },
  { key: 'attLoss', label: 'Attacker loss' },
  { key: 'defSurv', label: 'Defender survival' },
  { key: 'attSurv', label: 'Attacker survival' },
  { key: 'takes', label: 'Takes territory' },
  { key: 'rounds', label: 'Rounds' },
];

const PERCENT_METRICS = new Set<MetricKey>(['defSurv', 'attSurv', 'takes']);

function cellKey(rowLevel: string, columnLevel: string): string {
  return JSON.stringify([rowLevel, columnLevel]);
}

function formatMetric(
  metric: MetricKey,
  value: number,
  ipcDecimals: number,
  probabilityDecimals: number,
): string {
  if (PERCENT_METRICS.has(metric)) {
    return formatPercent(value * 100, probabilityDecimals);
  }
  if (metric === 'rounds') return formatFixed(value, 2);
  return formatFixed(value, ipcDecimals);
}

export function SweepMatrix({
  rows,
  ipcDecimals,
  probabilityDecimals,
}: {
  rows: BatchRow[];
  ipcDecimals: number;
  probabilityDecimals: number;
}) {
  const axes = useMemo(() => factorAxes(rows), [rows]);
  const [metric, setMetric] = useState<MetricKey>('profit');

  if (axes.length !== 2) return null;

  const [rowAxis, columnAxis] = axes;
  const lookup = new Map<string, BatchRow>();
  for (const row of rows) {
    const rowLevel = row.factors?.[rowAxis.label];
    const columnLevel = row.factors?.[columnAxis.label];
    if (rowLevel !== undefined && columnLevel !== undefined) {
      lookup.set(cellKey(rowLevel, columnLevel), row);
    }
  }

  return (
    <div className="sweep-matrix">
      <div className="sweep-matrix__head">
        <h4 className="sweep-matrix__title">Combination matrix</h4>
        <SelectField
          className="sweep-matrix__metric"
          label="Metric"
          value={metric}
          compact
          ariaLabel="Sweep matrix metric"
          options={METRICS.map((option) => ({ value: option.key, label: option.label }))}
          onChange={(value) => setMetric(value as MetricKey)}
        />
      </div>
      <div className="batch-results__table-wrap">
        <table className="batch-table sweep-matrix__table" aria-label="Sweep matrix">
          <thead>
            <tr>
              <th scope="col">
                {rowAxis.label} ↓ / {columnAxis.label} →
              </th>
              {columnAxis.levels.map((level) => (
                <th scope="col" key={level}>
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowAxis.levels.map((rowLevel) => (
              <tr key={rowLevel}>
                <th scope="row">{rowLevel}</th>
                {columnAxis.levels.map((columnLevel) => {
                  const row = lookup.get(cellKey(rowLevel, columnLevel));
                  const value = row?.status === 'ok' ? row[metric] : undefined;
                  const text =
                    typeof value === 'number'
                      ? formatMetric(metric, value, ipcDecimals, probabilityDecimals)
                      : row
                        ? row.status
                        : '—';
                  const statusClass =
                    row && row.status !== 'ok' ? ` sweep-matrix__cell--${row.status}` : '';
                  const colorClass =
                    metric === 'profit' && typeof value === 'number'
                      ? value < 0
                        ? ' batch-table__number--negative'
                        : ' batch-table__number--positive'
                      : '';

                  return (
                    <td
                      key={columnLevel}
                      className={`batch-table__number${statusClass}${colorClass}`}
                      title={row?.note ?? row?.name}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sweep-matrix__note">
        Rows: {rowAxis.label} · Columns: {columnAxis.label} · Values:{' '}
        {METRICS.find((option) => option.key === metric)?.label}
      </p>
    </div>
  );
}

import type { BattleMode } from '../../types.ts';
import type { BatchRow } from '../../utils/batchEval.ts';
import { formatFixed, formatPercent } from '../../utils/display.ts';
import { SelectField } from './primitives.tsx';

export interface BatchSnapshot {
  group: string;
  rows: BatchRow[];
  attackString: string;
  defenseString: string;
  mode: BattleMode;
  numWaves: number;
  cancelled: boolean;
  completedAt: number;
}

interface BatchGroupOption {
  group: string;
  count: number;
}

export function BatchRunPanel({
  groups,
  selectedGroup,
  onSelectGroup,
  onRun,
  running,
  progress,
  onCancel,
  batch,
  onClear,
  onCopy,
  ipcDecimals,
  probabilityDecimals,
}: {
  groups: BatchGroupOption[];
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  onRun: () => void;
  running: boolean;
  progress: { done: number; total: number } | null;
  onCancel: () => void;
  batch: BatchSnapshot | null;
  onClear: () => void;
  onCopy: () => void;
  ipcDecimals: number;
  probabilityDecimals: number;
}) {
  return (
    <section className="batch-run">
      <div className="batch-run__intro">
        <h2 className="batch-run__title">Batch run</h2>
        <p className="batch-run__desc">
          Re-evaluate every saved setting in a history group against the current armies. The armies,
          mode and wave count stay fixed; OOL, rounds, retreat and the other scenario settings come
          from each saved entry.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="batch-run__empty">
          Save at least one titled battle to History, then use its group here.
        </div>
      ) : (
        <div className="batch-run__controls">
          <SelectField
            className="batch-run__group"
            label="Group"
            value={selectedGroup}
            disabled={running}
            options={groups.map(({ group, count }) => ({
              value: group,
              label: `${group} (${count})`,
            }))}
            onChange={onSelectGroup}
          />
          <button
            type="button"
            className="beta-calculate batch-run__button"
            disabled={running || !selectedGroup}
            onClick={onRun}
          >
            {running ? 'Evaluating…' : 'Evaluate group'}
          </button>
        </div>
      )}

      {running && progress ? (
        <div className="batch-progress" role="status" aria-live="polite">
          <div className="batch-progress__head">
            <span>
              Evaluating {progress.done}/{progress.total}…
            </span>
            <button
              type="button"
              className="history-toolbar__button history-toolbar__button--danger"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
          <div className="batch-progress__bar">
            <span
              style={{
                width: `${
                  progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
                }%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {batch && !running ? (
        <BatchResults
          batch={batch}
          ipcDecimals={ipcDecimals}
          probabilityDecimals={probabilityDecimals}
          onClear={onClear}
          onCopy={onCopy}
        />
      ) : null}
    </section>
  );
}

function metricText(
  row: BatchRow,
  read: (row: BatchRow) => number | undefined,
  format: (value: number) => string,
): string {
  if (row.status !== 'ok') return '-';
  const value = read(row);
  return typeof value === 'number' && Number.isFinite(value) ? format(value) : '-';
}

function BatchResults({
  batch,
  ipcDecimals,
  probabilityDecimals,
  onClear,
  onCopy,
}: {
  batch: BatchSnapshot;
  ipcDecimals: number;
  probabilityDecimals: number;
  onClear: () => void;
  onCopy: () => void;
}) {
  const modeLabel = batch.mode === 'land' ? 'Land' : 'Sea';
  const waveLabel = `${batch.numWaves} wave${batch.numWaves === 1 ? '' : 's'}`;
  const evaluated = batch.rows.filter((row) => row.status === 'ok').length;
  const skipped = batch.rows.filter((row) => row.status === 'skipped').length;
  const errors = batch.rows.filter((row) => row.status === 'error').length;

  return (
    <div className="batch-results">
      <div className="batch-results__head">
        <div className="batch-results__heading">
          <h3 className="batch-results__title">Batch results — {batch.group}</h3>
          <p className="batch-results__meta">
            {evaluated} evaluated
            {skipped > 0 ? ` · ${skipped} skipped` : ''}
            {errors > 0 ? ` · ${errors} error${errors === 1 ? '' : 's'}` : ''} · {modeLabel} ·{' '}
            {waveLabel} · {new Date(batch.completedAt).toLocaleString()}
          </p>
          <p className="batch-results__armies">
            Armies fixed: Att {batch.attackString || 'none'} vs Def {batch.defenseString || 'none'}
          </p>
          {batch.cancelled ? (
            <p className="batch-results__cancelled">Stopped early — partial results shown.</p>
          ) : null}
        </div>
        <div className="batch-results__actions">
          <button type="button" className="beta-text-button" onClick={onCopy}>
            Copy report
          </button>
          <button type="button" className="beta-text-button" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>

      <div className="batch-results__table-wrap">
        <table className="batch-table" aria-label={`Batch results for ${batch.group}`}>
          <thead>
            <tr>
              <th scope="col">Setting</th>
              <th scope="col">Profit</th>
              <th scope="col">Def loss</th>
              <th scope="col">Att loss</th>
              <th scope="col">Def surv %</th>
              <th scope="col">Att surv %</th>
              <th scope="col">Takes %</th>
              <th scope="col">Rounds</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <tbody>
            {batch.rows.length === 0 ? (
              <tr>
                <td className="batch-table__empty" colSpan={9}>
                  No settings were evaluated.
                </td>
              </tr>
            ) : (
              batch.rows.map((row) => {
                const profit = row.profit;
                return (
                  <tr className={`batch-row batch-row--${row.status}`} key={row.name}>
                    <td className="batch-table__setting">
                      <span className="batch-table__name">{row.name}</span>
                      {row.status !== 'ok' ? (
                        <span className={`batch-status batch-status--${row.status}`}>
                          {row.status}
                        </span>
                      ) : null}
                      {row.note ? <span className="batch-table__note">{row.note}</span> : null}
                    </td>
                    <td
                      className={`batch-table__number${
                        row.status === 'ok' && typeof profit === 'number'
                          ? profit < 0
                            ? ' batch-table__number--negative'
                            : ' batch-table__number--positive'
                          : ''
                      }`}
                    >
                      {metricText(
                        row,
                        (item) => item.profit,
                        (value) => formatFixed(value, ipcDecimals),
                      )}
                    </td>
                    <td className="batch-table__number">
                      {metricText(
                        row,
                        (item) => item.defLoss,
                        (value) => formatFixed(value, ipcDecimals),
                      )}
                    </td>
                    <td className="batch-table__number">
                      {metricText(
                        row,
                        (item) => item.attLoss,
                        (value) => formatFixed(value, ipcDecimals),
                      )}
                    </td>
                    <td className="batch-table__number">
                      {metricText(
                        row,
                        (item) => item.defSurv,
                        (value) => formatPercent(value * 100, probabilityDecimals),
                      )}
                    </td>
                    <td className="batch-table__number">
                      {metricText(
                        row,
                        (item) => item.attSurv,
                        (value) => formatPercent(value * 100, probabilityDecimals),
                      )}
                    </td>
                    <td className="batch-table__number">
                      {metricText(
                        row,
                        (item) => item.takes,
                        (value) => formatPercent(value * 100, probabilityDecimals),
                      )}
                    </td>
                    <td className="batch-table__number">
                      {metricText(
                        row,
                        (item) => item.rounds,
                        (value) => formatFixed(value, 2),
                      )}
                    </td>
                    <td className="batch-table__number">
                      {metricText(
                        row,
                        (item) => item.runtimeMs,
                        (value) => `${Math.round(value)} ms`,
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

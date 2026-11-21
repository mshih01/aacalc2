import { useMemo } from 'react';
import type { BattleInput, BattleMode } from '../../types.ts';
import type { BatchRow } from '../../utils/batchEval.ts';
import type { HistoryGroup } from '../../utils/history.ts';
import { formatFixed, formatPercent } from '../../utils/display.ts';
import {
  buildSweepPlan,
  groupToSource,
  MAX_SWEEP_CASES,
  type SweepPlan,
} from '../../utils/sweep.ts';
import { SelectField } from './primitives.tsx';
import { SweepMatrix } from './SweepMatrix.tsx';

export interface BatchSnapshot {
  kind: 'group' | 'sweep';
  group: string;
  /** Set for sweep results: the two group names used as axes. */
  axes?: { rows: string; columns: string };
  rows: BatchRow[];
  attackString: string;
  defenseString: string;
  mode: BattleMode;
  numWaves: number;
  cancelled: boolean;
  completedAt: number;
}

export type BatchMode = 'single' | 'sweep';

export function BatchRunPanel({
  groups,
  selectedGroup,
  onSelectGroup,
  mode,
  onModeChange,
  sweepRows,
  sweepColumns,
  onSweepRowsChange,
  onSweepColumnsChange,
  baseInput,
  onRun,
  onRunSweep,
  running,
  progress,
  onCancel,
  batch,
  onClear,
  onCopy,
  ipcDecimals,
  probabilityDecimals,
}: {
  groups: HistoryGroup[];
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  mode: BatchMode;
  onModeChange: (mode: BatchMode) => void;
  sweepRows: string;
  sweepColumns: string;
  onSweepRowsChange: (group: string) => void;
  onSweepColumnsChange: (group: string) => void;
  baseInput: BattleInput;
  onRun: () => void;
  onRunSweep: (plan: SweepPlan) => void;
  running: boolean;
  progress: { done: number; total: number } | null;
  onCancel: () => void;
  batch: BatchSnapshot | null;
  onClear: () => void;
  onCopy: () => void;
  ipcDecimals: number;
  probabilityDecimals: number;
}) {
  const sweepPlan = useMemo(() => {
    if (mode !== 'sweep') return null;
    const rows = groups.find((item) => item.group === sweepRows);
    const columns = groups.find((item) => item.group === sweepColumns);
    if (!rows || !columns) return null;
    return buildSweepPlan(baseInput, [
      groupToSource(rows.group, rows.entries),
      groupToSource(columns.group, columns.entries),
    ]);
  }, [mode, groups, sweepRows, sweepColumns, baseInput]);

  const canRunSweep = sweepPlan?.runnable === true && !running;

  return (
    <section className="batch-run">
      <div className="batch-run__intro">
        <h2 className="batch-run__title">Batch run</h2>
        <p className="batch-run__desc">
          {mode === 'single'
            ? 'Re-evaluate every saved setting in a history group against the current armies. The armies, mode and wave count stay fixed; OOL, rounds, retreat and the other scenario settings come from each saved entry.'
            : 'Cross two saved groups against the current armies. Each level supplies only the settings that differ from the current battle; the result is one row and one matrix cell per combination.'}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="batch-run__empty">
          Save at least one titled battle to History, then use its group here.
        </div>
      ) : (
        <>
          <div className="batch-run__modes" role="group" aria-label="Batch mode">
            <button
              type="button"
              className={`batch-run__mode${mode === 'single' ? ' batch-run__mode--active' : ''}`}
              aria-pressed={mode === 'single'}
              onClick={() => onModeChange('single')}
            >
              Single group
            </button>
            <button
              type="button"
              className={`batch-run__mode${mode === 'sweep' ? ' batch-run__mode--active' : ''}`}
              aria-pressed={mode === 'sweep'}
              onClick={() => onModeChange('sweep')}
            >
              Two-group sweep
            </button>
          </div>

          {mode === 'single' ? (
            <div className="batch-run__controls">
              <SelectField
                className="batch-run__group"
                label="Group"
                value={selectedGroup}
                disabled={running}
                options={groups.map(({ group, entries }) => ({
                  value: group,
                  label: `${group} (${entries.length})`,
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
          ) : groups.length < 2 ? (
            <div className="batch-run__empty">
              Save settings into at least two history groups to run a sweep.
            </div>
          ) : (
            <>
              <div className="batch-run__sweep-controls">
                <SelectField
                  className="batch-run__sweep-group"
                  label="Rows"
                  value={sweepRows}
                  disabled={running}
                  options={groups.map(({ group, entries }) => ({
                    value: group,
                    label: `${group} (${entries.length})`,
                  }))}
                  onChange={onSweepRowsChange}
                />
                <SelectField
                  className="batch-run__sweep-group"
                  label="Columns"
                  value={sweepColumns}
                  disabled={running}
                  options={groups.map(({ group, entries }) => ({
                    value: group,
                    label: `${group} (${entries.length})`,
                  }))}
                  onChange={onSweepColumnsChange}
                />
              </div>

              {sweepPlan ? (
                <>
                  <div className="sweep-summary">
                    <span className="sweep-summary__count">
                      <strong>{sweepPlan.combinations}</strong>{' '}
                      {sweepPlan.combinations === 1 ? 'combination' : 'combinations'}
                    </span>
                    <button
                      type="button"
                      className="beta-calculate sweep-summary__button"
                      disabled={!canRunSweep}
                      onClick={() => {
                        if (sweepPlan.runnable) onRunSweep(sweepPlan);
                      }}
                    >
                      {running
                        ? 'Evaluating…'
                        : `Run ${sweepPlan.combinations} ${
                            sweepPlan.combinations === 1 ? 'battle' : 'battles'
                          }`}
                    </button>
                  </div>

                  <div className="sweep-axes">
                    {sweepPlan.axes.map((axis) => (
                      <div className="sweep-axis" key={axis.label}>
                        <div className="sweep-axis__title">
                          {axis.label}{' '}
                          <span className="sweep-axis__count">({axis.levels.length})</span>
                        </div>
                        {axis.levels.length === 0 ? (
                          <p className="sweep-axis__empty">No usable entries</p>
                        ) : (
                          <ul className="sweep-axis__list">
                            {axis.levels.map((level) => (
                              <li key={level.label}>
                                <span className="sweep-axis__level">{level.label}</span>
                                <span className="sweep-axis__change">
                                  {' — '}
                                  {level.changed.length > 0
                                    ? level.changed.join(', ')
                                    : 'baseline (no changes)'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {sweepPlan.errors.length > 0 ? (
                    <div className="sweep-message sweep-message--error" role="alert">
                      <strong>Sweep blocked</strong>
                      <ul>
                        {sweepPlan.errors.map((error, idx) => (
                          <li key={`${error.axis}-${error.level}-${idx}`}>
                            {error.axis}
                            {error.level ? ` / ${error.level}` : ''}: {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {sweepPlan.conflicts.length > 0 ? (
                    <div className="sweep-message sweep-message--warning" role="alert">
                      <strong>Fields set by both axes</strong>
                      <ul>
                        {sweepPlan.conflicts.map((conflict) => (
                          <li key={`${conflict.axisA}-${conflict.axisB}-${conflict.field}`}>
                            {conflict.axisA} vs {conflict.axisB}: <code>{conflict.field}</code>
                            {conflict.waves.length > 0
                              ? ` (wave ${conflict.waves.map((waveIdx) => waveIdx + 1).join(', ')})`
                              : ''}{' '}
                            — {conflict.valueA} vs {conflict.valueB}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {sweepPlan.tooMany ? (
                    <div className="sweep-message sweep-message--warning" role="alert">
                      {sweepPlan.combinations} combinations exceeds the {MAX_SWEEP_CASES}-battle
                      cap. Narrow one of the groups.
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </>
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

      {batch && !running && (batch.kind === 'sweep') === (mode === 'sweep') ? (
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
  const isSweep = batch.kind === 'sweep';

  const factorKeys: string[] = [];
  for (const row of batch.rows) {
    for (const key of Object.keys(row.factors ?? {})) {
      if (!factorKeys.includes(key)) factorKeys.push(key);
    }
  }

  return (
    <div className="batch-results">
      <div className="batch-results__head">
        <div className="batch-results__heading">
          <h3 className="batch-results__title">
            {isSweep ? 'Sweep results' : 'Batch results'} — {batch.group}
          </h3>
          <p className="batch-results__meta">
            {evaluated} evaluated
            {skipped > 0 ? ` · ${skipped} skipped` : ''}
            {errors > 0 ? ` · ${errors} error${errors === 1 ? '' : 's'}` : ''} · {modeLabel} ·{' '}
            {waveLabel} · {new Date(batch.completedAt).toLocaleString()}
          </p>
          {batch.axes ? (
            <p className="batch-results__armies">
              Rows: {batch.axes.rows} · Columns: {batch.axes.columns}
            </p>
          ) : null}
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

      {isSweep ? (
        <SweepMatrix
          rows={batch.rows}
          ipcDecimals={ipcDecimals}
          probabilityDecimals={probabilityDecimals}
        />
      ) : null}

      <div className="batch-results__table-wrap">
        <table
          className="batch-table"
          aria-label={
            isSweep ? `Sweep results for ${batch.group}` : `Batch results for ${batch.group}`
          }
        >
          <thead>
            <tr>
              <th scope="col">Setting</th>
              {factorKeys.map((key) => (
                <th scope="col" key={key}>
                  {key}
                </th>
              ))}
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
                <td className="batch-table__empty" colSpan={9 + factorKeys.length}>
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
                    {factorKeys.map((key) => (
                      <td className="batch-table__factor" key={key}>
                        {row.factors?.[key] ?? ''}
                      </td>
                    ))}
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

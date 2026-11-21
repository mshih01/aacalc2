import type { BattleInput, HistoryEntry } from '../types.ts';
import type { BatchRow } from './batchEval.ts';

/** Maximum combinations a sweep may expand to before it refuses to run. */
export const MAX_SWEEP_CASES = 500;

/**
 * Fields the batch already fixes from the current app state. They are not part
 * of a sweep axis: armies/mode/wave count are always current, and the Advanced
 * engine options are app-wide (the redesign applies them over saved entries).
 */
const NON_SETTING_FIELDS = new Set([
  'attack',
  'defense',
  'mode',
  'numWaves',
  'verboseLevel',
  'pruneThreshold',
  'reportPruneThreshold',
  'sortMode',
  'experimentalConvolution',
  'evFutureWave',
  'retreatZeroRound',
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, idx) => valuesEqual(value, b[idx]));
  }
  return false;
}

export type FieldPatch =
  { kind: 'scalar'; value: unknown } | { kind: 'record'; values: Record<number, unknown> };

/** Sparse settings delta between a base input and one level's saved input. */
export type InputPatch = Record<string, FieldPatch>;

/**
 * Diff two battle inputs at field / wave-index granularity.
 *
 * Armies/mode/wave count and the app-wide Advanced options are ignored: the
 * batch supplies those when a sweep runs. Record fields only carry the wave
 * indices that actually differ, so an OOL change on wave 0 does not overwrite
 * wave 1.
 */
export function diffInput(base: BattleInput, next: BattleInput): InputPatch {
  const baseRecord = base as unknown as Record<string, unknown>;
  const nextRecord = next as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(baseRecord), ...Object.keys(nextRecord)]);
  const patch: InputPatch = {};

  for (const key of keys) {
    if (NON_SETTING_FIELDS.has(key)) continue;

    const baseValue = baseRecord[key];
    const nextValue = nextRecord[key];
    if (valuesEqual(baseValue, nextValue)) continue;

    if (isPlainRecord(baseValue) || isPlainRecord(nextValue)) {
      const baseWaves = isPlainRecord(baseValue) ? baseValue : {};
      const nextWaves = isPlainRecord(nextValue) ? nextValue : {};
      const waveIndices = new Set(
        [...Object.keys(baseWaves), ...Object.keys(nextWaves)].map(Number),
      );
      const changed: Record<number, unknown> = {};
      for (const waveIdx of waveIndices) {
        if (!valuesEqual(baseWaves[waveIdx], nextWaves[waveIdx])) {
          changed[waveIdx] = nextWaves[waveIdx];
        }
      }
      if (Object.keys(changed).length > 0) {
        patch[key] = { kind: 'record', values: changed };
      }
    } else {
      patch[key] = { kind: 'scalar', value: nextValue };
    }
  }

  return patch;
}

/** Apply a sparse patch without mutating `base`. */
export function applyPatch(base: BattleInput, patch: InputPatch): BattleInput {
  const result = { ...(base as unknown as Record<string, unknown>) };

  for (const [field, fieldPatch] of Object.entries(patch)) {
    if (fieldPatch.kind === 'scalar') {
      result[field] = fieldPatch.value;
      continue;
    }

    const current = isPlainRecord(result[field]) ? { ...result[field] } : {};
    for (const [waveIdx, value] of Object.entries(fieldPatch.values)) {
      current[waveIdx] = value;
    }
    result[field] = current;
  }

  return result as unknown as BattleInput;
}

/** Human-readable field list for a patch, e.g. `attackOol[1]`, `rounds[1,2]`. */
export function describePatch(patch: InputPatch): string[] {
  const parts: string[] = [];

  for (const [field, fieldPatch] of Object.entries(patch)) {
    if (fieldPatch.kind === 'scalar') {
      parts.push(field);
      continue;
    }

    const waves = Object.keys(fieldPatch.values)
      .map(Number)
      .sort((a, b) => a - b)
      .map((waveIdx) => waveIdx + 1);
    parts.push(`${field}[${waves.join(',')}]`);
  }

  return parts.sort();
}

export interface SweepLevel {
  label: string;
  patch: InputPatch;
  /** Changed fields, e.g. `attackOol[1]`. */
  changed: string[];
}

export interface SweepAxis {
  label: string;
  levels: SweepLevel[];
}

export interface SweepCase {
  label: string;
  /** Axis label -> level label, used for the results matrix. */
  factors: Record<string, string>;
  input: BattleInput;
}

export interface SweepInputLevel {
  name: string;
  input: BattleInput;
}

/** One saved group offered as a sweep axis. */
export interface SweepSource {
  label: string;
  levels: SweepInputLevel[];
}

export interface SweepLevelError {
  axis: string;
  level: string;
  message: string;
}

export interface SweepConflict {
  axisA: string;
  axisB: string;
  field: string;
  /** 0-based wave indices; empty for scalar fields. */
  waves: number[];
  valueA: string;
  valueB: string;
}

export interface SweepPlan {
  axes: SweepAxis[];
  cases: SweepCase[];
  errors: SweepLevelError[];
  conflicts: SweepConflict[];
  combinations: number;
  tooMany: boolean;
  runnable: boolean;
}

function formatValue(value: unknown): string {
  if (value === undefined) return 'unset';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '(empty)';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

interface ScalarFieldValues {
  kind: 'scalar';
  values: unknown[];
}

interface RecordFieldValues {
  kind: 'record';
  waves: Map<number, unknown[]>;
}

type FieldValues = ScalarFieldValues | RecordFieldValues;

/**
 * Collect every value an axis can set for a field. Levels that do not touch the
 * field are skipped, so an axis only conflicts when two levels actually collide.
 */
function collectFieldValues(axis: SweepAxis, field: string): FieldValues | null {
  let kind: 'scalar' | 'record' | null = null;
  const scalarValues: unknown[] = [];
  const waveValues = new Map<number, unknown[]>();

  for (const level of axis.levels) {
    const fieldPatch = level.patch[field];
    if (!fieldPatch) continue;

    if (fieldPatch.kind === 'scalar') {
      if (kind === 'record') return null;
      kind = 'scalar';
      scalarValues.push(fieldPatch.value);
      continue;
    }

    if (kind === 'scalar') return null;
    kind = 'record';
    for (const [rawWave, value] of Object.entries(fieldPatch.values)) {
      const waveIdx = Number(rawWave);
      const values = waveValues.get(waveIdx) ?? [];
      values.push(value);
      waveValues.set(waveIdx, values);
    }
  }

  if (kind === null) return null;
  return kind === 'scalar'
    ? { kind: 'scalar', values: scalarValues }
    : { kind: 'record', waves: waveValues };
}

function allEqual(values: unknown[]): boolean {
  return values.every((value) => valuesEqual(value, values[0]));
}

/**
 * Find fields that two axes both set to different values. Equal values are not
 * a conflict (both axes agree), and different wave indices do not collide.
 */
export function findConflicts(axes: SweepAxis[]): SweepConflict[] {
  const conflicts: SweepConflict[] = [];

  for (let i = 0; i < axes.length; i++) {
    for (let j = i + 1; j < axes.length; j++) {
      const axisA = axes[i];
      const axisB = axes[j];
      const fields = new Set<string>();
      for (const level of [...axisA.levels, ...axisB.levels]) {
        for (const field of Object.keys(level.patch)) fields.add(field);
      }

      for (const field of fields) {
        const a = collectFieldValues(axisA, field);
        const b = collectFieldValues(axisB, field);
        if (!a || !b) continue;

        if (a.kind !== b.kind) {
          conflicts.push({
            axisA: axisA.label,
            axisB: axisB.label,
            field,
            waves: [],
            valueA: a.kind,
            valueB: b.kind,
          });
          continue;
        }

        if (a.kind === 'scalar' && b.kind === 'scalar') {
          if (!allEqual([...a.values, ...b.values])) {
            conflicts.push({
              axisA: axisA.label,
              axisB: axisB.label,
              field,
              waves: [],
              valueA: formatValue(a.values[0]),
              valueB: formatValue(b.values[0]),
            });
          }
          continue;
        }

        if (a.kind === 'record' && b.kind === 'record') {
          const sharedWaves = [...a.waves.keys()]
            .filter((waveIdx) => b.waves.has(waveIdx))
            .sort((x, y) => x - y);
          const badWaves = sharedWaves.filter((waveIdx) => {
            const values = [...(a.waves.get(waveIdx) ?? []), ...(b.waves.get(waveIdx) ?? [])];
            return !allEqual(values);
          });
          if (badWaves.length > 0) {
            const firstWave = badWaves[0];
            conflicts.push({
              axisA: axisA.label,
              axisB: axisB.label,
              field,
              waves: badWaves,
              valueA: formatValue(a.waves.get(firstWave)?.[0]),
              valueB: formatValue(b.waves.get(firstWave)?.[0]),
            });
          }
        }
      }
    }
  }

  return conflicts;
}

function expandCases(base: BattleInput, axes: SweepAxis[]): SweepCase[] {
  const cases: SweepCase[] = [];

  const walk = (
    axisIdx: number,
    input: BattleInput,
    factors: Record<string, string>,
    labels: string[],
  ) => {
    if (axisIdx >= axes.length) {
      cases.push({ label: labels.join(' × '), factors, input });
      return;
    }

    const axis = axes[axisIdx];
    for (const level of axis.levels) {
      walk(axisIdx + 1, applyPatch(input, level.patch), { ...factors, [axis.label]: level.label }, [
        ...labels,
        level.label,
      ]);
    }
  };

  walk(0, base, {}, []);
  return cases;
}

/**
 * Turn the current base settings plus two (or more) groups of saved entries
 * into a runnable plan: per-level diffs, conflicts, and expanded combinations.
 */
export function buildSweepPlan(base: BattleInput, sources: SweepSource[]): SweepPlan {
  const errors: SweepLevelError[] = [];
  const axes: SweepAxis[] = [];
  const seenAxes = new Set<string>();
  const baseMode = base.mode ?? 'land';
  const baseWaves = base.numWaves ?? 1;

  for (const source of sources) {
    const axisLabel = source.label.trim();
    if (!axisLabel) {
      errors.push({ axis: '', level: '', message: 'Sweep axis needs a group name' });
      continue;
    }
    if (seenAxes.has(axisLabel)) {
      errors.push({
        axis: axisLabel,
        level: '',
        message: 'Pick two different groups for the sweep axes',
      });
      continue;
    }
    seenAxes.add(axisLabel);

    const levels: SweepLevel[] = [];
    const seenLevels = new Set<string>();

    for (const level of source.levels) {
      const name = level.name.trim();
      if (!name) {
        errors.push({ axis: axisLabel, level: '', message: 'Saved entry has no name' });
        continue;
      }
      if (seenLevels.has(name)) {
        errors.push({
          axis: axisLabel,
          level: name,
          message: 'Duplicate level name in this group',
        });
        continue;
      }

      const levelMode = level.input.mode ?? 'land';
      if (levelMode !== baseMode) {
        errors.push({
          axis: axisLabel,
          level: name,
          message: `saved mode "${levelMode}" ≠ current mode "${baseMode}"`,
        });
        continue;
      }

      const levelWaves = level.input.numWaves ?? baseWaves;
      if (levelWaves !== baseWaves) {
        errors.push({
          axis: axisLabel,
          level: name,
          message: `saved wave count ${levelWaves} ≠ current ${baseWaves}`,
        });
        continue;
      }

      seenLevels.add(name);
      const patch = diffInput(base, level.input);
      levels.push({ label: name, patch, changed: describePatch(patch) });
    }

    if (levels.length === 0) {
      errors.push({
        axis: axisLabel,
        level: '',
        message: 'No usable saved entries in this group',
      });
    }

    axes.push({ label: axisLabel, levels });
  }

  const conflicts = findConflicts(axes);
  const combinations =
    axes.length === 0 ? 0 : axes.reduce((count, axis) => count * axis.levels.length, 1);
  const tooMany = combinations > MAX_SWEEP_CASES;
  const cases = tooMany || axes.length === 0 ? [] : expandCases(base, axes);

  return {
    axes,
    cases,
    errors,
    conflicts,
    combinations,
    tooMany,
    runnable: errors.length === 0 && conflicts.length === 0 && !tooMany && cases.length > 0,
  };
}

/** Axis labels and level order derived from evaluated sweep rows (for the matrix). */
export interface FactorAxis {
  label: string;
  levels: string[];
}

export function factorAxes(rows: BatchRow[]): FactorAxis[] {
  const labels: string[] = [];
  for (const row of rows) {
    for (const label of Object.keys(row.factors ?? {})) {
      if (!labels.includes(label)) labels.push(label);
    }
  }

  return labels.map((label) => {
    const levels: string[] = [];
    for (const row of rows) {
      const level = row.factors?.[label];
      if (level !== undefined && !levels.includes(level)) levels.push(level);
    }
    return { label, levels };
  });
}

/** Convenience adapter for the common case: all entries of a saved group. */
export function groupToSource(group: string, entries: HistoryEntry[]): SweepSource {
  return {
    label: group,
    levels: entries.map((entry) => ({ name: entry.name, input: entry.input })),
  };
}

import { multiwaveComplexityFastV2, type MultiwaveOutput } from 'aacalc2'
import { buildMultiwaveInput, computeBattle, computeSbrBattle } from '../engine.ts'
import type { BattleInput, BattleMode, HistoryEntry } from '../types.ts'

/** The inputs that stay fixed (current UI state) across a batch run. */
export interface BatchArmies {
  attack: Record<number, Record<string, number>>
  defense: Record<number, Record<string, number>>
  mode: BattleMode
  numWaves: number
}

export type BatchRowStatus = 'ok' | 'skipped' | 'error'

/** Metrics are taken from the final wave, mirroring the "All Waves Summary". */
export interface BatchMetrics {
  profit: number
  defLoss: number
  attLoss: number
  defSurv: number
  attSurv: number
  takes: number
  rounds: number
}

export interface BatchRow extends Partial<BatchMetrics> {
  group: string
  name: string
  status: BatchRowStatus
  note?: string
  runtimeMs?: number
}

export interface BatchEvaluation {
  output: MultiwaveOutput
  runtimeMs: number
}

export interface BatchOptions {
  /** Same guard the single-run path uses: skip battles above this complexity. */
  complexityThreshold: number
  evaluate?: (input: BattleInput) => BatchEvaluation
  shouldCancel?: () => boolean
  onProgress?: (done: number, total: number) => void
}

/**
 * Take the saved entry's settings, but the current (fixed) armies.
 * Only attack/defense/mode/numWaves are overridden.
 */
export function mergeEntryInput(entry: HistoryEntry, armies: BatchArmies): BattleInput {
  return {
    ...entry.input,
    attack: armies.attack,
    defense: armies.defense,
    mode: armies.mode,
    numWaves: armies.numWaves,
  }
}

export function extractMetrics(
  output: MultiwaveOutput,
  runtimeMs: number,
): BatchMetrics & { runtimeMs: number } {
  const finalIdx = Math.max(0, (output.waves ?? 1) - 1)
  const attLoss = output.attack?.cumulativeIpcLoss?.[finalIdx] ?? 0
  const defLoss = output.defense?.cumulativeIpcLoss?.[finalIdx] ?? 0

  return {
    attLoss,
    defLoss,
    // The two losses are accumulated independently, so an equal-loss battle can
    // land a few ULPs below zero (rendering as "-0.000"). The epsilon absorbs it.
    profit: defLoss - attLoss + PROFIT_EPSILON,
    attSurv: output.attack?.survives?.[finalIdx] ?? 0,
    defSurv: output.defense?.survives?.[finalIdx] ?? 0,
    takes: output.takesTerritory?.[finalIdx] ?? 0,
    rounds: output.rounds?.[finalIdx] ?? 0,
    runtimeMs,
  }
}

/** Default evaluator: run the battle and time it. */
export function evaluateBattle(input: BattleInput): BatchEvaluation {
  const start = performance.now()
  const output = input.mode === 'sbr' ? computeSbrBattle(input) : computeBattle(input)
  return { output, runtimeMs: performance.now() - start }
}

function evaluateEntry(
  entry: HistoryEntry,
  armies: BatchArmies,
  options: BatchOptions,
  evaluate: (input: BattleInput) => BatchEvaluation,
): BatchRow {
  const base = { group: entry.group, name: entry.name }
  const savedMode = entry.input.mode ?? 'land'

  // Armies are mode-bound, so a settings variant saved for another mode cannot
  // be replayed against the current armies.
  if (savedMode !== armies.mode) {
    return {
      ...base,
      status: 'skipped',
      note: `saved mode "${savedMode}" ≠ current mode "${armies.mode}"`,
    }
  }

  const input = mergeEntryInput(entry, armies)

  if (armies.mode !== 'sbr') {
    const complexity = multiwaveComplexityFastV2(buildMultiwaveInput(input))
    if (complexity > options.complexityThreshold) {
      return {
        ...base,
        status: 'skipped',
        note: `complexity ${Math.round(complexity)} > threshold ${options.complexityThreshold}`,
      }
    }
  }

  try {
    const { output, runtimeMs } = evaluate(input)
    return { ...base, status: 'ok', ...extractMetrics(output, runtimeMs) }
  } catch (err) {
    return {
      ...base,
      status: 'error',
      note: (err as Error).message ?? 'unknown error',
    }
  }
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Evaluate every entry in a group against the current armies.
 *
 * Entries are evaluated one at a time with a macrotask yield in between so the
 * UI can repaint progress (battles can take seconds each). Cancelling returns
 * the rows completed so far.
 */
export async function runBatch(
  entries: HistoryEntry[],
  armies: BatchArmies,
  options: BatchOptions,
): Promise<BatchRow[]> {
  const evaluate = options.evaluate ?? evaluateBattle
  const rows: BatchRow[] = []
  const total = entries.length

  for (let i = 0; i < total; i++) {
    if (options.shouldCancel?.()) break

    rows.push(evaluateEntry(entries[i], armies, options, evaluate))
    options.onProgress?.(i + 1, total)

    if (i < total - 1) await yieldToUi()
  }

  return rows
}

const BATCH_COLUMNS = [
  'profit',
  'defLoss',
  'attLoss',
  'defSurv',
  'attSurv',
  'takes',
  'rounds',
  'runtime',
  'description',
] as const

/** Absorbs float noise when deriving profit from two independently summed losses. */
export const PROFIT_EPSILON = 1e-10

function formatNumber(value: number | undefined, decimals: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  const zero = (0).toFixed(decimals)
  const text = value.toFixed(decimals)
  // Never render noise-level negatives as "-0.000".
  return text === `-${zero}` ? zero : text
}

function describeRow(row: BatchRow): string {
  return row.note ? `${row.name} [${row.status}: ${row.note}]` : row.name
}

/** Render the batch rows as a fixed-width text table with left-aligned columns. */
export function formatBatchTable(rows: BatchRow[], decimals = 3): string {
  const cells: string[][] = rows.map((row) => [
    formatNumber(row.profit, decimals),
    formatNumber(row.defLoss, decimals),
    formatNumber(row.attLoss, decimals),
    formatNumber(row.defSurv, decimals),
    formatNumber(row.attSurv, decimals),
    formatNumber(row.takes, decimals),
    formatNumber(row.rounds, decimals),
    formatNumber(row.runtimeMs, decimals),
    describeRow(row),
  ])

  const headers: readonly string[] = BATCH_COLUMNS
  const widths = headers.map((header, idx) =>
    Math.max(header.length, ...cells.map((row) => row[idx].length)),
  )

  return [headers as string[], ...cells]
    .map((row) =>
      row
        .map((cell, idx) => cell.padEnd(widths[idx]))
        .join('  ')
        .replace(/\s+$/, ''),
    )
    .join('\n')
}

import { describe, expect, it, vi } from 'vitest'
import type { MultiwaveOutput } from 'aacalc2'
import type { BattleInput, HistoryEntry } from '../types.ts'
import {
  extractMetrics,
  formatBatchTable,
  mergeEntryInput,
  PROFIT_EPSILON,
  runBatch,
  type BatchArmies,
  type BatchRow,
} from './batchEval.ts'

function makeOutput(waves = 2): MultiwaveOutput {
  return {
    attack: {
      survives: [0.9, 0.637],
      ipcLoss: [10, 25],
      incrementalLoss: [10, 15],
      cumulativeIpcLoss: [10, 25],
    },
    defense: {
      survives: [0.8, 0.362],
      ipcLoss: [20, 40],
      incrementalLoss: [20, 20],
      cumulativeIpcLoss: [20, 40],
    },
    casualtiesInfo: {},
    casualtiesInfoArr: [],
    profitDistribution: [],
    takesTerritory: [0.1, 0.484],
    rounds: [3.2, 5.418],
    waves,
    complexity: 100,
  } as unknown as MultiwaveOutput
}

function makeInput(overrides: Partial<BattleInput> = {}): BattleInput {
  return {
    attack: { 0: { inf: 1 } },
    defense: { 0: { inf: 1 } },
    attackOol: { 0: ['inf'] },
    defenseOol: { 0: ['inf'] },
    rounds: { 0: '3' },
    retreatModes: { 0: 'expectedIpcProfit' },
    retreatExpectedIpcProfitThresholds: { 0: 5 },
    diceMode: 'lowluck',
    mode: 'land',
    numWaves: 1,
    ...overrides,
  }
}

function makeEntry(name: string, input: BattleInput = makeInput()): HistoryEntry {
  return { group: 'g', name, timestamp: 0, input }
}

const ARMIES: BatchArmies = {
  attack: { 0: { inf: 164, art: 82 } },
  defense: { 0: { inf: 118, art: 85 } },
  mode: 'land',
  numWaves: 1,
}

describe('mergeEntryInput', () => {
  it('keeps entry settings but takes the current armies', () => {
    const entry = makeEntry('variant')
    const merged = mergeEntryInput(entry, ARMIES)

    expect(merged.attack).toBe(ARMIES.attack)
    expect(merged.defense).toBe(ARMIES.defense)
    expect(merged.mode).toBe('land')
    expect(merged.numWaves).toBe(1)
    // Settings stay from the entry.
    expect(merged.rounds).toEqual({ 0: '3' })
    expect(merged.attackOol).toEqual({ 0: ['inf'] })
    expect(merged.diceMode).toBe('lowluck')
    expect(merged.retreatModes).toEqual({ 0: 'expectedIpcProfit' })
  })

  it('overrides mode and numWaves with the current values', () => {
    const entry = makeEntry('variant', makeInput({ mode: 'land', numWaves: 3 }))
    const armies: BatchArmies = { ...ARMIES, mode: 'sea', numWaves: 2 }
    const merged = mergeEntryInput(entry, armies)
    expect(merged.mode).toBe('sea')
    expect(merged.numWaves).toBe(2)
  })
})

describe('extractMetrics', () => {
  it('reads the final wave and derives profit', () => {
    const metrics = extractMetrics(makeOutput(2), 1234.5)
    expect(metrics.attLoss).toBe(25)
    expect(metrics.defLoss).toBe(40)
    // profit carries the PROFIT_EPSILON noise guard.
    expect(metrics.profit).toBeCloseTo(15, 9)
    expect(metrics.attSurv).toBe(0.637)
    expect(metrics.defSurv).toBe(0.362)
    expect(metrics.takes).toBe(0.484)
    expect(metrics.rounds).toBe(5.418)
    expect(metrics.runtimeMs).toBe(1234.5)
  })

  it('absorbs float noise when deriving profit', () => {
    const output = makeOutput(1)
    output.defense.cumulativeIpcLoss[0] = 474.278
    output.attack.cumulativeIpcLoss[0] = 474.278 + 1e-11

    const row: BatchRow = {
      group: 'g',
      name: 'ev retreat',
      status: 'ok',
      ...extractMetrics(output, 1),
    }
    expect(formatBatchTable([row]).split('\n')[1]).toMatch(/^0\.000/)
  })

  it('defaults missing arrays to zero', () => {
    const output = { waves: 1 } as unknown as MultiwaveOutput
    const metrics = extractMetrics(output, 1)
    expect(metrics).toEqual({
      attLoss: 0,
      defLoss: 0,
      profit: PROFIT_EPSILON,
      attSurv: 0,
      defSurv: 0,
      takes: 0,
      rounds: 0,
      runtimeMs: 1,
    })
  })
})

describe('runBatch', () => {
  it('evaluates every entry and reports progress', async () => {
    const evaluate = vi.fn(() => ({ output: makeOutput(1), runtimeMs: 12.5 }))
    const onProgress = vi.fn()

    const rows = await runBatch(
      [makeEntry('sbr a', makeInput({ mode: 'sbr' })), makeEntry('sbr b', makeInput({ mode: 'sbr' }))],
      { ...ARMIES, mode: 'sbr' },
      { complexityThreshold: 200000, evaluate, onProgress },
    )

    expect(rows.map((r) => r.name)).toEqual(['sbr a', 'sbr b'])
    expect(rows.every((r) => r.status === 'ok')).toBe(true)
    expect(rows[0].profit).toBeCloseTo(10, 9)
    expect(rows[0].runtimeMs).toBe(12.5)
    expect(evaluate).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2)
  })

  it('skips entries saved for a different mode', async () => {
    const evaluate = vi.fn(() => ({ output: makeOutput(1), runtimeMs: 1 }))
    const rows = await runBatch(
      [makeEntry('sea variant', makeInput({ mode: 'sea' }))],
      ARMIES,
      { complexityThreshold: 200000, evaluate },
    )

    expect(rows[0].status).toBe('skipped')
    expect(rows[0].note).toContain('saved mode "sea"')
    expect(evaluate).not.toHaveBeenCalled()
  })

  it('skips battles above the complexity threshold', async () => {
    const evaluate = vi.fn(() => ({ output: makeOutput(1), runtimeMs: 1 }))
    const rows = await runBatch([makeEntry('huge')], ARMIES, {
      complexityThreshold: -1,
      evaluate,
    })

    expect(rows[0].status).toBe('skipped')
    expect(rows[0].note).toContain('complexity')
    expect(evaluate).not.toHaveBeenCalled()
  })

  it('records engine errors and keeps going', async () => {
    const evaluate = vi.fn(() => {
      throw new Error('boom')
    })
    const rows = await runBatch(
      [makeEntry('a', makeInput({ mode: 'sbr' })), makeEntry('b', makeInput({ mode: 'sbr' }))],
      { ...ARMIES, mode: 'sbr' },
      { complexityThreshold: 200000, evaluate },
    )

    expect(rows.map((r) => r.status)).toEqual(['error', 'error'])
    expect(rows[0].note).toBe('boom')
  })

  it('runs a real land battle through the default evaluator', async () => {
    const rows = await runBatch(
      [makeEntry('small land fight', makeInput({ mode: 'land' }))],
      {
        attack: { 0: { inf: 3 } },
        defense: { 0: { inf: 2 } },
        mode: 'land',
        numWaves: 1,
      },
      { complexityThreshold: 200000 },
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('ok')
    expect(rows[0].profit).toBeCloseTo((rows[0].defLoss ?? 0) - (rows[0].attLoss ?? 0), 9)
    expect(rows[0].runtimeMs).toBeGreaterThanOrEqual(0)
    expect(rows[0].rounds).toBeGreaterThan(0)
    expect(rows[0].attSurv).toBeGreaterThanOrEqual(0)
    expect(rows[0].attSurv).toBeLessThanOrEqual(1)
  })

  it('returns partial rows when cancelled', async () => {
    let done = 0
    const rows = await runBatch(
      [
        makeEntry('a', makeInput({ mode: 'sbr' })),
        makeEntry('b', makeInput({ mode: 'sbr' })),
        makeEntry('c', makeInput({ mode: 'sbr' })),
      ],
      { ...ARMIES, mode: 'sbr' },
      {
        complexityThreshold: 200000,
        evaluate: () => ({ output: makeOutput(1), runtimeMs: 1 }),
        shouldCancel: () => {
          done += 1
          return done > 1 // allow the first entry, cancel before the second
        },
      },
    )

    expect(rows.map((r) => r.name)).toEqual(['a'])
  })
})

describe('formatBatchTable', () => {
  const rows: BatchRow[] = [
    {
      group: 'g',
      name: 'no retreat',
      status: 'ok',
      profit: 138.7721,
      defLoss: 1474.6651,
      attLoss: 1335.893,
      defSurv: 0.3623,
      attSurv: 0.6374,
      takes: 0.4841,
      rounds: 5.4182,
      runtimeMs: 2012.8084,
    },
    {
      group: 'g',
      name: 'EV retreat',
      status: 'ok',
      profit: 213.991,
      defLoss: 1307.637,
      attLoss: 1093.646,
      defSurv: 0.378,
      attSurv: 1,
      takes: 0.483,
      rounds: 4.26,
      runtimeMs: 12043.937,
    },
    { group: 'g', name: 'huge', status: 'skipped', note: 'complexity 900000 > threshold 200000' },
  ]

  it('starts with the requested header row', () => {
    const lines = formatBatchTable(rows).split('\n')
    expect(lines[0].split(/\s{2,}/).map((token) => token.trim())).toEqual([
      'profit',
      'defLoss',
      'attLoss',
      'defSurv',
      'attSurv',
      'takes',
      'rounds',
      'runtime',
      'description',
    ])
  })

  it('left-aligns every column', () => {
    const lines = formatBatchTable(rows).split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[0].startsWith('profit')).toBe(true)
    expect(lines[1]).toMatch(/^138\.772 {2}1474\.665 {2}1335\.893/)
    expect(lines[1]).toMatch(/2012\.808\s+no retreat$/)
    expect(lines[2]).toMatch(/12043\.937\s+EV retreat$/)
    // Every column starts at the same offset on every line.
    const descIdx = ['no retreat', 'EV retreat', 'huge'].map((name, idx) =>
      lines[idx + 1].indexOf(name),
    )
    expect(new Set(descIdx).size).toBe(1)
  })

  it('marks skipped rows and pads missing metrics with dashes', () => {
    const lines = formatBatchTable(rows).split('\n')
    expect(lines[3].startsWith('-')).toBe(true)
    expect(lines[3]).toContain('huge [skipped: complexity 900000 > threshold 200000]')
  })

  it('honours the decimal count', () => {
    const line = formatBatchTable([rows[0]], 1).split('\n')[1]
    expect(line).toContain('138.8')
    expect(line).not.toContain('138.772')
  })

  it('never renders a negative zero', () => {
    const row: BatchRow = {
      group: 'g',
      name: 'noise',
      status: 'ok',
      profit: -1e-13,
      defLoss: 200,
      attLoss: 200,
    }
    const line = formatBatchTable([row]).split('\n')[1]
    expect(line.startsWith('0.000')).toBe(true)
    expect(line).not.toContain('-0.000')
  })
})

import { describe, expect, it } from 'vitest'
import type { BattleInput, HistoryEntry } from '../types.ts'
import {
  DEFAULT_GROUP,
  groupHistory,
  historyEntryKey,
  normalizeHistory,
  removeHistoryEntry,
  removeHistoryGroup,
  renameHistoryGroup,
  upsertHistoryEntry,
} from './history.ts'

function makeInput(inf = 1): BattleInput {
  return { attack: { 0: { inf } }, defense: { 0: { inf: 1 } }, retreatModes: {} }
}

function entry(group: string, name: string, timestamp = 0): HistoryEntry {
  return { group, name, timestamp, input: makeInput() }
}

describe('normalizeHistory', () => {
  it('returns an empty list for non-arrays', () => {
    expect(normalizeHistory(null)).toEqual([])
    expect(normalizeHistory({})).toEqual([])
    expect(normalizeHistory('nope')).toEqual([])
  })

  it('migrates legacy id-keyed entries into the default group', () => {
    const result = normalizeHistory([
      { id: 'old battle', name: 'old battle', timestamp: 123, input: makeInput() },
    ])
    expect(result).toEqual([entry(DEFAULT_GROUP, 'old battle', 123)])
  })

  it('prefers a legacy name over the id and trims it', () => {
    const result = normalizeHistory([{ id: 'a', name: '  kept  ', input: makeInput() }])
    expect(result[0].name).toBe('kept')
  })

  it('falls back to the id when the name is missing', () => {
    const result = normalizeHistory([{ id: 'from-id', input: makeInput() }])
    expect(result[0].name).toBe('from-id')
  })

  it('keeps an explicit group and defaults a blank one', () => {
    const result = normalizeHistory([
      { group: ' Moscow ', name: 'a', input: makeInput() },
      { group: '   ', name: 'b', input: makeInput() },
    ])
    expect(result[0].group).toBe('Moscow')
    expect(result[1].group).toBe(DEFAULT_GROUP)
  })

  it('drops malformed entries', () => {
    const result = normalizeHistory([
      null,
      'nope',
      { name: 'no input' },
      { name: '   ', input: makeInput() },
      { name: 'ok', input: makeInput() },
    ])
    expect(result.map((e) => e.name)).toEqual(['ok'])
  })
})

describe('historyEntryKey', () => {
  it('distinguishes the same name in different groups', () => {
    expect(historyEntryKey({ group: 'a', name: 'x' })).not.toBe(
      historyEntryKey({ group: 'b', name: 'x' }),
    )
  })
})

describe('groupHistory', () => {
  it('groups entries in first-appearance order', () => {
    const groups = groupHistory([
      entry('b', '1'),
      entry('a', '2'),
      entry('b', '3'),
    ])
    expect(groups.map((g) => g.group)).toEqual(['b', 'a'])
    expect(groups[0].entries.map((e) => e.name)).toEqual(['1', '3'])
    expect(groups[1].entries.map((e) => e.name)).toEqual(['2'])
  })
})

describe('upsertHistoryEntry', () => {
  it('adds new entries at the top', () => {
    const next = upsertHistoryEntry([entry('g', 'old')], entry('g', 'new'))
    expect(next.map((e) => e.name)).toEqual(['new', 'old'])
  })

  it('replaces an entry with the same group and name', () => {
    const next = upsertHistoryEntry(
      [entry('g', 'a'), entry('g', 'b')],
      entry('g', 'b', 99),
    )
    expect(next.map((e) => e.name)).toEqual(['b', 'a'])
    expect(next[0].timestamp).toBe(99)
  })

  it('treats the same name in another group as distinct', () => {
    const next = upsertHistoryEntry([entry('g1', 'a')], entry('g2', 'a'))
    expect(next).toHaveLength(2)
  })

  it('caps only the affected group', () => {
    const prev = [entry('g', '0'), entry('g', '1'), entry('other', 'keep')]
    const next = upsertHistoryEntry(prev, entry('g', '2'), 2)
    expect(next.filter((e) => e.group === 'g').map((e) => e.name)).toEqual(['2', '0'])
    expect(next.some((e) => e.group === 'other')).toBe(true)
  })
})

describe('remove helpers', () => {
  it('removes a single entry by group and name', () => {
    const prev = [entry('g', 'a'), entry('g2', 'a')]
    expect(removeHistoryEntry(prev, 'g', 'a').map((e) => e.group)).toEqual(['g2'])
  })

  it('removes a whole group', () => {
    const prev = [entry('g', 'a'), entry('g', 'b'), entry('g2', 'a')]
    expect(removeHistoryGroup(prev, 'g').map((e) => e.group)).toEqual(['g2'])
  })
})

describe('renameHistoryGroup', () => {
  it('retags every entry of the group', () => {
    const next = renameHistoryGroup([entry('old', 'a'), entry('other', 'b')], 'old', 'new')
    expect(next.map((e) => e.group)).toEqual(['new', 'other'])
    expect(next[0].name).toBe('a')
  })

  it('keeps entry order when renaming', () => {
    const prev = [entry('old', 'a'), entry('other', 'b'), entry('old', 'c')]
    const next = renameHistoryGroup(prev, 'old', 'new')
    expect(next.map((e) => `${e.group}/${e.name}`)).toEqual([
      'new/a',
      'other/b',
      'new/c',
    ])
  })

  it('merges into an existing group, with the renamed entry winning collisions', () => {
    const prev = [
      entry('target', 'shared', 1),
      entry('target', 'only-target', 2),
      entry('from', 'shared', 3),
    ]
    const next = renameHistoryGroup(prev, 'from', 'target')
    expect(next.map((e) => `${e.group}/${e.name}`)).toEqual([
      'target/only-target',
      'target/shared',
    ])
    // The surviving colliding entry is the renamed one (timestamp 3), not the
    // pre-existing target entry (timestamp 1).
    expect(next[1].timestamp).toBe(3)
  })

  it('is a no-op for blank or identical names', () => {
    const prev = [entry('g', 'a')]
    expect(renameHistoryGroup(prev, 'g', '  ')).toBe(prev)
    expect(renameHistoryGroup(prev, 'g', 'g')).toBe(prev)
  })

  it('is a no-op when the group does not exist', () => {
    const prev = [entry('g', 'a')]
    expect(renameHistoryGroup(prev, 'missing', 'new')).toBe(prev)
  })
})

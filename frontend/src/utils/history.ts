import type { BattleInput, HistoryEntry } from '../types.ts'

/**
 * Group used for entries saved before groups existed (and for saves made with an
 * empty group field).
 */
export const DEFAULT_GROUP = 'Default'

export const MAX_ENTRIES_PER_GROUP = 50

export interface HistoryGroup {
  group: string
  entries: HistoryEntry[]
}

/** Stable key for the `group / name` pair (React keys, lookups). */
export function historyEntryKey(entry: Pick<HistoryEntry, 'group' | 'name'>): string {
  return `${entry.group}::${entry.name}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Coerce whatever is in localStorage into HistoryEntry[].
 *
 * Legacy entries were keyed by a single `id`/`name`; they are migrated into
 * DEFAULT_GROUP. Malformed entries are dropped rather than crashing the app.
 */
export function normalizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return []

  const entries: HistoryEntry[] = []
  for (const item of raw) {
    if (!isRecord(item) || !isRecord(item.input)) continue

    const rawName =
      typeof item.name === 'string' ? item.name : typeof item.id === 'string' ? item.id : ''
    const name = rawName.trim()
    if (!name) continue

    const rawGroup = typeof item.group === 'string' ? item.group.trim() : ''
    const timestamp = typeof item.timestamp === 'number' ? item.timestamp : 0

    entries.push({
      group: rawGroup || DEFAULT_GROUP,
      name,
      timestamp,
      input: item.input as unknown as BattleInput,
    })
  }
  return entries
}

/**
 * Bucket entries by group, preserving store order. Groups appear in the order
 * their first (newest) entry appears, so the most recently touched group is
 * first.
 */
export function groupHistory(entries: HistoryEntry[]): HistoryGroup[] {
  const groups: HistoryGroup[] = []
  const byName = new Map<string, HistoryGroup>()

  for (const entry of entries) {
    let bucket = byName.get(entry.group)
    if (!bucket) {
      bucket = { group: entry.group, entries: [] }
      byName.set(entry.group, bucket)
      groups.push(bucket)
    }
    bucket.entries.push(entry)
  }
  return groups
}

/**
 * Insert/replace an entry keyed by `group / name`, newest first, trimming only
 * the affected group.
 */
export function upsertHistoryEntry(
  prev: HistoryEntry[],
  entry: HistoryEntry,
  capPerGroup = MAX_ENTRIES_PER_GROUP,
): HistoryEntry[] {
  const withoutExisting = prev.filter(
    (e) => !(e.group === entry.group && e.name === entry.name),
  )
  const next = [entry, ...withoutExisting]

  const sameGroup = next.filter((e) => e.group === entry.group)
  if (sameGroup.length <= capPerGroup) return next

  const kept = new Set(sameGroup.slice(0, capPerGroup))
  return next.filter((e) => e.group !== entry.group || kept.has(e))
}

export function removeHistoryEntry(
  prev: HistoryEntry[],
  group: string,
  name: string,
): HistoryEntry[] {
  return prev.filter((e) => !(e.group === group && e.name === name))
}

export function removeHistoryGroup(prev: HistoryEntry[], group: string): HistoryEntry[] {
  return prev.filter((e) => e.group !== group)
}

/**
 * Rename `from` to `to`.
 *
 * When `to` already exists the groups are merged; on a `name` collision the
 * renamed entry wins (the target's same-named entry is dropped). Entries keep
 * their relative order, so a merge does not reshuffle the panel.
 */
export function renameHistoryGroup(
  prev: HistoryEntry[],
  from: string,
  to: string,
): HistoryEntry[] {
  const target = to.trim()
  if (!target || target === from) return prev

  const moving = prev.filter((e) => e.group === from)
  if (moving.length === 0) return prev

  const movingNames = new Set(moving.map((e) => e.name))

  return prev
    .filter((e) => !(e.group === target && movingNames.has(e.name)))
    .map((e) => (e.group === from ? { ...e, group: target } : e))
}

import type { UnitSummary } from '../types.ts'

// Unit stats (IPC cost, attack power, defense power, hit points)
// Based on A&A standard rules
export const UNIT_STATS = {
  inf: { cost: 3, att: 1, def: 2, hits: 1 },
  art: { cost: 4, att: 2, def: 2, hits: 1 },
  arm: { cost: 6, att: 3, def: 3, hits: 1 },
  fig: { cost: 10, att: 3, def: 4, hits: 1 },
  bom: { cost: 12, att: 4, def: 1, hits: 1 },
  aa: { cost: 5, att: 0, def: 0, hits: 1 },
  sub: { cost: 6, att: 2, def: 1, hits: 1 },
  tra: { cost: 7, att: 0, def: 0, hits: 1 },
  des: { cost: 8, att: 2, def: 2, hits: 1 },
  cru: { cost: 12, att: 3, def: 3, hits: 1 },
  acc: { cost: 14, att: 1, def: 2, hits: 1 },
  bat: { cost: 20, att: 4, def: 4, hits: 2 },
  dbat: { cost: 20, att: 4, def: 4, hits: 1 },
  ic: { cost: 1, att: 0, def: 0, hits: 1 },
  inf_a: { cost: 3, att: 1, def: 2, hits: 1 },
  art_a: { cost: 4, att: 2, def: 2, hits: 1 },
  arm_a: { cost: 6, att: 3, def: 3, hits: 1 },
  bat1: { cost: 20, att: 4, def: 4, hits: 2 },
} as const

function getUnitKeyFromChar(char: string): string | undefined {
  const charMap: Record<string, keyof typeof UNIT_STATS> = {
    i: 'inf',
    a: 'art',
    t: 'arm',
    f: 'fig',
    b: 'bom',
    c: 'aa',
    S: 'sub',
    T: 'tra',
    D: 'des',
    C: 'cru',
    A: 'acc',
    B: 'bat',
    F: 'dbat',
    p: 'ic',
    j: 'inf_a',
    g: 'art_a',
    u: 'arm_a',
    E: 'bat1',
  }
  return charMap[char]
}

/**
 * Calculate unit summary from a unit string (e.g., "3i2a1f")
 * In land mode, battleships and cruisers contribute 0 hit points (bombard only)
 */
export function calculateUnitSummary(
  unitString: string,
  isAttacker: boolean,
  isLandMode: boolean,
): UnitSummary {
  const unitCounts: Record<string, number> = {}
  let i = 0
  while (i < unitString.length) {
    let numStr = ''
    while (i < unitString.length && /\d/.test(unitString[i])) {
      numStr += unitString[i]
      i++
    }
    const count = numStr ? parseInt(numStr, 10) : 1

    if (i < unitString.length) {
      const char = unitString[i]
      const statKey = getUnitKeyFromChar(char)
      if (statKey) {
        unitCounts[statKey] = (unitCounts[statKey] || 0) + count
      }
      i++
    }
  }

  let unitCount = 0
  let cost = 0
  let hitPoints = 0
  let power = 0

  for (const [unitKey, count] of Object.entries(unitCounts)) {
    const stat = UNIT_STATS[unitKey as keyof typeof UNIT_STATS]
    if (stat) {
      unitCount += count
      cost += stat.cost * count
      power += (isAttacker ? stat.att : stat.def) * count

      const isBombardOnly = isLandMode && (unitKey === 'bat' || unitKey === 'bat1' || unitKey === 'cru' || unitKey === 'dbat' || unitKey === 'acc')
      hitPoints += (isBombardOnly ? 0 : stat.hits) * count
    }
  }

  // Artillery support rule for attackers in land mode
  if (isAttacker && isLandMode) {
    const artCount = (unitCounts['art'] || 0) + (unitCounts['art_a'] || 0)
    const infCount = (unitCounts['inf'] || 0) + (unitCounts['inf_a'] || 0)

    if (artCount > 0 && artCount <= infCount) {
      power += artCount
    } else if (artCount > infCount && infCount > 0) {
      power += infCount
    }
  }

  return { unitCount, cost, hitPoints, power }
}

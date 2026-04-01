// Mode identifiers
export const MODES = {
  SEA: 'sea',
  LAND: 'land',
  SBR: 'sbr',
} as const

// Round options
export const ROUND_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
] as const

// Retreat option types
export const RETREAT_OPTION_TYPES = {
  UNIT_COUNT: 'unitCount',
  EXPECTED_IPC_PROFIT: 'expectedIpcProfit',
  PROBABILITY_WINS: 'probabilityWins',
  STRAFE: 'strafe',
  LOSE_AIR: 'loseAir',
} as const

export const RETREAT_OPTIONS = [
  {
    id: RETREAT_OPTION_TYPES.UNIT_COUNT,
    label: 'Retreat if Number of Attacking Units ≤',
    thresholdField: 'retreatThreshold' as const,
  },
  {
    id: RETREAT_OPTION_TYPES.EXPECTED_IPC_PROFIT,
    label: 'Expected IPC Profit <',
    thresholdField: 'retreatExpectedIpcProfitThreshold' as const,
  },
  {
    id: RETREAT_OPTION_TYPES.PROBABILITY_WINS,
    label: 'Probability Wins ≤',
    thresholdField: 'retreatPwinThreshold' as const,
  },
  {
    id: RETREAT_OPTION_TYPES.STRAFE,
    label: 'Probability of Killing Defenders >',
    thresholdField: 'retreatStrafeThreshold' as const,
  },
  {
    id: RETREAT_OPTION_TYPES.LOSE_AIR,
    label: 'Probability of Losing Air >',
    thresholdField: 'retreatLoseAirProbabilityThreshold' as const,
  },
] as const

// Default OOL presets
export const DEFAULT_OOL_PRESETS = {
  attackDefault: 'inf-art-tnk-fig-bom',
  defenseDefault: 'aa-inf-art-tnk-bom-fig',
} as const

// Sea mode controls
export const SEA_CONTROLS = [
  { key: 'attackerSubmerge', label: 'Attacker Submerge Sub' },
  { key: 'attackerDestroyerLast', label: 'Attacker Destroyer Last' },
  { key: 'defenderSubmerge', label: 'Defender Submerge Sub' },
  { key: 'defenderDestroyerLast', label: 'Defender Destroyer Last' },
  { key: 'crashFighters', label: 'Crash Fighters' },
] as const

// Styles
export const WAVE_OPTIONS_BORDER_STYLE = {
  borderTop: '1px solid #ddd',
  paddingTop: '10px',
} as const

export const RETREAT_LABEL_STYLE = {
  display: 'block' as const,
  marginBottom: '8px',
  fontSize: '13px',
  color: '#666',
  fontWeight: 500,
} as const

export const CHECKBOX_LABEL_STYLE = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: '6px',
  margin: 0,
} as const

export const SEA_CONTROLS_GRID_STYLE = {
  display: 'grid' as const,
  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
  gap: '10px',
} as const

export const LAND_OPTIONS_GRID_STYLE = {
  display: 'grid' as const,
  gridTemplateColumns: '1fr 1fr 1fr 1fr',
  gap: '10px',
  marginBottom: '10px',
} as const

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

export interface UnitSummary {
  unitCount: number
  cost: number
  hitPoints: number
  power: number // att value for attackers, def value for defenders
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
  // Parse unit string into counts map
  const unitCounts: Record<string, number> = {}
  let i = 0
  while (i < unitString.length) {
    // Extract number (if present)
    let numStr = ''
    while (i < unitString.length && /\d/.test(unitString[i])) {
      numStr += unitString[i]
      i++
    }
    const count = numStr ? parseInt(numStr, 10) : 1
    
    // Extract unit character
    if (i < unitString.length) {
      const char = unitString[i]
      const statKey = getUnitKeyFromChar(char)
      if (statKey) {
        unitCounts[statKey] = (unitCounts[statKey] || 0) + count
      }
      i++
    }
  }

  // Calculate totals
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
      
      // Land mode: Battleships and Cruisers (bombard) have 0 hits
      const isBombardOnly = isLandMode && (unitKey === 'bat' || unitKey === 'bat1' || unitKey === 'cru' || unitKey === 'dbat' || unitKey === 'acc')
      hitPoints += (isBombardOnly ? 0 : stat.hits) * count
    }
  }

  // Artillery support rule for attackers in land mode:
  // Each artillery can support one infantry, increasing the artillery's power by 1
  if (isAttacker && isLandMode) {
    const artCount = (unitCounts['art'] || 0) + (unitCounts['art_a'] || 0)
    const infCount = (unitCounts['inf'] || 0) + (unitCounts['inf_a'] || 0)
    
    if (artCount > 0 && artCount <= infCount) {
      // All artilleries can be supported
      power += artCount
    } else if (artCount > infCount && infCount > 0) {
      // Only some artilleries can be supported
      power += infCount
    }
  }

  return { unitCount, cost, hitPoints, power }
}

/**
 * Map unit character codes to their keys
 */
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

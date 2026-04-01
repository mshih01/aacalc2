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

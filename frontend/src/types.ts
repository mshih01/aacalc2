export type BattleMode = 'land' | 'sea' | 'sbr'

const unitIds = [
  'inf',
  'art',
  'arm',
  'fig',
  'bom',
  'sub',
  'tra',
  'des',
  'cru',
  'acc',
  'bat',
  'dbat',
  'ic',
  'inf_a',
  'art_a',
  'arm_a',
  'aa',
] as const

export type UnitId = (typeof unitIds)[number]
export { unitIds }

export interface BattleInput {
  attack: Record<number, Record<string, number>>
  defense: Record<number, Record<string, number>>
  attackOol?: Record<number, UnitId[]>
  defenseOol?: Record<number, UnitId[]>
  rounds?: Record<number, number | string>
  retreatThreshold?: Record<number, number>
  takesTerritory?: Record<number, number>
  aaLast?: Record<number, boolean>
  attackerSubmerge?: Record<number, boolean>
  defenderSubmerge?: Record<number, boolean>
  attackerDestroyerLast?: Record<number, boolean>
  defenderDestroyerLast?: Record<number, boolean>
  crashFighters?: Record<number, boolean>
  useAttackersFromPreviousWave?: Record<number, boolean>
  diceMode?: 'standard' | 'lowluck' | 'biased'
  inProgress?: boolean
  verboseLevel?: number
  pruneThreshold?: number
  reportPruneThreshold?: number
  sortMode?: 'unit_count' | 'ipc_cost'
  retreatModes: Record<number, string>
  retreatExpectedIpcProfitThresholds?: Record<number, number | undefined>
  retreatPwinThresholds?: Record<number, number | undefined>
  retreatStrafeThresholds?: Record<number, number | undefined>
  retreatLoseAirProbabilityThresholds?: Record<number, number | undefined>
  mode?: BattleMode
  territoryValue?: number
  isDeadzone?: boolean
  numWaves?: number
  amphibious?: boolean
  experimentalConvolution?: boolean
  retreatZeroRound?: boolean
  evDeadzone?: Record<number, boolean | undefined>
  evTerritoryValue?: Record<number, number | undefined>
}

export interface HistoryEntry {
  id: string
  name: string
  timestamp: number
  input: BattleInput
}

export interface WaveConfig {
  attackOolPreset: string
  defenseOolPreset: string
  rounds: string
  retreatThreshold: number
  takesTerritory: number
  aaLast: boolean
  attackerSubmerge: boolean
  defenderSubmerge: boolean
  attackerDestroyerLast: boolean
  defenderDestroyerLast: boolean
  crashFighters: boolean
  retreatMode: string
  retreatExpectedIpcProfitThreshold?: number
  retreatPwinThreshold?: number
  retreatStrafeThreshold?: number
  retreatLoseAirProbabilityThreshold?: number
  useAttackersFromPreviousWave: boolean
  evDeadzone?: boolean
  evTerritoryValue?: number
}

export interface UnitSummary {
  unitCount: number
  cost: number
  hitPoints: number
  power: number
}

export interface ProfitDistEntry { prob: number; ipc: number }

export interface WaveRecords {
  attackOolRecord: Record<number, UnitId[]>
  defenseOolRecord: Record<number, UnitId[]>
  roundsNum: Record<number, number>
  retreatThresholdRecord: Record<number, number>
  takesTerritoryRecord: Record<number, number>
  aaLastRecord: Record<number, boolean>
  attackerSubmergeRecord: Record<number, boolean>
  defenderSubmergeRecord: Record<number, boolean>
  attackerDestroyerLastRecord: Record<number, boolean>
  defenderDestroyerLastRecord: Record<number, boolean>
  crashFightersRecord: Record<number, boolean>
  retreatExpectedIpcProfitRecord: Record<number, number | undefined>
  retreatPwinRecord: Record<number, number | undefined>
  retreatStrafeRecord: Record<number, number | undefined>
  retreatLoseAirRecord: Record<number, number | undefined>
  useAttackersFromPreviousWaveRecord: Record<number, boolean>
  evDeadzoneRecord: Record<number, boolean | undefined>
  evTerritoryValueRecord: Record<number, number | undefined>
}

export const MAX_WAVES = 4

export const DEFAULT_WAVE_CONFIG: WaveConfig = {
  attackOolPreset: 'inf-art-tnk-fig-bom',
  defenseOolPreset: 'aa-inf-art-tnk-bom-fig',
  rounds: 'all',
  retreatThreshold: 0,
  takesTerritory: 0,
  aaLast: false,
  attackerSubmerge: false,
  defenderSubmerge: false,
  attackerDestroyerLast: false,
  defenderDestroyerLast: false,
  crashFighters: false,
  retreatMode: 'unitCount',
  useAttackersFromPreviousWave: false,
}

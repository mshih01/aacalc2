import * as LZString from 'lz-string'
import type { BattleInput } from '../types.ts'

const unitNameMap: Record<string, string> = {
  inf: 'Infantry',
  art: 'Artillery',
  arm: 'Tanks',
  fig: 'Fighters',
  bom: 'Bombers',
  aa: 'Anti-Aircraft',
  sub: 'Submarines',
  tra: 'Transports',
  des: 'Destroyers',
  cru: 'Cruisers',
  acc: 'Carriers',
  bat: 'Battleships',
  dbat: 'Damaged Battleship',
  inf_a: 'Infantry (Amphibious)',
  art_a: 'Artillery (Amphibious)',
  arm_a: 'Tanks (Amphibious)',
}

const KEY_MAP: Record<string, string> = {
  attack: 'a',
  defense: 'd',
  attackOol: 'ao',
  defenseOol: 'do',
  rounds: 'r',
  retreatThreshold: 'rt',
  takesTerritory: 'tt',
  aaLast: 'al',
  attackerSubmerge: 'as',
  defenderSubmerge: 'ds',
  attackerDestroyerLast: 'ad',
  defenderDestroyerLast: 'dd',
  crashFighters: 'cf',
  useAttackersFromPreviousWave: 'up',
  diceMode: 'dm',
  inProgress: 'ip',
  verboseLevel: 'vl',
  pruneThreshold: 'pt',
  reportPruneThreshold: 'rp',
  sortMode: 'sm',
  retreatModes: 'rm',
  retreatExpectedIpcProfitThresholds: 're',
  retreatPwinThresholds: 'pw',
  retreatStrafeThresholds: 'st',
  retreatLoseAirProbabilityThresholds: 'la',
  mode: 'm',
  territoryValue: 'tv',
  isDeadzone: 'dz',
  numWaves: 'nw',
  amphibious: 'am',
  experimentalConvolution: 'ec',
  evFutureWave: 'ef',
  retreatZeroRound: 'rz',
  evDeadzone: 'ed',
  evTerritoryValue: 'et',
}

const REVERSE_KEY_MAP: Record<string, string> = {}
for (const [k, v] of Object.entries(KEY_MAP)) {
  REVERSE_KEY_MAP[v] = k
}

const RECORD_KEYS = new Set([
  'rounds', 'retreatThreshold', 'takesTerritory', 'aaLast',
  'attackerSubmerge', 'defenderSubmerge', 'attackerDestroyerLast',
  'defenderDestroyerLast', 'crashFighters', 'useAttackersFromPreviousWave',
  'retreatModes', 'retreatExpectedIpcProfitThresholds',
  'retreatPwinThresholds', 'retreatStrafeThresholds',
  'retreatLoseAirProbabilityThresholds', 'evDeadzone', 'evTerritoryValue',
])

const RECORD_DEFAULTS: Record<string, unknown> = {
  rounds: 'all',
  retreatThreshold: 0,
  takesTerritory: 0,
  aaLast: false,
  attackerSubmerge: false,
  defenderSubmerge: false,
  attackerDestroyerLast: false,
  defenderDestroyerLast: false,
  crashFighters: false,
  useAttackersFromPreviousWave: false,
  retreatModes: 'unitCount',
  retreatExpectedIpcProfitThresholds: undefined,
  retreatPwinThresholds: undefined,
  retreatStrafeThresholds: undefined,
  retreatLoseAirProbabilityThresholds: undefined,
  evDeadzone: undefined,
  evTerritoryValue: undefined,
}

const FIELD_DEFAULTS: Record<string, unknown> = {
  diceMode: 'standard',
  inProgress: false,
  verboseLevel: undefined,
  pruneThreshold: undefined,
  reportPruneThreshold: undefined,
  sortMode: 'unit_count',
  mode: 'land',
  territoryValue: undefined,
  isDeadzone: false,
  numWaves: 1,
  amphibious: false,
  experimentalConvolution: false,
  evFutureWave: false,
  retreatZeroRound: false,
}

export function encodeStateToUrl(input: BattleInput): string {
  const compact: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue

    if (RECORD_KEYS.has(key)) {
      const record = value as Record<string, unknown>
      const defaultVal = RECORD_DEFAULTS[key]
      const filtered: Record<string, unknown> = {}
      let hasNonDefault = false

      for (const [k, v] of Object.entries(record)) {
        if (v !== defaultVal) {
          filtered[k] = v
          hasNonDefault = true
        }
      }

      if (!hasNonDefault) continue
      compact[KEY_MAP[key]] = filtered
    } else {
      const defaultVal = FIELD_DEFAULTS[key]
      if (value === defaultVal) continue
      compact[KEY_MAP[key]] = value
    }
  }

  const jsonString = JSON.stringify(compact)
  const encoded = LZString.compressToEncodedURIComponent(jsonString)
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}?state=${encoded}`
}

export function decodeStateFromUrl(): BattleInput | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('state')
    if (!encoded) return null

    let compact: Record<string, unknown>

    const decompressed = LZString.decompressFromEncodedURIComponent(encoded)
    if (decompressed) {
      compact = JSON.parse(decompressed)
    } else {
      const jsonString = atob(encoded)
      return JSON.parse(jsonString) as unknown as BattleInput
    }

    const result: Record<string, unknown> = {}
    for (const [alias, value] of Object.entries(compact)) {
      const key = REVERSE_KEY_MAP[alias] || alias
      result[key] = value
    }

    const waveIndices = Object.keys(result.attack as Record<string, unknown>)

    for (const key of RECORD_KEYS) {
      const record = result[key] as Record<string, unknown> | undefined
      const defaultVal = RECORD_DEFAULTS[key]

      if (defaultVal !== undefined) {
        if (!record || Object.keys(record).length === 0) {
          const filled: Record<string, unknown> = {}
          for (const idx of waveIndices) {
            filled[idx] = defaultVal
          }
          result[key] = filled
        } else {
          for (const idx of waveIndices) {
            if (!(idx in record)) {
              record[idx] = defaultVal
            }
          }
        }
      }
    }

    return result as unknown as BattleInput
  } catch (error) {
    console.warn('Failed to decode state from URL:', error)
    return null
  }
}

export function getUnitName(unit: string): string {
  return unitNameMap[unit] || unit.toUpperCase()
}

export function getUnitString(units: Record<string, number>): string {
  const unitMap: Record<string, string> = {
    inf: 'i',
    art: 'a',
    arm: 't',
    fig: 'f',
    bom: 'b',
    aa: 'c',
    sub: 'S',
    tra: 'T',
    des: 'D',
    cru: 'C',
    acc: 'A',
    bat: 'B',
    dbat: 'F',
    ic: 'p',
    inf_a: 'j',
    art_a: 'g',
    arm_a: 'u',
  };

  const unitOrder = ['inf', 'art', 'arm', 'fig', 'bom', 'aa', 'sub', 'tra', 'des', 'cru', 'acc', 'bat', 'dbat', 'ic', 'inf_a', 'art_a', 'arm_a'];
  let result = '';

  for (const unitId of unitOrder) {
    if (unitId in units && units[unitId] > 0) {
      const count = units[unitId];
      const unitChar = unitMap[unitId];
      if (unitChar) {
        if (count === 1) {
          result += unitChar;
        } else {
          result += `${count}${unitChar}`;
        }
      }
    }
  }

  return result;
}

export function getPercentileColor(percentile: number | undefined): { bg: string; border: string } {
  if (percentile) {
    return { bg: '#fff3e0', border: '#ff9800' }
  }
  return { bg: 'transparent', border: 'transparent' }
}

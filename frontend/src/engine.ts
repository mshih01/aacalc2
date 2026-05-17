import {
  multiwaveExternal,
  sbrExternal,
  type MultiwaveInput,
  type MultiwaveOutput,
} from 'aacalc2'
import type { BattleInput, UnitId } from './types.ts'

export function computeBattle(input: BattleInput): MultiwaveOutput {
  const numWaves = input.numWaves ?? 1

  const wave_info = Array.from({ length: numWaves }, (_, waveIdx) => {
    const attackOol: UnitId[] = input.attackOol?.[waveIdx] || ['inf', 'art', 'arm', 'fig', 'bom']
    const defenseOol: UnitId[] = input.defenseOol?.[waveIdx] || ['aa', 'inf', 'art', 'arm', 'fig', 'bom']
    const roundsNum = input.rounds?.[waveIdx]
      ? (input.rounds[waveIdx] === 'all' ? 100 : Number(input.rounds[waveIdx]))
      : 100

    return {
      attack: {
        units: input.attack[waveIdx] || {},
        ool: attackOol,
        takes: input.takesTerritory?.[waveIdx] ?? 0,
        aaLast: input.aaLast?.[waveIdx] ?? false,
      },
      defense: {
        units: input.defense[waveIdx] || {},
        ool: defenseOol,
        takes: 0,
        aaLast: input.aaLast?.[waveIdx] ?? false,
      },
      att_submerge: input.attackerSubmerge?.[waveIdx] ?? false,
      def_submerge: input.defenderSubmerge?.[waveIdx] ?? false,
      att_dest_last: input.attackerDestroyerLast?.[waveIdx] ?? false,
      def_dest_last: input.defenderDestroyerLast?.[waveIdx] ?? false,
      is_crash_fighters: input.crashFighters?.[waveIdx] ?? false,
      rounds: roundsNum,
      retreat_threshold: input.retreatThreshold?.[waveIdx] ?? 0,
      retreat_expected_ipc_profit_threshold: input.retreatExpectedIpcProfitThresholds?.[waveIdx],
      retreat_pwin_threshold: input.retreatPwinThresholds?.[waveIdx],
      retreat_strafe_threshold: input.retreatStrafeThresholds?.[waveIdx],
      retreat_lose_air_probability: input.retreatLoseAirProbabilityThresholds?.[waveIdx],
      pwinMode: 'takes' as const,
      use_attackers_from_previous_wave: input.useAttackersFromPreviousWave?.[waveIdx] ?? false,
      ev_deadzone: input.evDeadzone?.[waveIdx],
      ev_territory_value: input.evTerritoryValue?.[waveIdx],
    }
  })

  const multiwaveInput: MultiwaveInput = {
    wave_info,
    debug: false,
    prune_threshold: input.pruneThreshold ?? 1e-12,
    report_prune_threshold: input.reportPruneThreshold ?? 1e-12,
    is_naval: input.mode === 'sea',
    in_progress: input.inProgress ?? false,
    num_runs: 1,
    verbose_level: input.verboseLevel ?? 0,
    diceMode: input.diceMode ?? 'standard',
    sortMode: input.sortMode ?? 'unit_count',
    territory_value: input.territoryValue ?? 0,
    is_deadzone: input.isDeadzone ?? false,
    retreat_round_zero: input.retreatZeroRound ?? false,
    do_roundless_eval: true,
    experimentalConvolution: input.experimentalConvolution,
  }

  if (input.verboseLevel && input.verboseLevel > 0) {
    console.log('MultiwaveInput:', multiwaveInput)
  }
  const startTime = performance.now()
  const output = multiwaveExternal(multiwaveInput)
  const endTime = performance.now()
  const runtime = (endTime - startTime).toFixed(2)
  if (input.verboseLevel && input.verboseLevel > 0) {
    console.log('MultiwaveOutput:', output)
  }
  console.log(`Runtime: ${runtime}ms`)
  return output
}

export function computeSbrBattle(input: BattleInput): MultiwaveOutput {
  const attackOol: UnitId[] = input.attackOol?.[0] || ['bom']
  const defenseOol: UnitId[] = input.defenseOol?.[0] || ['ic']

  const sbrInput = {
    attack: {
      units: input.attack[0] || {},
      ool: attackOol,
      takes: input.takesTerritory?.[0] ?? 0,
      aaLast: input.aaLast?.[0] ?? false,
    },
    defense: {
      units: input.defense[0] || {},
      ool: defenseOol,
      takes: 0,
      aaLast: input.aaLast?.[0] ?? false,
    },
    verbose_level: 0,
    diceMode: input.diceMode ?? 'standard',
    in_progress: false,
    pruneThreshold: 1e-12,
    reportPruneThreshold: 1e-12,
  }
  if (input.verboseLevel && input.verboseLevel > 0) {
    console.log('SBR Input:', sbrInput)
  }
  const startTime = performance.now()
  const output = sbrExternal(sbrInput)
  const endTime = performance.now()
  const runtime = (endTime - startTime).toFixed(2)
  if (input.verboseLevel && input.verboseLevel > 0) {
    console.log('SBR Output:', output)
  }
  console.log(`Runtime: ${runtime}ms`)
  return output
}

export function validateArmySizes(
  attack: Record<number, Record<string, number>>,
  defense: Record<number, Record<string, number>>,
  numWaves: number
): { valid: boolean; error?: string } {
  let hasAnyAttacker = false
  let hasAnyDefender = false

  for (let waveIdx = 0; waveIdx < numWaves; waveIdx++) {
    const attackUnits = attack[waveIdx] || {}
    const defenseUnits = defense[waveIdx] || {}

    const attackerTotal = Object.values(attackUnits).reduce((sum, count) => sum + (count || 0), 0)
    const defenderTotal = Object.values(defenseUnits).reduce((sum, count) => sum + (count || 0), 0)

    if (attackerTotal > 0) hasAnyAttacker = true
    if (defenderTotal > 0) hasAnyDefender = true
  }

  if (!hasAnyAttacker) {
    return { valid: false, error: 'All waves: Attacker must have at least one unit' }
  }
  if (!hasAnyDefender) {
    return { valid: false, error: 'All waves: Defender must have at least one unit' }
  }
  return { valid: true }
}

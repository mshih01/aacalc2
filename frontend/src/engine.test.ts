import { describe, it, expect } from 'vitest'
import { buildMultiwaveInput, computeSbrBattle, validateArmySizes } from './engine.ts'
import type { BattleInput } from './types.ts'

function sbrInput(): BattleInput {
  return {
    attack: { 0: { bom: 5 } },
    defense: { 0: { ic: 1 } },
    attackOol: { 0: ['bom'] },
    defenseOol: { 0: ['ic'] },
    retreatModes: {},
    mode: 'sbr',
    numWaves: 1,
  }
}

describe('validateArmySizes', () => {
  it('passes when both sides have units', () => {
    const result = validateArmySizes(
      { 0: { inf: 3 } },
      { 0: { inf: 2 } },
      1,
    )
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('fails when attacker has no units', () => {
    const result = validateArmySizes(
      { 0: {} },
      { 0: { inf: 2 } },
      1,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Attacker')
  })

  it('fails when defender has no units', () => {
    const result = validateArmySizes(
      { 0: { inf: 3 } },
      { 0: {} },
      1,
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Defender')
  })

  it('passes when attacker has units in any wave', () => {
    const result = validateArmySizes(
      { 0: {}, 1: { inf: 3 } },
      { 0: { inf: 2 }, 1: {} },
      2,
    )
    expect(result.valid).toBe(true)
  })

  it('fails when neither side has units', () => {
    const result = validateArmySizes(
      { 0: {} },
      { 0: {} },
      1,
    )
    expect(result.valid).toBe(false)
  })
})

describe('buildMultiwaveInput', () => {
  it('maps per-wave settings and global knobs', () => {
    const input: BattleInput = {
      attack: { 0: { inf: 3 }, 1: { arm: 1 } },
      defense: { 0: { inf: 2 }, 1: { art: 1 } },
      attackOol: { 0: ['art', 'inf'] },
      defenseOol: { 0: ['inf', 'aa'] },
      rounds: { 0: '2' },
      retreatThreshold: { 0: 4 },
      takesTerritory: { 0: 1 },
      aaLast: { 0: true },
      attackerSubmerge: { 0: true },
      retreatModes: { 0: 'unitCount' },
      useAttackersFromPreviousWave: { 1: true },
      mode: 'sea',
      numWaves: 2,
      diceMode: 'lowluck',
      sortMode: 'ipc_cost',
      territoryValue: 7,
      isDeadzone: true,
      inProgress: true,
      retreatZeroRound: true,
      experimentalConvolution: true,
      evFutureWave: true,
    }

    const result = buildMultiwaveInput(input)

    expect(result.wave_info).toHaveLength(2)
    expect(result.wave_info[0].attack).toEqual({
      units: { inf: 3 },
      ool: ['art', 'inf'],
      takes: 1,
      aaLast: true,
    })
    expect(result.wave_info[0].defense.ool).toEqual(['inf', 'aa'])
    expect(result.wave_info[0].rounds).toBe(2)
    expect(result.wave_info[0].retreat_threshold).toBe(4)
    expect(result.wave_info[0].att_submerge).toBe(true)
    // Wave 1 has no explicit ool/rounds/takes, so engine defaults apply.
    expect(result.wave_info[1].rounds).toBe(100)
    expect(result.wave_info[1].attack.takes).toBe(0)
    expect(result.wave_info[1].use_attackers_from_previous_wave).toBe(true)

    expect(result.is_naval).toBe(true)
    expect(result.diceMode).toBe('lowluck')
    expect(result.sortMode).toBe('ipc_cost')
    expect(result.territory_value).toBe(7)
    expect(result.is_deadzone).toBe(true)
    expect(result.in_progress).toBe(true)
    expect(result.retreat_round_zero).toBe(true)
    expect(result.experimentalConvolution).toBe(true)
    expect(result.ev_future_wave).toBe(true)
    expect(result.multiwave_enforce_naval_fighters_carriers).toBe(true)
    expect(result.do_roundless_eval).toBe(true)
  })

  it('defaults numWaves to one wave', () => {
    const result = buildMultiwaveInput({
      attack: { 0: { inf: 1 } },
      defense: { 0: { inf: 1 } },
      retreatModes: {},
    })
    expect(result.wave_info).toHaveLength(1)
    expect(result.is_naval).toBe(false)
    expect(result.num_runs).toBe(1)
  })
})

describe('computeSbrBattle', () => {
  it('exposes the SBR casualty distribution through casualtiesInfoArr', () => {
    const output = computeSbrBattle(sbrInput())

    // SBR is a single-wave battle; the results UI reads detailed casualties
    // from casualtiesInfoArr[wave], so wave 0 must be populated.
    expect(output.waves).toBe(1)
    expect(Object.keys(output.casualtiesInfoArr).length).toBe(1)

    const wave0 = output.casualtiesInfoArr[0]
    expect(Object.keys(wave0.attack).length).toBeGreaterThan(0)
    expect(Object.keys(wave0.defense).length).toBeGreaterThan(0)

    // The per-wave entry must carry the same distribution that SBR reports
    // in its cumulative casualtiesInfo (they are identical for one wave).
    expect(wave0.attack).toEqual(output.casualtiesInfo.attack)
    expect(wave0.defense).toEqual(output.casualtiesInfo.defense)
  })
})

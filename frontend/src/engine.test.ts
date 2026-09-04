import { describe, it, expect } from 'vitest'
import { computeSbrBattle, validateArmySizes } from './engine.ts'
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

import { describe, it, expect } from 'vitest'
import { validateArmySizes } from './engine.ts'

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

import { describe, it, expect } from 'vitest'
import { calculateUnitSummary } from './unitStats.ts'

describe('calculateUnitSummary', () => {
  it('calculates summary for a simple unit string', () => {
    const result = calculateUnitSummary('3i2a1f', true, false)
    expect(result.unitCount).toBe(6)
    expect(result.cost).toBe(3 * 3 + 4 * 2 + 10 * 1)
    expect(result.hitPoints).toBe(6)
    expect(result.power).toBe(1 * 3 + 2 * 2 + 3 * 1)
  })

  it('returns zeros for empty string', () => {
    const result = calculateUnitSummary('', true, false)
    expect(result.unitCount).toBe(0)
    expect(result.cost).toBe(0)
    expect(result.hitPoints).toBe(0)
    expect(result.power).toBe(0)
  })

  it('handles multi-digit counts', () => {
    const result = calculateUnitSummary('10i5a', true, false)
    expect(result.unitCount).toBe(15)
    expect(result.cost).toBe(10 * 3 + 5 * 4)
  })

  it('uses attack power when isAttacker is true', () => {
    const result = calculateUnitSummary('1f', true, false)
    expect(result.power).toBe(3)
  })

  it('uses defense power when isAttacker is false', () => {
    const result = calculateUnitSummary('1f', false, false)
    expect(result.power).toBe(4)
  })

  it('applies artillery support rule in land mode for attacker', () => {
    const result = calculateUnitSummary('2i1a', true, true)
    expect(result.power).toBe(1 * 2 + 2 * 1 + 1)
  })

  it('does not apply artillery support for defender', () => {
    const result = calculateUnitSummary('2i1a', false, true)
    expect(result.power).toBe(2 * 2 + 2 * 1)
  })

  it('does not apply artillery support when no infantry', () => {
    const result = calculateUnitSummary('1a', true, true)
    expect(result.power).toBe(2)  // artillery only, no support
  })

  it('battleships contribute 0 HP in land mode (bombard only)', () => {
    const result = calculateUnitSummary('1B', true, true)
    expect(result.hitPoints).toBe(0)
    expect(result.power).toBe(4)
    expect(result.cost).toBe(20)
  })

  it('cruisers contribute 0 HP in land mode (bombard only)', () => {
    const result = calculateUnitSummary('1C', true, true)
    expect(result.hitPoints).toBe(0)
  })

  it('battleships contribute HP in non-land mode', () => {
    const result = calculateUnitSummary('1B', true, false)
    expect(result.hitPoints).toBe(2)
  })
})

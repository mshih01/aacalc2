import { describe, it, expect } from 'vitest'
import { getOolString, getUnitChar, getUnitString, getUnitName } from './format.ts'

describe('getUnitChar', () => {
  it('maps a unit id to its single character', () => {
    expect(getUnitChar('inf')).toBe('i')
    expect(getUnitChar('arm')).toBe('t')
    expect(getUnitChar('inf_a')).toBe('j')
  })

  it('passes unknown ids through unchanged', () => {
    expect(getUnitChar('wat')).toBe('wat')
  })
})

describe('getOolString', () => {
  it('renders one character per unit, in order', () => {
    expect(getOolString(['inf', 'art', 'arm', 'fig', 'bom'])).toBe('iatfb')
  })

  it('keeps the given order rather than a canonical unit order', () => {
    expect(getOolString(['bom', 'inf', 'art'])).toBe('bia')
  })

  it('keeps duplicates', () => {
    expect(getOolString(['inf', 'inf_a', 'art', 'art_a'])).toBe('ijag')
    expect(getOolString(['sub', 'sub'])).toBe('SS')
  })

  it('returns an empty string for an empty order of loss', () => {
    expect(getOolString([])).toBe('')
  })
})

describe('getUnitString', () => {
  it('converts a single unit', () => {
    expect(getUnitString({ inf: 3 })).toBe('3i')
  })

  it('converts multiple unit types', () => {
    expect(getUnitString({ inf: 3, art: 2, fig: 1 })).toBe('3i2af')
  })

  it('returns empty string for empty input', () => {
    expect(getUnitString({})).toBe('')
  })

  it('omits units with count 0', () => {
    expect(getUnitString({ inf: 3, art: 0 })).toBe('3i')
  })

  it('does not prefix count of 1', () => {
    expect(getUnitString({ inf: 1 })).toBe('i')
  })

  it('maps all unit codes correctly', () => {
    const result = getUnitString({ inf: 1, art: 1, arm: 1, fig: 1, bom: 1, sub: 1, tra: 1, des: 1, cru: 1, acc: 1, bat: 1, dbat: 1, ic: 1, inf_a: 1, art_a: 1, arm_a: 1 })
    expect(result).toBe('iatfbSTDCABFpjgu')
  })

  it('follows the defined unit order', () => {
    expect(getUnitString({ arm: 2, inf: 1 })).toBe('i2t')
  })
})

describe('getUnitName', () => {
  it('returns mapped name for known units', () => {
    expect(getUnitName('inf')).toBe('Infantry')
    expect(getUnitName('bat')).toBe('Battleships')
    expect(getUnitName('arm_a')).toBe('Tanks (Amphibious)')
  })

  it('falls back to uppercase for unknown units', () => {
    expect(getUnitName('foo')).toBe('FOO')
  })
})

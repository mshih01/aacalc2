import { describe, it, expect, vi } from 'vitest'
import * as LZString from 'lz-string'
import { getNegativeUnitString, getOolString, getUnitChar, getUnitString, getUnitName, decodeStateFromHash, encodeStateToHash } from './format.ts'
import type { BattleInput } from '../types.ts'

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

  it('omits negative counts, which are not part of the wave army', () => {
    expect(getUnitString({ inf: 3, art: -1 })).toBe('3i')
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

describe('getNegativeUnitString', () => {
  it('returns an empty string when nothing is negative', () => {
    expect(getNegativeUnitString({ inf: 3, art: 0 })).toBe('')
    expect(getNegativeUnitString({})).toBe('')
  })

  it('renders negative counts without a sign', () => {
    expect(getNegativeUnitString({ inf: -1, art: -2 })).toBe('i2a')
  })

  it('ignores positive counts', () => {
    expect(getNegativeUnitString({ inf: 3, art: -1 })).toBe('a')
  })

  it('follows the defined unit order', () => {
    expect(getNegativeUnitString({ arm: -2, inf: -1 })).toBe('i2t')
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

describe('share hash', () => {
  it('preserves LZ-string "+" characters through encode and decode', () => {
    // Two-wave battle with "Prev wave attackers" enabled for wave 2. This
    // state compresses to an LZ string containing "+", which must not be
    // decoded as a space (URLSearchParams would do that).
    const hash =
      '#/N4IghiBcoAxaBLAdgMygRhgXwDQnfLiAEyF4DMhRAJvCHNCMmpABxEHRGlcVV5gA9nQYBtJqhACATgBcp4aQFsFKBAHMFAI0EqAunk7jmCsHNPLVG7bpB6awxmPAQ8JmfJkq8O7yDWaBvhQ4mCuEmgeFn6+VoFEAK4ADnScstIJAKZEAG4ANlAweEnykOiZALSYeNIpZZXVIADOKpBMSQDGAPodgk2eILI5hXhIAO5QxFhAA'
    window.history.replaceState(null, '', hash)

    const decoded = decodeStateFromHash()
    expect(decoded?.input.useAttackersFromPreviousWave?.[1]).toBe(true)

    const reencoded = encodeStateToHash(decoded!.input)
    expect(reencoded).toContain('+')
    expect(reencoded).not.toContain('%20')

    window.history.replaceState(null, '', reencoded)
    expect(decodeStateFromHash()?.input.useAttackersFromPreviousWave?.[1]).toBe(true)
  })

  it('skips an unregistered field instead of writing an "undefined" key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const input: Record<string, unknown> = {
      attack: { 0: { inf: 3 } },
      defense: { 0: { art: 2 } },
      attackOol: { 0: ['inf'] },
      defenseOol: { 0: ['art'] },
      rounds: { 0: 'all' },
      retreatModes: { 0: 'unitCount' },
      mode: 'land',
      numWaves: 1,
    }
    input.mysteryField = 42

    const hash = encodeStateToHash(input as unknown as BattleInput)
    const encoded = hash.slice(2).split('/')[0]
    const compact = JSON.parse(
      LZString.decompressFromEncodedURIComponent(encoded) as string,
    )

    expect(compact).not.toHaveProperty('undefined')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"mysteryField"'),
    )
    warn.mockRestore()
  })
})

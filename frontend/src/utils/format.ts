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

export function encodeStateToUrl(input: BattleInput): string {
  const jsonString = JSON.stringify(input)
  const encoded = btoa(jsonString)
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}?state=${encoded}`
}

export function decodeStateFromUrl(): BattleInput | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('state')
    if (!encoded) return null
    const jsonString = atob(encoded)
    const input = JSON.parse(jsonString) as BattleInput
    return input
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

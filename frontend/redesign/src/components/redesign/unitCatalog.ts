import type { BattleMode } from '../../types.ts';

const UNIT_LABELS: Record<string, string> = {
  aa: 'Anti-aircraft',
  inf: 'Infantry',
  art: 'Artillery',
  arm: 'Tank',
  fig: 'Fighter',
  bom: 'Bomber',
  sub: 'Submarine',
  tra: 'Transport',
  des: 'Destroyer',
  cru: 'Cruiser',
  acc: 'Aircraft Carrier',
  bat: 'Battleship',
  dbat: 'Damaged Battleship',
  ic: 'Industrial Complex HP',
  inf_a: 'Infantry (Amphibious)',
  art_a: 'Artillery (Amphibious)',
  arm_a: 'Tank (Amphibious)',
};

export function unitLabel(unit: string) {
  return UNIT_LABELS[unit] ?? unit;
}

export function unitsForMode(mode: BattleMode, amphibious: boolean): string[] {
  if (mode === 'sea') {
    return ['fig', 'bom', 'sub', 'tra', 'des', 'cru', 'acc', 'bat'];
  }
  if (mode === 'sbr') {
    return ['bom', 'ic'];
  }
  return [
    'aa',
    ...(amphibious ? ['inf_a', 'art_a', 'arm_a'] : []),
    'inf',
    'art',
    'arm',
    'fig',
    'bom',
    'cru',
    'bat',
  ];
}

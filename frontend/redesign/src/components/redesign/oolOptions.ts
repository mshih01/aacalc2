import type { BattleMode, UnitId } from '../../types.ts';

export interface OolOption {
  ool: UnitId[];
  label: string;
}

const MAX_UNIT_TYPES = 8;
const MAX_OPTIONS = 45000;

const SHORT_LABELS: Record<string, string> = {
  aa: 'AA',
  inf: 'Inf',
  art: 'Art',
  arm: 'Tnk',
  fig: 'Fig',
  bom: 'Bom',
  sub: 'Sub',
  tra: 'Tra',
  des: 'Des',
  cru: 'Cru',
  acc: 'ACC',
  bat: 'Bat',
  dbat: 'DBat',
  ic: 'IC',
  inf_a: 'Inf_A',
  art_a: 'Art_A',
  arm_a: 'Tnk_A',
};

const cache = new Map<string, OolOption[]>();

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) {
      out.push([item, ...tail]);
      if (out.length >= MAX_OPTIONS) return;
    }
  });
  return out;
}

export function formatOol(ool: UnitId[]): string {
  return ool.map((unit) => SHORT_LABELS[unit] ?? unit).join(' - ');
}

export function sameOol(a: UnitId[], b: UnitId[]): boolean {
  return a.length === b.length && a.every((unit, index) => unit === b[index]);
}

function baseUnitIds(side: 'attack' | 'defense', mode: BattleMode, amphibious: boolean): UnitId[] {
  if (mode === 'land') {
    if (side === 'attack') {
      return [
        ...(amphibious ? (['inf_a', 'art_a', 'arm_a'] as UnitId[]) : []),
        'inf',
        'art',
        'arm',
        'fig',
        'bom',
      ];
    }
    return ['aa', 'inf', 'art', 'arm', 'fig', 'bom'];
  }
  if (mode === 'sea') {
    if (side === 'attack') {
      return ['acc', 'sub', 'des', 'fig', 'cru', 'bom', 'bat', 'dbat'];
    }
    return ['sub', 'des', 'acc', 'fig', 'cru', 'bat', 'dbat'];
  }
  return side === 'attack' ? ['bom'] : ['ic'];
}

export function oolOptionsFor(
  side: 'attack' | 'defense',
  mode: BattleMode,
  amphibious: boolean,
): OolOption[] {
  const unitIds = baseUnitIds(side, mode, amphibious);
  if (unitIds.length > MAX_UNIT_TYPES) return [];
  const key = `${side}|${mode}|${amphibious}|${unitIds.join(',')}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const options = permutations(unitIds).map((ool) => ({
    ool,
    label: formatOol(ool),
  }));
  cache.set(key, options);
  return options;
}

export function withCurrentOol(options: OolOption[], current: UnitId[]): OolOption[] {
  if (!current.length || options.some((option) => sameOol(option.ool, current))) {
    return options;
  }
  return [{ ool: current, label: formatOol(current) }, ...options];
}

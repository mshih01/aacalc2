import type { WaveConfig } from '../../types.ts';

export type RetreatType =
  'unitCount' | 'expectedIpcProfit' | 'probabilityWins' | 'strafe' | 'loseAir';

export const RETREAT_TYPES: Array<{
  value: RetreatType;
  label: string;
  description: string;
  naval: boolean;
}> = [
  {
    value: 'unitCount',
    label: 'Attackers left',
    description: 'Retreat when there are this many attacking units or fewer left.',
    naval: true,
  },
  {
    value: 'expectedIpcProfit',
    label: 'Expected IPC profit',
    description: 'Retreat when the expected IPC profit drops below the threshold.',
    naval: true,
  },
  {
    value: 'probabilityWins',
    label: 'Probability of winning',
    description: 'Retreat when the probability of winning is at or below the threshold.',
    naval: true,
  },
  {
    value: 'strafe',
    label: 'Probability of killing defenders',
    description: 'Retreat when the probability of killing all defenders exceeds the threshold.',
    naval: false,
  },
  {
    value: 'loseAir',
    label: 'Probability of losing air',
    description: 'Retreat when the probability of losing air exceeds the threshold.',
    naval: false,
  },
];

export function retreatTypeLabel(type: string | undefined) {
  return RETREAT_TYPES.find((option) => option.value === type)?.label ?? 'Attackers left';
}

export function retreatThreshold(config: WaveConfig): number {
  switch (config.retreatMode) {
    case 'expectedIpcProfit':
      return config.retreatExpectedIpcProfitThreshold ?? 0;
    case 'probabilityWins':
      return config.retreatPwinThreshold ?? 0;
    case 'strafe':
      return config.retreatStrafeThreshold ?? 0;
    case 'loseAir':
      return config.retreatLoseAirProbabilityThreshold ?? 0;
    case 'unitCount':
    default:
      return config.retreatThreshold ?? 0;
  }
}

export function retreatSummary(config: WaveConfig): string {
  const threshold = retreatThreshold(config);
  switch (config.retreatMode) {
    case 'expectedIpcProfit':
      return `EV profit < ${formatThreshold(threshold)}`;
    case 'probabilityWins':
      return `P(win) ≤ ${formatThreshold(threshold)}`;
    case 'strafe':
      return `P(kill defenders) > ${formatThreshold(threshold)}`;
    case 'loseAir':
      return `P(lose air) > ${formatThreshold(threshold)}`;
    case 'unitCount':
    default:
      if (!threshold) return '';
      return `≤ ${threshold} attackers left`;
  }
}

function formatThreshold(value: number) {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

export function applyRetreat(mode: RetreatType, threshold: number): Partial<WaveConfig> {
  const updates: Partial<WaveConfig> = {
    retreatMode: mode,
    retreatThreshold: undefined,
    retreatExpectedIpcProfitThreshold: undefined,
    retreatPwinThreshold: undefined,
    retreatStrafeThreshold: undefined,
    retreatLoseAirProbabilityThreshold: undefined,
  };
  if (mode === 'unitCount') updates.retreatThreshold = threshold;
  if (mode === 'expectedIpcProfit') updates.retreatExpectedIpcProfitThreshold = threshold;
  if (mode === 'probabilityWins') updates.retreatPwinThreshold = threshold;
  if (mode === 'strafe') updates.retreatStrafeThreshold = threshold;
  if (mode === 'loseAir') updates.retreatLoseAirProbabilityThreshold = threshold;
  return updates;
}

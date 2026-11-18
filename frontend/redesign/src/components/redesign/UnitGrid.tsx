import type { CSSProperties } from 'react';
import type { BattleMode } from '../../types.ts';
import { calculateUnitSummary } from '../../utils/unitStats.ts';
import { getUnitString } from '../../utils/format.ts';
import { Icon } from './Icon.tsx';
import { UnitIcon } from './UnitIcon.tsx';
import { TextField } from './primitives.tsx';
import { unitLabel, unitsForMode } from './unitCatalog.ts';

function unitDisabled(side: 'attack' | 'defense', unit: string, mode: BattleMode) {
  if (side === 'attack' && unit === 'aa') return true;
  if (side === 'attack' && mode === 'sea' && unit === 'tra') return true;
  if (side === 'defense' && (unit === 'inf_a' || unit === 'art_a' || unit === 'arm_a')) {
    return true;
  }
  if (mode === 'land' && side === 'defense' && (unit === 'cru' || unit === 'bat')) {
    return true;
  }
  if (mode === 'sea' && side === 'defense' && unit === 'bom') return true;
  if (mode === 'sbr' && side === 'attack' && unit === 'ic') return true;
  if (mode === 'sbr' && side === 'defense' && unit === 'bom') return true;
  return false;
}

function combineWaves(units: Record<number, Record<string, number>>, numWaves: number) {
  const out: Record<string, number> = {};
  for (let wave = 0; wave < numWaves; wave++) {
    for (const [unit, count] of Object.entries(units[wave] ?? {})) {
      if (count > 0) out[unit] = (out[unit] ?? 0) + count;
    }
  }
  return out;
}

function Summary({
  units,
  side,
  mode,
  numWaves,
}: {
  units: Record<number, Record<string, number>>;
  side: 'attack' | 'defense';
  mode: BattleMode;
  numWaves: number;
}) {
  const combined = combineWaves(units, numWaves);
  const unitString = getUnitString(combined);
  const summary = calculateUnitSummary(unitString, side === 'attack', mode === 'land');
  return (
    <div className="unit-summary" aria-label={`${side} unit summary`}>
      <span className="unit-summary__item">
        <span className="unit-summary__hash">#</span>
        {summary.unitCount}
      </span>
      <span className="unit-summary__item">
        <Icon name="coin" size={16} />
        {summary.cost}
      </span>
      <span className="unit-summary__item">
        <Icon name="heart" size={16} />
        {summary.hitPoints}
      </span>
      <span className="unit-summary__item">
        <Icon name="sword" size={16} />
        {summary.power}
      </span>
    </div>
  );
}

export function UnitGrid({
  mode,
  numWaves,
  amphibious,
  attack,
  defense,
  onUnitChange,
  onSwapSides,
  onSwapWave,
}: {
  mode: BattleMode;
  numWaves: number;
  amphibious: boolean;
  attack: Record<number, Record<string, number>>;
  defense: Record<number, Record<string, number>>;
  onUnitChange: (side: 'attack' | 'defense', wave: number, unit: string, count: number) => void;
  onSwapSides: () => void;
  onSwapWave: (side: 'attack' | 'defense', from: number, to: number) => void;
}) {
  const units = unitsForMode(mode, amphibious);
  const multi = numWaves > 1;
  const iconCol = multi ? '40px' : '64px';
  const iconSize = multi ? 28 : 32;
  const style = {
    '--wave-count': numWaves,
    '--unit-icon-col': iconCol,
  } as CSSProperties;

  const waveLabel = (side: 'attack' | 'defense', wave: number) => {
    const label =
      side === 'attack' ? `Wave ${wave + 1}` : wave === 0 ? '1st defense' : 'Reinforcements';
    return (
      <div className="unit-wave-label" key={`${side}-label-${wave}`}>
        <span className="unit-wave-label__text">{label}</span>
        {wave < numWaves - 1 ? (
          <button
            type="button"
            className="icon-button unit-wave-label__swap"
            onClick={() => onSwapWave(side, wave, wave + 1)}
            aria-label={`Swap ${side} wave ${wave + 1} and ${wave + 2}`}
            title="Swap waves"
          >
            <Icon name="swap" size={16} />
          </button>
        ) : null}
      </div>
    );
  };

  const sideGroup = (side: 'attack' | 'defense') => {
    const sideUnits = side === 'attack' ? attack : defense;
    return (
      <div className="unit-group">
        {multi ? (
          <div className="unit-wave-labels" style={style}>
            <span className="unit-wave-label-spacer" aria-hidden="true" />
            {Array.from({ length: numWaves }, (_, wave) => waveLabel(side, wave))}
          </div>
        ) : null}
        <div
          className={`unit-group__body unit-group__body--${side}`}
          style={style}
          data-testid={`unit-group-${side}`}
        >
          {units.map((unit) => {
            const disabled = unitDisabled(side, unit, mode);
            return (
              <div
                className={`unit-row ${multi ? 'unit-row--multi' : 'unit-row--single'}`}
                style={style}
                key={`${side}-${unit}`}
              >
                <div className="unit-row__icon">
                  <UnitIcon unit={unit} side={side} size={iconSize} dimmed={disabled} />
                </div>
                {Array.from({ length: numWaves }, (_, wave) => {
                  const values = sideUnits[wave] ?? {};
                  const allowNegative = side === 'defense' && wave > 0;
                  const value = values[unit];
                  return (
                    <TextField
                      key={`${side}-${unit}-${wave}`}
                      label={unitLabel(unit)}
                      type="number"
                      min={allowNegative ? undefined : 0}
                      step={1}
                      value={value === undefined || value === 0 ? '' : String(value)}
                      disabled={disabled}
                      onChange={(raw) => {
                        const parsed = raw === '' ? 0 : Number(raw);
                        const n = Number.isFinite(parsed) ? parsed : 0;
                        onUnitChange(side, wave, unit, allowNegative ? n : Math.max(0, n));
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        <Summary units={sideUnits} side={side} mode={mode} numWaves={numWaves} />
      </div>
    );
  };

  return (
    <section className="unit-section">
      <div className="unit-head">
        <div className="unit-head__side">
          <span className="unit-head__line" />
          <span className="unit-head__label">attack units</span>
          <span className="unit-head__line" />
        </div>
        <div className="unit-head__swap">
          <button
            type="button"
            className="icon-button"
            onClick={onSwapSides}
            aria-label="Swap attacker and defender"
            title="Swap attacker and defender"
          >
            <Icon name="swap" />
          </button>
        </div>
        <div className="unit-head__side">
          <span className="unit-head__line" />
          <span className="unit-head__label">defense units</span>
          <span className="unit-head__line" />
        </div>
      </div>

      <div
        className={`unit-columns${multi ? ' unit-columns--multi' : ' unit-columns--single'}`}
        style={style}
      >
        {sideGroup('attack')}
        {sideGroup('defense')}
      </div>
    </section>
  );
}

import type { OptimizeMode } from 'aacalc2';
import {
  positiveUnitKeys,
  type ArmyOptimizeSide,
  type ArmyOptimizerParams,
  type ArmyPwinMode,
} from '../../utils/armyOptimizer.ts';
import { CheckboxControl, SelectField, TextField } from './primitives.tsx';
import { UnitIcon } from './UnitIcon.tsx';
import { unitLabel, unitShortLabel } from './unitCatalog.ts';

const SIDE_LABEL: Record<ArmyOptimizeSide, string> = {
  attacker: 'attacker',
  defender: 'defender',
};

export function ArmyOptimizerCard({
  params,
  onChange,
  side,
  opponentSide,
  maxUnits,
  opponentUnits,
  showMinArmy,
  onShowMinArmyChange,
  minArmy,
  onMinArmyChange,
}: {
  params: ArmyOptimizerParams;
  onChange: (next: ArmyOptimizerParams) => void;
  side: ArmyOptimizeSide;
  opponentSide: ArmyOptimizeSide;
  maxUnits: Record<string, number>;
  opponentUnits: Record<string, number>;
  showMinArmy: boolean;
  onShowMinArmyChange: (checked: boolean) => void;
  minArmy: Record<string, number>;
  onMinArmyChange: (unit: string, count: number) => void;
}) {
  const minArmyUnits = positiveUnitKeys(maxUnits);
  const hasMaxArmy = minArmyUnits.length > 0;
  const hasOpponentArmy = positiveUnitKeys(opponentUnits).length > 0;

  const sideName = SIDE_LABEL[side];
  const opponentName = SIDE_LABEL[opponentSide];
  const iconSide = side === 'attacker' ? 'attack' : 'defense';

  return (
    <section className="army-optimizer" aria-label="Army optimization">
      <header className="army-optimizer__head">
        <h3 className="army-optimizer__title">Army optimization</h3>
        <p className="army-optimizer__hint">
          Optimizes wave 1. The {sideName} army is the maximum; the {opponentName} army is the
          opponent.
        </p>
      </header>

      <div className="army-optimizer__grid">
        <SelectField
          label="Optimize mode"
          value={params.optimizeMode}
          options={[
            { value: 'targetWinPercentage', label: 'Target win %' },
            { value: 'maxProfit', label: 'Max profit (IPC)' },
            { value: 'targetProfit', label: 'Target profit (IPC)' },
          ]}
          onChange={(value) => onChange({ ...params, optimizeMode: value as OptimizeMode })}
        />

        {params.optimizeMode !== 'maxProfit' ? (
          <SelectField
            label="Optimize for"
            value={params.optimizeFor}
            options={[
              { value: 'attacker', label: 'Attacker' },
              { value: 'defender', label: 'Defender' },
            ]}
            onChange={(value) => onChange({ ...params, optimizeFor: value as ArmyOptimizeSide })}
          />
        ) : null}

        {params.optimizeMode === 'targetWinPercentage' ? (
          <TextField
            label="Target win probability (0–1)"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={String(params.targetPercentage)}
            onChange={(value) => {
              const parsed = Number(value);
              if (!Number.isFinite(parsed)) return;
              onChange({
                ...params,
                targetPercentage: Math.max(0, Math.min(1, parsed)),
              });
            }}
          />
        ) : null}

        {params.optimizeMode === 'maxProfit' ? (
          <TextField
            label="Recommendations"
            type="number"
            min={1}
            max={10}
            step={1}
            value={String(params.numRecommendations)}
            onChange={(value) => {
              const parsed = Number(value);
              if (!Number.isFinite(parsed)) return;
              onChange({
                ...params,
                numRecommendations: Math.max(1, Math.min(10, Math.round(parsed))),
              });
            }}
          />
        ) : null}

        {params.optimizeMode === 'targetProfit' ? (
          <TextField
            label="Target attacker profit (IPC)"
            type="number"
            step={0.5}
            value={String(params.targetProfit)}
            onChange={(value) => {
              const parsed = Number(value);
              if (!Number.isFinite(parsed)) return;
              onChange({ ...params, targetProfit: parsed });
            }}
          />
        ) : null}

        {params.optimizeMode !== 'targetProfit' ? (
          <SelectField
            label="Win condition"
            value={params.pwinMode}
            options={[
              { value: 'takes', label: 'Takes territory' },
              { value: 'destroys', label: 'Destroys' },
            ]}
            onChange={(value) => onChange({ ...params, pwinMode: value as ArmyPwinMode })}
          />
        ) : null}

        {params.optimizeMode === 'maxProfit' ? (
          <div className="army-optimizer__note">Max profit optimizes the attacker&apos;s army.</div>
        ) : null}

        {params.optimizeMode === 'targetProfit' ? (
          <div className="army-optimizer__note">
            Attacker profit is the engine&apos;s expected IPC swing, including territory value and
            the dead-zone charge. Defender targets require profit at or below the target; attacker
            targets require profit at or above it.
          </div>
        ) : null}
      </div>

      <div className="army-optimizer__min-toggle">
        <CheckboxControl
          label="Set minimum army"
          checked={showMinArmy}
          disabled={!hasMaxArmy}
          onChange={onShowMinArmyChange}
        />
      </div>

      {showMinArmy && hasMaxArmy ? (
        <div className="army-min-army">
          {minArmyUnits.map((unit) => {
            const max = Math.floor(maxUnits[unit] ?? 0);
            const value = Math.max(0, Math.min(max, Math.floor(minArmy[unit] ?? 0)));
            return (
              <div className="army-min-army__unit" key={unit} title={unitLabel(unit)}>
                <UnitIcon unit={unit} side={iconSide} size={24} />
                <TextField
                  className="field--min-army"
                  compact
                  label={`Minimum ${unitLabel(unit)}`}
                  type="number"
                  min={0}
                  max={max}
                  step={1}
                  value={String(value)}
                  onChange={(raw) => {
                    const parsed = Number(raw);
                    onMinArmyChange(
                      unit,
                      Number.isFinite(parsed) ? Math.max(0, Math.min(max, Math.floor(parsed))) : 0,
                    );
                  }}
                />
                <span className="army-min-army__label">{unitShortLabel(unit)}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {!hasMaxArmy ? (
        <div className="army-optimizer__note army-optimizer__note--warning">
          Add {sideName} units to set the maximum army.
        </div>
      ) : null}
      {!hasOpponentArmy ? (
        <div className="army-optimizer__note army-optimizer__note--warning">
          Add {opponentName} units as the opponent.
        </div>
      ) : null}
    </section>
  );
}

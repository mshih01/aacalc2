import type { Army, Recommendation } from 'aacalc2';
import { formatFixed } from '../../utils/display.ts';
import {
  positiveUnitKeys,
  type ArmyOptimizeSide,
} from '../../utils/armyOptimizer.ts';
import { UnitIcon } from './UnitIcon.tsx';
import { unitLabel, unitShortLabel } from './unitCatalog.ts';

const SIDE_LABEL: Record<ArmyOptimizeSide, string> = {
  attacker: 'attacker',
  defender: 'defender',
};

export function ArmyRecommendationResults({
  loading,
  error,
  recommendations,
  optimizeMode,
  side,
  targetPercentage,
  ipcDecimals,
  onUseArmy,
  onCancel,
}: {
  loading: boolean;
  error: string | null;
  recommendations: Recommendation[];
  optimizeMode: 'targetWinPercentage' | 'maxProfit';
  side: ArmyOptimizeSide;
  targetPercentage: number;
  ipcDecimals: number;
  onUseArmy: (army: Army) => void;
  onCancel: () => void;
}) {
  if (loading) {
    return (
      <section className="army-results" aria-label="Army recommendation">
        <div className="army-results__status">
          <span>Computing recommendation…</span>
          <button type="button" className="beta-text-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div className="results__error" role="alert">
        Army recommendation failed: {error}
      </div>
    );
  }

  const usable = recommendations.filter((rec) =>
    positiveUnitKeys(rec.army).length > 0,
  );
  if (!usable.length) {
    if (recommendations.length === 0) return null;
    return (
      <section className="army-results" aria-label="Army recommendation">
        <div className="army-results__empty">
          No army meets that target with the current maximum army.
        </div>
      </section>
    );
  }

  const sideName = SIDE_LABEL[side];
  const iconSide = side === 'attacker' ? 'attack' : 'defense';
  const meta =
    optimizeMode === 'maxProfit'
      ? `Max profit · ${sideName} · wave 1`
      : `Target ${Math.round(targetPercentage * 100)}% · ${sideName} · wave 1`;
  const costLabel = optimizeMode === 'maxProfit' ? 'Profit' : 'Cost';

  return (
    <section className="army-results" aria-label="Army recommendation">
      <header className="army-results__head">
        <h3 className="army-results__title">Recommended armies</h3>
        <span className="army-results__meta">{meta}</span>
      </header>
      {usable.map((rec, index) => {
        const army = rec.army as Record<string, number>;
        const units = positiveUnitKeys(army);
        return (
          <article className="army-rec" key={`army-rec-${index}`}>
            <div className="army-rec__title">Recommendation {index + 1}</div>
            <div className="army-rec__units">
              {units.map((unit) => (
                <div className="army-rec__unit" key={unit} title={unitLabel(unit)}>
                  <UnitIcon unit={unit} side={iconSide} size={26} />
                  <span className="army-rec__count">{army[unit]}</span>
                  <span className="army-rec__name">{unitShortLabel(unit)}</span>
                </div>
              ))}
            </div>
            <div className="army-rec__footer">
              <span className="army-rec__cost">
                {costLabel}:{' '}
                <strong>{formatFixed(rec.cost, ipcDecimals)}</strong> IPC
              </span>
              <button
                type="button"
                className="beta-text-button"
                onClick={() => onUseArmy(rec.army)}
              >
                Use as {sideName}
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

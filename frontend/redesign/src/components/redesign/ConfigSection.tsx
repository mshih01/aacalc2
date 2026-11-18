import type { CSSProperties } from 'react';
import type { BattleMode, WaveConfig } from '../../types.ts';
import {
  attackerAmphibOolPresets,
  attackerOolPresets,
  defenderOolPresets,
} from '../../data/oolPresets.ts';
import { CheckboxControl, SelectField, TextField } from './primitives.tsx';
import { retreatSummary } from './retreat.ts';

const ROUND_OPTIONS = [
  { value: 'all', label: 'All rounds' },
  ...Array.from({ length: 7 }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1} round${index === 0 ? '' : 's'}`,
  })),
];

function RetreatField({
  config,
  onClick,
}: {
  config: WaveConfig;
  onClick: (rect: DOMRect) => void;
}) {
  const summary = retreatSummary(config);
  return (
    <div
      className={`field field--button${summary ? ' field--filled' : ''}`}
      style={{ ['--field-bg' as string]: 'transparent' }}
    >
      <button
        type="button"
        className="field__button"
        onClick={(event) => onClick(event.currentTarget.getBoundingClientRect())}
        aria-label="Retreat when"
      >
        {summary}
      </button>
      <label className="field__label">Retreat when</label>
    </div>
  );
}

export function ConfigSection({
  mode,
  numWaves,
  amphibious,
  waveConfigs,
  inProgress,
  onInProgress,
  territoryValue,
  onTerritoryValue,
  isDeadzone,
  onDeadzone,
  onUpdateWave,
  onRetreatClick,
}: {
  mode: BattleMode;
  numWaves: number;
  amphibious: boolean;
  waveConfigs: Record<number, WaveConfig>;
  inProgress: boolean;
  onInProgress: (value: boolean) => void;
  territoryValue: number;
  onTerritoryValue: (value: number) => void;
  isDeadzone: boolean;
  onDeadzone: (value: boolean) => void;
  onUpdateWave: (wave: number, updates: Partial<WaveConfig>) => void;
  onRetreatClick: (wave: number, rect: DOMRect) => void;
}) {
  const style = { '--wave-count': numWaves } as CSSProperties;
  const attackPresets =
    amphibious && mode === 'land' ? attackerAmphibOolPresets : attackerOolPresets;
  const attackOolOptions = attackPresets[mode].map((preset) => ({
    value: preset.id,
    label: preset.label,
  }));
  const defenseOolOptions = defenderOolPresets[mode].map((preset) => ({
    value: preset.id,
    label: preset.label,
  }));
  const rounds = ROUND_OPTIONS.map((option) =>
    option.value === 'all' && numWaves > 1 ? { value: 'all', label: 'All' } : option,
  );
  const waves = Array.from({ length: numWaves }, (_, index) => index);

  return (
    <div className="beta-config-grid">
      <div className="beta-config-side">
        <div className="beta-config-row" style={style}>
          {waves.map((wave) => (
            <SelectField
              key={`att-ool-${wave}`}
              className="field--ool"
              green
              label="Order of loss"
              value={waveConfigs[wave]?.attackOolPreset ?? attackOolOptions[0]?.value}
              options={attackOolOptions}
              onChange={(value) => onUpdateWave(wave, { attackOolPreset: value })}
            />
          ))}
        </div>

        <div className="beta-config-row" style={style}>
          {waves.map((wave) => (
            <SelectField
              key={`att-rounds-${wave}`}
              green
              label="Rounds"
              value={waveConfigs[wave]?.rounds ?? 'all'}
              options={rounds}
              onChange={(value) => onUpdateWave(wave, { rounds: value })}
            />
          ))}
        </div>

        <div className="beta-config-row" style={style}>
          {waves.map((wave) => (
            <RetreatField
              key={`att-retreat-${wave}`}
              config={waveConfigs[wave]}
              onClick={(rect) => onRetreatClick(wave, rect)}
            />
          ))}
        </div>

        {mode === 'land' ? (
          <>
            <div className="beta-config-row" style={style}>
              {waves.map((wave) => (
                <TextField
                  key={`att-takes-${wave}`}
                  label="Land units to die last"
                  type="number"
                  min={0}
                  step={1}
                  value={
                    waveConfigs[wave]?.takesTerritory
                      ? String(waveConfigs[wave].takesTerritory)
                      : ''
                  }
                  onChange={(value) =>
                    onUpdateWave(wave, {
                      takesTerritory: Math.max(0, Number(value) || 0),
                    })
                  }
                />
              ))}
            </div>
            <CheckboxControl large label="Dead zone" checked={isDeadzone} onChange={onDeadzone} />
          </>
        ) : (
          <>
            <div className="beta-config-row checkbox-row" style={style}>
              {waves.map((wave) => (
                <CheckboxControl
                  key={`att-sub-${wave}`}
                  label="Submerge subs"
                  checked={waveConfigs[wave]?.attackerSubmerge ?? false}
                  onChange={(checked) => onUpdateWave(wave, { attackerSubmerge: checked })}
                />
              ))}
            </div>
            <div className="beta-config-row checkbox-row" style={style}>
              {waves.map((wave) => (
                <CheckboxControl
                  key={`att-dest-${wave}`}
                  label="Destroyer last"
                  checked={waveConfigs[wave]?.attackerDestroyerLast ?? false}
                  onChange={(checked) => onUpdateWave(wave, { attackerDestroyerLast: checked })}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="beta-config-side">
        <div className="beta-config-row" style={style}>
          {waves.map((wave) => (
            <SelectField
              key={`def-ool-${wave}`}
              className="field--ool"
              green
              label="Order of loss"
              value={waveConfigs[wave]?.defenseOolPreset ?? defenseOolOptions[0]?.value}
              options={defenseOolOptions}
              onChange={(value) => onUpdateWave(wave, { defenseOolPreset: value })}
            />
          ))}
        </div>

        <div className="config-control-row">
          <CheckboxControl
            label="Battle in progress"
            checked={inProgress}
            onChange={onInProgress}
          />
        </div>

        {mode === 'land' ? (
          <>
            <TextField
              label="Territory value (IPC)"
              type="number"
              min={0}
              step={1}
              value={territoryValue ? String(territoryValue) : ''}
              onChange={(value) => onTerritoryValue(Math.max(0, Number(value) || 0))}
            />
            <div className="beta-config-row checkbox-row config-row--tall" style={style}>
              {waves.map((wave) => (
                <CheckboxControl
                  key={`def-aa-${wave}`}
                  large
                  label="AA 2nd last"
                  checked={waveConfigs[wave]?.aaLast ?? false}
                  onChange={(checked) => onUpdateWave(wave, { aaLast: checked })}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="beta-config-row checkbox-row config-row--tall" style={style}>
              {waves.map((wave) => (
                <CheckboxControl
                  key={`def-sub-${wave}`}
                  label="Submerge subs"
                  checked={waveConfigs[wave]?.defenderSubmerge ?? false}
                  onChange={(checked) => onUpdateWave(wave, { defenderSubmerge: checked })}
                />
              ))}
            </div>
            <div className="beta-config-row checkbox-row" style={style}>
              {waves.map((wave) => (
                <CheckboxControl
                  key={`def-dest-${wave}`}
                  label="Destroyer last"
                  checked={waveConfigs[wave]?.defenderDestroyerLast ?? false}
                  onChange={(checked) => onUpdateWave(wave, { defenderDestroyerLast: checked })}
                />
              ))}
            </div>
            <div className="beta-config-row checkbox-row" style={style}>
              {waves.map((wave) => (
                <CheckboxControl
                  key={`def-crash-${wave}`}
                  label="Crash fighters"
                  checked={waveConfigs[wave]?.crashFighters ?? false}
                  onChange={(checked) => onUpdateWave(wave, { crashFighters: checked })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

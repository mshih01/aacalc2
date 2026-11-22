import { useState, type CSSProperties } from 'react';
import type { BattleMode, UnitId, WaveConfig } from '../../types.ts';
import {
  attackerAmphibOolPresets,
  attackerOolPresets,
  defenderOolPresets,
} from '../../data/oolPresets.ts';
import { CheckboxControl, SelectField, TextField } from './primitives.tsx';
import { OolAutocomplete } from './OolAutocomplete.tsx';
import { oolOptionsFor, sameOol, withCurrentOol } from './oolOptions.ts';
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

/**
 * Per-wave checkbox row. The reference UI draws the label above the row and
 * keeps only the boxes under the wave columns when the wave columns would be
 * too narrow for a label beside every box (mobile, narrow container widths, or
 * three or more waves in a narrow layout).
 */
function WaveCheckboxes({
  label,
  waves,
  checked,
  onChange,
  stacked,
  style,
  skipWaves,
}: {
  label: string;
  waves: number[];
  checked: (wave: number) => boolean;
  onChange: (wave: number, checked: boolean) => void;
  stacked: boolean;
  style: CSSProperties;
  /** Waves without a control (wave 1 has no previous wave to carry over). */
  skipWaves?: number[];
}) {
  const renderBox = (wave: number) => {
    if (skipWaves?.includes(wave)) {
      return <span key={`${label}-${wave}`} className="checkbox-placeholder" aria-hidden="true" />;
    }
    return (
      <CheckboxControl
        key={`${label}-${wave}`}
        label={stacked ? '' : label}
        ariaLabel={stacked ? label : undefined}
        checked={checked(wave)}
        onChange={(value) => onChange(wave, value)}
      />
    );
  };

  if (!stacked) {
    return (
      <div className="beta-config-row checkbox-row config-row--tall" style={style}>
        {waves.map(renderBox)}
      </div>
    );
  }

  return (
    <div className="wave-checkbox-group" style={style}>
      <span className="wave-checkbox-group__label">{label}</span>
      <div className="wave-checkbox-group__boxes">{waves.map(renderBox)}</div>
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
  exhaustiveOOL,
  stackedCheckboxes,
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
  exhaustiveOOL: boolean;
  stackedCheckboxes: boolean;
}) {
  const style = { '--wave-count': numWaves } as CSSProperties;
  // Keep the raw text while the user is typing so a lone "-" survives until a
  // digit follows; the parsed number is pushed to the parent on every change.
  const [territoryDraft, setTerritoryDraft] = useState<string | null>(null);
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

  const retreatRow = (
    <div className="beta-config-row" style={style}>
      {waves.map((wave) => (
        <RetreatField
          key={`att-retreat-${wave}`}
          config={waveConfigs[wave]}
          onClick={(rect) => onRetreatClick(wave, rect)}
        />
      ))}
    </div>
  );

  const presetOptions = {
    attack: attackOolOptions,
    defense: defenseOolOptions,
  };

  const renderOolField = (side: 'attack' | 'defense', wave: number) => {
    const config = waveConfigs[wave];
    const presets = side === 'attack' ? attackPresets[mode] : defenderOolPresets[mode];
    const presetId = side === 'attack' ? config?.attackOolPreset : config?.defenseOolPreset;
    const custom = side === 'attack' ? config?.attackOol : config?.defenseOol;
    const preset = presets.find((item) => item.id === presetId);
    const current = custom ?? preset?.ool ?? presets[0]?.ool ?? [];
    if (exhaustiveOOL) {
      const options = withCurrentOol(oolOptionsFor(side, mode, amphibious), current);
      return (
        <OolAutocomplete
          key={`${side}-ool-${wave}`}
          label="Order of loss"
          value={current}
          options={options}
          onChange={(ool: UnitId[]) => {
            const match = presets.find((item) => sameOol(item.ool, ool));
            if (side === 'attack') {
              onUpdateWave(wave, {
                attackOolPreset: match?.id ?? presetId ?? presets[0]?.id ?? '',
                attackOol: match ? undefined : ool,
              });
            } else {
              onUpdateWave(wave, {
                defenseOolPreset: match?.id ?? presetId ?? presets[0]?.id ?? '',
                defenseOol: match ? undefined : ool,
              });
            }
          }}
        />
      );
    }

    const selectOptions = custom
      ? [...presetOptions[side], { value: '__custom__', label: 'Custom OOL' }]
      : presetOptions[side];

    return (
      <SelectField
        key={`${side}-ool-${wave}`}
        className="field--ool"
        green
        label="Order of loss"
        value={custom ? '__custom__' : (presetId ?? presets[0]?.id ?? '')}
        options={selectOptions}
        onChange={(value) => {
          if (value === '__custom__') return;
          if (side === 'attack') {
            onUpdateWave(wave, { attackOolPreset: value, attackOol: undefined });
          } else {
            onUpdateWave(wave, { defenseOolPreset: value, defenseOol: undefined });
          }
        }}
      />
    );
  };

  return (
    <div className="beta-config-grid">
      <div className="beta-config-side">
        <div className="beta-config-row" style={style}>
          {waves.map((wave) => renderOolField('attack', wave))}
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

        {mode === 'land' ? retreatRow : null}

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
          </>
        ) : (
          <>
            <WaveCheckboxes
              label="Submerge subs"
              waves={waves}
              stacked={stackedCheckboxes}
              checked={(wave) => waveConfigs[wave]?.attackerSubmerge ?? false}
              onChange={(wave, value) => onUpdateWave(wave, { attackerSubmerge: value })}
              style={style}
            />
            <WaveCheckboxes
              label="Destroyer last"
              waves={waves}
              stacked={stackedCheckboxes}
              checked={(wave) => waveConfigs[wave]?.attackerDestroyerLast ?? false}
              onChange={(wave, value) => onUpdateWave(wave, { attackerDestroyerLast: value })}
              style={style}
            />
            {retreatRow}
          </>
        )}
      </div>

      <div className="beta-config-side">
        <div className="beta-config-row" style={style}>
          {waves.map((wave) => renderOolField('defense', wave))}
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
            <div className="config-inline-row">
              <TextField
                className="field--territory"
                label={
                  <>
                    <span className="desktop-only">Territory value (IPC)</span>
                    <span className="mobile-only">Territory IPC</span>
                  </>
                }
                ariaLabel="Territory value (IPC)"
                type="text"
                inputMode="text"
                value={territoryDraft ?? (territoryValue ? String(territoryValue) : '')}
                onChange={(value) => {
                  setTerritoryDraft(value);
                  const trimmed = value.trim();
                  if (trimmed === '' || trimmed === '-') {
                    if (trimmed === '') onTerritoryValue(0);
                    return;
                  }
                  const parsed = Number(trimmed);
                  if (Number.isFinite(parsed)) onTerritoryValue(parsed);
                }}
                onBlur={() => setTerritoryDraft(null)}
              />
              <CheckboxControl
                label={
                  <>
                    <span className="desktop-only">Dead zone</span>
                    <span className="mobile-only">DZ</span>
                  </>
                }
                ariaLabel="Dead zone"
                checked={isDeadzone}
                onChange={onDeadzone}
              />
            </div>
            <WaveCheckboxes
              label="AA 2nd last"
              waves={waves}
              stacked={stackedCheckboxes}
              checked={(wave) => waveConfigs[wave]?.aaLast ?? false}
              onChange={(wave, value) => onUpdateWave(wave, { aaLast: value })}
              style={style}
            />
          </>
        ) : (
          <>
            <WaveCheckboxes
              label="Submerge subs"
              waves={waves}
              stacked={stackedCheckboxes}
              checked={(wave) => waveConfigs[wave]?.defenderSubmerge ?? false}
              onChange={(wave, value) => onUpdateWave(wave, { defenderSubmerge: value })}
              style={style}
            />
            <WaveCheckboxes
              label="Destroyer last"
              waves={waves}
              stacked={stackedCheckboxes}
              checked={(wave) => waveConfigs[wave]?.defenderDestroyerLast ?? false}
              onChange={(wave, value) => onUpdateWave(wave, { defenderDestroyerLast: value })}
              style={style}
            />
            <WaveCheckboxes
              label="Crash fighters"
              waves={waves}
              stacked={stackedCheckboxes}
              checked={(wave) => waveConfigs[wave]?.crashFighters ?? false}
              onChange={(wave, value) => onUpdateWave(wave, { crashFighters: value })}
              style={style}
            />
          </>
        )}
        {numWaves > 1 ? (
          <WaveCheckboxes
            label="Prev wave attackers"
            waves={waves}
            stacked={stackedCheckboxes}
            checked={(wave) => waveConfigs[wave]?.useAttackersFromPreviousWave ?? false}
            onChange={(wave, value) => onUpdateWave(wave, { useAttackersFromPreviousWave: value })}
            style={style}
            skipWaves={[0]}
          />
        ) : null}
      </div>
    </div>
  );
}

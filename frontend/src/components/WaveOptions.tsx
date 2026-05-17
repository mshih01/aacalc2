import type { WaveConfig } from '../types.ts'
import {
  ROUND_OPTIONS, RETREAT_OPTIONS, SEA_CONTROLS,
  WAVE_OPTIONS_BORDER_STYLE, RETREAT_LABEL_STYLE,
  CHECKBOX_LABEL_STYLE, SEA_CONTROLS_GRID_STYLE, LAND_OPTIONS_GRID_STYLE,
} from '../constants'

interface WaveOptionsProps {
  waveIdx: number
  config: WaveConfig
  isNaval: boolean
  onUpdate: (updates: Partial<WaveConfig>) => void
}

export function WaveOptions({ waveIdx, config, isNaval, onUpdate }: WaveOptionsProps) {
  const isDefaultReteatOption =
    config.retreatPwinThreshold === undefined &&
    config.retreatStrafeThreshold === undefined &&
    config.retreatLoseAirProbabilityThreshold === undefined &&
    config.retreatExpectedIpcProfitThreshold === undefined

  return (
    <div style={WAVE_OPTIONS_BORDER_STYLE}>
      {/* Grid: rounds + land-specific fields or sea controls */}
      {isNaval ? (
        <div style={SEA_CONTROLS_GRID_STYLE}>
          <div className="floating-label-group">
            <select
              value={config.rounds || 'all'}
              onChange={(e) => onUpdate({ rounds: e.target.value })}
            >
              {ROUND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <label>Rounds</label>
          </div>
          {SEA_CONTROLS.map((control) => (
            <div key={control.key} style={{ display: 'flex', alignItems: 'center' }}>
              <label style={CHECKBOX_LABEL_STYLE}>
                <input
                  type="checkbox"
                  checked={(config[control.key as keyof WaveConfig] as boolean) || false}
                  onChange={(e) => onUpdate({ [control.key]: e.target.checked })}
                />
                {control.label}
              </label>
            </div>
          ))}
          {waveIdx > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={CHECKBOX_LABEL_STYLE}>
                <input
                  type="checkbox"
                  checked={config.useAttackersFromPreviousWave || false}
                  onChange={(e) => onUpdate({ useAttackersFromPreviousWave: e.target.checked })}
                />
                Prev wave attackers
              </label>
            </div>
          )}
        </div>
      ) : (
        <div className="wave-options-grid" style={LAND_OPTIONS_GRID_STYLE}>
          <div className="floating-label-group">
            <select
              value={config.rounds || 'all'}
              onChange={(e) => onUpdate({ rounds: e.target.value })}
            >
              {ROUND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <label>Rounds</label>
          </div>
          <div className="floating-label-group">
            <input
              type="number"
              min={0}
              value={config.takesTerritory || ''}
              onChange={(e) => onUpdate({ takesTerritory: Number(e.target.value) || 0 })}
              className={config.takesTerritory ? 'has-value' : ''}
              style={{ width: '100%' }}
            />
            <label>Takes Territory</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={CHECKBOX_LABEL_STYLE}>
              <input
                type="checkbox"
                checked={config.aaLast || false}
                onChange={(e) => onUpdate({ aaLast: e.target.checked })}
              />
              AA 2nd Last
            </label>
          </div>
          {waveIdx > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={CHECKBOX_LABEL_STYLE}>
                <input
                  type="checkbox"
                  checked={config.useAttackersFromPreviousWave || false}
                  onChange={(e) => onUpdate({ useAttackersFromPreviousWave: e.target.checked })}
                />
                Prev wave attackers
              </label>
            </div>
          )}
        </div>
      )}

      {/* Retreat Options — shared by both modes */}
      <div style={{ marginBottom: '10px' }}>
        <label style={RETREAT_LABEL_STYLE}>Retreat Options:</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {RETREAT_OPTIONS.map((option) => {
            const thresholdField = option.thresholdField as keyof WaveConfig
            const isSelected = config.retreatMode !== undefined
              ? option.id === config.retreatMode
              : (option.id === 'unitCount' ? isDefaultReteatOption : (config[thresholdField] !== undefined))

            return (
              <label key={option.id} style={CHECKBOX_LABEL_STYLE}>
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => {
                    const updates: Partial<WaveConfig> = {
                      retreatMode: option.id,
                      retreatThreshold: undefined,
                      retreatPwinThreshold: undefined,
                      retreatStrafeThreshold: undefined,
                      retreatLoseAirProbabilityThreshold: undefined,
                      retreatExpectedIpcProfitThreshold: undefined,
                    }
                    if (option.id === 'unitCount') {
                      updates.retreatThreshold = 0
                    } else {
                      (updates[thresholdField] as number) = 0
                    }
                    onUpdate(updates)
                  }}
                />
                {option.label}
              </label>
            )
          })}
        </div>
      </div>

      {/* Conditional threshold inputs — land mode only */}
      {!isNaval && (
        <>
          {isDefaultReteatOption && (
            <div style={{ marginBottom: '10px' }}>
              <div className="floating-label-group">
                <input
                  type="number"
                  min={0}
                  value={config.retreatThreshold || ''}
                  onChange={(e) => onUpdate({ retreatThreshold: Number(e.target.value) || 0 })}
                  className={config.retreatThreshold ? 'has-value' : ''}
                  style={{ width: '100%' }}
                />
                <label>Threshold</label>
              </div>
            </div>
          )}
          {config.retreatExpectedIpcProfitThreshold !== undefined && (
            <div style={{ marginBottom: '10px' }}>
              <div className="floating-label-group">
                <input
                  type="number"
                  step="any"
                  value={config.retreatExpectedIpcProfitThreshold}
                  onChange={(e) => onUpdate({ retreatExpectedIpcProfitThreshold: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
                <label>Threshold</label>
              </div>
            </div>
          )}
          {config.retreatPwinThreshold !== undefined && (
            <div style={{ marginBottom: '10px' }}>
              <div className="floating-label-group">
                <input
                  type="number"
                  step="any"
                  value={config.retreatPwinThreshold}
                  onChange={(e) => onUpdate({ retreatPwinThreshold: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
                <label>Threshold</label>
              </div>
            </div>
          )}
          {config.retreatStrafeThreshold !== undefined && (
            <div style={{ marginBottom: '10px' }}>
              <div className="floating-label-group">
                <input
                  type="number"
                  step="any"
                  value={config.retreatStrafeThreshold}
                  onChange={(e) => onUpdate({ retreatStrafeThreshold: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
                <label>Threshold</label>
              </div>
            </div>
          )}
          {config.retreatLoseAirProbabilityThreshold !== undefined && (
            <div style={{ marginBottom: '10px' }}>
              <div className="floating-label-group">
                <input
                  type="number"
                  step="any"
                  value={config.retreatLoseAirProbabilityThreshold}
                  onChange={(e) => onUpdate({ retreatLoseAirProbabilityThreshold: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
                <label>Threshold</label>
              </div>
            </div>
          )}
        </>
      )}

      {/* Per-wave EV overrides — affects retreat decision only, shown when Expected IPC Profit is selected */}
      {!isNaval && config.retreatMode === 'expectedIpcProfit' && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '10px' }}>
          <label style={RETREAT_LABEL_STYLE}>EV Overrides (affects retreat decision only):</label>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <label style={CHECKBOX_LABEL_STYLE}>
              <input
                type="checkbox"
                checked={config.evDeadzone || false}
                onChange={(e) => onUpdate({ evDeadzone: e.target.checked })}
              />
              EV Deadzone
            </label>
            <div className="floating-label-group" style={{ flex: 1 }}>
              <input
                type="number"
                min={0}
                value={config.evTerritoryValue ?? ''}
                onChange={(e) => onUpdate({ evTerritoryValue: e.target.value ? Number(e.target.value) : undefined })}
                style={{ width: '100%' }}
              />
              <label>EV Territory Value</label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

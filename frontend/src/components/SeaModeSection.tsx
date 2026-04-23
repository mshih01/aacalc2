import React from 'react'
import type { WaveConfig } from '../App'
import { ROUND_OPTIONS, RETREAT_OPTIONS, SEA_CONTROLS, WAVE_OPTIONS_BORDER_STYLE, RETREAT_LABEL_STYLE, CHECKBOX_LABEL_STYLE, SEA_CONTROLS_GRID_STYLE } from '../constants'

interface SeaModeSectionProps {
  waveIdx: number
  config: WaveConfig
  onUpdate: (updates: Partial<WaveConfig>) => void
}

export function SeaModeSection({ waveIdx, config, onUpdate }: SeaModeSectionProps) {
  const isDefaultReteatOption = 
    config.retreatPwinThreshold === undefined &&
    config.retreatStrafeThreshold === undefined &&
    config.retreatLoseAirProbabilityThreshold === undefined &&
    config.retreatExpectedIpcProfitThreshold === undefined

  return (
    <div style={WAVE_OPTIONS_BORDER_STYLE}>
      {/* Rounds */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
      </div>

      {/* Retreat Options */}
      <div style={{ marginBottom: '10px' }}>
        <label style={RETREAT_LABEL_STYLE}>Retreat Options:</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {RETREAT_OPTIONS.map((option) => {
            const thresholdField = option.thresholdField as keyof WaveConfig
            // Use explicit retreatMode if available, fallback to inference for backward compatibility
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
                      (updates[thresholdField] as any) = 0
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

      {/* Sea-specific controls */}
      <div style={SEA_CONTROLS_GRID_STYLE}>
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
      </div>
    </div>
  )
}

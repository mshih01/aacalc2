import React from 'react'
import type { WaveConfig } from '../App'
import { ROUND_OPTIONS, RETREAT_OPTIONS, WAVE_OPTIONS_BORDER_STYLE, RETREAT_LABEL_STYLE, CHECKBOX_LABEL_STYLE, LAND_OPTIONS_GRID_STYLE } from '../constants'

interface LandModeSectionProps {
  waveIdx: number
  config: WaveConfig
  onUpdate: (updates: Partial<WaveConfig>) => void
}

export function LandModeSection({ waveIdx, config, onUpdate }: LandModeSectionProps) {
  const isDefaultReteatOption = 
    config.retreatPwinThreshold === undefined &&
    config.retreatStrafeThreshold === undefined &&
    config.retreatLoseAirProbabilityThreshold === undefined &&
    config.retreatExpectedIpcProfitThreshold === undefined

  return (
    <div style={WAVE_OPTIONS_BORDER_STYLE}>
      {/* Rounds, Takes Territory, AA Last */}
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

      {/* Conditional threshold inputs */}
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
    </div>
  )
}

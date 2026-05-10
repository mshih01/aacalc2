import type { BattleMode, UnitId, WaveConfig } from '../types.ts'
import { modeUnitMap, attackerOolPresets, attackerAmphibOolPresets, defenderOolPresets } from '../data/oolPresets.ts'
import { getUnitName, getUnitString } from '../utils/format.ts'
import { UnitSummaryDisplay } from './UnitSummaryDisplay'
import { WaveOptions } from './WaveOptions'

interface WaveCardProps {
  waveIdx: number
  numWaves: number
  mode: BattleMode
  amphibious: boolean
  attack: Record<string, number>
  defense: Record<string, number>
  config: WaveConfig
  onUnitChange: (side: 'attack' | 'defense', unit: string, count: number) => void
  onSwapSides: () => void
  onSwapWave: () => void
  onUpdateConfig: (updates: Partial<WaveConfig>) => void
}

export function WaveCard({
  waveIdx, numWaves, mode, amphibious,
  attack, defense, config,
  onUnitChange, onSwapSides, onSwapWave, onUpdateConfig,
}: WaveCardProps) {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Wave {waveIdx + 1}</h2>

      <div className="wave-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto minmax(200px, 1fr)', gap: '20px', marginBottom: '15px', alignItems: 'start' }}>
        {/* Attacker Column */}
        <div>
          <h3 style={{ marginBottom: '10px' }}>Attacker</h3>

          <div className="floating-label-group">
            <select
              value={config.attackOolPreset || 'inf-art-tnk-fig-bom'}
              onChange={(e) => onUpdateConfig({ attackOolPreset: e.target.value })}
            >
              {(amphibious && mode === 'land' ? attackerAmphibOolPresets : attackerOolPresets)[mode].map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <label>Order of Loss</label>
          </div>

          <div>
<label className="label-muted">Units:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                      {((modeUnitMap[mode] || []) as readonly (UnitId | 'inf_a' | 'art_a' | 'arm_a')[]).concat(
                        amphibious && mode === 'land' ? ['inf_a', 'art_a', 'arm_a'] : []
                      ).map((unit) => {
                        const isDisabled = unit === 'aa' || (mode === 'sea' && unit === 'tra')
                        return (
                          <div key={`att-${waveIdx}-${unit}`} className="floating-label-group" style={{ opacity: isDisabled ? 0.5 : 1 }}>
                    <input
                      type="number"
                      min={0}
                      disabled={isDisabled}
                      value={attack[unit] || ''}
                      className={attack[unit] ? 'has-value' : ''}
                      onChange={(e) => {
                        const n = Math.max(0, Number(e.target.value) || 0)
                        onUnitChange('attack', unit, n)
                      }}
                    />
                    <label>{getUnitName(unit)}</label>
                  </div>
                )
              })}
            </div>
          </div>
          <UnitSummaryDisplay
            title="Attacker"
            unitString={getUnitString(attack)}
            isAttacker={true}
            isLandMode={mode === 'land'}
          />
        </div>

        {/* Swap Button */}
        <button onClick={onSwapSides} className="btn btn-blue" style={{ alignSelf: 'center' }}>
          ⇄ Swap
        </button>

        {/* Defender Column */}
        <div>
          <h3 style={{ marginBottom: '10px' }}>Defender</h3>

          <div className="floating-label-group">
            <select
              value={config.defenseOolPreset || 'aa-inf-art-tnk-bom-fig'}
              onChange={(e) => onUpdateConfig({ defenseOolPreset: e.target.value })}
            >
              {defenderOolPresets[mode].map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <label>Order of Loss</label>
          </div>

          <div>
<label className="label-muted">Units:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                      {(modeUnitMap[mode] || []).map((unit) => {
                const isDisabled = mode === 'sea' ? unit === 'bom' : (unit === 'cru' || unit === 'bat')
                return (
                  <div key={`def-${waveIdx}-${unit}`} className="floating-label-group" style={{ opacity: isDisabled ? 0.5 : 1 }}>
                    <input
                      type="number"
                      min={0}
                      disabled={isDisabled}
                      value={defense[unit] || ''}
                      className={defense[unit] ? 'has-value' : ''}
                      onChange={(e) => {
                        const n = Math.max(0, Number(e.target.value) || 0)
                        onUnitChange('defense', unit, n)
                      }}
                    />
                    <label>{getUnitName(unit)}</label>
                  </div>
                )
              })}
            </div>
          </div>
          <UnitSummaryDisplay
            title="Defender"
            unitString={getUnitString(defense)}
            isAttacker={false}
            isLandMode={mode === 'land'}
          />
        </div>
      </div>

      {/* Wave Options */}
      <WaveOptions
        waveIdx={waveIdx}
        config={config}
        isNaval={mode === 'sea'}
        onUpdate={onUpdateConfig}
      />

      {waveIdx < numWaves - 1 && (
        <button onClick={onSwapWave} className="btn btn-blue" style={{ margin: '10px auto' }}>
          ↓ Swap Wave {waveIdx + 1} ↔ {waveIdx + 2}
        </button>
      )}
    </div>
  )
}

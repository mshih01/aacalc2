import { modeUnitMap } from '../data/oolPresets.ts'
import { getUnitName } from '../utils/format.ts'

interface SBRModeSectionProps {
  diceMode: 'standard' | 'lowluck' | 'biased'
  onDiceModeChange: (mode: 'standard' | 'lowluck' | 'biased') => void
  attack: Record<string, number>
  defense: Record<string, number>
  onUnitChange: (side: 'attack' | 'defense', unit: string, count: number) => void
}

export function SBRModeSection({ diceMode, onDiceModeChange, attack, defense, onUnitChange }: SBRModeSectionProps) {
  return (
    <>
      <section className="battle-options">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          <div className="floating-label-group" style={{ margin: '8px 0 0 0', position: 'relative' }}>
            <select value={diceMode} onChange={(e) => onDiceModeChange(e.target.value as 'standard' | 'lowluck' | 'biased')} style={{ width: '100%' }}>
              <option value="standard">Standard</option>
              <option value="lowluck">Low Luck</option>
              <option value="biased">Biased</option>
            </select>
            <label>Dice Mode</label>
          </div>
        </div>
      </section>

      <section style={{ border: '2px solid #333', borderRadius: '8px', padding: '15px', marginBottom: '15px', backgroundColor: '#f9f9f9' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h3>Bombers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
              {(modeUnitMap['sbr'] || []).map((unit) => (
                <div key={`att-0-${unit}`} className="floating-label-group" style={{ opacity: unit === 'ic' ? 0.5 : 1 }}>
                  <input
                    type="number"
                    min={0}
                    disabled={unit === 'ic'}
                    value={attack[unit] || ''}
                    className={attack[unit] ? 'has-value' : ''}
                    onChange={(e) => {
                      const n = Math.max(0, Number(e.target.value) || 0)
                      onUnitChange('attack', unit, n)
                    }}
                  />
                  <label>{getUnitName(unit)}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Industrial Complexes</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
              {(modeUnitMap['sbr'] || []).map((unit) => (
                <div key={`def-0-${unit}`} className="floating-label-group" style={{ opacity: unit === 'bom' ? 0.5 : 1 }}>
                  <input
                    type="number"
                    min={0}
                    disabled={unit === 'bom'}
                    value={defense[unit] || ''}
                    className={defense[unit] ? 'has-value' : ''}
                    onChange={(e) => {
                      const n = Math.max(0, Number(e.target.value) || 0)
                      onUnitChange('defense', unit, n)
                    }}
                  />
                  <label>{getUnitName(unit)}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

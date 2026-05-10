import type { BattleMode } from '../../types.ts'
import { MODES } from '../../constants'

interface ModeSelectorProps {
  mode: BattleMode
  onChange: (mode: BattleMode) => void
}

const LABELS: Record<string, string> = {
  land: 'Land',
  sea: 'Sea',
  sbr: 'SBR',
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      <label>Battle Mode:</label>
      {Object.values(MODES).map((value) => (
        <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0, cursor: 'pointer' }}>
          <input
            type="radio"
            name="battleMode"
            value={value}
            checked={mode === value}
            onChange={() => onChange(value)}
          />
          {LABELS[value]}
        </label>
      ))}
    </div>
  )
}

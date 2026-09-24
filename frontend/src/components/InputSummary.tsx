import type { BattleMode, WaveConfig } from '../types.ts'
import { attackerOolPresets, attackerAmphibOolPresets, defenderOolPresets } from '../data/oolPresets.ts'
import { getOolString, getUnitString } from '../utils/format.ts'
import { calculateUnitSummary } from '../utils/unitStats.ts'
import { RETREAT_OPTIONS } from '../constants.ts'

interface InputSummaryProps {
  mode: BattleMode
  numWaves: number
  diceMode: 'standard' | 'lowluck' | 'biased'
  amphibious: boolean
  territoryValue: number
  isDeadzone: boolean
  inProgress: boolean
  attack: Record<number, Record<string, number>>
  defense: Record<number, Record<string, number>>
  waveConfigs: Record<number, WaveConfig>
  onExpand: () => void
}

const DICE_LABEL: Record<string, string> = {
  standard: 'standard dice',
  lowluck: 'low luck',
  biased: 'biased dice',
}

function retreatLabel(config: WaveConfig): string {
  const active = RETREAT_OPTIONS.find((option) => option.id === (config.retreatMode ?? 'unitCount'))
  if (!active) return 'Retreat if Number of Attacking Units ≤ 0'
  const threshold = config[active.thresholdField as keyof WaveConfig]
  return `${active.label}${threshold !== undefined ? ` ${threshold}` : ''}`
}

function unitLine(units: Record<string, number>, isAttacker: boolean, isLandMode: boolean): string {
  const string = getUnitString(units)
  if (!string) return 'none'
  const summary = calculateUnitSummary(string, isAttacker, isLandMode)
  return `${string} — ${summary.unitCount} units, ${summary.cost} IPC, ${summary.hitPoints} HP, ${summary.power} power`
}

export function InputSummary({
  mode,
  numWaves,
  diceMode,
  amphibious,
  territoryValue,
  isDeadzone,
  inProgress,
  attack,
  defense,
  waveConfigs,
  onExpand,
}: InputSummaryProps) {
  const modes: Record<BattleMode, string> = { land: 'Land', sea: 'Sea', sbr: 'SBR' }

  return (
    // The whole summary is the "edit" affordance: a click anywhere expands it.
    <div
      className="card summary-card"
      role="button"
      tabIndex={0}
      title="Click to edit the battle input"
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onExpand()
        }
      }}
    >
      <div className="summary-header">
        <h2 style={{ margin: 0 }}>Battle Input</h2>
        <span className="summary-hint">Click to edit</span>
      </div>

      <div className="summary-global">
        {modes[mode]} · {numWaves} wave{numWaves > 1 ? 's' : ''} · {DICE_LABEL[diceMode]}
        {mode !== 'sbr' && amphibious ? ' · amphibious' : ''}
        {mode !== 'sbr' && territoryValue > 0 ? ` · territory value ${territoryValue}` : ''}
        {mode !== 'sbr' && isDeadzone ? ' · deadzone' : ''}
        {inProgress ? ' · battle in progress' : ''}
      </div>

      {Array.from({ length: numWaves }, (_, waveIdx) => {
        const config = waveConfigs[waveIdx] || {}
        const isLand = mode === 'land'
        const attackerPreset = (amphibious && mode === 'land' ? attackerAmphibOolPresets : attackerOolPresets)[mode].find(
          (p) => p.id === config.attackOolPreset,
        )
        const defenderPreset = defenderOolPresets[mode].find((p) => p.id === config.defenseOolPreset)

        return (
          <div className="summary-row" key={`summary-${waveIdx}`}>
            <div className="summary-wave">
              <span className="summary-wave-label">Wave {waveIdx + 1}</span>
            </div>
            <div className="summary-side">
              <span className="summary-side-label summary-attacker">Att</span>
              <span>{unitLine(attack[waveIdx] || {}, true, isLand)}</span>
            </div>
            <div className="summary-side">
              <span className="summary-side-label summary-defender">Def</span>
              <span>{unitLine(defense[waveIdx] || {}, false, isLand)}</span>
            </div>
            <div className="summary-meta">
              <span
                title={`Attacker OOL: ${attackerPreset?.label ?? 'default'}\nDefender OOL: ${defenderPreset?.label ?? 'default'}`}
              >
                OOL: {attackerPreset ? getOolString(attackerPreset.ool) : 'default'} vs{' '}
                {defenderPreset ? getOolString(defenderPreset.ool) : 'default'}
              </span>
              <span>Rounds: {config.rounds === 'all' ? 'All' : config.rounds}</span>
              <span>{retreatLabel(config)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

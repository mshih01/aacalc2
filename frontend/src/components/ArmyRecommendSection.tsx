import React, { useState, useEffect } from 'react'
import { armyRecommend, type ArmyRecommendInput } from 'aacalc2'
import type { BattleInput } from '../App'

interface ArmyRecommendConfig {
  optimizeMode: 'targetWinPercentage' | 'maxProfit'
  targetPercentage: number
  numRecommendations: number
  pwinMode: 'takes' | 'destroys'
  attDefType: 'attacker' | 'defender'
}

interface Recommendation {
  army: Record<string, number>
  cost: number
}

interface ArmyRecommendSectionProps {
  battleInput: BattleInput
  waveIdx?: number
  onRecommendationResult?: (results: Recommendation[]) => void
  onArmyCopy?: (army: Record<string, number>, attDefType: 'attacker' | 'defender', waveIdx: number) => void
}

export function ArmyRecommendSection({ battleInput, waveIdx = 0, onRecommendationResult, onArmyCopy }: ArmyRecommendSectionProps) {
  const [config, setConfig] = useState<ArmyRecommendConfig>({
    optimizeMode: 'targetWinPercentage',
    targetPercentage: 0.90,
    numRecommendations: 3,
    pwinMode: 'destroys',
    attDefType: 'attacker',
  })

  const [results, setResults] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Clear results when config or battleInput changes
  useEffect(() => {
    setResults([])
    setError('')
  }, [config, battleInput])

  const handleRecommend = async () => {
    setIsLoading(true)
    setError('')
    try {
      // Build the ArmyRecommendInput from battleInput
      const armyRecommendInput: ArmyRecommendInput = {
        // Base MultiwaveInput fields
        wave_info: [
          {
            attack: {
              units: battleInput.attack[waveIdx] || {},
              ool: battleInput.attackOol?.[waveIdx] || [],
              takes: battleInput.takesTerritory?.[waveIdx] ?? 0,
              aaLast: battleInput.aaLast?.[waveIdx] ?? false,
            },
            defense: {
              units: battleInput.defense[waveIdx] || {},
              ool: battleInput.defenseOol?.[waveIdx] || [],
              takes: 0,
              aaLast: battleInput.aaLast?.[waveIdx] ?? false,
            },
            att_submerge: battleInput.attackerSubmerge?.[waveIdx] ?? false,
            def_submerge: battleInput.defenderSubmerge?.[waveIdx] ?? false,
            att_dest_last: battleInput.attackerDestroyerLast?.[waveIdx] ?? false,
            def_dest_last: battleInput.defenderDestroyerLast?.[waveIdx] ?? false,
            is_crash_fighters: battleInput.crashFighters?.[waveIdx] ?? false,
            rounds: battleInput.rounds?.[waveIdx] ? (battleInput.rounds[waveIdx] === 'all' ? 0 : Number(battleInput.rounds[waveIdx])) : 100,
            retreat_threshold: battleInput.retreatThreshold?.[waveIdx] ?? 0,
            retreat_expected_ipc_profit_threshold: battleInput.retreatExpectedIpcProfitThresholds?.[waveIdx],
            retreat_pwin_threshold: battleInput.retreatPwinThresholds?.[waveIdx],
            retreat_strafe_threshold: battleInput.retreatStrafeThresholds?.[waveIdx],
            retreat_lose_air_probability: battleInput.retreatLoseAirProbabilityThresholds?.[waveIdx],
            pwinMode: config.pwinMode,
          },
        ],
        debug: false,
        prune_threshold: battleInput.pruneThreshold || 1e-12,
        report_prune_threshold: battleInput.reportPruneThreshold || 1e-12,
        is_naval: battleInput.mode === 'sea',
        in_progress: battleInput.inProgress || false,
        num_runs: 1,
        verbose_level: battleInput.verboseLevel || 0,
        diceMode: battleInput.diceMode || 'standard',
        sortMode: battleInput.sortMode || 'unit_count',
        territory_value: battleInput.territoryValue || 0,
        is_deadzone: battleInput.isDeadzone || false,
        retreat_round_zero: false,
        do_roundless_eval: true,
        // ArmyRecommendInput specific fields
        attDefType: config.attDefType,
        optimizeMode: config.optimizeMode,
        numRecommendations: config.numRecommendations,
        targetPercentage: config.targetPercentage,
        solveType: config.optimizeMode === 'maxProfit' ? 'gridSearch' : 'fuzzyBinarySearch',
      } as ArmyRecommendInput

      const armyRecommendResult = armyRecommend(armyRecommendInput)
      if (battleInput.verboseLevel && battleInput.verboseLevel > 0) {
        console.log('Frontend received armyRecommend output:', armyRecommendResult)
        console.log('Frontend armyRecommend input:', armyRecommendInput)
      }
      setResults(armyRecommendResult.recommendations)
      onRecommendationResult?.(armyRecommendResult.recommendations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Army Recommend Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ border: '2px solid #1d4ed8', borderRadius: '8px', padding: '15px', marginTop: '20px', backgroundColor: '#f0f4f8' }}>
      <h3 style={{ marginTop: 0, color: '#1d4ed8' }}>Army Recommend</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        {/* Optimize Mode */}
        <div className="floating-label-group">
          <select
            value={config.optimizeMode}
            onChange={(e) => setConfig({ ...config, optimizeMode: e.target.value as 'targetWinPercentage' | 'maxProfit' })}
            style={{ width: '100%' }}
          >
            <option value="targetWinPercentage">Target Win %</option>
            <option value="maxProfit">Max Profit (IPC)</option>
          </select>
          <label>Optimize Mode</label>
        </div>

        {/* Conditional: Target Percentage for targetWinPercentage */}
        {config.optimizeMode === 'targetWinPercentage' && (
          <>
            <div className="floating-label-group">
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={config.targetPercentage}
                onChange={(e) => setConfig({ ...config, targetPercentage: Number(e.target.value) || 0 })}
                style={{ width: '100%' }}
                className={config.targetPercentage ? 'has-value' : ''}
              />
              <label>Target Win Probability (0-1)</label>
            </div>
            <div className="floating-label-group">
              <select
                value={config.attDefType}
                onChange={(e) => setConfig({ ...config, attDefType: e.target.value as 'attacker' | 'defender' })}
                style={{ width: '100%' }}
              >
                <option value="attacker">Attacker</option>
                <option value="defender">Defender</option>
              </select>
              <label>Optimize For</label>
            </div>
          </>
        )}

        {/* Conditional: Num Recommendations for maxProfit */}
        {config.optimizeMode === 'maxProfit' && (
          <>
            <div className="floating-label-group">
              <input
                type="number"
                min={1}
                step={1}
                value={config.numRecommendations}
                onChange={(e) => setConfig({ ...config, numRecommendations: Math.max(1, Number(e.target.value) || 1) })}
                style={{ width: '100%' }}
                className={config.numRecommendations ? 'has-value' : ''}
              />
              <label>Number of Recommendations</label>
            </div>
            <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
              Max Profit mode optimizes for Attacker only
            </div>
          </>
        )}

        {/* PWin Mode */}
        <div className="floating-label-group">
          <select
            value={config.pwinMode}
            onChange={(e) => setConfig({ ...config, pwinMode: e.target.value as 'takes' | 'destroys' })}
            style={{ width: '100%' }}
          >
            <option value="takes">Takes Territory</option>
            <option value="destroys">Destroys</option>
          </select>
          <label>PWin Mode</label>
        </div>
      </div>

      {/* Recommend Button */}
      <button
        onClick={handleRecommend}
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          backgroundColor: isLoading ? '#ccc' : '#1d4ed8',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '15px',
        }}
      >
        {isLoading ? 'Computing Recommendation...' : 'Get Army Recommendation'}
      </button>

      {error && (
        <div style={{ backgroundColor: '#fee', border: '1px solid #f88', borderRadius: '4px', padding: '10px', marginBottom: '15px', color: '#c00' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ backgroundColor: '#efe', border: '1px solid #8f8', borderRadius: '4px', padding: '15px', marginTop: '15px' }}>
          <h4 style={{ marginTop: 0 }}>Recommended Armies ({results.length})</h4>
          {results.map((result, idx) => (
            <div key={idx} style={{ marginBottom: idx < results.length - 1 ? '20px' : '0', paddingBottom: idx < results.length - 1 ? '15px' : '0', borderBottom: idx < results.length - 1 ? '1px solid #8f8' : 'none' }}>
              <h5 style={{ marginTop: 0, color: '#090' }}>Recommendation #{idx + 1}</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                {Object.entries(result.army).map(([unitId, count]) => (
                  count > 0 && (
                    <div key={unitId} style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{unitId.toUpperCase()}</div>
                      <div style={{ color: '#666', fontSize: '12px' }}>Count: {count}</div>
                    </div>
                  )
                ))}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#090', marginBottom: '10px' }}>
                {config.optimizeMode === 'maxProfit' ? 'IPC Profit' : 'Cost'}: {result.cost} IPC
              </div>
              <button
                onClick={() => onArmyCopy?.(result.army, config.attDefType, waveIdx)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#090',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Copy to {config.attDefType === 'attacker' ? 'Attacker' : 'Defender'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

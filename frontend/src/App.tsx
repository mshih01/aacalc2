import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import {
  multiwaveComplexityFastV2,
  type MultiwaveInput,
} from 'aacalc2'
import ReactGA from 'react-ga4'
import './App.css'
import { MODES, DEFAULT_OOL_PRESETS } from './constants'
import { SeaModeSection } from './components/SeaModeSection'
import { LandModeSection } from './components/LandModeSection'
import { UnitSummaryDisplay } from './components/UnitSummaryDisplay'
import { ArmyRecommendSection } from './components/ArmyRecommendSection'
import { unitIds, DEFAULT_WAVE_CONFIG, MAX_WAVES, type BattleInput, type BattleMode, type UnitId, type HistoryEntry, type WaveConfig } from './types.ts'
import { useWaveState } from './hooks/useWaveState.ts'
import { computeBattle, computeSbrBattle, validateArmySizes } from './engine.ts'
import { encodeStateToUrl, decodeStateFromUrl, getUnitName, getUnitString, getPercentileColor } from './utils/format.ts'
import { modeUnitMap, attackerOolPresets, attackerAmphibOolPresets, defenderOolPresets } from './data/oolPresets.ts'
import { Toast } from './components/ui/Toast.tsx'
import { CollapsibleSection } from './components/ui/CollapsibleSection.tsx'
import { CollapsibleSubsection } from './components/ui/CollapsibleSubsection.tsx'
import { ModeSelector } from './components/controls/ModeSelector.tsx'
import { ResetButtons } from './components/controls/ResetButtons.tsx'
import { HistoryPanel } from './components/HistoryPanel.tsx'
import { DetailedCasualties } from './components/DetailedCasualties.tsx'
import { ProfitDistributionTable } from './components/charts/ProfitDistributionTable.tsx'
import { ProfitDistributionHistogram } from './components/charts/ProfitDistributionHistogram.tsx'
import { WaveCard } from './components/WaveCard.tsx'
import { SBRModeSection } from './components/SBRModeSection.tsx'

// Configuration Constants
const MAX_COMPLEXITY = 200000
const INSTANTANEOUS_EVALUATION_THRESHOLD = 10000
const AUTO_EVALUATE_BOUNCE_TIMER = 750 // ms


// Initialize Google Analytics
ReactGA.initialize('G-XFRR47N18Q')

// Component: Detailed Attacker Casualties (per-wave)
// Component: Profit Distribution Table (per-wave)
function App() {
  const [mode, setMode] = useState<BattleMode>('land')
  const [numWaves, setNumWaves] = useState(1)
  const [diceMode, setDiceMode] = useState<'standard' | 'lowluck' | 'biased'>('standard')
  const [amphibious, setAmphibious] = useState(false)
  const [territoryValue, setTerritoryValue] = useState(0)
  const [isDeadzone, setIsDeadzone] = useState(false)
  const [inProgress, setInProgress] = useState(false)
  const [verboseLevel, setVerboseLevel] = useState(0)
  const [pruneThreshold, setPruneThreshold] = useState(1e-12)
  const [reportPruneThreshold, setReportPruneThreshold] = useState(1e-12)
  const [sortMode, setSortMode] = useState<'unit_count' | 'ipc_cost'>('ipc_cost')
  const [complexityThreshold, setComplexityThreshold] = useState(MAX_COMPLEXITY)
  const [instantaneousEvaluationThreshold, setInstantaneousEvaluationThreshold] = useState(INSTANTANEOUS_EVALUATION_THRESHOLD)
  const [decimalPlaces, setDecimalPlaces] = useState(2)
  const [ipcLossDecimalPlaces, setIpcLossDecimalPlaces] = useState(2)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [experimentalConvolution, setExperimentalConvolution] = useState(false)
  const [retreatZeroRound, setRetreatZeroRound] = useState(false)
  const [histogramZooms, setHistogramZooms] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {}
    for (let i = 0; i < MAX_WAVES; i++) {
      initial[i] = 1
    }
    return initial
  })
  const [toast, setToast] = useState<{ message: string } | null>(null)
  
  // Per-wave state consolidated via hook
  const { waveConfigs, updateWave, resetWaves } = useWaveState(MAX_WAVES)
  
  // Units per wave
  const [attack, setAttack] = useState<Record<number, Record<string, number>>>(() => {
    const initial: Record<number, Record<string, number>> = {}
    for (let i = 0; i < MAX_WAVES; i++) {
      initial[i] = {}
    }
    return initial
  })
  const [defense, setDefense] = useState<Record<number, Record<string, number>>>(() => {
    const initial: Record<number, Record<string, number>> = {}
    for (let i = 0; i < MAX_WAVES; i++) {
      initial[i] = {}
    }
    return initial
  })
  const [result, setResult] = useState<ReturnType<typeof computeBattle> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [complexityWarning, setComplexityWarning] = useState<{ complexity: number; threshold: number } | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyName, setHistoryName] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  
  // Refs to track when we need to run battle after loading history
  const shouldRunBattleRef = useRef(false)
  const loadedEntryNameRef = useRef<string | null>(null)
  const isLoadingFromHistoryRef = useRef(false)
  // Helper function to set zoom for specific wave
  const setHistogramZoom = (waveIdx: number, zoom: number) => {
    setHistogramZooms(prev => ({ ...prev, [waveIdx]: zoom }))
  }

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('battleHistory')
    if (stored) {
      try {
        setHistory(JSON.parse(stored))
      } catch (e) {
        console.warn('Failed to load history from localStorage:', e)
      }
    }
  }, [])

  // Load state from URL on mount
  useEffect(() => {
    const sharedInput = decodeStateFromUrl()
    if (sharedInput) {
      loadFromHistoryInput(sharedInput)
    }
  }, [])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('battleHistory', JSON.stringify(history))
  }, [history])

  // Ensure units & presets stay in mode when switching modes
  useEffect(() => {
    // Skip reset if we're in the middle of loading from history
    if (isLoadingFromHistoryRef.current) {
      return
    }
    
    const allowed = new Set(modeUnitMap[mode])
    setAttack((prev) => {
      const next: Record<number, Record<string, number>> = {}
      for (let i = 0; i < MAX_WAVES; i++) {
        next[i] = Object.fromEntries(Object.entries(prev[i] || {}).filter(([k]) => allowed.has(k as UnitId)))
      }
      return next
    })
    setDefense((prev) => {
      const next: Record<number, Record<string, number>> = {}
      for (let i = 0; i < MAX_WAVES; i++) {
        next[i] = Object.fromEntries(Object.entries(prev[i] || {}).filter(([k]) => allowed.has(k as UnitId)))
      }
      return next
    })
    // Reset wave configs to defaults, then set appropriate presets for this mode
    resetWaves(MAX_WAVES)
    for (let i = 0; i < MAX_WAVES; i++) {
      updateWave(i, {
        attackOolPreset: (amphibious && mode === 'land' ? attackerAmphibOolPresets : attackerOolPresets)[mode][0].id,
        defenseOolPreset: defenderOolPresets[mode][0].id,
      })
    }
    setNumWaves(mode === 'sbr' ? 1 : 1)
  }, [mode, resetWaves, updateWave, amphibious])

  // Clear results and complexity warning when any input changes
  useEffect(() => {
    setResult(null)
    setComplexityWarning(null)
  }, [attack, defense, waveConfigs, diceMode, inProgress, verboseLevel, pruneThreshold, reportPruneThreshold, sortMode, territoryValue, isDeadzone, numWaves, complexityThreshold, instantaneousEvaluationThreshold])

  // Helper function to build multiwave input for complexity calculation
  const buildMultiwaveInputForComplexity = useCallback((
    inputAttack: Record<number, Record<string, number>>,
    inputDefense: Record<number, Record<string, number>>,
    attackOolRecord: Record<number, UnitId[]>,
    defenseOolRecord: Record<number, UnitId[]>,
    roundsNum: Record<number, number>,
    takesTerritoryRecord: Record<number, number>,
    aaLastRecord: Record<number, boolean>,
    attackerSubmergeRecord: Record<number, boolean>,
    defenderSubmergeRecord: Record<number, boolean>,
    attackerDestroyerLastRecord: Record<number, boolean>,
    defenderDestroyerLastRecord: Record<number, boolean>,
    crashFightersRecord: Record<number, boolean>,
    retreatThresholdRecord: Record<number, number>,
    retreatExpectedIpcProfitRecord: Record<number, number | undefined>,
    retreatPwinRecord: Record<number, number | undefined>,
    retreatStrafeRecord: Record<number, number | undefined>,
    retreatLoseAirRecord: Record<number, number | undefined>,
    useAttackersFromPreviousWaveRecord: Record<number, boolean>
  ): MultiwaveInput => {
    return {
      wave_info: Array.from({ length: numWaves }, (_, waveIdx) => {
        const attackOol: UnitId[] = attackOolRecord[waveIdx] || ['inf', 'art', 'arm', 'fig', 'bom']
        const defenseOol: UnitId[] = defenseOolRecord[waveIdx] || ['aa', 'inf', 'art', 'arm', 'fig', 'bom']
        const waves = roundsNum[waveIdx] 
          ? (roundsNum[waveIdx] === 100 ? 100 : Number(roundsNum[waveIdx]))
          : 100
        return {
          attack: {
            units: inputAttack[waveIdx] || {},
            ool: attackOol,
            takes: takesTerritoryRecord[waveIdx] ?? 0,
            aaLast: aaLastRecord[waveIdx] ?? false,
          },
          defense: {
            units: inputDefense[waveIdx] || {},
            ool: defenseOol,
            takes: 0,
            aaLast: aaLastRecord[waveIdx] ?? false,
          },
          att_submerge: attackerSubmergeRecord[waveIdx] ?? false,
          def_submerge: defenderSubmergeRecord[waveIdx] ?? false,
          att_dest_last: attackerDestroyerLastRecord[waveIdx] ?? false,
          def_dest_last: defenderDestroyerLastRecord[waveIdx] ?? false,
          is_crash_fighters: crashFightersRecord[waveIdx] ?? false,
          rounds: waves,
          retreat_threshold: retreatThresholdRecord[waveIdx] ?? 0,
          retreat_expected_ipc_profit_threshold: retreatExpectedIpcProfitRecord[waveIdx],
          retreat_pwin_threshold: retreatPwinRecord[waveIdx],
          retreat_strafe_threshold: retreatStrafeRecord[waveIdx],
          retreat_lose_air_probability: retreatLoseAirRecord[waveIdx],
          pwinMode: 'takes' as const,
          use_attackers_from_previous_wave: useAttackersFromPreviousWaveRecord[waveIdx] ?? false,
        }
      }),
      debug: false,
      prune_threshold: pruneThreshold ?? 1e-12,
      report_prune_threshold: reportPruneThreshold ?? 1e-12,
      is_naval: mode === 'sea',
      in_progress: inProgress ?? false,
      num_runs: 1,
      verbose_level: verboseLevel ?? 0,
      diceMode: diceMode ?? 'standard',
      sortMode: sortMode ?? 'unit_count',
      territory_value: territoryValue ?? 0,
      is_deadzone: isDeadzone ?? false,
    retreat_round_zero: retreatZeroRound ?? false,
      do_roundless_eval: true,
    }
  }, [numWaves, pruneThreshold, reportPruneThreshold, mode, inProgress, verboseLevel, diceMode, sortMode, territoryValue, isDeadzone, retreatZeroRound])

  // Auto-evaluate if complexity is below instantaneous evaluation threshold (with debounce)
  useEffect(() => {
    // Debounce timer: wait AUTO_EVALUATE_BOUNCE_TIMER ms after inputs stop changing before evaluating
    const timer = setTimeout(() => {
      // Validate army sizes before attempting to evaluate
      const validation = validateArmySizes(attack, defense, numWaves)
      if (!validation.valid) {
        // Don't show error during auto-evaluate, just skip it
        return
      }
      
      // Build per-wave OOL records
      const attackOolRecord: Record<number, UnitId[]> = {}
      const defenseOolRecord: Record<number, UnitId[]> = {}
      const roundsNum: Record<number, number> = {}
      const retreatThresholdRecord: Record<number, number> = {}
      const takesTerritoryRecord: Record<number, number> = {}
      const aaLastRecord: Record<number, boolean> = {}
      const attackerSubmergeRecord: Record<number, boolean> = {}
      const defenderSubmergeRecord: Record<number, boolean> = {}
      const attackerDestroyerLastRecord: Record<number, boolean> = {}
      const defenderDestroyerLastRecord: Record<number, boolean> = {}
      const crashFightersRecord: Record<number, boolean> = {}
      const retreatExpectedIpcProfitRecord: Record<number, number | undefined> = {}
      const retreatPwinRecord: Record<number, number | undefined> = {}
      const retreatStrafeRecord: Record<number, number | undefined> = {}
      const retreatLoseAirRecord: Record<number, number | undefined> = {}
      const useAttackersFromPreviousWaveRecord: Record<number, boolean> = {}
      
      for (let i = 0; i < numWaves; i++) {
        const config = waveConfigs[i]
        attackOolRecord[i] = (amphibious && mode === 'land' ? attackerAmphibOolPresets : attackerOolPresets)[mode].find((o) => o.id === config.attackOolPreset)?.ool || []
        defenseOolRecord[i] = defenderOolPresets[mode].find((o) => o.id === config.defenseOolPreset)?.ool || []
        roundsNum[i] = config.rounds === 'all' ? 100 : parseInt(config.rounds)
        retreatThresholdRecord[i] = config.retreatThreshold
        takesTerritoryRecord[i] = config.takesTerritory
        aaLastRecord[i] = config.aaLast
        attackerSubmergeRecord[i] = config.attackerSubmerge
        defenderSubmergeRecord[i] = config.defenderSubmerge
        attackerDestroyerLastRecord[i] = config.attackerDestroyerLast
        defenderDestroyerLastRecord[i] = config.defenderDestroyerLast
        crashFightersRecord[i] = config.crashFighters
        retreatExpectedIpcProfitRecord[i] = config.retreatExpectedIpcProfitThreshold
        retreatPwinRecord[i] = config.retreatPwinThreshold
        retreatStrafeRecord[i] = config.retreatStrafeThreshold
        retreatLoseAirRecord[i] = config.retreatLoseAirProbabilityThreshold
        useAttackersFromPreviousWaveRecord[i] = config.useAttackersFromPreviousWave
      }
      
      const multiwaveInputForComplexity = buildMultiwaveInputForComplexity(
        attack,
        defense,
        attackOolRecord,
        defenseOolRecord,
        roundsNum,
        takesTerritoryRecord,
        aaLastRecord,
        attackerSubmergeRecord,
        defenderSubmergeRecord,
        attackerDestroyerLastRecord,
        defenderDestroyerLastRecord,
        crashFightersRecord,
        retreatThresholdRecord,
        retreatExpectedIpcProfitRecord,
        retreatPwinRecord,
        retreatStrafeRecord,
        retreatLoseAirRecord,
        useAttackersFromPreviousWaveRecord
      )
      
      const complexity = multiwaveComplexityFastV2(multiwaveInputForComplexity)
      
      // If complexity is below instantaneous evaluation threshold, auto-evaluate
      if (complexity < instantaneousEvaluationThreshold) {
        // Trigger runBattle by simulating a click
        const evalBtn = document.querySelector('.run-btn') as HTMLButtonElement
        if (evalBtn) {
          evalBtn.click()
        }
      }
    }, AUTO_EVALUATE_BOUNCE_TIMER) // debounce delay

    // Clear the timeout if inputs change again before it fires
    return () => clearTimeout(timer)
  }, [attack, defense, waveConfigs, mode, numWaves, instantaneousEvaluationThreshold, buildMultiwaveInputForComplexity])

  const runBattle = useCallback(() => {
    setError(null)
    setComplexityWarning(null)
    try {
      // Validate army sizes before attempting to evaluate
      const validation = validateArmySizes(attack, defense, numWaves)
      if (!validation.valid) {
        setError(validation.error || 'Invalid army configuration')
        return
      }
      
      // Build per-wave OOL records
      const attackOolRecord: Record<number, UnitId[]> = {}
      const defenseOolRecord: Record<number, UnitId[]> = {}
      const roundsNum: Record<number, number> = {}
      const retreatThresholdRecord: Record<number, number> = {}
      const takesTerritoryRecord: Record<number, number> = {}
      const aaLastRecord: Record<number, boolean> = {}
      const attackerSubmergeRecord: Record<number, boolean> = {}
      const defenderSubmergeRecord: Record<number, boolean> = {}
      const attackerDestroyerLastRecord: Record<number, boolean> = {}
      const defenderDestroyerLastRecord: Record<number, boolean> = {}
      const crashFightersRecord: Record<number, boolean> = {}
      const retreatModeRecord: Record<number, string> = {}
      const retreatExpectedIpcProfitRecord: Record<number, number | undefined> = {}
      const retreatPwinRecord: Record<number, number | undefined> = {}
      const retreatStrafeRecord: Record<number, number | undefined> = {}
      const retreatLoseAirRecord: Record<number, number | undefined> = {}
      const useAttackersFromPreviousWaveRecord: Record<number, boolean> = {}
      
      for (let i = 0; i < numWaves; i++) {
        const config = waveConfigs[i]
        attackOolRecord[i] = (amphibious && mode === 'land' ? attackerAmphibOolPresets : attackerOolPresets)[mode].find((o) => o.id === config.attackOolPreset)?.ool || []
        defenseOolRecord[i] = defenderOolPresets[mode].find((o) => o.id === config.defenseOolPreset)?.ool || []
        roundsNum[i] = config.rounds === 'all' ? 100 : parseInt(config.rounds)
        retreatThresholdRecord[i] = config.retreatThreshold
        takesTerritoryRecord[i] = config.takesTerritory
        aaLastRecord[i] = config.aaLast
        attackerSubmergeRecord[i] = config.attackerSubmerge
        defenderSubmergeRecord[i] = config.defenderSubmerge
        attackerDestroyerLastRecord[i] = config.attackerDestroyerLast
        defenderDestroyerLastRecord[i] = config.defenderDestroyerLast
        crashFightersRecord[i] = config.crashFighters
        retreatModeRecord[i] = config.retreatMode || 'unitCount'
        retreatExpectedIpcProfitRecord[i] = config.retreatExpectedIpcProfitThreshold
        retreatPwinRecord[i] = config.retreatPwinThreshold
        retreatStrafeRecord[i] = config.retreatStrafeThreshold
        retreatLoseAirRecord[i] = config.retreatLoseAirProbabilityThreshold
        useAttackersFromPreviousWaveRecord[i] = config.useAttackersFromPreviousWave
      }
      
      const input: BattleInput = {
        attack,
        defense,
        attackOol: attackOolRecord,
        defenseOol: defenseOolRecord,
        rounds: roundsNum,
        retreatThreshold: retreatThresholdRecord,
        takesTerritory: takesTerritoryRecord,
        aaLast: aaLastRecord,
        attackerSubmerge: attackerSubmergeRecord,
        defenderSubmerge: defenderSubmergeRecord,
        attackerDestroyerLast: attackerDestroyerLastRecord,
        defenderDestroyerLast: defenderDestroyerLastRecord,
        crashFighters: crashFightersRecord,
        useAttackersFromPreviousWave: useAttackersFromPreviousWaveRecord,
        retreatModes: retreatModeRecord,
        mode,
        diceMode,
        inProgress,
        verboseLevel,
        pruneThreshold,
        reportPruneThreshold,
        sortMode,
        retreatExpectedIpcProfitThresholds: retreatExpectedIpcProfitRecord,
        retreatPwinThresholds: retreatPwinRecord,
        retreatStrafeThresholds: retreatStrafeRecord,
        retreatLoseAirProbabilityThresholds: retreatLoseAirRecord,
        territoryValue,
        isDeadzone,
        numWaves,
        amphibious,
        experimentalConvolution,
        retreatZeroRound,
      }
      
      // Check complexity before evaluating the battle
      const multiwaveInputForComplexity = buildMultiwaveInputForComplexity(
        attack,
        defense,
        attackOolRecord,
        defenseOolRecord,
        roundsNum,
        takesTerritoryRecord,
        aaLastRecord,
        attackerSubmergeRecord,
        defenderSubmergeRecord,
        attackerDestroyerLastRecord,
        defenderDestroyerLastRecord,
        crashFightersRecord,
        retreatThresholdRecord,
        retreatExpectedIpcProfitRecord,
        retreatPwinRecord,
        retreatStrafeRecord,
        retreatLoseAirRecord,
        useAttackersFromPreviousWaveRecord
      )
      
      const complexity = multiwaveComplexityFastV2(multiwaveInputForComplexity)
      if (complexity > complexityThreshold) {
        setComplexityWarning({ complexity, threshold: complexityThreshold })
        setResult(null)
        return
      }
      
      const output = mode === 'sbr' ? computeSbrBattle(input) : computeBattle(input)
      setResult(output)
      
      // Track battle calculation in Google Analytics
      ReactGA.event({
        category: 'battle',
        action: 'calculate',
        label: `${mode}-${numWaves}wave${diceMode !== 'standard' ? `-${diceMode}` : ''}`,
      })

      // Save to history if a name is provided AND we're not loading from history
      if (historyName.trim() && !isLoadingFromHistoryRef.current) {
        const trimmedName = historyName.trim()
        const entry: HistoryEntry = {
          id: trimmedName,
          name: trimmedName,
          timestamp: Date.now(),
          input,
        }
        // Update existing entry with same name, or add new one
        setHistory((prev) => {
          const existingIndex = prev.findIndex((e) => e.id === trimmedName)
          if (existingIndex >= 0) {
            // Update existing entry and move to top
            const updated = [...prev]
            updated.splice(existingIndex, 1)
            return [entry, ...updated]
          } else {
            // Add new entry, keep last 50
            return [entry, ...prev.slice(0, 49)]
          }
        })
        // Don't clear the name field - user can make more changes and save
      }
    } catch (err) {
      setError((err as Error).message ?? 'unknown error')
      setResult(null)
    }
  }, [attack, defense, mode, waveConfigs, diceMode, inProgress, verboseLevel, pruneThreshold, reportPruneThreshold, sortMode, territoryValue, isDeadzone, numWaves, historyName, complexityThreshold, retreatZeroRound])

  const loadFromHistory = (entry: HistoryEntry) => {
    // Set flag to prevent auto-saving when we run the battle
    isLoadingFromHistoryRef.current = true
    
    const { input } = entry
    loadFromHistoryInput(input)
    loadedEntryNameRef.current = entry.name
    shouldRunBattleRef.current = true
  }

  const loadFromHistoryInput = (input: BattleInput) => {
    isLoadingFromHistoryRef.current = true
    setMode(input.mode || 'land')
    setNumWaves(input.numWaves || 1)
    setAttack(input.attack || {})
    setDefense(input.defense || {})
    
    // Populate per-wave configs
    const numWavesToLoad = input.numWaves || 1
    for (let i = 0; i < numWavesToLoad; i++) {
      const attackOol = input.attackOol?.[i]
      const defenseOol = input.defenseOol?.[i]
      
      // Find matching presets for OOL arrays (without mutating original arrays)
      const mode = input.mode || 'land'
      const attackingPreset = attackOol 
        ? [...attackerOolPresets[mode], ...(mode === 'land' ? attackerAmphibOolPresets[mode] : [])].find((p) =>
            JSON.stringify(p.ool) === JSON.stringify(attackOol)
          )
        : undefined
      
      const defenderPreset = defenseOol
        ? defenderOolPresets[mode].find((p) =>
            JSON.stringify(p.ool) === JSON.stringify(defenseOol)
          )
        : undefined
      
      const retreatModeValue = input.retreatModes?.[i] || 'unitCount'
      
      // Build threshold updates based on retreat mode
      const thresholdUpdates: Partial<WaveConfig> = {
        retreatThreshold: undefined,
        retreatExpectedIpcProfitThreshold: undefined,
        retreatPwinThreshold: undefined,
        retreatStrafeThreshold: undefined,
        retreatLoseAirProbabilityThreshold: undefined,
      }
      
      if (retreatModeValue === 'unitCount') {
        thresholdUpdates.retreatThreshold = input.retreatThreshold?.[i]
      } else if (retreatModeValue === 'expectedIpcProfit') {
        thresholdUpdates.retreatExpectedIpcProfitThreshold = input.retreatExpectedIpcProfitThresholds?.[i]
      } else if (retreatModeValue === 'probabilityWins') {
        thresholdUpdates.retreatPwinThreshold = input.retreatPwinThresholds?.[i]
      } else if (retreatModeValue === 'strafe') {
        thresholdUpdates.retreatStrafeThreshold = input.retreatStrafeThresholds?.[i]
      } else if (retreatModeValue === 'loseAir') {
        thresholdUpdates.retreatLoseAirProbabilityThreshold = input.retreatLoseAirProbabilityThresholds?.[i]
      }
      
      const waveUpdate = {
        attackOolPreset: attackingPreset?.id || DEFAULT_WAVE_CONFIG.attackOolPreset,
        defenseOolPreset: defenderPreset?.id || DEFAULT_WAVE_CONFIG.defenseOolPreset,
        rounds: (input.rounds?.[i]?.toString() ?? 'all') as unknown as string,
        takesTerritory: input.takesTerritory?.[i] ?? 0,
        aaLast: input.aaLast?.[i] ?? false,
        attackerSubmerge: input.attackerSubmerge?.[i] ?? false,
        defenderSubmerge: input.defenderSubmerge?.[i] ?? false,
        attackerDestroyerLast: input.attackerDestroyerLast?.[i] ?? false,
        defenderDestroyerLast: input.defenderDestroyerLast?.[i] ?? false,
        crashFighters: input.crashFighters?.[i] ?? false,
        useAttackersFromPreviousWave: input.useAttackersFromPreviousWave?.[i] ?? false,
        retreatMode: retreatModeValue,
        ...thresholdUpdates,
      }
      updateWave(i, waveUpdate)
    }
    
    setAmphibious(input.amphibious ?? false)
    setDiceMode(input.diceMode || 'standard')
    setTerritoryValue(input.territoryValue || 0)
    setIsDeadzone(input.isDeadzone ?? false)
    setInProgress(input.inProgress ?? false)
    setVerboseLevel(input.verboseLevel || 0)
    setPruneThreshold(input.pruneThreshold || 1e-12)
    setReportPruneThreshold(input.reportPruneThreshold || 1e-12)
    setSortMode(input.sortMode || 'ipc_cost')
    
    // Reset flag after state updates are processed
    setTimeout(() => {
      isLoadingFromHistoryRef.current = false
    }, 0)
  }

  // Effect to run battle and populate name field when loading from history
  useEffect(() => {
    if (shouldRunBattleRef.current) {
      shouldRunBattleRef.current = false
      runBattle()
      // Reset the loading flag after runBattle completes
      isLoadingFromHistoryRef.current = false
    }
    // Populate the "Save As" field with the loaded entry name
    if (loadedEntryNameRef.current) {
      setHistoryName(loadedEntryNameRef.current)
      loadedEntryNameRef.current = null
    }
  }, [runBattle])

  const deleteFromHistory = (id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <main className="app" style={{ display: 'flex', gap: '20px', minHeight: '100vh' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <h1>aa1942calc2 frontend demo</h1>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', fontSize: '14px' }}>
          <a href="https://github.com/mshih01/aacalc2" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>
            GitHub Repository
          </a>
          <span style={{ color: '#ccc' }}>|</span>
          <a href="https://discord.com/channels/606254910438375434/1212463778319568996" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'none' }}>
            Discord Server
          </a>
        </div>
      <ModeSelector mode={mode} onChange={setMode} />

      <ResetButtons 
        onResetAll={() => {
          const initial: Record<number, Record<string, number>> = {}
          for (let i = 0; i < MAX_WAVES; i++) {
            initial[i] = {}
          }
          setAttack(initial)
          setDefense({ ...initial })
          resetWaves(MAX_WAVES)
          setNumWaves(1)
          setDiceMode('standard')
          setAmphibious(false)
          setTerritoryValue(0)
          setIsDeadzone(false)
          setInProgress(false)
          setVerboseLevel(0)
          setPruneThreshold(1e-12)
          setReportPruneThreshold(1e-12)
          setComplexityThreshold(MAX_COMPLEXITY)
          setInstantaneousEvaluationThreshold(INSTANTANEOUS_EVALUATION_THRESHOLD)
          setSortMode('ipc_cost')
          setDecimalPlaces(2)
          setIpcLossDecimalPlaces(2)
          setResult(null)
          setError('')
        }}
        onResetUnits={() => {
          const initial: Record<number, Record<string, number>> = {}
          for (let i = 0; i < MAX_WAVES; i++) {
            initial[i] = {}
          }
          setAttack(initial)
          setDefense({ ...initial })
        }}
      />

      <div style={{ marginBottom: '15px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <div className="floating-label-group" style={{ flex: 1 }}>
          <input
            type="text"
            value={historyName}
            onChange={(e) => setHistoryName(e.target.value)}
            placeholder=" "
            maxLength={50}
            className={historyName ? 'has-value' : ''}
          />
          <label>Save As</label>
        </div>
        <button
          onClick={() => {
            const shareInput: BattleInput = {
              attack,
              defense,
              attackOol: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [
                  idx,
                  (amphibious && mode === 'land' ? attackerAmphibOolPresets : attackerOolPresets)[mode].find((p) => p.id === wc.attackOolPreset)?.ool || []
                ])
              ),
              defenseOol: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [
                  idx,
                  defenderOolPresets[mode].find((p) => p.id === wc.defenseOolPreset)?.ool || []
                ])
              ),
              rounds: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.rounds])
              ),
              retreatThreshold: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.retreatThreshold])
              ),
              takesTerritory: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.takesTerritory])
              ),
              aaLast: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.aaLast])
              ),
              attackerSubmerge: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.attackerSubmerge])
              ),
              defenderSubmerge: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.defenderSubmerge])
              ),
              attackerDestroyerLast: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.attackerDestroyerLast])
              ),
              defenderDestroyerLast: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.defenderDestroyerLast])
              ),
              crashFighters: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.crashFighters])
              ),
              useAttackersFromPreviousWave: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.useAttackersFromPreviousWave])
              ),
              retreatModes: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.retreatMode])
              ),
              diceMode,
              inProgress,
              verboseLevel,
              pruneThreshold,
              reportPruneThreshold,
              sortMode,
              retreatExpectedIpcProfitThresholds: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.retreatExpectedIpcProfitThreshold])
              ),
              retreatPwinThresholds: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.retreatPwinThreshold])
              ),
              retreatStrafeThresholds: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.retreatStrafeThreshold])
              ),
              retreatLoseAirProbabilityThresholds: Object.fromEntries(
                Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.retreatLoseAirProbabilityThreshold])
              ),
              mode,
              territoryValue,
              isDeadzone,
              numWaves,
              amphibious,
            }
            const shareUrl = encodeStateToUrl(shareInput)
            navigator.clipboard.writeText(shareUrl).then(() => {
              setToast({ message: '✓ Share link copied to clipboard!' })
            }).catch(() => {
              setToast({ message: '✗ Failed to copy link' })
            })
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
        >
          Share
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            padding: '8px 12px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
        >
          {showHistory ? 'Hide' : 'Show'} History ({history.length})
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={inProgress}
            onChange={(e) => setInProgress(e.target.checked)}
          />
          Battle in progress
        </label>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'none',
            border: 'none',
            padding: '0',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#333',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ fontSize: '18px' }}>{showAdvanced ? '▼' : '▶'}</span>
          Advanced Options
        </button>
        {showAdvanced && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '6px', borderLeft: '4px solid #1d4ed8' }}>
          <div className="advanced-options-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="floating-label-group">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={verboseLevel || 0}
                  onChange={(e) => setVerboseLevel(Math.max(0, Number(e.target.value) || 0))}
                  className={verboseLevel ? 'has-value' : ''}
                  style={{ width: '100%' }}
                />
                <label>Verbose Level</label>
              </div>
              <div className="floating-label-group">
                <input
                  type="number"
                  step="1e-15"
                  value={pruneThreshold}
                  onChange={(e) => setPruneThreshold(Number(e.target.value) || 1e-12)}
                  className={pruneThreshold ? 'has-value' : ''}
                  style={{ width: '100%' }}
                />
                <label>Prune Threshold</label>
              </div>
              <div className="floating-label-group">
                <input
                  type="number"
                  step="1e-15"
                  value={reportPruneThreshold}
                  onChange={(e) => setReportPruneThreshold(Number(e.target.value) || 1e-12)}
                  className={reportPruneThreshold ? 'has-value' : ''}
                  style={{ width: '100%' }}
                />
                <label>Report Prune Threshold</label>
              </div>
              <div className="floating-label-group">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={complexityThreshold}
                  onChange={(e) => setComplexityThreshold(Math.max(0, Number(e.target.value) || MAX_COMPLEXITY))}
                  className={complexityThreshold !== MAX_COMPLEXITY ? 'has-value' : ''}
                  style={{ width: '100%' }}
                />
                <label>Complexity Threshold</label>
              </div>
              <div className="floating-label-group">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={instantaneousEvaluationThreshold}
                  onChange={(e) => setInstantaneousEvaluationThreshold(Math.max(0, Number(e.target.value) || INSTANTANEOUS_EVALUATION_THRESHOLD))}
                  className={instantaneousEvaluationThreshold !== INSTANTANEOUS_EVALUATION_THRESHOLD ? 'has-value' : ''}
                  style={{ width: '100%' }}
                />
                <label>Instantaneous Evaluation Threshold</label>
              </div>
              <div className="floating-label-group">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as 'unit_count' | 'ipc_cost')}
                  style={{ width: '100%' }}
                >
                  <option value="unit_count">unit_count</option>
                  <option value="ipc_cost">ipc_cost</option>
                </select>
                <label>Sort Mode</label>
              </div>
              <div className="floating-label-group">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={decimalPlaces}
                  onChange={(e) => setDecimalPlaces(Math.max(0, Math.min(10, Number(e.target.value) || 2)))}
                  className={decimalPlaces !== 2 ? 'has-value' : ''}
                  style={{ width: '100%' }}
                />
                <label>Probability Decimal Places</label>
              </div>
              <div className="floating-label-group">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={ipcLossDecimalPlaces}
                  onChange={(e) => setIpcLossDecimalPlaces(Math.max(0, Math.min(10, Number(e.target.value) || 2)))}
                  className={ipcLossDecimalPlaces !== 2 ? 'has-value' : ''}
                  style={{ width: '100%' }}
                />
                <label>IPC Loss Decimal Places</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={experimentalConvolution}
                    onChange={(e) => setExperimentalConvolution(e.target.checked)}
                  />
                  Experimental: fix defender profit via convolution
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={retreatZeroRound}
                    onChange={(e) => setRetreatZeroRound(e.target.checked)}
                  />
                  Allow retreat on round zero
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {mode !== 'sbr' && (
        <section className="battle-options">
          <div className="battle-options-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
            <div className="floating-label-group">
              <select 
                value={numWaves} 
                onChange={(e) => setNumWaves(parseInt(e.target.value))}
              >
                {Array.from({ length: MAX_WAVES }, (_, i) => i + 1).map((wave) => (
                  <option key={wave} value={wave}>{wave}</option>
                ))}
              </select>
              <label>Waves</label>
            </div>
            
            <div className="floating-label-group">
              <select value={diceMode} onChange={(e) => setDiceMode(e.target.value as 'standard' | 'lowluck' | 'biased')}>
                <option value="standard">Standard</option>
                <option value="lowluck">Low Luck</option>
                <option value="biased">Biased</option>
              </select>
              <label>Dice Mode:</label>
            </div>
            {mode !== 'sea' && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={amphibious}
                    onChange={(e) => setAmphibious(e.target.checked)}
                  />
                  Amphibious Assault
                </label>
              </div>
            )}

            {mode !== 'sea' && (
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div className="floating-label-group" style={{ flex: 1 }}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={territoryValue || ''}
                    className={territoryValue ? 'has-value' : ''}
                    onChange={(e) => setTerritoryValue(Number(e.target.value) || 0)}
                  />
                  <label>Territory Value (IPC)</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={isDeadzone}
                      onChange={(e) => setIsDeadzone(e.target.checked)}
                    />
                    Is Deadzone
                  </label>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {mode !== 'sbr' ? (
        <section className="waves-section">
          {Array.from({ length: numWaves }, (_, waveIdx) => (
            <WaveCard
              key={`wave-${waveIdx}`}
              waveIdx={waveIdx}
              numWaves={numWaves}
              mode={mode}
              amphibious={amphibious}
              attack={attack[waveIdx] || {}}
              defense={defense[waveIdx] || {}}
              config={waveConfigs[waveIdx]}
              onUnitChange={(side, unit, count) => {
                const units = { ...(side === 'attack' ? (attack[waveIdx] || {}) : (defense[waveIdx] || {})) }
                if (count > 0) {
                  units[unit] = count
                } else {
                  delete units[unit]
                }
                if (side === 'attack') {
                  setAttack({ ...attack, [waveIdx]: units })
                } else {
                  setDefense({ ...defense, [waveIdx]: units })
                }
              }}
              onSwapSides={() => {
                const newAttack = { ...attack }
                const newDefense = { ...defense }
                const filteredAttack: Record<string, number> = {}
                const filteredDefense: Record<string, number> = {}
                for (const [unit, val] of Object.entries(defense[waveIdx] || {})) {
                  if (unit !== 'aa') filteredAttack[unit] = val
                }
                for (const [unit, val] of Object.entries(attack[waveIdx] || {})) {
                  if (unit !== 'cru' && unit !== 'bat') filteredDefense[unit] = val
                }
                newAttack[waveIdx] = filteredAttack
                newDefense[waveIdx] = filteredDefense
                setAttack(newAttack)
                setDefense(newDefense)
              }}
              onSwapWave={() => {
                const newAttack = { ...attack }
                const temp = { ...(attack[waveIdx] || {}) }
                const tempConfig = { ...waveConfigs[waveIdx] }
                const nextConfig = { ...waveConfigs[waveIdx + 1] }
                newAttack[waveIdx] = { ...(attack[waveIdx + 1] || {}) }
                newAttack[waveIdx + 1] = temp
                setAttack(newAttack)
                updateWave(waveIdx, nextConfig)
                updateWave(waveIdx + 1, tempConfig)
              }}
              onUpdateConfig={(updates) => updateWave(waveIdx, updates)}
            />
          ))}
        </section>
      ) : (
        <SBRModeSection
          diceMode={diceMode}
          onDiceModeChange={setDiceMode}
          attack={attack[0] || {}}
          defense={defense[0] || {}}
          onUnitChange={(side, unit, count) => {
            const units = { ...(side === 'attack' ? (attack[0] || {}) : (defense[0] || {})) }
            if (count > 0) {
              units[unit] = count
            } else {
              delete units[unit]
            }
            if (side === 'attack') {
              setAttack({ ...attack, 0: units })
            } else {
              setDefense({ ...defense, 0: units })
            }
          }}
        />
      )}

	  <CollapsibleSection title="Army Recommendation Input" >
      <ArmyRecommendSection 
        battleInput={{
          attack,
          defense,
          attackOol: Object.values(waveConfigs).map((wc) => (amphibious && mode === 'land' ? attackerAmphibOolPresets : attackerOolPresets)[mode].find((p) => p.id === wc.attackOolPreset)?.ool || []),
          defenseOol: Object.values(waveConfigs).map((wc) => defenderOolPresets[mode].find((p) => p.id === wc.defenseOolPreset)?.ool || []),
          rounds: Object.values(waveConfigs).map((wc) => wc.rounds),
          retreatThreshold: Object.values(waveConfigs).map((wc) => wc.retreatThreshold),
          takesTerritory: Object.values(waveConfigs).map((wc) => wc.takesTerritory),
          aaLast: Object.values(waveConfigs).map((wc) => wc.aaLast),
          attackerSubmerge: Object.values(waveConfigs).map((wc) => wc.attackerSubmerge),
          defenderSubmerge: Object.values(waveConfigs).map((wc) => wc.defenderSubmerge),
          attackerDestroyerLast: Object.values(waveConfigs).map((wc) => wc.attackerDestroyerLast),
          defenderDestroyerLast: Object.values(waveConfigs).map((wc) => wc.defenderDestroyerLast),
          crashFighters: Object.values(waveConfigs).map((wc) => wc.crashFighters),
          diceMode,
          inProgress,
          verboseLevel,
          pruneThreshold,
          reportPruneThreshold,
          sortMode,
          retreatModes: Object.fromEntries(
            Object.entries(waveConfigs).map(([idx, wc]) => [idx, wc.retreatMode])
          ),
          retreatExpectedIpcProfitThresholds: Object.values(waveConfigs).map((wc) => wc.retreatExpectedIpcProfitThreshold),
          retreatPwinThresholds: Object.values(waveConfigs).map((wc) => wc.retreatPwinThreshold),
          retreatStrafeThresholds: Object.values(waveConfigs).map((wc) => wc.retreatStrafeThreshold),
          retreatLoseAirProbabilityThresholds: Object.values(waveConfigs).map((wc) => wc.retreatLoseAirProbabilityThreshold),
          mode,
          territoryValue,
          isDeadzone,
          numWaves,
        }}
        waveIdx={0}
        onRecommendationResult={(result) => {
          if (verboseLevel && verboseLevel > 0) {
            console.log('Army Recommendation Result:', result)
          }
        }}
        onArmyCopy={(army, attDefType, waveIdx) => {
          if (attDefType === 'attacker') {
            setAttack({ ...attack, [waveIdx]: army })
          } else {
            setDefense({ ...defense, [waveIdx]: army })
          }
        }}
      />
          </CollapsibleSection>

      <button className="run-btn" onClick={runBattle}>
        Evaluate Battle
      </button>

   {/*
      <div className="ool-summary">
        <p>
          Attacker OOL: {attackerOolPresets[mode].find((p) => p.id === waveConfigs[0]?.attackOolPreset)?.label}
        </p>
        <p>
          Defender OOL: {defenderOolPresets[mode].find((p) => p.id === waveConfigs[0]?.defenseOolPreset)?.label}
        </p>
      </div>
*/}

      {error && <p className="error">Error: {error}</p>}
      
      {complexityWarning && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          padding: '12px 15px',
          marginBottom: '15px',
          color: '#856404'
        }}>
          <strong>⚠️ Complexity Warning</strong>
          <p style={{ margin: '8px 0 0 0' }}>
            Input complexity ({complexityWarning.complexity.toLocaleString()}) exceeds threshold ({complexityWarning.threshold.toLocaleString()}). 
            This battle may take a very long time to evaluate due to the N^4 complexity of the algorithm. 
            Consider increasing the <strong>Complexity Threshold</strong> in Advanced Options if you wish to evaluate this battle anyway.
          </p>
        </div>
      )}

      {result && (
        <section className="results">
          <h2>Results</h2>
          
          {/* Wave Summaries */}
          {Array.from({ length: numWaves }, (_, waveIdx) => {
            const attackLossDelta = result.attack.incrementalLoss[waveIdx] ??
              result.attack.ipcLoss[waveIdx] - (waveIdx > 0 ? result.attack.ipcLoss[waveIdx - 1] : 0);
            const defenseLossDelta = result.defense.incrementalLoss[waveIdx] ??
              result.defense.ipcLoss[waveIdx] - (waveIdx > 0 ? result.defense.ipcLoss[waveIdx - 1] : 0);
            const profitDelta = defenseLossDelta - attackLossDelta;
            
            return (
              <div key={`summary-${waveIdx}`} style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '15px' }}>Wave {waveIdx + 1} Summary</h3>
                <div className="wave-summary-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ flex: '0 1 auto', minWidth: '75px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>Rounds</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>{result.rounds[waveIdx]?.toFixed(1) ?? '-'}</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '105px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>Atk Survives</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>{(((result.attack.survives[waveIdx] ?? 0) ) * 100).toFixed(decimalPlaces)}%</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '120px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>Atk Takes Terr</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>{((result.takesTerritory[waveIdx] ?? 0) * 100).toFixed(decimalPlaces)}%</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '105px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>Def Survives</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>{(((result.defense.survives[waveIdx] ?? 0) ) * 100).toFixed(decimalPlaces)}%</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '115px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>{waveIdx > 0 ? 'Δ Atk IPC' : 'Atk IPC Loss'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d32f2f', lineHeight: '1.2' }}>{attackLossDelta.toFixed(ipcLossDecimalPlaces)}</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '115px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>{waveIdx > 0 ? 'Δ Def IPC' : 'Def IPC Loss'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d32f2f', lineHeight: '1.2' }}>{defenseLossDelta.toFixed(ipcLossDecimalPlaces)}</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '115px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>{waveIdx > 0 ? 'Δ Profit' : 'Atk Profit'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2', lineHeight: '1.2' }}>
                      {profitDelta.toFixed(ipcLossDecimalPlaces)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* All Waves Summary */}
          {numWaves > 1 && (() => {
            const totalAtt = result.attack.cumulativeIpcLoss[numWaves - 1] ?? 0;
            const totalDef = result.defense.cumulativeIpcLoss[numWaves - 1] ?? 0;
            const totalProfit = totalDef - totalAtt;
            return (
            <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #1976d2' }}>
              <h3 style={{ marginTop: 0, color: '#1565c0' }}>All Waves Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Attacker IPC Loss</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>{totalAtt.toFixed(ipcLossDecimalPlaces)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Defender IPC Loss</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>{totalDef.toFixed(ipcLossDecimalPlaces)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Attacker Profit</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
                    {totalProfit.toFixed(ipcLossDecimalPlaces)}
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Per-Wave Detailed Sections */}
          {result.casualtiesInfoArr && Object.keys(result.casualtiesInfoArr).length > 0 && (() => {
            const renderWaveDetails = (waveIdx: number) => {
              const waveData = result.casualtiesInfoArr[waveIdx];
              const waveProfit = result.profitDistribution[waveIdx];
              
              if (!waveData) return null;

              const content = (
                <div>
                  <CollapsibleSubsection title="Attacker Detailed Casualties" color="#4CAF50" defaultOpen={false}>
                    <DetailedCasualties
                      side="attack"
                      waveIndex={waveIdx}
                      casualtiesData={waveData['attack']}
                      decimalPlaces={decimalPlaces}
                    />
                  </CollapsibleSubsection>

                  <CollapsibleSubsection title="Defender Detailed Casualties" color="#FF9800" defaultOpen={false}>
                    <DetailedCasualties
                      side="defense"
                      waveIndex={waveIdx}
                      casualtiesData={waveData['defense']}
                      decimalPlaces={decimalPlaces}
                    />
                  </CollapsibleSubsection>

                  <CollapsibleSubsection title="IPC Profit Distribution" color="#1976d2" defaultOpen={false}>
                    <ProfitDistributionTable
                      waveIndex={waveIdx}
                      profitDist={waveProfit}
                      decimalPlaces={decimalPlaces}
                    />
                  </CollapsibleSubsection>

                  <div>
                    <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#1976d2', fontSize: '14px', fontWeight: '600' }}>
                      IPC Profit Distribution Histogram
                    </h4>
                    <ProfitDistributionHistogram
                      waveIndex={waveIdx}
                      profitDist={waveProfit}
                      decimalPlaces={decimalPlaces}
                      histogramZoom={histogramZooms[waveIdx] || 1}
                      setHistogramZoom={(zoom) => setHistogramZoom(waveIdx, zoom)}
                    />
                  </div>
                </div>
              );

              // If single wave, render directly without wrapper
              if (result.waves === 1) {
                return content;
              }

              // If multi-wave, wrap in collapsible section
              return (
                <CollapsibleSection title={`Wave ${waveIdx + 1} Details`} headerColor="#9C27B0">
                  {content}
                </CollapsibleSection>
              );
            };

            return (
              <div>
                {Array.from({ length: result.waves }).map((_, waveIdx) => (
                  <Fragment key={`wd-${waveIdx}`}>{renderWaveDetails(waveIdx)}</Fragment>
                ))}
              </div>
            );
          })()}

          {/* All Waves Detailed */}
          {numWaves > 1 && result.casualtiesInfo && (Object.keys(result.casualtiesInfo.attack || {}).length > 0 || Object.keys(result.casualtiesInfo.defense || {}).length > 0) && (
            <div style={{ marginTop: '30px' }}>
              <CollapsibleSection title="All Waves Detailed" headerColor="#7B1FA2" defaultOpen={true}>
                <CollapsibleSubsection title="Attacker Detailed Casualties" color="#4CAF50" defaultOpen={false}>
                  <DetailedCasualties
                    side="attack"
                    waveIndex={-1}
                    casualtiesData={result.casualtiesInfo['attack']}
                    decimalPlaces={decimalPlaces}
                  />
                </CollapsibleSubsection>
                <CollapsibleSubsection title="Defender Detailed Casualties" color="#FF9800" defaultOpen={false}>
                  <DetailedCasualties
                    side="defense"
                    waveIndex={-1}
                    casualtiesData={result.casualtiesInfo['defense']}
                    decimalPlaces={decimalPlaces}
                  />
                </CollapsibleSubsection>
              </CollapsibleSection>
            </div>
          )}
        </section>
      )}
      </div>

      {/* History Side Panel */}
      {showHistory && (
        <HistoryPanel 
          history={history}
          onLoad={loadFromHistory}
          onDelete={deleteFromHistory}
          onClearAll={() => setHistory([])}
        />
      )}

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} />}
    </main>
  )
}

export default App

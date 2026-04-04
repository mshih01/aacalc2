import { useCallback, useEffect, useRef, useState } from 'react'
import {
  multiwaveExternal,
  sbrExternal,
  type MultiwaveInput,
  type MultiwaveOutput,
} from 'aacalc2'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import ReactGA from 'react-ga4'
import './App.css'
import { MODES, DEFAULT_OOL_PRESETS } from './constants'
import { SeaModeSection } from './components/SeaModeSection'
import { LandModeSection } from './components/LandModeSection'
import { UnitSummaryDisplay } from './components/UnitSummaryDisplay'
import { ArmyRecommendSection } from './components/ArmyRecommendSection'

// Initialize Google Analytics
ReactGA.initialize('G-XFRR47N18Q')

// Frontend wrapper types
export interface BattleInput {
  attack: Record<number, Record<string, number>>
  defense: Record<number, Record<string, number>>
  attackOol?: Record<number, UnitId[]>
  defenseOol?: Record<number, UnitId[]>
  rounds?: Record<number, number | string>
  retreatThreshold?: Record<number, number>
  takesTerritory?: Record<number, number>
  aaLast?: Record<number, boolean>
  attackerSubmerge?: Record<number, boolean>
  defenderSubmerge?: Record<number, boolean>
  attackerDestroyerLast?: Record<number, boolean>
  defenderDestroyerLast?: Record<number, boolean>
  crashFighters?: Record<number, boolean>
  diceMode?: 'standard' | 'lowluck' | 'biased'
  inProgress?: boolean
  verboseLevel?: number
  pruneThreshold?: number
  reportPruneThreshold?: number
  sortMode?: 'unit_count' | 'ipc_cost'
  retreatExpectedIpcProfitThresholds?: Record<number, number | undefined>
  retreatPwinThresholds?: Record<number, number | undefined>
  retreatStrafeThresholds?: Record<number, number | undefined>
  retreatLoseAirProbabilityThresholds?: Record<number, number | undefined>
  mode?: BattleMode
  territoryValue?: number
  isDeadzone?: boolean
  numWaves?: number
}

function computeBattle(input: BattleInput): MultiwaveOutput {
  const numWaves = input.numWaves ?? 1
  
  const wave_info = Array.from({ length: numWaves }, (_, waveIdx) => {
    const attackOol = input.attackOol?.[waveIdx] || ['inf', 'art', 'arm', 'fig', 'bom']
    const defenseOol = input.defenseOol?.[waveIdx] || ['aa', 'inf', 'art', 'arm', 'fig', 'bom']
    const roundsNum = input.rounds?.[waveIdx] 
      ? (input.rounds[waveIdx] === 'all' ? 100 : Number(input.rounds[waveIdx]))
      : 100
    
    return {
      attack: {
        units: input.attack[waveIdx] || {},
        ool: attackOol as any,
        takes: input.takesTerritory?.[waveIdx] ?? 0,
        aaLast: input.aaLast?.[waveIdx] ?? false,
      },
      defense: {
        units: input.defense[waveIdx] || {},
        ool: defenseOol as any,
        takes: 0,
        aaLast: input.aaLast?.[waveIdx] ?? false,
      },
      att_submerge: input.attackerSubmerge?.[waveIdx] ?? false,
      def_submerge: input.defenderSubmerge?.[waveIdx] ?? false,
      att_dest_last: input.attackerDestroyerLast?.[waveIdx] ?? false,
      def_dest_last: input.defenderDestroyerLast?.[waveIdx] ?? false,
      is_crash_fighters: input.crashFighters?.[waveIdx] ?? false,
      rounds: roundsNum,
      retreat_threshold: input.retreatThreshold?.[waveIdx] ?? 0,
      retreat_expected_ipc_profit_threshold: input.retreatExpectedIpcProfitThresholds?.[waveIdx],
      retreat_pwin_threshold: input.retreatPwinThresholds?.[waveIdx],
      retreat_strafe_threshold: input.retreatStrafeThresholds?.[waveIdx],
      retreat_lose_air_probability: input.retreatLoseAirProbabilityThresholds?.[waveIdx],
      pwinMode: 'takes' as const,
    }
  })

  const multiwaveInput: MultiwaveInput = {
    wave_info,
    debug: false,
    prune_threshold: input.pruneThreshold ?? 1e-12,
    report_prune_threshold: input.reportPruneThreshold ?? 1e-12,
    is_naval: input.mode === 'sea',
    in_progress: input.inProgress ?? false,
    num_runs: 1,
    verbose_level: input.verboseLevel ?? 0,
    diceMode: input.diceMode ?? 'standard',
    sortMode: input.sortMode ?? 'unit_count',
    territory_value: input.territoryValue ?? 0,
    is_deadzone: input.isDeadzone ?? false,
    retreat_round_zero: false,
    do_roundless_eval: true,
  }

  if (input.verboseLevel && input.verboseLevel > 0) {
    console.log('MultiwaveInput:', multiwaveInput)
  }
  const startTime = performance.now()
  const output = multiwaveExternal(multiwaveInput)
  const endTime = performance.now()
  const runtime = (endTime - startTime).toFixed(2)
  if (input.verboseLevel && input.verboseLevel > 0) {
    console.log('MultiwaveOutput:', output)
  }
  console.log(`Runtime: ${runtime}ms`)
  return output
}

function computeSbrBattle(input: BattleInput): MultiwaveOutput {
  const attackOol = input.attackOol?.[0] || ['bom']
  const defenseOol = input.defenseOol?.[0] || ['ic']
  
  const sbrInput = {
    attack: {
      units: input.attack[0] || {},
      ool: attackOol as any,
      takes: input.takesTerritory?.[0] ?? 0,
      aaLast: input.aaLast?.[0] ?? false,
    },
    defense: {
      units: input.defense[0] || {},
      ool: defenseOol as any,
      takes: 0,
      aaLast: input.aaLast?.[0] ?? false,
    },
    verbose_level: 0,
    diceMode: input.diceMode ?? 'standard',
    in_progress: false,
    pruneThreshold: 1e-12,
    reportPruneThreshold: 1e-12,
  }
  if (input.verboseLevel && input.verboseLevel > 0) {
    console.log('SBR Input:', sbrInput)
  }
  const startTime = performance.now()
  const output = sbrExternal(sbrInput)
  const endTime = performance.now()
  const runtime = (endTime - startTime).toFixed(2)
  if (input.verboseLevel && input.verboseLevel > 0) {
    console.log('SBR Output:', output)
  }
  console.log(`Runtime: ${runtime}ms`)
  return output
}

type BattleMode = 'land' | 'sea' | 'sbr'

// CollapsibleSection Component
interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  headerColor?: string
}

function CollapsibleSection({ title, children, defaultOpen = true, headerColor = '#1976d2' }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={{ marginTop: '30px' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: headerColor,
          color: 'white',
          padding: '12px 15px',
          borderRadius: '4px',
          marginTop: 0,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{title}</h3>
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            fontSize: '18px',
            lineHeight: '1',
          }}
        >
          ▼
        </span>
      </div>
      {isOpen && <div style={{ marginTop: '15px' }}>{children}</div>}
    </div>
  )
}

const modeUnitMap: Record<BattleMode, readonly UnitId[]> = {
  land: ['inf', 'art', 'arm', 'fig', 'bom', 'aa', 'cru', 'bat'],
  sea: ['fig', 'bom', 'sub', 'tra', 'des', 'cru', 'acc', 'bat', 'dbat'],
  sbr: ['bom', 'ic'],
}

const attackerOolPresets: Record<BattleMode, Array<{id: string; label: string; ool: UnitId[]}>> = {
  land: [
    {
      id: 'inf-art-tnk-fig-bom',
      label: 'Inf - Art - Tnk - Fig - Bom',
      ool: ['inf', 'art', 'arm', 'fig', 'bom'],
    },
    {
      id: 'inf-art-tnk-bom-fig',
      label: 'Inf - Art - Tnk - Bom - Fig',
      ool: ['inf', 'art', 'arm', 'bom', 'fig'],
    },
    {
      id: 'inf-art-bom-tnk-fig',
      label: 'Inf - Art - Bom - Tnk - Fig',
      ool: ['inf', 'art', 'bom', 'arm', 'fig'],
    },
    {
      id: 'inf-bom-art-tnk-fig',
      label: 'Inf - Bom - Art - Tnk - Fig',
      ool: ['inf', 'bom', 'art', 'arm', 'fig'],
    },
    {
      id: 'bom-inf-art-tnk-fig',
      label: 'Bom - Inf - Art - Tnk - Fig',
      ool: ['bom', 'inf', 'art', 'arm', 'fig'],
    },
  ],
  sea: [
    {
      id: 'acc-sub-des-fig-cru-bom-bat',
      label: 'ACC - Sub - Des - Fig - Cru - Bom - Bat',
      ool: ['acc', 'sub', 'des', 'fig', 'cru', 'bom', 'bat'],
    },
    {
      id: 'acc-sub-des-cru-fig-bom-bat',
      label: 'ACC - Sub - Des - Cru - Fig - Bom - Bat',
      ool: ['acc', 'sub', 'des', 'cru', 'fig', 'bom', 'bat'],
    },
    {
      id: 'acc-des-sub-fig-cru-bom-bat',
      label: 'ACC - Des - Sub - Fig - Cru - Bom - Bat',
      ool: ['acc', 'des', 'sub', 'fig', 'cru', 'bom', 'bat'],
    },
    {
      id: 'sub-des-acc-fig-cru-bom-bat',
      label: 'Sub - Des - ACC - Fig - Cru - Bom - Bat',
      ool: ['sub', 'des', 'acc', 'fig', 'cru', 'bom', 'bat'],
    },
    {
      id: 'sub-des-fig-cru-bom-acc-bat',
      label: 'Sub - Des - Fig - Cru - Bom - ACC - Bat',
      ool: ['sub', 'des', 'fig', 'cru', 'bom', 'acc', 'bat'],
    },
    {
      id: 'sub-des-cru-fig-acc-bom-bat',
      label: 'Sub - Des - Cru - Fig - ACC - Bom - Bat',
      ool: ['sub', 'des', 'cru', 'fig', 'acc', 'bom', 'bat'],
    },
  ],
  sbr: [
    {
      id: 'standard',
      label: 'Standard (bom)',
      ool: ['bom'],
    },
  ],
}

const defenderOolPresets: Record<BattleMode, Array<{id: string; label: string; ool: UnitId[]}>> = {
  land: [
    {
      id: 'aa-inf-art-tnk-bom-fig',
      label: 'AA - Inf - Art - Tnk - Bom - Fig',
      ool: ['aa', 'inf', 'art', 'arm', 'bom', 'fig'],
    },
    {
      id: 'aa-inf-art-tnk-fig-bom',
      label: 'AA - Inf - Art - Tnk - Fig - Bom',
      ool: ['aa', 'inf', 'art', 'arm', 'fig', 'bom'],
    },
    {
      id: 'aa-inf-art-bom-tnk-fig',
      label: 'AA - Inf - Art - Bom - Tnk - Fig',
      ool: ['aa', 'inf', 'art', 'bom', 'arm', 'fig'],
    },
    {
      id: 'aa-inf-bom-art-tnk-fig',
      label: 'AA - Inf - Bom - Art - Tnk - Fig',
      ool: ['aa', 'inf', 'bom', 'art', 'arm', 'fig'],
    },
    {
      id: 'aa-bom-inf-art-tnk-fig',
      label: 'AA - Bom - Inf - Art - Tnk - Fig',
      ool: ['aa', 'bom', 'inf', 'art', 'arm', 'fig'],
    },
    {
      id: 'inf-aa-art-tnk-fig-bom',
      label: 'Inf - AA - Art - Tnk - Fig - Bom',
      ool: ['inf', 'aa', 'art', 'arm', 'fig', 'bom'],
    },
    {
      id: 'inf-aa-art-tnk-bom-fig',
      label: 'Inf - AA - Art - Tnk - Bom - Fig',
      ool: ['inf', 'aa', 'art', 'arm', 'bom', 'fig'],
    },
    {
      id: 'inf-art-aa-tnk-fig-bom',
      label: 'Inf - Art - AA - Tnk - Fig - Bom',
      ool: ['inf', 'art', 'aa', 'arm', 'fig', 'bom'],
    },
    {
      id: 'inf-art-aa-tnk-bom-fig',
      label: 'Inf - Art - AA - Tnk - Bom - Fig',
      ool: ['inf', 'art', 'aa', 'arm', 'bom', 'fig'],
    },
  ],
  sea: [
    {
      id: 'sub-des-acc-cru-fig-bat',
      label: 'Sub - Des - ACC - Cru - Fig - Bat',
      ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat'],
    },
    {
      id: 'sub-des-acc-cru-fig-bat-2',
      label: 'Sub - Des - ACC - Cru - Fig - Bat',
      ool: ['sub', 'des', 'acc', 'cru', 'fig', 'bat'],
    },
    {
      id: 'sub-des-fig-acc-cru-bat',
      label: 'Sub - Des - Fig - ACC - Cru - Bat',
      ool: ['sub', 'des', 'fig', 'acc', 'cru', 'bat'],
    },
    {
      id: 'sub-des-fig-cru-acc-bat',
      label: 'Sub - Des - Fig - Cru - ACC - Bat',
      ool: ['sub', 'des', 'fig', 'cru', 'acc', 'bat'],
    },
    {
      id: 'sub-des-cru-acc-fig-bat',
      label: 'Sub - Des - Cru - ACC - Fig - Bat',
      ool: ['sub', 'des', 'cru', 'acc', 'fig', 'bat'],
    },
    {
      id: 'sub-des-cru-fig-acc-bat',
      label: 'Sub - Des - Cru - Fig - ACC - Bat',
      ool: ['sub', 'des', 'cru', 'fig', 'acc', 'bat'],
    },
    {
      id: 'sub-acc-des-cru-fig-bat',
      label: 'Sub - ACC - Des - Cru - Fig - Bat',
      ool: ['sub', 'acc', 'des', 'cru', 'fig', 'bat'],
    },
  ],
  sbr: [
    {
      id: 'standard',
      label: 'Standard (ic)',
      ool: ['ic'],
    },
  ],
}

const unitIds = [
  'inf',
  'art',
  'arm',
  'fig',
  'bom',
  'sub',
  'tra',
  'des',
  'cru',
  'acc',
  'bat',
  'dbat',
  'ic',
  'inf_a',
  'art_a',
  'arm_a',
  'aa',
] as const

type UnitId = (typeof unitIds)[number]

interface HistoryEntry {
  id: string
  name: string
  timestamp: number
  input: BattleInput
}

// Consolidated per-wave configuration
export interface WaveConfig {
  attackOolPreset: string
  defenseOolPreset: string
  rounds: string
  retreatThreshold: number
  takesTerritory: number
  aaLast: boolean
  attackerSubmerge: boolean
  defenderSubmerge: boolean
  attackerDestroyerLast: boolean
  defenderDestroyerLast: boolean
  crashFighters: boolean
  retreatExpectedIpcProfitThreshold?: number
  retreatPwinThreshold?: number
  retreatStrafeThreshold?: number
  retreatLoseAirProbabilityThreshold?: number
}

const DEFAULT_WAVE_CONFIG: WaveConfig = {
  attackOolPreset: 'inf-art-tnk-fig-bom',
  defenseOolPreset: 'aa-inf-art-tnk-bom-fig',
  rounds: 'all',
  retreatThreshold: 0,
  takesTerritory: 0,
  aaLast: false,
  attackerSubmerge: false,
  defenderSubmerge: false,
  attackerDestroyerLast: false,
  defenderDestroyerLast: false,
  crashFighters: false,
}

// Hook for managing per-wave state
function useWaveState(initialWaves = 3) {
  const [waveConfigs, setWaveConfigs] = useState<Record<number, WaveConfig>>(() => {
    const config: Record<number, WaveConfig> = {}
    for (let i = 0; i < initialWaves; i++) {
      config[i] = { ...DEFAULT_WAVE_CONFIG }
    }
    return config
  })

  const updateWave = useCallback((waveIdx: number, updates: Partial<WaveConfig>) => {
    setWaveConfigs(prev => ({
      ...prev,
      [waveIdx]: { ...prev[waveIdx], ...updates }
    }))
  }, [])

  const resetWaves = useCallback((count: number) => {
    const config: Record<number, WaveConfig> = {}
    for (let i = 0; i < count; i++) {
      config[i] = { ...DEFAULT_WAVE_CONFIG }
    }
    setWaveConfigs(config)
  }, [])

  return { waveConfigs, updateWave, resetWaves }
}

const unitNameMap: Record<string, string> = {
  inf: 'Infantry',
  art: 'Artillery',
  arm: 'Tanks',
  fig: 'Fighters',
  bom: 'Bombers',
  aa: 'Anti-Aircraft',
  sub: 'Submarines',
  tra: 'Transports',
  des: 'Destroyers',
  cru: 'Cruisers',
  acc: 'Carriers',
  bat: 'Battleships',
  dbat: 'Damaged Battleship',
  inf_a: 'Infantry (Amphibious)',
  art_a: 'Artillery (Amphibious)',
  arm_a: 'Tanks (Amphibious)',
}

interface HistoryPanelProps {
  history: HistoryEntry[]
  onLoad: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

function HistoryPanel({ history, onLoad, onDelete, onClearAll }: HistoryPanelProps) {
  return (
    <div style={{
      width: '300px',
      borderLeft: '1px solid #ddd',
      backgroundColor: '#f9f9f9',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #ddd', backgroundColor: '#f0f0f0' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>History ({history.length})</h3>
        <button
          onClick={onClearAll}
          style={{
            fontSize: '11px',
            padding: '4px 8px',
            backgroundColor: '#ddd',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            color: '#333'
          }}
        >
          Clear All
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {history.length === 0 ? (
          <div style={{ padding: '12px', color: '#999', fontSize: '12px' }}>No history yet</div>
        ) : (
          history.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #eee',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e9e9e9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                onClick={() => onLoad(entry)}
                style={{
                  flex: 1,
                  color: '#0066cc',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {entry.name}
              </div>
              <button
                onClick={() => onDelete(entry.id)}
                style={{
                  padding: '2px 6px',
                  backgroundColor: 'transparent',
                  color: '#cc0000',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  minWidth: '24px',
                  textAlign: 'center'
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

interface ModeSelectorProps {
  mode: BattleMode
  onChange: (mode: BattleMode) => void
}

function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      <label>
        <input
          type="radio"
          name="battleMode"
          value="land"
          checked={mode === 'land'}
          onChange={() => onChange('land')}
        />
        Land
      </label>
      <label>
        <input
          type="radio"
          name="battleMode"
          value="sea"
          checked={mode === 'sea'}
          onChange={() => onChange('sea')}
        />
        Sea
      </label>
      <label>
        <input
          type="radio"
          name="battleMode"
          value="sbr"
          checked={mode === 'sbr'}
          onChange={() => onChange('sbr')}
        />
        SBR
      </label>
    </div>
  )
}

interface ResetButtonsProps {
  onResetAll: () => void
  onResetUnits: () => void
}

function ResetButtons({ onResetAll, onResetUnits }: ResetButtonsProps) {
  const buttonStyle = {
    padding: '8px 12px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600' as const,
    whiteSpace: 'nowrap' as const,
  }

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
      <button
        onClick={onResetAll}
        style={{ ...buttonStyle, backgroundColor: '#666' }}
      >
        Reset All
      </button>
      <button
        onClick={onResetUnits}
        style={{ ...buttonStyle, backgroundColor: '#999' }}
      >
        Reset Units
      </button>
    </div>
  )
}

function getUnitName(unit: string): string {
  return unitNameMap[unit] || unit.toUpperCase()
}

/**
 * Convert a Record of unit counts to a unit string
 * e.g., { inf: 3, art: 2, fig: 1 } → "3i2a1f"
 */
function getUnitString(units: Record<string, number>): string {
  const unitMap: Record<string, string> = {
    inf: 'i',
    art: 'a',
    arm: 't',
    fig: 'f',
    bom: 'b',
    aa: 'c',
    sub: 'S',
    tra: 'T',
    des: 'D',
    cru: 'C',
    acc: 'A',
    bat: 'B',
    dbat: 'F',
    ic: 'p',
    inf_a: 'j',
    art_a: 'g',
    arm_a: 'u',
  };
  
  const unitOrder = ['inf', 'art', 'arm', 'fig', 'bom', 'aa', 'sub', 'tra', 'des', 'cru', 'acc', 'bat', 'dbat', 'ic', 'inf_a', 'art_a', 'arm_a'];
  let result = '';
  
  for (const unitId of unitOrder) {
    if (unitId in units && units[unitId] > 0) {
      const count = units[unitId];
      const unitChar = unitMap[unitId];
      if (unitChar) {
        if (count === 1) {
          result += unitChar;
        } else {
          result += `${count}${unitChar}`;
        }
      }
    }
  }
  
  return result;
}

// Helper function to identify percentile rows
// Helper function to get percentile color
function getPercentileColor(percentile: number | undefined): { bg: string; border: string } {
  if (percentile) {
    return { bg: '#fff3e0', border: '#ff9800' }  // Light orange background, orange border
  }
  return { bg: 'transparent', border: 'transparent' }
}

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
  const [decimalPlaces, setDecimalPlaces] = useState(2)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [histogramZoom, setHistogramZoom] = useState(1)
  
  // Per-wave state consolidated via hook
  const { waveConfigs, updateWave, resetWaves } = useWaveState(3)
  
  // Units per wave
  const [attack, setAttack] = useState<Record<number, Record<string, number>>>({
    0: {},
    1: {},
    2: {},
  })
  const [defense, setDefense] = useState<Record<number, Record<string, number>>>({
    0: {},
    1: {},
    2: {},
  })
  const [result, setResult] = useState<ReturnType<typeof computeBattle> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyName, setHistoryName] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  
  // Refs to track when we need to run battle after loading history
  const shouldRunBattleRef = useRef(false)
  const loadedEntryNameRef = useRef<string | null>(null)
  const isLoadingFromHistoryRef = useRef(false)
  const histogramScrollRef = useRef<HTMLDivElement>(null)

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

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('battleHistory', JSON.stringify(history))
  }, [history])

  // Ensure units & presets stay in mode when switching modes
  useEffect(() => {
    const allowed = new Set(modeUnitMap[mode])
    setAttack((prev) => {
      const next: Record<number, Record<string, number>> = {}
      for (let i = 0; i < 3; i++) {
        next[i] = Object.fromEntries(Object.entries(prev[i] || {}).filter(([k]) => allowed.has(k as UnitId)))
      }
      return next
    })
    setDefense((prev) => {
      const next: Record<number, Record<string, number>> = {}
      for (let i = 0; i < 3; i++) {
        next[i] = Object.fromEntries(Object.entries(prev[i] || {}).filter(([k]) => allowed.has(k as UnitId)))
      }
      return next
    })
    // Reset wave configs to defaults, then set appropriate presets for this mode
    resetWaves(3)
    for (let i = 0; i < 3; i++) {
      updateWave(i, {
        attackOolPreset: attackerOolPresets[mode][0].id,
        defenseOolPreset: defenderOolPresets[mode][0].id,
      })
    }
    setNumWaves(mode === 'sbr' ? 1 : 1)
  }, [mode, resetWaves, updateWave])

  // Clear results when any input changes
  useEffect(() => {
    setResult(null)
  }, [attack, defense, waveConfigs, diceMode, inProgress, verboseLevel, pruneThreshold, reportPruneThreshold, sortMode, territoryValue, isDeadzone, numWaves])

  const runBattle = useCallback(() => {
    setError(null)
    try {
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
      
      for (let i = 0; i < numWaves; i++) {
        const config = waveConfigs[i]
        attackOolRecord[i] = attackerOolPresets[mode].find((o) => o.id === config.attackOolPreset)?.ool || []
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
  }, [attack, defense, mode, waveConfigs, diceMode, inProgress, verboseLevel, pruneThreshold, reportPruneThreshold, sortMode, territoryValue, isDeadzone, numWaves, historyName])

  const loadFromHistory = (entry: HistoryEntry) => {
    // Set flag to prevent auto-saving when we run the battle
    isLoadingFromHistoryRef.current = true
    
    const { input } = entry
    
    setMode(input.mode || 'land')
    setNumWaves(input.numWaves || 1)
    setAttack(input.attack || {})
    setDefense(input.defense || {})
    
    // Populate per-wave configs
    const numWavesToLoad = input.numWaves || 1
    for (let i = 0; i < numWavesToLoad; i++) {
      const attackOol = input.attackOol?.[i]
      const defenseOol = input.defenseOol?.[i]
      
      // Find matching presets for OOL arrays
      const mode = input.mode || 'land'
      const attackingPreset = attackOol 
        ? attackerOolPresets[mode].find((p) =>
            JSON.stringify(p.ool.sort()) === JSON.stringify([...attackOol].sort())
          )
        : undefined
      
      const defenderPreset = defenseOol
        ? defenderOolPresets[mode].find((p) =>
            JSON.stringify(p.ool.sort()) === JSON.stringify([...defenseOol].sort())
          )
        : undefined
      
      updateWave(i, {
        attackOolPreset: attackingPreset?.id || DEFAULT_WAVE_CONFIG.attackOolPreset,
        defenseOolPreset: defenderPreset?.id || DEFAULT_WAVE_CONFIG.defenseOolPreset,
        rounds: (input.rounds?.[i]?.toString() ?? 'all') as unknown as string,
        retreatThreshold: input.retreatThreshold?.[i] ?? 0,
        takesTerritory: input.takesTerritory?.[i] ?? 0,
        aaLast: input.aaLast?.[i] ?? false,
        attackerSubmerge: input.attackerSubmerge?.[i] ?? false,
        defenderSubmerge: input.defenderSubmerge?.[i] ?? false,
        attackerDestroyerLast: input.attackerDestroyerLast?.[i] ?? false,
        defenderDestroyerLast: input.defenderDestroyerLast?.[i] ?? false,
        crashFighters: input.crashFighters?.[i] ?? false,
        retreatExpectedIpcProfitThreshold: input.retreatExpectedIpcProfitThresholds?.[i],
        retreatPwinThreshold: input.retreatPwinThresholds?.[i],
        retreatStrafeThreshold: input.retreatStrafeThresholds?.[i],
        retreatLoseAirProbabilityThreshold: input.retreatLoseAirProbabilityThresholds?.[i],
      })
    }
    
    setDiceMode(input.diceMode || 'standard')
    setTerritoryValue(input.territoryValue || 0)
    setIsDeadzone(input.isDeadzone ?? false)
    setInProgress(input.inProgress ?? false)
    setVerboseLevel(input.verboseLevel || 0)
    setPruneThreshold(input.pruneThreshold || 1e-12)
    setReportPruneThreshold(input.reportPruneThreshold || 1e-12)
    setSortMode(input.sortMode || 'ipc_cost')
    // Note: amphibious and decimalPlaces are UI-only state, not saved in history
    
    // Store the loaded entry name to populate the field after state updates
    loadedEntryNameRef.current = entry.name
    
    // Mark that we should run the battle after state updates
    shouldRunBattleRef.current = true
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
      <ModeSelector mode={mode} onChange={setMode} />

      <ResetButtons 
        onResetAll={() => {
          setAttack({ 0: {}, 1: {}, 2: {} })
          setDefense({ 0: {}, 1: {}, 2: {} })
          resetWaves(3)
          setNumWaves(1)
          setDiceMode('standard')
          setAmphibious(false)
          setTerritoryValue(0)
          setIsDeadzone(false)
          setInProgress(false)
          setVerboseLevel(0)
          setPruneThreshold(1e-12)
          setReportPruneThreshold(1e-12)
          setSortMode('ipc_cost')
          setDecimalPlaces(2)
          setResult(null)
          setError('')
        }}
        onResetUnits={() => {
          setAttack({ 0: {}, 1: {}, 2: {} })
          setDefense({ 0: {}, 1: {}, 2: {} })
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
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
              <label>Waves</label>
            </div>
            
            <div className="floating-label-group">
              <select value={diceMode} onChange={(e) => setDiceMode(e.target.value as any)}>
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

      {mode === 'sbr' && (
        <section className="battle-options">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <div className="floating-label-group" style={{ margin: '8px 0 0 0', position: 'relative' }}>
              <select value={diceMode} onChange={(e) => setDiceMode(e.target.value as any)} style={{ width: '100%' }}>
                <option value="standard">Standard</option>
                <option value="lowluck">Low Luck</option>
                <option value="biased">Biased</option>
              </select>
              <label>Dice Mode</label>
            </div>
          </div>
        </section>
      )}

      {mode !== 'sbr' && (
        <section className="waves-section">
          {Array.from({ length: numWaves }, (_, waveIdx) => (
            <div key={`wave-${waveIdx}`}>
              <div key={`wave-card-${waveIdx}`} style={{ border: '2px solid #333', borderRadius: '8px', padding: '15px', marginBottom: '15px', backgroundColor: '#f9f9f9' }}>
              <h2 style={{ marginTop: 0 }}>Wave {waveIdx + 1}</h2>
              
              <div className="wave-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto minmax(200px, 1fr)', gap: '20px', marginBottom: '15px', alignItems: 'start' }}>
                {/* Attacker Column */}
                <div style={{}}>
                  <h3 style={{ marginBottom: '10px' }}>Attacker</h3>
                  
                  <div className="floating-label-group">
                    <select 
                      value={waveConfigs[waveIdx]?.attackOolPreset || 'inf-art-tnk-fig-bom'} 
                      onChange={(e) => updateWave(waveIdx, { attackOolPreset: e.target.value })}
                    >
                      {attackerOolPresets[mode].map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                    <label>Order of Loss</label>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#666', fontWeight: '500' }}>Units:</label>
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
                              value={attack[waveIdx]?.[unit] || ''}
                              className={attack[waveIdx]?.[unit] ? 'has-value' : ''}
                              onChange={(e) => {
                                const n = Math.max(0, Number(e.target.value) || 0)
                                const waveAttack = { ...(attack[waveIdx] || {}) }
                                if (n > 0) {
                                  waveAttack[unit] = n
                                } else {
                                  delete waveAttack[unit]
                                }
                                setAttack({ ...attack, [waveIdx]: waveAttack })
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
                    unitString={getUnitString(attack[waveIdx] || {})} 
                    isAttacker={true}
                    isLandMode={mode === 'land'}
                  />
                </div>

                {/* Swap Button */}
                <button
                  onClick={() => {
                    const newAttack = { ...attack }
                    const newDefense = { ...defense }
                    const tempAttack = { ...(attack[waveIdx] || {}) }
                    const tempDefense = { ...(defense[waveIdx] || {}) }
                    
                    // Filter out disabled units when swapping
                    const filteredAttack: Record<string, number> = {}
                    const filteredDefense: Record<string, number> = {}
                    
                    // Defense values going to attacker: remove 'aa' if present
                    for (const [unit, val] of Object.entries(tempDefense)) {
                      if (unit !== 'aa') {
                        filteredAttack[unit] = val
                      }
                    }
                    
                    // Attack values going to defender: remove 'cru' and 'bat' if present
                    for (const [unit, val] of Object.entries(tempAttack)) {
                      if (unit !== 'cru' && unit !== 'bat') {
                        filteredDefense[unit] = val
                      }
                    }
                    
                    newAttack[waveIdx] = filteredAttack
                    newDefense[waveIdx] = filteredDefense
                    
                    setAttack(newAttack)
                    setDefense(newDefense)
                  }}
                  style={{
                    alignSelf: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#1d4ed8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ⇄ Swap
                </button>

                {/* Defender Column */}
                <div style={{}}>
                  <h3 style={{ marginBottom: '10px' }}>Defender</h3>
                  
                  <div className="floating-label-group">
                    <select 
                      value={waveConfigs[waveIdx]?.defenseOolPreset || 'aa-inf-art-tnk-bom-fig'} 
                      onChange={(e) => updateWave(waveIdx, { defenseOolPreset: e.target.value })}
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
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#666', fontWeight: '500' }}>Units:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                      {(modeUnitMap[mode] || []).map((unit) => {
                        const isDisabled = mode === 'sea' ? unit === 'bom' : (unit === 'cru' || unit === 'bat')
                        return (
                          <div key={`def-${waveIdx}-${unit}`} className="floating-label-group" style={{ opacity: isDisabled ? 0.5 : 1 }}>
                            <input
                              type="number"
                              min={0}
                              disabled={isDisabled}
                              value={defense[waveIdx]?.[unit] || ''}
                              className={defense[waveIdx]?.[unit] ? 'has-value' : ''}
                              onChange={(e) => {
                                const n = Math.max(0, Number(e.target.value) || 0)
                                const waveDef = { ...(defense[waveIdx] || {}) }
                                if (n > 0) {
                                  waveDef[unit] = n
                                } else {
                                  delete waveDef[unit]
                                }
                                setDefense({ ...defense, [waveIdx]: waveDef })
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
                    unitString={getUnitString(defense[waveIdx] || {})} 
                    isAttacker={false}
                    isLandMode={mode === 'land'}
                  />
                </div>
              </div>

              {/* Wave Options */}
              {mode === 'sea' ? (
                <SeaModeSection
                  waveIdx={waveIdx}
                  config={waveConfigs[waveIdx]}
                  onUpdate={(updates) => updateWave(waveIdx, updates)}
                />
              ) : (
                <LandModeSection
                  waveIdx={waveIdx}
                  config={waveConfigs[waveIdx]}
                  onUpdate={(updates) => updateWave(waveIdx, updates)}
                />
              )}

              {waveIdx < numWaves - 1 && (
              <button
                key={`swap-wave-${waveIdx}`}
                onClick={() => {
                  const newAttack = { ...attack }
                  
                  const temp = { ...(attack[waveIdx] || {}) }
                  const tempConfig = { ...waveConfigs[waveIdx] }
                  const nextConfig = { ...waveConfigs[waveIdx + 1] }
                  
                  newAttack[waveIdx] = { ...(attack[waveIdx + 1] || {}) }
                  newAttack[waveIdx + 1] = temp
                  
                  setAttack(newAttack)
                  // Update both wave configs
                  updateWave(waveIdx, nextConfig)
                  updateWave(waveIdx + 1, tempConfig)
                }}
                style={{
                  margin: '10px auto',
                  padding: '8px 12px',
                  backgroundColor: '#1d4ed8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                ↓ Swap Wave {waveIdx + 1} ↔ {waveIdx + 2}
              </button>
            )}
              </div>
            </div>
          ))}
        </section>
      )}

      {mode === 'sbr' && (
        <section style={{ border: '2px solid #333', borderRadius: '8px', padding: '15px', marginBottom: '15px', backgroundColor: '#f9f9f9' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Bombers Column */}
            <div>
              <h3>Bombers</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                {(modeUnitMap[mode] || []).map((unit) => (
                  <div key={`att-0-${unit}`} className="floating-label-group" style={{ opacity: unit === 'ic' ? 0.5 : 1 }}>
                    <input
                      type="number"
                      min={0}
                      disabled={unit === 'ic'}
                      value={attack[0]?.[unit] || ''}
                      className={attack[0]?.[unit] ? 'has-value' : ''}
                      onChange={(e) => {
                        const n = Math.max(0, Number(e.target.value) || 0)
                        const waveAttack = { ...(attack[0] || {}) }
                        if (n > 0) {
                          waveAttack[unit] = n
                        } else {
                          delete waveAttack[unit]
                        }
                        setAttack({ ...attack, 0: waveAttack })
                      }}
                    />
                    <label>{getUnitName(unit)}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Industrial Complexes Column */}
            <div>
              <h3>Industrial Complexes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                {(modeUnitMap[mode] || []).map((unit) => (
                  <div key={`def-0-${unit}`} className="floating-label-group" style={{ opacity: unit === 'bom' ? 0.5 : 1 }}>
                    <input
                      type="number"
                      min={0}
                      disabled={unit === 'bom'}
                      value={defense[0]?.[unit] || ''}
                      className={defense[0]?.[unit] ? 'has-value' : ''}
                      onChange={(e) => {
                        const n = Math.max(0, Number(e.target.value) || 0)
                        const waveDef = { ...(defense[0] || {}) }
                      if (n > 0) {
                        waveDef[unit] = n
                      } else {
                        delete waveDef[unit]
                      }
                      setDefense({ ...defense, 0: waveDef })
                    }}
                    />
                    <label>{getUnitName(unit)}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <ArmyRecommendSection 
        battleInput={{
          attack,
          defense,
          attackOol: Object.values(waveConfigs).map((wc) => attackerOolPresets[mode].find((p) => p.id === wc.attackOolPreset)?.ool || []),
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
          console.log('Army Recommendation Result:', result)
        }}
      />

      <button className="run-btn" onClick={runBattle}>
        Evaluate Battle
      </button>

      <div className="ool-summary">
        <p>
          Attacker OOL: {attackerOolPresets[mode].find((p) => p.id === waveConfigs[0]?.attackOolPreset)?.label}
        </p>
        <p>
          Defender OOL: {defenderOolPresets[mode].find((p) => p.id === waveConfigs[0]?.defenseOolPreset)?.label}
        </p>
      </div>

      {error && <p className="error">Error: {error}</p>}

      {result && (
        <section className="results">
          <h2>Results</h2>
          
          {/* Wave Summaries */}
          {Array.from({ length: numWaves }, (_, waveIdx) => {
            const attackLoss = result.attack.ipcLoss[waveIdx] ?? 0;
            const defenseLoss = result.defense.ipcLoss[waveIdx] ?? 0;
            const attackLossDelta = waveIdx > 0 ? attackLoss - (result.attack.ipcLoss[waveIdx - 1] ?? 0) : attackLoss;
            const defenseLossDelta = waveIdx > 0 ? defenseLoss - (result.defense.ipcLoss[waveIdx - 1] ?? 0) : defenseLoss;
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
                    <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>{(((result.attack.survives[waveIdx] ?? 0) ) * 100).toFixed(1)}%</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '120px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>Atk Takes Terr</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>{((result.takesTerritory[waveIdx] ?? 0) * 100).toFixed(1)}%</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '105px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>Def Survives</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>{(((result.defense.survives[waveIdx] ?? 0) ) * 100).toFixed(1)}%</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '115px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>{waveIdx > 0 ? 'Δ Atk IPC' : 'Atk IPC Loss'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d32f2f', lineHeight: '1.2' }}>{attackLossDelta.toFixed(1)}</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '115px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>{waveIdx > 0 ? 'Δ Def IPC' : 'Def IPC Loss'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d32f2f', lineHeight: '1.2' }}>{defenseLossDelta.toFixed(1)}</div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: '115px' }}>
                    <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', lineHeight: '1.2' }}>{waveIdx > 0 ? 'Δ Profit' : 'Atk Profit'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2', lineHeight: '1.2' }}>
                      {profitDelta.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* All Waves Summary */}
          {numWaves > 1 && (
            <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #1976d2' }}>
              <h3 style={{ marginTop: 0, color: '#1565c0' }}>All Waves Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Attacker IPC Loss</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>{(result.attack.ipcLoss[numWaves - 1] ?? 0).toFixed(1)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Defender IPC Loss</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>{(result.defense.ipcLoss[numWaves - 1] ?? 0).toFixed(1)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Attacker Profit</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
                    {((result.defense.ipcLoss[numWaves - 1] ?? 0) - (result.attack.ipcLoss[numWaves - 1] ?? 0)).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attacker Detailed Casualties */}
          <CollapsibleSection title="Attacker Detailed Casualties" headerColor="#4CAF50">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Probability %</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Confidence %</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Reverse Confidence %</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Surviving</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Retreating</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Casualties</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>IPC</th>
                </tr>
              </thead>
              <tbody>
                {result.casualtiesInfo['attack'] && (() => {
                  const sortedEntries = Object.entries(result.casualtiesInfo['attack'])
                    .sort(([_, infoA], [__, infoB]) => infoA.ipcLoss - infoB.ipcLoss)
                  const totalProb = sortedEntries.reduce((sum, [_, casualty]) => sum + casualty.amount, 0)
                  const percentiles = [5, 32, 50, 68, 95]
                  
                  return sortedEntries.map(([outcome, info], idx) => {
                    const cumulativeProb = sortedEntries
                      .slice(0, idx + 1)
                      .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100
                    const reverseProb = sortedEntries
                      .slice(idx)
                      .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100
                    
                    // Identify percentile
                    const percentageProb = (cumulativeProb / (totalProb * 100)) * 100
                    const prevPercentage = idx > 0 
                      ? (sortedEntries.slice(0, idx).reduce((sum, [_, casualty]) => sum + casualty.amount, 0) / totalProb) * 100
                      : 0
                    const percentile = percentiles.find(p => prevPercentage < p && percentageProb >= p)
                    const colors = percentile ? getPercentileColor(percentile) : { bg: 'transparent', border: 'transparent' }
                    
                    return (
                      <tr 
                        key={`att-${outcome}-${idx}`}
                        style={{
                          borderBottom: '1px solid #eee',
                          backgroundColor: colors.bg,
                          borderLeft: percentile ? `4px solid ${colors.border}` : 'none'
                        }}
                      >
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{(info.amount * 100).toFixed(decimalPlaces)}%</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{cumulativeProb.toFixed(decimalPlaces)}%</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{reverseProb.toFixed(decimalPlaces)}%</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.survivors}</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.retreaters}</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.casualties}</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left', color: '#d32f2f', fontWeight: '500' }}>
                          {info.ipcLoss.toFixed(1)} {percentile && `📊 ${percentile}%`}
                        </td>
                      </tr>
                    );
                  })
                })()}
              </tbody>
            </table>
          </CollapsibleSection>

          {/* Defender Detailed Casualties */}
          <CollapsibleSection title="Defender Detailed Casualties" headerColor="#FF9800">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Probability %</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Confidence %</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Reverse Confidence %</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Surviving</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Casualties</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>IPC</th>
                </tr>
              </thead>
              <tbody>
                {result.casualtiesInfo['defense'] && (() => {
                  const sortedEntries = Object.entries(result.casualtiesInfo['defense'])
                    .sort(([_, infoA], [__, infoB]) => infoA.ipcLoss - infoB.ipcLoss)
                  const totalProb = sortedEntries.reduce((sum, [_, casualty]) => sum + casualty.amount, 0)
                  const percentiles = [5, 32, 50, 68, 95]
                  
                  return sortedEntries.map(([outcome, info], idx) => {
                    const cumulativeProb = sortedEntries
                      .slice(0, idx + 1)
                      .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100
                    const reverseProb = sortedEntries
                      .slice(idx)
                      .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100
                    
                    // Identify percentile
                    const percentageProb = (cumulativeProb / (totalProb * 100)) * 100
                    const prevPercentage = idx > 0 
                      ? (sortedEntries.slice(0, idx).reduce((sum, [_, casualty]) => sum + casualty.amount, 0) / totalProb) * 100
                      : 0
                    const percentile = percentiles.find(p => prevPercentage < p && percentageProb >= p)
                    const colors = percentile ? getPercentileColor(percentile) : { bg: 'transparent', border: 'transparent' }
                    
                    return (
                      <tr 
                        key={`def-${outcome}-${idx}`}
                        style={{
                          borderBottom: '1px solid #eee',
                          backgroundColor: colors.bg,
                          borderLeft: percentile ? `4px solid ${colors.border}` : 'none'
                        }}
                      >
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{(info.amount * 100).toFixed(decimalPlaces)}%</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{cumulativeProb.toFixed(decimalPlaces)}%</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{reverseProb.toFixed(decimalPlaces)}%</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.survivors}</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.casualties}</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left', color: '#d32f2f', fontWeight: '500' }}>
                          {info.ipcLoss.toFixed(1)} {percentile && `📊 ${percentile}%`}
                        </td>
                      </tr>
                    );
                  })
                })()}
              </tbody>
            </table>
          </CollapsibleSection>

          <CollapsibleSection title="IPC Profit Distribution" headerColor="#1976d2">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Probability %</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Confidence %</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Reverse Confidence %</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>IPC Profit</th>
                </tr>
              </thead>
              <tbody>
                {result.profitDistribution?.[0] && (() => {
                  const sortedEntries = Object.entries(result.profitDistribution[0])
                    .sort(([ipcStrA], [ipcStrB]) => {
                      const ipcA = parseFloat(ipcStrA);
                      const ipcB = parseFloat(ipcStrB);
                      return ipcA - ipcB;
                    })
                  const totalProb = sortedEntries.reduce((sum, [_, info]) => sum + ((info as any).prob || 0), 0)
                  const percentiles = [5, 32, 50, 68, 95]
                  
                  return sortedEntries.map(([ipcStr, profitInfo], idx) => {
                    const probValue = (profitInfo as any).prob || 0
                    const cumulativeProb = sortedEntries
                      .slice(0, idx + 1)
                      .reduce((sum, [_, info]) => sum + ((info as any).prob || 0), 0) * 100
                    const reverseProb = sortedEntries
                      .slice(idx)
                      .reduce((sum, [_, info]) => sum + ((info as any).prob || 0), 0) * 100
                    
                    // Identify percentile
                    const percentageProb = (cumulativeProb / (totalProb * 100)) * 100
                    const prevPercentage = idx > 0 
                      ? (sortedEntries.slice(0, idx).reduce((sum, [_, info]) => sum + ((info as any).prob || 0), 0) / totalProb) * 100
                      : 0
                    const percentile = percentiles.find(p => prevPercentage < p && percentageProb >= p)
                    const colors = percentile ? getPercentileColor(percentile) : { bg: 'transparent', border: 'transparent' }
                    
                    const ipcValue = (profitInfo as any).ipc ?? 0
                    return (
                      <tr 
                        key={`${ipcStr}-${idx}`}
                        style={{
                          borderBottom: '1px solid #eee',
                          backgroundColor: colors.bg,
                          borderLeft: percentile ? `4px solid ${colors.border}` : 'none'
                        }}
                      >
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{(probValue * 100).toFixed(decimalPlaces)}%</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{cumulativeProb.toFixed(decimalPlaces)}%</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{reverseProb.toFixed(decimalPlaces)}%</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left', fontWeight: '500', color: ipcValue >= 0 ? '#2e7d32' : '#d32f2f' }}>
                          {ipcValue.toFixed(1)} {percentile && `📊 ${percentile}%`}
                        </td>
                      </tr>
                    );
                  })
                })()}
              </tbody>
            </table>

            {/* Profit Distribution Histogram */}
            {result.profitDistribution?.[0] && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', margin: 0, color: '#333' }}>IPC Profit Distribution Chart</h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => setHistogramZoom(z => Math.max(1, z - 0.2))}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      − Zoom Out
                    </button>
                    <span style={{ fontSize: '12px', color: '#666', minWidth: '50px', textAlign: 'center' }}>
                      {(histogramZoom * 100).toFixed(0)}%
                    </span>
                    <button
                      onClick={() => setHistogramZoom(z => Math.min(3, z + 0.2))}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      Zoom In +
                    </button>
                    <button
                      onClick={() => {
                        setHistogramZoom(1)
                        if (histogramScrollRef.current) {
                          histogramScrollRef.current.scrollLeft = 0
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div
                  ref={histogramScrollRef}
                  style={{
                    overflowX: histogramZoom > 1 ? 'auto' : 'hidden',
                    overflowY: 'hidden',
                    borderRadius: '4px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <div style={{ width: `${100 * histogramZoom}%`, minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      {(() => {
                        const binned = Object.entries(result.profitDistribution[0])
                          .reduce((bins: Record<number, number>, [ipcStr, profitInfo]) => {
                            const ipc = parseFloat(ipcStr);
                            const binSize = 3;
                            const binKey = Math.floor(ipc / binSize) * binSize;
                            bins[binKey] = (bins[binKey] || 0) + ((profitInfo as any).prob || 0) * 100;
                            return bins;
                          }, {})
                        
                        const sorted = Object.entries(binned)
                          .sort(([aKey], [bKey]) => parseInt(aKey) - parseInt(bKey))
                          .map(([binKey, prob]) => ({
                            ipc: parseInt(binKey),
                            ipcRange: `${binKey}-${parseInt(binKey) + 2}`,
                            probability: prob,
                          }))
                        
                        // Calculate cumulative sums and identify percentiles
                        const totalProb = sorted.reduce((sum, item) => sum + item.probability, 0)
                        const percentiles = [5, 32, 50, 68, 95]
                        let cumulativeLeft = 0
                        
                        const chartData = sorted.map((item, index) => {
                          cumulativeLeft += item.probability
                          const cumulativeRight = totalProb - cumulativeLeft + item.probability
                          
                          // Check if this bar contains any percentile boundary
                          const percentileAt = percentiles.find(p => {
                            const prevCum = cumulativeLeft - item.probability
                            return prevCum < p && cumulativeLeft >= p
                          })
                          
                          return {
                            ...item,
                            cumulativeLeft,
                            cumulativeRight,
                            percentileAt,
                          }
                        })

                        return (
                          <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="ipc" 
                              label={{ value: 'IPC Profit', position: 'insideBottomRight', offset: -10 }}
                            />
                            <YAxis 
                              label={{ value: 'Probability %', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              formatter={(value: any) => (typeof value === 'number' ? value.toFixed(decimalPlaces) : value) + '%'}
                              labelFormatter={(label: any) => `IPC ${label}-${label + 2}`}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div style={{
                                      backgroundColor: '#fff',
                                      border: '1px solid #ccc',
                                      borderRadius: '4px',
                                      padding: '8px',
                                      fontSize: '12px',
                                      color: '#333',
                                    }}>
                                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                                        IPC {data.ipcRange}
                                      </p>
                                      <p style={{ margin: '2px 0' }}>
                                        Probability: {data.probability.toFixed(decimalPlaces)}%
                                      </p>
                                      <p style={{ margin: '2px 0', color: '#666' }}>
                                        Sum ≤ {data.ipc + 2}: {data.cumulativeLeft.toFixed(decimalPlaces)}%
                                      </p>
                                      <p style={{ margin: '2px 0', color: '#666' }}>
                                        Sum ≥ {data.ipc}: {data.cumulativeRight.toFixed(decimalPlaces)}%
                                      </p>
                                      {data.percentileAt && (
                                        <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#f44336' }}>
                                          📊 {data.percentileAt}th Percentile
                                        </p>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar 
                              dataKey="probability" 
                              fill="#1976d2" 
                              radius={[4, 4, 0, 0]}
                            >
                              {chartData.map((entry, index) => {
                                return (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.percentileAt ? '#ff9800' : '#1976d2'}
                                    stroke={entry.percentileAt ? '#000' : 'none'}
                                    strokeWidth={entry.percentileAt ? 2 : 0}
                                  />
                                )
                              })}
                            </Bar>
                          </BarChart>
                        )
                      })()}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleSection>
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
    </main>
  )
}

export default App

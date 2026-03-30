import { useCallback, useEffect, useState } from 'react'
import {
  multiwaveExternal,
  sbrExternal,
  type MultiwaveInput,
  type MultiwaveOutput,
} from 'aacalc2'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './App.css'

// Frontend wrapper types
interface BattleInput {
  attack: Record<number, Record<string, number>>
  defense: Record<number, Record<string, number>>
  attackOol?: Record<number, UnitId[]>
  defenseOol?: Record<number, UnitId[]>
  rounds?: Record<number, number>
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
    const roundsNum = input.rounds?.[waveIdx] ?? 100
    
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

  console.log('MultiwaveInput:', multiwaveInput)
  const output = multiwaveExternal(multiwaveInput)
  console.log('MultiwaveOutput:', output)
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
  console.log('SBR Input:', sbrInput)
  const output = sbrExternal(sbrInput)
  console.log('SBR Output:', output)
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

function getUnitName(unit: string): string {
  return unitNameMap[unit] || unit.toUpperCase()
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
  // Per-wave state
  const [attackOolPreset, setAttackOolPreset] = useState<Record<number, string>>({
    0: 'inf-art-tnk-fig-bom',
    1: 'inf-art-tnk-fig-bom',
    2: 'inf-art-tnk-fig-bom',
  })
  const [defenseOolPreset, setDefenseOolPreset] = useState<Record<number, string>>({
    0: 'aa-inf-art-tnk-bom-fig',
    1: 'aa-inf-art-tnk-bom-fig',
    2: 'aa-inf-art-tnk-bom-fig',
  })
  const [rounds, setRounds] = useState<Record<number, string>>({
    0: 'all',
    1: 'all',
    2: 'all',
  })
  const [retreatThreshold, setRetreatThreshold] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
  })
  const [takesTerritory, setTakesTerritory] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
  })
  const [aaLast, setAaLast] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  })
  // Sea-specific controls
  const [attackerSubmerge, setAttackerSubmerge] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  })
  const [attackerDestroyerLast, setAttackerDestroyerLast] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  })
  const [defenderSubmerge, setDefenderSubmerge] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  })
  const [defenderDestroyerLast, setDefenderDestroyerLast] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  })
  const [crashFighters, setCrashFighters] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  })
  const [retreatExpectedIpcProfitThresholds, setReteatExpectedIpcProfitThresholds] = useState<Record<number, number | undefined>>({
    0: undefined,
    1: undefined,
    2: undefined,
  })
  const [retreatPwinThresholds, setRetreatPwinThresholds] = useState<Record<number, number | undefined>>({
    0: undefined,
    1: undefined,
    2: undefined,
  })
  const [retreatStrafeThresholds, setRetreatStrafeThresholds] = useState<Record<number, number | undefined>>({
    0: undefined,
    1: undefined,
    2: undefined,
  })
  const [retreatLoseAirProbabilityThresholds, setRetreatLoseAirProbabilityThresholds] = useState<Record<number, number | undefined>>({
    0: undefined,
    1: undefined,
    2: undefined,
  })
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
    setAttackOolPreset((prev) => ({
      0: attackerOolPresets[mode][0].id,
      1: attackerOolPresets[mode][0].id,
      2: attackerOolPresets[mode][0].id,
    }))
    setDefenseOolPreset((prev) => ({
      0: defenderOolPresets[mode][0].id,
      1: defenderOolPresets[mode][0].id,
      2: defenderOolPresets[mode][0].id,
    }))
    setNumWaves(mode === 'sbr' ? 1 : 1)
    setRounds({ 0: 'all', 1: 'all', 2: 'all' })
    setRetreatThreshold({ 0: 0, 1: 0, 2: 0 })
    setTakesTerritory({ 0: 0, 1: 0, 2: 0 })
    setAaLast({ 0: false, 1: false, 2: false })
    setAttackerSubmerge({ 0: false, 1: false, 2: false })
    setAttackerDestroyerLast({ 0: false, 1: false, 2: false })
    setDefenderSubmerge({ 0: false, 1: false, 2: false })
    setDefenderDestroyerLast({ 0: false, 1: false, 2: false })
    setCrashFighters({ 0: false, 1: false, 2: false })
  }, [mode])

  const runBattle = useCallback(() => {
    setError(null)
    try {
      // Build per-wave OOL records
      const attackOolRecord: Record<number, UnitId[]> = {}
      const defenseOolRecord: Record<number, UnitId[]> = {}
      const roundsNum: Record<number, number> = {}
      for (let i = 0; i < numWaves; i++) {
        attackOolRecord[i] = attackerOolPresets[mode].find((o) => o.id === attackOolPreset[i])?.ool || []
        defenseOolRecord[i] = defenderOolPresets[mode].find((o) => o.id === defenseOolPreset[i])?.ool || []
        roundsNum[i] = rounds[i] === 'all' ? 100 : parseInt(rounds[i])
      }
      
      const input: BattleInput = {
        attack,
        defense,
        attackOol: attackOolRecord,
        defenseOol: defenseOolRecord,
        rounds: roundsNum,
        retreatThreshold,
        takesTerritory,
        aaLast,
        attackerSubmerge,
        defenderSubmerge,
        attackerDestroyerLast,
        defenderDestroyerLast,
        crashFighters,
        mode,
        diceMode,
        inProgress,
        verboseLevel,
        pruneThreshold,
        reportPruneThreshold,
        sortMode,
        retreatExpectedIpcProfitThresholds,
        retreatPwinThresholds,
        retreatStrafeThresholds,
        retreatLoseAirProbabilityThresholds,
        territoryValue,
        isDeadzone,
        numWaves,
      }
      const output = mode === 'sbr' ? computeSbrBattle(input) : computeBattle(input)
      setResult(output)
    } catch (err) {
      setError((err as Error).message ?? 'unknown error')
      setResult(null)
    }
  }, [attack, defense, mode, attackOolPreset, defenseOolPreset, rounds, retreatThreshold, takesTerritory, aaLast, attackerSubmerge, defenderSubmerge, attackerDestroyerLast, defenderDestroyerLast, crashFighters, retreatExpectedIpcProfitThresholds, retreatPwinThresholds, retreatStrafeThresholds, retreatLoseAirProbabilityThresholds, diceMode, inProgress, verboseLevel, pruneThreshold, reportPruneThreshold, sortMode, territoryValue, isDeadzone, numWaves])

  return (
    <main className="app">
      <h1>aa1942calc2 frontend demo</h1>
      <div className="mode-selector">
        <label>
          <input
            type="radio"
            name="battleMode"
            value="land"
            checked={mode === 'land'}
            onChange={() => setMode('land')}
          />
          Land
        </label>
        <label>
          <input
            type="radio"
            name="battleMode"
            value="sea"
            checked={mode === 'sea'}
            onChange={() => setMode('sea')}
          />
          Sea
        </label>
        <label>
          <input
            type="radio"
            name="battleMode"
            value="sbr"
            checked={mode === 'sbr'}
            onChange={() => setMode('sbr')}
          />
          SBR
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={() => {
            // Reset all inputs to default
            setAttack({ 0: {}, 1: {}, 2: {} })
            setDefense({ 0: {}, 1: {}, 2: {} })
            setAttackOolPreset({ 0: attackerOolPresets[mode][0].id, 1: attackerOolPresets[mode][0].id, 2: attackerOolPresets[mode][0].id })
            setDefenseOolPreset({ 0: defenderOolPresets[mode][0].id, 1: defenderOolPresets[mode][0].id, 2: defenderOolPresets[mode][0].id })
            setNumWaves(1)
            setRounds({ 0: 'all', 1: 'all', 2: 'all' })
            setRetreatThreshold({ 0: 0, 1: 0, 2: 0 })
            setTakesTerritory({ 0: 0, 1: 0, 2: 0 })
            setAaLast({ 0: false, 1: false, 2: false })
            setAttackerSubmerge({ 0: false, 1: false, 2: false })
            setAttackerDestroyerLast({ 0: false, 1: false, 2: false })
            setDefenderSubmerge({ 0: false, 1: false, 2: false })
            setDefenderDestroyerLast({ 0: false, 1: false, 2: false })
            setCrashFighters({ 0: false, 1: false, 2: false })
            setReteatExpectedIpcProfitThresholds({ 0: undefined, 1: undefined, 2: undefined })
            setRetreatPwinThresholds({ 0: undefined, 1: undefined, 2: undefined })
            setRetreatStrafeThresholds({ 0: undefined, 1: undefined, 2: undefined })
            setRetreatLoseAirProbabilityThresholds({ 0: undefined, 1: undefined, 2: undefined })
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
          style={{
            padding: '8px 12px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
        >
          Reset All
        </button>
        <button
          onClick={() => {
            // Reset only unit counts
            setAttack({ 0: {}, 1: {}, 2: {} })
            setDefense({ 0: {}, 1: {}, 2: {} })
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#999',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
        >
          Reset Units
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
                      value={attackOolPreset[waveIdx] || 'inf-art-tnk-fig-bom'} 
                      onChange={(e) => setAttackOolPreset({...attackOolPreset, [waveIdx]: e.target.value})}
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
                      value={defenseOolPreset[waveIdx] || 'aa-inf-art-tnk-bom-fig'} 
                      onChange={(e) => setDefenseOolPreset({...defenseOolPreset, [waveIdx]: e.target.value})}
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
                </div>
              </div>

              {/* Wave Options */}
              {mode === 'sea' ? (
                <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div className="floating-label-group">
                      <select 
                        value={rounds[waveIdx] || 'all'} 
                        onChange={(e) => setRounds({...rounds, [waveIdx]: e.target.value})}
                      >
                        <option value="all">All</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                      </select>
                      <label>Rounds</label>
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#666', fontWeight: '500' }}>Retreat Options:</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatPwinThresholds[waveIdx] === undefined && retreatStrafeThresholds[waveIdx] === undefined && retreatLoseAirProbabilityThresholds[waveIdx] === undefined && retreatExpectedIpcProfitThresholds[waveIdx] === undefined}
                          onChange={() => {
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: undefined});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: undefined});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: undefined});
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: undefined});
                          }}
                        />
                        Retreat if Number of Attacking Units Exceeds
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatExpectedIpcProfitThresholds[waveIdx] !== undefined && retreatPwinThresholds[waveIdx] === undefined && retreatStrafeThresholds[waveIdx] === undefined && retreatLoseAirProbabilityThresholds[waveIdx] === undefined}
                          onChange={() => {
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: 0});
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: undefined});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: undefined});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: undefined});
                          }}
                        />
                        Expected IPC Profit
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatPwinThresholds[waveIdx] !== undefined}
                          onChange={() => {
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: undefined});
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: 0});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: undefined});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: undefined});
                          }}
                        />
                        Probability Wins Exceeds
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatStrafeThresholds[waveIdx] !== undefined}
                          onChange={() => {
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: undefined});
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: undefined});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: 0});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: undefined});
                          }}
                        />
                        Probability of Killing Defenders Exceeds
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatLoseAirProbabilityThresholds[waveIdx] !== undefined}
                          onChange={() => {
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: undefined});
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: undefined});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: undefined});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: 0});
                          }}
                        />
                        Probability of Losing Air Exceeds
                      </label>
                    </div>
                  </div>
                  <div className="sea-controls-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={attackerSubmerge[waveIdx] || false}
                          onChange={(e) => setAttackerSubmerge({...attackerSubmerge, [waveIdx]: e.target.checked})}
                        />
                        Attacker Submerge Sub
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={attackerDestroyerLast[waveIdx] || false}
                          onChange={(e) => setAttackerDestroyerLast({...attackerDestroyerLast, [waveIdx]: e.target.checked})}
                        />
                        Attacker Destroyer Last
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={defenderSubmerge[waveIdx] || false}
                          onChange={(e) => setDefenderSubmerge({...defenderSubmerge, [waveIdx]: e.target.checked})}
                        />
                        Defender Submerge Sub
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={defenderDestroyerLast[waveIdx] || false}
                          onChange={(e) => setDefenderDestroyerLast({...defenderDestroyerLast, [waveIdx]: e.target.checked})}
                        />
                        Defender Destroyer Last
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={crashFighters[waveIdx] || false}
                          onChange={(e) => setCrashFighters({...crashFighters, [waveIdx]: e.target.checked})}
                        />
                        Crash Fighters
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                  <div className="wave-options-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div className="floating-label-group">
                      <select 
                        value={rounds[waveIdx] || 'all'} 
                        onChange={(e) => setRounds({...rounds, [waveIdx]: e.target.value})}
                      >
                        <option value="all">All</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                      </select>
                      <label>Rounds</label>
                    </div>
                    <div className="floating-label-group">
                      <input 
                        type="number" 
                        min={0}
                        value={takesTerritory[waveIdx] || ''}
                        onChange={(e) => setTakesTerritory({...takesTerritory, [waveIdx]: Number(e.target.value) || 0})}
                        className={takesTerritory[waveIdx] ? 'has-value' : ''}
                        style={{ width: '100%' }}
                      />
                      <label>Takes Territory</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={aaLast[waveIdx] || false}
                          onChange={(e) => setAaLast({...aaLast, [waveIdx]: e.target.checked})}
                        />
                        AA 2nd Last
                      </label>
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#666', fontWeight: '500' }}>Retreat Options:</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatPwinThresholds[waveIdx] === undefined && retreatStrafeThresholds[waveIdx] === undefined && retreatLoseAirProbabilityThresholds[waveIdx] === undefined && retreatExpectedIpcProfitThresholds[waveIdx] === undefined}
                          onChange={() => {
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: undefined});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: undefined});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: undefined});
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: undefined});
                          }}
                        />
                        Retreat if Number of Attacking Units Exceeds
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatExpectedIpcProfitThresholds[waveIdx] !== undefined && retreatPwinThresholds[waveIdx] === undefined && retreatStrafeThresholds[waveIdx] === undefined && retreatLoseAirProbabilityThresholds[waveIdx] === undefined}
                          onChange={() => {
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: 0});
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: undefined});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: undefined});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: undefined});
                          }}
                        />
                        Expected IPC Profit
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatPwinThresholds[waveIdx] !== undefined}
                          onChange={() => {
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: undefined});
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: 0});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: undefined});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: undefined});
                          }}
                        />
                        Probability Wins Exceeds
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatStrafeThresholds[waveIdx] !== undefined}
                          onChange={() => {
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: undefined});
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: undefined});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: 0});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: undefined});
                          }}
                        />
                        Probability of Killing Defenders Exceeds
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        <input
                          type="radio"
                          checked={retreatLoseAirProbabilityThresholds[waveIdx] !== undefined}
                          onChange={() => {
                            setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: undefined});
                            setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: undefined});
                            setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: undefined});
                            setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: 0});
                          }}
                        />
                        Probability of Losing Air Exceeds
                      </label>
                    </div>
                  </div>
                  {retreatPwinThresholds[waveIdx] === undefined && retreatStrafeThresholds[waveIdx] === undefined && retreatLoseAirProbabilityThresholds[waveIdx] === undefined && retreatExpectedIpcProfitThresholds[waveIdx] === undefined && (
                    <div style={{ marginBottom: '10px' }}>
                      <div className="floating-label-group">
                        <input 
                          type="number" 
                          min={0}
                          value={retreatThreshold[waveIdx] || ''}
                          onChange={(e) => setRetreatThreshold({...retreatThreshold, [waveIdx]: Number(e.target.value) || 0})}
                          className={retreatThreshold[waveIdx] ? 'has-value' : ''}
                          style={{ width: '100%' }}
                        />
                        <label>Threshold</label>
                      </div>
                    </div>
                  )}
                  {retreatExpectedIpcProfitThresholds[waveIdx] !== undefined && (
                    <div style={{ marginBottom: '10px' }}>
                      <div className="floating-label-group">
                        <input 
                          type="number" 
                          step="any"
                          value={retreatExpectedIpcProfitThresholds[waveIdx]}
                          onChange={(e) => setReteatExpectedIpcProfitThresholds({...retreatExpectedIpcProfitThresholds, [waveIdx]: Number(e.target.value)})}
                          style={{ width: '100%' }}
                        />
                        <label>Threshold</label>
                      </div>
                    </div>
                  )}
                  {retreatPwinThresholds[waveIdx] !== undefined && (
                    <div style={{ marginBottom: '10px' }}>
                      <div className="floating-label-group">
                        <input 
                          type="number" 
                          step="any"
                          value={retreatPwinThresholds[waveIdx]}
                          onChange={(e) => setRetreatPwinThresholds({...retreatPwinThresholds, [waveIdx]: Number(e.target.value)})}
                          style={{ width: '100%' }}
                        />
                        <label>Threshold</label>
                      </div>
                    </div>
                  )}
                  {retreatStrafeThresholds[waveIdx] !== undefined && (
                    <div style={{ marginBottom: '10px' }}>
                      <div className="floating-label-group">
                        <input 
                          type="number" 
                          step="any"
                          value={retreatStrafeThresholds[waveIdx]}
                          onChange={(e) => setRetreatStrafeThresholds({...retreatStrafeThresholds, [waveIdx]: Number(e.target.value)})}
                          style={{ width: '100%' }}
                        />
                        <label>Threshold</label>
                      </div>
                    </div>
                  )}
                  {retreatLoseAirProbabilityThresholds[waveIdx] !== undefined && (
                    <div style={{ marginBottom: '10px' }}>
                      <div className="floating-label-group">
                        <input 
                          type="number" 
                          step="any"
                          value={retreatLoseAirProbabilityThresholds[waveIdx]}
                          onChange={(e) => setRetreatLoseAirProbabilityThresholds({...retreatLoseAirProbabilityThresholds, [waveIdx]: Number(e.target.value)})}
                          style={{ width: '100%' }}
                        />
                        <label>Threshold</label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {waveIdx < numWaves - 1 && (
              <button
                key={`swap-wave-${waveIdx}`}
                onClick={() => {
                  const newAttack = { ...attack }
                  const newAttackOol = { ...attackOolPreset }
                  
                  const temp = { ...(attack[waveIdx] || {}) }
                  const tempOol = attackOolPreset[waveIdx] || 'inf-art-tnk-fig-bom'
                  
                  newAttack[waveIdx] = { ...(attack[waveIdx + 1] || {}) }
                  newAttackOol[waveIdx] = attackOolPreset[waveIdx + 1] || 'inf-art-tnk-fig-bom'
                  
                  newAttack[waveIdx + 1] = temp
                  newAttackOol[waveIdx + 1] = tempOol
                  
                  setAttack(newAttack)
                  setAttackOolPreset(newAttackOol)
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

      <button className="run-btn" onClick={runBattle}>
        Evaluate Battle
      </button>

      <div className="ool-summary">
        <p>
          Attacker OOL: {attackerOolPresets[mode].find((p) => p.id === attackOolPreset)?.label}
        </p>
        <p>
          Defender OOL: {defenderOolPresets[mode].find((p) => p.id === defenseOolPreset)?.label}
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
                {result.casualtiesInfo['attack'] && Object.entries(result.casualtiesInfo['attack'])
                  .sort(([_, infoA], [__, infoB]) => infoA.ipcLoss - infoB.ipcLoss)
                  .map(([outcome, info], idx, sortedEntries) => {
                  const cumulativeProb = sortedEntries
                    .slice(0, idx + 1)
                    .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100;
                  const reverseProb = sortedEntries
                    .slice(idx)
                    .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100;
                  
                  return (
                    <tr key={`att-${outcome}-${idx}`} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{(info.amount * 100).toFixed(decimalPlaces)}%</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{cumulativeProb.toFixed(decimalPlaces)}%</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{reverseProb.toFixed(decimalPlaces)}%</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.survivors}</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.retreaters}</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.casualties}</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left', color: '#d32f2f', fontWeight: '500' }}>
                        {info.ipcLoss.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
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
                {result.casualtiesInfo['defense'] && Object.entries(result.casualtiesInfo['defense'])
                  .sort(([_, infoA], [__, infoB]) => infoA.ipcLoss - infoB.ipcLoss)
                  .map(([outcome, info], idx, sortedEntries) => {
                  const cumulativeProb = sortedEntries
                    .slice(0, idx + 1)
                    .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100;
                  const reverseProb = sortedEntries
                    .slice(idx)
                    .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100;
                  
                  return (
                    <tr key={`def-${outcome}-${idx}`} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{(info.amount * 100).toFixed(decimalPlaces)}%</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{cumulativeProb.toFixed(decimalPlaces)}%</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{reverseProb.toFixed(decimalPlaces)}%</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.survivors}</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.casualties}</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left', color: '#d32f2f', fontWeight: '500' }}>
                        {info.ipcLoss.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
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
                {result.profitDistribution?.[0] && Object.entries(result.profitDistribution[0])
                  .sort(([ipcStrA], [ipcStrB]) => {
                    const ipcA = parseFloat(ipcStrA);
                    const ipcB = parseFloat(ipcStrB);
                    return ipcA - ipcB;
                  })
                  .map(([ipcStr, profitInfo], idx, sortedEntries) => {
                  const probValue = (profitInfo as any).prob || 0;
                  const cumulativeProb = sortedEntries
                    .slice(0, idx + 1)
                    .reduce((sum, [_, info]) => sum + ((info as any).prob || 0), 0) * 100;
                  const reverseProb = sortedEntries
                    .slice(idx)
                    .reduce((sum, [_, info]) => sum + ((info as any).prob || 0), 0) * 100;
                  
                  const ipcValue = (profitInfo as any).ipc ?? 0;
                  return (
                    <tr key={`${ipcStr}-${idx}`} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{(probValue * 100).toFixed(decimalPlaces)}%</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{cumulativeProb.toFixed(decimalPlaces)}%</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{reverseProb.toFixed(decimalPlaces)}%</td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left', fontWeight: '500', color: ipcValue >= 0 ? '#2e7d32' : '#d32f2f' }}>
                        {ipcValue.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Profit Distribution Histogram */}
            {result.profitDistribution?.[0] && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '15px', color: '#333' }}>IPC Profit Distribution Chart</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(
                      Object.entries(result.profitDistribution[0])
                        .reduce((bins: Record<number, number>, [ipcStr, profitInfo]) => {
                          const ipc = parseFloat(ipcStr);
                          const binSize = 3;
                          const binKey = Math.floor(ipc / binSize) * binSize;
                          bins[binKey] = (bins[binKey] || 0) + ((profitInfo as any).prob || 0) * 100;
                          return bins;
                        }, {})
                    )
                      .sort(([aKey], [bKey]) => parseInt(aKey) - parseInt(bKey))
                      .map(([binKey, prob]) => ({
                        ipc: parseInt(binKey),
                        ipcRange: `${binKey}-${parseInt(binKey) + 2}`,
                        probability: prob,
                      }))}
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
                    />
                    <Bar 
                      dataKey="probability" 
                      fill="#1976d2" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CollapsibleSection>
        </section>
      )}
    </main>
  )
}

export default App

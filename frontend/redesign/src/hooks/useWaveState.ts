import { useState, useCallback } from 'react'
import type { WaveConfig } from '../types.ts'
import { DEFAULT_WAVE_CONFIG, MAX_WAVES } from '../types.ts'

export function useWaveState(initialWaves = MAX_WAVES) {
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

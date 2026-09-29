import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { WaveCard } from './WaveCard.tsx'
import { DEFAULT_WAVE_CONFIG } from '../types.ts'

function renderWave(waveIdx: number, defense: Record<string, number>, attack: Record<string, number> = {}) {
  const onUnitChange = vi.fn()
  render(
    <WaveCard
      waveIdx={waveIdx}
      numWaves={2}
      mode="land"
      amphibious={false}
      attack={attack}
      defense={defense}
      config={{ ...DEFAULT_WAVE_CONFIG }}
      onUnitChange={onUnitChange}
      onSwapSides={() => {}}
      onSwapWave={() => {}}
      onUpdateConfig={() => {}}
    />,
  )
  return { onUnitChange }
}

describe('WaveCard negative defense counts', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('accepts a negative defender count from wave 2 on', () => {
    const { onUnitChange } = renderWave(1, { inf: -2 })

    const input = screen.getByDisplayValue('-2')
    expect(input).not.toHaveAttribute('min')

    fireEvent.change(input, { target: { value: '-3' } })
    expect(onUnitChange).toHaveBeenCalledWith('defense', 'inf', -3)
  })

  it('clamps the defender count at zero on wave 1', () => {
    const { onUnitChange } = renderWave(0, { inf: 2 })

    const input = screen.getByDisplayValue('2')
    expect(input).toHaveAttribute('min', '0')

    fireEvent.change(input, { target: { value: '-3' } })
    expect(onUnitChange).toHaveBeenCalledWith('defense', 'inf', 0)
  })

  it('clamps the attacker count at zero on every wave', () => {
    const { onUnitChange } = renderWave(1, {}, { inf: 2 })

    const input = screen.getByDisplayValue('2')
    expect(input).toHaveAttribute('min', '0')

    fireEvent.change(input, { target: { value: '-3' } })
    expect(onUnitChange).toHaveBeenCalledWith('attack', 'inf', 0)
  })

  it('hints at negative counts only from wave 2 on', () => {
    renderWave(1, {})
    expect(
      screen.getByText("A negative count removes that unit from the previous wave's survivors."),
    ).toBeInTheDocument()

    cleanup()

    renderWave(0, {})
    expect(
      screen.queryByText("A negative count removes that unit from the previous wave's survivors."),
    ).not.toBeInTheDocument()
  })
})

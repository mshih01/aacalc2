import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { WaveOptions } from './WaveOptions.tsx'
import { DEFAULT_WAVE_CONFIG, type WaveConfig } from '../types.ts'

function renderOptions(config: Partial<WaveConfig>, isNaval: boolean) {
  const onUpdate = vi.fn()
  render(
    <WaveOptions
      waveIdx={0}
      config={{ ...DEFAULT_WAVE_CONFIG, ...config }}
      isNaval={isNaval}
      onUpdate={onUpdate}
    />,
  )
  return { onUpdate }
}

describe('WaveOptions retreat thresholds', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the unit-count retreat threshold in naval mode', () => {
    const { onUpdate } = renderOptions({}, true)

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '3' } })
    expect(onUpdate).toHaveBeenCalledWith({ retreatThreshold: 3 })
  })

  it('shows the probability-wins threshold in naval mode', () => {
    const { onUpdate } = renderOptions(
      { retreatMode: 'probabilityWins', retreatThreshold: 0, retreatPwinThreshold: 0 },
      true,
    )

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '0.25' } })
    expect(onUpdate).toHaveBeenCalledWith({ retreatPwinThreshold: 0.25 })
  })

  it('shows the expected-IPC-profit threshold in naval mode', () => {
    const { onUpdate } = renderOptions(
      {
        retreatMode: 'expectedIpcProfit',
        retreatThreshold: 0,
        retreatExpectedIpcProfitThreshold: 0,
      },
      true,
    )

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '2' } })
    expect(onUpdate).toHaveBeenCalledWith({ retreatExpectedIpcProfitThreshold: 2 })
  })

  it('does not offer the strafe or lose-air modes in naval mode', () => {
    renderOptions({}, true)

    expect(screen.queryByText('Probability of Killing Defenders >')).not.toBeInTheDocument()
    expect(screen.queryByText('Probability of Losing Air >')).not.toBeInTheDocument()
    expect(screen.getByText('Retreat if Number of Attacking Units ≤')).toBeInTheDocument()
  })

  it('still offers every retreat mode and the threshold in land mode', () => {
    renderOptions({}, false)

    expect(screen.getByText('Probability of Killing Defenders >')).toBeInTheDocument()
    expect(screen.getByText('Probability of Losing Air >')).toBeInTheDocument()
    // Takes Territory and the retreat threshold.
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2)
  })
})

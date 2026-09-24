import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App.tsx'
import { InputSummary } from './InputSummary.tsx'
import { DEFAULT_WAVE_CONFIG } from '../types.ts'

// Deterministic, fast complexity so evaluation only happens on the explicit
// button click (below the 200000 warning threshold, above the 10000 auto-eval).
vi.mock('aacalc2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('aacalc2')>()
  return {
    ...actual,
    multiwaveComplexityFastV2: () => 50000,
  }
})

function findSbrInputs(): HTMLInputElement[] {
  const card = Array.from(document.querySelectorAll('section.card')).find((section) =>
    section.querySelector('h3')?.textContent === 'Bombers'
  )
  expect(card).toBeDefined()
  return Array.from(
    (card as HTMLElement).querySelectorAll<HTMLInputElement>('input[type="number"]:not(:disabled)')
  )
}

describe('Input collapse on Evaluate Battle', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('collapses the input to a summary after Evaluate and expands again when clicked', async () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('SBR'))
    const inputs = findSbrInputs()
    fireEvent.change(inputs[0], { target: { value: '5' } }) // bombers
    fireEvent.change(inputs[1], { target: { value: '1' } }) // IC hit points

    // Not collapsed yet: the expandable input card is present.
    expect(screen.queryAllByText('Bombers').length).toBeGreaterThan(0)
    expect(screen.queryByText('Battle Input')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Evaluate Battle'))

    // Collapsed: compact summary replaces the input card, with no Edit button.
    await waitFor(() => {
      expect(screen.getByText('Battle Input')).toBeInTheDocument()
    })
    expect(screen.queryAllByText('Bombers')).toHaveLength(0)
    expect(screen.queryByText('Edit input')).not.toBeInTheDocument()

    // Re-expand by clicking the summary itself.
    fireEvent.click(screen.getByText('Battle Input'))
    expect(screen.queryAllByText('Bombers').length).toBeGreaterThan(0)
    expect(screen.queryByText('Battle Input')).not.toBeInTheDocument()
  })

  it('expands when clicking anywhere inside the summary', async () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('SBR'))
    const inputs = findSbrInputs()
    fireEvent.change(inputs[0], { target: { value: '5' } })
    fireEvent.change(inputs[1], { target: { value: '1' } })
    fireEvent.click(screen.getByText('Evaluate Battle'))
    await waitFor(() => {
      expect(screen.getByText('Battle Input')).toBeInTheDocument()
    })

    // A click on the OOL line (not the header) bubbles up and expands too.
    fireEvent.click(screen.getByText(/^OOL:/))

    await waitFor(() => {
      expect(screen.queryAllByText('Bombers').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('Battle Input')).not.toBeInTheDocument()
  })

  it('expands with the keyboard (Enter or Space)', async () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('SBR'))
    const inputs = findSbrInputs()
    fireEvent.change(inputs[0], { target: { value: '5' } })
    fireEvent.change(inputs[1], { target: { value: '1' } })
    fireEvent.click(screen.getByText('Evaluate Battle'))
    await waitFor(() => {
      expect(screen.getByText('Battle Input')).toBeInTheDocument()
    })

    const summary = screen.getByTitle('Click to edit the battle input')
    expect(summary).toHaveAttribute('role', 'button')
    fireEvent.keyDown(summary, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.queryAllByText('Bombers').length).toBeGreaterThan(0)
    })
  })

  it('re-expands the input when any input is edited', async () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('SBR'))
    const inputs = findSbrInputs()
    fireEvent.change(inputs[0], { target: { value: '3' } })
    fireEvent.change(inputs[1], { target: { value: '1' } })

    fireEvent.click(screen.getByText('Evaluate Battle'))
    await waitFor(() => {
      expect(screen.getByText('Battle Input')).toBeInTheDocument()
    })

    // The "Battle in progress" toggle lives outside the collapsed block, so it
    // is still editable. Editing it should re-expand the wave cards.
    fireEvent.click(screen.getByLabelText('Battle in progress'))

    await waitFor(() => {
      expect(screen.queryAllByText('Bombers').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('Battle Input')).not.toBeInTheDocument()
  })
})

describe('InputSummary order of loss', () => {
  afterEach(() => {
    cleanup()
  })

  it('abbreviates the OOL to one character per unit, with the full names as a tooltip', () => {
    render(
      <InputSummary
        mode="land"
        numWaves={1}
        diceMode="standard"
        amphibious={false}
        territoryValue={0}
        isDeadzone={false}
        inProgress={false}
        attack={{ 0: { inf: 5 } }}
        defense={{ 0: { inf: 5 } }}
        waveConfigs={{ 0: { ...DEFAULT_WAVE_CONFIG } }}
        onExpand={() => {}}
      />,
    )

    const ool = screen.getByText(/^OOL:/)
    expect(ool.textContent).toBe('OOL: iatfb vs ciatbf')
    expect(ool.getAttribute('title')).toContain('Attacker OOL: Inf - Art - Tnk - Fig - Bom')
    expect(ool.getAttribute('title')).toContain(
      'Defender OOL: AA - Inf - Art - Tnk - Bom - Fig',
    )
  })

  it('uses the amphibious attacker presets when amphibious', () => {
    render(
      <InputSummary
        mode="land"
        numWaves={1}
        diceMode="standard"
        amphibious={true}
        territoryValue={0}
        isDeadzone={false}
        inProgress={false}
        attack={{ 0: { inf: 5, inf_a: 2 } }}
        defense={{ 0: { inf: 5 } }}
        waveConfigs={{ 0: { ...DEFAULT_WAVE_CONFIG } }}
        onExpand={() => {}}
      />,
    )

    expect(screen.getByText(/^OOL:/).textContent).toBe('OOL: ijagtufb vs ciatbf')
  })
})

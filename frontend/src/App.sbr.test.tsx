import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App.tsx'

// Keep the SBR evaluation deterministic and fast: report a complexity that is
// below the "too complex" warning threshold (200000) but above the auto-eval
// threshold (10000), so evaluation only happens when we click the button.
vi.mock('aacalc2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('aacalc2')>()
  return {
    ...actual,
    multiwaveComplexityFastV2: () => 50000,
  }
})

function findSbrUnitInputs(): HTMLInputElement[] {
  const card = Array.from(document.querySelectorAll('section.card')).find((section) =>
    section.querySelector('h3')?.textContent === 'Bombers'
  )
  expect(card).toBeDefined()
  return Array.from(
    (card as HTMLElement).querySelectorAll<HTMLInputElement>('input[type="number"]:not(:disabled)')
  )
}

describe('SBR battle results', () => {
  afterEach(() => {
    cleanup()
  })

  it('reports the detailed attacker/defender casualty distributions', async () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('SBR'))

    // Set up a small raid: 5 bombers vs a 1 hit point industrial complex.
    const inputs = findSbrUnitInputs()
    expect(inputs).toHaveLength(2)
    fireEvent.change(inputs[0], { target: { value: '5' } }) // bombers
    fireEvent.change(inputs[1], { target: { value: '1' } }) // IC hit points

    fireEvent.click(screen.getByText('Evaluate Battle'))

    // The detailed casualty sections must be present for SBR results.
    expect(await screen.findByText('Attacker Detailed Casualties')).toBeInTheDocument()
    expect(screen.getByText('Defender Detailed Casualties')).toBeInTheDocument()

    // Expand both tables and make sure they contain real rows (not empty).
    fireEvent.click(screen.getByText('Attacker Detailed Casualties'))
    fireEvent.click(screen.getByText('Defender Detailed Casualties'))
    await waitFor(() => {
      expect(screen.getAllByText('Probability %').length).toBe(2)
    })
  })
})

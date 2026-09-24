import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App.tsx'
import type { HistoryEntry } from './types.ts'

// Keep evaluation deterministic and fast. The complexity the engine reports is
// mutable so a test can drop below the auto-eval threshold (10000) on purpose;
// by default it sits above it but below the warning threshold (200000), so
// battles only run when a button is clicked.
const mockEngine = vi.hoisted(() => ({ complexity: 50000 }))

vi.mock('aacalc2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('aacalc2')>()
  return {
    ...actual,
    multiwaveComplexityFastV2: () => mockEngine.complexity,
  }
})

function findSbrUnitInputs(): HTMLInputElement[] {
  const card = Array.from(document.querySelectorAll('section.card')).find(
    (section) => section.querySelector('h3')?.textContent === 'Bombers',
  )
  expect(card).toBeDefined()
  return Array.from(
    (card as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="number"]:not(:disabled)',
    ),
  )
}

function setUpSbrBattle(): void {
  fireEvent.click(screen.getByLabelText('SBR'))
  const inputs = findSbrUnitInputs()
  expect(inputs).toHaveLength(2)
  fireEvent.change(inputs[0], { target: { value: '5' } }) // bombers
  fireEvent.change(inputs[1], { target: { value: '1' } }) // IC hit points
}

function seedGroup(entries: Array<Pick<HistoryEntry, 'name'>>): void {
  localStorage.setItem(
    'battleHistory',
    JSON.stringify(
      entries.map(({ name }, idx) => ({
        group: 'Raid',
        name,
        timestamp: 1000 + idx,
        input: {
          attack: { 0: {} },
          defense: { 0: {} },
          retreatModes: {},
          mode: 'sbr',
          numWaves: 1,
        },
      })),
    ),
  )
}

beforeEach(() => {
  localStorage.clear()
  mockEngine.complexity = 50000
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('grouped history', () => {
  it('saves an entry under the group/name pair', async () => {
    render(<App />)
    setUpSbrBattle()

    fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'Moscow' } })
    fireEvent.change(screen.getByLabelText('Save As'), { target: { value: 'no retreat' } })
    fireEvent.click(screen.getByText('Evaluate Battle'))

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('battleHistory') ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0]).toMatchObject({ group: 'Moscow', name: 'no retreat' })
    })

    fireEvent.click(screen.getByText(/Show History/))
    expect(screen.getByTitle('Moscow').textContent).toContain('Moscow (1)')
    expect(screen.getByText('no retreat')).toBeInTheDocument()
  })

  it('does not write history during auto-evaluation', async () => {
    mockEngine.complexity = 5000 // below the auto-eval threshold, above zero

    render(<App />)
    setUpSbrBattle()
    fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'Germany' } })
    fireEvent.change(screen.getByLabelText('Save As'), { target: { value: 'auto' } })

    // Auto-eval fires after the 750ms debounce and renders results...
    await screen.findByText('Results', {}, { timeout: 3000 })

    // ...but it must leave history untouched.
    const stored = localStorage.getItem('battleHistory')
    expect(stored === null || stored === '[]').toBe(true)

    // Only the explicit Evaluate Battle click saves the entry.
    fireEvent.click(screen.getByText('Evaluate Battle'))
    await waitFor(() => {
      const entries = JSON.parse(localStorage.getItem('battleHistory') ?? '[]')
      expect(entries).toHaveLength(1)
      expect(entries[0]).toMatchObject({ group: 'Germany', name: 'auto' })
    })
  })

  it('migrates legacy id-keyed history into the Default group', async () => {
    localStorage.setItem(
      'battleHistory',
      JSON.stringify([
        {
          id: 'old battle',
          name: 'old battle',
          timestamp: 1,
          input: {
            attack: { 0: { inf: 3 } },
            defense: { 0: { inf: 2 } },
            retreatModes: {},
            mode: 'land',
            numWaves: 1,
          },
        },
      ]),
    )

    render(<App />)
    fireEvent.click(await screen.findByText('Show History (1)'))

    expect(screen.getByTitle('Default').textContent).toContain('Default (1)')
    expect(screen.getByText('old battle')).toBeInTheDocument()
  })

  it('batch-evaluates every saved setting in a group against the current armies', async () => {
    seedGroup([{ name: 'no retreat' }, { name: 'EV retreat' }])

    render(<App />)
    setUpSbrBattle()

    fireEvent.click(await screen.findByText('Show History (2)'))
    fireEvent.click(screen.getByText('Evaluate all'))

    const output = await waitFor(() => {
      const pre = document.querySelector('.batch-output')
      expect(pre).not.toBeNull()
      return pre as HTMLElement
    })

    const text = output.textContent ?? ''
    const lines = text.split('\n')
    expect(lines[0]).toContain('profit')
    expect(lines[0]).toContain('description')
    expect(lines).toHaveLength(3)
    expect(text).toContain('no retreat')
    expect(text).toContain('EV retreat')
    expect(screen.getByText(/Armies \(fixed\)/)).toBeInTheDocument()
  })
})

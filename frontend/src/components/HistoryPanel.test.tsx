import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HistoryPanel } from './HistoryPanel.tsx'
import type { BattleInput, HistoryEntry } from '../types.ts'

type HistoryPanelProps = React.ComponentProps<typeof HistoryPanel>

function makeEntry(group: string, name: string): HistoryEntry {
  const input: BattleInput = {
    attack: { 0: { inf: 1 } },
    defense: { 0: { inf: 1 } },
    retreatModes: {},
  }
  return { group, name, timestamp: 0, input }
}

function renderPanel(overrides: Partial<HistoryPanelProps> = {}) {
  const props: HistoryPanelProps = {
    history: [],
    collapsedGroups: {},
    onToggleGroup: vi.fn(),
    onSetAllCollapsed: vi.fn(),
    onLoad: vi.fn(),
    onDelete: vi.fn(),
    onRenameGroup: vi.fn(),
    onRemoveGroup: vi.fn(),
    onEvaluateGroup: vi.fn(),
    onCancelBatch: vi.fn(),
    onClearAll: vi.fn(),
    runningGroup: null,
    progress: null,
    ...overrides,
  }
  render(<HistoryPanel {...props} />)
  return props
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('HistoryPanel groups', () => {
  it('renders one section per group with its entry count', () => {
    renderPanel({
      history: [
        makeEntry('Source', 'variant a'),
        makeEntry('Source', 'variant b'),
        makeEntry('Other', 'only'),
      ],
    })

    expect(screen.getByTitle('Source').textContent).toContain('Source (2)')
    expect(screen.getByTitle('Other').textContent).toContain('Other (1)')
    expect(screen.getByText('variant a')).toBeInTheDocument()
    expect(screen.getByText('variant b')).toBeInTheDocument()
    expect(screen.getByText('only')).toBeInTheDocument()
  })

  it('toggles a group and hides its entries when collapsed', () => {
    const props = renderPanel({
      history: [makeEntry('Source', 'variant a')],
    })

    fireEvent.click(screen.getByTitle('Source'))
    expect(props.onToggleGroup).toHaveBeenCalledWith('Source')

    cleanup()
    renderPanel({
      history: [makeEntry('Source', 'variant a')],
      collapsedGroups: { Source: true },
    })
    expect(screen.queryByText('variant a')).not.toBeInTheDocument()
  })

  it('expands and collapses every group from the header', () => {
    const props = renderPanel({ history: [makeEntry('Source', 'variant a')] })

    fireEvent.click(screen.getByText('Expand All'))
    expect(props.onSetAllCollapsed).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByText('Collapse All'))
    expect(props.onSetAllCollapsed).toHaveBeenCalledWith(true)
  })

  it('loads and deletes entries by group and name', () => {
    const props = renderPanel({ history: [makeEntry('Source', 'variant a')] })

    fireEvent.click(screen.getByText('variant a'))
    expect(props.onLoad).toHaveBeenCalledWith(
      expect.objectContaining({ group: 'Source', name: 'variant a' }),
    )

    fireEvent.click(screen.getByText('✕'))
    expect(props.onDelete).toHaveBeenCalledWith('Source', 'variant a')
  })
})

describe('HistoryPanel group management', () => {
  it('removes a group after confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const props = renderPanel({
      history: [makeEntry('Source', 'a'), makeEntry('Source', 'b')],
    })

    fireEvent.click(screen.getByText('Remove'))
    expect(confirmSpy).toHaveBeenCalled()
    expect(props.onRemoveGroup).toHaveBeenCalledWith('Source')
  })

  it('keeps the group when removal is not confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const props = renderPanel({ history: [makeEntry('Source', 'a')] })

    fireEvent.click(screen.getByText('Remove'))
    expect(props.onRemoveGroup).not.toHaveBeenCalled()
  })

  it('renames a group on Enter', () => {
    const props = renderPanel({ history: [makeEntry('Source', 'a'), makeEntry('Other', 'b')] })

    fireEvent.click(screen.getAllByText('Rename')[0])
    const input = screen.getByLabelText('Group name')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(props.onRenameGroup).toHaveBeenCalledWith('Source', 'Renamed')
    expect(screen.queryByLabelText('Group name')).not.toBeInTheDocument()
  })

  it('cancels a rename on Escape', () => {
    const props = renderPanel({ history: [makeEntry('Source', 'a')] })

    fireEvent.click(screen.getByText('Rename'))
    const input = screen.getByLabelText('Group name')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(props.onRenameGroup).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Group name')).not.toBeInTheDocument()
  })

  it('ignores a blank rename', () => {
    const props = renderPanel({ history: [makeEntry('Source', 'a')] })

    fireEvent.click(screen.getByText('Rename'))
    const input = screen.getByLabelText('Group name')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(props.onRenameGroup).not.toHaveBeenCalled()
  })

  it('confirms before merging into an existing group', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const props = renderPanel({
      history: [makeEntry('Source', 'a'), makeEntry('Target', 'b')],
    })

    fireEvent.click(screen.getAllByText('Rename')[0])
    const input = screen.getByLabelText('Group name')
    fireEvent.change(input, { target: { value: 'Target' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(confirmSpy).toHaveBeenCalled()
    expect(props.onRenameGroup).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    fireEvent.click(screen.getAllByText('Rename')[0])
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Target' } })
    fireEvent.keyDown(screen.getByLabelText('Group name'), { key: 'Enter' })

    expect(props.onRenameGroup).toHaveBeenCalledWith('Source', 'Target')
  })
})

describe('HistoryPanel batch evaluation', () => {
  it('starts a batch for the clicked group', () => {
    const props = renderPanel({
      history: [makeEntry('Source', 'a'), makeEntry('Other', 'b')],
    })

    fireEvent.click(screen.getAllByText('Evaluate all')[0])
    expect(props.onEvaluateGroup).toHaveBeenCalledWith('Source')
  })

  it('disables batch actions and reports progress while running', () => {
    renderPanel({
      history: [makeEntry('Source', 'a'), makeEntry('Other', 'b')],
      runningGroup: 'Source',
      progress: { done: 1, total: 3 },
    })

    expect(screen.getByText('Evaluating 1/3…')).toBeInTheDocument()
    expect(screen.getByText('Evaluating…')).toBeDisabled()
    for (const button of screen.getAllByText('Evaluate all')) {
      expect(button).toBeDisabled()
    }
    for (const button of screen.getAllByText('Rename')) {
      expect(button).toBeDisabled()
    }
    for (const button of screen.getAllByText('Remove')) {
      expect(button).toBeDisabled()
    }
  })

  it('cancels a running batch from the progress row', () => {
    const props = renderPanel({
      history: [makeEntry('Source', 'a')],
      runningGroup: 'Source',
      progress: { done: 0, total: 2 },
    })

    fireEvent.click(screen.getByText('Cancel'))
    expect(props.onCancelBatch).toHaveBeenCalled()
  })
})

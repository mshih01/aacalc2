import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HistoryDrawer } from './HistoryDrawer.tsx';
import type { BattleInput, HistoryEntry } from '../../types.ts';

type HistoryDrawerProps = React.ComponentProps<typeof HistoryDrawer>;

function makeEntry(group: string, name: string): HistoryEntry {
  const input: BattleInput = {
    attack: { 0: { inf: 1 } },
    defense: { 0: { inf: 1 } },
    retreatModes: {},
  };
  return { group, name, timestamp: 0, input };
}

function renderDrawer(overrides: Partial<HistoryDrawerProps> = {}) {
  const props: HistoryDrawerProps = {
    history: [],
    search: '',
    onSearchChange: vi.fn(),
    collapsedGroups: {},
    onToggleGroup: vi.fn(),
    onSetAllCollapsed: vi.fn(),
    onLoad: vi.fn(),
    onDelete: vi.fn(),
    onRenameGroup: vi.fn(),
    onRemoveGroup: vi.fn(),
    onEvaluateGroup: vi.fn(),
    onCancelBatch: vi.fn(),
    runningGroup: null,
    progress: null,
    showDetails: false,
    hideUnnamed: true,
    sortOrder: 'title',
    canEvaluate: true,
    ...overrides,
  };
  render(<HistoryDrawer {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HistoryDrawer groups', () => {
  it('renders one section per group with its entry count', () => {
    renderDrawer({
      history: [
        makeEntry('Source', 'variant a'),
        makeEntry('Source', 'variant b'),
        makeEntry('Other', 'only'),
      ],
    });

    expect(screen.getByTitle('Source (2)')).toBeInTheDocument();
    expect(screen.getByTitle('Other (1)')).toBeInTheDocument();
    expect(screen.getByText('variant a')).toBeInTheDocument();
    expect(screen.getByText('variant b')).toBeInTheDocument();
    expect(screen.getByText('only')).toBeInTheDocument();
  });

  it('toggles a group and hides its entries when collapsed', () => {
    const props = renderDrawer({
      history: [makeEntry('Source', 'variant a')],
    });

    fireEvent.click(screen.getByTitle('Source (1)'));
    expect(props.onToggleGroup).toHaveBeenCalledWith('Source');

    cleanup();
    renderDrawer({
      history: [makeEntry('Source', 'variant a')],
      collapsedGroups: { Source: true },
    });
    expect(screen.queryByText('variant a')).not.toBeInTheDocument();
  });

  it('expands and collapses every group from the toolbar', () => {
    const props = renderDrawer({ history: [makeEntry('Source', 'variant a')] });

    fireEvent.click(screen.getByText('Expand all'));
    expect(props.onSetAllCollapsed).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByText('Collapse all'));
    expect(props.onSetAllCollapsed).toHaveBeenCalledWith(true);
  });

  it('loads and deletes entries by group and name', () => {
    const props = renderDrawer({ history: [makeEntry('Source', 'variant a')] });

    fireEvent.click(screen.getByText('variant a'));
    expect(props.onLoad).toHaveBeenCalledWith(
      expect.objectContaining({ group: 'Source', name: 'variant a' }),
    );

    fireEvent.click(screen.getByLabelText('Delete variant a'));
    expect(props.onDelete).toHaveBeenCalledWith('Source', 'variant a');
  });

  it('filters entries by name and group', () => {
    renderDrawer({
      history: [makeEntry('Moscow', 'variant a'), makeEntry('Other', 'variant b')],
      search: 'moscow',
    });

    expect(screen.getByText('variant a')).toBeInTheDocument();
    expect(screen.queryByText('variant b')).not.toBeInTheDocument();
    expect(screen.getByTitle('Moscow (1)')).toBeInTheDocument();
  });
});

describe('HistoryDrawer group management', () => {
  it('removes a group after confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const props = renderDrawer({
      history: [makeEntry('Source', 'a'), makeEntry('Source', 'b')],
    });

    fireEvent.click(screen.getByLabelText('Remove group Source'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(props.onRemoveGroup).toHaveBeenCalledWith('Source');
  });

  it('keeps the group when removal is not confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const props = renderDrawer({ history: [makeEntry('Source', 'a')] });

    fireEvent.click(screen.getByLabelText('Remove group Source'));
    expect(props.onRemoveGroup).not.toHaveBeenCalled();
  });

  it('renames a group on Enter', () => {
    const props = renderDrawer({
      history: [makeEntry('Source', 'a'), makeEntry('Other', 'b')],
    });

    fireEvent.click(screen.getByLabelText('Rename group Source'));
    const input = screen.getByLabelText('Group name');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(props.onRenameGroup).toHaveBeenCalledWith('Source', 'Renamed');
    expect(screen.queryByLabelText('Group name')).not.toBeInTheDocument();
  });

  it('cancels a rename on Escape', () => {
    const props = renderDrawer({ history: [makeEntry('Source', 'a')] });

    fireEvent.click(screen.getByLabelText('Rename group Source'));
    const input = screen.getByLabelText('Group name');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(props.onRenameGroup).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Group name')).not.toBeInTheDocument();
  });

  it('confirms before merging into an existing group', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const props = renderDrawer({
      history: [makeEntry('Source', 'a'), makeEntry('Target', 'b')],
    });

    fireEvent.click(screen.getByLabelText('Rename group Source'));
    const input = screen.getByLabelText('Group name');
    fireEvent.change(input, { target: { value: 'Target' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(confirmSpy).toHaveBeenCalled();
    expect(props.onRenameGroup).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByLabelText('Rename group Source'));
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Target' } });
    fireEvent.keyDown(screen.getByLabelText('Group name'), { key: 'Enter' });

    expect(props.onRenameGroup).toHaveBeenCalledWith('Source', 'Target');
  });
});

describe('HistoryDrawer batch evaluation', () => {
  it('starts a batch for the clicked group', () => {
    const props = renderDrawer({
      history: [makeEntry('Source', 'a'), makeEntry('Other', 'b')],
    });

    fireEvent.click(screen.getByLabelText('Evaluate group Source'));
    expect(props.onEvaluateGroup).toHaveBeenCalledWith('Source');
  });

  it('hides batch actions when evaluation is unavailable', () => {
    renderDrawer({
      history: [makeEntry('Source', 'a')],
      canEvaluate: false,
    });

    expect(screen.queryByLabelText('Evaluate group Source')).not.toBeInTheDocument();
  });

  it('disables group actions and reports progress while running', () => {
    renderDrawer({
      history: [makeEntry('Source', 'a'), makeEntry('Other', 'b')],
      runningGroup: 'Source',
      progress: { done: 1, total: 3 },
    });

    expect(screen.getByText('Evaluating 1/3…')).toBeInTheDocument();
    expect(screen.getByLabelText('Evaluate group Source')).toBeDisabled();
    expect(screen.getByLabelText('Rename group Source')).toBeDisabled();
    expect(screen.getByLabelText('Remove group Source')).toBeDisabled();
  });

  it('cancels a running batch from the progress row', () => {
    const props = renderDrawer({
      history: [makeEntry('Source', 'a')],
      runningGroup: 'Source',
      progress: { done: 0, total: 2 },
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(props.onCancelBatch).toHaveBeenCalled();
  });
});

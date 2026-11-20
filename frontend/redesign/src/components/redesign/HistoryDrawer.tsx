import { useMemo, useRef, useState } from 'react';
import type { HistoryEntry } from '../../types.ts';
import { groupHistory, historyEntryKey } from '../../utils/history.ts';
import { Icon } from './Icon.tsx';

interface HistoryDrawerProps {
  history: HistoryEntry[];
  search: string;
  onSearchChange: (value: string) => void;
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (group: string) => void;
  onSetAllCollapsed: (collapsed: boolean) => void;
  onLoad: (entry: HistoryEntry) => void;
  onDelete: (group: string, name: string) => void;
  onRenameGroup: (from: string, to: string) => void;
  onRemoveGroup: (group: string) => void;
  onEvaluateGroup: (group: string) => void;
  onCancelBatch: () => void;
  /** Group currently being batch-evaluated, if any. */
  runningGroup: string | null;
  /** Batch progress for `runningGroup`. */
  progress: { done: number; total: number } | null;
  showDetails: boolean;
  hideUnnamed: boolean;
  sortOrder: 'title' | 'date';
  canEvaluate: boolean;
}

export function HistoryDrawer({
  history,
  search,
  onSearchChange,
  collapsedGroups,
  onToggleGroup,
  onSetAllCollapsed,
  onLoad,
  onDelete,
  onRenameGroup,
  onRemoveGroup,
  onEvaluateGroup,
  onCancelBatch,
  runningGroup,
  progress,
  showDetails,
  hideUnnamed,
  sortOrder,
  canEvaluate,
}: HistoryDrawerProps) {
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const skipCommitRef = useRef(false);

  const allGroups = useMemo(() => groupHistory(history), [history]);

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = history.filter((entry) => {
      if (hideUnnamed && !entry.name.trim()) return false;
      if (!needle) return true;
      return (
        entry.name.toLowerCase().includes(needle) || entry.group.toLowerCase().includes(needle)
      );
    });

    return groupHistory(filtered).map((group) => ({
      ...group,
      entries: [...group.entries].sort((a, b) =>
        sortOrder === 'date' ? b.timestamp - a.timestamp : a.name.localeCompare(b.name),
      ),
    }));
  }, [history, hideUnnamed, search, sortOrder]);

  const visibleCount = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const batchBusy = runningGroup !== null;

  const startRename = (group: string) => {
    skipCommitRef.current = false;
    setDraftName(group);
    setEditingGroup(group);
  };

  const commitRename = () => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      setEditingGroup(null);
      return;
    }

    const from = editingGroup;
    if (!from) return;

    const to = draftName.trim();
    if (!to || to === from) {
      setEditingGroup(null);
      return;
    }

    const existing = allGroups.find((group) => group.group === to);
    if (existing) {
      const fromCount = allGroups.find((group) => group.group === from)?.entries.length ?? 0;
      const ok = window.confirm(
        `Group "${to}" already exists. Merge ${fromCount} ${
          fromCount === 1 ? 'entry' : 'entries'
        } from "${from}" into it?`,
      );
      if (!ok) {
        setEditingGroup(null);
        return;
      }
    }

    onRenameGroup(from, to);
    setEditingGroup(null);
  };

  const handleRemoveGroup = (group: string, count: number) => {
    const ok = window.confirm(
      `Remove group "${group}" and its ${count} ${count === 1 ? 'entry' : 'entries'}?`,
    );
    if (ok) onRemoveGroup(group);
  };

  return (
    <>
      <div className="history-search">
        <div className="search-field">
          <Icon name="search" />
          <input
            value={search}
            placeholder="Search"
            aria-label="Search history"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="history-toolbar">
        <span className="history-toolbar__count">
          {visibleCount} {visibleCount === 1 ? 'setting' : 'settings'}
        </span>
        <div className="history-toolbar__actions">
          <button
            type="button"
            className="history-toolbar__button"
            onClick={() => onSetAllCollapsed(false)}
          >
            Expand all
          </button>
          <button
            type="button"
            className="history-toolbar__button"
            onClick={() => onSetAllCollapsed(true)}
          >
            Collapse all
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="history-empty">
          {history.length === 0 ? 'No saved battles yet.' : 'No saved settings match this search.'}
        </div>
      ) : (
        <div className="history-groups">
          {groups.map(({ group, entries }) => {
            const collapsed = collapsedGroups[group] ?? false;
            const isRunning = runningGroup === group;
            const isEditing = editingGroup === group;

            return (
              <section className="history-group" key={group}>
                <div className="history-group__header">
                  {isEditing ? (
                    <input
                      className="history-group__rename"
                      type="text"
                      value={draftName}
                      autoFocus
                      maxLength={50}
                      aria-label="Group name"
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitRename();
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          skipCommitRef.current = true;
                          setEditingGroup(null);
                        }
                      }}
                      onBlur={commitRename}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        className="history-group__toggle"
                        onClick={() => onToggleGroup(group)}
                        aria-expanded={!collapsed}
                        title={`${group} (${entries.length})`}
                      >
                        <Icon
                          name="chevron"
                          size={18}
                          className={`history-group__chevron${
                            collapsed ? ' history-group__chevron--collapsed' : ''
                          }`}
                        />
                        <span className="history-group__name">{group}</span>
                        <span className="history-group__count">({entries.length})</span>
                      </button>
                      <div className="history-group__actions">
                        {canEvaluate ? (
                          <button
                            type="button"
                            className="history-group__action"
                            disabled={batchBusy}
                            onClick={() => onEvaluateGroup(group)}
                            aria-label={`Evaluate group ${group}`}
                            title="Re-evaluate every saved setting in this group against the current armies"
                          >
                            <Icon name="play" size={18} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="history-group__action"
                          disabled={batchBusy}
                          onClick={() => startRename(group)}
                          aria-label={`Rename group ${group}`}
                          title="Rename group"
                        >
                          <Icon name="edit" size={17} />
                        </button>
                        <button
                          type="button"
                          className="history-group__action"
                          disabled={batchBusy}
                          onClick={() => handleRemoveGroup(group, entries.length)}
                          aria-label={`Remove group ${group}`}
                          title="Remove group"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {isRunning && progress ? (
                  <div className="history-group__progress" role="status" aria-live="polite">
                    <span>
                      Evaluating {progress.done}/{progress.total}…
                    </span>
                    <button
                      type="button"
                      className="history-toolbar__button history-toolbar__button--danger"
                      onClick={onCancelBatch}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}

                {!collapsed
                  ? entries.map((entry) => (
                      <div className="history-entry" key={historyEntryKey(entry)}>
                        <button
                          type="button"
                          className="history-entry__main"
                          onClick={() => onLoad(entry)}
                        >
                          <span className="history-entry__name">{entry.name}</span>
                          {showDetails ? (
                            <span className="history-entry__meta">
                              {entry.input.mode ?? 'land'} · {entry.input.numWaves ?? 1} wave
                              {(entry.input.numWaves ?? 1) === 1 ? '' : 's'} ·{' '}
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className="icon-button history-entry__delete"
                          onClick={() => onDelete(entry.group, entry.name)}
                          aria-label={`Delete ${entry.name}`}
                          title="Delete"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    ))
                  : null}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

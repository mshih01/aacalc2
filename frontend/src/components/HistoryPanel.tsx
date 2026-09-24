import { useRef, useState } from 'react'
import type { HistoryEntry } from '../types.ts'
import { groupHistory, historyEntryKey } from '../utils/history.ts'

interface HistoryPanelProps {
  history: HistoryEntry[]
  collapsedGroups: Record<string, boolean>
  onToggleGroup: (group: string) => void
  onSetAllCollapsed: (collapsed: boolean) => void
  onLoad: (entry: HistoryEntry) => void
  onDelete: (group: string, name: string) => void
  onRenameGroup: (from: string, to: string) => void
  onRemoveGroup: (group: string) => void
  onEvaluateGroup: (group: string) => void
  onCancelBatch: () => void
  onClearAll: () => void
  /** Group currently being batch-evaluated, if any. */
  runningGroup: string | null
  /** Batch progress for `runningGroup`. */
  progress: { done: number; total: number } | null
}

const SMALL_BTN_STYLE: React.CSSProperties = {
  fontSize: '10px',
  padding: '3px 6px',
  backgroundColor: '#ddd',
  color: '#333',
  borderRadius: '3px',
  whiteSpace: 'nowrap',
}

const GROUP_HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '8px 10px',
  backgroundColor: '#ececec',
  borderTop: '1px solid #ddd',
  borderBottom: '1px solid #ddd',
}

export function HistoryPanel({
  history,
  collapsedGroups,
  onToggleGroup,
  onSetAllCollapsed,
  onLoad,
  onDelete,
  onRenameGroup,
  onRemoveGroup,
  onEvaluateGroup,
  onCancelBatch,
  onClearAll,
  runningGroup,
  progress,
}: HistoryPanelProps) {
  const groups = groupHistory(history)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const skipCommitRef = useRef(false)

  const batchBusy = runningGroup !== null

  const startRename = (group: string) => {
    skipCommitRef.current = false
    setDraftName(group)
    setEditingGroup(group)
  }

  const commitRename = () => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false
      setEditingGroup(null)
      return
    }

    const from = editingGroup
    if (!from) return

    const to = draftName.trim()
    if (!to || to === from) {
      setEditingGroup(null)
      return
    }

    const existing = groups.find((g) => g.group === to)
    if (existing) {
      const fromCount = groups.find((g) => g.group === from)?.entries.length ?? 0
      const ok = window.confirm(
        `Group "${to}" already exists. Merge ${fromCount} ${
          fromCount === 1 ? 'entry' : 'entries'
        } from "${from}" into it?`,
      )
      if (!ok) {
        setEditingGroup(null)
        return
      }
    }

    onRenameGroup(from, to)
    setEditingGroup(null)
  }

  const handleRemoveGroup = (group: string, count: number) => {
    const ok = window.confirm(
      `Remove group "${group}" and its ${count} ${count === 1 ? 'entry' : 'entries'}?`,
    )
    if (ok) onRemoveGroup(group)
  }

  return (
    <div
      style={{
        width: '300px',
        borderLeft: '1px solid #ddd',
        backgroundColor: '#f9f9f9',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid #ddd', backgroundColor: '#f0f0f0' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
          History ({history.length})
        </h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onClearAll} className="btn" style={SMALL_BTN_STYLE}>
            Clear All
          </button>
          <button onClick={() => onSetAllCollapsed(false)} className="btn" style={SMALL_BTN_STYLE}>
            Expand All
          </button>
          <button onClick={() => onSetAllCollapsed(true)} className="btn" style={SMALL_BTN_STYLE}>
            Collapse All
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {groups.length === 0 ? (
          <div className="info-box" style={{ fontSize: '12px' }}>
            No history yet
          </div>
        ) : (
          groups.map(({ group, entries }) => {
            const collapsed = collapsedGroups[group] ?? false
            const isRunning = runningGroup === group
            const isEditing = editingGroup === group

            return (
              <div key={group}>
                <div style={GROUP_HEADER_STYLE}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={draftName}
                      autoFocus
                      maxLength={50}
                      aria-label="Group name"
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          commitRename()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          skipCommitRef.current = true
                          setEditingGroup(null)
                        }
                      }}
                      onBlur={commitRename}
                      style={{
                        flex: 1,
                        fontSize: '13px',
                        padding: '2px 4px',
                        minWidth: 0,
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => onToggleGroup(group)}
                      style={{
                        flex: 1,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                      }}
                      title={group}
                    >
                      <span style={{ fontSize: '10px', color: '#666' }}>
                        {collapsed ? '▶' : '▼'}
                      </span>{' '}
                      {group} ({entries.length})
                    </div>
                  )}
                  <button
                    className="btn"
                    style={SMALL_BTN_STYLE}
                    disabled={batchBusy}
                    onClick={() => onEvaluateGroup(group)}
                    title="Re-evaluate every settings variant in this group against the current armies"
                  >
                    {isRunning ? 'Evaluating…' : 'Evaluate all'}
                  </button>
                  <button
                    className="btn"
                    style={SMALL_BTN_STYLE}
                    disabled={batchBusy || isEditing}
                    onClick={() => startRename(group)}
                  >
                    Rename
                  </button>
                  <button
                    className="btn"
                    style={SMALL_BTN_STYLE}
                    disabled={batchBusy}
                    onClick={() => handleRemoveGroup(group, entries.length)}
                  >
                    Remove
                  </button>
                </div>

                {isRunning && progress && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#0f766e',
                      padding: '4px 10px',
                      backgroundColor: '#effcf9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <span>
                      Evaluating {progress.done}/{progress.total}…
                    </span>
                    <button className="btn btn-red" style={SMALL_BTN_STYLE} onClick={onCancelBatch}>
                      Cancel
                    </button>
                  </div>
                )}

                {!collapsed &&
                  entries.map((entry) => (
                    <div
                      key={historyEntryKey(entry)}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #eee',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e9e9e9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div
                        onClick={() => onLoad(entry)}
                        style={{
                          flex: 1,
                          color: '#0066cc',
                          cursor: 'pointer',
                          fontWeight: '500',
                        }}
                      >
                        {entry.name}
                      </div>
                      <button
                        onClick={() => onDelete(entry.group, entry.name)}
                        className="btn"
                        style={{
                          padding: '2px 6px',
                          backgroundColor: 'transparent',
                          color: '#cc0000',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          minWidth: '24px',
                          textAlign: 'center',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

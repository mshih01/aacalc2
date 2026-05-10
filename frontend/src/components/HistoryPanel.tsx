import type { HistoryEntry } from '../types.ts'

interface HistoryPanelProps {
  history: HistoryEntry[]
  onLoad: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export function HistoryPanel({ history, onLoad, onDelete, onClearAll }: HistoryPanelProps) {
  return (
    <div style={{
      width: '300px',
      borderLeft: '1px solid #ddd',
      backgroundColor: '#f9f9f9',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #ddd', backgroundColor: '#f0f0f0' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>History ({history.length})</h3>
        <button onClick={onClearAll} className="btn" style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#ddd', color: '#333', borderRadius: '3px' }}>
          Clear All
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {history.length === 0 ? (
          <div className="info-box" style={{ fontSize: '12px' }}>No history yet</div>
        ) : (
          history.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #eee',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
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
                  fontWeight: '500'
                }}
              >
                {entry.name}
              </div>
              <button onClick={() => onDelete(entry.id)} className="btn" style={{ padding: '2px 6px', backgroundColor: 'transparent', color: '#cc0000', fontSize: '16px', fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

interface ResetButtonsProps {
  onResetAll: () => void
  onResetUnits: () => void
}

const buttonStyle = {
  padding: '8px 12px',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '600' as const,
  whiteSpace: 'nowrap' as const,
}

export function ResetButtons({ onResetAll, onResetUnits }: ResetButtonsProps) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
      <button
        onClick={onResetAll}
        style={{ ...buttonStyle, backgroundColor: '#666' }}
      >
        Reset All
      </button>
      <button
        onClick={onResetUnits}
        style={{ ...buttonStyle, backgroundColor: '#999' }}
      >
        Reset Units
      </button>
    </div>
  )
}

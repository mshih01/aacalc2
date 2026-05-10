interface ResetButtonsProps {
  onResetAll: () => void
  onResetUnits: () => void
}

export function ResetButtons({ onResetAll, onResetUnits }: ResetButtonsProps) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
      <button onClick={onResetAll} className="btn" style={{ backgroundColor: '#666', color: 'white' }}>
        Reset All
      </button>
      <button onClick={onResetUnits} className="btn" style={{ backgroundColor: '#999', color: 'white' }}>
        Reset Units
      </button>
    </div>
  )
}

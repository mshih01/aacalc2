import { useState } from 'react'

interface CollapsibleSubsectionProps {
  title: string
  color: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function CollapsibleSubsection({ title, color, children, defaultOpen = true }: CollapsibleSubsectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={{ marginBottom: '30px' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
      >
        <h4 style={{ margin: 0, color, fontSize: '14px', fontWeight: '600' }}>{title}</h4>
        <span
          style={{
            fontSize: '12px',
            color: '#999',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </div>
      {isOpen && <div style={{ marginTop: '15px' }}>{children}</div>}
    </div>
  )
}

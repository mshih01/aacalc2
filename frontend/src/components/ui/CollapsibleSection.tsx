import { useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  headerColor?: string
}

export function CollapsibleSection({ title, children, defaultOpen = false, headerColor = '#1976d2' }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={{ marginTop: '30px' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: headerColor,
          color: 'white',
          padding: '12px 15px',
          borderRadius: '4px',
          marginTop: 0,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{title}</h3>
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            fontSize: '18px',
            lineHeight: '1',
          }}
        >
          ▼
        </span>
      </div>
      {isOpen && <div style={{ marginTop: '15px' }}>{children}</div>}
    </div>
  )
}

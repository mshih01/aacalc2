import { useState, useEffect } from 'react'

interface ToastProps {
  message: string
  duration?: number
}

export function Toast({ message, duration = 2000 }: ToastProps) {
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(0)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#323232',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '4px',
        boxShadow: '0 3px 5px -1px rgba(0,0,0,0.3)',
        opacity,
        transition: 'opacity 0.3s ease',
        zIndex: 9999,
        fontSize: '14px',
      }}
    >
      {message}
    </div>
  )
}

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App.tsx'

describe('App', () => {
  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('aa1942calc2 frontend demo')).toBeInTheDocument()
  })

  it('renders battle mode selector', () => {
    render(<App />)
    expect(screen.getByText('Battle Mode:')).toBeInTheDocument()
    expect(screen.getByLabelText('Land')).toBeInTheDocument()
    expect(screen.getByLabelText('Sea')).toBeInTheDocument()
    expect(screen.getByLabelText('SBR')).toBeInTheDocument()
  })

  it('renders the Evaluate Battle button', () => {
    render(<App />)
    expect(screen.getByText('Evaluate Battle')).toBeInTheDocument()
  })

  it('renders GitHub link', () => {
    render(<App />)
    const link = screen.getByText('GitHub Repository')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://github.com/mshih01/aacalc2')
  })
})

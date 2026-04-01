import React from 'react'
import { calculateUnitSummary, type UnitSummary } from '../constants'

interface UnitSummaryDisplayProps {
  title: string // "Attacker" or "Defender"
  unitString: string
  isAttacker: boolean
  isLandMode: boolean
}

export function UnitSummaryDisplay({ title, unitString, isAttacker, isLandMode }: UnitSummaryDisplayProps) {
  const summary = calculateUnitSummary(unitString, isAttacker, isLandMode)

  return (
    <div style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>
      {title} units ({summary.unitCount}): {summary.cost} IPC | {summary.hitPoints} HP | {summary.power} Power
    </div>
  )
}

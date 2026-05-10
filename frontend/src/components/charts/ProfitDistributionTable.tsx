import { getPercentileColor } from '../../utils/format.ts'
import type { ProfitDistEntry } from '../../types.ts'

interface ProfitDistributionTableProps {
  waveIndex: number
  profitDist: Record<string, ProfitDistEntry> | undefined
  decimalPlaces: number
}

export function ProfitDistributionTable({ waveIndex, profitDist, decimalPlaces }: ProfitDistributionTableProps) {
  if (!profitDist || Object.keys(profitDist).length === 0) {
    return <div className="info-box">No profit distribution data available</div>
  }

  const sortedEntries = Object.entries(profitDist)
    .sort(([ipcStrA], [ipcStrB]) => {
      const ipcA = parseFloat(ipcStrA);
      const ipcB = parseFloat(ipcStrB);
      return ipcA - ipcB;
    })
  const totalProb = sortedEntries.reduce((sum, [_, info]) => sum + (info.prob || 0), 0)
  const percentiles = [5, 32, 50, 68, 95]

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Probability %</th>
          <th>Confidence %</th>
          <th>Reverse Confidence %</th>
          <th>IPC Profit</th>
        </tr>
      </thead>
      <tbody>
        {sortedEntries.map(([ipcStr, profitInfo], idx) => {
          const probValue = profitInfo.prob || 0
          const cumulativeProb = sortedEntries
            .slice(0, idx + 1)
            .reduce((sum, [_, info]) => sum + info.prob, 0) * 100
          const reverseProb = sortedEntries
            .slice(idx)
            .reduce((sum, [_, info]) => sum + info.prob, 0) * 100

          const percentageProb = (cumulativeProb / (totalProb * 100)) * 100
          const prevPercentage = idx > 0
            ? (sortedEntries.slice(0, idx).reduce((sum, [_, info]) => sum + info.prob, 0) / totalProb) * 100
            : 0
          const percentile = percentiles.find(p => prevPercentage < p && percentageProb >= p)
          const colors = percentile ? getPercentileColor(percentile) : { bg: 'transparent', border: 'transparent' }

          const ipcValue = profitInfo.ipc ?? 0
          return (
            <tr
              key={`profit-w${waveIndex}-${ipcStr}-${idx}`}
              style={{
                borderBottom: '1px solid #eee',
                backgroundColor: colors.bg,
                borderLeft: percentile ? `4px solid ${colors.border}` : 'none'
              }}
            >
              <td>{(probValue * 100).toFixed(decimalPlaces)}%</td>
              <td>{cumulativeProb.toFixed(decimalPlaces)}%</td>
              <td>{reverseProb.toFixed(decimalPlaces)}%</td>
              <td style={{ fontWeight: 500, color: ipcValue >= 0 ? '#2e7d32' : '#d32f2f' }}>
                {ipcValue.toFixed(1)} {percentile && `📊 ${percentile}%`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  )
}

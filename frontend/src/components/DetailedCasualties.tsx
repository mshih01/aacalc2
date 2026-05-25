import { getPercentileColor } from '../utils/format.ts'

interface CasualtyEntry {
  amount: number
  ipcLoss: number
  survivors: string
  retreaters: string
  casualties: string
}

interface DetailedCasualtiesProps {
  side: 'attack' | 'defense'
  waveIndex: number
  casualtiesData: Record<string, CasualtyEntry> | undefined
  decimalPlaces: number
}

export function DetailedCasualties({ side, waveIndex, casualtiesData, decimalPlaces }: DetailedCasualtiesProps) {
  if (!casualtiesData || Object.keys(casualtiesData).length === 0) {
    return <div className="info-box">No casualty data available</div>
  }

  const sortedEntries = Object.entries(casualtiesData)
    .sort(([_, infoA], [__, infoB]) => infoA.ipcLoss - infoB.ipcLoss)
  const totalProb = sortedEntries.reduce((sum, [_, casualty]) => sum + casualty.amount, 0)
  const percentiles = [5, 32, 50, 68, 95]

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Probability %</th>
          <th>Confidence %</th>
          <th>Reverse Confidence %</th>
          <th>Surviving</th>
          <th>Retreating</th>
          <th>Casualties</th>
          <th>IPC</th>
        </tr>
      </thead>
      <tbody>
        {sortedEntries.map(([outcome, info], idx) => {
          const cumulativeProb = sortedEntries
            .slice(0, idx + 1)
            .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100
          const reverseProb = sortedEntries
            .slice(idx)
            .reduce((sum, [_, casualty]) => sum + casualty.amount, 0) * 100

          const percentageProb = (cumulativeProb / (totalProb * 100)) * 100
          const prevPercentage = idx > 0
            ? (sortedEntries.slice(0, idx).reduce((sum, [_, casualty]) => sum + casualty.amount, 0) / totalProb) * 100
            : 0
          const percentile = percentiles.find(p => prevPercentage < p && percentageProb >= p)
          const colors = percentile ? getPercentileColor(percentile) : { bg: 'transparent', border: 'transparent' }

          return (
            <tr
              key={`${side === 'attack' ? 'att' : 'def'}-w${waveIndex}-${outcome}-${idx}`}
              style={{
                borderBottom: '1px solid #eee',
                backgroundColor: colors.bg,
                borderLeft: percentile ? `4px solid ${colors.border}` : 'none'
              }}
            >
              <td>{(info.amount * 100).toFixed(decimalPlaces)}%</td>
              <td>{cumulativeProb.toFixed(decimalPlaces)}%</td>
              <td>{reverseProb.toFixed(decimalPlaces)}%</td>
              <td>{info.survivors}</td>
              <td>{info.retreaters}</td>
              <td>{info.casualties}</td>
              <td style={{ color: '#d32f2f', fontWeight: 500 }}>
                {info.ipcLoss.toFixed(1)} {percentile && `📊 ${percentile}%`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  )
}

import { getPercentileColor } from '../utils/format.ts'

interface CasualtyEntry {
  amount: number
  ipcLoss: number
  survivors: string
  retreaters?: string
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
    return <div style={{ padding: '12px', color: '#999' }}>No casualty data available</div>
  }

  const sortedEntries = Object.entries(casualtiesData)
    .sort(([_, infoA], [__, infoB]) => infoA.ipcLoss - infoB.ipcLoss)
  const totalProb = sortedEntries.reduce((sum, [_, casualty]) => sum + casualty.amount, 0)
  const percentiles = [5, 32, 50, 68, 95]

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
      <thead>
        <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
          <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Probability %</th>
          <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Confidence %</th>
          <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Reverse Confidence %</th>
          <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Surviving</th>
          {side === 'attack' && (
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Retreating</th>
          )}
          <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Casualties</th>
          <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>IPC</th>
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
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{(info.amount * 100).toFixed(decimalPlaces)}%</td>
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{cumulativeProb.toFixed(decimalPlaces)}%</td>
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{reverseProb.toFixed(decimalPlaces)}%</td>
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.survivors}</td>
              {side === 'attack' && (
                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.retreaters}</td>
              )}
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left' }}>{info.casualties}</td>
              <td style={{ padding: '12px', fontSize: '13px', textAlign: 'left', color: '#d32f2f', fontWeight: '500' }}>
                {info.ipcLoss.toFixed(1)} {percentile && `📊 ${percentile}%`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  )
}

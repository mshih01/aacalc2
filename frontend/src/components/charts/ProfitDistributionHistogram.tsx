import { useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ProfitDistEntry } from '../../types.ts'

interface ProfitDistributionHistogramProps {
  waveIndex: number
  profitDist: Record<string, ProfitDistEntry> | undefined
  decimalPlaces: number
  histogramZoom: number
  setHistogramZoom: (zoom: number) => void
}

export function ProfitDistributionHistogram({
  waveIndex,
  profitDist,
  decimalPlaces,
  histogramZoom,
  setHistogramZoom,
}: ProfitDistributionHistogramProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!profitDist || Object.keys(profitDist).length === 0) {
    return <div style={{ padding: '12px', color: '#999' }}>No profit distribution data available</div>
  }

  const binned = Object.entries(profitDist)
    .reduce((bins: Record<number, number>, [ipcStr, profitInfo]) => {
      const ipc = parseFloat(ipcStr);
      const binSize = 3;
      const binKey = Math.floor(ipc / binSize) * binSize;
      bins[binKey] = (bins[binKey] || 0) + profitInfo.prob * 100;
      return bins;
    }, {})

  const sorted = Object.entries(binned)
    .sort(([aKey], [bKey]) => parseInt(aKey) - parseInt(bKey))
    .map(([binKey, prob]) => ({
      ipc: parseInt(binKey),
      ipcRange: `${binKey}-${parseInt(binKey) + 2}`,
      probability: prob,
    }))

  const totalProb = sorted.reduce((sum, item) => sum + item.probability, 0)
  const percentiles = [5, 32, 50, 68, 95]
  let cumulativeLeft = 0

  const chartData = sorted.map((item) => {
    cumulativeLeft += item.probability
    const cumulativeRight = totalProb - cumulativeLeft + item.probability

    const percentileAt = percentiles.find(p => {
      const prevCum = cumulativeLeft - item.probability
      return prevCum < p && cumulativeLeft >= p
    })

    return {
      ...item,
      cumulativeLeft,
      cumulativeRight,
      percentileAt,
    }
  })

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ fontSize: '14px', margin: 0, color: '#333' }}>IPC Profit Distribution Chart</h4>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setHistogramZoom(Math.max(1, histogramZoom - 0.2))}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            − Zoom Out
          </button>
          <span style={{ fontSize: '12px', color: '#666', minWidth: '50px', textAlign: 'center' }}>
            {(histogramZoom * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setHistogramZoom(Math.min(3, histogramZoom + 0.2))}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Zoom In +
          </button>
          <button
            onClick={() => {
              setHistogramZoom(1)
              if (scrollRef.current) {
                scrollRef.current.scrollLeft = 0
              }
            }}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        style={{
          overflowX: histogramZoom > 1 ? 'auto' : 'hidden',
          overflowY: 'hidden',
          borderRadius: '4px',
          backgroundColor: '#fafafa',
        }}
      >
        <div style={{ width: `${100 * histogramZoom}%`, minWidth: '100%' }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="ipc"
                label={{ value: 'IPC Profit', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis
                label={{ value: 'Probability %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: any) => (typeof value === 'number' ? value.toFixed(decimalPlaces) : value) + '%'}
                labelFormatter={(label: any) => `IPC ${label}-${label + 2}`}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '8px',
                        fontSize: '12px',
                        color: '#333',
                      }}>
                        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                          IPC {data.ipcRange}
                        </p>
                        <p style={{ margin: '2px 0' }}>
                          Probability: {data.probability.toFixed(decimalPlaces)}%
                        </p>
                        <p style={{ margin: '2px 0', color: '#666' }}>
                          Sum ≤ {data.ipc + 2}: {data.cumulativeLeft.toFixed(decimalPlaces)}%
                        </p>
                        <p style={{ margin: '2px 0', color: '#666' }}>
                          Sum ≥ {data.ipc}: {data.cumulativeRight.toFixed(decimalPlaces)}%
                        </p>
                        {data.percentileAt && (
                          <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#f44336' }}>
                            📊 {data.percentileAt}th Percentile
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="probability"
                fill="#1976d2"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => {
                  return (
                    <Cell
                      key={`cell-w${waveIndex}-${index}`}
                      fill={entry.percentileAt ? '#ff9800' : '#1976d2'}
                      stroke={entry.percentileAt ? '#000' : 'none'}
                      strokeWidth={entry.percentileAt ? 2 : 0}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

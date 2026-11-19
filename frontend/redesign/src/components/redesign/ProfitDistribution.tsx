import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProfitDistEntry } from '../../types.ts';

export type ProfitDistribution = Record<string, ProfitDistEntry>;

const PERCENTILES = [5, 32, 50, 68, 95];

type HideUnlikely = 'off' | '0.01' | '0.1' | '1' | '5';

interface ProfitCardProps {
  profitDist: ProfitDistribution | undefined;
  wave: number;
  numWaves: number;
}

interface ProfitTableProps extends ProfitCardProps {
  hideUnlikely: HideUnlikely;
}

interface ProfitRow {
  ipc: number;
  prob: number;
  exact: number;
  cumulative: number;
  reverse: number;
  percentile?: number;
}

function sortDistribution(dist: ProfitDistribution) {
  return Object.entries(dist)
    .map(([key, info]) => ({
      ipc: info.ipc ?? Number(key),
      prob: info.prob ?? 0,
    }))
    .filter((entry) => Number.isFinite(entry.ipc) && entry.prob > 0)
    .sort((a, b) => a.ipc - b.ipc);
}

function percentileFor(previous: number, cumulative: number) {
  const matches = PERCENTILES.filter((p) => previous < p && cumulative >= p);
  return matches.length ? matches[Math.floor(matches.length / 2)] : undefined;
}

function fmtPercent(value: number) {
  if (!Number.isFinite(value)) return '-';
  if (value > 0 && value < 0.01) return '<0.01%';
  return `${value.toFixed(2)}%`;
}

function chipTone(percentile: number) {
  if (percentile === 50) return 'success';
  if (percentile === 32 || percentile === 68) return 'warning';
  return 'error';
}

function waveLabel(wave: number, numWaves: number) {
  return numWaves > 1 ? `Wave ${wave + 1}` : null;
}

function buildRows(dist: ProfitDistribution): ProfitRow[] {
  const sorted = sortDistribution(dist);
  const total = sorted.reduce((sum, entry) => sum + entry.prob, 0);
  if (!total) return [];

  let cumulativeProb = 0;
  return sorted.map((entry) => {
    const previous = (cumulativeProb / total) * 100;
    cumulativeProb += entry.prob;
    const cumulative = (cumulativeProb / total) * 100;
    return {
      ipc: entry.ipc,
      prob: entry.prob,
      exact: (entry.prob / total) * 100,
      cumulative,
      reverse: 100 - previous,
      percentile: percentileFor(previous, cumulative),
    };
  });
}

function buildChartData(dist: ProfitDistribution) {
  const sorted = sortDistribution(dist);
  const total = sorted.reduce((sum, entry) => sum + entry.prob, 0);
  if (!total) return [];

  const min = sorted[0].ipc;
  const max = sorted[sorted.length - 1].ipc;
  const binSize = Math.max(1, Math.ceil((max - min) / 40));
  const bins = new Map<number, number>();

  for (const entry of sorted) {
    const key = Math.floor(entry.ipc / binSize) * binSize;
    bins.set(key, (bins.get(key) ?? 0) + (entry.prob / total) * 100);
  }

  let cumulative = 0;
  return [...bins.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ipc, probability]) => {
      const previous = cumulative;
      cumulative += probability;
      return {
        ipc,
        range: `${ipc}–${ipc + binSize - 1}`,
        probability,
        percentile: percentileFor(previous, cumulative),
      };
    });
}

function CardHeader({ title, wave, numWaves }: { title: string; wave: number; numWaves: number }) {
  const label = waveLabel(wave, numWaves);
  return (
    <header className="profit-card__head">
      <h3 className="profit-card__title">{title}</h3>
      {label ? <span className="profit-card__wave">{label}</span> : null}
    </header>
  );
}

export function ProfitHistogram({ profitDist, wave, numWaves }: ProfitCardProps) {
  const data = profitDist ? buildChartData(profitDist) : [];
  const plotRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;

    const update = () => setChartWidth(Math.floor(plot.clientWidth));
    update();

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(plot);
    window.addEventListener('resize', update);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  if (!data.length) {
    return (
      <section className="profit-card profit-card--chart">
        <CardHeader title="Profit histogram" wave={wave} numWaves={numWaves} />
        <div className="profit-empty">No profit distribution data.</div>
      </section>
    );
  }

  return (
    <section className="profit-card profit-card--chart">
      <CardHeader title="Profit histogram" wave={wave} numWaves={numWaves} />
      <div className="profit-chart">
        <div ref={plotRef} className="profit-chart__plot">
          {chartWidth > 0 ? (
            <BarChart
              width={chartWidth}
              height={280}
              data={data}
              margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
            >
              <CartesianGrid stroke="var(--beta-divider)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="ipc"
                stroke="var(--beta-text-secondary)"
                tick={{ fill: 'var(--beta-text-secondary)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--beta-divider)' }}
                minTickGap={24}
                height={34}
                label={{
                  value: 'IPC profit',
                  position: 'insideBottom',
                  offset: -2,
                  fill: 'var(--beta-text-secondary)',
                  fontSize: 11,
                }}
              />
              <YAxis
                stroke="var(--beta-text-secondary)"
                tick={{ fill: 'var(--beta-text-secondary)', fontSize: 11 }}
                tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <Tooltip
                cursor={{ fill: 'var(--beta-hover)' }}
                contentStyle={{
                  background: 'var(--beta-surface)',
                  border: '1px solid var(--beta-divider)',
                  borderRadius: 4,
                  color: 'var(--beta-text)',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--beta-text)' }}
                itemStyle={{ color: 'var(--beta-text)' }}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Probability']}
                labelFormatter={(label) => `IPC ${label}`}
              />
              <Bar
                dataKey="probability"
                fill="var(--beta-primary)"
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`profit-bin-${entry.ipc}-${index}`}
                    fill={entry.percentile ? 'var(--beta-warning)' : 'var(--beta-primary)'}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ProfitDistributionTable({
  profitDist,
  wave,
  numWaves,
  hideUnlikely,
}: ProfitTableProps) {
  const threshold = hideUnlikely === 'off' ? 0 : Number(hideUnlikely);
  const visible = profitDist
    ? buildRows(profitDist).filter(
        (row) => threshold === 0 || row.exact >= threshold || row.percentile !== undefined,
      )
    : [];
  const visibleTotal = visible.reduce((sum, row) => sum + row.prob, 0);

  let cumulativeProb = 0;
  const rows = visibleTotal
    ? visible.map((row) => {
        const previous = cumulativeProb;
        cumulativeProb += row.prob;
        const cumulative = (cumulativeProb / visibleTotal) * 100;
        return {
          ...row,
          cumulative,
          reverse: 100 - (previous / visibleTotal) * 100,
          percentile: percentileFor((previous / visibleTotal) * 100, cumulative),
        };
      })
    : [];

  return (
    <section className="profit-card profit-card--table">
      <CardHeader title="Profit distribution" wave={wave} numWaves={numWaves} />
      {rows.length ? (
        <div className="profit-table-wrap">
          <table className="profit-table">
            <thead>
              <tr>
                <th scope="col">Probability %</th>
                <th scope="col">Confidence %</th>
                <th scope="col">Reverse confidence %</th>
                <th scope="col">IPC profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`profit-row-${row.ipc}`}>
                  <td>{fmtPercent(row.exact)}</td>
                  <td>{fmtPercent(row.cumulative)}</td>
                  <td>{fmtPercent(row.reverse)}</td>
                  <td className="profit-row__ipc">
                    <span className={row.ipc < 0 ? 'profit-negative' : 'profit-positive'}>
                      {row.ipc.toFixed(1)}
                    </span>
                    {row.percentile ? (
                      <span className={`chip chip--${chipTone(row.percentile)}`}>
                        {row.percentile}%
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="profit-empty">No profit distribution data.</div>
      )}
      {threshold > 0 ? (
        <div className="profit-card__note">
          Rows below {hideUnlikely}% are hidden except percentile rows; confidence is recalculated
          from the visible rows. The histogram shows the full distribution.
        </div>
      ) : null}
    </section>
  );
}

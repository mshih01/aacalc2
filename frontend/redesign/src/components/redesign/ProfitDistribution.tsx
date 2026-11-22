import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProfitDistEntry } from '../../types.ts';
import { formatFixed, formatPercent } from '../../utils/display.ts';

export type ProfitDistribution = Record<string, ProfitDistEntry>;

const PERCENTILES = [5, 32, 50, 68, 95];

type HideUnlikely = 'off' | '0.01' | '0.1' | '1' | '5';

interface ProfitCardProps {
  profitDist: ProfitDistribution | undefined;
  wave: number;
  numWaves: number;
}

interface ProfitHistogramProps extends ProfitCardProps {
  probabilityDecimals: number;
}

interface ProfitTableProps {
  profitDist: ProfitDistribution | undefined;
  hideUnlikely: HideUnlikely;
  probabilityDecimals: number;
  ipcDecimals: number;
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

function getAutoBucketSize(dist: ProfitDistribution) {
  const sorted = sortDistribution(dist);
  if (!sorted.length) return 1;
  const min = sorted[0].ipc;
  const max = sorted[sorted.length - 1].ipc;
  return Math.max(1, Math.ceil((max - min) / 40));
}

function buildChartData(dist: ProfitDistribution, requestedBucket?: number) {
  const sorted = sortDistribution(dist);
  const total = sorted.reduce((sum, entry) => sum + entry.prob, 0);
  if (!total) return [];

  const binSize = requestedBucket ?? getAutoBucketSize(dist);
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

function CardHeader({
  title,
  wave,
  numWaves,
  right,
}: {
  title: string;
  wave: number;
  numWaves: number;
  right?: ReactNode;
}) {
  const label = waveLabel(wave, numWaves);
  return (
    <header className="profit-card__head">
      <h3 className="profit-card__title">{title}</h3>
      <div className="profit-card__meta">
        {label ? <span className="profit-card__wave">{label}</span> : null}
        {right}
      </div>
    </header>
  );
}

export function ProfitHistogram({
  profitDist,
  wave,
  numWaves,
  probabilityDecimals,
}: ProfitHistogramProps) {
  const autoBucket = profitDist ? getAutoBucketSize(profitDist) : 1;
  const [bucketSize, setBucketSize] = useState<number | 'auto'>('auto');
  const data = profitDist
    ? buildChartData(profitDist, bucketSize === 'auto' ? undefined : bucketSize)
    : [];
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

  const bucketOptions = [1, 2, 3, 5, 10, 20, 50];

  return (
    <section className="profit-card profit-card--chart">
      <CardHeader
        title="Profit histogram"
        wave={wave}
        numWaves={numWaves}
        right={
          <label className="profit-bucket">
            <span>Bucket</span>
            <select
              className="profit-bucket-select"
              aria-label="Histogram bucket size"
              value={bucketSize === 'auto' ? 'auto' : String(bucketSize)}
              onChange={(event) => {
                const value = event.target.value;
                setBucketSize(value === 'auto' ? 'auto' : Number(value));
              }}
            >
              <option value="auto">Auto ({autoBucket} IPC)</option>
              {bucketOptions.map((size) => (
                <option key={`bucket-${size}`} value={size}>
                  {size} IPC
                </option>
              ))}
            </select>
          </label>
        }
      />
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
                formatter={(value) => [
                  formatPercent(Number(value), probabilityDecimals),
                  'Probability',
                ]}
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
  hideUnlikely,
  probabilityDecimals,
  ipcDecimals,
}: ProfitTableProps) {
  const threshold = hideUnlikely === 'off' ? 0 : Number(hideUnlikely);
  // "Hide unlikely" only chooses which rows to draw; buildRows already computed
  // the confidence intervals and percentile badges from the full distribution,
  // so hidden rows still count towards the visible rows' percentages. The two
  // extreme rows are always drawn so the confidence columns reach 100% at the
  // ends of the table.
  const built = profitDist ? buildRows(profitDist) : [];
  const lastIdx = built.length - 1;
  const rows = built.filter(
    (row, idx) =>
      threshold === 0 ||
      row.exact >= threshold ||
      row.percentile !== undefined ||
      idx === 0 ||
      idx === lastIdx,
  );

  return (
    <section className="profit-card profit-card--table">
      <div className="profit-head">
        <div className="profit-side-cell">
          <span className="profit-side">Profit</span>
        </div>
        <div className="profit-head__label profit-head__label--confidence">Confidence %</div>
        <div className="profit-head__label profit-head__label--ipc">
          <span className="desktop-only">IPC profit</span>
          <span className="mobile-only">IPC</span>
        </div>
      </div>
      {rows.length ? (
        <div role="table" aria-label="Profit distribution">
          {rows.map((row) => (
            <div
              className={`profit-row${row.percentile ? ' profit-row--percentile' : ''}`}
              role="row"
              key={`profit-row-${row.ipc}`}
            >
              <div className="profit-row__badge" role="cell">
                {row.percentile ? (
                  <span
                    className={`chip chip--${chipTone(row.percentile)}`}
                    title={`${row.percentile}% confidence`}
                  >
                    {row.percentile}%
                  </span>
                ) : null}
              </div>
              <div className="profit-row__prob" role="cell">
                {formatPercent(row.exact, probabilityDecimals)}
              </div>
              <div className="profit-row__confidence" role="cell">
                {formatPercent(row.cumulative, probabilityDecimals)}
              </div>
              <div className="profit-row__reverse" role="cell">
                {formatPercent(row.reverse, probabilityDecimals)}
              </div>
              <div className="profit-row__ipc" role="cell">
                <span className={row.ipc < 0 ? 'profit-negative' : 'profit-positive'}>
                  {formatFixed(row.ipc, ipcDecimals)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="profit-empty">No profit distribution data.</div>
      )}
    </section>
  );
}

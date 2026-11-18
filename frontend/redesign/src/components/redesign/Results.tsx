import type { MultiwaveOutput } from 'aacalc2';

export interface ResultsSettings {
  ipcDiffDisplay: 'absolute' | 'roi';
  hideUnlikely: 'off' | '0.01' | '0.1' | '1' | '5';
}

interface CasualtyEntry {
  amount: number;
  ipcLoss: number;
  survivors: string;
  casualties: string;
  retreaters: string;
}

type CasualtyData = Record<string, CasualtyEntry>;

const percentileRows = [5, 32, 50, 68, 95];

function fmtPercent(value: number, places = 2) {
  if (!Number.isFinite(value)) return '-';
  if (value > 0 && value < 0.01) return '<0.01%';
  return `${value.toFixed(places)}%`;
}

function fmtPercentMobile(value: number) {
  if (!Number.isFinite(value)) return '-';
  if (value > 0 && value < 1) return '<1%';
  return `${Math.round(value)}%`;
}

function fmtNumber(value: number, places = 1) {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(places);
}

function PercentValue({ value }: { value: number }) {
  return (
    <>
      <span className="desktop-only">{fmtPercent(value)}</span>
      <span className="mobile-only">{fmtPercentMobile(value)}</span>
    </>
  );
}

function lossForWave(result: MultiwaveOutput, wave: number, side: 'attack' | 'defense') {
  const info = side === 'attack' ? result.attack : result.defense;
  const incremental = info.incrementalLoss?.[wave];
  if (incremental !== undefined && Number.isFinite(incremental)) {
    return Math.max(0, incremental);
  }
  const current = info.ipcLoss?.[wave] ?? 0;
  const previous = wave > 0 ? (info.ipcLoss?.[wave - 1] ?? 0) : 0;
  return Math.max(0, current - previous);
}

function cumulativeLoss(result: MultiwaveOutput, side: 'attack' | 'defense') {
  const info = side === 'attack' ? result.attack : result.defense;
  const idx = Math.max(0, (result.waves ?? 1) - 1);
  return Math.max(0, info.cumulativeIpcLoss?.[idx] ?? info.ipcLoss?.[idx] ?? 0);
}

function roiLabel(profit: number, attackLoss: number) {
  if (!attackLoss) return '-';
  const value = (profit / attackLoss) * 100;
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function Overview({
  result,
  numWaves,
  settings,
}: {
  result: MultiwaveOutput;
  numWaves: number;
  settings: ResultsSettings;
}) {
  const multi = numWaves > 1;
  const rows: Array<{
    label: string;
    rounds: number;
    attackSurvives: number;
    attackConquers: number;
    defenseSurvives: number;
    attackIpc: number;
    profit: number;
    defenseIpc: number;
    all?: boolean;
  }> = [];

  for (let wave = 0; wave < numWaves; wave++) {
    const attackLoss = lossForWave(result, wave, 'attack');
    const defenseLoss = lossForWave(result, wave, 'defense');
    rows.push({
      label: String(wave + 1),
      rounds: result.rounds?.[wave] ?? 0,
      attackSurvives: result.attack.survives?.[wave] ?? 0,
      attackConquers: result.takesTerritory?.[wave] ?? 0,
      defenseSurvives: result.defense.survives?.[wave] ?? 0,
      attackIpc: -attackLoss,
      profit: defenseLoss - attackLoss,
      defenseIpc: -defenseLoss,
    });
  }

  if (multi) {
    const attackLoss = cumulativeLoss(result, 'attack');
    const defenseLoss = cumulativeLoss(result, 'defense');
    rows.push({
      label: 'All',
      rounds: rows.reduce((sum, row) => sum + row.rounds, 0),
      attackSurvives: result.attack.survives?.[numWaves - 1] ?? 0,
      attackConquers: result.takesTerritory?.[numWaves - 1] ?? 0,
      defenseSurvives: result.defense.survives?.[numWaves - 1] ?? 0,
      attackIpc: -attackLoss,
      profit: defenseLoss - attackLoss,
      defenseIpc: -defenseLoss,
      all: true,
    });
  }

  const header = (
    <>
      {multi ? <div className="overview__cell" /> : null}
      <div className="overview__cell overview__cell--rounds">Rounds</div>
      <div className="overview__cell overview__cell--attack-survives">Attacker survives</div>
      <div className="overview__cell overview__cell--attack-conquers">Attacker conquers</div>
      <div className="overview__cell overview__cell--defense-survives">Defender survives</div>
      <div className="overview__cell overview__cell--attack-ipc">Attacker IPC</div>
      <div className="overview__cell overview__cell--profit">Attacker Profit</div>
      <div className="overview__cell overview__cell--defense-ipc">Defender IPC</div>
    </>
  );

  return (
    <div className={`overview${multi ? ' overview--multi' : ''} overview--advanced`}>
      <div className="overview__grid overview__head">{header}</div>
      {rows.map((row) => (
        <div
          key={row.label}
          className={`overview__grid overview__value${row.all ? ' overview__value--all' : ''}`}
        >
          {multi ? <div className="overview__cell overview__wave">{row.label}</div> : null}
          <div className="overview__cell overview__cell--rounds">{fmtNumber(row.rounds)}</div>
          <div className="overview__cell overview__cell--attack-survives">
            {fmtPercent(row.attackSurvives * 100, 1)}
          </div>
          <div className="overview__cell overview__cell--attack-conquers">
            {fmtPercent(row.attackConquers * 100, 1)}
          </div>
          <div className="overview__cell overview__cell--defense-survives">
            {fmtPercent(row.defenseSurvives * 100, 1)}
          </div>
          <div className="overview__cell overview__cell--attack-ipc">
            {row.attackIpc === 0 ? '0.0' : row.attackIpc.toFixed(1)}
          </div>
          <div className="overview__cell overview__cell--profit">
            <span
              className={`overview__profit-value overview__profit-value--${
                row.profit < 0 ? 'negative' : 'positive'
              }`}
            >
              {settings.ipcDiffDisplay === 'roi'
                ? roiLabel(row.profit, Math.abs(row.attackIpc))
                : row.profit.toFixed(1)}
            </span>
          </div>
          <div className="overview__cell overview__cell--defense-ipc">
            {row.defenseIpc === 0 ? '0.0' : row.defenseIpc.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CasualtyTable({
  side,
  data,
  settings,
}: {
  side: 'attack' | 'defense';
  data: CasualtyData | undefined;
  settings: ResultsSettings;
}) {
  if (!data || Object.keys(data).length === 0) return null;

  const sorted = Object.entries(data).sort(([, a], [, b]) => a.ipcLoss - b.ipcLoss);
  const total = sorted.reduce((sum, [, entry]) => sum + (entry.amount ?? 0), 0) || 1;
  const threshold = settings.hideUnlikely === 'off' ? 0 : Number(settings.hideUnlikely);

  const allRows = sorted.map(([outcome, entry], idx) => {
    const before = sorted.slice(0, idx).reduce((sum, [, item]) => sum + (item.amount ?? 0), 0);
    const upto = sorted.slice(0, idx + 1).reduce((sum, [, item]) => sum + (item.amount ?? 0), 0);
    const from = sorted.slice(idx).reduce((sum, [, item]) => sum + (item.amount ?? 0), 0);
    const exact = ((entry.amount ?? 0) / total) * 100;
    const cumulative = (upto / total) * 100;
    const reverse = (from / total) * 100;
    const previousCumulative = (before / total) * 100;
    const crossed = percentileRows.filter((p) => previousCumulative < p && cumulative >= p);
    // When one outcome spans several percentiles (common for the final
    // wipe-out row), the target UI labels the row with the most central
    // percentile it contains rather than the lowest one.
    const percentile =
      crossed.length === 0
        ? null
        : crossed.reduce((best, p) => (Math.abs(p - 50) < Math.abs(best - 50) ? p : best));
    return { outcome, entry, exact, cumulative, reverse, percentile };
  });

  const rows = allRows.filter(
    (row) => threshold === 0 || row.exact >= threshold || row.percentile !== null,
  );

  const fullSide = side === 'attack' ? 'Attacker' : 'Defender';
  const shortSide = side === 'attack' ? 'Att.' : 'Def.';

  return (
    <div className="casualty-card casualty-card--advanced">
      <div className="casualty-head">
        <div className={`casualty-side casualty-side--${side}`}>
          <span className="desktop-only">{fullSide}</span>
          <span className="mobile-only">{shortSide}</span>
        </div>
        <div className="casualty-head__label casualty-head__label--confidence">Confidence %</div>
        <div className="casualty-head__label casualty-head__label--surviving">
          <span className="desktop-only">Surviving</span>
          <span className="mobile-only">Surv.</span>
        </div>
        <div className="casualty-head__label casualty-head__label--casualties">Casualties</div>
        <div className="casualty-head__label casualty-head__label--ipc">IPC</div>
      </div>
      <div role="table" aria-label={`${side} casualty table`}>
        {rows.map((row) => (
          <div
            className={`casualty-row${row.percentile !== null ? ' casualty-row--percentile' : ''}`}
            role="row"
            key={`${side}-${row.outcome}`}
          >
            <div className="casualty-row__badge" role="cell">
              {row.percentile !== null ? (
                <span
                  className={`chip chip--${chipTone(row.percentile)}`}
                  title={`${row.percentile}% confidence`}
                >
                  {row.percentile}%
                </span>
              ) : null}
            </div>
            <div className="casualty-row__confidence casualty-row__confidence--exact" role="cell">
              <PercentValue value={row.exact} />
            </div>
            <div className="casualty-row__confidence casualty-row__confidence--better" role="cell">
              <PercentValue value={row.cumulative} />
            </div>
            <div className="casualty-row__confidence casualty-row__confidence--worse" role="cell">
              <PercentValue value={row.reverse} />
            </div>
            <div className="casualty-row__surviving" role="cell">
              {row.entry.survivors || '-'}
            </div>
            <div className="casualty-row__casualties" role="cell">
              {row.entry.casualties || '-'}
            </div>
            <div className="casualty-row__ipc" role="cell">
              {row.entry.ipcLoss ? `-${row.entry.ipcLoss}` : '0'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function chipTone(percentile: number) {
  if (percentile === 50) return 'success';
  if (percentile === 32 || percentile === 68) return 'warning';
  return 'error';
}

export function Results({
  result,
  numWaves,
  settings,
}: {
  result: MultiwaveOutput;
  numWaves: number;
  settings: ResultsSettings;
}) {
  return (
    <div className="results">
      <Overview result={result} numWaves={numWaves} settings={settings} />
      <div className="results__tables">
        <CasualtyTable side="attack" data={result.casualtiesInfo?.attack} settings={settings} />
        <CasualtyTable side="defense" data={result.casualtiesInfo?.defense} settings={settings} />
      </div>
    </div>
  );
}

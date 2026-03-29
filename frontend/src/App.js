import { useCallback, useState } from 'react';
import { computeBattle } from '../../src/frontend';
import './App.css';
const unitIds = [
    'inf',
    'art',
    'arm',
    'fig',
    'bom',
    'sub',
    'tra',
    'des',
    'cru',
    'acc',
    'bat',
    'dbat',
    'ic',
    'inf_a',
    'art_a',
    'arm_a',
];
function App() {
    const [attack, setAttack] = useState({});
    const [defense, setDefense] = useState({});
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const setUnit = useCallback((side, unit, value) => {
        const n = Math.max(0, Number(value) || 0);
        const setter = side === 'attack' ? setAttack : setDefense;
        setter((prev) => {
            const next = { ...prev };
            if (n > 0) {
                next[unit] = n;
            }
            else {
                delete next[unit];
            }
            return next;
        });
    }, []);
    const runBattle = useCallback(() => {
        setError(null);
        try {
            const input = {
                attack: attack,
                defense: defense,
            };
            const output = computeBattle(input);
            setResult(output);
        }
        catch (err) {
            setError(err.message ?? 'unknown error');
            setResult(null);
        }
    }, [attack, defense]);
    return (<main className="app">
      <h1>aa1942calc2 frontend demo</h1>
      <section className="form-grid">
        <div>
          <h2>Attackers</h2>
          {unitIds.map((unit) => (<label key={`att-${unit}`}>
              {unit.toUpperCase()}
              <input type="number" min={0} value={attack[unit] || ''} onChange={(e) => setUnit('attack', unit, e.target.value)}/>
            </label>))}
        </div>

        <div>
          <h2>Defenders</h2>
          {unitIds.map((unit) => (<label key={`def-${unit}`}>
              {unit.toUpperCase()}
              <input type="number" min={0} value={defense[unit] || ''} onChange={(e) => setUnit('defense', unit, e.target.value)}/>
            </label>))}
        </div>
      </section>

      <button className="run-btn" onClick={runBattle}>
        Evaluate Battle
      </button>

      {error && <p className="error">Error: {error}</p>}

      {result && (<section className="results">
          <h2>Result</h2>
          <div className="summary">
            <p>Probability of taking territory: {result.takesTerritory[0]?.toFixed(4) ?? 0}</p>
            <p>Attackers survive EV: {result.attack.ipcLoss[0]?.toFixed(3)}</p>
            <p>Defenders survive EV: {result.defense.ipcLoss[0]?.toFixed(3)}</p>
          </div>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>)}
    </main>);
}
export default App;
//# sourceMappingURL=App.js.map
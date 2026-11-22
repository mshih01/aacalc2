import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BetaApp from './BetaApp.tsx';
import type { BattleInput } from './types.ts';
import { encodeStateToHash } from './utils/format.ts';

describe('beta-style calculator', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the calculator and produces results', async () => {
    render(<BetaApp />);

    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '10' } });
    fireEvent.change(infantry[1], { target: { value: '8' } });

    const calculate = screen.getByRole('button', { name: /calculate/i });
    expect(calculate).not.toBeDisabled();
    fireEvent.click(calculate);

    await waitFor(
      () => {
        expect(screen.getByText('Attacker survives')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
    expect(screen.getByText('Defender IPC')).toBeInTheDocument();
    expect(screen.getByText('Profit histogram')).toBeInTheDocument();
    expect(screen.getByText('Profit')).toBeInTheDocument();
    // No units retreat when retreating is disabled.
    expect(screen.queryByText('Retreating')).not.toBeInTheDocument();
  });

  it('renders profit percentile badges in the leftmost column', async () => {
    render(<BetaApp />);

    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '10' } });
    fireEvent.change(infantry[1], { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));

    await waitFor(
      () => {
        expect(screen.getByText('Profit')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    const section = screen.getByText('Profit').closest('section');
    const table = section?.querySelector('[role="table"]');
    expect(table).not.toBeNull();
    const chip = within(table as HTMLElement).getByText('50%');
    const row = chip.closest('[role="row"]');
    const cells = within(row as HTMLElement).getAllByRole('cell');
    expect(cells[0]).toContainElement(chip);
    // The individual outcome probability is the cell right after the badge.
    expect(cells[1]?.textContent).toMatch(/%$/);
  });

  it('does not describe the hide-unlikely behaviour below the profit table', async () => {
    localStorage.setItem('aacalc2BetaSettings', JSON.stringify({ hideUnlikely: '1' }));
    render(<BetaApp />);

    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '10' } });
    fireEvent.change(infantry[1], { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));

    await waitFor(
      () => {
        expect(screen.getByText('Profit')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
    expect(screen.queryByText(/Rows below/i)).not.toBeInTheDocument();
  });

  it('shows retreated units in a separate casualty column', async () => {
    render(<BetaApp />);

    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '1' } });
    fireEvent.change(infantry[1], { target: { value: '10' } });

    fireEvent.click(screen.getByLabelText('Retreat when'));
    fireEvent.change(screen.getByLabelText('Threshold'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));

    await waitFor(
      () => {
        expect(screen.getByText('Retreating')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    const table = screen.getByRole('table', { name: 'attack casualty table' });
    const retreatCells = table.querySelectorAll('.casualty-row__retreaters');
    expect(retreatCells.length).toBeGreaterThan(0);
    expect(Array.from(retreatCells).some((cell) => cell.textContent?.includes('Inf'))).toBe(true);
  });

  it('draws the per-wave checkbox label once when the wave columns are narrow', () => {
    render(<BetaApp />);
    fireEvent.change(screen.getByLabelText('Waves'), { target: { value: '3' } });

    expect(screen.getAllByText('AA 2nd last')).toHaveLength(1);
    expect(screen.getAllByLabelText('AA 2nd last')).toHaveLength(3);
  });

  it('keeps a label beside every checkbox on wide layouts', () => {
    localStorage.setItem('aacalc2BetaSettings', JSON.stringify({ width: 'xl' }));
    render(<BetaApp />);
    fireEvent.change(screen.getByLabelText('Waves'), { target: { value: '3' } });

    expect(screen.getAllByText('AA 2nd last')).toHaveLength(3);
  });

  it('keeps the territory and dead zone controls accessible on mobile', () => {
    render(<BetaApp />);

    expect(screen.getByLabelText('Territory value (IPC)')).toBeInTheDocument();
    expect(screen.getByLabelText('Dead zone')).toBeInTheDocument();
  });

  it('accepts a negative territory value', () => {
    render(<BetaApp />);

    const field = screen.getByLabelText('Territory value (IPC)');
    expect(field).not.toHaveAttribute('min');

    fireEvent.change(field, { target: { value: '-' } });
    expect(field).toHaveValue('-');

    fireEvent.change(field, { target: { value: '-3' } });
    expect(field).toHaveValue('-3');
  });

  it('applies the decimal-place settings to results', async () => {
    render(<BetaApp />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByLabelText('Probability decimal places'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('IPC loss decimal places'), {
      target: { value: '0' },
    });

    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '10' } });
    fireEvent.change(infantry[1], { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));

    await waitFor(
      () => {
        expect(screen.getByText('Attacker survives')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    expect(screen.getAllByText('28.4045%').length).toBeGreaterThan(0);
    expect(screen.getByText('-26')).toBeInTheDocument();
  });

  it('offers previous-wave attackers only for waves after the first', () => {
    render(<BetaApp />);
    expect(screen.queryByText('Prev wave attackers')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Waves'), { target: { value: '3' } });
    expect(screen.getAllByText('Prev wave attackers')).toHaveLength(1);
    expect(screen.getAllByLabelText('Prev wave attackers')).toHaveLength(2);

    const sides = document.querySelectorAll('.beta-config-side');
    expect(sides).toHaveLength(2);
    expect(screen.getByText('Prev wave attackers').closest('.beta-config-side')).toBe(sides[1]);
  });

  it('links probability decimals to the prune thresholds and exposes the advanced settings', () => {
    render(<BetaApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    fireEvent.change(screen.getByLabelText('Probability decimal places'), {
      target: { value: '4' },
    });
    expect((screen.getByLabelText('Prune threshold') as HTMLInputElement).value).toBe('1e-12');
    expect((screen.getByLabelText('Report prune threshold') as HTMLInputElement).value).toBe(
      '1e-12',
    );

    expect(screen.getByLabelText('Verbose level')).toBeInTheDocument();
    expect(screen.getByLabelText('Complexity threshold')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Fix defender profit via convolution')).toBeInTheDocument();
    expect(screen.getByLabelText('Future-wave-aware EV retreat')).toBeInTheDocument();
    expect(screen.getByLabelText('Allow retreat on round zero')).toBeInTheDocument();
  });

  it('restores the experimental engine flags from a share link', async () => {
    const sharedInput: BattleInput = {
      attack: { 0: { inf: 3 } },
      defense: { 0: { inf: 2 } },
      retreatModes: { 0: 'unitCount' },
      experimentalConvolution: true,
      evFutureWave: true,
      retreatZeroRound: true,
    };
    window.history.replaceState(null, '', encodeStateToHash(sharedInput, 'Flags test'));
    render(<BetaApp />);

    await waitFor(() => {
      expect(screen.getByLabelText('Battle title')).toHaveValue('Flags test');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByLabelText('Fix defender profit via convolution')).toBeChecked();
    expect(screen.getByLabelText('Future-wave-aware EV retreat')).toBeChecked();
    expect(screen.getByLabelText('Allow retreat on round zero')).toBeChecked();
  });

  it('runs army optimization and applies a recommendation', async () => {
    render(<BetaApp />);

    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '4' } });
    fireEvent.change(infantry[1], { target: { value: '2' } });

    fireEvent.click(screen.getByRole('tab', { name: 'Army optimization' }));
    const recommend = screen.getByRole('button', { name: 'Recommend army' });
    expect(recommend).not.toBeDisabled();
    fireEvent.click(recommend);

    await waitFor(
      () => {
        expect(screen.getByText('Recommended armies')).toBeInTheDocument();
      },
      { timeout: 20000 },
    );

    const useButtons = screen.getAllByRole('button', { name: /Use as attacker/i });
    expect(useButtons.length).toBeGreaterThan(0);
    fireEvent.click(useButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Recommended army applied to the attacker/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeInTheDocument();
  });

  it('requires both armies before recommending', () => {
    render(<BetaApp />);
    fireEvent.click(screen.getByRole('tab', { name: 'Army optimization' }));
    expect(screen.getByRole('button', { name: 'Recommend army' })).toBeDisabled();
  });

  it('hides army optimization in SBR mode', () => {
    render(<BetaApp />);
    fireEvent.click(screen.getByLabelText('SBR'));
    expect(screen.queryByRole('tab', { name: 'Army optimization' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Batch run' })).not.toBeInTheDocument();
  });

  it('blocks battles above the complexity threshold setting', async () => {
    localStorage.setItem('aacalc2BetaSettings', JSON.stringify({ complexityThreshold: 1 }));
    render(<BetaApp />);

    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '10' } });
    fireEvent.change(infantry[1], { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));

    await waitFor(() => {
      expect(screen.getByText(/too complex/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Profit histogram')).not.toBeInTheDocument();
  });

  it('only offers four waves for extra-large desktop layouts', () => {
    const first = render(<BetaApp />);
    expect(screen.queryByRole('option', { name: '4 waves' })).not.toBeInTheDocument();
    first.unmount();

    localStorage.setItem('aacalc2BetaSettings', JSON.stringify({ width: 'xl' }));
    render(<BetaApp />);
    expect(screen.getByRole('option', { name: '4 waves' })).toBeInTheDocument();
  });

  it('uses OOL autocomplete fields when exhaustive OOL is enabled', () => {
    localStorage.setItem('aacalc2BetaSettings', JSON.stringify({ exhaustiveOOL: true }));
    render(<BetaApp />);

    const fields = screen.getAllByRole('combobox', { name: 'Order of loss' });
    expect(fields).toHaveLength(2);
    expect(fields.every((field) => field.tagName === 'INPUT')).toBe(true);
  });

  it('shows all modes and advanced options', () => {
    render(<BetaApp />);

    expect(screen.getByLabelText('SBR')).toBeInTheDocument();
    expect(screen.getByText('Amphibious assault')).toBeInTheDocument();
    expect(screen.getAllByText('Order of loss').length).toBeGreaterThan(0);
  });

  it('links to GitHub and Discord from About', () => {
    render(<BetaApp />);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'About' }));

    const github = screen.getByRole('link', { name: 'GitHub' });
    expect(github).toHaveAttribute('href', 'https://github.com/mshih01/aacalc2');
    expect(github).toHaveAttribute('target', '_blank');

    const discord = screen.getByRole('link', { name: 'Discord' });
    expect(discord).toHaveAttribute(
      'href',
      'https://discord.com/channels/606254910438375434/1573788316044623912',
    );
    expect(discord).toHaveAttribute('target', '_blank');
  });

  it('saves a titled battle into the selected history group', async () => {
    render(<BetaApp />);

    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '2' } });
    fireEvent.change(infantry[1], { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Battle title'), {
      target: { value: 'Group save test' },
    });
    fireEvent.change(screen.getByLabelText('History group'), {
      target: { value: 'Moscow' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    fireEvent.click(screen.getByRole('button', { name: 'History' }));

    expect(await screen.findByTitle('Moscow (1)')).toBeInTheDocument();
    expect(screen.getByText('Group save test')).toBeInTheDocument();
  });

  it('evaluates every saved setting in a history group', async () => {
    const makeEntry = (name: string, timestamp: number) => ({
      group: 'Moscow',
      name,
      timestamp,
      input: {
        attack: { 0: { inf: 3 } },
        defense: { 0: { inf: 2 } },
        mode: 'land',
        numWaves: 1,
        retreatModes: { 0: 'unitCount' },
      },
    });
    localStorage.setItem(
      'aacalc2BetaHistory',
      JSON.stringify([makeEntry('base', 2), makeEntry('conservative', 1)]),
    );

    render(<BetaApp />);
    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '3' } });
    fireEvent.change(infantry[1], { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByLabelText('Evaluate group Moscow'));

    await waitFor(
      () => {
        expect(screen.getByText('Batch results — Moscow')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    expect(
      within(screen.getByRole('table', { name: 'Batch results for Moscow' })).getByText('base'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('table', { name: 'Batch results for Moscow' })).getByText(
        'conservative',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Armies fixed:/)).toBeInTheDocument();
  });

  const seedGroup = (group: string) => {
    const makeEntry = (name: string, timestamp: number) => ({
      group,
      name,
      timestamp,
      input: {
        attack: { 0: { inf: 3 } },
        defense: { 0: { inf: 2 } },
        mode: 'land',
        numWaves: 1,
        retreatModes: { 0: 'unitCount' },
      },
    });
    localStorage.setItem(
      'aacalc2BetaHistory',
      JSON.stringify([makeEntry('base', 2), makeEntry('variant', 1)]),
    );
  };

  const fillArmies = () => {
    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '3' } });
    fireEvent.change(infantry[1], { target: { value: '2' } });
  };

  it('follows a renamed group in the save field and the batch snapshot', async () => {
    seedGroup('Moscow');
    render(<BetaApp />);
    fillArmies();
    fireEvent.change(screen.getByLabelText('History group'), { target: { value: 'Moscow' } });

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByLabelText('Evaluate group Moscow'));
    await waitFor(
      () => {
        expect(screen.getByText('Batch results — Moscow')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByLabelText('Rename group Moscow'));
    const nameInput = screen.getByLabelText('Group name');
    fireEvent.change(nameInput, { target: { value: 'Stalingrad' } });
    fireEvent.keyDown(nameInput, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Batch results — Stalingrad')).toBeInTheDocument();
    });
    expect((screen.getByLabelText('History group') as HTMLInputElement).value).toBe('Stalingrad');
    expect((screen.getByLabelText('Group') as HTMLSelectElement).value).toBe('Stalingrad');
  });

  it('clears the batch snapshot when its history group is removed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    seedGroup('Moscow');
    render(<BetaApp />);
    fillArmies();

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByLabelText('Evaluate group Moscow'));
    await waitFor(
      () => {
        expect(screen.getByText('Batch results — Moscow')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    // The batch run closes the drawer.
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(screen.getByLabelText('Remove group Moscow'));

    await waitFor(() => {
      expect(screen.queryByText('Batch results — Moscow')).not.toBeInTheDocument();
    });
    expect((screen.getByLabelText('History group') as HTMLInputElement).value).toBe('Default');
  });

  it('sweeps two history groups and renders the combination matrix', async () => {
    const template = {
      attack: { 0: {} },
      defense: { 0: {} },
      attackOol: { 0: ['inf', 'art'] },
      defenseOol: { 0: ['inf'] },
      rounds: { 0: 'all' },
      retreatModes: { 0: 'unitCount' },
      diceMode: 'standard',
      mode: 'land',
      numWaves: 1,
    };
    const entries = [
      { group: 'OOL', name: 'standard', input: { ...template, diceMode: 'standard' } },
      { group: 'OOL', name: 'lowluck', input: { ...template, diceMode: 'lowluck' } },
      { group: 'Retreat', name: 'one round', input: { ...template, rounds: { 0: 1 } } },
      { group: 'Retreat', name: 'three rounds', input: { ...template, rounds: { 0: 3 } } },
    ].map((entry, idx) => ({ ...entry, timestamp: 1000 + idx }));
    localStorage.setItem('aacalc2BetaHistory', JSON.stringify(entries));

    render(<BetaApp />);
    fillArmies();

    fireEvent.click(screen.getByRole('tab', { name: 'Batch run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Two-group sweep' }));

    expect(screen.getByLabelText('Rows')).toHaveValue('OOL');
    expect(screen.getByLabelText('Columns')).toHaveValue('Retreat');
    expect(screen.getByText('4', { selector: '.sweep-summary__count strong' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Run 4 battles' }));

    await waitFor(
      () => {
        expect(screen.getByText('Sweep results — OOL × Retreat')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
    expect(screen.getByRole('table', { name: 'Sweep matrix' })).toBeInTheDocument();
    expect(screen.getByText('Combination matrix')).toBeInTheDocument();
    expect(screen.getByText('OOL ↓ / Retreat →')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Sweep results for OOL × Retreat' }),
    ).toBeInTheDocument();
  });

  it('blocks a sweep whose axes set the same field differently', () => {
    const template = {
      attack: { 0: {} },
      defense: { 0: {} },
      retreatModes: { 0: 'unitCount' },
      mode: 'land',
      numWaves: 1,
    };
    const entries = [
      { group: 'First', name: 'one round', input: { ...template, rounds: { 0: 1 } } },
      { group: 'Second', name: 'three rounds', input: { ...template, rounds: { 0: 3 } } },
    ].map((entry, idx) => ({ ...entry, timestamp: 1000 + idx }));
    localStorage.setItem('aacalc2BetaHistory', JSON.stringify(entries));

    render(<BetaApp />);
    fillArmies();
    fireEvent.click(screen.getByRole('tab', { name: 'Batch run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Two-group sweep' }));

    expect(screen.getByText('Fields set by both axes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run 1 battle' })).toBeDisabled();
  });
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import BetaApp from './BetaApp.tsx';

describe('beta-style calculator', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
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
    expect(screen.getByText('Profit distribution')).toBeInTheDocument();
  });

  it('renders profit percentile badges in the leftmost column', async () => {
    render(<BetaApp />);

    const infantry = screen.getAllByLabelText('Infantry');
    fireEvent.change(infantry[0], { target: { value: '10' } });
    fireEvent.change(infantry[1], { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));

    await waitFor(
      () => {
        expect(screen.getByText('Profit distribution')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    const section = screen.getByText('Profit distribution').closest('section');
    const table = section?.querySelector('table');
    expect(table).not.toBeNull();
    const chip = within(table as HTMLElement).getByText('50%');
    const row = chip.closest('tr');
    expect(row?.cells[0]).toContainElement(chip);
    // The individual outcome probability is the cell right after the badge.
    expect(row?.cells[1]?.textContent).toMatch(/%$/);
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
});

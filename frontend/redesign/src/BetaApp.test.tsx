import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import BetaApp from './BetaApp.tsx';

describe('beta-style calculator', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('renders the simple calculator and produces results', async () => {
    render(<BetaApp />);

    expect(screen.getByRole('button', { name: /switch to advanced mode/i })).toBeInTheDocument();

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
  });

  it('opens the advanced options and shows all modes', () => {
    render(<BetaApp />);
    fireEvent.click(screen.getByRole('button', { name: /switch to advanced mode/i }));

    expect(screen.getByLabelText('SBR')).toBeInTheDocument();
    expect(screen.getByText('Amphibious assault')).toBeInTheDocument();
    expect(screen.getAllByText('Order of loss').length).toBeGreaterThan(0);
  });
});

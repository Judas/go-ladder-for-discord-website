import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { expectNoConsoleErrors, fixtures, renderAt, stubApi } from '../testUtils.jsx';
import { liveGames } from '../__fixtures__/liveGames.js';
import Games from './Games.jsx';

describe('Games', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('shows the live games above the recent ones, and warns about nothing', async () => {
        stubApi({ '/api/games/live': liveGames });
        await expectNoConsoleErrors(async () => {
            renderAt(<Games />);
            await screen.findByText(/6 parties en cours/);
            await screen.findAllByRole('link', { name: 'Voir la partie' });
        });

        expect(screen.getByRole('heading', { name: 'Parties' })).toBeInTheDocument();

        const live = screen.getByRole('region', { name: 'Parties live' });
        const recent = screen.getByRole('region', { name: 'Parties récentes' });
        expect(live.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        expect(screen.getAllByRole('link', { name: 'Voir la partie' })).toHaveLength(fixtures.games.length);
    });

    it('keeps the recent games when the live list is unavailable', async () => {
        stubApi({ '/api/games/live': { status: 503 } });
        renderAt(<Games />);

        expect(await screen.findByText('La liste des parties en cours est momentanément indisponible.')).toBeInTheDocument();
        expect(await screen.findAllByRole('link', { name: 'Voir la partie' })).toHaveLength(fixtures.games.length);
    });
});

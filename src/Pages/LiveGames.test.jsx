import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';
import { liveGames, liveGamesEmpty } from '../__fixtures__/liveGames.js';
import LiveGames from './LiveGames.jsx';

// Hand-built, synthetic: see the provenance note in the fixture's .js wrapper.
const LIVE = liveGames;

describe('LiveGames', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('renders one card per game, each leading to OGS in a new tab', async () => {
        stubApi({ '/api/games/live': LIVE });
        await expectNoConsoleErrors(async () => {
            renderAt(<LiveGames />, { path: '/live-games' });
            await screen.findByText(/6 parties en cours/);
        });

        const cards = screen.getAllByRole('article');
        expect(cards).toHaveLength(6);

        const link = within(cards[0]).getByRole('link', { name: /Membre Noir contre Membre Blanc sur OGS/ });
        expect(link).toHaveAttribute('href', 'https://online-go.com/game/2006');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('flags a game between two members, and details the game', async () => {
        stubApi({ '/api/games/live': LIVE });
        renderAt(<LiveGames />, { path: '/live-games' });
        const [gold, open] = await screen.findAllByRole('article');

        expect(within(gold).getByText('GOLD')).toBeInTheDocument();
        expect(within(gold).getByText('Bronze')).toBeInTheDocument();
        expect(within(gold).getByText('Classée')).toBeInTheDocument();
        expect(within(gold).getByText('Coup 87')).toBeInTheDocument();
        expect(within(gold).getByText('Partie amicale')).toBeInTheDocument();

        expect(within(open).queryByText('GOLD')).not.toBeInTheDocument();
        expect(within(open).getByText('9×9')).toBeInTheDocument();
        expect(within(open).getByText('Libre')).toBeInTheDocument();
        expect(within(open).getByText('Handicap 2')).toBeInTheDocument();
    });

    it('shows an outsider by their OGS name and rank', async () => {
        stubApi({ '/api/games/live': LIVE });
        renderAt(<LiveGames />, { path: '/live-games' });
        const open = (await screen.findAllByRole('article'))[1];

        expect(within(open).getByText('inconnu_ogs')).toBeInTheDocument();
        expect(within(open).getByText('5k')).toBeInTheDocument();
        expect(within(open).getAllByText('Hors communauté')).toHaveLength(1);
        // A member who has no tier yet shows nothing rather than a placeholder.
        expect(within(open).getByText('Membre Trois')).toBeInTheDocument();
    });

    it('says when nobody is playing', async () => {
        stubApi({ '/api/games/live': liveGamesEmpty });
        renderAt(<LiveGames />, { path: '/live-games' });
        expect(await screen.findByText('Aucun joueur de la communauté ne joue sur OGS en ce moment.')).toBeInTheDocument();
    });

    it('tells a stale list (503) apart from a failure', async () => {
        stubApi({ '/api/games/live': { status: 503 } });
        renderAt(<LiveGames />, { path: '/live-games' });
        expect(await screen.findByText('La liste des parties en cours est momentanément indisponible.')).toBeInTheDocument();
    });
});

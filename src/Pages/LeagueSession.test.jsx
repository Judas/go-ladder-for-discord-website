import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LeagueSession from './LeagueSession.jsx';
import { sessionExempted, sessionRunning, sessionSettled, sessionUndrawn } from '../__fixtures__/league.js';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';

const render = payload => {
    stubApi({ '/api/league/session/': payload });
    return renderAt(<LeagueSession />, {
        path: `/league/session/${payload.session?.number ?? 1}`,
        route: '/league/session/:number',
    });
};

const cardOf = name => screen.getByText(name).closest('article');

describe('LeagueSession', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('renders a settled session, and warns about nothing', async () => {
        await expectNoConsoleErrors(async () => {
            render(sessionSettled);
            await screen.findByRole('heading', { name: `Session ${sessionSettled.session.number}` });
        });

        for (const match of sessionSettled.matches) {
            expect(screen.getByText(match.black.discordName)).toBeInTheDocument();
            expect(screen.getByText(match.white.discordName)).toBeInTheDocument();
        }
    });

    /**
     * The three states of `result`, which must never be collapsed: a forfeit is not a fixture still to come.
     */
    it('tells a forfeited match from a played one', async () => {
        const forfeited = sessionSettled.matches.find(m => m.result === 'unplayed');
        const played = sessionSettled.matches.find(m => m.result && m.result !== 'unplayed');
        expect(forfeited, 'the captured session should still hold an unplayed match').toBeDefined();

        render(sessionSettled);
        await screen.findByRole('heading', { name: `Session ${sessionSettled.session.number}` });

        expect(within(cardOf(forfeited.black.discordName)).getByText('Non jouée')).toBeInTheDocument();
        expect(within(cardOf(played.black.discordName)).getByText('Terminée')).toBeInTheDocument();
    });

    it('reads a null result in a running session as still to play', async () => {
        expect(sessionRunning.session.settled, 'the captured session 4 should still be running').toBe(false);
        expect(sessionRunning.matches.every(m => m.result === null)).toBe(true);

        render(sessionRunning);
        await screen.findByRole('heading', { name: `Session ${sessionRunning.session.number}` });

        expect(screen.getAllByText('À jouer')).toHaveLength(sessionRunning.matches.length);
        expect(screen.queryByText('Non jouée')).not.toBeInTheDocument();
    });

    /** winnerDiscordId is computed by the server, so the page marks a side rather than deducing one from a colour. */
    it('marks the winner the server named', async () => {
        const decided = sessionSettled.matches.find(m => m.winnerDiscordId);
        const winnerName = [decided.black, decided.white].find(p => p.discordId === decided.winnerDiscordId).discordName;

        render(sessionSettled);
        await screen.findByRole('heading', { name: `Session ${sessionSettled.session.number}` });

        expect(screen.getByText(winnerName).closest('a')).toHaveClass('winner');
    });

    /** ⚠ Only the spectator link ever leaves the server; the two invite links never do, on any route. */
    it('offers the spectator link and nothing else', async () => {
        render(sessionSettled);
        await screen.findByRole('heading', { name: `Session ${sessionSettled.session.number}` });

        const links = screen.getAllByRole('link', { name: 'Voir la partie' });
        expect(links.length).toBeGreaterThan(0);
        for (const link of links) {
            expect(link.getAttribute('href')).toMatch(/^https:\/\/online-go\.com\/game\//);
        }
        expect(document.body.innerHTML).not.toMatch(/invite/i);
    });

    it('lists the players the draw could not pair, with the reason', async () => {
        const exemption = sessionExempted.exemptions[0];
        expect(exemption, 'the captured session 3 should still hold an exemption').toBeDefined();

        render(sessionExempted);
        await screen.findByRole('heading', { name: 'Sans adversaire' });

        expect(screen.getByText(exemption.discordName)).toBeInTheDocument();
        expect(screen.getByText('effectif impair')).toBeInTheDocument();
        expect(screen.getByText(/ne rapporte aucun point/)).toBeInTheDocument();
    });

    /**
     * An empty match list means two different things, and `drawn` is the only thing that separates them: never drawn
     * versus drawn with nobody to pair.
     */
    it('tells an undrawn session from one drawn with nobody to pair', async () => {
        expect(sessionUndrawn.session.drawn).toBe(false);

        render(sessionUndrawn);
        await screen.findByRole('heading', { name: `Session ${sessionUndrawn.session.number}` });

        expect(screen.getByText("Cette session n'a pas encore été tirée.")).toBeInTheDocument();
    });

    it('says a drawn session formed no pairing when that is what happened', async () => {
        const drawnButEmpty = { ...sessionExempted, matches: [], session: { ...sessionExempted.session, drawn: true } };
        render(drawnButEmpty);
        await screen.findByRole('heading', { name: `Session ${drawnButEmpty.session.number}` });

        expect(screen.getByText(/n'a formé aucune rencontre/)).toBeInTheDocument();
    });

    it('treats a session number outside the season as missing', async () => {
        stubApi({ '/api/league/session/': { status: 404 } });
        renderAt(<LeagueSession />, { path: '/league/session/99', route: '/league/session/:number' });

        expect(await screen.findByText(/La saison ne compte pas de session 99/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Retour à la ligue' })).toHaveAttribute('href', '/league');
    });

    it('reports a server failure as a failure', async () => {
        stubApi({ '/api/league/session/': { status: 500 } });
        renderAt(<LeagueSession />, { path: '/league/session/1', route: '/league/session/:number' });

        expect(await screen.findByText('Erreur lors de la récupération de la session')).toBeInTheDocument();
    });
});

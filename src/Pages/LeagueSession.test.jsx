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

/** The lists holding match cards, in document order — the exemptions are a list too, and are not one of these. */
const matchLists = () => [...new Set(screen.getAllByRole('article').map(card => card.closest('ul')))];

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
    it('marks the winner the server named, and the other side as the loser', async () => {
        const decided = sessionSettled.matches.find(m => m.winnerDiscordId);
        const winner = [decided.black, decided.white].find(p => p.discordId === decided.winnerDiscordId);
        const loser = [decided.black, decided.white].find(p => p.discordId !== decided.winnerDiscordId);

        render(sessionSettled);
        await screen.findByRole('heading', { name: `Session ${sessionSettled.session.number}` });

        expect(screen.getByText(winner.discordName).closest('a')).toHaveClass('winner');
        expect(screen.getByText(loser.discordName).closest('a')).toHaveClass('loser');
    });

    /**
     * Green and red are a verdict, and a match nobody won carries none: the two sides stay gold, whether the game is
     * still to come or was closed without being played.
     */
    it('leaves both sides undecided when no winner was named', async () => {
        const forfeited = sessionSettled.matches.find(m => m.result === 'unplayed');

        render(sessionSettled);
        await screen.findByRole('heading', { name: `Session ${sessionSettled.session.number}` });

        for (const player of [forfeited.black, forfeited.white]) {
            const side = screen.getByText(player.discordName).closest('a');
            expect(side).toHaveClass('undecided');
            expect(side).not.toHaveClass('winner');
            expect(side).not.toHaveClass('loser');
        }
    });

    it('leaves both sides of a fixture still to play undecided', async () => {
        render(sessionRunning);
        await screen.findByRole('heading', { name: `Session ${sessionRunning.session.number}` });

        const sides = sessionRunning.matches.flatMap(m => [m.black, m.white]);
        for (const player of sides) {
            expect(screen.getByText(player.discordName).closest('a')).toHaveClass('undecided');
        }
    });

    /**
     * A schedule and a set of results are read for different reasons, so they are two lists, the closed ones first,
     * with a rule between them. Nothing is titled: the cards already say which is which.
     */
    it('separates the matches played from the ones still to play', async () => {
        const mixed = {
            ...sessionRunning,
            matches: [sessionRunning.matches[0], sessionSettled.matches[0]],
        };
        const listOf = match => screen.getByText(match.black.discordName).closest('ul');

        render(mixed);
        await screen.findByRole('heading', { name: `Session ${mixed.session.number}` });

        const separator = screen.getByRole('separator');
        const lists = matchLists();

        expect(lists).toHaveLength(2);
        expect(listOf(sessionSettled.matches[0])).toBe(lists[0]);
        expect(listOf(sessionRunning.matches[0])).toBe(lists[1]);
        expect(lists[0].compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(lists[1].compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    /** One block is one block: the rule only appears where there is something on either side of it. */
    it('draws no separator when every match is on the same side of it', async () => {
        render(sessionRunning);
        await screen.findByRole('heading', { name: `Session ${sessionRunning.session.number}` });

        expect(screen.queryByRole('separator')).not.toBeInTheDocument();
        expect(matchLists()).toHaveLength(1);
    });

    it('files a match a settled session never resolved among the finished ones', async () => {
        const settledWithoutResult = {
            ...sessionSettled,
            matches: [{ ...sessionSettled.matches[0], result: null, winnerDiscordId: null }],
        };

        render(settledWithoutResult);
        await screen.findByRole('heading', { name: `Session ${sessionSettled.session.number}` });

        expect(screen.queryByRole('separator')).not.toBeInTheDocument();
        expect(screen.getByText('Sans résultat')).toBeInTheDocument();
    });

    /**
     * The crest sits on the outer edge of each side — the mirroring is done in CSS, so the DOM order stays the same
     * on both and a screen reader reads them the same way round.
     */
    it('gives each side its house crest, on the outer edge', async () => {
        const match = sessionSettled.matches.find(m => m.black.house && m.white.house);
        expect(match, 'the captured session should still hold a match with two housed players').toBeDefined();

        render(sessionSettled);
        await screen.findByRole('heading', { name: `Session ${sessionSettled.session.number}` });

        // The spectator link sits between the two sides, so the sides are picked by name rather than by position.
        const card = cardOf(match.black.discordName);
        const sideOf = player => within(card).getByText(player.discordName).closest('a');

        expect(sideOf(match.black)).toHaveClass('black');
        expect(sideOf(match.white)).toHaveClass('white');
        // The card is roomy enough for the full drawing here, unlike a standings row.
        for (const player of [match.black, match.white]) {
            expect(within(sideOf(player)).getByAltText(player.house.name))
                .toHaveAttribute('src', `/crests/${player.house.slug}.svg`);
        }
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

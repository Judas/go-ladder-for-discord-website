import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import League from './League.jsx';
import { league } from '../__fixtures__/league.js';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';

const rowOf = name => screen.getByText(name).closest('[role="row"]');

describe('League', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('renders the standings and the calendar, and warns about nothing', async () => {
        stubApi({ '/api/league': league });
        await expectNoConsoleErrors(async () => {
            renderAt(<League />, { path: '/league' });
            await screen.findByRole('heading', { name: 'Classement' });
        });

        for (const player of league.standings) {
            expect(screen.getByText(player.discordName)).toBeInTheDocument();
        }
        expect(screen.getAllByRole('link', { name: /Session|^\d+/ }).length).toBeGreaterThanOrEqual(league.sessions.length);
    });

    /**
     * The calendar carries the state of the season on its own: the "session en cours" block is gone, so a tile has to
     * say where it sits. Which one is running is the server's call, since currentSession is null out of season and
     * inside the two holes of the calendar; past and upcoming are read off `end`, served as an ISO instant for
     * exactly that.
     */
    it('marks each session as past, running or still to come', async () => {
        const sessions = [
            { ...league.sessions[0], number: 1, end: '2020-01-01T00:00:00+01:00' },
            { ...league.sessions[1], number: 2, end: '2020-02-01T00:00:00+01:00' },
            { ...league.sessions[2], number: 3, end: '2099-01-01T00:00:00+01:00' },
        ];
        const current = sessions[1];

        stubApi({ '/api/league': { ...league, period: 'SEASON', currentSession: current, sessions } });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Calendrier' });

        const tiles = within(screen.getAllByRole('list')[0]).getAllByRole('link');
        expect(tiles[0]).toHaveClass('past');
        expect(tiles[1]).toHaveClass('current');
        expect(tiles[2]).toHaveClass('upcoming');
    });

    /** A finished season is entirely behind us, and none of its tiles is the running one. */
    it('shows a finished season as wholly past', async () => {
        expect(league.currentSession, 'the capture was taken out of season').toBeNull();

        stubApi({ '/api/league': league });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Calendrier' });

        const tiles = within(screen.getAllByRole('list')[0]).getAllByRole('link');
        expect(tiles.every(tile => tile.classList.contains('past'))).toBe(true);
        expect(tiles.some(tile => tile.classList.contains('current'))).toBe(false);
    });

    /**
     * `settled` would be the tempting shortcut and it is wrong: out of season every session played is settled and
     * every session never drawn is not, so half a finished season would come back as still to come.
     */
    it('does not read "still to come" off an undrawn session', async () => {
        const undrawn = league.sessions.map(s => ({ ...s, drawn: false, settled: false }));

        stubApi({ '/api/league': { ...league, sessions: undrawn } });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Calendrier' });

        const tiles = within(screen.getAllByRole('list')[0]).getAllByRole('link');
        expect(tiles.every(tile => tile.classList.contains('past'))).toBe(true);
    });

    /**
     * The whole calendar comes in one response so a page needs no sixteen calls, and its two holes are read by
     * absence: nothing sits between session 6 and session 7 while the numbering stays continuous.
     */
    it('lists every session the server sends, with the calendar holes left as they are', async () => {
        stubApi({ '/api/league': league });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Calendrier' });

        const calendar = screen.getAllByRole('list')[0];
        expect(within(calendar).getAllByRole('listitem')).toHaveLength(league.sessions.length);

        const sixth = league.sessions.find(s => s.number === 6);
        const seventh = league.sessions.find(s => s.number === 7);
        expect(sixth.label).toMatch(/décembre/);
        expect(seventh.label).toMatch(/janvier/);
    });

    it('prints the served rank, ties included', async () => {
        const tied = league.standings.filter(s => s.rank === 1);
        expect(tied.length, 'the captured standings should still hold the tie at the top').toBeGreaterThan(1);

        stubApi({ '/api/league': league });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Classement' });

        for (const player of tied) {
            expect(within(rowOf(player.discordName)).getAllByRole('gridcell')[0]).toHaveTextContent('1');
        }
    });

    /**
     * The perfect-attendance bonus is `played + exempted == sessionCount`, so a page showing only `played` would
     * make a legitimate bonus look wrongly awarded.
     */
    it('shows the exemption count beside the matches played', async () => {
        const exempted = league.standings.find(s => s.exempted > 0);
        expect(exempted, 'the captured standings should still hold an exempted player').toBeDefined();

        stubApi({ '/api/league': league });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Classement' });

        const cells = within(rowOf(exempted.discordName)).getAllByRole('gridcell');
        expect(cells[4]).toHaveTextContent(String(exempted.played));
        expect(cells[5]).toHaveTextContent(String(exempted.won));
        expect(cells[6]).toHaveTextContent(String(exempted.lost));
        expect(cells[7]).toHaveTextContent(String(exempted.exempted));
        expect(cells[8]).toHaveTextContent(String(exempted.renown.total));
    });

    /**
     * The standings repeat a crest once per row, so they use the simplified drawing rather than the full one — it
     * holds up at 28px, where the detailed crest turns to mud, and it is an order of magnitude lighter.
     */
    it('uses the small crest in the standings', async () => {
        const housed = league.standings.find(s => s.house);
        expect(housed, 'the captured standings should still hold a player with a house').toBeDefined();

        stubApi({ '/api/league': league });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Classement' });

        const crest = within(rowOf(housed.discordName)).getByAltText(housed.house.name);
        expect(crest).toHaveAttribute('src', `/crests/${housed.house.slug}_SMALL.svg`);
    });

    /**
     * E is exemptions, not draws — and it has to stay: the perfect-attendance bonus is
     * `played + exempted == sessionCount`, so a table showing only `played` makes a legitimate bonus look wrongly
     * awarded to anyone adding the column up.
     */
    it('names the exemptions column for anyone who cannot see the letter', async () => {
        stubApi({ '/api/league': league });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Classement' });

        expect(screen.getByRole('columnheader', { name: /Exemptions/ })).toBeInTheDocument();
    });

    /** Inactive players keep their renown and their rank; they are simply no longer drawn. */
    it('keeps players who left the league in the standings', async () => {
        const gone = league.standings.filter(s => !s.active);
        expect(gone.length, 'the captured standings should still hold an inactive member').toBeGreaterThan(0);

        stubApi({ '/api/league': league });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Classement' });

        for (const player of gone) {
            const row = rowOf(player.discordName);
            // Marked as no longer drawn — the wording is free to change, the marking is not.
            expect(row).toHaveClass('inactive');
            // And still holding everything they earned.
            expect(within(row).getAllByRole('gridcell')[0]).toHaveTextContent(String(player.rank));
            expect(within(row).getAllByRole('gridcell')[8]).toHaveTextContent(String(player.renown.total));
        }
    });

    /** sessionCount is served; hardcoding 16 would be wrong the day the split changes. */
    it('takes the season length from the response', async () => {
        stubApi({ '/api/league': { ...league, sessionCount: 12 } });
        renderAt(<League />, { path: '/league' });

        expect(await screen.findByText(/les 12 sessions de la saison/)).toBeInTheDocument();
    });

    it('says so when nobody has joined yet', async () => {
        stubApi({ '/api/league': { ...league, standings: [] } });
        renderAt(<League />, { path: '/league' });

        expect(await screen.findByText(/Personne n'a encore rejoint la ligue/)).toBeInTheDocument();
    });

    it('shows an error when the route fails', async () => {
        stubApi({ '/api/league': { status: 500 } });
        renderAt(<League />, { path: '/league' });

        expect(await screen.findByText('Erreur lors de la récupération de la ligue')).toBeInTheDocument();
    });
});

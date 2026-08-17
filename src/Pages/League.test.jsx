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
     * currentSession is null out of season and inside the two holes of the calendar. That is an answer, not a gap,
     * and a page that showed nothing there would look broken rather than out of season.
     */
    it('says when no session is running', async () => {
        expect(league.currentSession, 'the capture was taken out of season').toBeNull();

        stubApi({ '/api/league': league });
        renderAt(<League />, { path: '/league' });

        expect(await screen.findByText('Aucune session en cours.')).toBeInTheDocument();
    });

    it('highlights the running session when there is one', async () => {
        const current = { ...league.sessions[7], drawn: true, settled: false };
        stubApi({ '/api/league': { ...league, period: 'SEASON', currentSession: current } });
        renderAt(<League />, { path: '/league' });

        expect(await screen.findByText(`Session ${current.number}`)).toBeInTheDocument();
        expect(screen.getAllByText(current.label).length).toBeGreaterThan(0);
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

    /** Inactive players keep their renown and their rank; they are simply no longer drawn. */
    it('keeps players who left the league in the standings', async () => {
        const gone = league.standings.filter(s => !s.active);
        expect(gone.length, 'the captured standings should still hold an inactive member').toBeGreaterThan(0);

        stubApi({ '/api/league': league });
        renderAt(<League />, { path: '/league' });
        await screen.findByRole('heading', { name: 'Classement' });

        for (const player of gone) {
            const row = rowOf(player.discordName);
            expect(within(row).getByText('a quitté la ligue')).toBeInTheDocument();
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

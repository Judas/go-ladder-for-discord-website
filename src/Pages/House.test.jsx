import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import House from './House.jsx';
import { houseDetail, houseDetailEmpty } from '../__fixtures__/houses.js';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';

const FILS = houseDetail.FILS_DU_FROID;
const NEXUS = houseDetail.NEXUS_ALPHA;

const render = (slug, payload) => {
    stubApi({ '/api/house/': payload });
    return renderAt(<House />, { path: `/house/${slug}`, route: '/house/:slug' });
};

const rowOf = name => screen.getByText(name).closest('[role="row"]');

/** The rank is the first cell. Queried by position, because the figure itself repeats in the breakdown. */
const rankOf = name => within(rowOf(name)).getAllByRole('gridcell')[0];

describe('House', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('renders a house with its ranking, and warns about nothing', async () => {
        await expectNoConsoleErrors(async () => {
            render('FILS_DU_FROID', FILS);
            await screen.findByRole('heading', { name: FILS.house.name });
        });

        expect(screen.getByText(FILS.house.tagline)).toBeInTheDocument();
        expect(screen.getByText(FILS.house.description)).toBeInTheDocument();
        expect(screen.getByAltText(FILS.house.name)).toHaveAttribute('src', `/crests/${FILS.house.slug}.svg`);

        for (const member of FILS.members) {
            expect(screen.getByText(member.discordName)).toBeInTheDocument();
        }
    });

    /**
     * Competition ranks: Nexus Alpha's two members are tied on 17 and the server answers rank 1 for both. The page
     * prints what it is given — counting rows would have produced a 1 and a 2.
     */
    it('prints the served rank rather than the row position', async () => {
        const tied = NEXUS.members.filter(m => m.rank === 1);
        expect(tied.length, 'the captured payload should still hold the tie').toBeGreaterThan(1);

        render('NEXUS_ALPHA', NEXUS);
        await screen.findByRole('heading', { name: NEXUS.house.name });

        for (const member of tied) {
            expect(rankOf(member.discordName)).toHaveTextContent(String(member.rank));
        }
    });

    /** A member who has scored nothing stays in the ranking; a roster that hides its quiet members lies about itself. */
    it('keeps a member on zero points in the ranking', async () => {
        const silent = FILS.members.find(m => m.points.total === 0);
        expect(silent, 'the captured payload should still hold a zero-point member').toBeDefined();

        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        expect(rankOf(silent.discordName)).toHaveTextContent(String(silent.rank));
    });

    /**
     * The seven headers are an emoji, so the real label only exists for screen readers — losing it would leave the
     * columns unnameable to anyone not looking at the glyphs.
     */
    it('names every scoring column for a screen reader', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        for (const label of ['Partie jouée', 'Adversaire GOLD', 'Adversaire dans une maison rivale',
                             'Partie longue', 'Victoire', 'Partie à égalité', 'Partie classée']) {
            expect(screen.getByRole('columnheader', { name: new RegExp(label) })).toBeInTheDocument();
        }
    });

    it('puts the seven figures and the total on the member row, in the served order', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        const leader = FILS.members[0];
        const cells = within(rowOf(leader.discordName)).getAllByRole('gridcell');

        // rank, avatar, name, then the seven columns, then the total: one line, eleven cells.
        expect(cells).toHaveLength(11);
        const served = ['played', 'goldOpponent', 'rivalHouse', 'longGame', 'victory', 'evenGame', 'ranked']
            .map(key => String(leader.points[key]));
        expect(cells.slice(3, 10).map(cell => cell.textContent)).toEqual(served);

        // The total is the server's, never a sum recomputed here.
        expect(cells[10]).toHaveTextContent(String(leader.points.total));
    });

    /**
     * The scale is behind a button now, and it is the only place the header emoji are explained — so a broken toggle
     * does not just hide a nicety, it makes seven columns unreadable.
     */
    it('keeps the scoring scale behind the info button, and opens it on click', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        // The panel carries no heading of its own, so its close button is what says it is open.
        expect(screen.queryByRole('button', { name: 'Fermer' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Comment les points sont comptés' }));

        // Scoped to the panel: each label also exists in the column header, where it is screen-reader only.
        const panel = screen.getByRole('button', { name: 'Fermer' }).parentElement;
        for (const column of ['Partie jouée', 'Victoire', 'Partie classée']) {
            expect(within(panel).getByText(column)).toBeInTheDocument();
        }
        // All seven columns are explained, not a subset: the emoji headers have no other legend.
        expect(within(panel).getAllByRole('listitem')).toHaveLength(7);
    });

    it('closes the scoring overlay again', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        await userEvent.click(screen.getByRole('button', { name: 'Comment les points sont comptés' }));
        await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));

        expect(screen.queryByRole('button', { name: 'Fermer' })).not.toBeInTheDocument();
    });

    it('does not offer a way back from a house that loaded', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        expect(screen.queryByRole('link', { name: 'Retour aux maisons' })).not.toBeInTheDocument();
    });

    it('links each member to their profile', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        const leader = FILS.members[0];
        expect(within(rowOf(leader.discordName)).getByRole('link'))
            .toHaveAttribute('href', `/player/${leader.discordId}`);
    });

    it('says so when the house has no member, without hiding its points', async () => {
        render('SABRE_SILENCIEUX', houseDetailEmpty);
        await screen.findByRole('heading', { name: houseDetailEmpty.house.name });

        expect(screen.getByText("Aucun membre pour l'instant.")).toBeInTheDocument();
        expect(screen.getByText('Points')).toBeInTheDocument();
    });

    /**
     * memberCount counts the house's members, the list only holds the ones with a Discord profile row. The two can
     * legitimately disagree, and the page says so rather than letting the reader notice a mismatch alone.
     */
    it('accounts for members the ranking cannot show', async () => {
        const payload = { ...FILS, house: { ...FILS.house, memberCount: FILS.members.length + 2 } };
        render('FILS_DU_FROID', payload);
        await screen.findByRole('heading', { name: FILS.house.name });

        expect(screen.getByText(/2 membres sans profil Discord ne sont pas affichés/)).toBeInTheDocument();
    });

    it('treats an unknown slug as a missing house, not as a breakdown', async () => {
        stubApi({ '/api/house/': { status: 404 } });
        renderAt(<House />, { path: '/house/NOPE', route: '/house/:slug' });

        expect(await screen.findByText(/Aucune maison ne porte le nom/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Retour aux maisons' })).toHaveAttribute('href', '/houses');
    });

    it('reports a server failure as a failure', async () => {
        stubApi({ '/api/house/': { status: 500 } });
        renderAt(<House />, { path: '/house/FILS_DU_FROID', route: '/house/:slug' });

        expect(await screen.findByText('Erreur lors de la récupération de la maison')).toBeInTheDocument();
    });

    /** The calendar banner belongs to /houses; a single house does not repeat it. */
    it('leaves the calendar banner to the houses list', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        expect(screen.queryByText('Intersaison')).not.toBeInTheDocument();
    });
});

import { screen, within } from '@testing-library/react';
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

    it('shows the seven scoring columns and the total the server computed', async () => {
        render('FILS_DU_FROID', FILS);
        await screen.findByRole('heading', { name: FILS.house.name });

        const leader = FILS.members[0];
        const row = rowOf(leader.discordName);

        for (const label of ['Jouée', 'GOLD', 'Rivale', 'Longue', 'Victoire', 'Égale', 'Classée']) {
            expect(within(row).getByText(label)).toBeInTheDocument();
        }
        // The total is the server's, never a sum recomputed here.
        expect(within(row).getByText(String(leader.points.total))).toBeInTheDocument();
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

    it('carries the calendar banner', async () => {
        render('FILS_DU_FROID', FILS);

        expect(await screen.findByText('Intersaison')).toBeInTheDocument();
    });
});

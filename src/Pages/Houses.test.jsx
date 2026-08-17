import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Houses from './Houses.jsx';
import { housesEmpty, housesPopulated } from '../__fixtures__/houses.js';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';

/** The captured payload was taken during the summer break; this is the same data with a season under way. */
const inSeason = { ...housesPopulated, period: 'SEASON', season: '2026-2027' };

/**
 * A card no longer carries a heading — the house name lives in the crest's alt text and nowhere else, so that is
 * what every lookup here goes through.
 */
const byName = name => screen.getByAltText(name).closest('li');

/** The house names in the order the page lays them out, read off the crests. */
const renderedOrder = () => within(screen.getByRole('list'))
    .getAllByRole('img')
    .filter(img => img.getAttribute('src')?.startsWith('/crests/'))
    .map(img => img.getAttribute('alt'));

describe('Houses', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('renders the four houses of an empty season, and warns about nothing', async () => {
        stubApi({ '/api/houses': housesEmpty });
        await expectNoConsoleErrors(async () => {
            renderAt(<Houses />, { path: '/houses' });
            await screen.findByAltText('Fils du Froid');
        });

        for (const house of housesEmpty.houses) {
            expect(screen.getByAltText(house.name)).toBeInTheDocument();
            expect(screen.getByAltText(house.name)).toHaveAttribute('src', `/crests/${house.slug}.svg`);
            expect(within(byName(house.name)).getByText("Aucun membre pour l'instant")).toBeInTheDocument();
        }
    });

    it('renders a populated season, and warns about nothing', async () => {
        stubApi({ '/api/houses': housesPopulated });
        await expectNoConsoleErrors(async () => {
            renderAt(<Houses />, { path: '/houses' });
            await screen.findByAltText('Fils du Froid');
        });

        for (const house of housesPopulated.houses.filter(h => h.leader)) {
            expect(within(byName(house.name)).getByText(house.leader.discordName)).toBeInTheDocument();
            expect(within(byName(house.name)).getByText(`${house.leader.points.total} pts`)).toBeInTheDocument();
        }
    });

    /**
     * The order is fixed and owned by the page, not by the API — which sorts by points and, in the captured payload,
     * puts them in a different order. The assertion below on the API order is what keeps this test meaningful: if a
     * re-capture ever happened to match the display order, the reordering would no longer be under test.
     */
    it('always shows the houses in the same order, whatever the server sends', async () => {
        const expected = ['Fils du Froid', 'Nexus Alpha', 'Sabre Silencieux', 'Lunaires d’Æther'];
        expect(housesPopulated.houses.map(h => h.name)).not.toEqual(expected);

        stubApi({ '/api/houses': housesPopulated });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByAltText('Fils du Froid');

        expect(renderedOrder()).toEqual(expected);
    });

    it('shows the same order when the season is empty', async () => {
        stubApi({ '/api/houses': housesEmpty });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByAltText('Fils du Froid');

        expect(renderedOrder()).toEqual(['Fils du Froid', 'Nexus Alpha', 'Sabre Silencieux', 'Lunaires d’Æther']);
    });

    /** A house the display order does not know must still appear, rather than being dropped. */
    it('keeps an unknown house rather than losing it', async () => {
        const newcomer = { ...housesPopulated.houses[0], slug: 'ORDRE_INCONNU', name: 'Ordre Inconnu' };
        stubApi({ '/api/houses': { ...housesPopulated, houses: [newcomer, ...housesPopulated.houses] } });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByAltText('Ordre Inconnu');

        const names = renderedOrder();
        expect(names).toHaveLength(5);
        expect(names[4]).toBe('Ordre Inconnu');
    });

    it('numbers nothing: a fixed position says nothing about standing', async () => {
        stubApi({ '/api/houses': housesPopulated });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByAltText('Fils du Froid');

        for (const card of screen.getAllByRole('listitem')) {
            expect(within(card).queryByText(/^[1-4](er|e|ème)$/)).not.toBeInTheDocument();
        }
    });

    /**
     * Sabre Silencieux totals 12 with no member: the register keeps what a player who has since left scored, so the
     * total and the headcount are independent and neither may be derived from the other.
     */
    it('shows a house with points but no member without inventing a leader', async () => {
        const orphan = housesPopulated.houses.find(h => h.memberCount === 0 && h.totalPoints > 0);
        expect(orphan, 'the captured payload should still contain the no-member-with-points case').toBeDefined();

        stubApi({ '/api/houses': housesPopulated });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByAltText(orphan.name);

        const card = byName(orphan.name);
        expect(within(card).getByText("Aucun membre pour l'instant")).toBeInTheDocument();
        expect(within(card).getByText(String(orphan.totalPoints))).toBeInTheDocument();
        expect(within(card).getByText('0')).toBeInTheDocument();
    });

    /**
     * `discord_user_info.discord_name` is NOT NULL, so no seed can produce this — but ApiHouseMember declares the
     * field nullable and the site must not print "undefined" the day the server changes its mind.
     */
    it('falls back to the Discord id when a leader has no name', async () => {
        const houses = housesPopulated.houses.map(house => (
            house.leader ? { ...house, leader: { ...house.leader, discordName: null } } : house
        ));
        stubApi({ '/api/houses': { ...housesPopulated, houses } });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByAltText('Fils du Froid');

        const leader = houses.find(h => h.leader).leader;
        expect(screen.getByText(leader.discordId)).toBeInTheDocument();
    });

    it('links each house to its own page and each leader to their profile', async () => {
        stubApi({ '/api/houses': housesPopulated });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByAltText('Fils du Froid');

        const house = housesPopulated.houses.find(h => h.leader);
        expect(screen.getByRole('link', { name: new RegExp(house.name) })).toHaveAttribute('href', `/house/${house.slug}`);
        expect(screen.getByRole('link', { name: new RegExp(house.leader.discordName) }))
            .toHaveAttribute('href', `/player/${house.leader.discordId}`);
    });

    it('says the season is over during the break', async () => {
        stubApi({ '/api/houses': housesEmpty });
        renderAt(<Houses />, { path: '/houses' });

        expect(await screen.findByText('Intersaison')).toBeInTheDocument();
        expect(screen.getByText(/est terminée/)).toBeInTheDocument();
    });

    it('names the running season during one', async () => {
        stubApi({ '/api/houses': inSeason });
        renderAt(<Houses />, { path: '/houses' });

        expect(await screen.findByText('Saison 2026-2027')).toBeInTheDocument();
    });

    it('carries the framing lore, which lives here and not in the database', async () => {
        stubApi({ '/api/houses': housesEmpty });
        renderAt(<Houses />, { path: '/houses' });

        expect(await screen.findByRole('heading', { name: "La chute de l'Harmonie" })).toBeInTheDocument();
        expect(screen.getByText(/Partie des Ruptures/)).toBeInTheDocument();
        // The closing paragraphs come from the component /league shares, so this page must still show them.
        expect(screen.getByText(/la guerre des âmes qui se poursuit/)).toBeInTheDocument();
    });

    it('shows an error when the route fails', async () => {
        stubApi({ '/api/houses': { status: 500 } });
        renderAt(<Houses />, { path: '/houses' });

        expect(await screen.findByText('Erreur lors de la récupération des maisons')).toBeInTheDocument();
    });
});

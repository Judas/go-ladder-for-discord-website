import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Houses from './Houses.jsx';
import { housesEmpty, housesPopulated } from '../__fixtures__/houses.js';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';

describe('Houses', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('renders the four houses of an empty season, and warns about nothing', async () => {
        stubApi({ '/api/houses': housesEmpty });
        await expectNoConsoleErrors(async () => {
            renderAt(<Houses />, { path: '/houses' });
            await screen.findByRole('heading', { name: 'Fils du Froid' });
        });

        for (const house of housesEmpty.houses) {
            expect(screen.getByRole('heading', { name: house.name })).toBeInTheDocument();
            expect(screen.getByAltText(house.name)).toHaveAttribute('src', `/crests/${house.slug}.svg`);
        }
    });

    it('renders a populated season, and warns about nothing', async () => {
        stubApi({ '/api/houses': housesPopulated });
        await expectNoConsoleErrors(async () => {
            renderAt(<Houses />, { path: '/houses' });
            await screen.findByRole('heading', { name: 'Fils du Froid' });
        });

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('keeps the order the server sends, and numbers nothing', async () => {
        stubApi({ '/api/houses': housesPopulated });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByRole('heading', { name: 'Fils du Froid' });

        const list = screen.getByRole('list');
        const names = within(list).getAllByRole('heading', { level: 3 }).map(h => h.textContent);
        expect(names).toEqual(housesPopulated.houses.map(h => h.name));

        // Two houses are tied on 40 points. A printed position would claim a 2nd and a 3rd where there are two 2nds.
        const cards = screen.getAllByRole('listitem');
        for (const card of cards) {
            expect(within(card).queryByText(/^[1-4](er|e|ème)$/)).not.toBeInTheDocument();
        }
    });

    it('shows a house with points but no member without inventing a leader', async () => {
        stubApi({ '/api/houses': housesPopulated });
        renderAt(<Houses />, { path: '/houses' });
        const heading = await screen.findByRole('heading', { name: 'Sabre Silencieux' });

        const card = heading.closest('li');
        expect(within(card).getByText("Aucun membre pour l'instant")).toBeInTheDocument();
        expect(within(card).getByText('12')).toBeInTheDocument();
        expect(within(card).getByText('0')).toBeInTheDocument();
    });

    it('falls back to the Discord id when a leader has no name', async () => {
        stubApi({ '/api/houses': housesPopulated });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByRole('heading', { name: 'Nexus Alpha' });

        expect(screen.getByText('333')).toBeInTheDocument();
    });

    it('links each house to its own page and each leader to their profile', async () => {
        stubApi({ '/api/houses': housesPopulated });
        renderAt(<Houses />, { path: '/houses' });
        await screen.findByRole('heading', { name: 'Fils du Froid' });

        expect(screen.getByRole('link', { name: /Fils du Froid/ })).toHaveAttribute('href', '/house/FILS_DU_FROID');
        expect(screen.getByRole('link', { name: /Alice/ })).toHaveAttribute('href', '/player/111');
    });

    it('says the season is over during the break', async () => {
        stubApi({ '/api/houses': housesEmpty });
        renderAt(<Houses />, { path: '/houses' });

        expect(await screen.findByText('Intersaison')).toBeInTheDocument();
        expect(screen.getByText(/La saison 2025-2026 est terminée/)).toBeInTheDocument();
    });

    it('names the running season during one', async () => {
        stubApi({ '/api/houses': housesPopulated });
        renderAt(<Houses />, { path: '/houses' });

        expect(await screen.findByText('Saison 2026-2027')).toBeInTheDocument();
    });

    it('carries the framing lore, which lives here and not in the database', async () => {
        stubApi({ '/api/houses': housesEmpty });
        renderAt(<Houses />, { path: '/houses' });

        expect(await screen.findByRole('heading', { name: "La chute de l'Harmonie" })).toBeInTheDocument();
        expect(screen.getByText(/Partie des Ruptures/)).toBeInTheDocument();
    });

    it('shows an error when the route fails', async () => {
        stubApi({ '/api/houses': { status: 500 } });
        renderAt(<Houses />, { path: '/houses' });

        expect(await screen.findByText('Erreur lors de la récupération des maisons')).toBeInTheDocument();
    });
});

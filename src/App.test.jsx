import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import AuthProvider from './AuthProvider.jsx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App.jsx';

/**
 * A smoke test, not a feature test: it renders the whole app through the router and asserts the chrome is there.
 *
 * Its job is to catch a dependency bump that breaks rendering — React, react-router and react-icons all sit on this
 * path — which a build alone does not, since the build never executes a component.
 */
describe('App', () => {
    beforeEach(() => {
        // Every page fetches on mount. Reject, so the pages land in their 'error' branch rather than hanging.
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no backend in tests'))));
        localStorage.clear();
    });

    it('renders the navigation and the footer on the home route, which is the games page', () => {
        render(<MemoryRouter initialEntries={['/']}><AuthProvider><App /></AuthProvider></MemoryRouter>);

        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Communauté' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Aurak' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'À propos' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Parties' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Parties live' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Parties récentes' })).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('opens a section on click, and closes it when a link is followed', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter initialEntries={['/']}><AuthProvider><App /></AuthProvider></MemoryRouter>);

        // A section is not a page: closed, its links are not there to follow.
        expect(screen.queryByRole('link', { name: 'Joueurs' })).not.toBeInTheDocument();

        const community = screen.getByRole('button', { name: 'Communauté' });
        await user.click(community);
        expect(community).toHaveAttribute('aria-expanded', 'true');

        // Games first, players under it.
        const links = within(screen.getByRole('list')).getAllByRole('link').map(link => link.textContent);
        expect(links).toEqual(['Parties', 'Joueurs']);

        await user.click(screen.getByRole('link', { name: 'Joueurs' }));
        expect(community).toHaveAttribute('aria-expanded', 'false');
        expect(await screen.findByRole('heading', { name: 'Liste des joueurs' })).toBeInTheDocument();
    });

    it('leads home from the logo', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter initialEntries={['/about']}><AuthProvider><App /></AuthProvider></MemoryRouter>);
        await screen.findByRole('heading', { name: 'À propos' });

        await user.click(screen.getByRole('link', { name: 'Accueil' }));
        expect(await screen.findByRole('heading', { name: 'Parties' })).toBeInTheDocument();
    });

    it('no longer links the services page from the footer', () => {
        render(<MemoryRouter initialEntries={['/']}><AuthProvider><App /></AuthProvider></MemoryRouter>);

        expect(screen.queryByRole('link', { name: 'État des services' })).not.toBeInTheDocument();
    });

    it('offers Discord sign-in when no profile is stored', () => {
        render(<MemoryRouter initialEntries={['/']}><AuthProvider><App /></AuthProvider></MemoryRouter>);

        expect(screen.getByRole('link', { name: 'Discord' })).toBeInTheDocument();
    });

    it('renders the about page, including the tier fetch failure', async () => {
        render(<MemoryRouter initialEntries={['/about']}><AuthProvider><App /></AuthProvider></MemoryRouter>);

        expect(await screen.findByRole('heading', { name: 'À propos' })).toBeInTheDocument();
    });
});

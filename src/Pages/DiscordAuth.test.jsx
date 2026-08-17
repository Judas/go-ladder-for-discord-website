import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DiscordAuth from './DiscordAuth.jsx';
import { renderAt } from '../testUtils.jsx';

/** Answers the OAuth exchange and the profile lookup that follows it. */
const stubAuth = (profile = { discordId: '900000000000001001', name: 'Moi', avatar: '', expirationDate: '2099-01-01T00:00:00Z' }) =>
    vi.fn(url => String(url).includes('/api/auth/profile')
        ? Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(profile) })
        : Promise.resolve({ ok: true, status: 200, statusText: 'OK' }));

const exchangeCalls = stub => stub.mock.calls.filter(([url]) => String(url) === '/api/auth');

describe('DiscordAuth', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    /**
     * Coming back from Discord with no code is an error before anything is attempted — derived at render rather
     * than written into state from an effect, which is why the exchange is never even attempted.
     *
     * The provider still asks who the visitor is at boot, so this counts calls to /api/auth rather than all of them.
     */
    it('fails without attempting the exchange when the URL carries no code', async () => {
        const fetchStub = stubAuth();
        vi.stubGlobal('fetch', fetchStub);

        renderAt(<DiscordAuth />, { path: '/auth/discord' });

        expect(await screen.findByText(/Erreur lors de l'authentification Discord/)).toBeInTheDocument();
        expect(exchangeCalls(fetchStub)).toHaveLength(0);
    });

    /**
     * The code goes to the server, and the identity is then re-read so the tree learns about it. That second step is
     * the point of the whole refactor: it replaced a `window.location.replace` that reloaded the page.
     */
    it('exchanges the code, then re-reads the identity', async () => {
        const fetchStub = stubAuth();
        vi.stubGlobal('fetch', fetchStub);
        localStorage.setItem('gold_uuid', JSON.stringify('uuid-1'));

        renderAt(<DiscordAuth />, { path: '/auth/discord?code=abc123', route: '/auth/discord' });

        await waitFor(() => expect(exchangeCalls(fetchStub)).toHaveLength(1));

        const [, options] = exchangeCalls(fetchStub)[0];
        expect(options.method).toBe('POST');
        expect(JSON.parse(options.body)).toEqual({ code: 'abc123', goldId: 'uuid-1' });

        // The profile is asked for again after the exchange, and stored — which is what signs the visitor in.
        await waitFor(() => expect(JSON.parse(localStorage.getItem('user_profile'))).not.toBeNull());
    });

    it('reports a refused exchange', async () => {
        vi.stubGlobal('fetch', vi.fn(url => String(url).includes('/api/auth/profile')
            ? Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' })
            : Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request' })));

        renderAt(<DiscordAuth />, { path: '/auth/discord?code=abc123', route: '/auth/discord' });

        expect(await screen.findByText(/Erreur lors de l'authentification/)).toBeInTheDocument();
    });
});

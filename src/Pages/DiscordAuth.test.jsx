import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DiscordAuth from './DiscordAuth.jsx';
import { renderAt } from '../testUtils.jsx';

const okOnce = () => vi.fn(() => Promise.resolve({ ok: true, status: 200, statusText: 'OK' }));

describe('DiscordAuth', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    /**
     * Coming back from Discord with no code is an error before anything is attempted — derived at render rather
     * than written into state from an effect, which is why nothing is fetched here at all.
     */
    it('fails without calling the API when the URL carries no code', async () => {
        const fetchStub = okOnce();
        vi.stubGlobal('fetch', fetchStub);

        renderAt(<DiscordAuth />, { path: '/auth/discord' });

        expect(await screen.findByText(/Erreur lors de l'authentification Discord/)).toBeInTheDocument();
        expect(fetchStub).not.toHaveBeenCalled();
    });

    it('exchanges the code for a session', async () => {
        const fetchStub = okOnce();
        vi.stubGlobal('fetch', fetchStub);
        localStorage.setItem('gold_uuid', JSON.stringify('uuid-1'));

        renderAt(<DiscordAuth />, { path: '/auth/discord?code=abc123', route: '/auth/discord' });

        expect(await screen.findByText(/Vous êtes bien authentifié/)).toBeInTheDocument();

        const [url, options] = fetchStub.mock.calls[0];
        expect(url).toBe('/api/auth');
        expect(options.method).toBe('POST');
        expect(JSON.parse(options.body)).toEqual({ code: 'abc123', goldId: 'uuid-1' });
    });

    it('reports a refused exchange', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request' })));

        renderAt(<DiscordAuth />, { path: '/auth/discord?code=abc123', route: '/auth/discord' });

        await waitFor(() => expect(screen.getByText(/Erreur lors de l'authentification/)).toBeInTheDocument());
    });
});

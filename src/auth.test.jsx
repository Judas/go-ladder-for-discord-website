import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AuthProvider from './AuthProvider.jsx';
import { useAuth, useIsSelf } from './auth.js';

const PROFILE = { discordId: '900000000000001001', name: 'Moi', avatar: '', expirationDate: '2099-01-01T00:00:00Z' };

function Probe() {
    const { profile, signedIn, refresh } = useAuth();
    const self = useIsSelf('900000000000001001');

    return (
        <div>
            <span data-testid={'who'}>{profile?.discordId ?? 'anonyme'}</span>
            <span data-testid={'signed'}>{String(signedIn)}</span>
            <span data-testid={'self'}>{String(self)}</span>
            <button onClick={() => refresh()}>refresh</button>
        </div>
    );
}

const renderProbe = () => render(<AuthProvider><Probe /></AuthProvider>);

const serves = profile => vi.fn(() => Promise.resolve(
    profile == null
        ? { ok: false, status: 404, statusText: 'Not Found' }
        : { ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(profile) }
));

describe('auth', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('reads a stored profile before the first paint', () => {
        localStorage.setItem('user_profile', JSON.stringify(PROFILE));
        vi.stubGlobal('fetch', serves(null));

        renderProbe();

        // Synchronously, with no waitFor: a returning visitor must not flash as signed out.
        expect(screen.getByTestId('who')).toHaveTextContent(PROFILE.discordId);
        expect(screen.getByTestId('self')).toHaveTextContent('true');
    });

    it('treats an expired profile as no profile', () => {
        localStorage.setItem('user_profile', JSON.stringify({ ...PROFILE, expirationDate: '2000-01-01T00:00:00Z' }));
        vi.stubGlobal('fetch', serves(null));

        renderProbe();

        expect(screen.getByTestId('signed')).toHaveTextContent('false');
    });

    it('mints a gold_uuid for a visitor who has none', async () => {
        vi.stubGlobal('fetch', serves(null));

        renderProbe();

        await waitFor(() => expect(localStorage.getItem('gold_uuid')).not.toBeNull());
    });

    /**
     * The whole point of the provider. Before it, the identity was read from localStorage during render, so React
     * never learned it had changed — signing in only showed up because the page was reloaded outright.
     */
    it('re-renders the tree when the identity arrives, with no reload', async () => {
        vi.stubGlobal('fetch', serves(PROFILE));

        renderProbe();
        expect(screen.getByTestId('who')).toHaveTextContent('anonyme');

        await waitFor(() => expect(screen.getByTestId('who')).toHaveTextContent(PROFILE.discordId));
        expect(screen.getByTestId('signed')).toHaveTextContent('true');
    });

    it('forgets the stored profile when the server no longer knows the visitor', async () => {
        localStorage.setItem('user_profile', JSON.stringify(PROFILE));
        vi.stubGlobal('fetch', serves(null));

        renderProbe();
        // Stored and valid, so nothing is asked at boot and the visitor stays signed in.
        expect(screen.getByTestId('signed')).toHaveTextContent('true');

        screen.getByRole('button', { name: 'refresh' }).click();

        await waitFor(() => expect(screen.getByTestId('signed')).toHaveTextContent('false'));
        expect(localStorage.getItem('user_profile')).toBeNull();
    });

    it('refuses to be used outside a provider', () => {
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            expect(() => render(<Probe />)).toThrow(/AuthProvider/);
        } finally {
            errors.mockRestore();
        }
    });
});

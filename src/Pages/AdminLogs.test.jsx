import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Header from '../Components/Header.jsx';
import { expectNoConsoleErrors, renderAt, stubApi } from '../testUtils.jsx';
import AdminLogs from './AdminLogs.jsx';

const PROFILE = {
    discordId: '900000000000001001',
    name: 'Admin synthétique',
    avatar: '',
    expirationDate: '2099-01-01T00:00:00Z',
    admin: true,
};

const LOGS = {
    lines: ['2026-08-28 INFO startup', '2026-08-28 INFO ready'],
    generatedAt: '2026-08-28T12:00:00+02:00',
};

function signIn(profile = PROFILE) {
    localStorage.setItem('gold_uuid', JSON.stringify('gold-session'));
    localStorage.setItem('user_profile', JSON.stringify(profile));
}

describe('AdminLogs', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useRealTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('asks a signed-out visitor to connect without requesting logs', async () => {
        const fetchStub = stubApi();
        renderAt(<AdminLogs />, { path: '/admin' });

        expect(screen.getByText(/Connectez-vous avec Discord/)).toBeInTheDocument();
        expect(fetchStub.mock.calls.some(([url]) => String(url).includes('/api/admin/logs'))).toBe(false);
    });

    it('refuses a profile without an admin role', () => {
        signIn({ ...PROFILE, admin: false });
        stubApi({ '/api/auth/profile': { ...PROFILE, admin: false } });
        renderAt(<AdminLogs />, { path: '/admin' });

        expect(screen.getByText(/Accès refusé/)).toBeInTheDocument();
    });

    it('renders logs, sends the session header and scrolls to the bottom', async () => {
        signIn();
        const fetchStub = stubApi({ '/api/auth/profile': PROFILE, '/api/admin/logs': LOGS });
        const scrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 321 });

        try {
            await expectNoConsoleErrors(async () => {
                renderAt(<AdminLogs />, { path: '/admin' });
                const output = await screen.findByLabelText('Logs du serveur');
                expect(output).toHaveTextContent('startup');
                expect(output).toHaveTextContent('ready');
                await waitFor(() => expect(output.scrollTop).toBe(321));
            });
        } finally {
            if (scrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', scrollHeight);
            else delete HTMLElement.prototype.scrollHeight;
        }

        const call = fetchStub.mock.calls.find(([url]) => String(url).includes('/api/admin/logs'));
        expect(call[1].headers['X-Gold-Id']).toBe('gold-session');
    });

    it('polls every five seconds and pause stops polling until resume', async () => {
        vi.useFakeTimers();
        signIn();
        const fetchStub = stubApi({ '/api/auth/profile': PROFILE, '/api/admin/logs': LOGS });
        renderAt(<AdminLogs />, { path: '/admin' });

        await act(async () => { await vi.advanceTimersByTimeAsync(0); });
        const countLogs = () => fetchStub.mock.calls.filter(([url]) => String(url).includes('/api/admin/logs')).length;
        expect(countLogs()).toBe(1);

        await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
        expect(countLogs()).toBe(2);

        fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
        await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
        expect(countLogs()).toBe(2);

        fireEvent.click(screen.getByRole('button', { name: 'Reprendre' }));
        await act(async () => { await vi.advanceTimersByTimeAsync(0); });
        expect(countLogs()).toBe(3);
    });

    it.each([
        [401, /session a expiré/],
        [403, /Accès refusé/],
        [503, /temporairement indisponibles/],
        [500, /Impossible de récupérer/],
    ])('shows the dedicated state for HTTP %s', async (status, message) => {
        signIn();
        stubApi({ '/api/auth/profile': PROFILE, '/api/admin/logs': { status } });
        renderAt(<AdminLogs />, { path: '/admin' });

        expect(await screen.findByText(message)).toBeInTheDocument();
    });
});

describe('admin navigation', () => {
    beforeEach(() => localStorage.clear());

    it('shows the admin link only to an authorised profile', () => {
        signIn();
        stubApi({ '/api/auth/profile': PROFILE });
        renderAt(<Header />);
        expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    });

    it('hides the admin link from a regular profile', () => {
        signIn({ ...PROFILE, admin: false });
        stubApi({ '/api/auth/profile': { ...PROFILE, admin: false } });
        renderAt(<Header />);
        expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    });
});

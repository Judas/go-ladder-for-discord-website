import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Health from './Health.jsx';
import { expectNoConsoleErrors, fixtures, renderAt, stubApi } from '../testUtils.jsx';

/** A service in the shape ServiceHealth serves, overridable field by field. */
const service = (over = {}) => ({
    name: 'AService',
    running: true,
    intervalSeconds: 60,
    secondsSinceLastSuccess: 12,
    secondsSinceStart: 300,
    staleAfterSeconds: 300,
    consecutiveFailures: 0,
    lastFailure: null,
    stale: false,
    healthy: true,
    ...over,
});

describe('Health', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('lists every service of a healthy registry, and warns about nothing', async () => {
        stubApi();
        await expectNoConsoleErrors(async () => {
            renderAt(<Health />, { path: '/health' });
            await screen.findByText('Tous les services répondent');
        });

        for (const s of fixtures.health.services) {
            expect(screen.getByText(s.name)).toBeInTheDocument();
        }
    });

    /**
     * The reason this page needed a new fetch hook. /api/health answers 503 when a service is down, and the body of
     * that response is the diagnosis — the pattern the other pages use would throw it away and show a network error.
     */
    it('reads the body of a 503 instead of treating it as a failure', async () => {
        stubApi({
            '/api/health': {
                status: 503,
                body: { healthy: false, services: [service(), service({ name: 'WedgedService', stale: true, healthy: false, secondsSinceLastSuccess: 4000 })] },
            },
        });

        renderAt(<Health />, { path: '/health' });

        expect(await screen.findByText('Un service au moins est en défaut')).toBeInTheDocument();
        expect(screen.getByText('WedgedService')).toBeInTheDocument();
        expect(screen.getByText('HTTP 503 — 2 services surveillés')).toBeInTheDocument();
    });

    it('names why a service is unhealthy', async () => {
        stubApi({
            '/api/health': {
                status: 503,
                body: {
                    healthy: false,
                    services: [
                        service({ name: 'StoppedService', running: false, healthy: false }),
                        service({ name: 'StaleService', stale: true, healthy: false }),
                    ],
                },
            },
        });

        renderAt(<Health />, { path: '/health' });
        await screen.findByText('StoppedService');

        expect(within(screen.getByText('StoppedService').closest('[role="row"]')).getByText('arrêté')).toBeInTheDocument();
        expect(within(screen.getByText('StaleService').closest('[role="row"]')).getByText('silencieux')).toBeInTheDocument();
    });

    it('says "jamais" for a service that has never ticked, not "0 s"', async () => {
        stubApi({
            '/api/health': {
                status: 200,
                body: { healthy: true, services: [service({ secondsSinceLastSuccess: null, secondsSinceStart: null })] },
            },
        });

        renderAt(<Health />, { path: '/health' });

        expect(await screen.findByText('jamais')).toBeInTheDocument();
        expect(screen.queryByText('il y a 0 s')).not.toBeInTheDocument();
    });

    it('reports an empty registry as a server that never started its modules', async () => {
        stubApi({ '/api/health': { status: 503, body: { healthy: false, services: [] } } });

        renderAt(<Health />, { path: '/health' });

        expect(await screen.findByText(/Aucun service enregistré/)).toBeInTheDocument();
    });

    it('shows the last failure of a failing service', async () => {
        stubApi({
            '/api/health': {
                status: 503,
                body: { healthy: false, services: [service({ healthy: false, consecutiveFailures: 7, lastFailure: 'Connection refused' })] },
            },
        });

        renderAt(<Health />, { path: '/health' });

        expect(await screen.findByText('Connection refused')).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('falls back to an error when the API cannot be reached at all', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));

        renderAt(<Health />, { path: '/health' });

        expect(await screen.findByText("Impossible de joindre l'API.")).toBeInTheDocument();
    });

    it('refetches on demand', async () => {
        const fetchStub = stubApi();
        renderAt(<Health />, { path: '/health' });
        await screen.findByText('Tous les services répondent');
        const before = fetchStub.mock.calls.length;

        await userEvent.click(screen.getByRole('button', { name: 'Rafraîchir' }));

        expect(fetchStub.mock.calls.length).toBeGreaterThan(before);
    });

    it('polls while auto-refresh is on, and stops when it is turned off', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            const fetchStub = stubApi();
            renderAt(<Health />, { path: '/health' });
            await screen.findByText('Tous les services répondent');

            const afterMount = fetchStub.mock.calls.length;
            await vi.advanceTimersByTimeAsync(31000);
            expect(fetchStub.mock.calls.length).toBeGreaterThan(afterMount);

            await userEvent.click(screen.getByRole('checkbox'));
            const afterToggle = fetchStub.mock.calls.length;
            await vi.advanceTimersByTimeAsync(90000);

            expect(fetchStub.mock.calls.length).toBe(afterToggle);
        } finally {
            vi.useRealTimers();
        }
    });
});

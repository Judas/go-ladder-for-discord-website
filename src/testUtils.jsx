import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, vi } from 'vitest';

import fixtures from './__fixtures__/api.json';

export { fixtures };

/**
 * Stubs `fetch` with the payloads the real backend serves — `src/__fixtures__/api.json` was captured from a local
 * fulguro-server, not written by hand, so a field that moves on the server makes these tests fail rather than pass on
 * an invented shape.
 *
 * `overrides` maps a path fragment to either a payload or `{status, body}`, for the failure branches.
 */
export function stubApi(overrides = {}) {
    const routes = {
        '/api/players': fixtures.players,
        '/api/tiers': fixtures.tiers,
        '/api/accounts': fixtures.accounts,
        '/api/games': fixtures.games,
        '/api/game/': fixtures.gameDetail,
        '/api/player/': fixtures.profile,
        '/api/health': fixtures.health,
        ...overrides,
    };

    const fetchStub = vi.fn(url => {
        // Longest match first: '/api/games' and '/api/game/' both prefix-match a game URL.
        const key = Object.keys(routes)
            .filter(k => String(url).includes(k))
            .sort((a, b) => b.length - a.length)[0];

        if (key === undefined) return Promise.reject(new Error(`no stub for ${url}`));

        const entry = routes[key];
        const { status = 200, body = entry } = entry?.status ? entry : {};
        return Promise.resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: `stubbed ${status}`,
            json: () => Promise.resolve(body),
        });
    });

    vi.stubGlobal('fetch', fetchStub);
    return fetchStub;
}

/** Renders `element` at `path`, with `route` as the matched route pattern (e.g. '/player/:playerId'). */
export function renderAt(element, { path = '/', route = path } = {}) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes><Route path={route} element={element} /></Routes>
        </MemoryRouter>
    );
}

/**
 * Fails the test on any console.error emitted while `body` runs.
 *
 * This is the point of the audit suite: React reports missing list keys, invalid DOM attributes and unknown props
 * through console.error, so a page that renders "fine" but warns is caught here instead of in a browser console
 * nobody has open.
 */
export async function expectNoConsoleErrors(body) {
    const seen = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => { seen.push(args.join(' ')); });
    try {
        await body();
    } finally {
        spy.mockRestore();
    }
    expect(seen, `console.error during render:\n${seen.join('\n')}`).toEqual([]);
}

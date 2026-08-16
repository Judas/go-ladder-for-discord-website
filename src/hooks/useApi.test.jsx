import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useApi from './useApi.js';

const ok = body => ({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) });
const failing = (status, body) => ({
    ok: false,
    status,
    statusText: `HTTP ${status}`,
    json: () => Promise.resolve(body),
});

describe('useApi', () => {
    beforeEach(() => { vi.unstubAllGlobals(); });

    it('goes from pending to success', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(ok({ hello: 'world' }))));

        const { result } = renderHook(() => useApi('/api/thing'));
        expect(result.current.status).toBe('pending');

        await waitFor(() => expect(result.current.status).toBe('success'));
        expect(result.current.data).toEqual({ hello: 'world' });
        expect(result.current.httpStatus).toBe(200);
    });

    it('treats a non-2xx as an error by default, but still reports the code', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(failing(500, { oops: true }))));

        const { result } = renderHook(() => useApi('/api/thing'));

        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.data).toBeNull();
        expect(result.current.httpStatus).toBe(500);
    });

    /**
     * What tells "no such house" from "the server is down". This API answers 404 with an **empty** body, so the code
     * cannot be recovered by parsing the response — it has to travel with the failure.
     */
    it('reports a 404 with an empty body as a 404', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
            ok: false, status: 404, statusText: 'Not Found',
            json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
        })));

        const { result } = renderHook(() => useApi('/api/house/NOPE'));

        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.httpStatus).toBe(404);
    });

    it('reports no code when the failure is not an HTTP one', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));

        const { result } = renderHook(() => useApi('/api/thing'));

        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.httpStatus).toBeNull();
    });

    it('parses the body of a non-2xx when told to, and still reports the code', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(failing(503, { healthy: false }))));

        const { result } = renderHook(() => useApi('/api/health', { acceptErrorStatus: true }));

        await waitFor(() => expect(result.current.status).toBe('success'));
        expect(result.current.data).toEqual({ healthy: false });
        expect(result.current.httpStatus).toBe(503);
    });

    it('reports an error when the response is not JSON at all', async () => {
        // What a proxy returns when the backend is down: a 504 with a plain-text body.
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
            ok: false, status: 504, statusText: 'Gateway Timeout',
            json: () => Promise.reject(new SyntaxError('Unexpected token E')),
        })));

        const { result } = renderHook(() => useApi('/api/health', { acceptErrorStatus: true }));

        await waitFor(() => expect(result.current.status).toBe('error'));
    });

    /**
     * What a page navigating from one profile to another depends on. The hand-written version this replaces never
     * reset its status, so it kept showing the previous player while the next one loaded.
     */
    it('reads as pending again when the path changes, without serving the previous payload', async () => {
        vi.stubGlobal('fetch', vi.fn(url => Promise.resolve(ok({ path: String(url) }))));

        const { result, rerender } = renderHook(({ path }) => useApi(path), {
            initialProps: { path: '/api/player/1' },
        });
        await waitFor(() => expect(result.current.status).toBe('success'));
        expect(result.current.data).toEqual({ path: '/api/player/1' });

        rerender({ path: '/api/player/2' });
        expect(result.current.status).toBe('pending');
        expect(result.current.data).toBeNull();

        await waitFor(() => expect(result.current.data).toEqual({ path: '/api/player/2' }));
    });

    it('refetches on reload()', async () => {
        const fetchStub = vi.fn(() => Promise.resolve(ok({ n: 1 })));
        vi.stubGlobal('fetch', fetchStub);

        const { result } = renderHook(() => useApi('/api/thing'));
        await waitFor(() => expect(result.current.status).toBe('success'));
        expect(fetchStub).toHaveBeenCalledTimes(1);

        result.current.reload();

        await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(2));
    });

    it('keeps a stable reload identity across renders', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(ok({}))));

        const { result, rerender } = renderHook(() => useApi('/api/thing'));
        const first = result.current.reload;
        rerender();

        expect(result.current.reload).toBe(first);
    });

    it('polls on an interval, and stops polling once unmounted', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            const fetchStub = vi.fn(() => Promise.resolve(ok({})));
            vi.stubGlobal('fetch', fetchStub);

            const { result, unmount } = renderHook(() => useApi('/api/health', { refreshMs: 1000 }));
            await waitFor(() => expect(result.current.status).toBe('success'));

            await vi.advanceTimersByTimeAsync(3500);
            const whilePolling = fetchStub.mock.calls.length;
            expect(whilePolling).toBeGreaterThan(1);

            unmount();
            await vi.advanceTimersByTimeAsync(5000);

            expect(fetchStub.mock.calls.length).toBe(whilePolling);
        } finally {
            vi.useRealTimers();
        }
    });
});

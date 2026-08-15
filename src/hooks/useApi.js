import { useCallback, useEffect, useState } from 'react';

/**
 * The fetch-and-status pattern the pages repeat, as one hook.
 *
 * Returns `{status, data, httpStatus, reload}` with `status` cycling `'pending' | 'success' | 'error'`, so a caller
 * renders exactly as the existing pages do.
 *
 * `acceptErrorStatus` is why this exists rather than a copy of the pattern. Every page does
 * `if (!res.ok) throw res.statusText`, which throws away the body — and `/api/health` answers **503 with the body
 * that says what is wrong**. With the option on, a non-2xx response is parsed and handed over as a success, with
 * `httpStatus` carrying the code so the caller can tell the two apart.
 *
 * `refreshMs` polls. Changing it refetches immediately, which is what a "resume refreshing" button should do anyway.
 *
 * @param {string} path
 * @param {{acceptErrorStatus?: boolean, refreshMs?: number}} [options]
 */
export default function useApi(path, { acceptErrorStatus = false, refreshMs = 0 } = {}) {
    // The path travels with the result so that a path change reads as pending during render, without an effect
    // writing 'pending' back into state on the way.
    const [result, setResult] = useState({ status: 'pending', data: null, httpStatus: null, path });
    const [reloadToken, setReloadToken] = useState(0);

    const reload = useCallback(() => setReloadToken(token => token + 1), []);

    useEffect(() => {
        let cancelled = false;

        const run = () => fetch(path)
            .then(res => {
                if (!res.ok && !acceptErrorStatus) { throw res.statusText; }
                return res.json().then(data => ({ data, httpStatus: res.status }));
            })
            .then(({ data, httpStatus }) => {
                if (!cancelled) { setResult({ status: 'success', data, httpStatus, path }); }
            })
            .catch(() => {
                if (!cancelled) { setResult({ status: 'error', data: null, httpStatus: null, path }); }
            });

        run();

        if (refreshMs <= 0) { return () => { cancelled = true; }; }

        const timer = setInterval(run, refreshMs);
        return () => { cancelled = true; clearInterval(timer); };
    }, [path, acceptErrorStatus, refreshMs, reloadToken]);

    return {
        status: result.path === path ? result.status : 'pending',
        data: result.path === path ? result.data : null,
        httpStatus: result.path === path ? result.httpStatus : null,
        reload,
    };
}

import { ensureUserId } from './AuthProfile.js';

/**
 * POSTs `body` to an `/api/admin/*` route with the admin session header, and answers `{ok, status, data}`.
 *
 * The admin routes authenticate on `X-Gold-Id`, the uuid the server filed the Discord credentials against — unlike the
 * public routes, which take a Discord id in the body and check nothing. `data` is the parsed JSON body of a success, or
 * null for a 204 or an unreadable body.
 *
 * Never throws on an HTTP status, only on a network failure, so a caller maps the status with `adminFailure`.
 */
export async function adminPost(path, body) {
    const response = await fetch(path, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Gold-Id': ensureUserId(),
        },
        body: JSON.stringify(body),
    });
    const data = response.ok && response.status !== 204 ? await response.json().catch(() => null) : null;
    return { ok: response.ok, status: response.status, data };
}

/** The failure an admin route's status means, as a key of `ADMIN_ERRORS`. */
export function adminFailure(status) {
    if (status === 401) { return 'unauthorized'; }
    if (status === 403) { return 'forbidden'; }
    if (status === 404) { return 'notFound'; }
    if (status === 400) { return 'invalid'; }
    if (status === 503) { return 'unavailable'; }
    return 'error';
}

/** The messages every admin route shares. A caller overrides `notFound`, `invalid` and `error` with its own wording. */
export const ADMIN_ERRORS = {
    unauthorized: 'Votre session a expiré. Reconnectez-vous avec Discord.',
    forbidden: 'Votre accès administrateur a été retiré.',
    unavailable: 'Le service Discord est temporairement indisponible.',
    error: 'La requête a échoué. Réessayez plus tard.',
};

/**
 * The storage and network half of authentication. No React here — `AuthProvider.jsx` is what holds the identity in
 * state and tells the tree when it changes.
 *
 * There is no token in a header and no session: the site keeps a `gold_uuid` it made up, the server keeps the
 * Discord credentials against it, and `/api/auth/profile?goldId=` trades one for the other.
 */

const UUID_KEY = 'gold_uuid';
const PROFILE_KEY = 'user_profile';

/**
 * The caller's own id, minted on first visit.
 *
 * It is what the whole exchange hangs on: the server files the Discord tokens under it, so losing it means losing
 * the session — and anyone holding it *is* the session, which is why the routes that take a Discord id in a body
 * are not authentication.
 */
export function ensureUserId() {
    const saved = JSON.parse(localStorage.getItem(UUID_KEY));
    if (saved != null) { return saved; }

    const minted = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, JSON.stringify(minted));
    return minted;
}

/** The stored profile if it is still valid, or null — an expired one is as good as absent. */
export function readStoredProfile() {
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (stored == null || isExpired(stored.expirationDate)) { return null; }
    return stored;
}

export function storeProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearStoredProfile() {
    localStorage.removeItem(PROFILE_KEY);
}

/**
 * Asks the server who the holder of `goldId` is.
 *
 * Resolves to null rather than throwing when there is nobody: arriving with a fresh uuid and no Discord login is
 * the normal case on a first visit, not an error to report.
 */
export function fetchProfile(goldId) {
    return fetch(`/api/auth/profile?goldId=${goldId}`)
        .then(res => {
            if (!res.ok) { throw res.statusText; }
            return res.json();
        })
        .catch(() => null);
}

function isExpired(expirationDate) {
    return new Date(expirationDate) < new Date(new Date().toDateString());
}

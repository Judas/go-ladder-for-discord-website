import { useCallback, useEffect, useState } from 'react';

import { AuthContext } from './auth.js';
import { clearStoredProfile, ensureUserId, fetchProfile, readStoredProfile, storeProfile } from './AuthProfile.js';

/**
 * Holds the visitor's identity in React state.
 *
 * Before this, `hasValidProfile()` read localStorage during render. React had no idea the value existed, so nothing
 * re-rendered when it changed — signing in only appeared because the profile fetch finished with
 * `window.location.replace`, reloading the whole page. That was enough while the identity decided an avatar and one
 * link; it stopped being enough once it decided five buttons that mutate data.
 */
export default function AuthProvider({children}) {
    // Read synchronously so the first paint already knows: a returning visitor should not see the signed-out header
    // flash before the stored profile is picked up. An expired one reads as null — see readStoredProfile.
    const [profile, setProfile] = useState(readStoredProfile);

    /**
     * Asks the server again and adopts the answer. Used at boot when nothing is stored, and by the OAuth callback
     * once the code has been exchanged. Returns the profile so a caller can act on the outcome.
     */
    const refresh = useCallback(() => {
        const goldId = ensureUserId();
        return fetchProfile(goldId).then(fetched => {
            if (fetched == null) {
                clearStoredProfile();
                setProfile(null);
                return null;
            }

            storeProfile(fetched);
            setProfile(fetched);
            return fetched;
        });
    }, []);

    useEffect(() => {
        // The uuid has to exist even for a visitor who never signs in: it is what a later login is filed under.
        ensureUserId();

        // Nothing stored, or what was stored has expired. Asking costs one request and is the normal first visit.
        // `profile` is deliberately absent from the dependencies: re-running whenever it changed would ask the
        // server again the moment it answered null, in a loop.
        if (readStoredProfile() == null) { refresh(); }
    }, [refresh]);

    return (
        <AuthContext.Provider value={{ profile, signedIn: profile != null, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

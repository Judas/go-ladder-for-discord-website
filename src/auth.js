import { createContext, useContext } from 'react';

/**
 * Who the visitor is, as the tree reads it. `AuthProvider.jsx` is what fills it.
 *
 * Split from the provider so that neither file exports both a component and something else — which is what Fast
 * Refresh needs to reload a component file without losing state.
 */
export const AuthContext = createContext(null);

/** `{profile, signedIn, refresh}`. `profile` is null when signed out. */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context == null) { throw new Error('useAuth must be used inside an AuthProvider'); }
    return context;
}

/** Whether the signed-in visitor is the player being looked at. */
export function useIsSelf(discordId) {
    const { profile } = useAuth();
    return profile != null && profile.discordId === discordId;
}

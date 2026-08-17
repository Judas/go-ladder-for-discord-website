import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from '../auth.js';
import Loader from "../Components/Loader.jsx";

export default function DiscordAuth() {
    const [queryParams] = useSearchParams();
    const { refresh } = useAuth();
    const navigate = useNavigate();
    const [exchangeStatus, setExchangeStatus] = useState('pending');

    // Read out here rather than inside the effect: `code` is a string, so the effect depends on the value that
    // actually matters instead of on the params object, which is a new one on every render.
    const code = queryParams.get('code');

    /*
     * Derived, not stored. Coming back from Discord with no code in the URL is an error before anything is
     * attempted, so it needs no effect to establish — and writing it into state from inside one is the cascading
     * render the hooks rules warn about. Only the exchange itself has a status worth keeping.
     */
    const authStatus = code == null ? 'error' : exchangeStatus;

    useEffect(() => {
        if (code == null) { return; }

        // Send code to backend auth API
        const goldId = JSON.parse(localStorage.getItem('gold_uuid'));
        const postOptions = {
            method: 'POST',
            headers: { 'Accept': 'application.json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, goldId: goldId })
        };

        fetch('/api/auth', postOptions)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(() => refresh())
            .then(() => {
                setExchangeStatus('success');
                // Was window.location.replace(origin), a full page reload — the only way the header could notice a
                // sign-in before the identity was React state. A router navigation is enough now.
                navigate('/');
            })
            .catch(() => setExchangeStatus('error'));
    }, [code, refresh, navigate]);

    return (
        <div className={'DiscordAuth'}>
            {authStatus === 'pending' && <Loader/>}
            {authStatus === 'error' && <p className={'Error'}>Erreur lors de l'authentification Discord. Veuillez réessayer</p>}
            {authStatus === 'success' && <p className={'Success'}>Vous êtes bien authentifié, vous allez être redirigé.</p>}
        </div>
    );
}

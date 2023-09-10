import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import authenticateUser from '../AuthProfile.js';
import Loader from "../Components/Loader.jsx";

import './DiscordAuth.css';

export default function DiscordAuth() {
    const [queryParams] = useSearchParams();
    const [authStatus, setAuthStatus] = useState('pending');

    useEffect(() => {
        setAuthStatus('pending');

        let code = queryParams.get('code')
        if (code == null) {
            setAuthStatus('error');
        } else {
            // Send code to backend auth API
            var goldId = JSON.parse(localStorage.getItem('gold_uuid'));
            fetch('/api/auth?code=' + code + '&goldId=' + goldId)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => {      
                setAuthStatus('success');
                authenticateUser(true);
            })
            .catch(() => setAuthStatus('error'));
        }
    }, []);

    return (
        <div className={'DiscordAuth'}>
            {authStatus === 'pending' && <Loader/>}
            {authStatus === 'error' && <p className={'Error'}>Erreur lors de l'authentification Discord. Veuillez réessayer</p>}
            {authStatus === 'success' && <p className={'Success'}>Vous êtes bien authentifié, vous allez être redirigé.</p>}
        </div>
    );
}

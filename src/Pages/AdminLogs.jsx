import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth.js';
import { ensureUserId } from '../AuthProfile.js';
import Loader from '../Components/Loader.jsx';

import './AdminLogs.css';

const REFRESH_MS = 5000;

export default function AdminLogs() {
    const { profile } = useAuth();
    const [live, setLive] = useState(true);
    const [result, setResult] = useState({ status: 'pending', lines: [], generatedAt: null });
    const logElement = useRef(null);

    const load = useCallback(() => {
        if (profile?.admin !== true) { return Promise.resolve(); }

        return fetch('/api/admin/logs', {
            headers: {
                'Accept': 'application/json',
                'X-Gold-Id': ensureUserId(),
            },
        }).then(async response => {
            if (response.ok) {
                const data = await response.json();
                setResult({ status: 'success', lines: data.lines ?? [], generatedAt: data.generatedAt ?? null });
                return;
            }

            const status = response.status === 401
                ? 'unauthorized'
                : response.status === 403
                    ? 'forbidden'
                    : response.status === 503
                        ? 'unavailable'
                        : 'error';
            setResult(current => ({ ...current, status }));
        }).catch(() => setResult(current => ({ ...current, status: 'error' })));
    }, [profile?.admin]);

    useEffect(() => {
        if (profile?.admin !== true || !live) { return undefined; }
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, [profile?.admin, live, load]);

    useEffect(() => {
        if (live && result.status === 'success' && logElement.current != null) {
            logElement.current.scrollTop = logElement.current.scrollHeight;
        }
    }, [live, result]);

    if (profile == null) {
        return <AdminMessage>Connectez-vous avec Discord pour accéder à l'administration.</AdminMessage>;
    }

    if (profile.admin !== true || result.status === 'forbidden') {
        return <AdminMessage error>Accès refusé : un rôle Discord autorisé est requis.</AdminMessage>;
    }

    if (result.status === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    }

    if (result.status === 'unauthorized') {
        return <AdminMessage>Votre session a expiré. <Link to={import.meta.env.VITE_DISCORD_AUTH_URL}>Reconnectez-vous avec Discord.</Link></AdminMessage>;
    }

    if (result.status === 'unavailable') {
        return <AdminMessage error>Les logs du serveur sont temporairement indisponibles.</AdminMessage>;
    }

    if (result.status === 'error') {
        return <AdminMessage error>Impossible de récupérer les logs du serveur.</AdminMessage>;
    }

    const toggleLive = () => {
        setLive(value => !value);
    };

    return (
        <section className={'AdminLogs Container'}>
            <h2 className={'PageTitle PageTitle--standalone'}>Administration</h2>
            <div className={'AdminLogs__Toolbar'}>
                <div>
                    <strong>Logs du serveur</strong>
                    <span className={`AdminLogs__State ${live ? 'live' : ''}`}>{live ? 'Direct' : 'En pause'}</span>
                </div>
                <button type="button" className={'AdminLogs__Button'} onClick={toggleLive}>
                    {live ? 'Pause' : 'Reprendre'}
                </button>
            </div>
            <pre className={'AdminLogs__Output'} ref={logElement} aria-label="Logs du serveur">
                {result.lines.length === 0 ? 'Aucune ligne de log disponible.' : result.lines.join('\n')}
            </pre>
            {result.generatedAt &&
                <p className={'AdminLogs__Updated'}>Dernière lecture : {new Date(result.generatedAt).toLocaleString('fr-FR')}</p>}
        </section>
    );
}

function AdminMessage({children, error = false}) {
    return (
        <section className={'AdminLogs Container'}>
            <h2 className={'PageTitle PageTitle--standalone'}>Administration</h2>
            <p className={error ? 'Error' : ''}>{children}</p>
        </section>
    );
}

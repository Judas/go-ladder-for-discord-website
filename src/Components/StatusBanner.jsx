import React, { useEffect, useState } from 'react';

import './StatusBanner.css';

export default function StatusBanner() {
    const [serverStatus, setServerStatus] = useState('pending');
    
    useEffect(() => {
        setServerStatus('pending');

        fetch("/api/scan")
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                console.log(res);
                setServerStatus(res == true ? 'scanning' : 'available');
            })
            .catch(() => setServerStatus('error'));
    }, []);

    return (
        <>
        {serverStatus === 'error' && <div className={'StatusBanner Unavailable'}><p>Impossible d'accéder au serveur...</p></div>}
        {serverStatus === 'scanning' && <div className={'StatusBanner Scanning'}><p>Mise à jour des parties en cours, les informations affichées sur le site peuvent être désynchronisées.</p></div>}
        {(serverStatus === 'available' || serverStatus === 'pending') && <div className={'StatusBanner Available'} />}
        </>
    );
}

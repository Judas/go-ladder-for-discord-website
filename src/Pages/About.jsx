import React, { useEffect, useState } from "react";

import './About.css';

export default function About() {
    const [tiers, setTiers] = useState();
    const [tiersFetchStatus, setTiersFetchStatus] = useState('pending');

    useEffect(() => {
        setTiersFetchStatus('pending');

        fetch(`/api/tiers`)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setTiers(res);
                setTiersFetchStatus('success');
            })
            .catch(() => setTiersFetchStatus('error'));
    }, []);

    return (
        <section className={'About Container'}>
            <h2 className={'About__title'}>À propos</h2>

            <p lang={'fr-FR'} className={'About__text'}>
                GO Ladder for Discord (GOLD) est une échelle de rang pour le jeu de Go interne à la communauté <a href="https://discord.gg/fulgurogo">FulguroGo</a>.
                Elle est alimentée par les parties jouées sur KGS, OGS et FOX, entre les joueurs inscrits à l'échelle.
            </p>

            <p lang={'fr-FR'} className={'About__text'}>
                Les joueurs sont ensuite classés à l'aide d'un algorithme <a href="https://fr.wikipedia.org/wiki/Classement_Glicko">Glicko2</a>, puis répartis en <b>Divisions</b>:
            </p>

            <span className={'About__tiers'}>
                {tiersFetchStatus === 'pending' && <br/> }
                {tiersFetchStatus === 'error' && <br/> }
                {tiersFetchStatus === 'success' && <>
                    {tiers.map(tier => (
                        <h2 className={'About__tierItem'}>
                            <img width="96" height="96" src={`${process.env.PUBLIC_URL}/shields/shield-${tier.rank}.svg`} alt={tier.name}/>
                            <p>{tier.name}</p>
                        </h2>
                    ))}
                </>}
            </span>

            <p lang={'fr-FR'} className={'About__text'}>
                Plus d'infos en rejoignant le Discord <a href="https://discord.gg/fulgurogo">FulguroGo</a>.
            </p>
        </section>
    );
}

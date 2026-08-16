import useApi from "../hooks/useApi.js";

import './About.css';

export default function About() {
    const { status: tiersFetchStatus, data: tiers } = useApi('/api/tiers');

    return (
        <section className={'About Container'}>
            <h2 className={'PageTitle'}>À propos</h2>

            <p lang={'fr-FR'} className={'About__text'}>
                GO Ladder for Discord (GOLD) est l'outil de la communauté <a href="https://discord.gg/fulgurogo">FulguroGo</a>.
                Les membres peuvent ajouter leurs compte KGS & OGS afin d'être réparti dans une Division de l'échelle interne.
            </p>

            <span className={'About__tiers'}>
                {tiersFetchStatus === 'pending' && <br/> }
                {tiersFetchStatus === 'error' && <br/> }
                {tiersFetchStatus === 'success' && <>
                    {tiers.map(tier => (
                        <h2 key={tier.rank} className={'About__tierItem'}>
                            <img width="96" height="96" src={`/shields/shield-${tier.rank}.svg`} alt={tier.name}/>
                            <p>{tier.name}</p>
                        </h2>
                    ))}
                </>}
            </span>

            <p lang={'fr-FR'} className={'About__text'}>
                Le site sert aussi à centraliser certains évènements communautaires et sert notamment de validation pour la FulguroGo Cup.
            </p>

            <p lang={'fr-FR'} className={'About__text'}>
                Plus d'infos en rejoignant le Discord <a href="https://discord.gg/fulgurogo">FulguroGo</a>.
            </p>
        </section>
    );
}

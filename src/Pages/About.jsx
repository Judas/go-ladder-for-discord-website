import useApi from "../hooks/useApi.js";

import './About.css';

export default function About() {
    const { status: tiersFetchStatus, data: tiers } = useApi('/api/tiers');

    return (
        <section className={'About Container'}>
            <h2 className={'PageTitle'}>À propos</h2>

            <p lang={'fr-FR'} className={'About__text'}>
                GO Ladder for Discord (GOLD) est l'outil de la communauté <a href="https://discord.gg/fulgurogo">FulguroGo</a>.
                Les membres peuvent ajouter leurs comptes KGS, OGS et FOX afin d'être répartis dans une Division de l'échelle interne.
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

            <footer className={'About__credits'}>
                <p>Developed for <a href="https://fulgurogo.be/">FulguroGo</a> by <a
                href="/player/453473841252007937">Judas</a> with the help of<br /><a
                href="/player/236813095207436289">Drooxi</a>, <a
                href="/player/324122154742317056">Jiroh</a>, <a
                href="/player/178869205557313536">Kirwiisp</a>, <a
                href="https://theworldasastage.com">NicoTupe</a>, <a
                href="/player/268028935764312064">RenG</a> & <a
                href="/player/119456225724334081">Valloa</a>
                </p>
            </footer>
        </section>
    );
}

import { Link } from "react-router-dom";

import Avatar from "../Components/Avatar.jsx";
import Crest from "../Components/Crest.jsx";
import Loader from "../Components/Loader.jsx";
import useApi from "../hooks/useApi.js";
import SeasonBanner from "../Components/SeasonBanner.jsx";

import './Houses.css';

export default function Houses() {
    const { status, data } = useApi('/api/houses');

    if (status === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    }

    if (status === 'error') {
        return (
            <section className={'Houses Container'}>
                <h2 className={'Houses__Title'}>Les Maisons</h2>
                <p className={'Error'}>Erreur lors de la récupération des maisons</p>
            </section>
        );
    }

    return (
        <section className={'Houses Container'}>
            <h2 className={'Houses__Title'}>Les Maisons</h2>

            <SeasonBanner period={data.period} season={data.season} />

            {/*
              * The houses arrive already ordered, best first, and carry **no rank** — with four houses a tie is
              * likely, and a position counted off the list would print a 2nd and a 3rd where the truth is two 2nds.
              * So: no numbering. The order is the whole statement.
              */}
            <ul className={'Houses__List NoBulletList'}>
                {data.houses.map(house => (
                    <li key={house.slug}><HouseCard house={house} /></li>
                ))}
            </ul>

            <Lore />
        </section>
    );
}

function HouseCard({house}) {
    return (
        <article className={'HouseCard'} style={{'--house-color': house.color}}>
            <Link to={`/house/${house.slug}`} className={'HouseCard__Link'}>
                <Crest slug={house.slug} name={house.name} size={96} className={'HouseCard__Crest'} />
                <h3 className={'HouseCard__Name'}>{house.name}</h3>
                <p className={'HouseCard__Tagline'}>{house.tagline}</p>
            </Link>

            <dl className={'HouseCard__Figures'}>
                <div>
                    <dt>Renom</dt>
                    <dd>{house.totalPoints}</dd>
                </div>
                <div>
                    <dt>Membres</dt>
                    <dd>{house.memberCount}</dd>
                </div>
            </dl>

            <Leader leader={house.leader} />
        </article>
    );
}

/**
 * The best current member, or nothing.
 *
 * `leader` is null for a house nobody is in — and that is not the same as a house with no points: the total sums the
 * register, so it keeps what players who have since left scored. A house can therefore show points and no leader,
 * which is why neither figure is derived from the other.
 */
function Leader({leader}) {
    if (leader == null) {
        return <p className={'HouseCard__NoLeader'}>Aucun membre pour l'instant</p>;
    }

    return (
        <Link to={`/player/${leader.discordId}`} className={'HouseCard__Leader'}>
            <Avatar src={leader.discordAvatar} size={40} alt={''} hidden={true} />
            <span className={'HouseCard__LeaderName'}>{leader.discordName ?? leader.discordId}</span>
            <span className={'HouseCard__LeaderPoints'}>{leader.points.total} pts</span>
        </Link>
    );
}

function Lore() {
    return (
        <div className={'Houses__Lore'} lang={'fr-FR'}>
            <h3>La chute de l'Harmonie</h3>

            <p>
                Il fut un temps où la main et l'esprit ne faisaient qu'un. Un temps ancien, oublié de la plupart,
                chanté seulement par les plus vieux bardes. Un temps où les Quatre n'étaient pas Quatre, mais Un,
                rassemblés autour du Jeu d'Or, don sacré de l'entité divine Gold.
            </p>
            <p>
                Gold, l'Incréé, était la Source et le But. On racontait qu'il avait façonné le premier plateau dans la
                nuit du néant, et posé la première pierre pour éclairer les ténèbres. Ses serviteurs, les anciens
                maîtres, enseignèrent aux mortels les règles parfaites, le rythme céleste des coups, et la sagesse du
                silence entre les pierres. Ce peuple élu, qui portait alors le nom de Synalithes, vivait en paix dans
                le Temple des 361 Voies, dressé au sommet du Mont Tengen, là où le ciel touche la terre.
            </p>
            <p>
                Ils jouaient non pour vaincre, mais pour comprendre. Les parties duraient des jours, des semaines,
                parfois des mois. Chaque mouvement était une offrande à Gold, chaque forme une prière, chaque victoire
                une illumination.
            </p>
            <p className={'Houses__LoreBreak'}>Mais la perfection est une flamme fragile.</p>
            <p>
                Nul ne sait ce qui survint. Certains parlent d'une partie interdite, jouée à huis clos dans la crypte
                du Temple, où une question fut posée à Gold : « Peut-il y avoir une seule voie vers la vérité ? »
                D'autres murmurent qu'un disciple brisa l'Œil de Vie, un artefact sacré que nul ne devait toucher. Il y
                eut un bruit de rupture, un frisson dans l'air, un battement d'aile qui fit trembler les fondations du
                Temple.
            </p>
            <p className={'Houses__LoreBreak'}>Puis vint la Disparition de Gold.</p>
            <p>
                Son absence creusa un vide que l'unité ne put combler. Les maîtres commencèrent à douter. Puis à
                discuter. Puis à se défier. Une grande partie fut annoncée, la Partie des Ruptures, où les quatre
                courants naissants s'affrontèrent pour décider de la nouvelle voie.
            </p>
            <p>
                Le plateau fut dressé, immense, couvrant toute la plaine d'Aurak. Les pierres, taillées dans
                l'obsidienne et l'ivoire lunaire, vibraient d'énergie. Mais aucun vainqueur ne fut jamais désigné, car
                à l'instant même où la dernière pierre fut posée, le plateau se fendit en quatre, comme frappé par un
                éclair invisible. Chacun recula, chacun accusa, chacun jura de ne jamais oublier.
            </p>
            <p>
                Et ainsi, les Fils du Froid s'exilèrent vers le nord, jurant de vaincre par la force et la prise.<br/>
                Le Nexus Alpha descendit dans les souterrains de quartz, y érigeant des calculateurs d'obsidienne pour
                décrypter l'univers.<br/>
                Le Sabre Silencieux partit vers les forêts de brume, méditant sur l'honneur dans la solitude des
                pierres moussues.<br/>
                Et les Lunaires d'Æther, errants et insaisissables, s'élancèrent vers les îles célestes, là où les
                constellations prennent forme.
            </p>
            <p>
                Depuis lors, les quatre clans s'affrontent dans des parties cérémonielles et des duels secrets, chacun
                croyant incarner la volonté originelle de Gold. Certains disent que lorsque le Jeu d'Or sera joué à
                nouveau dans sa forme parfaite — un plateau, quatre esprits, une vérité — Gold reviendra.
            </p>
            <p className={'Houses__LoreBreak'}>
                Mais jusqu'à ce jour, la fracture demeure.<br/>
                Et sur le Goban, c'est la guerre des âmes qui se poursuit.
            </p>
        </div>
    );
}

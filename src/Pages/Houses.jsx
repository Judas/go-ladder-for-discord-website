import { Link } from "react-router-dom";

import Avatar from "../Components/Avatar.jsx";
import Crest from "../Components/Crest.jsx";
import Loader from "../Components/Loader.jsx";
import useApi from "../hooks/useApi.js";
import SeasonBanner from "../Components/SeasonBanner.jsx";

import './Houses.css';

/**
 * The order the four houses are always shown in, whatever order the API sends them.
 *
 * `/api/houses` returns them ranked by points, and this page deliberately ignores that: four fixed places that never
 * move between visits read better than a podium that reshuffles. Nothing is lost — each card carries its total, so
 * who leads is still on the page, just not in the layout.
 */
const DISPLAY_ORDER = ['FILS_DU_FROID', 'NEXUS_ALPHA', 'SABRE_SILENCIEUX', 'LUNAIRES_AETHER'];

/**
 * A slug this list does not know keeps its position from the API, after the four known ones — sort is stable, so
 * their relative order survives. A fifth house must show up somewhere rather than silently vanish.
 */
function inDisplayOrder(houses) {
    const position = slug => {
        const index = DISPLAY_ORDER.indexOf(slug);
        return index === -1 ? DISPLAY_ORDER.length : index;
    };

    return [...houses].sort((a, b) => position(a.slug) - position(b.slug));
}

export default function Houses() {
    const { status, data } = useApi('/api/houses');

    if (status === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    }

    if (status === 'error') {
        return (
            <section className={'Houses Container'}>
                <h2 className={'PageTitle'}>Maisons</h2>
                <p className={'Error'}>Erreur lors de la récupération des maisons</p>
            </section>
        );
    }

    return (
        <section className={'Houses Container'}>
            <h2 className={'PageTitle'}>Maisons</h2>

            <SeasonBanner period={data.period} season={data.season} />

            {/*
              * Fixed order, not the API's. And still no numbering: the position on this page now says nothing at
              * all about standing, so printing a rank next to it would be actively misleading — quite apart from
              * ApiHouses carrying no rank in the first place, because ties between four houses are likely.
              */}
            <ul className={'Houses__List NoBulletList'}>
                {inDisplayOrder(data.houses).map(house => (
                    <li key={house.slug}><HouseCard house={house} /></li>
                ))}
            </ul>
        </section>
    );
}

// The slug modifier is what lets one house override --house-ink; see Houses.css.
function HouseCard({house}) {
    return (
        <article className={`HouseCard HouseCard--${house.slug}`} style={{'--house-color': house.color}}>
            <Link to={`/house/${house.slug}`} className={'HouseCard__Link'}>
                <Crest slug={house.slug} name={house.name} size={148} className={'HouseCard__Crest'} />
            </Link>

            <dl className={'HouseCard__Figures'}>
                <div>
                    <dt>Points</dt>
                    <dd>{house.totalPoints}</dd>
                </div>
                <div>
                    <dt>Membres</dt>
                    <dd>{house.memberCount}</dd>
                </div>
            </dl>

            <p className={'HouseCard__Tagline'}>{house.tagline}</p>

            <Leader house={house} />
        </article>
    );
}

/**
 * The best current member, or nothing.
 *
 * `leader` is null for a house nobody is in — and that is not the same as a house with no points: the total sums the
 * register, so it keeps what players who have since left scored. A house can therefore show points and no leader,
 * which is why neither figure is derived from the other. Sabre Silencieux is exactly that case in the test data.
 *
 * `--house-color` and `--house-ink` are not set here: both cascade down from the .HouseCard article.
 */
function Leader({house}) {
    const leader = house.leader;

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

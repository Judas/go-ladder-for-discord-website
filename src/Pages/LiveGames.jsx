import { FaArrowUpRightFromSquare, FaUser } from 'react-icons/fa6';

import Avatar from '../Components/Avatar.jsx';
import Loader from '../Components/Loader.jsx';
import useApi from '../hooks/useApi.js';

import './LiveGames.css';

// The server refreshes its list from the OGS WebSocket about every ten seconds and calls it stale after sixty.
const REFRESH_MS = 15000;

/**
 * The OGS games in progress with at least one ladder member, from `/api/games/live`.
 *
 * Unlike the recent games, a side may be an outsider: `member` is null for an OGS player who is not on the ladder, so
 * there is no Discord name, avatar or tier to show — only what OGS says (`ogsName`, `ogsRank`, both nullable too).
 * No goban either: the payload carries no moves, and the card leads to the game on OGS rather than to a page here.
 */
export default function LiveGames() {
    const { status, data, httpStatus } = useApi('/api/games/live', { refreshMs: REFRESH_MS });

    if (status === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    }

    if (status === 'error') {
        return (
            <section className={'LiveGames'}>
                <h2 className={'PageTitle'}>Parties live</h2>
                {/* 503 means the server's list is missing or too old, not that nobody is playing: say so. */}
                <p className={'Error'}>{httpStatus === 503
                    ? 'La liste des parties en cours est momentanément indisponible.'
                    : 'Erreur lors de la récupération des parties en cours'}</p>
            </section>
        );
    }

    const games = data.games ?? [];
    const plural = games.length > 1 ? 's' : '';

    return (
        <section className={'LiveGames'}>
            <h2 className={'PageTitle'}>Parties live</h2>
            <p className={'LiveGames__Summary'}>
                {games.length} partie{plural} en cours sur OGS · mise à jour il y a {data.secondsSinceUpdate} s
            </p>

            {games.length === 0
                ? <p className={'Info LiveGames__Empty'}>Aucun joueur de la communauté ne joue sur OGS en ce moment.</p>
                : <ul className={'LiveGames__List NoBulletList'}>
                    {games.map(game => <li key={game.goldId}><LiveGameCard game={game}/></li>)}
                </ul>}
        </section>
    );
}

function LiveGameCard({ game }) {
    const details = [
        `${game.size}×${game.size}`,
        game.ranked == null ? null : (game.ranked ? 'Classée' : 'Libre'),
        game.handicap > 0 ? `Handicap ${game.handicap}` : null,
        game.moveNumber == null ? null : `Coup ${game.moveNumber}`,
    ].filter(Boolean);

    return (
        <article className={'LiveGameCard'}>
            <header className={'LiveGameCard__Band'}>
                <span className={'LiveGameCard__Live'}>En direct</span>
                {game.gold && <span className={'LiveGameCard__Gold'} title={'Les deux joueurs sont dans la communauté'}>GOLD</span>}
            </header>

            <div className={'LiveGameCard__Players'}>
                <Player participant={game.black} color={'black'} />
                <span className={'LiveGameCard__Vs'}>vs</span>
                <Player participant={game.white} color={'white'} />
            </div>

            {game.name && <p className={'LiveGameCard__Name'}>{game.name}</p>}

            <footer className={'LiveGameCard__Footer'}>
                <ul className={'LiveGameCard__Details NoBulletList'}>
                    {details.map(d => <li key={d}>{d}</li>)}
                </ul>
                <span className={'LiveGameCard__Ogs'} aria-hidden={true}>OGS <FaArrowUpRightFromSquare /></span>
            </footer>

            <a href={game.link} target={'_blank'} rel={'noopener noreferrer'}>
                <span className={'ReaderOnly'}>
                    Suivre la partie {displayName(game.black)} contre {displayName(game.white)} sur OGS (nouvel onglet)
                </span>
            </a>
        </article>
    );
}

/**
 * One side of the board. A member shows as everywhere else on the site; an outsider gets a neutral silhouette, their
 * OGS name and rank, and a muted style so the community's player stands out.
 */
function Player({ participant, color }) {
    const { member } = participant;

    return (
        <div className={`LiveGameCard__Player ${member ? '' : 'outsider'}`}>
            <span className={`LiveGameCard__Stone ${color}`} title={color === 'black' ? 'Noir' : 'Blanc'}>
                {member
                    ? <Avatar src={member.discordAvatar} size={48} alt={''} className={'LiveGameCard__Avatar'} />
                    : <span className={'LiveGameCard__Silhouette'} aria-hidden={true}><FaUser /></span>}
            </span>
            <span className={'LiveGameCard__PlayerName'}>{displayName(participant)}</span>
            <span className={'LiveGameCard__Rank'}>
                {member ? (member.tierName ?? participant.ogsRank ?? '') : (participant.ogsRank ?? '')}
            </span>
            {!member && <span className={'LiveGameCard__Outsider'}>Hors communauté</span>}
        </div>
    );
}

function displayName({ member, ogsName }) {
    return member?.discordName ?? ogsName ?? 'Joueur OGS';
}

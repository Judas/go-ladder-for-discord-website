import { Link, useParams } from "react-router-dom";

import Avatar from "../Components/Avatar.jsx";
import Crest from "../Components/Crest.jsx";
import Loader from "../Components/Loader.jsx";
import useApi from "../hooks/useApi.js";

import './LeagueSession.css';

export default function LeagueSession() {
    const { number } = useParams();
    const { status, data, httpStatus } = useApi(`/api/league/session/${number}`);

    if (status === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    }

    if (status === 'error') {
        return (
            <section className={'LeagueSession Container'}>
                <h2 className={'PageTitle PageTitle--standalone'}>Session introuvable</h2>
                <p className={'Error'}>
                    {httpStatus === 404
                        ? `La saison ne compte pas de session ${number}.`
                        : 'Erreur lors de la récupération de la session'}
                </p>
                <p className={'LeagueSession__Back'}><Link to={'/league'}>Retour à la ligue</Link></p>
            </section>
        );
    }

    const { session, matches, exemptions } = data;

    return (
        <section className={'LeagueSession Container'}>
            <h2 className={'PageTitle PageTitle--standalone'}>Session {session.number}</h2>
            <p className={'LeagueSession__Dates'}>
                {session.label}
                <span className={'LeagueSession__Count'}>saison {data.season}</span>
            </p>

            <Matches session={session} matches={matches} />
            <Exemptions exemptions={exemptions} />
        </section>
    );
}

/**
 * The pairings.
 *
 * An empty list means two different things and the page has to tell them apart: a session that was never drawn has
 * nothing yet, while one drawn with nobody to pair has exemptions instead. `session.drawn` is what separates them.
 */
function Matches({session, matches}) {
    if (matches.length === 0) {
        return (
            <p className={'LeagueSession__Empty'}>
                {session.drawn
                    ? "Le tirage n'a formé aucune rencontre pour cette session."
                    : "Cette session n'a pas encore été tirée."}
            </p>
        );
    }

    return (
        <ul className={'LeagueSession__Matches NoBulletList'}>
            {matches.map(match => (
                <li key={`${match.black.discordId}-${match.white.discordId}`}>
                    <Match match={match} settled={session.settled} />
                </li>
            ))}
        </ul>
    );
}

function Match({match, settled}) {
    const outcome = outcomeOf(match, settled);

    return (
        <article className={`MatchCard ${outcome.modifier}`}>
            <Side player={match.black} colour={'Noir'} edge={'black'} winner={match.winnerDiscordId === match.black.discordId} />
            <div className={'MatchCard__Middle'}>
                <span className={'MatchCard__Outcome'}>{outcome.label}</span>
                {/*
                  * ⚠ Only the spectator link ever leaves the server. black_invite and white_invite are never served
                  * on any route, not even to the player they belong to: no route here is authenticated, so a
                  * published player link would let anyone play anyone's match.
                  */}
                {match.spectatorLink && (
                    <a className={'MatchCard__Link'} href={match.spectatorLink} target={'_blank'} rel={'noreferrer'}>
                        Voir la partie
                    </a>
                )}
            </div>
            <Side player={match.white} colour={'Blanc'} edge={'white'} winner={match.winnerDiscordId === match.white.discordId} />
        </article>
    );
}

/**
 * `result` has three states and they must not be collapsed.
 *
 * `null` while the session runs means the match is still to play. `"unplayed"` means the settlement closed it
 * without it being played, so it will never count. Anything else is a real result, and `winnerDiscordId` — computed
 * by the server, since matching a colour to a player means knowing which side they were on — says who took it, or
 * is null for a draw or an annulled game.
 */
function outcomeOf(match, settled) {
    if (match.result === 'unplayed') { return { label: 'Non jouée', modifier: 'unplayed' }; }
    if (match.result == null) { return { label: settled ? 'Sans résultat' : 'À jouer', modifier: 'pending' }; }
    if (match.winnerDiscordId == null) { return { label: 'Nulle', modifier: 'draw' }; }
    return { label: 'Terminée', modifier: 'played' };
}

/**
 * One player of a pairing.
 *
 * `edge` is which half of the card this side occupies, and the crest is pushed to that outer edge — left for black,
 * right for white — so the two houses face each other across the outcome. The DOM order is the same on both sides,
 * crest first; the mirroring is `flex-direction: row-reverse` in the stylesheet, so a screen reader reads the two
 * sides the same way round.
 *
 * The small crest, despite the size: it is the simplified drawing, and it is what holds up when a house has to be
 * recognised at a glance rather than studied.
 */
function Side({player, colour, winner, edge}) {
    return (
        <Link to={`/player/${player.discordId}`} className={`MatchCard__Side ${edge} ${winner ? 'winner' : ''}`}>
            {player.house
                ? <Crest slug={player.house.slug} name={player.house.name} size={96} small={false}
                         className={'MatchCard__Crest'} />
                : <span className={'MatchCard__NoCrest'} aria-hidden={true} />}
            <span className={'MatchCard__Identity'}>
                <Avatar src={player.discordAvatar} size={48} alt={''} hidden={true} />
                <span className={'MatchCard__Name'}>{player.discordName ?? player.discordId}</span>
                <span className={'MatchCard__Colour'}>{colour}</span>
            </span>
        </Link>
    );
}

/**
 * The players the draw could not pair.
 *
 * They belong on the page: without them, a session looks as though it had forgotten an active member, when the draw
 * explicitly established there was nobody for them. An exemption is worth no points — it only keeps the
 * perfect-attendance bonus reachable.
 */
function Exemptions({exemptions}) {
    if (exemptions.length === 0) { return null; }

    return (
        <>
            <h3 className={'LeagueSession__SectionTitle'}>Sans adversaire</h3>
            <ul className={'LeagueSession__Exemptions NoBulletList'}>
                {exemptions.map(exemption => (
                    <li key={exemption.discordId}>
                        <Link to={`/player/${exemption.discordId}`} className={'LeagueSession__Exempt'}>
                            <Avatar src={exemption.discordAvatar} size={32} alt={''} hidden={true} />
                            <span>{exemption.discordName ?? exemption.discordId}</span>
                            <span className={'LeagueSession__Reason'}>{reasonLabel(exemption.reason)}</span>
                        </Link>
                    </li>
                ))}
            </ul>
            <p className={'LeagueSession__ExemptNote'}>
                Une exemption ne rapporte aucun point, elle permet seulement de garder le bonus de saison complète.
            </p>
        </>
    );
}

function reasonLabel(reason) {
    if (reason === 'ODD') { return 'effectif impair'; }
    if (reason === 'NO_RIVAL') { return 'plus aucun adversaire d’une autre maison'; }
    return reason;
}

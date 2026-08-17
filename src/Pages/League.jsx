import { Link } from "react-router-dom";

import Avatar from "../Components/Avatar.jsx";
import Crest from "../Components/Crest.jsx";
import Loader from "../Components/Loader.jsx";
import SeasonBanner from "../Components/SeasonBanner.jsx";
import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import useApi from "../hooks/useApi.js";

import './League.css';

export default function League() {
    const { status, data } = useApi('/api/league');

    if (status === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    }

    if (status === 'error') {
        return (
            <section className={'League Container'}>
                <h2 className={'PageTitle'}>Ligue</h2>
                <p className={'Error'}>Erreur lors de la récupération de la ligue</p>
            </section>
        );
    }

    return (
        <section className={'League Container'}>
            <h2 className={'PageTitle'}>Ligue</h2>

            <SeasonBanner period={data.period} season={data.season} />

            <CurrentSession session={data.currentSession} />
            <Calendar sessions={data.sessions} current={data.currentSession} />
            <Standings standings={data.standings} sessionCount={data.sessionCount} />
        </section>
    );
}

/**
 * What is running, or the fact that nothing is.
 *
 * `currentSession` is null out of season **and** inside the two holes of the calendar — the first half of September
 * and the second half of December. That is an answer, not a gap, so it is stated rather than hidden.
 */
function CurrentSession({session}) {
    if (session == null) {
        return <p className={'League__NoSession'}>Aucune session en cours.</p>;
    }

    return (
        <Link to={`/league/session/${session.number}`} className={'League__Current'}>
            <span className={'League__CurrentLabel'}>Session {session.number}</span>
            <span className={'League__CurrentDates'}>{session.label}</span>
            <span className={'League__CurrentState'}>{sessionState(session)}</span>
        </Link>
    );
}

/**
 * The whole calendar in one block.
 *
 * The server sends all sixteen so a page does not have to make sixteen calls, and the two holes are read by absence:
 * nothing sits between session 6 and session 7, while the numbering runs 1 to 16 without a break.
 */
function Calendar({sessions, current}) {
    return (
        <>
            <h3 className={'League__SectionTitle'}>Calendrier</h3>
            <ul className={'League__Calendar NoBulletList'}>
                {sessions.map(session => (
                    <li key={session.number}>
                        <Link
                            to={`/league/session/${session.number}`}
                            className={`League__Session ${current?.number === session.number ? 'current' : ''}`}>
                            <span className={'League__SessionNumber'}>{session.number}</span>
                            <span className={'League__SessionLabel'}>{session.label}</span>
                            <span className={'League__SessionState'}>{sessionState(session)}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}

/**
 * `drawn` and `settled` are both false for a session with no row at all, which is the honest answer for one that was
 * never drawn — so the three states are read in this order and never inferred from a date.
 */
function sessionState(session) {
    if (session.settled) { return 'réglée'; }
    if (session.drawn) { return 'tirée'; }
    return 'à venir';
}

function Standings({standings, sessionCount}) {
    if (standings.length === 0) {
        return (
            <>
                <h3 className={'League__SectionTitle'}>Classement</h3>
                <p className={'League__Empty'}>Personne n'a encore rejoint la ligue cette saison.</p>
            </>
        );
    }

    return (
        <>
            <h3 className={'League__SectionTitle'}>Classement</h3>

            <div className={'League__StandingsScroll'}>
                <TableElement className={'League__Standings'}>
                    <RowGroupElement className={'League__StandingsHead'}>
                        <RowElement>
                            <ColHeaderElement className={'League__Rank'}><span className={'ReaderOnly'}>Rang</span></ColHeaderElement>
                            <ColHeaderElement className={'League__Avatar'}><span className={'ReaderOnly'}>Avatar</span></ColHeaderElement>
                            <ColHeaderElement className={'League__Player'}>Joueur</ColHeaderElement>
                            <ColHeaderElement className={'League__Crest'}><span className={'ReaderOnly'}>Maison</span></ColHeaderElement>
                            <ColHeaderElement className={'League__Figure'} title={'Matchs joués'}><span className={'ReaderOnly'}>Matchs joués</span>J</ColHeaderElement>
                            <ColHeaderElement className={'League__Figure'} title={'Victoires'}><span className={'ReaderOnly'}>Victoires</span>V</ColHeaderElement>
                            <ColHeaderElement className={'League__Figure'} title={'Défaites'}><span className={'ReaderOnly'}>Défaites</span>D</ColHeaderElement>
                            <ColHeaderElement className={'League__Figure'} title={'Sessions sans adversaire'}><span className={'ReaderOnly'}>Exemptions</span>E</ColHeaderElement>
                            <ColHeaderElement className={'League__Renown'}>Renommée</ColHeaderElement>
                        </RowElement>
                    </RowGroupElement>
                    <RowGroupElement className={'League__StandingsBody'}>
                        {standings.map(player => <StandingRow key={player.discordId} player={player} />)}
                    </RowGroupElement>
                </TableElement>
            </div>

            <Scale sessionCount={sessionCount} />
        </>
    );
}

/**
 * One line of the standings.
 *
 * `exempted` is printed and not hidden as an internal detail: the perfect-attendance bonus is
 * `played + exempted == sessionCount`, so a page showing only `played` would make a legitimate bonus look wrongly
 * awarded. Inactive members are marked, never dropped — their renown stays theirs, they are simply no longer drawn.
 */
function StandingRow({player}) {
    return (
        <RowElement className={`League__Row ${player.active ? '' : 'inactive'}`}>
            <CellElement colIndex={1} className={'League__Rank'}>{player.rank}</CellElement>
            <CellElement colIndex={2} className={'League__Avatar'}>
                <Avatar src={player.discordAvatar} size={40} alt={''} hidden={true} />
            </CellElement>
            <CellElement colIndex={3} className={'League__Player'}>
                {player.discordName ?? player.discordId}
                {!player.active && <span className={'League__Inactive'}>a quitté la ligue</span>}
            </CellElement>
            <CellElement colIndex={4} className={'League__Crest'}>
                {player.house
                    ? <Crest slug={player.house.slug} name={player.house.name} size={24} />
                    : <span className={'ReaderOnly'}>Sans maison</span>}
            </CellElement>
            <CellElement colIndex={5} className={'League__Figure'}>{player.played}</CellElement>
            <CellElement colIndex={6} className={'League__Figure'}>{player.won}</CellElement>
            <CellElement colIndex={7} className={'League__Figure'}>{player.lost}</CellElement>
            <CellElement colIndex={8} className={'League__Figure'}>{player.exempted}</CellElement>
            <CellElement colIndex={9} className={'League__Renown'}>{player.renown.total}</CellElement>
            <Link to={`/player/${player.discordId}`} />
        </RowElement>
    );
}

/** `sessionCount` comes from the response — hardcoding 16 would be wrong the day the split changes. */
function Scale({sessionCount}) {
    return (
        <p className={'League__Scale'}>
            2 points par match joué, 5 par victoire, et 10 de plus pour qui a joué ou été exempté sur
            les {sessionCount} sessions de la saison.
        </p>
    );
}

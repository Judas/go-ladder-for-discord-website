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

            <Calendar sessions={data.sessions} current={data.currentSession} />
            <Standings standings={data.standings} sessionCount={data.sessionCount} />
        </section>
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
                            className={`League__Session ${sessionPhase(session, current)}`}>
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
 * Where a session sits on the calendar: behind us, running, or still to come.
 *
 * Which one is **running** is the server's call — `currentSession` is null out of season and inside the two holes of
 * the calendar, and no arithmetic here would get that right. Whether a session is behind us is read off `end`, which
 * is served as an ISO instant with an offset precisely so code can ask that question; `end` is exclusive, so a
 * session ending "1 to 14" is over from the 15th at 00:00.
 *
 * Not read off `settled`: out of season every session past is settled *and* every session never drawn is not, so a
 * whole finished season would come back as half of it still to come.
 */
function sessionPhase(session, current) {
    if (current?.number === session.number) { return 'current'; }
    if (Date.parse(session.end) <= Date.now()) { return 'past'; }
    return 'upcoming';
}

/**
 * `drawn` and `settled` are both false for a session with no row at all, which is the honest answer for one that was
 * never drawn — so the three states are read in this order and never inferred from a date.
 */
function sessionState(session) {
    if (session.settled) { return 'terminée'; }
    if (session.drawn) { return 'en cours'; }
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
                            <ColHeaderElement className={'League__Player'}><span className={'ReaderOnly'}>Joueur</span></ColHeaderElement>
                            <ColHeaderElement className={'League__Crest'}><span className={'ReaderOnly'}>Maison</span></ColHeaderElement>
                            <ColHeaderElement className={'League__Figure'} title={'Matchs joués'}><span className={'ReaderOnly'}>Matchs joués</span>J</ColHeaderElement>
                            <ColHeaderElement className={'League__Figure'} title={'Victoires'}><span className={'ReaderOnly'}>Victoires</span>V</ColHeaderElement>
                            <ColHeaderElement className={'League__Figure'} title={'Défaites'}><span className={'ReaderOnly'}>Défaites</span>D</ColHeaderElement>
                            {/* E is for exemptions — sessions the draw could not pair the player in. Not "égalité":
                                the league has no draws column, and this figure is load-bearing, see StandingRow. */}
                            <ColHeaderElement className={'League__Figure'} title={'Exemptions : sessions sans adversaire'}><span className={'ReaderOnly'}>Exemptions</span>E</ColHeaderElement>
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
                {!player.active && <span className={'League__Inactive'}>Inactif</span>}
            </CellElement>
            <CellElement colIndex={4} className={'League__Crest'}>
                {player.house
                    ? <Crest slug={player.house.slug} name={player.house.name} size={28} small={true} />
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

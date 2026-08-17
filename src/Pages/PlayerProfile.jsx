import { useState } from 'react';
import { Link, useParams } from "react-router-dom";
import { FaCircleInfo } from "react-icons/fa6";

import { hasValidProfile, getProfile } from '../AuthProfile.js';
import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import Loader from "../Components/Loader.jsx";
import Avatar from "../Components/Avatar.jsx";
import Crest from "../Components/Crest.jsx";
import useApi from "../hooks/useApi.js";

import './PlayerProfile.css'

export default function PlayerProfile() {
    const {playerId} = useParams()

    const [tooltipVisible, setTooltipVisible] = useState(false);

    // Three requests, deliberately: the profile changes with the route, the tier scale does not, and the calendar
    // is not on the profile at all.
    const { status: playerFetchStatus, data: player, reload } = useApi(`/api/player/${playerId}`);
    const { status: tiersFetchStatus, data: tiers } = useApi('/api/tiers');
    // ⚠ `period` rides on the `house` and `league` blocks — and both are null exactly when the join buttons are
    // needed, so a profile alone cannot say whether the season is open. /api/houses always carries it.
    const { data: calendar } = useApi('/api/houses');

    if (playerFetchStatus === 'success' && tiersFetchStatus === 'success') {
        return (
            <article className={'PlayerProfile'}>
                <Profile player={player} tiers={tiers} period={calendar?.period} reload={reload}
                         tooltipHandler={() => setTooltipVisible(true)} />
                {tooltipVisible && (
                    <div className={'Tooltip'}>
                        <button className={'CallToAction'} onClick={() => setTooltipVisible(false)}>
                            <span className={'ReaderOnly'}>Fermer</span>
                        </button>
                        <Tooltip />
                    </div>
                )}
            </article>
        );
    } else if (playerFetchStatus === 'pending' || tiersFetchStatus === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    } else {
        return <div style={{display: 'grid', height: '100%',}}><p className={'Error'}>Echec lors de la récupération du profil.</p></div>;
    }
}

function Profile({player, tiers, period, reload, tooltipHandler}) {
    let playerRating = player.rating > 0 
        ? <h2 className={'PlayerProfile__Rating'}>{Math.round(player.rating)}</h2>
        : <h2 className={'PlayerProfile__Unranked'}>[Non classé]</h2>

    return (
        <>
            <div className={'PlayerProfile__LeftColumn'}>
                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Parties récentes</span></h2>
                    <GameList player={player} />
                </div>

                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Maison</span></h2>
                    <HouseSection player={player} period={period} reload={reload} />
                </div>

                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Ligue</span></h2>
                    <LeagueSection player={player} period={period} reload={reload} />
                </div>
            </div>

            <div className={'PlayerProfile__RightColumn'}>
                <div className={'CardHighlighted'}>
                    <h2 className={'CardHeader'}><span>{player.discordName}</span></h2>
                    <Avatar src={player.discordAvatar} size={96} className={'PlayerProfile__Avatar'} alt={`avatar ${player.discordName}`} hidden={true}/>

                    <div className={'CardContent'}>
                        <div className={'PlayerProfile__Tier'}>
                            <TierScale player={player} tiers={tiers} />
                            <p className={'PlayerProfile__TierName'} >{player.tierName}</p>
                            { playerRating }
                        </div>
                    </div>
                </div>

                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Comptes</span></h2>
                    <AccountList player={player} />
                </div>

                <div className={'Card TootipIconParent'}>
                    <h2 className={'CardHeader'}>
                        <span>Validation FGC</span>
                        <span className={'TootipIcon'} onClick={tooltipHandler}><FaCircleInfo /></span>
                    </h2>
                    <Stability player={player} />
                </div>
            </div>
        </>
    );
}

/**
 * Whether the visitor is looking at their own profile.
 *
 * The API authenticates nothing — a join carries the Discord id in its body and takes it as it comes — so this is
 * about not offering a button that acts on somebody else, not about security. Read straight from localStorage, as
 * the header does.
 */
function isOwnProfile(player) {
    return hasValidProfile() && getProfile().discordId === player.discordId;
}

/**
 * The house block, or the way into one.
 *
 * `house` is null for a player in none. Joining is refused outside the season — the server answers 403, and the
 * choices of the summer are what move people — so the button is replaced by the date it reopens rather than left to
 * fail. `period` comes from /api/houses, never from a date computed here.
 */
function HouseSection({player, period, reload}) {
    const house = player.house;

    if (house == null) {
        return <JoinHouse player={player} period={period} reload={reload} />;
    }

    return (
        <div className={'PlayerProfile__House'} style={{'--house-color': house.color}}>
            <Link to={`/house/${house.slug}`} className={'PlayerProfile__HouseIdentity'}>
                <Crest slug={house.slug} name={house.name} size={72} small={true} />
                <span className={'PlayerProfile__HouseName'}>{house.name}</span>
                <span className={'PlayerProfile__HouseTagline'}>{house.tagline}</span>
            </Link>

            <dl className={'PlayerProfile__Figures'}>
                <div>
                    <dt>Rang</dt>
                    <dd>{house.rank}</dd>
                </div>
                <div>
                    <dt>Points</dt>
                    <dd>{house.points.total}</dd>
                </div>
            </dl>
        </div>
    );
}

function JoinHouse({player, period, reload}) {
    if (!isOwnProfile(player)) {
        return <p className={'PlayerProfile__Empty'}>Ce joueur n'appartient à aucune maison.</p>;
    }

    if (period === 'VACATION') {
        return (
            <p className={'PlayerProfile__Empty'}>
                Vous pourrez rejoindre une maison à partir du 1<sup>er</sup> septembre.
            </p>
        );
    }

    return (
        <Action
            path={'/api/house/join'}
            body={{ discordId: player.discordId }}
            label={'Rejoindre une maison'}
            hint={"La maison est tirée au sort parmi les moins peuplées."}
            reload={reload} />
    );
}

/**
 * The league block, the way into it, or why the way is closed.
 *
 * The server refuses a join with 404 when any of its three conditions fails — known, in a house, OGS account linked —
 * without saying which. The site knows two of them from the profile it already has, so it says so before letting
 * anyone click.
 */
function LeagueSection({player, period, reload}) {
    const league = player.league;

    if (league != null) {
        return (
            <div className={'PlayerProfile__League'}>
                <dl className={'PlayerProfile__Figures'}>
                    <div>
                        <dt>Rang</dt>
                        <dd>{league.rank}</dd>
                    </div>
                    <div>
                        <dt>Renommée</dt>
                        <dd>{league.renown.total}</dd>
                    </div>
                </dl>
                <p className={'PlayerProfile__LeagueRecord'}>
                    {league.played} joué{league.played > 1 ? 's' : ''} · {league.won} gagné{league.won > 1 ? 's' : ''}
                    {' '}· {league.exempted} exempté{league.exempted > 1 ? 's' : ''} sur {league.sessionCount} sessions
                </p>
                {!league.active && <p className={'PlayerProfile__Empty'}>Inactif : plus tiré au sort cette saison.</p>}
            </div>
        );
    }

    if (player.house == null) {
        return <p className={'PlayerProfile__Empty'}>Il faut appartenir à une maison pour rejoindre la ligue.</p>;
    }

    if (!isOwnProfile(player)) {
        return <p className={'PlayerProfile__Empty'}>Ce joueur n'a pas rejoint la ligue.</p>;
    }

    if (period === 'VACATION') {
        return (
            <p className={'PlayerProfile__Empty'}>
                Les académies se forment à la rentrée : rendez-vous le 1<sup>er</sup> septembre.
            </p>
        );
    }

    return (
        <Action
            path={'/api/league/join'}
            body={{ discordId: player.discordId }}
            label={'Rejoindre la ligue'}
            hint={"Un compte OGS lié est nécessaire."}
            reload={reload} />
    );
}

/**
 * A button that POSTs and then makes the page read itself again.
 *
 * The refetch is the point: the profile is what says whether the player is in a house, so nothing else would show
 * the result of a join. `useApi` cannot serve this — it is a GET hook — so the request is written out here.
 */
function Action({path, body, label, hint, reload}) {
    const [state, setState] = useState('idle');

    const submit = () => {
        setState('pending');
        fetch(path, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then(res => {
                if (!res.ok) { throw res.status; }
                setState('idle');
                reload();
            })
            .catch(status => setState(status === 403 ? 'forbidden' : status === 409 ? 'conflict' : 'error'));
    };

    return (
        <div className={'PlayerProfile__Action'}>
            <button type={'button'} className={'PlayerProfile__ActionButton'} onClick={submit} disabled={state === 'pending'}>
                {state === 'pending' ? 'En cours…' : label}
            </button>
            <p className={'PlayerProfile__ActionHint'}>{hint}</p>
            {state === 'forbidden' && <p className={'Error'}>Ce n'est pas la période pour ça.</p>}
            {state === 'conflict' && <p className={'Error'}>C'est déjà fait.</p>}
            {state === 'error' && <p className={'Error'}>L'inscription a échoué. Vérifiez qu'un compte est bien lié.</p>}
        </div>
    );
}

/** How many tiers to show either side of the player's own. */
const TIER_WINDOW = 2;

/**
 * The player's tier and its neighbours: two below, two above, fewer at the ends of the ladder.
 *
 * Replaces the progress bar between two tiers, which disappeared entirely at the top tier and for an unranked
 * player — the two cases it was least able to explain. Drawn from `/api/tiers` rather than a hardcoded eight: the
 * server owns how many there are, and the window follows whatever it sends.
 *
 * An unranked player has `tierRank: 0`, which matches no tier. The window then anchors at the bottom of the ladder,
 * which is what they have ahead of them, and nothing is picked out.
 */
function tierWindow(tiers, tierRank) {
    const index = tiers.findIndex(tier => tier.rank === tierRank);
    const anchor = index === -1 ? 0 : index;

    return tiers.slice(Math.max(0, anchor - TIER_WINDOW), anchor + TIER_WINDOW + 1);
}

function TierScale({player, tiers}) {
    return (
        <ol className={'PlayerProfile__TierScale NoBulletList'}>
            {tierWindow(tiers, player.tierRank).map(tier => (
                <li key={tier.rank}>
                    <span
                        className={`PlayerProfile__TierStep ${tier.rank === player.tierRank ? 'current' : ''}`}
                        title={`${tier.name} — ${tier.min} à ${tier.max}`}>
                        <img width="48" height="48" src={`/shields/shield-${tier.rank}.svg`} alt={tier.name} />
                        {tier.rank === player.tierRank && <span className={'ReaderOnly'}>(palier actuel)</span>}
                    </span>
                </li>
            ))}
        </ol>
    );
}

function AccountList({player}) {
    let accountList;
    if (player.accounts.length === 0) {
        accountList = (<p className={'NoAccount'}>Aucun compte lié</p>);
    } else {
        accountList = (
            <RowGroupElement className={'PlayerProfile__AccountListContent'}>
                {player.accounts.map(account => <AccountRow key={`${account.server}-${account.id}`} account={account} />)}
            </RowGroupElement>
        );
    }

    let addAccount;
    if (hasValidProfile() && getProfile().discordId == player.discordId) {
        addAccount = (<a href='/link' className={'AddAccount'}>Lier un compte</a>);
    } else {
        addAccount = (<></>);
    }

    return (
        <TableElement className={'PlayerProfile__AccountList'}>
            <RowGroupElement className={'ReaderOnly'}>
                <RowElement>
                    <ColHeaderElement>Serveur</ColHeaderElement>
                    <ColHeaderElement>Pseudo</ColHeaderElement>
                    <ColHeaderElement>Rang</ColHeaderElement>
                </RowElement>
            </RowGroupElement>
            {accountList}
            {addAccount}
        </TableElement>
    );
}

function AccountRow({account}) {
    return (
        <RowElement className={'PlayerProfile__AccountItem'}>
            <CellElement className={'PlayerProfile__AccountServer'}>{account.server}</CellElement>
            <CellElement className={'PlayerProfile__AccountPseudo'}>{account.name}</CellElement>
            <CellElement className={'PlayerProfile__AccountRank'}>{account.rank}</CellElement>
            <a href={account.link ?? "#"} target='_blank' />
        </RowElement>
    );
}

function GameList({player}) {
    if (player.games.length === 0) {
        return <p className={'NoGame'}>Aucune partie récente</p>;
    }

    return (
        <TableElement className={'PlayerProfile__GameList'}>
            <RowGroupElement className={'ReaderOnly'}>
                <RowElement>
                    <ColHeaderElement>Date</ColHeaderElement>
                    <ColHeaderElement>Résultat</ColHeaderElement>
                    <ColHeaderElement>Avatar adversaire</ColHeaderElement>
                    <ColHeaderElement>Nom adversaire</ColHeaderElement>
                    <ColHeaderElement>Division adversaire</ColHeaderElement>
                </RowElement>
            </RowGroupElement>
            <RowGroupElement className={'PlayerProfile__GameListContent'}>
                {player.games.map(game => <GameRow key={game.goldId} player={player} game={game} />)}
            </RowGroupElement>
        </TableElement>
    );
}

function GameRow({player, game}) {
    const mainIsBlack = game.black.discordId === player.discordId;
    const opponent = game.black.discordId === player.discordId ? game.white : game.black;
    const mainResult = game.result == "jigo" ? 'draw' :
                    (mainIsBlack && game.result == "black") || (!mainIsBlack && game.result == "white") ? 'victory' :
                    'defeat';
    return (
        <RowElement className={'PlayerProfile__GameItem'}>
            <CellElement className={'PlayerProfile__GameDate'}>{game.date}</CellElement>
            <CellElement className={'PlayerProfile__GameResult'}><span className={mainResult} /></CellElement>
            <CellElement className={'PlayerProfile__GameAvatar'}>
                <Avatar src={opponent.discordAvatar} alt={`avatar ${opponent.discordName}`} className={'PlayerProfile__GameAvatarPicture'}/>
            </CellElement>
            <CellElement className={'PlayerProfile__GameName'}>{opponent.discordName}</CellElement>
            <CellElement className={'PlayerProfile__GameTier'}>
                <img width="48" height="48" src={`/shields/shield-${opponent.tierRank}.svg`} alt={opponent.tierName}/>
                <p>{opponent.tierName}</p>
            </CellElement>
            <Link to={`/game/${game.goldId}`} />
        </RowElement>
    );
}

/**
 * The two FGC counters.
 *
 * The threshold is only worth printing while it is still a target: "2/4" says what is missing, but once the count is
 * met "5/4" reads like a cap that has been exceeded rather than a condition that is satisfied.
 */
function Stability({player}) {
    return (
        <div className={'PlayerProfile__Stability'}>
            <StabilityItem count={player.totalRankedGames} threshold={4} text={`parties`} goldSpan={false} />
            <StabilityItem count={player.goldRankedGames} threshold={2} text={`parties`} goldSpan={true} />
        </div>
    );
}

function StabilityItem({count, threshold, text, goldSpan}) {
    const valid = count >= threshold;

    return (
        <div className={'PlayerProfile__StabilityItem'}>
            <span className={valid ? 'valid' : 'invalid'} />
            <p className={'PlayerProfile__StabilityHighlight'}>{valid ? count : `${count}/${threshold}`}</p>
            <p className={'PlayerProfile__StabilityText'}>
                {text}
                {goldSpan && <span> GOLD</span>}
            </p>
        </div>
    );
}

function Tooltip() {
    return (
        <>
            <h2>Conditions de validation</h2>
            <p>Pour être valide une partie doit respecter tous ces paramètres :</p>
            <ul>
                <li>Partie classée</li>
                <li>Jouée sur OGS ou KGS</li>
                <li>Datant de moins de 30 jours</li>
                <li>Goban 19x19</li>
                <li>Pas de handicap</li>
                <li>Komi compris entre 6 et 9</li>
            </ul>
            <p>Une partie <span>GOLD</span> est une partie jouée entre 2 joueurs inscrits sur l'échelle.</p>
        </>
    );
}

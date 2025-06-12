import React, { useEffect, useState } from 'react';
import { Link, useParams } from "react-router-dom";
import { FaMedal, FaStar } from 'react-icons/fa6';

import { hasValidProfile, getProfile } from '../AuthProfile.js';
import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import Loader from "../Components/Loader.jsx";
import Avatar from "../Components/Avatar.jsx";

import './PlayerProfile.css'

export default function PlayerProfile() {
    const {playerId} = useParams()

    const [player, setPlayer] = useState(undefined)
    const [playerFetchStatus, setPlayerFetchStatus] = useState('pending');
    const [tiers, setTiers] = useState(undefined)
    const [tiersFetchStatus, setTiersFetchStatus] = useState('pending');

    // Fetch player
    useEffect(() => {
        fetch(`/api/player/${playerId}`)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setPlayer(res);
                setPlayerFetchStatus('success');
            })
            .catch(() => setPlayerFetchStatus('error'));
    }, [playerId]);

    // Fetch tiers
    useEffect(() => {
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

    if (playerFetchStatus === 'success' && tiersFetchStatus === 'success') {
        return <Profile player={player} tiers={tiers} />;
    } else if (playerFetchStatus === 'pending' || tiersFetchStatus === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    } else {
        return <div style={{display: 'grid', height: '100%',}}><p className={'Error'}>Echec lors de la récupération du profil.</p></div>;
    }
}

function Profile({player, tiers}) {
    let playerRating = player.rating > 0 
        ? <h2 className={'PlayerProfile__Rating'}>{Math.round(player.rating)}</h2>
        : <h2 className={'PlayerProfile__Unranked'}>[Non classé]</h2>

    return (
        <article className={'PlayerProfile'}>
            <div className={'PlayerProfile__LeftColumn'}>
                <div className={'CardHighlighted'}>
                    <h2 className={'CardHeader'}><span>{player.discordName}</span></h2>
                    <Avatar src={player.discordAvatar} size={96} className={'PlayerProfile__Avatar'} alt={`avatar ${player.discordName}`} hidden={true}/>
                    
                    <div className={'CardContent'}>
                        <div className={'PlayerProfile__Tier'}>
                            <img className={'PlayerProfile__TierShield'} width="192" height="192" src={`${process.env.PUBLIC_URL}/shields/shield-${player.tierRank}.svg`} alt={player.tierName}/>
                            <TierProgression player={player} tiers={tiers} />
                            <p className={'PlayerProfile__TierName'} >{player.tierName}</p>
                            { playerRating }
                        </div>
                    </div>
                </div>

                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Parties récentes</span></h2>
                    <GameList player={player} />
                </div>
            </div>

            <div className={'PlayerProfile__RightColumn'}>
                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Comptes</span></h2>
                    <AccountList player={player} />
                </div>

                <div className={'Card'}>
                    <h2 className={'CardHeader'}><span>Validation FGC</span></h2>
                    <Stability player={player} />
                </div>
            </div>
        </article>
    );
}

function TierProgression({player, tiers}) {
    var currentTier = tiers.filter(tier => tier.rank === player.tierRank)[0];
    const lastTierRank = Math.max.apply(null, tiers.map(tier => tier.rank));

    // If player is not ranked yet
    if (currentTier == null) {
        return null;
    }

    // If last tier, do not display the progress bar
    if (currentTier.rank === lastTierRank) {
        return null;
    }

    const total = currentTier.max - currentTier.min;
    const progress = Math.round(player.rating) - currentTier.min;
    const ratio = 100 * progress / total;

    var previousShield;
    if (currentTier.rank == 1) {
        previousShield = (<div width="64" height="64" style={{ margin: "0 0.5rem 0 0" }} />);
    } else {
        previousShield = (<img width="64" height="64" style={{ margin: "0 0.5rem 0 0" }} alt={currentTier.name}
        src={`${process.env.PUBLIC_URL}/shields/shield-${currentTier.rank - 1}.svg`} />);
    }

    return (
        <div className={'PlayerProfile__TierContainer'}>
            {previousShield}
            <div className={'PlayerProfile__ProgressBarContainer'}>
                <div className={'PlayerProfile__ProgressBar'} style={{width: `${ratio}%`}} />
                <span className={'PlayerProfile__ProgressBarLabel'}>{progress} / {total}</span>
            </div>
            <img width="64" height="64" style={{ margin: "0 0 0 0.5rem" }}
                src={`${process.env.PUBLIC_URL}/shields/shield-${currentTier.rank + 1}.svg`} />
        </div>
    );
}

function AccountList({player}) {
    let accountList;
    if (player.accounts.length === 0) {
        accountList = (<p className={'NoAccount'}>Aucun compte lié</p>);
    } else {
        accountList = (
            <RowGroupElement className={'PlayerProfile__AccountListContent'}>
                {player.accounts.map(account => <AccountRow account={account} />)}
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
        <RowElement key={account.name} className={'PlayerProfile__AccountItem'}>
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
                {player.games.map(game => <GameRow player={player} game={game} />)}
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
        <RowElement key={game.id} className={'PlayerProfile__GameItem'}>
            <CellElement className={'PlayerProfile__GameDate'}>{game.date}</CellElement>
            <CellElement className={'PlayerProfile__GameResult'}><span className={mainResult} /></CellElement>
            <CellElement className={'PlayerProfile__GameAvatar'}>
                <Avatar src={opponent.discordAvatar} alt={`avatar ${opponent.discordName}`} className={'PlayerProfile__GameAvatarPicture'}/>
            </CellElement>
            <CellElement className={'PlayerProfile__GameName'}>{opponent.discordName}</CellElement>
            <CellElement className={'PlayerProfile__GameTier'}>
                <img width="48" height="48" src={`${process.env.PUBLIC_URL}/shields/shield-${opponent.tierRank}.svg`} alt={opponent.tierName}/>
                <p>{opponent.tierName}</p>
            </CellElement>
            <Link to={`/game/${game.goldId}`} />
        </RowElement>
    );
}

function Stability({player}) {
    return (
        <div className={'PlayerProfile__Stability'}>
            <StabilityItem
                valid={player.totalRankedGames >= 4} 
                highlight={`${player.totalRankedGames}/4`}
                text={`parties (classées)`}
            />
            <StabilityItem
                valid={player.goldRankedGames >= 2}
                highlight={`${player.goldRankedGames}/2`}
                text={`parties GOLD (classées)`}
            />
            <p className={'PlayerProfile__StabilityPeriod'}>sur les 30 derniers jours</p>
        </div>
    );
}

function StabilityItem({valid, highlight, text}) {
    return (
        <div className={'PlayerProfile__StabilityItem'}>
            <span className={valid ? 'valid' : 'invalid'} />
            <p className={'PlayerProfile__StabilityHighlight'}>{highlight}</p>
            <p className={'PlayerProfile__StabilityText'}>{text}</p>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { Link, useParams } from "react-router-dom";

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
    const [refStability, setRefStability] = useState(undefined)
    const [refStabilityFetchStatus, setRefStabilityFetchStatus] = useState('pending');
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

    // Fetch stability ref values
    useEffect(() => {
        fetch(`/api/stability`)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setRefStability(res);
                setRefStabilityFetchStatus('success');
            })
            .catch(() => setRefStabilityFetchStatus('error'));
    }, []);

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

    if (playerFetchStatus === 'success' && refStabilityFetchStatus === 'success' && tiersFetchStatus === 'success') {
        return <Profile player={player} refStability={refStability} tiers={tiers} />;
    } else if (playerFetchStatus === 'pending' || refStabilityFetchStatus === 'pending' || tiersFetchStatus === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    } else {
        return <div style={{display: 'grid', height: '100%',}}><p className={'Error'}>Echec lors de la récupération du profil.</p></div>;
    }
}

function Profile({player, refStability, tiers}) {
    let playerRating = player.ranked 
        ? <h2 className={'PlayerProfile__Rating'}>{player.rating} ± {player.deviation}</h2>
        : <h2 className={'PlayerProfile__Unranked'}>{player.rating} ± {player.deviation} [Non classé]</h2>

    return (
        <article className={'PlayerProfile'}>
            <div className={'PlayerProfile__LeftColumn'}>
                <div className={'PlayerProfile__CardHighlighted'}>
                    <h2 className={'PlayerProfile__Header'}><span>{player.name}</span></h2>
                    <Avatar src={player.avatar} size={96} className={'PlayerProfile__Avatar'} alt={`avatar ${player.name}`} hidden={true}/>
                    
                    <div className={'PlayerProfile__CardContent'}>
                        <div className={'PlayerProfile__Tier'}>
                            <img className={'PlayerProfile__TierShield'} width="192" height="192" src={`${process.env.PUBLIC_URL}/shields/shield-${player.tierRank}.svg`} alt={player.tierName}/>
                            <p className={'PlayerProfile__TierName'} >{player.tierName}</p>
                        </div>

                        <div className={'PlayerProfile__TierProgression'}>
                            { playerRating }
                            <TierProgression player={player} tiers={tiers} />
                        </div>
                    </div>
                </div>

                <div className={'PlayerProfile__Card'}>
                    <h2 className={'PlayerProfile__Header'}><span>Parties récentes</span></h2>
                    <GameList player={player} />
                </div>
            </div>

            <div className={'PlayerProfile__RightColumn'}>
                <div className={'PlayerProfile__Card'}>
                    <h2 className={'PlayerProfile__Header'}><span>Comptes</span></h2>
                    <AccountList player={player} />
                </div>

                <div className={'PlayerProfile__Card'}>
                    <h2 className={'PlayerProfile__Header'}><span>Validation FGC</span></h2>
                    <Stability player={player} refStability={refStability} />
                </div>
            </div>
        </article>
    );
}

function TierProgression({player, tiers}) {
    const currentTier = tiers.filter(tier => tier.rank === player.tierRank)[0];
    const lastTierRank = Math.max.apply(null, tiers.map(tier => tier.rank));

    // If last tier, do not display the progress bar
    if (currentTier.rank === lastTierRank) {
        return null;
    }

    const total = currentTier.max - currentTier.min;
    const progress = player.rating - currentTier.min;
    const ratio = 100 * progress / total;

    return (
        <div className={'PlayerProfile__TierContainer'}>
            <img width="64" height="64" style={{ margin: "0 0.5rem 0 0" }} alt={currentTier.name}
                src={`${process.env.PUBLIC_URL}/shields/shield-${currentTier.rank}.svg`} />
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
    if (player.accounts.length === 0) {
        return <p className={'NoAccount'}>Aucun compte lié</p>;
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
            <RowGroupElement className={'PlayerProfile__AccountListContent'}>
                {player.accounts.map(account => <AccountRow account={account} />)}
            </RowGroupElement>
        </TableElement>
    );
}

function AccountRow({account}) {
    return (
        <RowElement key={account.name} className={'PlayerProfile__AccountItem'}>
            <CellElement className={'PlayerProfile__AccountServer'}>{account.name}</CellElement>
            <CellElement className={'PlayerProfile__AccountPseudo'}>{account.pseudo}</CellElement>
            <CellElement className={'PlayerProfile__AccountRank'}>{account.rank}</CellElement>
            <a href={account.link ?? "#"} />
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
                    <ColHeaderElement>Avatar adversaire</ColHeaderElement>
                    <ColHeaderElement>Nom adversaire</ColHeaderElement>
                    <ColHeaderElement>Division adversaire</ColHeaderElement>
                    <ColHeaderElement>Résultat</ColHeaderElement>
                </RowElement>
            </RowGroupElement>
            <RowGroupElement className={'PlayerProfile__GameListContent'}>
                {player.games.map(game => <GameRow player={player} game={game} />)}
            </RowGroupElement>
        </TableElement>
    );
}

function GameRow({player, game}) {
    const main = game.black.discordId === player.discordId ? game.black : game.white;
    const opponent = game.black.discordId === player.discordId ? game.white : game.black;
    const result = main.winner ? 'victory' : opponent.winner ? 'defeat' : 'draw';

    return (
        <RowElement key={game.id} className={'PlayerProfile__GameItem'}>
            <CellElement className={'PlayerProfile__GameDate'}>{game.date}</CellElement>
            <CellElement className={'PlayerProfile__GameResult'}><span className={result} /></CellElement>
            <CellElement className={'PlayerProfile__GameAvatar'}>
                <Avatar src={opponent.avatar} alt={`avatar ${opponent.name}`} className={'PlayerProfile__GameAvatarPicture'}/>
            </CellElement>
            <CellElement className={'PlayerProfile__GameName'}>{opponent.name}</CellElement>
            <CellElement className={'PlayerProfile__GameTier'}>
                <img width="48" height="48" src={`${process.env.PUBLIC_URL}/shields/shield-${opponent.historicalRating.tierRank}.svg`} alt={opponent.historicalRating.tierName}/>
                <p>{opponent.historicalRating.tierName}</p>
            </CellElement>
            <Link to={`/game/${game.id}`} />
        </RowElement>
    );
}

function Stability({player, refStability}) {
    return (
        <div className={'PlayerProfile__Stability'}>
            <StabilityItem
                valid={player.stability.gameCount >= refStability.gameCount} 
                highlight={`${player.stability.gameCount}`}
                text={`parties (min. ${refStability.gameCount})`}
            />
            <StabilityItem
                valid={player.stability.ladderGameCount >= refStability.ladderGameCount}
                highlight={`${player.stability.ladderGameCount}`}
                text={`parties GOLD (min. ${refStability.ladderGameCount})`}
            />
            <StabilityItem
                valid={player.stability.deviation <= refStability.deviation}
                highlight={`${player.stability.deviation}`}
                text={`de déviation (max ${refStability.deviation})`}
            />
            <p className={'PlayerProfile__StabilityPeriod'}>sur les {refStability.period} derniers jours</p>
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

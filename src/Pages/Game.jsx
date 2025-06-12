import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import Avatar from "../Components/Avatar.jsx";
import Loader from "../Components/Loader.jsx";
import WGOPlayer from "../Components/WGOPlayer.jsx";

import './Game.css';

export default function Game() {
    const params = useParams();

    const [game, setGame] = useState();
    const [gameFetchStatus, setGameFetchStatus] = useState('pending');

    useEffect(() => {
        window.scrollTo(0, 0)

        setGameFetchStatus('pending');

        fetch(`/api/game/${params.gameId}`)
            .then(res => {
                if (!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setGame(res);
                setGameFetchStatus('success');
            })
            .catch(() => setGameFetchStatus('error'));
    }, [params.gameId]);

    return (
        <div className={'Game'}>
            {gameFetchStatus === 'pending' && <Loader/>}
            {gameFetchStatus === 'error' && <p className={'Error'}>Erreur lors de la récupération de la partie</p>}
            {gameFetchStatus === 'success' && <>
                <div className={'Game__header'}>
                    <div />
                    <PlayerHeader player={game.black} black={true} />
                    <div />
                    <PlayerHeader player={game.white} black={false} />
                    <div />
                </div>

                <div className={'Game__Goban'}>
                    <WGOPlayer sgf={game.sgf} gameLink={game.gameLink} />
                </div>
            </>}
        </div>
    );
}

function PlayerHeader({player, black}) {
    return (
        <div className={'Game__Player'}>
            <Avatar src={player.discordAvatar} size={40} hidden={true}/>
            <h2 className={'Game__PlayerName'}><span><Link to={`/player/${player.discordId}`}>{player.discordName}</Link></span></h2>
            <img width="64" height="64" src={`${process.env.PUBLIC_URL}/shields/shield-${player.tierRank}.svg`} alt={player.tierName}/>
            <p className={'Game__PlayerTier'}>{player.tierName}</p>
        </div>
    );
}

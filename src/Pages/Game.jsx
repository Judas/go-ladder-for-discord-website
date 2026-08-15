import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import Avatar from "../Components/Avatar.jsx";
import Loader from "../Components/Loader.jsx";
import WGOPlayer from "../Components/WGOPlayer.jsx";
import useApi from "../hooks/useApi.js";

import './Game.css';

export default function Game() {
    const params = useParams();

    const { status: gameFetchStatus, data: game } = useApi(`/api/game/${params.gameId}`);

    // Following a game link from halfway down a profile would otherwise land on the goban already scrolled past.
    useEffect(() => { window.scrollTo(0, 0); }, [params.gameId]);

    return (
        <div className={'Game'}>
            {gameFetchStatus === 'pending' && <Loader/>}
            {gameFetchStatus === 'error' && <p className={'Error'}>Erreur lors de la récupération de la partie</p>}
            {gameFetchStatus === 'success' && <>
                <div className={'Game__header'}>
                    <div />
                    <PlayerHeader player={game.black} />
                    <div />
                    <PlayerHeader player={game.white} />
                    <div />
                </div>

                <div className={'Game__Goban'}>
                    <WGOPlayer sgf={game.sgf} />
                </div>
            </>}
        </div>
    );
}

function PlayerHeader({player}) {
    return (
        <div className={'Game__Player'}>
            <Avatar src={player.discordAvatar} size={40} hidden={true}/>
            <h2 className={'Game__PlayerName'}><span><Link to={`/player/${player.discordId}`}>{player.discordName}</Link></span></h2>
            <img width="64" height="64" src={`/shields/shield-${player.tierRank}.svg`} alt={player.tierName}/>
            <p className={'Game__PlayerTier'}>{player.tierName}</p>
        </div>
    );
}

import React, {useEffect, useState} from "react";
import {useParams, useSearchParams, Link} from "react-router-dom";

import Loader from "../Components/Loader";
import Avatar from "../Components/Avatar";
import GameViewer from "../Components/Goban/GameViewer";

import './Game.css';

export default function Game() {
    const params = useParams();

    const [game, setGame] = useState();
    const [gameFetchStatus, setGameFetchStatus] = useState('pending');
    const [gameMoveURL, setGameMoveURL] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
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

    function sharePosition() {
        const href = window.location.href;
        const inputValue = document.querySelector('.wgo-player-mn-value').value;
        setGameMoveURL(`${href}?move=${inputValue}`);

        navigator.clipboard.writeText(gameMoveURL).then(() => setCopySuccess(true)).catch(() => setCopySuccess(false));
        setModalVisible(true);
    }

    return (
        <div className={'Game'}>
            {gameFetchStatus === 'pending' && <Loader/>}
            {gameFetchStatus === 'error' && <p className={'Error'}>Erreur lors de la récupération de la partie</p>}
            {gameFetchStatus === 'success' && <>
                <div className={'Game__header'}>
                    <PlayerHeader player={game.black} />

                    <div className={'Game__Actions'}>
                        <button onClick={sharePosition} className={'Game__Share CallToAction'}>Partager la position</button>
                        <a href={game.gameLink} target="_blank" rel={'noreferrer'} className={'CallToAction'}>Ouvrir cette partie</a>
                    </div>

                    <PlayerHeader player={game.white} />
                </div>

                <div className={'Game__Goban'}>
                    <GameViewer game={game} move={searchParams.get('move')}/>
                </div>

                {modalVisible && (
                    <div className={'Game__Modal'}>
                        <button className={'CallToAction'} onClick={() => setModalVisible(false)}>
                            <span className={'ReaderOnly'}>Fermer</span>
                        </button>
                        <p>
                            {copySuccess && <><span>L'URL vers ce coup est dans le presse papier.</span> <br/></>}
                            <a href={gameMoveURL}>Lien vers ce coup</a>
                        </p>
                    </div>
                )}
            </>}
        </div>
    );
}

function PlayerHeader({player}) {
    var rating;
    if (player.historicalRating.tierRank === 0) {
        rating = "?"
    } else {
        rating = player.historicalRating.rating;
    }

    return (
        <div className={'Game__Player'}>
            <h2 className={'Game__PlayerTier'}>
                <img width="64" height="64" src={`${process.env.PUBLIC_URL}/shields/shield-${player.historicalRating.tierRank}.svg`} alt={player.historicalRating.tierName}/>
                <p>{player.historicalRating.tierName}</p>
            </h2>

            <h2 className={'Game__PlayerName'}>
                <Avatar src={player.avatar} size={40} hidden={true}/>
                <span><Link to={`/player/${player.discordId}`}>{player.name}</Link></span>
                
            </h2>

            <h2 className={'Game__PlayerRating'}>
                <span>
                    {rating} <span className={player.ratingGain.includes('+') ? 'up' : player.ratingGain.includes('-') ? 'down' : 'equal'}> {player.ratingGain}</span>
                </span>
            </h2>
        </div>
    );
}

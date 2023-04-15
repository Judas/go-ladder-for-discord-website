import React, {useEffect, useState} from "react";
import {Link, useParams, useSearchParams} from "react-router-dom";
import Loader from "../Components/Loader";
import Avatar from "../Components/Avatar";
import './Game.css';
import GameDisplayer from "../Components/GameViewer/GameDisplayer";

export default function Game() {
    const params = useParams();
    const [game, setGame] = useState();
    const [gameStatus, setGameStatus] = useState('pending');
    const [gameMoveURL, setGameMoveURL] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const api_host = "/api/gold/api/v4";

        const fetchGameUrl = `${api_host}/game/${params.gameId}`;
        setGameStatus('pending');

        fetch(fetchGameUrl)
            .then(res => {
                if (!res.ok) {
                    throw res.statusText;
                }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setGame(res);
                setGameStatus('success');
            })
            .catch(() => setGameStatus('error'));
    }, [params.gameId]);

    function sharePosition() {
        const href = window.location.href;
        const inputValue = document.querySelector('.wgo-player-mn-value').value;
        setGameMoveURL(`${href}?move=${inputValue}`);

        navigator.clipboard.writeText(gameMoveURL).then(() => setCopySuccess(true)).catch(() => setCopySuccess(false));
        setModalVisible(true);
    }

    return (
        <div className={'GamePage'}>
            {gameStatus === 'pending' && <Loader/>}
            {gameStatus === 'error' && <p className={'Error'}>Marche pas</p>}
            {gameStatus === 'success' && <>
                <div className={'GamePage__header'}>
                    <h3 className={'GamePage__title'}>
                        Partie contre :
                        <span><Avatar src={game.opponent.avatar} size={40} hidden={true}/>{game.opponent.name} </span>
                    </h3>

                    <div className={'GamePage__infos'}>
                        <p>Handicap : {game.handicap}</p>
                        <p>Komi : {game.komi}</p>
                        {game.mainPlayer.ratingGain && (
                            <p>Rating : <span className={game.mainPlayer.ratingGain.includes('+') ? 'up' : 'down'}>
                                {game.mainPlayer.ratingGain}
                            </span></p>
                        )}
                    </div>

                    <div className={'GamePage__actions'}>
                        <button onClick={sharePosition} className={'GamePage__share CallToAction'}>
                            Partager la position
                        </button>
                        <a href={game.gameLink} target="_blank" rel={'noreferrer'} className={'CallToAction'}>
                            Ouvrir cette partie
                        </a>

                        <Link to={`/players/${game.mainPlayer.discordId}`} className={'GamePage__back CallToAction'}>
                            Retour au profil
                        </Link>
                    </div>

                </div>
                <div className={'GamePage__goban'}>
                    <GameDisplayer game={game} move={searchParams.get('move')}/>
                </div>

                {modalVisible && (
                    <div className={'GamePage__modal'}>
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

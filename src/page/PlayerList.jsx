import './PlayerList.css'
import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import TableElement from "../Components/CustomTableElements/TableElement";
import RowGroupElement from "../Components/CustomTableElements/RowGroupElement";
import RowElement from "../Components/CustomTableElements/RowElement";
import ColHeaderElement from "../Components/CustomTableElements/ColHeaderElement";
import CellElement from "../Components/CustomTableElements/CellElement";
import Loader from "../Components/Loader";
import Avatar from "../Components/avatar";

function PlayerLine({player, index}) {
    return (
        <RowElement>
            <CellElement colIndex={1} className={'Order'}>{index + 1}</CellElement>
            <CellElement colIndex={2} className={'Discord'}>
                <Link to={`/players/${player.discordId}`}>
                    {player.name}
                </Link>
            </CellElement>
            <CellElement colIndex={3} className={'Avatar'}>
                <Avatar size={40} src={player.avatar} alt={`avatar ${player.name}`} className={'logo'}/>
            </CellElement>
            <CellElement colIndex={4} className={'Rank'}>{player.rank}</CellElement>
            <CellElement colIndex={5} className={'Rating'}>{player.rating}</CellElement>
            <CellElement colIndex={6} className={'KGS'}>
                {player.kgsId && <a target="_blank" rel={'noreferrer'} href={`https://www.gokgs.com/graphPage.jsp?user=${player.kgsId}`}>
                    {player.kgsId}
                </a>}
            </CellElement>
            <CellElement colIndex={7} className={'OGS'}>
                {player.ogsId && <a target="_blank" rel={'noreferrer'} href={`https://online-go.com/player/${player.ogsId}`}>
                    {player.ogsPseudo}
                </a>}
            </CellElement>
        </RowElement>
    );
}

function getInitialPlayerListMode() {
    const persistedPlayerListPreference = window.localStorage.getItem('player-list-mode');

    if (typeof persistedPlayerListPreference === 'string') {
        return persistedPlayerListPreference;
    }

    return 'all';
}

function PlayerList() {
    const [rankedPlayersMode, setRankedPlayersMode] = useState(getInitialPlayerListMode)
    const [allPlayers, setAllPlayers] = useState([])
    const [rankedPlayers, setRankedPlayers] = useState([])
    const [searchString, setSearchString] = useState('')
    const [searchedPlayers, setSearchedPlayers] = useState(null)

    const [allPlayerDataStatus, setAllPlayerDataStatus] = useState('pending');

    function togglePlayerListMode(currentMode) {
        const updatedMode = currentMode === 'all' ? 'ranked' : 'all'

        window.localStorage.setItem('player-list-mode', updatedMode);

        return updatedMode;
    }

    function filterPlayers() {
        if (allPlayerDataStatus === 'success' && searchString) {
            setSearchedPlayers((rankedPlayersMode === 'ranked' ? rankedPlayers : allPlayers).filter(
                player => (
                    player.name.toLowerCase().includes(searchString.toLowerCase())
                    || (player.kgsId && player.kgsId.toLowerCase().includes(searchString.toLowerCase()))
                    || (player.ogsPseudo && player.ogsPseudo.toLowerCase().includes(searchString.toLowerCase()))
                )
            ));
        } else {
            setSearchedPlayers(null);
        }
    }

    useEffect(() => {
        filterPlayers();
    }, [searchString, rankedPlayersMode])

    useEffect(() => {
        const api_host = "/api/gold/api/v4";

        const fetchAllPlayersUrl = `${api_host}/players`
        fetch(fetchAllPlayersUrl)
            .then(res => {
                if(!res.ok) {
                    throw res.statusText;
                }
                return res;
            })
            .then(res => res.json())
            .then(res => {
                setAllPlayers(res);
                setRankedPlayers(res.filter(player => player.ranked));
                setAllPlayerDataStatus('success');
            })
            .catch(() => setAllPlayerDataStatus('error'));
    }, [])

    return (
        <section className={'PlayerList'}>
            <h2 className={'ReaderOnly'}>Liste des joueurs</h2>
            <div className="toggle-container">
                <input
                    id={'listChoice'}
                    type="checkbox"
                    checked={rankedPlayersMode === 'all'}
                    onChange={() => setRankedPlayersMode(togglePlayerListMode(rankedPlayersMode))}
                    className={'ReaderOnly'}/>

                <label className="toggle-control" htmlFor={'listChoice'}>
                    <span>Joueurs classés</span>
                    <span className="control"></span>
                    <span>Tous les joueurs</span>
                </label>
            </div>
            <div className="SearchWidget">
                <label className="ReaderOnly" htmlFor={'search'}>
                    Recherchez un joueur
                </label>
                <input
                    id={'search'}
                    type="search"
                    onChange={(event) => setSearchString(event.target.value)}
                    className={'SearchWidget__input'}/>
            </div>
            <div>
                <TableElement>
                    <RowGroupElement className={'THead'}>
                        <RowElement>
                            <ColHeaderElement className={'Order'}><span className={'ReaderOnly'}>Classement</span></ColHeaderElement>
                            <ColHeaderElement className={'Discord'}>Discord</ColHeaderElement>
                            <ColHeaderElement className={'Avatar'}><span className={'ReaderOnly'}>Avatar</span></ColHeaderElement>
                            <ColHeaderElement className={'Rank'}>Rang</ColHeaderElement>
                            <ColHeaderElement className={'Rating'}>Rating</ColHeaderElement>
                            <ColHeaderElement className={'KGS'}>KGS</ColHeaderElement>
                            <ColHeaderElement className={'OGS'}>OGS</ColHeaderElement>
                        </RowElement>
                    </RowGroupElement>
                    <RowGroupElement className={'TBody'}>
                        {allPlayerDataStatus === 'pending' && <Loader/>}
                        {allPlayerDataStatus === 'error' && <p className={'Error'}>Erreur lors de la récupération des joueurs</p>}
                        {allPlayerDataStatus === 'success' && (
                            <>
                                {searchedPlayers ? <>
                                    {searchedPlayers.length ? searchedPlayers.map(player => <PlayerLine key={player.discordId} player={player} index={(rankedPlayersMode === 'ranked' ? rankedPlayers : allPlayers).findIndex(el => el === player)}/>) : <p className={'Error'}>Aucun résultat</p>}
                                </> : (rankedPlayersMode === 'ranked' ? rankedPlayers : allPlayers).map(
                                    player => <PlayerLine key={player.discordId} player={player} index={(rankedPlayersMode === 'ranked' ? rankedPlayers : allPlayers).findIndex(el => el === player)}/>
                                )}
                            </>
                        )}
                    </RowGroupElement>
                </TableElement>
            </div>
        </section>
    );
}

export default PlayerList;

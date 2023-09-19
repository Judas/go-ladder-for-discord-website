import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import Loader from "../Components/Loader.jsx";
import Avatar from "../Components/Avatar.jsx";

import './PlayerList.css'

export default function PlayerList() {
    const [players, setPlayers] = useState([])
    const [playerFetchStatus, setPlayerFetchStatus] = useState('pending');

    const [searchString, setSearchString] = useState('')
    const [searchedPlayers, setSearchedPlayers] = useState(null)

    // Search filter
    function filterPlayers() {
        if (playerFetchStatus === 'success' && searchString) {
            setSearchedPlayers(players.filter(
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

    // Search hook
    useEffect(() => { filterPlayers(); }, [searchString])

    // Load hook
    useEffect(() => {
        fetch(`/api/players`)
            .then(res => {
                if(!res.ok) { throw res.statusText; }
                return res;
            })
            .then(res => res.json())
            .then(res => res.filter((player) => player.ranked))
            .then(res => {
                setPlayers(res);
                setPlayerFetchStatus('success');
            })
            .catch(() => setPlayerFetchStatus('error'));
    }, [])

    return (
        <section className={'PlayerList'}>
            <h2 className={'ReaderOnly'}>Liste des joueurs</h2>
            <div className="SearchWidget">
                <label className="ReaderOnly" htmlFor={'search'}>Recherchez un joueur</label>
                <input
                    id={'search'}
                    type="search"
                    placeholder='Rechercher un joueur'
                    onChange={(event) => setSearchString(event.target.value)}
                    className={'SearchWidget__input'}/>
            </div>
            <div>
                <TableElement>
                    <div className={'PlayerList__THeadContainer'}>
                        <RowGroupElement className={'PlayerList__THead'}>
                            <RowElement>
                                <ColHeaderElement className={'Avatar'}><span className={'ReaderOnly'}>Avatar</span></ColHeaderElement>
                                <ColHeaderElement className={'Discord'}>Discord</ColHeaderElement>
                                <ColHeaderElement className={'Tier'}>Division</ColHeaderElement>
                                <ColHeaderElement className={'Rating'}>Classement</ColHeaderElement>
                                <ColHeaderElement className={'Stability'}>FGC</ColHeaderElement>
                            </RowElement>
                        </RowGroupElement>
                    </div>
                    <RowGroupElement className={'PlayerList__TBody'}>
                        {playerFetchStatus === 'pending' && <Loader/>}
                        {playerFetchStatus === 'error' && <p className={'ErrorRow'}>Erreur lors de la récupération des joueurs</p>}
                        {playerFetchStatus === 'success' && (
                            <>
                                {searchedPlayers ? <>
                                    {searchedPlayers.length ? searchedPlayers.map(player => <PlayerRow key={player.discordId} player={player} />) : <p className={'ErrorRow'}>Aucun résultat</p>}
                                </> : players.map(
                                    player => <PlayerRow key={player.discordId} player={player} />
                                )}
                            </>
                        )}
                    </RowGroupElement>
                </TableElement>
            </div>
        </section>
    );
}

function PlayerRow({player}) {
    return (
        <RowElement>
            <CellElement colIndex={1} className={'Avatar'}>
                <Avatar size={40} src={player.avatar} alt={`avatar ${player.name}`} />
            </CellElement>
            <CellElement colIndex={2} className={'Discord'}>{player.name}</CellElement>
            <CellElement colIndex={3} className={'Tier'}>
                <img width="48" height="48" src={`${process.env.PUBLIC_URL}/shields/shield-${player.tierRank}.svg`} alt={player.tierName}/>
                <p>{player.tierName}</p>
            </CellElement>
            <CellElement colIndex={4} className={'Rating'}>{player.rating}</CellElement>
            <CellElement colIndex={5} className={'Stability'}><span className={player.stable ? 'stable' : 'unstable'} /></CellElement>
            <Link to={`/player/${player.discordId}`} />
        </RowElement>
    );
}

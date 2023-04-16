import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';

import TableElement from "../Components/Table/TableElement";
import RowGroupElement from "../Components/Table/RowGroupElement";
import RowElement from "../Components/Table/RowElement";
import ColHeaderElement from "../Components/Table/ColHeaderElement";
import CellElement from "../Components/Table/CellElement";
import Loader from "../Components/Loader";
import Avatar from "../Components/Avatar";

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
                    <RowGroupElement className={'THead'}>
                        <RowElement>
                            <ColHeaderElement className={'Avatar'}><span className={'ReaderOnly'}>Avatar</span></ColHeaderElement>
                            <ColHeaderElement className={'Discord'}>Discord</ColHeaderElement>
                            <ColHeaderElement className={'Tier'}>Division</ColHeaderElement>
                            <ColHeaderElement className={'Rating'}>Classement</ColHeaderElement>
                            <ColHeaderElement className={'Stability'}>FGC</ColHeaderElement>
                        </RowElement>
                    </RowGroupElement>
                    <RowGroupElement className={'TBody'}>
                        {playerFetchStatus === 'pending' && <Loader/>}
                        {playerFetchStatus === 'error' && <p className={'Error'}>Erreur lors de la récupération des joueurs</p>}
                        {playerFetchStatus === 'success' && (
                            <>
                                {searchedPlayers ? <>
                                    {searchedPlayers.length ? searchedPlayers.map(player => <PlayerRow key={player.discordId} player={player} />) : <p className={'Error'}>Aucun résultat</p>}
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
                <Avatar size={40} src={player.avatar} alt={`avatar ${player.name}`} className={'logo'}/>
            </CellElement>
            <CellElement colIndex={2} className={'Discord'}>
                <Link to={`/player/${player.discordId}`}>{player.name}</Link>
            </CellElement>
            <CellElement colIndex={4} className={'Tier'}>
                <img width="48" height="48" src={`${process.env.PUBLIC_URL}/shields/shield-${player.tierRank}.svg`} alt={player.tierName}/>
                <p>{player.tierName}</p>
            </CellElement>
            <CellElement colIndex={5} className={'Rating'}>{player.rating}</CellElement>
            <CellElement colIndex={6} className={'Stability'}><span className={player.stable ? 'stable' : 'unstable'} /></CellElement>
        </RowElement>
    );
}
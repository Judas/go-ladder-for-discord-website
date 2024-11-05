import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import Loader from "../Components/Loader.jsx";
import Avatar from "../Components/Avatar.jsx";

import './AdminFgc.css'

export default function AdminFgc() {
    // Ranking
    const [players, setPlayers] = useState([]);
    const [playerFetchStatus, setPlayerFetchStatus] = useState('pending');

    // Load hook
    useEffect(() => {
        fetch(`/api/fgc/players`)
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
        <section className={'AdminFgcList'}>
            <h2 className={'ReaderOnly'}>Liste des joueurs</h2>          
            <div>
                <TableElement>
                    <div className={'AdminFgcList__THeadContainer'}>
                        <RowGroupElement className={'AdminFgcList__THead'}>
                            <RowElement>
                                <ColHeaderElement className={'Avatar'}><span className={'ReaderOnly'}>Avatar</span></ColHeaderElement>
                                <ColHeaderElement className={'Discord'}>Discord</ColHeaderElement>
                                <ColHeaderElement className={'Rating'}>Gold</ColHeaderElement>
                                <ColHeaderElement className={'KgsRating'}>KGS</ColHeaderElement>
                                <ColHeaderElement className={'OgsRating'}>OGS</ColHeaderElement>
                            </RowElement>
                        </RowGroupElement>
                    </div>
                    <RowGroupElement className={'AdminFgcList__TBody'}>
                        {playerFetchStatus === 'pending' && <Loader/>}
                        {playerFetchStatus === 'error' && <p className={'ErrorRow'}>Erreur lors de la récupération des joueurs</p>}
                        {playerFetchStatus === 'success' && players.map(player => <PlayerRow key={player.discordId} player={player} />)}
                    </RowGroupElement>
                </TableElement>
            </div>
        </section>
    );
}

function PlayerRow({player}) {
    var statusClassNames = ["Valid", "Neutral", "Invalid"];

    // OGS
    var ogsCell;
    if (player.ogsRating == null) {
        ogsCell = (<CellElement colIndex={4} className={'OgsRating'} />);
    } else {
        ogsCell = (<CellElement colIndex={4} className={'OgsRating'}>{player.ogsRating}<span className={statusClassNames[player.ogsDiffStatus]}>{player.ogsDiff}</span></CellElement>);
    }

    // KGS
    var kgsCell;
    if (player.kgsRating == null) {
        kgsCell = (<CellElement colIndex={5} className={'KgsRating'} />);
    } else {
        kgsCell = (<CellElement colIndex={5} className={'KgsRating'}>{player.kgsRating}<span className={statusClassNames[player.kgsDiffStatus]}>{player.kgsDiff}</span></CellElement>);
    }

    return (
        <RowElement>
            <CellElement colIndex={1} className={'Avatar'}>
                <Avatar size={40} src={player.avatar} alt={`avatar ${player.name}`} />
            </CellElement>
            <CellElement colIndex={2} className={'Discord'}>{player.name}</CellElement>
            <CellElement colIndex={3} className={'Rating'}>{player.goldRating}</CellElement>
            {ogsCell}
            {kgsCell}
            <Link to={`/player/${player.discordId}`} />
        </RowElement>
    );
}

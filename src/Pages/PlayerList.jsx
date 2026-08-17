import { useState } from 'react';
import { Link } from 'react-router-dom';

import useApi from '../hooks/useApi.js';
import { isFgcValid } from '../fgc.js';

import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import Loader from "../Components/Loader.jsx";
import Avatar from "../Components/Avatar.jsx";
import Crest from "../Components/Crest.jsx";

import './PlayerList.css'

export default function PlayerList() {
    const { status: playerFetchStatus, data } = useApi('/api/players');

    const [searchString, setSearchString] = useState('')
    const [validOnly, setValidOnly] = useState(false)

    // Valid filter toggle
    const toggleValidOnly = () => { setValidOnly(!validOnly); };

    // Unrated players are not on the ladder, so they are not on the list.
    const players = (data ?? []).filter(player => player.rating > 0);

    // Both filters are derived at render rather than mirrored into state by an effect. The effect version ran the
    // search against whatever `players` held when the search string changed, so a search typed while the list was
    // still loading returned nothing until the next keystroke.
    const basePlayers = validOnly ? players.filter(isFgcValid) : players;
    const visiblePlayers = searchString ? basePlayers.filter(player => matches(player, searchString)) : basePlayers;
    const noResults = searchString !== '' && visiblePlayers.length === 0;

    return (
        <section className={'PlayerList'}>
            <h2 className={'ReaderOnly'}>Liste des joueurs</h2>
            <div className={'PlayerList__Filters'}>
                <div className={'SearchWidget'}>
                    <label className="ReaderOnly" htmlFor={'search'}>Recherchez un joueur</label>
                    <input
                        id={'search'}
                        type="search"
                        placeholder='Rechercher un joueur'
                        onChange={(event) => setSearchString(event.target.value)}
                        className={'SearchWidget__input'}/>
                </div>
                <div className={'ValidWidget'}>
                    <label>
                        <input type="checkbox" checked={validOnly} onChange={toggleValidOnly}/>
                        <span>Valide FGC</span>
                    </label>
                </div>
            </div>
            <div>
                <TableElement>
                    <div className={'PlayerList__THeadContainer'}>
                        <RowGroupElement className={'PlayerList__THead'}>
                            <RowElement>
                                <ColHeaderElement className={'Avatar'}><span className={'ReaderOnly'}>Avatar</span></ColHeaderElement>
                                <ColHeaderElement className={'Discord'}>Discord</ColHeaderElement>
                                <ColHeaderElement className={'House'}><span className={'ReaderOnly'}>Maison</span></ColHeaderElement>
                                <ColHeaderElement className={'Tier'}>Division</ColHeaderElement>
                                <ColHeaderElement className={'Stability'}>FGC</ColHeaderElement>
                            </RowElement>
                        </RowGroupElement>
                    </div>
                    <RowGroupElement className={'PlayerList__TBody'}>
                        {playerFetchStatus === 'pending' && <Loader/>}
                        {playerFetchStatus === 'error' && <p className={'ErrorRow'}>Erreur lors de la récupération des joueurs</p>}
                        {playerFetchStatus === 'success' && (
                            noResults
                                ? <p className={'ErrorRow'}>Aucun résultat</p>
                                : visiblePlayers.map(player => <PlayerRow key={player.discordId} player={player} />)
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
                <Avatar size={40} src={player.discordAvatar} alt={`avatar ${player.discordName}`} />
            </CellElement>
            <CellElement colIndex={2} className={'Discord'}>{player.discordName}</CellElement>
            {/*
              * `crest` is the list's own field — three fields for a badge. The profile route serves the full `house`
              * block instead, which is null here and would be far too heavy repeated down a roster.
              */}
            <CellElement colIndex={3} className={'House'}>
                {player.crest && <Crest slug={player.crest.slug} name={player.crest.name} size={32} small={true} />}
            </CellElement>
            <CellElement colIndex={4} className={'Tier'}>
                <img width="48" height="48" src={`/shields/shield-${player.tierRank}.svg`} alt={player.tierName}/>
                <p>{player.tierName}</p>
            </CellElement>
            <CellElement colIndex={5} className={'Stability'}><span className={ isFgcValid(player) ? 'stable' : 'unstable' } /></CellElement>
            <Link to={`/player/${player.discordId}`} />
        </RowElement>
    );
}

/**
 * Matches on the Discord name or on any linked account's name.
 *
 * Every field of an account is nullable on the API side (ApiPlayerAccount), and `accounts` itself can be absent, so
 * the guards are not decoration: one account with no name used to take the whole search down.
 */
function matches(player, search) {
    const needle = search.toLowerCase();
    const names = [player.discordName, ...(player.accounts ?? []).map(account => account.name)];
    return names.some(name => name?.toLowerCase().includes(needle));
}

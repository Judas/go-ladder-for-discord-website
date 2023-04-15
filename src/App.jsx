import './App.css';
import PlayerList from './Pages/PlayerList.jsx'
import PlayerPage from './Pages/PlayerPage.jsx'
import About from './Pages/About.jsx'
import {Link, Route, Routes} from 'react-router-dom';
import Game from "./Pages/Game";
import LastGames from "./Pages/LastGames";
import {useState} from "react";

function App() {
    const [isNavOpen, setIsNavOpen] = useState(false);

    return (
        <div className="App">
            <header className={'Header'}>
                <nav aria-label={'Principale'} className={'Nav'} data-open={isNavOpen ? 'true' : 'false'}>
                    <h1 className={'Title'}>
                        <Link to={'/'}>
                            <span className={'Title--mobile'}>GoLD</span>
                            <span className={'Title--desktop'}>Go Ladder for Discord</span>
                        </Link>
                    </h1>
                    <button className={'NavBtn CallToAction'} onClick={() => setIsNavOpen(!isNavOpen)}>
                        <span className={'NavBtn__line-1'}/>
                        <span className={'NavBtn__line-2'}/>
                        <span className={'NavBtn__line-3'}/>

                        <span className={'ReaderOnly'}>Navigation mobile</span>
                    </button>
                    <div className={'NavPanel'}>
                        <Link to={'/'} className={'CallToAction HomeLink'} onClick={() => setIsNavOpen(false)}>
                            Accueil
                        </Link>
                        <Link to={'/dernieres-parties'} className={'CallToAction'} onClick={() => setIsNavOpen(false)}>
                            Parties récentes
                        </Link>
                        <Link to={'/about'} className={'CallToAction'} onClick={() => setIsNavOpen(false)}>
                            À propos
                        </Link>
                    </div>
                    <div className="NavPanel__backdrop" onClick={() => setIsNavOpen(false)}/>
                </nav>
            </header>

            <main>
                <Routes>
                    <Route path="/" element={<PlayerList/>}/>
                    <Route path="/players/:playerId" element={<PlayerPage/>}>
                        <Route path="game/:gameId" element={<Game/>}/>
                    </Route>
                    <Route path="/dernieres-parties" element={<LastGames/>}/>
                    <Route path="/about" element={<About/>}/>
                </Routes>
            </main>

            <footer className={'Footer'}>
                <p>Developed with ❤ by <a href="/players/236813095207436289">Drooxi</a>, <a
                    href="https://jules.trehorel.bzh/">Judas</a>, <a
                    href="https://theworldasastage.com/">NicoTupe</a> & <a
                    href="/players/119456225724334081">Valloa</a> for <a href="https://fulgurogo.be/">FulguroGo</a>.</p>
            </footer>
        </div>
    );
}

export default App;

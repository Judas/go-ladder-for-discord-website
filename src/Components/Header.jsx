import {useState} from "react";
import {Link} from 'react-router-dom';

import './Header.css';

export default function Header() {
    const [navOpened, setNavOpened] = useState(false);

    return (
        <header className={'Header'}>
            <nav aria-label={'Principale'} className={'Nav'} data-open={navOpened ? 'true' : 'false'}>
                <h1 className={'Title'}>
                    <Link to={'/'}>
                        <span className={'Title--mobile'}>GoLD</span>
                        <span className={'Title--desktop'}>Go Ladder for Discord</span>
                    </Link>
                </h1>

                <button className={'NavBtn CallToAction'} onClick={() => setNavOpened(!navOpened)}>
                    <span className={'NavBtn__line-1'}/>
                    <span className={'NavBtn__line-2'}/>
                    <span className={'NavBtn__line-3'}/>
                    <span className={'ReaderOnly'}>Navigation mobile</span>
                </button>

                <div className={'NavPanel'}>
                    <Link to={'/'} className={'CallToAction HomeLink'} onClick={() => setNavOpened(false)}><span className={'HomeAction'}>Accueil</span></Link>
                    <Link to={'/recent-games'} className={'CallToAction'} onClick={() => setNavOpened(false)}><span className={'GamesAction'}>Parties</span></Link>
                    <Link to={'/about'} className={'CallToAction'} onClick={() => setNavOpened(false)}><span className={'AboutAction'}>À propos</span></Link>
                </div>

                <div className="NavPanel__backdrop" onClick={() => setNavOpened(false)}/>
            </nav>
        </header>
    );
}

import React from "react";
import { FaUsers, FaDiscord } from 'react-icons/fa6';
import { IoMdInformationCircleOutline} from 'react-icons/io';
import { TbGoGame } from 'react-icons/tb';
import { Link, NavLink } from 'react-router-dom';

import { hasValidProfile, getProfile } from '../AuthProfile.js';
import Avatar from './Avatar.jsx';

import './Header.css';

export default function Header() {
    let authButton;
    if (hasValidProfile()) {
        let profile = getProfile();
        authButton = (
            <Link to={`/player/${profile.discordId}`} >
                <Avatar size={48} src={profile.avatar} alt={`avatar ${profile.name}`} />
            </Link>
        );
    } else {
        authButton = (
            <Link className={'DiscordAuth'} to={process.env.REACT_APP_DISCORD_AUTH_URL}>
                <span className={'NavButton'}>
                    <FaDiscord />
                    <span className={'NavButtonText'}>Discord</span>
                </span>
            </Link>
        );
    }

    return (
        <nav className={'Header'}>
            <img 
                src='https://cdn.discordapp.com/app-icons/772833152434831381/39981f8231efcd7aebf265764ce80b7c.png'
                width={48}
                height={48}
                alt='FulguroGo' />

                <NavLink to={'/'} className={'NavLink'}>
                    <span className={'NavButton'}>
                        <FaUsers />
                        <span className={'NavButtonText'}>Joueurs</span>
                    </span>
                </NavLink>

                <NavLink to={'/recent-games'} className={'NavLink'}>
                    <span className={'NavButton'}>
                        <TbGoGame />
                        <span className={'NavButtonText'}>Parties</span>
                    </span>
                </NavLink>

                <NavLink to={'/about'} className={'NavLink'}>
                    <span className={'NavButton'}>
                        <IoMdInformationCircleOutline />
                        <span className={'NavButtonText'}>À propos</span>
                    </span>
                </NavLink>

                {authButton}
        </nav>
    );
}

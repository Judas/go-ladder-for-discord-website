import React from "react";
import { useAuth } from '../auth.js';

import Loader from "../Components/Loader.jsx";
import useApi from "../hooks/useApi.js";

import './AccountLink.css';

export default function AccountLink() {
    const { status: accountsFetchStatus, data: accounts } = useApi('/api/accounts');
    const { profile } = useAuth();

    if (accountsFetchStatus === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    } else if (accountsFetchStatus === 'error' || profile == null) {
        return <div style={{display: 'grid', height: '100%',}}><p className={'Error'}>Echec lors de la récupération du profil.</p></div>; 
    } else {
        return ( 
            <section className={'AccountLink Container'}>
                <h2 className={'PageTitle PageTitle--standalone'}>Lier un compte</h2>
                <AccountLinkForm accounts={accounts} profile={profile}/>
            </section>
        );
    }
}

class AccountLinkForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {'status': 'unset'};
    
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
  
    handleChange(event) {
        this.setState({[event.target.name]: event.target.value});
    }
  
    handleSubmit(event) {
        event.preventDefault();

        this.setState({['status']: 'pending'});
        const postOptions = {
            method: 'POST',
            headers: { 'Accept': 'application.json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                discordId: this.props.profile.discordId, 
                account: this.state.account,
                accountId: this.state.pseudo 
            })
        };

        fetch('/api/link', postOptions)
        .then(res => {
            if (!res.ok) { throw res.statusText; }
            return res;
        })
        .then(() => {
            this.setState({['status']: 'done'});
        })
        .catch(() => this.setState({['status']: 'error'}));
    }
  
    render() {
        let status;
        if (this.state.status === 'pending') {
            status = (<div className={'FlexContainer'}><Loader/></div>);
        } else if (this.state.status === 'error') {
            status = (<div style={{display: 'grid', height: '100%',}}><p className={'Error'}>Erreur lors de l'ajout du compte.</p></div>);
        } else if (this.state.status === 'done') {
            status = (<div style={{display: 'grid', height: '100%',}}><p className={'Success'}>Compte ajouté !</p></div>);
        } else {
            status = (<></>);
        }

        return (
            <div>
                <form onSubmit={this.handleSubmit} className={'AccountLinkForm'}>
                    <select className={'AccountLinkForm__Select'} value={this.state.account} name="account" onChange={this.handleChange}>
                        <option disabled selected value>Compte</option>
                        {this.props.accounts.map(acc => <option className={'AccountLinkForm__Option'} value={acc}>{acc}</option>)}
                    </select>
                    <input type="text" name="pseudo" value={this.state.pseudo} onChange={this.handleChange} placeholder="Pseudo" className={'AccountLinkForm__Pseudo'}/>
                    <input className={'AccountLinkForm__Submit'} type="submit" value="Valider"  />
                </form>
                {status}
            </div>
        );
    }
}

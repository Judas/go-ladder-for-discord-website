
class AccountLinkForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {account: '', pseudo: ''};
    
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
  
    handleChange(event) {
        this.setState({[event.target.name]: event.target.value});
    }
  
    handleSubmit(event) {
        console.log('account: ' + this.state.value.account + ' pseudo:' + this.state.value.pseudo);
        event.preventDefault();
    }
  
    render() {
        return (
            <form onSubmit={this.handleSubmit} className={'AccountLinkForm'}>
                <select className={'AccountLinkForm__Select'} value={this.state.value.account} name="account" onChange={this.handleChange}>
                    {accounts.map(acc => <option className={'AccountLinkForm__Option'} value={acc}>{acc}</option>)}
                </select>
                <input type="text" name="pseudo" value={this.state.value.pseudo} onChange={this.handleChange} placeholder='Pseudo' className={'AccountLinkForm__Pseudo'}/>
                <input className={'AccountLinkForm__Submit'} type="submit" value="Valider"  />
            </form>
        );
    }
}

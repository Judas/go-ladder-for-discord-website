import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";

import AuthProvider from './AuthProvider.jsx';
import App from './App.jsx';

import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    // AuthProvider replaces the bare authenticateUser() that used to run after render: the identity is state now,
    // so it belongs in the tree rather than beside it.
    <BrowserRouter>
        <AuthProvider>
            <App />
        </AuthProvider>
    </BrowserRouter>
);

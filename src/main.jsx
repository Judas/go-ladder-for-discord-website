import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";

import authenticateUser from './AuthProfile.js';
import App from './App.jsx';

import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);

authenticateUser();

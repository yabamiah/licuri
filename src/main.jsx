import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

const mq = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = (dark) => {
    document.documentElement.classList.toggle('dark', dark);
};
applyTheme(mq.matches);
mq.addEventListener('change', (e) => applyTheme(e.matches));

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

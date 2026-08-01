import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import QuickTasks from './components/QuickTasks';
import './styles/index.css';

const mq = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = (dark) => {
    document.documentElement.classList.toggle('dark', dark);
};
applyTheme(mq.matches);
mq.addEventListener('change', (e) => applyTheme(e.matches));

const isQuickTasksWindow =
    new URLSearchParams(window.location.search).get('view') === 'quick-tasks';
const RootComponent = isQuickTasksWindow ? QuickTasks : App;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <RootComponent />
    </React.StrictMode>,
);

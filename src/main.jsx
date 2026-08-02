import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import QuickTasks from './components/QuickTasks';
import { initializeTheme } from './theme';
import './styles/index.css';

initializeTheme();

const isQuickTasksWindow =
    new URLSearchParams(window.location.search).get('view') === 'quick-tasks';
const RootComponent = isQuickTasksWindow ? QuickTasks : App;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <RootComponent />
    </React.StrictMode>,
);

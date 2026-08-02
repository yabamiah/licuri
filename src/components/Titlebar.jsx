import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Icon } from '@iconify/react';
import {
    getAppliedTheme,
    onThemeChange,
    setPreferredTheme,
} from '../theme';

const appWindow = getCurrentWindow();

export default function Titlebar() {
    const [theme, setTheme] = useState(getAppliedTheme);
    const dark = theme === 'dark';

    useEffect(() => onThemeChange(setTheme), []);

    const toggleTheme = () => {
        setPreferredTheme(dark ? 'light' : 'dark');
    };

    return (
        <div className="titlebar">
            <div
                className="titlebar-drag"
                data-tauri-drag-region
            >
                <Icon icon="solar:checklist-bold" className="titlebar-icon" />
                <span className="titlebar-title" data-tauri-drag-region>
                    Planner Task
                </span>
            </div>

            <div className="titlebar-controls">
                <button
                    type="button"
                    className="theme-toggle"
                    onClick={toggleTheme}
                    aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
                    aria-pressed={dark}
                    title={dark ? 'Usar tema claro' : 'Usar tema escuro'}
                >
                    <span className="theme-toggle-thumb" aria-hidden="true" />
                    <Icon
                        icon="solar:sun-bold"
                        className="theme-toggle-marker theme-toggle-marker--sun"
                        width={13}
                        aria-hidden="true"
                    />
                    <Icon
                        icon="solar:moon-bold"
                        className="theme-toggle-marker theme-toggle-marker--moon"
                        width={12}
                        aria-hidden="true"
                    />
                </button>
                <button
                    className="titlebar-btn"
                    onClick={() => appWindow.minimize()}
                    aria-label="Minimizar"
                >
                    <Icon icon="solar:minimize-square-linear" width={16} />
                </button>
                <button
                    className="titlebar-btn close"
                    onClick={() => appWindow.hide()}
                    aria-label="Fechar para barra de tarefas"
                >
                    <Icon icon="solar:close-square-linear" width={16} />
                </button>
            </div>
        </div>
    );
}

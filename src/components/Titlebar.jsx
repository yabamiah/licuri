import { getCurrentWindow } from '@tauri-apps/api/window';
import { Icon } from '@iconify/react';

const appWindow = getCurrentWindow();

export default function Titlebar() {
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
                    className="titlebar-btn"
                    onClick={() => appWindow.minimize()}
                    aria-label="Minimizar"
                >
                    <Icon icon="solar:minimize-square-linear" width={16} />
                </button>
                <button
                    className="titlebar-btn close"
                    onClick={() => appWindow.hide()}
                    aria-label="Fechar para bandeja"
                >
                    <Icon icon="solar:close-square-linear" width={16} />
                </button>
            </div>
        </div>
    );
}

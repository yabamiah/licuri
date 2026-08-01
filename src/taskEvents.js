import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const TASKS_CHANGED_EVENT = 'licuri://tasks-changed';
export const QUICK_OPENED_EVENT = 'licuri://quick-opened';

const sourceWindow = getCurrentWindow().label;

export async function broadcastTasksChanged() {
    try {
        await emit(TASKS_CHANGED_EVENT, { source: sourceWindow });
    } catch (error) {
        console.warn('Failed to broadcast task changes:', error);
    }
}

export function onTasksChanged(handler) {
    return listen(TASKS_CHANGED_EVENT, (event) => {
        if (event.payload?.source !== sourceWindow) {
            handler();
        }
    });
}

export function onQuickOpened(handler) {
    return listen(QUICK_OPENED_EVENT, handler);
}

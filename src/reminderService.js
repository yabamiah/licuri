import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const REMINDER_FIRED_EVENT = 'licuri://reminder-fired';
export const REMINDER_FAILED_EVENT = 'licuri://reminder-failed';

export async function ensureNotificationPermission() {
    try {
        return await invoke('ensure_notification_permission');
    } catch (error) {
        return {
            ok: false,
            reason: 'permission-error',
            detail: String(error),
        };
    }
}

export async function syncNativeReminders(tasks) {
    const reminders = tasks
        .filter((task) => (
            Boolean(task.reminder_enabled)
            && task.status !== 'done'
            && Number(task.reminder_interval_minutes) > 0
        ))
        .map((task) => ({
            taskId: Number(task.id),
            taskName: task.name,
            intervalMinutes: Number(task.reminder_interval_minutes),
            nextAtMs: Date.parse(task.reminder_next_at),
        }))
        .filter((reminder) => Number.isFinite(reminder.nextAtMs));

    if (reminders.length > 0) {
        const permission = await ensureNotificationPermission();
        if (!permission.ok) return permission;
    }

    await invoke('sync_task_reminders', { reminders });
    return { ok: true };
}

export function onReminderFired(handler) {
    return listen(REMINDER_FIRED_EVENT, (event) => handler(event.payload));
}

export function onReminderFailed(handler) {
    return listen(REMINDER_FAILED_EVENT, (event) => handler(event.payload));
}

export async function sendTestReminder(taskName) {
    return invoke('test_task_reminder', { taskName });
}

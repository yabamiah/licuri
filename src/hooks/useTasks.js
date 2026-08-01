import { useState, useEffect, useCallback } from 'react';
import * as db from '../db';
import { broadcastTasksChanged, onTasksChanged } from '../taskEvents';
import { computeTaskStatus } from '../taskStatus';
import {
    ensureNotificationPermission,
    onReminderFailed,
    onReminderFired,
    sendTestReminder,
    syncNativeReminders,
} from '../reminderService';
import { MAX_REMINDER_MINUTES } from '../reminderInterval';

export function useTasks() {
    const [tasks, setTasks] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reminderDeliveryError, setReminderDeliveryError] = useState(null);

    const loadTasks = useCallback(async () => {
        const rows = await db.getTasks();
        setTasks(rows);
        try {
            const result = await syncNativeReminders(rows);
            if (!result?.ok) {
                setReminderDeliveryError({
                    reason: result?.reason || 'permission-error',
                    detail: result?.detail,
                });
            }
        } catch (error) {
            console.warn('Failed to sync native reminders:', error);
            setReminderDeliveryError({
                reason: 'delivery-error',
                detail: String(error),
            });
        }
        return rows;
    }, []);

    const loadItems = useCallback(async (taskId) => {
        if (!taskId) {
            setItems([]);
            return [];
        }
        const rows = await db.getItems(taskId);
        setItems(rows);
        return rows;
    }, []);

    const syncStatus = useCallback(async (taskId, currentItems) => {
        const newStatus = computeTaskStatus(currentItems);
        await db.updateTaskStatus(taskId, newStatus);
        if (newStatus === 'done') {
            await db.disableTaskReminder(taskId);
        }
        await loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        (async () => {
            try {
                const rows = await loadTasks();
                if (rows.length > 0) {
                    setSelectedTaskId(rows[0].id);
                }
            } catch (e) {
                console.error('Failed to load tasks:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        loadItems(selectedTaskId);
    }, [selectedTaskId, loadItems]);

    useEffect(() => {
        let disposed = false;
        let unlisten;

        onTasksChanged(async () => {
            try {
                await Promise.all([
                    loadTasks(),
                    selectedTaskId ? loadItems(selectedTaskId) : Promise.resolve(),
                ]);
            } catch (e) {
                console.error('Failed to refresh tasks from another window:', e);
            }
        }).then((unsubscribe) => {
            if (disposed) {
                unsubscribe();
            } else {
                unlisten = unsubscribe;
            }
        });

        return () => {
            disposed = true;
            unlisten?.();
        };
    }, [loadItems, loadTasks, selectedTaskId]);

    useEffect(() => {
        let disposed = false;
        let unlisten;

        onReminderFired(async ({ taskId, nextAtMs }) => {
            try {
                await db.updateTaskReminderNextAt(
                    taskId,
                    new Date(nextAtMs).toISOString(),
                );
                await loadTasks();
                await broadcastTasksChanged();
            } catch (error) {
                console.error('Failed to persist next reminder:', error);
            }
        }).then((unsubscribe) => {
            if (disposed) {
                unsubscribe();
            } else {
                unlisten = unsubscribe;
            }
        });

        return () => {
            disposed = true;
            unlisten?.();
        };
    }, [loadTasks]);

    useEffect(() => {
        let disposed = false;
        let unlisten;

        onReminderFailed((failure) => {
            setReminderDeliveryError(failure);
        }).then((unsubscribe) => {
            if (disposed) {
                unsubscribe();
            } else {
                unlisten = unsubscribe;
            }
        });

        return () => {
            disposed = true;
            unlisten?.();
        };
    }, []);

    const createTask = async (name, checklistItems = []) => {
        try {
            const status = computeTaskStatus(checklistItems);
            const id = await db.addTaskWithItems(
                name,
                checklistItems,
                status,
            );
            await loadTasks();
            setSelectedTaskId(id);
            await loadItems(id);
            await broadcastTasksChanged();
            return { ok: true, id };
        } catch (e) {
            console.error('Failed to create task:', e);
            return { ok: false, error: e };
        }
    };

    const removeTask = async (id) => {
        try {
            await db.deleteTask(id);
            const remaining = await loadTasks();
            if (selectedTaskId === id) {
                setSelectedTaskId(remaining.length > 0 ? remaining[0].id : null);
            }
            await broadcastTasksChanged();
        } catch (e) {
            console.error('Failed to remove task:', e);
        }
    };

    const changeStatus = async (id, status) => {
        try {
            await db.updateTaskStatus(id, status);
            if (status === 'done') {
                await db.disableTaskReminder(id);
            }
            await loadTasks();
            await broadcastTasksChanged();
        } catch (e) {
            console.error('Failed to change status:', e);
        }
    };

    const setTaskReminder = async (id, intervalMinutes) => {
        const normalizedMinutes = Number(intervalMinutes);
        if (
            !Number.isInteger(normalizedMinutes)
            || normalizedMinutes < 1
            || normalizedMinutes > MAX_REMINDER_MINUTES
        ) {
            return { ok: false, reason: 'invalid-interval' };
        }

        const permission = await ensureNotificationPermission();
        if (!permission.ok) {
            return {
                ok: false,
                reason: permission.reason,
                detail: permission.detail,
            };
        }

        try {
            const nextAt = new Date(
                Date.now() + normalizedMinutes * 60_000,
            ).toISOString();
            await db.updateTaskReminder(id, normalizedMinutes, nextAt);
            await loadTasks();
            await broadcastTasksChanged();
            return { ok: true, nextAt };
        } catch (error) {
            console.error('Failed to configure reminder:', error);
            return { ok: false, reason: 'save-error', error };
        }
    };

    const disableTaskReminder = async (id) => {
        try {
            await db.disableTaskReminder(id);
            await loadTasks();
            await broadcastTasksChanged();
            return { ok: true };
        } catch (error) {
            console.error('Failed to disable reminder:', error);
            return { ok: false, reason: 'save-error', error };
        }
    };

    const testTaskReminder = async (taskName) => {
        const permission = await ensureNotificationPermission();
        if (!permission.ok) {
            return {
                ok: false,
                reason: permission.reason,
                detail: permission.detail,
            };
        }

        try {
            const result = await sendTestReminder(taskName);
            if (!result?.ok) {
                return {
                    ok: false,
                    reason: result?.reason || 'send-error',
                    detail: result?.detail,
                };
            }
            setReminderDeliveryError(null);
            return { ok: true, warning: result.warning };
        } catch (error) {
            console.error('Failed to send test reminder:', error);
            return { ok: false, reason: 'send-error', error };
        }
    };

    const renameTask = async (id, name) => {
        try {
            await db.updateTaskName(id, name);
            await loadTasks();
            await broadcastTasksChanged();
        } catch (e) {
            console.error('Failed to rename task:', e);
        }
    };

    const updateDeadline = async (id, deadline) => {
        try {
            await db.updateTaskDeadline(id, deadline);
            await loadTasks();
            await broadcastTasksChanged();
        } catch (e) {
            console.error('Failed to update deadline:', e);
        }
    };

    const setTaskImportant = async (id, important) => {
        try {
            await db.updateTaskImportant(id, important);
            await loadTasks();
            await broadcastTasksChanged();
        } catch (e) {
            console.error('Failed to update important task:', e);
        }
    };

    const createItem = async (text) => {
        if (!selectedTaskId) return;
        try {
            await db.addItem(selectedTaskId, text);
            const updatedItems = await loadItems(selectedTaskId);
            await syncStatus(selectedTaskId, updatedItems);
            await broadcastTasksChanged();
        } catch (e) {
            console.error('Failed to create item:', e);
        }
    };

    const toggleItemCheck = async (itemId) => {
        try {
            await db.toggleItem(itemId);
            const updatedItems = await loadItems(selectedTaskId);
            await syncStatus(selectedTaskId, updatedItems);
            await broadcastTasksChanged();
        } catch (e) {
            console.error('Failed to toggle item:', e);
        }
    };

    const removeItem = async (itemId) => {
        try {
            await db.deleteItem(itemId);
            const updatedItems = await loadItems(selectedTaskId);
            await syncStatus(selectedTaskId, updatedItems);
            await broadcastTasksChanged();
        } catch (e) {
            console.error('Failed to remove item:', e);
        }
    };

    const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

    return {
        tasks,
        selectedTask,
        selectedTaskId,
        setSelectedTaskId,
        items,
        loading,
        reminderDeliveryError,
        clearReminderDeliveryError: () => setReminderDeliveryError(null),
        createTask,
        removeTask,
        changeStatus,
        renameTask,
        updateDeadline,
        setTaskImportant,
        setTaskReminder,
        disableTaskReminder,
        testTaskReminder,
        createItem,
        toggleItemCheck,
        removeItem,
    };
}

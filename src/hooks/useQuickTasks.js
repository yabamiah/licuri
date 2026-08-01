import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as db from '../db';
import {
    broadcastTasksChanged,
    onQuickOpened,
    onTasksChanged,
} from '../taskEvents';
import { computeTaskStatus } from '../taskStatus';

export function useQuickTasks() {
    const [tasks, setTasks] = useState([]);
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [itemsByTask, setItemsByTask] = useState({});
    const [savingByTask, setSavingByTask] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [announcement, setAnnouncement] = useState('');

    const loadImportantTasks = useCallback(async () => {
        setError(null);

        try {
            const rows = await db.getImportantTasks();
            setTasks(rows);
            setExpandedTaskId((currentId) => (
                rows.some((task) => task.id === currentId) ? currentId : null
            ));
            return rows;
        } catch (loadError) {
            console.error('Failed to load important tasks:', loadError);
            setError('Não foi possível ler as tarefas. Recarregue para tentar novamente.');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTaskItems = useCallback(async (taskId) => {
        setItemsByTask((current) => ({
            ...current,
            [taskId]: { status: 'loading', items: [] },
        }));

        try {
            const rows = await db.getItems(taskId);
            setItemsByTask((current) => ({
                ...current,
                [taskId]: { status: 'loaded', items: rows },
            }));
            return rows;
        } catch (loadError) {
            console.error('Failed to load task items:', loadError);
            setItemsByTask((current) => ({
                ...current,
                [taskId]: {
                    status: 'error',
                    items: [],
                    message: 'Não foi possível ler os passos desta tarefa.',
                },
            }));
            return [];
        }
    }, []);

    const refresh = useCallback(async () => {
        const rows = await loadImportantTasks();
        const currentExpandedId = expandedTaskId;

        if (
            currentExpandedId
            && rows.some((task) => task.id === currentExpandedId)
        ) {
            await loadTaskItems(currentExpandedId);
        }
    }, [expandedTaskId, loadImportantTasks, loadTaskItems]);

    useEffect(() => {
        loadImportantTasks();
    }, [loadImportantTasks]);

    useEffect(() => {
        let disposed = false;
        const unsubscribers = [];

        Promise.all([
            onQuickOpened(refresh),
            onTasksChanged(refresh),
        ]).then((listeners) => {
            if (disposed) {
                listeners.forEach((unsubscribe) => unsubscribe());
            } else {
                unsubscribers.push(...listeners);
            }
        });

        return () => {
            disposed = true;
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    }, [refresh]);

    const toggleTask = async (taskId) => {
        if (expandedTaskId === taskId) {
            setExpandedTaskId(null);
            return;
        }

        setExpandedTaskId(taskId);
        if (!itemsByTask[taskId] || itemsByTask[taskId].status === 'error') {
            await loadTaskItems(taskId);
        }
    };

    const toggleItem = async (taskId, itemId) => {
        if (savingByTask[taskId]) return;

        const taskItemsState = itemsByTask[taskId];
        const previousItems = taskItemsState?.items ?? [];
        const previousTask = tasks.find((task) => task.id === taskId);
        if (!previousTask || previousItems.length === 0) return;

        const updatedItems = previousItems.map((item) => (
            item.id === itemId
                ? { ...item, checked: item.checked ? 0 : 1 }
                : item
        ));
        const updatedStatus = computeTaskStatus(updatedItems);
        const checkedCount = updatedItems.filter((item) => item.checked).length;
        const toggledItem = updatedItems.find((item) => item.id === itemId);

        setItemsByTask((current) => ({
            ...current,
            [taskId]: { status: 'loaded', items: updatedItems },
        }));
        setTasks((current) => current.map((task) => (
            task.id === taskId
                ? {
                    ...task,
                    status: updatedStatus,
                    checked_count: checkedCount,
                    item_count: updatedItems.length,
                }
                : task
        )));
        setSavingByTask((current) => ({ ...current, [taskId]: itemId }));
        setError(null);
        setAnnouncement(
            toggledItem?.checked ? 'Passo concluído.' : 'Passo reaberto.',
        );

        try {
            await db.toggleItem(itemId);
            await db.updateTaskStatus(taskId, updatedStatus);
            if (updatedStatus === 'done') {
                await db.disableTaskReminder(taskId);
            }
            await broadcastTasksChanged();
        } catch (saveError) {
            console.error('Failed to update checklist item:', saveError);
            setAnnouncement('A alteração não foi salva.');
            setError(
                'Não foi possível salvar o passo. Recarregue para conferir o estado armazenado.',
            );
            setItemsByTask((current) => ({
                ...current,
                [taskId]: { status: 'loaded', items: previousItems },
            }));
            setTasks((current) => current.map((task) => (
                task.id === taskId ? previousTask : task
            )));
        } finally {
            setSavingByTask((current) => {
                const next = { ...current };
                delete next[taskId];
                return next;
            });
        }
    };

    const openMainWindow = async () => {
        try {
            await invoke('show_main_window');
        } catch (openError) {
            console.error('Failed to open main window:', openError);
            setError('Não foi possível abrir o Licuri pela janela de acesso rápido.');
        }
    };

    return {
        tasks,
        expandedTaskId,
        itemsByTask,
        savingByTask,
        loading,
        error,
        announcement,
        refresh,
        loadTaskItems,
        toggleTask,
        toggleItem,
        openMainWindow,
    };
}

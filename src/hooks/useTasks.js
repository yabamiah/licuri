import { useState, useEffect, useCallback } from 'react';
import * as db from '../db';

function computeStatus(items) {
    if (!items || items.length === 0) return 'todo';
    const checked = items.filter((i) => i.checked).length;
    if (checked === 0) return 'todo';
    if (checked === items.length) return 'done';
    return 'doing';
}

export function useTasks() {
    const [tasks, setTasks] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadTasks = useCallback(async () => {
        const rows = await db.getTasks();
        setTasks(rows);
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
        const newStatus = computeStatus(currentItems);
        await db.updateTaskStatus(taskId, newStatus);
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

    const createTask = async (name) => {
        try {
            const id = await db.addTask(name);
            await loadTasks();
            setSelectedTaskId(id);
        } catch (e) {
            console.error('Failed to create task:', e);
        }
    };

    const removeTask = async (id) => {
        try {
            await db.deleteTask(id);
            const remaining = await loadTasks();
            if (selectedTaskId === id) {
                setSelectedTaskId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (e) {
            console.error('Failed to remove task:', e);
        }
    };

    const changeStatus = async (id, status) => {
        try {
            await db.updateTaskStatus(id, status);
            await loadTasks();
        } catch (e) {
            console.error('Failed to change status:', e);
        }
    };

    const renameTask = async (id, name) => {
        try {
            await db.updateTaskName(id, name);
            await loadTasks();
        } catch (e) {
            console.error('Failed to rename task:', e);
        }
    };

    const updateDeadline = async (id, deadline) => {
        try {
            await db.updateTaskDeadline(id, deadline);
            await loadTasks();
        } catch (e) {
            console.error('Failed to update deadline:', e);
        }
    };

    const createItem = async (text) => {
        if (!selectedTaskId) return;
        try {
            await db.addItem(selectedTaskId, text);
            const updatedItems = await loadItems(selectedTaskId);
            await syncStatus(selectedTaskId, updatedItems);
        } catch (e) {
            console.error('Failed to create item:', e);
        }
    };

    const toggleItemCheck = async (itemId) => {
        try {
            await db.toggleItem(itemId);
            const updatedItems = await loadItems(selectedTaskId);
            await syncStatus(selectedTaskId, updatedItems);
        } catch (e) {
            console.error('Failed to toggle item:', e);
        }
    };

    const removeItem = async (itemId) => {
        try {
            await db.deleteItem(itemId);
            const updatedItems = await loadItems(selectedTaskId);
            await syncStatus(selectedTaskId, updatedItems);
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
        createTask,
        removeTask,
        changeStatus,
        renameTask,
        updateDeadline,
        createItem,
        toggleItemCheck,
        removeItem,
    };
}

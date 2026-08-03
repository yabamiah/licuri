import { useCallback, useEffect, useState } from 'react';
import * as db from '../db';

function isDuplicateLinkError(error) {
    return String(error).includes('idx_task_resources_unique_link')
        || String(error).includes('UNIQUE constraint failed: task_resources.task_id, task_resources.value');
}

export function useTaskResources(taskId) {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const loadResources = useCallback(async () => {
        if (!taskId) {
            setResources([]);
            setLoading(false);
            return [];
        }

        setLoading(true);
        setLoadError('');
        try {
            const rows = await db.getTaskResources(taskId);
            setResources(rows);
            return rows;
        } catch (error) {
            console.error('Failed to load task resources:', error);
            setLoadError('Não foi possível carregar os recursos desta tarefa.');
            return [];
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        let active = true;

        (async () => {
            if (!taskId) {
                setResources([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setLoadError('');
            try {
                const rows = await db.getTaskResources(taskId);
                if (active) setResources(rows);
            } catch (error) {
                console.error('Failed to load task resources:', error);
                if (active) {
                    setLoadError('Não foi possível carregar os recursos desta tarefa.');
                }
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [taskId]);

    const createResource = async (resource) => {
        try {
            const created = await db.addTaskResource(taskId, resource);
            setResources((current) => [created, ...current]);
            return { ok: true, resource: created };
        } catch (error) {
            console.error('Failed to create task resource:', error);
            return {
                ok: false,
                reason: isDuplicateLinkError(error) ? 'duplicate-link' : 'save-error',
                error,
            };
        }
    };

    const updateResource = async (resourceId, resource) => {
        try {
            const updated = await db.updateTaskResource(
                taskId,
                resourceId,
                resource,
            );
            setResources((current) => current.map((item) => (
                item.id === resourceId ? updated : item
            )));
            return { ok: true, resource: updated };
        } catch (error) {
            console.error('Failed to update task resource:', error);
            return {
                ok: false,
                reason: isDuplicateLinkError(error) ? 'duplicate-link' : 'save-error',
                error,
            };
        }
    };

    const removeResource = async (resourceId) => {
        try {
            await db.deleteTaskResource(taskId, resourceId);
            setResources((current) => current.filter(
                (resource) => resource.id !== resourceId,
            ));
            return { ok: true };
        } catch (error) {
            console.error('Failed to delete task resource:', error);
            return { ok: false, reason: 'delete-error', error };
        }
    };

    return {
        resources,
        loading,
        loadError,
        reload: loadResources,
        createResource,
        updateResource,
        removeResource,
    };
}

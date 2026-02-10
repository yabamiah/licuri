import { useState } from 'react';
import { Icon } from '@iconify/react';
import StatusBadge from './StatusBadge';

export default function TaskSidebar({
    tasks,
    selectedTaskId,
    onSelect,
    onCreateTask,
    onDeleteTask,
}) {
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        await onCreateTask(name);
        setNewName('');
        setShowForm(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setShowForm(false);
            setNewName('');
        }
    };

    return (
        <aside className="task-sidebar">
            <div className="sidebar-header">
                <h2>Tarefas</h2>
                <button
                    className="sidebar-add-btn"
                    onClick={() => setShowForm((v) => !v)}
                    aria-label="Nova tarefa"
                >
                    <Icon
                        icon={showForm ? 'solar:close-circle-bold' : 'solar:add-circle-bold'}
                        width={20}
                    />
                </button>
            </div>

            {showForm && (
                <form className="task-form" onSubmit={handleSubmit}>
                    <div className="task-form-row">
                        <input
                            className="task-form-input"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nome da tarefa..."
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="task-form-action confirm"
                            aria-label="Confirmar"
                        >
                            <Icon icon="solar:check-circle-bold" width={18} />
                        </button>
                        <button
                            type="button"
                            className="task-form-action cancel"
                            onClick={() => { setShowForm(false); setNewName(''); }}
                            aria-label="Cancelar"
                        >
                            <Icon icon="solar:close-circle-bold" width={18} />
                        </button>
                    </div>
                </form>
            )}

            <div className="task-list">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className={`task-item ${selectedTaskId === task.id ? 'active' : ''}`}
                        onClick={() => onSelect(task.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onSelect(task.id)}
                    >
                        <StatusBadge status={task.status} />
                        <span className="task-item-name">{task.name}</span>
                        <button
                            className="task-item-delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTask(task.id);
                            }}
                            aria-label={`Excluir ${task.name}`}
                        >
                            <Icon icon="solar:trash-bin-minimalistic-linear" width={14} />
                        </button>
                    </div>
                ))}

                {tasks.length === 0 && !showForm && (
                    <div
                        style={{
                            padding: 'var(--space-4)',
                            textAlign: 'center',
                            color: 'var(--ink-faint)',
                            fontSize: 'var(--text-xs)',
                        }}
                    >
                        Nenhuma tarefa ainda
                    </div>
                )}
            </div>
        </aside>
    );
}

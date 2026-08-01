import { Icon } from '@iconify/react';
import StatusBadge from './StatusBadge';

export default function TaskSidebar({
    tasks,
    selectedTaskId,
    onSelect,
    onRequestCreate,
    onDeleteTask,
}) {
    return (
        <aside className="task-sidebar">
            <div className="sidebar-header">
                <h2>Tarefas</h2>
                <button
                    className="sidebar-add-btn"
                    onClick={onRequestCreate}
                    aria-label="Nova tarefa"
                >
                    <Icon icon="solar:add-circle-bold" width={20} />
                </button>
            </div>

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

                {tasks.length === 0 && (
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

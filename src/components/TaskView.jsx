import { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import ChecklistItem from './ChecklistItem';

const STATUSES = [
    { key: 'todo', label: 'A fazer' },
    { key: 'doing', label: 'Fazendo' },
    { key: 'done', label: 'Completa' },
];

export default function TaskView({
    task,
    items,
    onChangeStatus,
    onAddItem,
    onToggleItem,
    onDeleteItem,
    onRenameTask,
}) {
    const [newItemText, setNewItemText] = useState('');
    const [editingName, setEditingName] = useState(false);
    const inputRef = useRef(null);
    const nameInputRef = useRef(null);

    if (!task) {
        return (
            <div className="task-view">
                <div className="task-view-empty">
                    <Icon
                        icon="solar:clipboard-list-linear"
                        className="task-view-empty-icon"
                        width={48}
                    />
                    <p>
                        Selecione uma tarefa na lateral
                        <br />
                        ou crie uma nova para começar.
                    </p>
                </div>
            </div>
        );
    }

    const handleAddItem = async (e) => {
        e.preventDefault();
        const text = newItemText.trim();
        if (!text) return;
        await onAddItem(text);
        setNewItemText('');
        inputRef.current?.focus();
    };

    const handleNameSave = (e) => {
        const name = e.target.value.trim();
        if (name && name !== task.name) {
            onRenameTask(task.id, name);
        }
        setEditingName(false);
    };

    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
        if (e.key === 'Escape') {
            setEditingName(false);
        }
    };

    const startEditing = () => {
        setEditingName(true);
        setTimeout(() => nameInputRef.current?.focus(), 0);
    };

    const checkedCount = items.filter((i) => i.checked).length;

    return (
        <div className="task-view">
            <div className="task-header">
                <div className="task-header-top">
                    {editingName ? (
                        <input
                            ref={nameInputRef}
                            className="task-name task-name-editing"
                            defaultValue={task.name}
                            key={`edit-${task.id}`}
                            onBlur={handleNameSave}
                            onKeyDown={handleNameKeyDown}
                            aria-label="Editar nome da tarefa"
                            autoFocus
                        />
                    ) : (
                        <h1 className="task-name task-name-display" key={`display-${task.id}`}>
                            {task.name}
                        </h1>
                    )}
                    <button
                        className="task-name-edit-btn"
                        onClick={startEditing}
                        aria-label="Editar nome"
                        title="Editar nome"
                    >
                        <Icon icon="solar:pen-2-linear" width={16} />
                    </button>
                </div>

                <div className="status-selector">
                    {STATUSES.map((s) => (
                        <button
                            key={s.key}
                            className={`status-option ${s.key} ${task.status === s.key ? 'selected' : ''
                                }`}
                            onClick={() => onChangeStatus(task.id, s.key)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {items.length > 0 && (
                    <div
                        style={{
                            marginTop: 'var(--space-2)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--ink-muted)',
                        }}
                    >
                        {checkedCount}/{items.length} concluídos
                    </div>
                )}
            </div>

            <div className="checklist">
                {items.map((item) => (
                    <ChecklistItem
                        key={item.id}
                        item={item}
                        onToggle={() => onToggleItem(item.id)}
                        onDelete={() => onDeleteItem(item.id)}
                    />
                ))}

                {items.length === 0 && (
                    <div className="task-view-empty" style={{ flex: 'unset', padding: 'var(--space-8) 0' }}>
                        <Icon icon="solar:checklist-minimalistic-linear" width={36} style={{ opacity: 0.2 }} />
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-faint)' }}>
                            Adicione itens ao checklist abaixo
                        </p>
                    </div>
                )}
            </div>

            <form className="add-item-form" onSubmit={handleAddItem}>
                <input
                    ref={inputRef}
                    className="add-item-input"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Novo item..."
                />
                <button className="add-item-btn" type="submit" aria-label="Adicionar item">
                    <Icon icon="solar:add-circle-bold" width={20} />
                </button>
            </form>
        </div>
    );
}

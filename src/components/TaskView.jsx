import { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import ChecklistItem from './ChecklistItem';
import ProgressbarTask from './ProgressbarTask';
import MiniCalendar from './MiniCalendar';

const STATUSES = [
    { key: 'todo', label: 'A fazer' },
    { key: 'doing', label: 'Fazendo' },
    { key: 'done', label: 'Completa' },
    { key: 'expired', label: 'Atrasada' }
];

export default function TaskView({
    task,
    items,
    onChangeStatus,
    onAddItem,
    onToggleItem,
    onDeleteItem,
    onRenameTask,
    onUpdateDeadline,
}) {
    const [newItemText, setNewItemText] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [openCalendar, setOpenCalendar] = useState(false);
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

    const toggleCalendar = (e) => {
        e.stopPropagation();
        setOpenCalendar(!openCalendar);
    }

    const handleDateSelect = (date) => {
        const isoDate = date.toISOString();
        onUpdateDeadline(task.id, isoDate);
        setOpenCalendar(false);

        // Check if expired
        const now = new Date();
        // Reset hours to compare only dates or keep time? 
        // Use full comparison
        if (date < now) {
            onChangeStatus(task.id, 'expired');
        } else {
            // If it was expired, reset it. 
            // If it was 'done', keep it 'done'.
            if (task.status === 'expired') {
                onChangeStatus(task.id, 'todo');
            }
        }
    }

    const handleClearDeadline = (e) => {
        e.stopPropagation();
        onUpdateDeadline(task.id, null);
        if (task.status === 'expired') {
            onChangeStatus(task.id, 'todo'); // Or calculate based on items? 'todo' is safe default.
        }
    }

    const formatDate = (isoString) => {
        if (!isoString) return null;
        return new Date(isoString).toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short'
        });
    }

    const checkedCount = items.filter((i) => i.checked).length;

    // Close calendar when clicking outside logic could be added here or in MiniCalendar 
    // but MiniCalendar handles stopPropagation. 
    // We need a global click listener to close it? 
    // For now simple toggle.

    return (
        <div className="task-view" onClick={() => setOpenCalendar(false)}>
            <div className="task-header">
                <div className="task-header-top">
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
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
                            onClick={(e) => { e.stopPropagation(); startEditing(); }}
                            aria-label="Editar nome"
                            title="Editar nome"
                        >
                            <Icon icon="solar:pen-2-linear" width={16} />
                        </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button
                            className={`task-set-deadline-btn ${task.deadline ? 'has-deadline' : ''}`}
                            onClick={toggleCalendar}
                            aria-label={task.deadline ? 'Alterar prazo' : 'Definir prazo'}
                            title={task.deadline ? 'Alterar prazo' : 'Definir prazo'}
                        >
                            <Icon icon={task.deadline ? "solar:calendar-bold" : "solar:calendar-add-linear"} width={16} />
                            {task.deadline ? (
                                <>
                                    <span>{formatDate(task.deadline)}</span>
                                    <div
                                        role="button"
                                        className="clear-deadline-icon"
                                        onClick={handleClearDeadline}
                                        title="Remover prazo"
                                        aria-label="Remover prazo"
                                    >
                                        <Icon icon="solar:close-circle-bold" width={16} />
                                    </div>
                                </>
                            ) : (
                                <span>Prazo</span>
                            )}
                        </button>
                        {openCalendar && (
                            <MiniCalendar
                                selectedDate={task.deadline ? new Date(task.deadline) : null}
                                onSelect={handleDateSelect}
                                onClose={() => setOpenCalendar(false)}
                            />
                        )}
                    </div>
                </div>

                <div className="status-selector">
                    {STATUSES.filter(s => s.key !== 'expired' || task.deadline).map((s) => (
                        <button
                            key={s.key}
                            className={`status-option ${s.key} ${task.status === s.key ? 'selected' : ''
                                }`}
                            onClick={(e) => { e.stopPropagation(); onChangeStatus(task.id, s.key); }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {items.length > 0 && (
                    <ProgressbarTask total={items.length} completed={checkedCount} />
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
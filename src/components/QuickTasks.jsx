import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useQuickTasks } from '../hooks/useQuickTasks';
import QuickIcon from './QuickIcon';

const quickWindow = getCurrentWindow();

const STATUS_LABELS = {
    todo: 'A fazer',
    doing: 'Em andamento',
    done: 'Concluída',
    expired: 'Atrasada',
};

function formatDeadline(deadline) {
    if (!deadline) return null;

    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
    });
}

function QuickSkeleton() {
    return (
        <div className="quick-skeleton" aria-label="Carregando tarefas">
            {[0, 1, 2].map((item) => (
                <div className="quick-skeleton-card" key={item}>
                    <span className="quick-skeleton-line wide" />
                    <span className="quick-skeleton-line short" />
                </div>
            ))}
        </div>
    );
}

function QuickTaskItems({
    task,
    itemState,
    savingItemId,
    onToggleItem,
    onRetry,
    onOpenMain,
}) {
    if (!itemState || itemState.status === 'loading') {
        return (
            <div className="quick-steps-loading" aria-label="Carregando passos">
                <span />
                <span />
                <span />
            </div>
        );
    }

    if (itemState.status === 'error') {
        return (
            <div className="quick-inline-state quick-inline-state--error">
                <p>{itemState.message}</p>
                <button type="button" onClick={onRetry}>Tentar novamente</button>
            </div>
        );
    }

    if (itemState.items.length === 0) {
        return (
            <div className="quick-inline-state">
                <QuickIcon name="checklist" size={24} />
                <p>Esta tarefa ainda não tem passos.</p>
                <button type="button" onClick={onOpenMain}>Adicionar no Licuri</button>
            </div>
        );
    }

    return (
        <div className="quick-steps" role="group" aria-label={`Passos de ${task.name}`}>
            {itemState.items.map((item) => {
                const saving = savingItemId === item.id;
                const indentLevel = Math.max(
                    0,
                    Math.min(Number(item.indent_level) || 0, 3),
                );
                return (
                    <button
                        type="button"
                        className={`quick-step ${item.checked ? 'checked' : ''}`}
                        key={item.id}
                        role="checkbox"
                        aria-checked={Boolean(item.checked)}
                        disabled={Boolean(savingItemId)}
                        onClick={() => onToggleItem(item.id)}
                        style={{ '--quick-indent': `${indentLevel * 14}px` }}
                    >
                        <span className="quick-step-check" aria-hidden="true">
                            <QuickIcon
                                name={item.checked ? 'checked' : 'circle'}
                                size={20}
                            />
                        </span>
                        <span className="quick-step-text">{item.text}</span>
                        {saving && (
                            <span className="quick-step-saving" aria-hidden="true" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default function QuickTasks() {
    const {
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
    } = useQuickTasks();

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                quickWindow.hide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <section className="quick-shell" aria-labelledby="quick-title">
            <header className="quick-header">
                <div className="quick-brand" aria-hidden="true">
                    <QuickIcon name="checklist" size={21} />
                </div>
                <div className="quick-heading">
                    <span>Acesso rápido</span>
                    <h1 id="quick-title">Tarefas importantes</h1>
                </div>
                {!loading && tasks.length > 0 && (
                    <span
                        className="quick-count"
                        aria-label={`${tasks.length} tarefas importantes`}
                    >
                        {tasks.length}
                    </span>
                )}
                <button
                    type="button"
                    className="quick-open-main"
                    onClick={openMainWindow}
                    aria-label="Abrir janela principal do Licuri"
                    title="Abrir Licuri"
                >
                    <QuickIcon name="window" size={19} />
                </button>
            </header>

            {error && (
                <div className="quick-error" role="alert">
                    <QuickIcon name="warning" size={19} />
                    <p>{error}</p>
                    <button type="button" onClick={refresh}>Recarregar</button>
                </div>
            )}

            <main className="quick-content">
                {loading ? (
                    <QuickSkeleton />
                ) : tasks.length === 0 ? (
                    <div className="quick-empty">
                        <div className="quick-empty-mark" aria-hidden="true">
                            <QuickIcon name="star" size={34} />
                        </div>
                        <h2>Nenhuma tarefa fixada</h2>
                        <p>
                            Marque uma tarefa com a estrela para encontrá-la aqui
                            sem sair do editor.
                        </p>
                        <button type="button" onClick={openMainWindow}>
                            <QuickIcon name="star" size={17} />
                            Escolher tarefas
                        </button>
                    </div>
                ) : (
                    <div className="quick-task-list">
                        {tasks.map((task) => {
                            const total = Number(task.item_count) || 0;
                            const checked = Number(task.checked_count) || 0;
                            const progress = total > 0
                                ? Math.round((checked / total) * 100)
                                : 0;
                            const expanded = expandedTaskId === task.id;
                            const panelId = `quick-task-panel-${task.id}`;
                            const deadline = formatDeadline(task.deadline);

                            return (
                                <article
                                    className={`quick-task-card ${expanded ? 'expanded' : ''} ${task.status}`}
                                    key={task.id}
                                    style={{ '--quick-progress': `${progress}%` }}
                                >
                                    <span className="quick-progress-track" aria-hidden="true">
                                        <span />
                                    </span>
                                    <button
                                        type="button"
                                        className="quick-task-trigger"
                                        onClick={() => toggleTask(task.id)}
                                        aria-expanded={expanded}
                                        aria-controls={panelId}
                                    >
                                        <span className="quick-task-copy">
                                            <strong>{task.name}</strong>
                                            <span>
                                                <span className={`quick-status ${task.status}`}>
                                                    {STATUS_LABELS[task.status] ?? 'A fazer'}
                                                </span>
                                                <span aria-hidden="true">·</span>
                                                <span>
                                                    {total > 0
                                                        ? `${checked} de ${total} passos`
                                                        : 'Sem passos'}
                                                </span>
                                                {deadline && (
                                                    <>
                                                        <span aria-hidden="true">·</span>
                                                        <span>{deadline}</span>
                                                    </>
                                                )}
                                            </span>
                                        </span>
                                        <span className="quick-progress-number">
                                            {total > 0 ? `${progress}%` : '—'}
                                        </span>
                                        <QuickIcon
                                            className="quick-chevron"
                                            name="chevron"
                                            size={18}
                                        />
                                    </button>

                                    {expanded && (
                                        <div className="quick-task-panel" id={panelId}>
                                            <QuickTaskItems
                                                task={task}
                                                itemState={itemsByTask[task.id]}
                                                savingItemId={savingByTask[task.id]}
                                                onToggleItem={(itemId) => toggleItem(task.id, itemId)}
                                                onRetry={() => loadTaskItems(task.id)}
                                                onOpenMain={openMainWindow}
                                            />
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            <footer className="quick-footer">
                <span>
                    <QuickIcon name="star" size={13} filled />
                    Fixadas no Licuri
                </span>
                <span>Esc para fechar</span>
            </footer>

            <p className="sr-only" aria-live="polite">{announcement}</p>
        </section>
    );
}

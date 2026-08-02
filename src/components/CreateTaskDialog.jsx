import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { parseChecklistText } from '../utils/checklistParser';

const EXAMPLE = `1. Preparar fluxo de pagamento
   a. Diagramar criação
   b. Diagramar leitura`;

export default function CreateTaskDialog({ open, onClose, onCreate }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [titleTouched, setTitleTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const titleInputRef = useRef(null);
    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);
    const parsedItems = useMemo(
        () => parseChecklistText(description),
        [description],
    );
    const titleInvalid = titleTouched && title.trim().length === 0;
    const descriptionInvalid = (
        description.length > 0
        && description.trim().length > 0
        && parsedItems.length === 0
    );

    useEffect(() => {
        if (open) {
            previouslyFocusedRef.current = document.activeElement;
            requestAnimationFrame(() => titleInputRef.current?.focus());
            return;
        }

        previouslyFocusedRef.current?.focus?.();
    }, [open]);

    const closeDialog = () => {
        if (!submitting) onClose();
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeDialog();
            return;
        }

        if (event.key !== 'Tab') return;

        const focusable = dialogRef.current?.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)',
        );
        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setTitleTouched(true);
        setError('');

        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
            titleInputRef.current?.focus();
            return;
        }

        if (descriptionInvalid) {
            setError('Não encontrei nenhum passo válido no texto colado.');
            return;
        }

        setSubmitting(true);
        let result;
        try {
            result = await onCreate(normalizedTitle, parsedItems);
        } catch (creationError) {
            console.error('Failed to create imported task:', creationError);
            result = { ok: false, error: creationError };
        } finally {
            setSubmitting(false);
        }

        if (!result?.ok) {
            setError(
                'Não foi possível criar a tarefa. Seu texto foi preservado para você tentar novamente.',
            );
            return;
        }

        setTitle('');
        setDescription('');
        setTitleTouched(false);
        setError('');
        onClose();
    };

    if (!open) return null;

    return (
        <div
            className="create-task-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeDialog();
            }}
        >
            <section
                ref={dialogRef}
                className="create-task-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-task-title"
                aria-describedby="create-task-description"
                onKeyDown={handleKeyDown}
            >
                <header className="create-task-header">
                    <span className="create-task-header-icon" aria-hidden="true">
                        <Icon icon="solar:clipboard-add-bold-duotone" width={24} />
                    </span>
                    <span className="create-task-heading">
                        <span>Nova tarefa</span>
                        <h2 id="create-task-title">Importar tarefa em Markdown</h2>
                    </span>
                    <button
                        type="button"
                        className="create-task-close"
                        onClick={closeDialog}
                        disabled={submitting}
                        aria-label="Fechar criação de tarefa"
                    >
                        <Icon icon="solar:close-circle-linear" width={22} />
                    </button>
                </header>

                <form className="create-task-form" onSubmit={handleSubmit}>
                    <div className="create-task-body">
                        <p id="create-task-description" className="create-task-intro">
                            Cole o título e uma lista em Markdown. O Licuri transforma
                            cada linha em um passo editável.
                        </p>

                        <label className="create-task-field">
                            <span className="create-task-label">
                                Título da tarefa
                                <span aria-hidden="true">*</span>
                            </span>
                            <input
                                ref={titleInputRef}
                                value={title}
                                onChange={(event) => {
                                    setTitle(event.target.value);
                                    setError('');
                                }}
                                onBlur={() => setTitleTouched(true)}
                                aria-invalid={titleInvalid}
                                aria-describedby={
                                    titleInvalid ? 'task-title-error' : undefined
                                }
                                placeholder="Cole aqui o título da tarefa"
                                disabled={submitting}
                            />
                            {titleInvalid && (
                                <small
                                    id="task-title-error"
                                    className="create-task-field-error"
                                >
                                    Informe o título da tarefa.
                                </small>
                            )}
                        </label>

                        <label className="create-task-field">
                            <span className="create-task-label-row">
                                <span className="create-task-label">
                                    Descrição ou checklist
                                </span>
                                <span className="create-task-optional">Opcional</span>
                            </span>
                            <textarea
                                value={description}
                                onChange={(event) => {
                                    setDescription(event.target.value);
                                    setError('');
                                }}
                                aria-invalid={descriptionInvalid}
                                placeholder={EXAMPLE}
                                spellCheck="true"
                                disabled={submitting}
                            />
                            <small className="create-task-help">
                                Aceita numeração, letras, bullets e checkboxes como
                                <code>[x]</code>.
                            </small>
                        </label>

                        <section
                            className={`create-task-preview ${
                                parsedItems.length === 0 ? 'empty' : ''
                            }`}
                            aria-labelledby="checklist-preview-title"
                        >
                            <header>
                                <span id="checklist-preview-title">
                                    Prévia dos passos
                                </span>
                                {parsedItems.length > 0 && (
                                    <span className="create-task-count">
                                        {parsedItems.length}
                                    </span>
                                )}
                            </header>

                            {parsedItems.length === 0 ? (
                                <div className="create-task-preview-empty">
                                    <Icon
                                        icon="solar:list-check-minimalistic-linear"
                                        width={24}
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Os passos aparecerão aqui assim que você
                                        colar a descrição.
                                    </span>
                                </div>
                            ) : (
                                <ol className="create-task-preview-list">
                                    {parsedItems.map((item, index) => (
                                        <li
                                            key={`${item.text}-${index}`}
                                            className={item.checked ? 'checked' : ''}
                                            style={{
                                                '--preview-indent': `${item.indentLevel * 18}px`,
                                            }}
                                        >
                                            <Icon
                                                icon={
                                                    item.checked
                                                        ? 'solar:check-circle-bold'
                                                        : 'solar:circle-linear'
                                                }
                                                width={18}
                                                aria-hidden="true"
                                            />
                                            <span>{item.text}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>

                        {error && (
                            <div className="create-task-error" role="alert">
                                <Icon
                                    icon="solar:danger-triangle-bold-duotone"
                                    width={18}
                                    aria-hidden="true"
                                />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <footer className="create-task-footer">
                        <span className="create-task-draft-note">
                            O rascunho fica salvo se você fechar.
                        </span>
                        <button
                            type="button"
                            className="create-task-secondary"
                            onClick={closeDialog}
                            disabled={submitting}
                        >
                            Fechar
                        </button>
                        <button
                            type="submit"
                            className="create-task-primary"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span className="create-task-spinner" aria-hidden="true" />
                                    Criando…
                                </>
                            ) : (
                                <>
                                    <Icon
                                        icon="solar:add-circle-bold"
                                        width={18}
                                        aria-hidden="true"
                                    />
                                    {parsedItems.length > 0
                                        ? `Criar com ${parsedItems.length} passos`
                                        : 'Criar tarefa'}
                                </>
                            )}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

import { useEffect, useRef, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTaskResources } from '../hooks/useTaskResources';
import TaskResourceForm from './TaskResourceForm';

function formatCreatedAt(createdAt) {
    if (!createdAt) return '';
    const normalized = createdAt.includes('T')
        ? createdAt
        : `${createdAt.replace(' ', 'T')}Z`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });
}

function ResourceItem({
    resource,
    textExpanded,
    pendingDelete,
    deleting,
    deleteError,
    onToggleText,
    onEdit,
    onRequestDelete,
    onCancelDelete,
    onConfirmDelete,
    onOpenLink,
}) {
    const keepResourceButtonRef = useRef(null);
    const textValueRef = useRef(null);
    const [textTruncated, setTextTruncated] = useState(false);
    const isLink = resource.type === 'link';
    const title = resource.label?.trim();
    const resourceName = title || (isLink ? 'link' : 'texto');
    const createdAt = formatCreatedAt(resource.createdAt);

    useEffect(() => {
        if (pendingDelete) keepResourceButtonRef.current?.focus();
    }, [pendingDelete]);

    useEffect(() => {
        if (isLink || textExpanded || !textValueRef.current) return undefined;

        const element = textValueRef.current;
        const measureOverflow = () => {
            setTextTruncated(element.scrollHeight > element.clientHeight + 1);
        };
        measureOverflow();

        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measureOverflow);
        observer.observe(element);
        return () => observer.disconnect();
    }, [isLink, resource.value, textExpanded]);

    return (
        <li className="task-resource-item">
            <div className="task-resource-item-content">
                <div className="task-resource-item-heading">
                    {title && <strong>{title}</strong>}
                    <span className="task-resource-item-meta">
                        {isLink ? 'Link' : 'Texto'}
                        {createdAt && (
                            <time dateTime={resource.createdAt}> · {createdAt}</time>
                        )}
                    </span>
                </div>

                {isLink ? (
                    <a
                        href={resource.value}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(event) => onOpenLink(event, resource.value)}
                        title={`Abrir ${resource.value} no navegador`}
                    >
                        <span>{resource.value}</span>
                    </a>
                ) : (
                    <>
                        <p
                            ref={textValueRef}
                            className={textExpanded ? 'expanded' : ''}
                        >
                            {resource.value}
                        </p>
                        {(textTruncated || textExpanded) && (
                            <button
                                type="button"
                                className="task-resource-more-btn"
                                onClick={() => onToggleText(resource.id)}
                                aria-expanded={textExpanded}
                            >
                                {textExpanded ? 'Ver menos' : 'Ver mais'}
                            </button>
                        )}
                    </>
                )}

                {pendingDelete && (
                    <div
                        className="task-resource-delete-confirmation"
                        role="group"
                        aria-label="Confirmar remoção do recurso"
                    >
                        <span>Remover este recurso?</span>
                        <div>
                            <button
                                ref={keepResourceButtonRef}
                                type="button"
                                onClick={onCancelDelete}
                                disabled={deleting}
                            >
                                Manter
                            </button>
                            <button
                                type="button"
                                className="danger"
                                onClick={() => onConfirmDelete(resource.id)}
                                disabled={deleting}
                            >
                                {deleting ? 'Removendo…' : 'Remover'}
                            </button>
                        </div>
                        {deleteError && <small>{deleteError}</small>}
                    </div>
                )}
            </div>

            {!pendingDelete && (
                <div className="task-resource-item-actions">
                    <button
                        type="button"
                        onClick={() => onEdit(resource)}
                        aria-label={`Editar recurso ${resourceName}`}
                        title="Editar recurso"
                    >
                        Editar
                    </button>
                    <button
                        type="button"
                        className="danger"
                        onClick={() => onRequestDelete(resource.id)}
                        aria-label={`Remover recurso ${resourceName}`}
                        title="Remover recurso"
                    >
                        Remover
                    </button>
                </div>
            )}
        </li>
    );
}

export default function TaskResources({ taskId }) {
    const [expanded, setExpanded] = useState(true);
    const [editor, setEditor] = useState(null);
    const [expandedTextIds, setExpandedTextIds] = useState(() => new Set());
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteError, setDeleteError] = useState('');
    const [openError, setOpenError] = useState('');
    const {
        resources,
        loading,
        loadError,
        reload,
        createResource,
        updateResource,
        removeResource,
    } = useTaskResources(taskId);
    const contentId = `task-resources-content-${taskId}`;

    const openCreateForm = () => {
        setExpanded(true);
        setPendingDeleteId(null);
        setDeleteError('');
        setEditor({ mode: 'create', resource: null });
    };

    const openEditForm = (resource) => {
        setExpanded(true);
        setPendingDeleteId(null);
        setDeleteError('');
        setEditor({ mode: 'edit', resource });
    };

    const saveResource = async (value) => {
        const result = editor.mode === 'edit'
            ? await updateResource(editor.resource.id, value)
            : await createResource(value);
        if (result.ok) setEditor(null);
        return result;
    };

    const confirmDelete = async (resourceId) => {
        setDeletingId(resourceId);
        setDeleteError('');
        const result = await removeResource(resourceId);
        setDeletingId(null);

        if (result.ok) {
            setPendingDeleteId(null);
            return;
        }

        setDeleteError('Não foi possível remover. Tente novamente.');
    };

    const toggleText = (resourceId) => {
        setExpandedTextIds((current) => {
            const next = new Set(current);
            if (next.has(resourceId)) next.delete(resourceId);
            else next.add(resourceId);
            return next;
        });
    };

    const handleOpenLink = async (event, url) => {
        if (!window.__TAURI_INTERNALS__) return;

        event.preventDefault();
        setOpenError('');
        try {
            await openUrl(url);
        } catch (error) {
            console.error('Failed to open task resource link:', error);
            setOpenError('Não foi possível abrir o link no navegador padrão.');
        }
    };

    return (
        <section className="task-resources" aria-labelledby={`task-resources-title-${taskId}`}>
            <header className="task-resources-header">
                <span
                    id={`task-resources-title-${taskId}`}
                    className="task-resources-title"
                >
                    Recursos <strong>({resources.length})</strong>
                </span>
                <div className="task-resources-header-actions">
                    {!editor && (
                        <button
                            type="button"
                            className="task-resources-add-btn"
                            onClick={openCreateForm}
                            disabled={loading}
                            aria-label="Adicionar recurso"
                            title="Adicionar recurso"
                        >
                            <span aria-hidden="true">+</span>
                        </button>
                    )}
                    <button
                        type="button"
                        className="task-resources-toggle"
                        onClick={() => setExpanded((current) => !current)}
                        aria-expanded={expanded}
                        aria-controls={contentId}
                    >
                        {expanded ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
            </header>

            <div id={contentId} className="task-resources-content" hidden={!expanded}>
                {editor && (
                    <TaskResourceForm
                        key={`${editor.mode}-${editor.resource?.id ?? 'new'}`}
                        resource={editor.resource}
                        resources={resources}
                        onSave={saveResource}
                        onCancel={() => setEditor(null)}
                    />
                )}

                {openError && (
                    <p className="task-resources-inline-error" role="alert">
                        {openError}
                    </p>
                )}

                {loading ? (
                    <div className="task-resources-loading" role="status">
                        Carregando recursos…
                    </div>
                ) : loadError ? (
                    <div className="task-resources-load-error" role="alert">
                        <span>{loadError}</span>
                        <button type="button" onClick={reload}>Tentar novamente</button>
                    </div>
                ) : resources.length === 0 ? (
                    <div className="task-resources-empty">
                        <strong>Nenhum recurso adicionado ainda.</strong>
                        <span>Guarde aqui um link ou uma nota útil.</span>
                    </div>
                ) : (
                    <ul className="task-resources-list" aria-live="polite">
                        {resources.map((resource) => (
                            <ResourceItem
                                key={resource.id}
                                resource={resource}
                                textExpanded={expandedTextIds.has(resource.id)}
                                pendingDelete={pendingDeleteId === resource.id}
                                deleting={deletingId === resource.id}
                                deleteError={pendingDeleteId === resource.id ? deleteError : ''}
                                onToggleText={toggleText}
                                onEdit={openEditForm}
                                onRequestDelete={(resourceId) => {
                                    setEditor(null);
                                    setPendingDeleteId(resourceId);
                                    setDeleteError('');
                                }}
                                onCancelDelete={() => {
                                    setPendingDeleteId(null);
                                    setDeleteError('');
                                }}
                                onConfirmDelete={confirmDelete}
                                onOpenLink={handleOpenLink}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

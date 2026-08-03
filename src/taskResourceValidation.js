export const TASK_RESOURCE_TYPES = Object.freeze(['link', 'text']);

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return (
            (url.protocol === 'http:' || url.protocol === 'https:')
            && Boolean(url.hostname)
        );
    } catch {
        return false;
    }
}

export function validateTaskResource(
    draft,
    existingResources = [],
    editingResourceId = null,
) {
    const type = String(draft?.type ?? '');
    const value = String(draft?.value ?? '').trim();
    const normalizedLabel = String(draft?.label ?? '').trim();
    const errors = {};

    if (!TASK_RESOURCE_TYPES.includes(type)) {
        errors.type = 'Escolha um tipo de recurso válido.';
    }

    if (!value) {
        errors.value = type === 'link'
            ? 'Informe a URL do recurso.'
            : 'Escreva o texto que deseja guardar.';
    } else if (type === 'link' && !isHttpUrl(value)) {
        errors.value = 'Use uma URL completa iniciada por http:// ou https://.';
    } else if (
        type === 'link'
        && existingResources.some((resource) => (
            resource.type === 'link'
            && String(resource.value).trim() === value
            && String(resource.id) !== String(editingResourceId)
        ))
    ) {
        errors.value = 'Este link já está nos recursos desta tarefa.';
    }

    if (normalizedLabel.length > 80) {
        errors.label = 'Use no máximo 80 caracteres no título.';
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0,
        value: {
            type,
            value,
            label: normalizedLabel || null,
        },
    };
}

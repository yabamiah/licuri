import { useEffect, useId, useRef, useState } from 'react';
import { validateTaskResource } from '../taskResourceValidation';

const TYPE_OPTIONS = [
    { value: 'link', label: 'Link' },
    { value: 'text', label: 'Texto' },
];

export default function TaskResourceForm({
    resource,
    resources,
    onSave,
    onCancel,
}) {
    const formId = useId();
    const editing = Boolean(resource);
    const [type, setType] = useState(resource?.type ?? 'link');
    const [value, setValue] = useState(resource?.value ?? '');
    const [label, setLabel] = useState(resource?.label ?? '');
    const [errors, setErrors] = useState({});
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const valueInputRef = useRef(null);

    useEffect(() => {
        valueInputRef.current?.focus();
    }, []);

    const currentDraft = { type, value, label };

    const validateField = (field) => {
        const result = validateTaskResource(
            currentDraft,
            resources,
            resource?.id,
        );
        setErrors((current) => ({
            ...current,
            [field]: result.errors[field],
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaveError('');

        const validation = validateTaskResource(
            currentDraft,
            resources,
            resource?.id,
        );
        setErrors(validation.errors);

        if (!validation.valid) {
            valueInputRef.current?.focus();
            return;
        }

        setSaving(true);
        const result = await onSave(validation.value);
        setSaving(false);

        if (result?.ok) return;

        if (result?.reason === 'duplicate-link') {
            setErrors((current) => ({
                ...current,
                value: 'Este link já está nos recursos desta tarefa.',
            }));
            valueInputRef.current?.focus();
            return;
        }

        setSaveError(
            'Não foi possível salvar o recurso. O conteúdo foi mantido para você tentar novamente.',
        );
    };

    const valueErrorId = errors.value ? `${formId}-value-error` : undefined;
    const labelErrorId = errors.label ? `${formId}-label-error` : undefined;

    return (
        <form
            className="task-resource-form"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            aria-busy={saving}
        >
            <div className="task-resource-form-heading">
                <h3>{editing ? 'Editar recurso' : 'Adicionar recurso'}</h3>
            </div>

            <fieldset className="task-resource-type-fieldset" disabled={saving}>
                <legend>Tipo</legend>
                <div className="task-resource-type-options">
                    {TYPE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={type === option.value ? 'selected' : ''}
                            onClick={() => {
                                setType(option.value);
                                setErrors({});
                                setSaveError('');
                            }}
                            aria-pressed={type === option.value}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </fieldset>

            <label className="task-resource-field">
                <span>{type === 'link' ? 'URL' : 'Texto'}</span>
                {type === 'link' ? (
                    <input
                        ref={valueInputRef}
                        value={value}
                        onChange={(event) => {
                            setValue(event.target.value);
                            setErrors((current) => ({ ...current, value: undefined }));
                            setSaveError('');
                        }}
                        onBlur={() => validateField('value')}
                        inputMode="url"
                        placeholder="https://exemplo.com/referencia"
                        aria-invalid={Boolean(errors.value)}
                        aria-describedby={valueErrorId}
                        disabled={saving}
                    />
                ) : (
                    <textarea
                        ref={valueInputRef}
                        value={value}
                        onChange={(event) => {
                            setValue(event.target.value);
                            setErrors((current) => ({ ...current, value: undefined }));
                            setSaveError('');
                        }}
                        onBlur={() => validateField('value')}
                        rows={4}
                        placeholder="Cole uma observação, comando ou trecho útil para esta tarefa."
                        aria-invalid={Boolean(errors.value)}
                        aria-describedby={valueErrorId}
                        disabled={saving}
                    />
                )}
                {errors.value && (
                    <small id={valueErrorId} className="task-resource-field-error">
                        {errors.value}
                    </small>
                )}
            </label>

            <label className="task-resource-field">
                <span>
                    Título curto
                    <em>Opcional</em>
                </span>
                <input
                    value={label}
                    onChange={(event) => {
                        setLabel(event.target.value);
                        setErrors((current) => ({ ...current, label: undefined }));
                        setSaveError('');
                    }}
                    onBlur={() => validateField('label')}
                    maxLength={80}
                    placeholder={type === 'link' ? 'Ex.: Documentação da API' : 'Ex.: Decisão técnica'}
                    aria-invalid={Boolean(errors.label)}
                    aria-describedby={labelErrorId}
                    disabled={saving}
                />
                {errors.label && (
                    <small id={labelErrorId} className="task-resource-field-error">
                        {errors.label}
                    </small>
                )}
            </label>

            {saveError && (
                <p className="task-resource-save-error" role="alert">
                    {saveError}
                </p>
            )}

            <div className="task-resource-form-actions">
                <button
                    type="button"
                    className="task-resource-cancel-btn"
                    onClick={onCancel}
                    disabled={saving}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="task-resource-save-btn"
                    disabled={saving}
                >
                    {saving
                        ? 'Salvando…'
                        : editing ? 'Salvar alterações' : 'Adicionar recurso'}
                </button>
            </div>
        </form>
    );
}

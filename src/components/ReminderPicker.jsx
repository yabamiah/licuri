import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import {
    formatNextReminder,
    formatReminderInterval,
    REMINDER_PRESETS,
    toReminderMinutes,
} from '../reminderInterval';

function intervalToCustomValue(minutes) {
    if (minutes % 1440 === 0) {
        return { amount: minutes / 1440, unit: 'days' };
    }
    if (minutes % 60 === 0) {
        return { amount: minutes / 60, unit: 'hours' };
    }
    return { amount: minutes, unit: 'minutes' };
}

function getErrorMessage(reason) {
    if (reason === 'invalid-interval') {
        return 'Use um intervalo entre 1 minuto e 30 dias.';
    }
    if (reason === 'denied') {
        return 'Notificações bloqueadas. Libere o Licuri nas configurações do sistema e tente novamente.';
    }
    if (reason === 'alerts-disabled') {
        return 'Os banners do Licuri estão desativados. Ative “Permitir notificações” e o estilo de alerta nas configurações do sistema.';
    }
    if (reason === 'no-bundle') {
        return 'No macOS, as notificações nativas exigem o Licuri empacotado. Execute a versão instalada e tente novamente.';
    }
    if (reason === 'permission-required' || reason === 'permission-error') {
        return 'Não foi possível confirmar a permissão de notificações. Abra as configurações do sistema, permita o Licuri e tente novamente.';
    }
    if (reason === 'delivery-error') {
        return 'O sistema recusou a notificação. Confira as permissões do Licuri e tente novamente.';
    }
    if (reason === 'send-error') {
        return 'O sistema não conseguiu mostrar a notificação de teste.';
    }
    return 'Não foi possível salvar o lembrete. A configuração foi preservada.';
}

export default function ReminderPicker({
    task,
    open,
    onToggle,
    onClose,
    onSave,
    onDisable,
    onTest,
}) {
    const currentMinutes = Number(task.reminder_interval_minutes) || 180;
    const initialIsPreset = REMINDER_PRESETS.some(
        (preset) => preset.minutes === currentMinutes,
    );
    const initialCustom = intervalToCustomValue(currentMinutes);
    const [mode, setMode] = useState(initialIsPreset ? 'preset' : 'custom');
    const [presetMinutes, setPresetMinutes] = useState(currentMinutes);
    const [customAmount, setCustomAmount] = useState(initialCustom.amount);
    const [customUnit, setCustomUnit] = useState(initialCustom.unit);
    const [customTouched, setCustomTouched] = useState(false);
    const [busyAction, setBusyAction] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const minutes = Number(task.reminder_interval_minutes) || 180;
        const custom = intervalToCustomValue(minutes);
        const isPreset = REMINDER_PRESETS.some(
            (preset) => preset.minutes === minutes,
        );
        setMode(isPreset ? 'preset' : 'custom');
        setPresetMinutes(minutes);
        setCustomAmount(custom.amount);
        setCustomUnit(custom.unit);
        setCustomTouched(false);
        setError('');
        setMessage('');
    }, [task.id, task.reminder_interval_minutes, open]);

    useEffect(() => {
        if (!open) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose, open]);

    const customMinutes = useMemo(
        () => toReminderMinutes(customAmount, customUnit),
        [customAmount, customUnit],
    );
    const selectedMinutes = mode === 'custom'
        ? customMinutes
        : presetMinutes;
    const active = Boolean(task.reminder_enabled);
    const nextReminder = formatNextReminder(task.reminder_next_at);
    const disabled = task.status === 'done';

    const choosePreset = (minutes) => {
        setMode('preset');
        setPresetMinutes(minutes);
        setError('');
        setMessage('');
    };

    const handleSave = async () => {
        setCustomTouched(true);
        setError('');
        setMessage('');
        if (!selectedMinutes) return;

        setBusyAction('save');
        const result = await onSave(task.id, selectedMinutes);
        setBusyAction(null);
        if (!result?.ok) {
            setError(getErrorMessage(result?.reason));
            return;
        }
        onClose();
    };

    const handleDisable = async () => {
        setBusyAction('disable');
        setError('');
        setMessage('');
        const result = await onDisable(task.id);
        setBusyAction(null);
        if (!result?.ok) {
            setError(getErrorMessage(result?.reason));
            return;
        }
        onClose();
    };

    const handleTest = async () => {
        setBusyAction('test');
        setError('');
        setMessage('');
        const result = await onTest(task.name);
        setBusyAction(null);
        if (!result?.ok) {
            setError(getErrorMessage(result?.reason));
            return;
        }
        setMessage(
            result.warning === 'development-fallback'
                ? 'Teste aceito pelo macOS em modo de desenvolvimento.'
                : 'Notificação aceita pelo sistema.',
        );
    };

    return (
        <div className="reminder-control">
            <button
                type="button"
                className={`task-reminder-btn ${active ? 'active' : ''}`}
                onClick={(event) => {
                    event.stopPropagation();
                    onToggle();
                }}
                aria-label={
                    active
                        ? `Alterar lembrete, ativo a cada ${formatReminderInterval(currentMinutes)}`
                        : 'Adicionar lembrete recorrente'
                }
                aria-expanded={open}
                aria-controls={`task-reminder-${task.id}`}
                disabled={disabled}
                title={
                    disabled
                        ? 'Reabra a tarefa para configurar um lembrete'
                        : undefined
                }
            >
                <Icon
                    icon={active ? 'solar:bell-bold' : 'solar:bell-linear'}
                    width={16}
                    aria-hidden="true"
                />
                <span>
                    {active
                        ? formatReminderInterval(currentMinutes)
                        : 'Lembrete'}
                </span>
            </button>

            {open && !disabled && (
                <section
                    id={`task-reminder-${task.id}`}
                    className="reminder-popup"
                    role="dialog"
                    aria-label="Configurar lembrete recorrente"
                    onClick={(event) => event.stopPropagation()}
                >
                    <header className="reminder-popup-header">
                        <span className="reminder-popup-icon" aria-hidden="true">
                            <Icon icon="solar:bell-bing-bold-duotone" width={21} />
                        </span>
                        <span>
                            <strong>Lembrete recorrente</strong>
                            <small>
                                {active && nextReminder
                                    ? `Próximo: ${nextReminder}`
                                    : 'Escolha quando o Licuri deve avisar'}
                            </small>
                        </span>
                    </header>

                    <div className="reminder-popup-body">
                        <fieldset className="reminder-presets">
                            <legend>Notificar a cada</legend>
                            <div>
                                {REMINDER_PRESETS.map((preset) => (
                                    <button
                                        type="button"
                                        key={preset.minutes}
                                        className={
                                            mode === 'preset'
                                            && presetMinutes === preset.minutes
                                                ? 'selected'
                                                : ''
                                        }
                                        aria-pressed={
                                            mode === 'preset'
                                            && presetMinutes === preset.minutes
                                        }
                                        onClick={() => choosePreset(preset.minutes)}
                                        disabled={Boolean(busyAction)}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        <fieldset className="reminder-custom">
                            <legend>Ou use um intervalo personalizado</legend>
                            <div>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={customAmount}
                                    onChange={(event) => {
                                        setMode('custom');
                                        setCustomAmount(event.target.value);
                                        setError('');
                                        setMessage('');
                                    }}
                                    onBlur={() => setCustomTouched(true)}
                                    aria-label="Quantidade do intervalo"
                                    aria-invalid={
                                        mode === 'custom'
                                        && customTouched
                                        && !customMinutes
                                    }
                                    disabled={Boolean(busyAction)}
                                />
                                <select
                                    value={customUnit}
                                    onChange={(event) => {
                                        setMode('custom');
                                        setCustomUnit(event.target.value);
                                        setError('');
                                        setMessage('');
                                    }}
                                    aria-label="Unidade do intervalo"
                                    disabled={Boolean(busyAction)}
                                >
                                    <option value="minutes">minutos</option>
                                    <option value="hours">horas</option>
                                    <option value="days">dias</option>
                                </select>
                            </div>
                            {mode === 'custom' && customTouched && !customMinutes && (
                                <small className="reminder-field-error">
                                    Use um número inteiro entre 1 minuto e 30 dias.
                                </small>
                            )}
                        </fieldset>

                        <p className="reminder-runtime-note">
                            <Icon icon="solar:info-circle-linear" width={15} />
                            Funciona com o Licuri aberto ou na barra de tarefas.
                        </p>

                        {error && (
                            <p className="reminder-feedback error" role="alert">
                                {error}
                            </p>
                        )}
                        {message && (
                            <p className="reminder-feedback success" role="status">
                                {message}
                            </p>
                        )}
                    </div>

                    <footer className="reminder-popup-footer">
                        {active && (
                            <button
                                type="button"
                                className="reminder-disable"
                                onClick={handleDisable}
                                disabled={Boolean(busyAction)}
                            >
                                {busyAction === 'disable'
                                    ? 'Desativando…'
                                    : 'Desativar'}
                            </button>
                        )}
                        <button
                            type="button"
                            className="reminder-test"
                            onClick={handleTest}
                            disabled={Boolean(busyAction)}
                        >
                            {busyAction === 'test' ? 'Enviando…' : 'Testar agora'}
                        </button>
                        <button
                            type="button"
                            className="reminder-save"
                            onClick={handleSave}
                            disabled={Boolean(busyAction) || !selectedMinutes}
                        >
                            {busyAction === 'save'
                                ? 'Salvando…'
                                : active
                                    ? 'Atualizar'
                                    : 'Ativar'}
                        </button>
                    </footer>
                </section>
            )}
        </div>
    );
}

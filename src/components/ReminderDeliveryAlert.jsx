import { Icon } from '@iconify/react';

function failureMessage(reason) {
    if (reason === 'denied' || reason === 'alerts-disabled') {
        return 'Ative os banners do Licuri nas configurações de notificações do sistema.';
    }
    if (reason === 'no-bundle') {
        return 'No macOS, use a versão instalada do Licuri para receber notificações.';
    }
    if (reason === 'permission-required' || reason === 'permission-error') {
        return 'Abra as configurações do sistema, permita notificações para o Licuri e teste novamente.';
    }
    return 'O sistema recusou a entrega. Confira as permissões de notificação e teste novamente.';
}

export default function ReminderDeliveryAlert({ failure, onDismiss }) {
    if (!failure) return null;

    return (
        <div className="reminder-delivery-alert" role="alert">
            <Icon icon="solar:bell-off-linear" width={20} aria-hidden="true" />
            <span>
                <strong>Lembrete não exibido</strong>
                <small>
                    {failure.taskName ? `${failure.taskName}: ` : ''}
                    {failureMessage(failure.reason)}
                </small>
            </span>
            <button
                type="button"
                onClick={onDismiss}
                aria-label="Fechar aviso de notificação"
            >
                <Icon icon="solar:close-circle-linear" width={19} aria-hidden="true" />
            </button>
        </div>
    );
}

export const REMINDER_PRESETS = [
    { minutes: 30, label: '30 min' },
    { minutes: 60, label: '1 h' },
    { minutes: 180, label: '3 h' },
    { minutes: 360, label: '6 h' },
    { minutes: 720, label: '12 h' },
    { minutes: 1440, label: '24 h' },
];

export const MAX_REMINDER_MINUTES = 30 * 24 * 60;

const UNIT_MULTIPLIERS = {
    minutes: 1,
    hours: 60,
    days: 24 * 60,
};

export function toReminderMinutes(amount, unit) {
    const numericAmount = Number(amount);
    const multiplier = UNIT_MULTIPLIERS[unit];

    if (
        !Number.isInteger(numericAmount)
        || numericAmount < 1
        || !multiplier
    ) {
        return null;
    }

    const minutes = numericAmount * multiplier;
    if (minutes > MAX_REMINDER_MINUTES) return null;
    return minutes;
}

export function formatReminderInterval(minutes) {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) return 'Lembrete';

    if (value % 1440 === 0) {
        const days = value / 1440;
        return `${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
    if (value % 60 === 0) return `${value / 60} h`;
    return `${value} min`;
}

export function formatNextReminder(nextAt) {
    if (!nextAt) return null;
    const date = new Date(nextAt);
    if (Number.isNaN(date.getTime())) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );
    const dayDifference = Math.round((target - today) / 86_400_000);
    const time = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    if (dayDifference === 0) return `Hoje às ${time}`;
    if (dayDifference === 1) return `Amanhã às ${time}`;
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

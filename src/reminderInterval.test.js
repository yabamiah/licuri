import test from 'node:test';
import assert from 'node:assert/strict';
import {
    formatReminderInterval,
    MAX_REMINDER_MINUTES,
    toReminderMinutes,
} from './reminderInterval.js';

test('converte valores personalizados para minutos', () => {
    assert.equal(toReminderMinutes(45, 'minutes'), 45);
    assert.equal(toReminderMinutes(3, 'hours'), 180);
    assert.equal(toReminderMinutes(2, 'days'), 2880);
});

test('recusa intervalos inválidos ou maiores que trinta dias', () => {
    assert.equal(toReminderMinutes(0, 'hours'), null);
    assert.equal(toReminderMinutes(1.5, 'hours'), null);
    assert.equal(toReminderMinutes(31, 'days'), null);
    assert.equal(toReminderMinutes(MAX_REMINDER_MINUTES, 'minutes'), MAX_REMINDER_MINUTES);
});

test('formata intervalos de maneira compacta', () => {
    assert.equal(formatReminderInterval(30), '30 min');
    assert.equal(formatReminderInterval(180), '3 h');
    assert.equal(formatReminderInterval(1440), '1 dia');
    assert.equal(formatReminderInterval(4320), '3 dias');
});

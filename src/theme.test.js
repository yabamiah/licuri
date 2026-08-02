import assert from 'node:assert/strict';
import test from 'node:test';
import {
    THEME_CHANGE_EVENT,
    THEME_STORAGE_KEY,
    applyTheme,
    getInitialTheme,
    normalizeTheme,
    setPreferredTheme,
} from './theme.js';

function installThemeEnvironment({ storedTheme = null, systemDark = false } = {}) {
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const previousCustomEvent = globalThis.CustomEvent;
    const storage = new Map();
    const emittedEvents = [];
    let darkClassApplied = false;

    if (storedTheme !== null) storage.set(THEME_STORAGE_KEY, storedTheme);

    const root = {
        classList: {
            toggle(className, enabled) {
                if (className === 'dark') darkClassApplied = enabled;
            },
        },
        dataset: {},
        style: {},
    };

    globalThis.window = {
        localStorage: {
            getItem(key) {
                return storage.get(key) ?? null;
            },
            setItem(key, value) {
                storage.set(key, value);
            },
        },
        matchMedia() {
            return { matches: systemDark };
        },
        dispatchEvent(event) {
            emittedEvents.push(event);
        },
    };
    globalThis.document = { documentElement: root };
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, options) {
            this.type = type;
            this.detail = options.detail;
        }
    };

    return {
        darkClassApplied: () => darkClassApplied,
        emittedEvents,
        restore() {
            globalThis.window = previousWindow;
            globalThis.document = previousDocument;
            globalThis.CustomEvent = previousCustomEvent;
        },
        root,
        storage,
    };
}

test('normaliza somente os temas suportados', () => {
    assert.equal(normalizeTheme('light'), 'light');
    assert.equal(normalizeTheme('dark'), 'dark');
    assert.equal(normalizeTheme('auto'), null);
});

test('usa o tema do sistema somente quando não há preferência salva', () => {
    const systemEnvironment = installThemeEnvironment({ systemDark: true });
    try {
        assert.equal(getInitialTheme(), 'dark');
    } finally {
        systemEnvironment.restore();
    }

    const storedEnvironment = installThemeEnvironment({
        storedTheme: 'light',
        systemDark: true,
    });
    try {
        assert.equal(getInitialTheme(), 'light');
    } finally {
        storedEnvironment.restore();
    }
});

test('salva, aplica e anuncia a preferência escolhida', () => {
    const environment = installThemeEnvironment();

    try {
        assert.equal(setPreferredTheme('dark'), 'dark');
        assert.equal(environment.storage.get(THEME_STORAGE_KEY), 'dark');
        assert.equal(environment.darkClassApplied(), true);
        assert.equal(environment.root.dataset.theme, 'dark');
        assert.equal(environment.root.style.colorScheme, 'dark');
        assert.equal(environment.emittedEvents.at(-1).type, THEME_CHANGE_EVENT);
        assert.deepEqual(environment.emittedEvents.at(-1).detail, { theme: 'dark' });

        assert.equal(applyTheme('light'), 'light');
        assert.equal(environment.darkClassApplied(), false);
    } finally {
        environment.restore();
    }
});

export const THEME_STORAGE_KEY = 'licuri.theme';
export const THEME_CHANGE_EVENT = 'licuri:theme-change';

const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';
const cleanupSymbol = Symbol.for('licuri.theme.cleanup');

export function normalizeTheme(value) {
    return value === DARK_THEME || value === LIGHT_THEME ? value : null;
}

export function getStoredTheme() {
    try {
        return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
        return null;
    }
}

export function getSystemTheme(mediaQuery = window.matchMedia(DARK_MODE_QUERY)) {
    return mediaQuery.matches ? DARK_THEME : LIGHT_THEME;
}

export function getInitialTheme() {
    return getStoredTheme() || getSystemTheme();
}

export function getAppliedTheme() {
    return normalizeTheme(document.documentElement.dataset.theme)
        || getInitialTheme();
}

export function applyTheme(theme) {
    const nextTheme = normalizeTheme(theme) || LIGHT_THEME;
    const root = document.documentElement;

    root.classList.toggle(DARK_THEME, nextTheme === DARK_THEME);
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { theme: nextTheme },
    }));

    return nextTheme;
}

export function setPreferredTheme(theme) {
    const nextTheme = normalizeTheme(theme) || LIGHT_THEME;

    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
        // The theme still applies for the current session when storage is unavailable.
    }

    return applyTheme(nextTheme);
}

export function onThemeChange(handler) {
    const listener = (event) => handler(event.detail.theme);
    window.addEventListener(THEME_CHANGE_EVENT, listener);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, listener);
}

export function initializeTheme() {
    window[cleanupSymbol]?.();

    const mediaQuery = window.matchMedia(DARK_MODE_QUERY);
    const followSystemTheme = () => {
        if (!getStoredTheme()) applyTheme(getSystemTheme(mediaQuery));
    };
    const followStoredTheme = (event) => {
        if (event.key === THEME_STORAGE_KEY) applyTheme(getInitialTheme());
    };

    applyTheme(getInitialTheme());
    mediaQuery.addEventListener('change', followSystemTheme);
    window.addEventListener('storage', followStoredTheme);

    window[cleanupSymbol] = () => {
        mediaQuery.removeEventListener('change', followSystemTheme);
        window.removeEventListener('storage', followStoredTheme);
    };
}

const ICONS = {
    checklist: (
        <>
            <rect x="4" y="3" width="16" height="18" rx="3" />
            <path d="m7.5 8 1.3 1.3L11 7" />
            <path d="M13 8h4" />
            <path d="m7.5 13 1.3 1.3L11 12" />
            <path d="M13 13h4" />
            <path d="m7.5 18 1.3 1.3L11 17" />
            <path d="M13 18h4" />
        </>
    ),
    window: (
        <>
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M3 9h18" />
            <path d="M8 9v11" />
        </>
    ),
    warning: (
        <>
            <path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
            <path d="M12 8v5" />
            <path d="M12 17h.01" />
        </>
    ),
    star: (
        <path d="m12 2.8 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2-4.5-4.4 6.3-.9L12 2.8Z" />
    ),
    circle: <circle cx="12" cy="12" r="8.5" />,
    checked: (
        <>
            <circle className="quick-icon-fill" cx="12" cy="12" r="10" />
            <path className="quick-icon-inverse" d="m7.5 12.2 3 3 6-6.3" />
        </>
    ),
    chevron: <path d="m6.5 9.5 5.5 5 5.5-5" />,
};

export default function QuickIcon({
    name,
    size = 20,
    className,
    filled = false,
}) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
        >
            {ICONS[name]}
        </svg>
    );
}

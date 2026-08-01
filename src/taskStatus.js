export function computeTaskStatus(items) {
    if (!items || items.length === 0) return 'todo';

    const checkedCount = items.filter((item) => Boolean(item.checked)).length;
    if (checkedCount === 0) return 'todo';
    if (checkedCount === items.length) return 'done';
    return 'doing';
}

export default function StatusBadge({ status }) {
    return (
        <span
            className={`status-badge ${status}`}
            title={
                status === 'todo'
                    ? 'A fazer'
                    : status === 'doing'
                        ? 'Fazendo'
                        : 'Completa'
            }
        />
    );
}

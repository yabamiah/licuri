
export default function ProgressbarTask({ total, completed }) {
    if (total === 0) return null;

    const percentage = Math.round((completed / total) * 100);

    return (
        <div className="progressbar-container">
            <div className="progressbar-label">
                <span>Progresso</span>
                <span>{percentage}%</span>
            </div>
            <div className="progressbar-track">
                <div
                    className="progressbar-fill"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}
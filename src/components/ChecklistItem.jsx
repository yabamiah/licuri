import { useState } from 'react';
import { Icon } from '@iconify/react';

export default function ChecklistItem({ item, onToggle, onDelete }) {
    const [animating, setAnimating] = useState(false);

    const handleToggle = () => {
        setAnimating(true);
        onToggle();
        setTimeout(() => setAnimating(false), 200);
    };

    return (
        <div className={`checklist-item ${item.checked ? 'checked' : ''}`}>
            <button
                className={`check-btn ${animating ? 'check-animate' : ''}`}
                onClick={handleToggle}
                aria-label={item.checked ? 'Desmarcar item' : 'Marcar item'}
            >
                <Icon
                    icon={
                        item.checked
                            ? 'solar:check-circle-bold'
                            : 'solar:circle-linear'
                    }
                    width={22}
                />
            </button>

            <span className="item-text">{item.text}</span>

            <button
                className="item-delete-btn"
                onClick={onDelete}
                aria-label="Excluir item"
            >
                <Icon icon="solar:trash-bin-minimalistic-linear" width={15} />
            </button>
        </div>
    );
}

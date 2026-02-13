
import { useState } from 'react';

export default function MiniCalendar({ selectedDate, onSelect, onClose }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        // Day 0 is the last day of previous month, so day order in JS is 0-indexed? 
        // new Date(year, month + 1, 0) is last day of current month.
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const generateCalendarDays = () => {
        const { days, firstDay } = getDaysInMonth(currentMonth);
        const calendarDays = [];

        // Previous month days
        const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
        for (let i = 0; i < firstDay; i++) {
            calendarDays.unshift({
                day: prevMonthDays - i,
                isCurrentMonth: false,
                date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthDays - i)
            });
        }

        // Current month days
        for (let i = 1; i <= days; i++) {
            calendarDays.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i)
            });
        }

        // Next month days to fill grid (42 cells total for 6 rows)
        const remainingCells = 42 - calendarDays.length;
        for (let i = 1; i <= remainingCells; i++) {
            calendarDays.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i)
            });
        }
        return calendarDays;
    };

    const handlePrevMonth = (e) => {
        e.stopPropagation();
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = (e) => {
        e.stopPropagation();
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const handleSelect = (date) => {
        onSelect(date);
        if (onClose) onClose();
    };

    return (
        <div className="calendar-popup" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-header">
                <button className="nav-btn" onClick={handlePrevMonth} title="Mês anterior">‹</button>
                <div className="calendar-title">
                    {currentMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                </div>
                <button className="nav-btn" onClick={handleNextMonth} title="Próximo mês">›</button>
            </div>

            <div className="weekday-labels">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                    <div key={day} className="weekday-label">{day}</div>
                ))}
            </div>

            <div className="calendar-grid">
                {generateCalendarDays().map((item, index) => (
                    <button
                        key={index}
                        className={`calendar-day ${item.isCurrentMonth ? 'current-month' : ''} ${isSameDay(item.date, new Date()) ? 'today' : ''} ${isSameDay(item.date, selectedDate) ? 'selected' : ''}`}
                        onClick={() => handleSelect(item.date)}
                        title={item.date.toLocaleDateString("pt-BR")}
                    >
                        {item.day}
                    </button>
                ))}
            </div>
            <div className="calendar-footer">
                <button
                    className="quick-action"
                    onClick={() => handleSelect(new Date())}
                >
                    Hoje
                </button>
            </div>

        </div>
    );
}
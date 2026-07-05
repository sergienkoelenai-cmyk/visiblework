import React from 'react';
import './TaskCard.css';

export default function TaskCard({ task, onComplete, statusLabel }) {
  const status = statusLabel || 'upcoming';

  const classes = [
    'task-card',
    `task-card--${status}`,
  ].join(' ');

  return (
    <div className={classes} onClick={() => onComplete?.(task)} role="button" tabIndex={0}>
      <div className="task-card__left">
        <span className="task-card__emoji">{task.categoryEmoji || '📋'}</span>

        <div className="task-card__details">
          <span className="task-card__title">{task.title}</span>
          <div className="task-card__meta">
            {task.type === 'recurring' && (
              <span className="task-card__recurring" title="Recurring task">↻ Recurring</span>
            )}
            {task.type === 'always-available' && (
              <span className="task-card__always" title="Always available" style={{ color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 600 }}>∞ Always available</span>
            )}
            {task.type === 'ad-hoc' && (
              <span className="task-card__onetime">One-time</span>
            )}
            {task.category && (
              <span className="task-card__category">{task.category}</span>
            )}
          </div>
        </div>
      </div>

      <div className="task-card__right">
        <span className="task-card__price">€{typeof task.price === 'number' ? task.price.toFixed(2) : '0.00'}</span>
        <span className={`task-card__status task-card__status--${status}`}>
          {status === 'overdue' && '⏰ Overdue'}
          {status === 'due-today' && '📅 Due today'}
          {status === 'upcoming' && '🗓️ Upcoming'}
        </span>
      </div>
    </div>
  );
}

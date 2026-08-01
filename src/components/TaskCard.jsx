import React from 'react';
import { rrulestr } from 'rrule';
import { getTaskBaseCost } from '../data/pricing';
import { getDoerName } from '../data/scheduler';
import './TaskCard.css';

function getRecurrenceLabel(task) {
  if (task.type === 'ad-hoc') return 'One-time task';
  if (task.type === 'always-available') return 'Always available';
  const rec = task.recurrence;
  if (!rec) return 'Recurring task';

  const rruleString = typeof rec === 'string' ? rec : (rec.rrule || null);
  if (rruleString) {
    try {
      const rule = rrulestr(rruleString);
      return rule.toText();
    } catch {
      return 'Recurring task';
    }
  }
  
  if (rec.mode === 'interval_from_completion') {
    const val = rec.intervalValue || rec.intervalDays || 1;
    const unit = rec.intervalUnit || 'days';
    return `${val} ${unit} after completion`;
  }
  if (rec.mode === 'fixed_interval') {
    return `Every ${rec.fixedIntervalValue} ${rec.fixedIntervalUnit}`;
  }
  return 'Recurring task';
}

function getLastCompletedText(task, users = []) {
  if (!task.lastCompletedAt) {
    return 'Never completed yet';
  }
  try {
    const date = task.lastCompletedAt.toDate 
      ? task.lastCompletedAt.toDate() 
      : new Date(task.lastCompletedAt.seconds ? task.lastCompletedAt.seconds * 1000 : task.lastCompletedAt);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const complDate = new Date(date);
    complDate.setHours(0, 0, 0, 0);
    
    const diffMs = today.getTime() - complDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const doer = getDoerName(task, users);
    const bySuffix = doer ? ` by ${doer}` : '';
    
    if (diffDays <= 0) return `Last completed: Today${bySuffix}`;
    if (diffDays === 1) return `Last completed: Yesterday${bySuffix}`;
    return `Last completed: ${diffDays} days ago${bySuffix}`;
  } catch {
    return '';
  }
}

export default function TaskCard({ task, users = [], baseRate = 0.10, complexityMultipliers = null, onComplete, statusLabel }) {
  const status = statusLabel || 'upcoming';

  const classes = [
    'task-card',
    `task-card--${status}`,
  ].join(' ');

  return (
    <div className={classes} onClick={() => onComplete?.(task)} role="button" tabIndex={0}>
      <div className="task-card__left">
        <span className="task-card__emoji">{task.icon || task.categoryEmoji || '📋'}</span>
        
        <div className="task-card__details">
          <span className="task-card__title">
            {task.isFavorite && <span style={{ marginRight: '4px', fontSize: '14px' }}>⭐</span>}
            {task.title}
          </span>
          <div className="task-card__meta">
            <span className="task-card__recurrence-text">{getRecurrenceLabel(task)}</span>
            {task.lastCompletedAt && (
              <span className="task-card__last-completed">{getLastCompletedText(task, users)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="task-card__right">
        <span className="task-card__price">€{getTaskBaseCost(task, baseRate, complexityMultipliers).toFixed(2)}</span>
        {status !== 'upcoming' && (
          <span className={`task-card__status task-card__status--${status}`}>
            {(() => {
              if (status === 'overdue') return '⏰ Overdue';
              if (status === 'due-today' || status === 'due_today') return '📅 Due today';
              return '';
            })()}
          </span>
        )}
      </div>
    </div>
  );
}

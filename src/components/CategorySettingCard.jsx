import React from 'react';
import IconBadge, { CategoryIcon } from './IconBadge';
import { getTaskBaseCost } from '../data/pricing';
import { getTaskOwnerName } from '../data/scheduler';
import { rrulestr } from 'rrule';

function getRecurrenceLabel(task) {
  if (task.type === 'ad-hoc') return 'One-time';
  if (task.type === 'always-available') return 'Always available';
  const rec = task.recurrence;
  if (!rec) return 'Recurring';

  const rruleString = typeof rec === 'string' ? rec : (rec.rrule || null);

  if (rruleString) {
    try {
      const rule = rrulestr(rruleString);
      return rule.toText();
    } catch {
      return 'Recurring';
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
  if (rec.mode === 'custom_schedule') {
    return 'Custom schedule';
  }
  return 'Recurring';
}

export default function CategorySettingCard({
  category,
  tasks = [],
  users = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  isExpanded = false,
  onToggleExpand,
  onEditTask,
  onDeleteTask,
  onAddTaskInCategory,
}) {
  const adHoc = tasks.filter((t) => t.type !== 'recurring' && t.type !== 'always-available');
  const recurring = tasks.filter((t) => t.type === 'recurring');
  const alwaysAvailable = tasks.filter((t) => t.type === 'always-available');

  const hasAdHoc = adHoc.length > 0;
  const hasRecurring = recurring.length > 0;
  const hasAlwaysAvailable = alwaysAvailable.length > 0;
  const hasAnyTasks = hasAdHoc || hasRecurring || hasAlwaysAvailable;

  const renderTaskRow = (task) => {
    const emoji = task.icon || category.emoji || '📋';
    const cost = getTaskBaseCost(task, baseRate, complexityMultipliers);

    return (
      <div
        key={task.id}
        className="csc-task-row"
        onClick={() => onEditTask?.(task)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEditTask?.(task);
          }
        }}
      >
        <div className="csc-task-left">
          <IconBadge
            categoryId={!task.icon ? task.category : undefined}
            emoji={emoji}
            emojiOnly={!!task.icon}
            size={32}
            iconSize={16}
          />
          <div className="csc-task-info">
            <div className="csc-task-title">
              {(Array.isArray(task.favoritedBy) ? task.favoritedBy.length > 0 : task.isFavorite) && (
                <span className="csc-task-star">⭐</span>
              )}
              {task.title}
              {task.scope === 'personal' && (
                <span style={{ marginLeft: '6px', fontSize: '10px', background: '#F3E8FF', color: '#7E22CE', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                  👤 {getTaskOwnerName(task, users)}
                </span>
              )}
            </div>
            <span className="csc-task-recurrence">{getRecurrenceLabel(task)}</span>
          </div>
        </div>

        <div className="csc-task-right">
          <span className="csc-reward-pill">€{cost.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`csc-card ${isExpanded ? 'csc-card--expanded' : ''}`}>
      {/* Accordion Header Bar */}
      <div
        className="csc-header"
        onClick={() => onToggleExpand?.(category.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand?.(category.id);
          }
        }}
      >
        <div className="csc-header-left">
          <CategoryIcon categoryId={category.id} emoji={category.emoji} size={22} />
          <span className="csc-category-name">{category.label}</span>
        </div>

        <div className="csc-header-right">
          <span className="csc-task-count">{tasks.length}</span>
          <span className={`csc-chevron ${isExpanded ? 'csc-chevron--open' : ''}`}>
            {isExpanded ? '▾' : '▸'}
          </span>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {isExpanded && (
        <div className="csc-body">
          {hasAlwaysAvailable && (
            <div className="csc-group">
              <span className="csc-group-title">Always Available</span>
              <div className="csc-task-list">{alwaysAvailable.map(renderTaskRow)}</div>
            </div>
          )}

          {hasRecurring && (
            <div className="csc-group">
              <span className="csc-group-title">Recurring</span>
              <div className="csc-task-list">{recurring.map(renderTaskRow)}</div>
            </div>
          )}

          {hasAdHoc && (
            <div className="csc-group">
              <span className="csc-group-title">One-time</span>
              <div className="csc-task-list">{adHoc.map(renderTaskRow)}</div>
            </div>
          )}

          {!hasAnyTasks && (
            <p className="csc-empty">No tasks in this category.</p>
          )}

          {/* Single Coral Inline Add Task Button */}
          <button
            type="button"
            className="csc-inline-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddTaskInCategory?.(category.id);
            }}
          >
            + Add task to {category.label}
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import IconBadge from './IconBadge';
import { toJsDate } from '../data/scheduler';
import './ArchivedTasksSection.css';

/**
 * Filter tasks for the Archive section:
 * Includes ONLY:
 * 1. One-time tasks (without recurring schedule) that have been completed or deactivated.
 * 2. Recurring tasks that have reached their END date or occurrence limit (isActive === false and no nextDueDate).
 * Excludes active recurring tasks (even if completed previously or currently overdue).
 * Applies 60-day auto-cleanup window.
 */
function getArchivedTasks(tasks = [], currentDate = new Date()) {
  const sixtyDaysAgo = new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000);

  return tasks.filter((task) => {
    if (!task) return false;

    // Never archive always-available tasks
    if (task.type === 'always-available') return false;

    // Determine if task is recurring vs one-time
    const isRecurring = task.type === 'recurring' || (!task.is_one_off && !!task.recurrence);
    const isOneOff = !isRecurring && (task.is_one_off === true || task.type === 'ad-hoc' || !task.recurrence);

    let isArchivedCandidate = false;

    if (isOneOff) {
      // One-time task: archived if completed or deactivated/inactive
      const isCompleted = task.is_completed === true || task.isActive === false || !!task.lastCompletedAt;
      isArchivedCandidate = isCompleted;
    } else if (isRecurring) {
      // Recurring task: archived ONLY if it has reached its end date / occurrence limit and is inactive
      const isExhausted = task.isActive === false && !task.nextDueDate;

      // Or if its recurrence end date (UNTIL) is in the past and task is no longer active
      let hasPastEndDate = false;
      if (task.recurrence) {
        const rruleStr = typeof task.recurrence === 'string' ? task.recurrence : (task.recurrence.rrule || null);
        if (rruleStr && rruleStr.includes('UNTIL=')) {
          const match = rruleStr.match(/UNTIL=(\d{8}T\d{6}Z?|\d{8})/);
          if (match) {
            const untilStr = match[1];
            const year = parseInt(untilStr.slice(0, 4), 10);
            const month = parseInt(untilStr.slice(4, 6), 10) - 1;
            const day = parseInt(untilStr.slice(6, 8), 10);
            const untilDate = new Date(year, month, day, 23, 59, 59);
            if (untilDate < currentDate) {
              hasPastEndDate = true;
            }
          }
        }
      }

      isArchivedCandidate = isExhausted || (task.isActive === false && hasPastEndDate);
    }

    if (!isArchivedCandidate) return false;

    // 60-day auto-cleanup window
    const eventDate =
      toJsDate(task.lastCompletedAt) ||
      toJsDate(task.lastSkippedAt) ||
      toJsDate(task.nextDueDate) ||
      toJsDate(task.created_at);

    if (eventDate) {
      return eventDate >= sixtyDaysAgo && eventDate <= currentDate;
    }
    return true;
  });
}

export default function ArchivedTasksSection({
  tasks = [],
  categories = [],
  _baseRate = 0.10,
  _complexityMultipliers = null,
  searchQuery = '',
  onEditTask,
  onDeleteTask,
}) {
  // Collapsed by default
  const [isExpanded, setIsExpanded] = useState(false);

  const cleanQuery = searchQuery.trim().toLowerCase();

  const archivedTasks = useMemo(() => {
    const list = getArchivedTasks(tasks);
    if (!cleanQuery) return list;

    const categoryMap = {};
    categories.forEach((c) => {
      categoryMap[c.id] = c.label;
    });

    return list.filter((task) => {
      const titleMatch = (task.title || '').toLowerCase().includes(cleanQuery);
      const catLabel = categoryMap[task.category || 'other'] || '';
      const catMatch = catLabel.toLowerCase().includes(cleanQuery);
      const descMatch = (task.description || task.notes || '').toLowerCase().includes(cleanQuery);
      return titleMatch || catMatch || descMatch;
    });
  }, [tasks, categories, cleanQuery]);

  if (archivedTasks.length === 0) {
    return null;
  }

  const effectiveExpanded = cleanQuery ? true : isExpanded;

  const formatStatusTag = (task) => {
    if (task.is_one_off || task.type === 'ad-hoc') {
      return { label: 'One-off', type: 'one-off' };
    }
    const due = toJsDate(task.nextDueDate) || toJsDate(task.lastCompletedAt);
    if (due) {
      const day = due.getDate().toString().padStart(2, '0');
      const month = (due.getMonth() + 1).toString().padStart(2, '0');
      return { label: `Expired ${day}/${month}`, type: 'expired' };
    }
    return { label: 'Expired', type: 'expired' };
  };

  return (
    <section className="archived-section">
      <div
        className="archived-section__header"
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
      >
        <h2 className="archived-section__title">
          <span className={`archived-section__chevron ${effectiveExpanded ? 'archived-section__chevron--open' : ''}`}>
            ▶
          </span>
          📦 Completed & Expired <span className="archived-section__subtag">(Past 60 Days)</span>
        </h2>
        <span className="archived-section__count-badge">{archivedTasks.length}</span>
      </div>

      {effectiveExpanded && (
        <div className="archived-section__card">
          <div className="archived-section__list">
            {archivedTasks.map((task) => {
              const cat = categories.find((c) => c.id === task.category);
              const emoji = task.icon || (cat ? cat.emoji : '📋');
              const statusTag = formatStatusTag(task);

              return (
                <div key={task.id} className="archived-item">
                  <div className="archived-item__left">
                    <IconBadge
                      categoryId={!task.icon ? task.category : undefined}
                      emoji={emoji}
                      emojiOnly={!!task.icon}
                      size={36}
                      iconSize={18}
                    />
                    <div className="archived-item__info">
                      <span className="archived-item__title">{task.title}</span>
                      <div className="archived-item__meta">
                        <span className={`archived-tag archived-tag--${statusTag.type}`}>
                          {statusTag.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="archived-item__right">
                    <button
                      type="button"
                      className="archived-btn archived-btn--restore"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTask?.(task);
                      }}
                      title="Edit this task"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="archived-btn archived-btn--delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask?.(task.id);
                      }}
                      title="Delete permanently"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

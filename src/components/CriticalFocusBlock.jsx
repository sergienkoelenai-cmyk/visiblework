import React from 'react';
import { getTaskBaseCost, getTaskDurationMinutes } from '../data/pricing';
import IconBadge from './IconBadge';
import './CriticalFocusBlock.css';

export default function CriticalFocusBlock({
  tasks = [],
  categories = [],
  baseRate = 0.10,
  complexityMultipliers,
  onCompleteTask,
}) {
  if (!tasks || tasks.length === 0) return null;

  const getCategoryInfo = (catId) => {
    const found = categories.find((c) => c.id === catId);
    return found || { emoji: '📋', label: 'General' };
  };

  const getDueBadgeInfo = (task) => {
    if (task.type === 'always-available' || !task.nextDueDate) {
      return { text: '⚠️ Due Today', isOverdue: false };
    }

    const due = task.nextDueDate?.toDate ? task.nextDueDate.toDate() : new Date(task.nextDueDate);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diffMs = startOfToday.getTime() - startOfDue.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { text: '⚠️ Due Today', isOverdue: false };
    } else if (diffDays === 1) {
      return { text: '⚠️ 1 day overdue', isOverdue: true };
    } else {
      return { text: `⚠️ ${diffDays} days overdue`, isOverdue: true };
    }
  };

  return (
    <section className="critical-focus theme-critical">
      <div className="critical-focus__header">
        <h2 className="critical-focus__title">
          <span className="critical-focus__pulse">🚨</span> Critical Focus ({tasks.length})
        </h2>
        <span className="critical-focus__subtitle">Time-sensitive tasks with consequences</span>
      </div>

      <div className="critical-focus__list">
        {tasks.map((task) => {
          const cat = getCategoryInfo(task.category);
          const duration = getTaskDurationMinutes(task);
          const price = getTaskBaseCost(task, baseRate, complexityMultipliers);
          const badge = getDueBadgeInfo(task);

          return (
            <div key={task.id} className="critical-focus__card">
              <div className="critical-focus__card-top">
                <div className="critical-focus__task-meta">
                  <IconBadge
                    categoryId={task.category}
                    emoji={task.icon || cat.emoji}
                    size={36}
                    iconSize={18}
                  />
                  <div className="critical-focus__task-title-group">
                    <h3 className="critical-focus__task-title">{task.title}</h3>
                    <span className="critical-focus__cat-label">{cat.label}</span>
                  </div>
                </div>
                <span
                  className={`critical-focus__badge ${
                    badge.isOverdue ? 'critical-focus__badge--overdue' : ''
                  }`}
                >
                  {badge.text}
                </span>
              </div>

              {task.description && (
                <p className="critical-focus__desc">{task.description}</p>
              )}

              <div className="critical-focus__card-bottom">
                <div className="critical-focus__chips">
                  {task.complexity && (
                    <span className={`critical-focus__chip critical-focus__chip--${task.complexity.toLowerCase()}`}>
                      {task.complexity === 'LOW' && '🟢 Low'}
                      {task.complexity === 'MEDIUM' && '🟡 Med'}
                      {task.complexity === 'HIGH' && '🔴 High'}
                    </span>
                  )}
                  <span className="critical-focus__chip">
                    ⏱️ {duration}m
                  </span>
                  <span className="critical-focus__price">
                    €{price.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  className="critical-focus__complete-btn"
                  onClick={() => onCompleteTask?.(task)}
                >
                  ✓ Complete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

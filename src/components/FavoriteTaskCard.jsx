import React from 'react';
import { getTaskBaseCost } from '../data/pricing';
import './FavoriteTaskCard.css';

export function getLastCompletedRelativeText(task) {
  if (!task.lastCompletedAt) {
    return 'Never';
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

    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  } catch (e) {
    return 'Never';
  }
}

export default function FavoriteTaskCard({
  task,
  baseRate = 0.10,
  complexityMultipliers = null,
  onComplete,
}) {
  const icon = task.icon || task.categoryEmoji || '📋';
  const price = getTaskBaseCost(task, baseRate, complexityMultipliers);
  const relativeCompleted = getLastCompletedRelativeText(task);

  const handleClick = (e) => {
    e.stopPropagation();
    onComplete?.(task);
  };

  return (
    <div
      className="favorite-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      {/* Left Icon */}
      <div className="favorite-card__icon">
        {icon}
      </div>

      {/* Middle Details */}
      <div className="favorite-card__details">
        <span className="favorite-card__title" title={task.title}>
          {task.title}
        </span>
        <span className="favorite-card__last-completed">
          Last completed: {relativeCompleted}
        </span>
      </div>

      {/* Right Price */}
      <div className="favorite-card__right">
        <span className="favorite-card__price">
          €{price.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

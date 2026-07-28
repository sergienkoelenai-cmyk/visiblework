import React from 'react';
import { getTaskBaseCost } from '../data/pricing';
import IconBadge from './IconBadge';
import './FavoriteTaskCard.css';

export function getDoerName(task, users = []) {
  if (!task || !task.lastCompletedBy) return '';
  const raw = String(task.lastCompletedBy);
  const idsOrNames = raw.split(',').map(s => s.trim()).filter(Boolean);

  const resolvedNames = idsOrNames.map(idOrName => {
    const user = (users || []).find(u => u.id === idOrName);
    return user ? user.name : idOrName;
  });

  return resolvedNames.join(', ');
}

export function getLastCompletedRelativeText(task, users = []) {
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

    const doer = getDoerName(task, users);
    const bySuffix = doer ? ` by ${doer}` : '';

    if (diffDays <= 0) return `Today${bySuffix}`;
    if (diffDays === 1) return `Yesterday${bySuffix}`;
    return `${diffDays} days ago${bySuffix}`;
  } catch (e) {
    return 'Never';
  }
}

export default function FavoriteTaskCard({
  task,
  users = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  onComplete,
}) {
  const icon = task.icon || task.categoryEmoji || '📋';
  const price = getTaskBaseCost(task, baseRate, complexityMultipliers);
  const relativeCompleted = getLastCompletedRelativeText(task, users);

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
      {/* Left Icon — always show user emoji inside styled badge */}
      <IconBadge
        emoji={icon}
        emojiOnly
        size={34}
        iconSize={17}
        className="favorite-card__icon"
      />

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

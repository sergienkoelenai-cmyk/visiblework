import React from 'react';
import { getTaskBaseCost } from '../data/pricing';
import { getLastCompletedRelativeText } from '../data/scheduler';
import IconBadge from './IconBadge';
import './FavoriteTaskCard.css';

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

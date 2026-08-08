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
  isNested = false,
}) {
  const icon = task.icon || (isNested ? null : task.categoryEmoji);
  const price = getTaskBaseCost(task, baseRate, complexityMultipliers);
  const relativeCompleted = getLastCompletedRelativeText(task, users);

  const handleClick = (e) => {
    e.stopPropagation();
    onComplete?.(task);
  };

  return (
    <div
      className={`favorite-card ${isNested ? 'favorite-card--nested' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      {/* Left Icon — task-specific icon or subtle bullet indicator */}
      {icon ? (
        <IconBadge
          emoji={icon}
          emojiOnly
          size={isNested ? 26 : 34}
          iconSize={isNested ? 14 : 17}
          className="favorite-card__icon"
        />
      ) : (
        <span className="favorite-card__bullet">•</span>
      )}

      {/* Middle Details */}
      <div className="favorite-card__details">
        <span className="favorite-card__title" title={task.title}>
          {task.title}
          {task.scope === 'personal' && (() => {
            const ownerUser = users.find((u) => u.id === (task.ownerId || task.createdBy));
            const ownerName = ownerUser ? ownerUser.name : (task.createdBy || 'Personal');
            return (
              <span style={{ marginLeft: '6px', fontSize: '10px', background: '#F3E8FF', color: '#7E22CE', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                👤 {ownerName}
              </span>
            );
          })()}
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

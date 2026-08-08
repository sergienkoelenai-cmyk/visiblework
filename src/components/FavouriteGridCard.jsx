import React from 'react';
import { getTaskBaseCost } from '../data/pricing';
import { toJsDate, getTaskOwnerName } from '../data/scheduler';
import './FavouriteGridCard.css';

// Compact relative time: "Today", "Yesterday", "3d ago"
function getCompactTime(task) {
  if (!task.lastCompletedAt) return null;
  const date = toJsDate(task.lastCompletedAt);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

export default function FavouriteGridCard({
  task,
  users = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  onComplete,
}) {
  const price = getTaskBaseCost(task, baseRate, complexityMultipliers);

  // Inline emoji + title
  const emoji = task.icon || task.categoryEmoji || '';
  const titleWithEmoji = emoji ? `${emoji} ${task.title}` : task.title;

  // Who & When (compact)
  const lastDoer = users.find((u) => u.id === task.lastCompletedBy);
  const doerName = lastDoer?.name || '';
  const timeText = getCompactTime(task);
  const metaText = timeText
    ? doerName ? `${doerName} • ${timeText}` : timeText
    : 'Never';

  const handleClick = () => onComplete?.(task);

  return (
    <div
      className="fav-grid-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* ── Row 1: inline emoji + full title ── */}
      <p className="fav-grid-card__title">
        {titleWithEmoji}
        {task.scope === 'personal' && (
          <span style={{ marginLeft: '4px', fontSize: '9px', background: '#F3E8FF', color: '#7E22CE', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
            👤 {getTaskOwnerName(task, users)}
          </span>
        )}
      </p>

      {/* ── Row 2: meta (left) + price (right) ── */}
      <div className="fav-grid-card__footer">
        <span className="fav-grid-card__meta">👤 {metaText}</span>
        <span className="fav-grid-card__price">€{price.toFixed(2)}</span>
      </div>
    </div>
  );
}

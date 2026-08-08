import React from 'react';
import { getTaskBaseCost } from '../data/pricing';
import { getLastCompletedRelativeText } from '../data/scheduler';
import IconBadge from './IconBadge';
import './FavouriteDashboardRow.css';

export default function FavouriteDashboardRow({
  task,
  users = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  onComplete,
}) {
  const price = getTaskBaseCost(task, baseRate, complexityMultipliers);

  // ── Who & When ──────────────────────────────────────────────────────────
  const lastDoerUser = users.find((u) => u.id === task.lastCompletedBy);
  const doerName = lastDoerUser?.name || '';

  // getLastCompletedRelativeText returns e.g. "Today by Sv" / "Yesterday by Lena"
  const fullRelText = getLastCompletedRelativeText(task, users);
  // Strip " by Name" suffix so we can reformat as "Name • Time"
  const timeText = doerName
    ? fullRelText.replace(` by ${doerName}`, '')
    : fullRelText;

  const hasHistory = Boolean(task.lastCompletedAt);
  const metaText = hasHistory
    ? doerName
      ? `${doerName} • ${timeText}`
      : timeText
    : 'Never completed';

  const icon = task.icon || task.categoryEmoji;

  const handleRowClick = () => onComplete?.(task);
  const handleCheckClick = (e) => {
    e.stopPropagation();
    onComplete?.(task);
  };

  return (
    <div
      className="fav-row"
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      }}
    >
      {/* ── Left Icon ── */}
      {icon ? (
        <IconBadge
          emoji={icon}
          emojiOnly
          size={32}
          iconSize={15}
          className="fav-row__icon"
        />
      ) : (
        <span className="fav-row__bullet">•</span>
      )}

      {/* ── Title + Meta ── */}
      <div className="fav-row__details">
        <span className="fav-row__title">{task.title}</span>
        <span className="fav-row__meta">
          👤 {metaText}
        </span>
      </div>

      {/* ── Price + Check Button ── */}
      <div className="fav-row__right">
        <span className="fav-row__price">€{price.toFixed(2)}</span>
        <button
          className="fav-row__check-btn"
          onClick={handleCheckClick}
          type="button"
          title="Log completion"
          aria-label={`Complete ${task.title}`}
        >
          ✓
        </button>
      </div>
    </div>
  );
}

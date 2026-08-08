import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import IconBadge from './IconBadge';
import { calculateFinalReward } from '../data/pricing';
import { isStandardRecurringTask } from '../data/scheduler';
import './TaskCompletionOverlay.css';

export default function TaskCompletionOverlay({
  task,
  users = [],
  activeUserId = '',
  baseRate = 0.10,
  complexityMultipliers = null,
  onConfirm,
  onCancel,
  onSkip,
  onToggleFavorite,
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSplit, setIsSplit] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState(
    activeUserId && users.some((u) => u.id === activeUserId) ? [activeUserId] : []
  );
  const [selectedModifierOption, setSelectedModifierOption] = useState(null); // null (none = 1) | 0.5 | 1.5 | 'CUSTOM'
  const [customMultiplierInput, setCustomMultiplierInput] = useState('1');
  const [dateOption, setDateOption] = useState('TODAY'); // TODAY | YESTERDAY | CUSTOM
  const [customDateInput, setCustomDateInput] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [visible, setVisible] = useState(false);
  const [isFav, setIsFav] = useState(
    Array.isArray(task?.favoritedBy)
      ? (activeUserId ? task.favoritedBy.includes(activeUserId) : task.favoritedBy.length > 0)
      : !!task?.isFavorite
  );

  // Trigger entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Computed target date
  const getTargetCompletedAt = () => {
    if (dateOption === 'YESTERDAY') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    }
    if (dateOption === 'CUSTOM' && customDateInput) {
      const [year, month, day] = customDateInput.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    return new Date(); // TODAY
  };

  // Compute effective multiplier (if none selected, use 1; custom allows any value including 0)
  const getEffectiveMultiplier = () => {
    if (selectedModifierOption === 0.5) return 0.5;
    if (selectedModifierOption === 1.5) return 1.5;
    if (selectedModifierOption === 'CUSTOM') {
      const parsed = parseFloat(customMultiplierInput);
      if (!isNaN(parsed) && customMultiplierInput.trim() !== '') {
        return parsed;
      }
      return 1.0;
    }
    return 1.0;
  };

  const multiplier = getEffectiveMultiplier();

  // Computed reward values
  const finalReward = calculateFinalReward(task, baseRate, multiplier, complexityMultipliers);
  const splitCount = isSplit && selectedUserIds.length > 0 ? selectedUserIds.length : 1;
  const perPersonReward = finalReward / splitCount;

  const handleSelectModifierOption = (optionId) => {
    if (selectedModifierOption === optionId) {
      setSelectedModifierOption(null);
    } else {
      setSelectedModifierOption(optionId);
    }
  };

  const handleSelectUser = (user) => {
    const targetDate = getTargetCompletedAt();
    if (!isSplit) {
      // Single person complete — confirm immediately
      setSelectedUserIds([user.id]);
      setConfirmed(true);
      setTimeout(() => {
        onConfirm?.(task.id, user.id, multiplier, targetDate);
      }, 1600);
    } else {
      // Split complete multi-select
      setSelectedUserIds((prev) =>
        prev.includes(user.id)
          ? prev.filter((id) => id !== user.id)
          : [...prev, user.id]
      );
    }
  };

  const handleConfirmSplit = () => {
    if (selectedUserIds.length === 0) return;
    const targetDate = getTargetCompletedAt();
    setConfirmed(true);
    setTimeout(() => {
      onConfirm?.(task.id, selectedUserIds, multiplier, targetDate);
    }, 1600);
  };

  const handleCancel = () => {
    setVisible(false);
    setTimeout(() => onCancel?.(), 300);
  };

  const confirmedNames = users
    .filter((u) => selectedUserIds.includes(u.id))
    .map((u) => u.name)
    .join(' & ');

  const displayedFloatPrice = isSplit && selectedUserIds.length > 0
    ? `+€${perPersonReward.toFixed(2)} each`
    : `+€${finalReward.toFixed(2)}`;

  return (
    <div
      className={`tco theme-completion ${visible ? 'tco--visible' : ''}`}
      onClick={handleCancel}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className={`tco__card ${confirmed ? 'tco__card--confirmed' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {!confirmed ? (
          <>
            {/* Header: Task Info */}
            <div className="tco__task-info">
              <IconBadge
                emoji={task.icon || task.categoryEmoji || '📋'}
                categoryId={!task.icon ? task.category : undefined}
                size={38}
                iconSize={19}
                className="tco__task-emoji"
              />
              <div className="tco__task-title-group">
                <span className="tco__task-title">{task.title}</span>
              </div>
              <button
                className={`tco__fav-btn ${isFav ? 'tco__fav-btn--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const newVal = !isFav;
                  setIsFav(newVal);
                  onToggleFavorite?.(task.id, newVal);
                }}
                type="button"
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFav ? '⭐' : '☆'}
              </button>
              <span className="tco__task-price">
                {isSplit && selectedUserIds.length > 0 ? (
                  <span className="tco__price-split">
                    <span>€{finalReward.toFixed(2)}</span>
                    <span className="tco__price-subtext">
                      (€{perPersonReward.toFixed(2)} ea)
                    </span>
                  </span>
                ) : (
                  `€${finalReward.toFixed(2)}`
                )}
              </span>
            </div>

            {/* Section 1: MULTIPLIER / MODIFICATOR */}
            <div className="tco__section">
              <span className="tco__section-title">MODIFICATOR</span>
              <div className="tco__multiplier-row">
                <button
                  type="button"
                  className={`tco__multiplier-btn tco__multiplier-btn--half ${
                    selectedModifierOption === 0.5 ? 'tco__multiplier-btn--active' : ''
                  }`}
                  onClick={() => handleSelectModifierOption(0.5)}
                >
                  <span>0.5×</span>
                  <span className="tco__multiplier-reward">
                    €{calculateFinalReward(task, baseRate, 0.5, complexityMultipliers).toFixed(2)}
                  </span>
                </button>

                <button
                  type="button"
                  className={`tco__multiplier-btn tco__multiplier-btn--bonus ${
                    selectedModifierOption === 1.5 ? 'tco__multiplier-btn--active' : ''
                  }`}
                  onClick={() => handleSelectModifierOption(1.5)}
                >
                  <span>1.5×</span>
                  <span className="tco__multiplier-reward">
                    €{calculateFinalReward(task, baseRate, 1.5, complexityMultipliers).toFixed(2)}
                  </span>
                </button>

                <button
                  type="button"
                  className={`tco__multiplier-btn tco__multiplier-btn--custom ${
                    selectedModifierOption === 'CUSTOM' ? 'tco__multiplier-btn--active' : ''
                  }`}
                  onClick={() => handleSelectModifierOption('CUSTOM')}
                >
                  <span>Custom</span>
                  <span className="tco__multiplier-reward">
                    {selectedModifierOption === 'CUSTOM'
                      ? `€${finalReward.toFixed(2)}`
                      : 'Any value'}
                  </span>
                </button>
              </div>

              {selectedModifierOption === 'CUSTOM' && (
                <div className="tco__custom-multiplier-box">
                  <span className="tco__custom-multiplier-label">Custom Multiplier:</span>
                  <div className="tco__custom-multiplier-input-wrapper">
                    <span className="tco__custom-multiplier-prefix">×</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="tco__custom-multiplier-input"
                      value={customMultiplierInput}
                      onChange={(e) => setCustomMultiplierInput(e.target.value)}
                      placeholder="e.g. 0, 0.8, 2..."
                      autoFocus
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: DATE */}
            <div className="tco__section">
              <span className="tco__section-title">COMPLETION DATE</span>
              <div className="tco__date-row">
                <button
                  type="button"
                  className={`tco__date-btn ${
                    dateOption === 'TODAY' ? 'tco__date-btn--active' : ''
                  }`}
                  onClick={() => setDateOption('TODAY')}
                >
                  🕒 Today
                </button>
                <button
                  type="button"
                  className={`tco__date-btn ${
                    dateOption === 'YESTERDAY' ? 'tco__date-btn--active' : ''
                  }`}
                  onClick={() => setDateOption('YESTERDAY')}
                >
                  🕒 Yesterday
                </button>
                <button
                  type="button"
                  className={`tco__date-btn ${
                    dateOption === 'CUSTOM' ? 'tco__date-btn--active' : ''
                  }`}
                  onClick={() => setDateOption('CUSTOM')}
                >
                  📅 Select Date
                </button>
              </div>

              {dateOption === 'CUSTOM' && (
                <div className="tco__custom-date-box">
                  <input
                    type="date"
                    className="task-form__input tco__date-input"
                    value={customDateInput}
                    onChange={(e) => setCustomDateInput(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Section 3: PERFORMED BY & User Avatars */}
            <div className="tco__section">
              <div className="tco__section-header-row">
                <span className="tco__section-title">PERFORMED BY</span>
                <label className="tco__split-chip">
                  <input
                    type="checkbox"
                    checked={isSplit}
                    onChange={(e) => {
                      setIsSplit(e.target.checked);
                      setSelectedUserIds([]);
                    }}
                    className="tco__split-checkbox"
                  />
                  <span>👥 Split Reward</span>
                </label>
              </div>

              {/* Horizontal Scroll / Flex Row of Compact Avatars */}
              <div className="tco__avatars-row">
                {users.map((user) => (
                  <div key={user.id} className="tco__avatar-compact-wrapper">
                    <Avatar
                      user={user}
                      size="md"
                      showName
                      selected={selectedUserIds.includes(user.id)}
                      onClick={() => handleSelectUser(user)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="tco__actions">
              <button
                className="tco__cancel"
                onClick={handleCancel}
                type="button"
              >
                Cancel
              </button>

              {isStandardRecurringTask(task) && (
                <button
                  className="tco__skip"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVisible(false);
                    setTimeout(() => onSkip?.(task), 300);
                  }}
                  type="button"
                >
                  Skip occurrence
                </button>
              )}

              {isSplit && (
                <button
                  className="btn btn-primary tco__confirm-split"
                  onClick={handleConfirmSplit}
                  disabled={selectedUserIds.length === 0}
                  type="button"
                >
                  Confirm Completion
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="tco__success">
            <div className="tco__checkmark">
              <svg viewBox="0 0 52 52" className="tco__checkmark-svg">
                <circle
                  className="tco__checkmark-circle"
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                />
                <path
                  className="tco__checkmark-check"
                  fill="none"
                  d="M14 27l7 7 16-16"
                />
              </svg>
            </div>
            <div className="tco__price-float">{displayedFloatPrice}</div>
            <p className="tco__success-name">{confirmedNames}</p>
          </div>
        )}
      </div>
    </div>
  );
}

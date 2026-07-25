import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import {
  getTaskBaseCost,
  calculateFinalReward,
} from '../data/pricing';
import './TaskCompletionOverlay.css';

const MULTIPLIER_META = [
  { value: 1.0,  variant: 'normal', label: '1×',   desc: 'Normal' },
  { value: 1.5,  variant: 'bonus',  label: '1.5×',  desc: '+50% bonus' },
  { value: 2.0,  variant: 'double', label: '2×',    desc: 'Double!' },
];

export default function TaskCompletionOverlay({
  task,
  users = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  onConfirm,
  onCancel,
  onToggleFavorite,
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSplit, setIsSplit] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [dateOption, setDateOption] = useState('TODAY'); // TODAY | YESTERDAY | CUSTOM
  const [customDateInput, setCustomDateInput] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [visible, setVisible] = useState(false);
  const [isFav, setIsFav] = useState(task?.isFavorite || false);

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

  // Computed reward values
  const finalReward = calculateFinalReward(task, baseRate, multiplier, complexityMultipliers);
  const splitCount = isSplit && selectedUserIds.length > 0 ? selectedUserIds.length : 1;
  const perPersonReward = finalReward / splitCount;

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
      className={`tco ${visible ? 'tco--visible' : ''}`}
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
              <span className="tco__task-emoji">
                {task.icon || task.categoryEmoji || '📋'}
              </span>
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

            {/* Section 1: MULTIPLIER */}
            <div className="tco__section">
              <span className="tco__section-title">MULTIPLIER</span>
              <div className="tco__multiplier-row">
                {MULTIPLIER_META.map((m) => {
                  const reward = calculateFinalReward(
                    task,
                    baseRate,
                    m.value,
                    complexityMultipliers
                  );
                  const active = multiplier === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      className={`tco__multiplier-btn tco__multiplier-btn--${m.variant} ${
                        active ? 'tco__multiplier-btn--active' : ''
                      }`}
                      onClick={() => setMultiplier(m.value)}
                    >
                      <span>{m.label}</span>
                      <span className="tco__multiplier-reward">
                        €{reward.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
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

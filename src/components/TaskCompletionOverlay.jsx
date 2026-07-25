import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import {
  COMPLETION_MULTIPLIERS,
  getTaskBaseCost,
  calculateFinalReward,
} from '../data/pricing';
import './TaskCompletionOverlay.css';

const MULTIPLIER_META = [
  { value: 1.0,  variant: 'normal', label: '1×',   desc: 'Normal' },
  { value: 1.5,  variant: 'bonus',  label: '1.5×',  desc: '+50% bonus' },
  { value: 2.0,  variant: 'double', label: '2×',    desc: 'Double!' },
];

export default function TaskCompletionOverlay({ task, users = [], baseRate = 10, onConfirm, onCancel, onToggleFavorite }) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSplit, setIsSplit] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [visible, setVisible] = useState(false);
  const [isFav, setIsFav] = useState(task.isFavorite || false);

  // Trigger entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Computed values
  const baseCost = getTaskBaseCost(task, baseRate);
  const finalReward = calculateFinalReward(task, baseRate, multiplier);
  const splitCount = isSplit && selectedUserIds.length > 0 ? selectedUserIds.length : 1;
  const perPersonReward = finalReward / splitCount;

  const handleSelect = (user) => {
    if (!isSplit) {
      // Single person complete — confirm immediately
      setSelectedUserIds([user.id]);
      setConfirmed(true);
      setTimeout(() => {
        onConfirm?.(task.id, user.id, multiplier);
      }, 2000);
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
    setConfirmed(true);
    setTimeout(() => {
      onConfirm?.(task.id, selectedUserIds, multiplier);
    }, 2000);
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
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
    >
      <div className={`tco__card ${confirmed ? 'tco__card--confirmed' : ''}`} onClick={(e) => e.stopPropagation()}>
        {!confirmed ? (
          <>
            <h2 className="tco__heading">Who completed this task?</h2>

            <div className="tco__task-info">
              <span className="tco__task-emoji">{task.icon || task.categoryEmoji || '📋'}</span>
              <span className="tco__task-title">{task.title}</span>
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
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-euro)' }}>
                      €{finalReward.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                      (€{perPersonReward.toFixed(2)} each)
                    </span>
                  </span>
                ) : (
                  `€${finalReward.toFixed(2)}`
                )}
              </span>
            </div>

            {task.description && (
              <div className="tco__description-box">
                <span className="tco__description-title">What to do:</span>
                <p className="tco__description-text">{task.description}</p>
              </div>
            )}

            {/* Multiplier selector */}
            <div className="tco__multiplier-section">
              <div className="tco__multiplier-label">Reward multiplier</div>
              <div className="tco__multiplier-row">
                {MULTIPLIER_META.map((m) => {
                  const reward = calculateFinalReward(task, baseRate, m.value);
                  const active = multiplier === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      className={`tco__multiplier-btn tco__multiplier-btn--${m.variant} ${active ? 'tco__multiplier-btn--active' : ''}`}
                      onClick={() => setMultiplier(m.value)}
                    >
                      <span>{m.label}</span>
                      <span className="tco__multiplier-reward">€{reward.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="tco__avatars">
              {users.map((user) => (
                <Avatar
                  key={user.id}
                  user={user}
                  size="xl"
                  showName
                  selected={selectedUserIds.includes(user.id)}
                  onClick={() => handleSelect(user)}
                />
              ))}
            </div>

            <div className="tco__split-toggle-container">
              <label className="tco__split-toggle-label">
                <input
                  type="checkbox"
                  checked={isSplit}
                  onChange={(e) => {
                    setIsSplit(e.target.checked);
                    setSelectedUserIds([]);
                  }}
                  className="tco__split-checkbox"
                />
                <span className="tco__split-toggle-text">Split reward between multiple doers</span>
              </label>
            </div>

            <div className="tco__actions">
              <button className="tco__cancel" onClick={handleCancel} type="button">
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
                <circle className="tco__checkmark-circle" cx="26" cy="26" r="24" fill="none" />
                <path className="tco__checkmark-check" fill="none" d="M14 27l7 7 16-16" />
              </svg>
            </div>
            <div className="tco__price-float">
              {displayedFloatPrice}
            </div>
            <p className="tco__success-name">{confirmedNames}</p>
          </div>
        )}
      </div>
    </div>
  );
}

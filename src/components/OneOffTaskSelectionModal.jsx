import React, { useState, useEffect } from 'react';
import IconBadge from './IconBadge';
import { getTaskBaseCost, getTaskDurationMinutes, COMPLEXITY_LABELS } from '../data/pricing';
import { isEligibleForDraw } from '../data/feats';
import './OneOffTaskSelectionModal.css';

export default function OneOffTaskSelectionModal({
  tasks = [],
  categories = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  onSelectTask,
  onClose,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const handleSelect = (task) => {
    setVisible(false);
    setTimeout(() => {
      onSelectTask?.(task);
    }, 200);
  };

  // Filter all active tasks eligible for the Feat pool
  const featTasks = tasks.filter(isEligibleForDraw);

  return (
    <div
      className={`one-off-modal-overlay theme-feats ${visible ? 'one-off-modal-overlay--visible' : ''}`}
      onClick={handleClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="one-off-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="one-off-modal__header">
          <div className="one-off-modal__header-title-group">
            <h2 className="one-off-modal__title">
              <span>🎯</span> Feat Showcase
            </h2>
            <p className="one-off-modal__subtitle">
              Choose an active one-off quest to complete & claim rewards!
            </p>
          </div>
          <button
            type="button"
            className="one-off-modal__close-btn"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="one-off-modal__body">
          {featTasks.length > 0 ? (
            <div className="one-off-modal__grid">
              {featTasks.map((task) => {
                const cat = categories.find((c) => c.id === task.category);
                const emoji = task.icon || (cat ? cat.emoji : '🎯');
                const cost = getTaskBaseCost(task, baseRate, complexityMultipliers);
                const duration = getTaskDurationMinutes(task);
                const complexityKey = String(task.complexity || 'LOW').toUpperCase();
                const effortInfo = COMPLEXITY_LABELS[complexityKey] || COMPLEXITY_LABELS.LOW;

                return (
                  <div key={task.id} className="one-off-card">
                    <div className="one-off-card__badge-row">
                      <div className="one-off-card__icon-box">
                        <IconBadge
                          categoryId={!task.icon ? task.category : undefined}
                          emoji={emoji}
                          emojiOnly={!!task.icon}
                          size={40}
                          iconSize={22}
                        />
                      </div>
                      <div className="one-off-card__price-chip">
                        €{cost.toFixed(2)}
                      </div>
                    </div>

                    <div className="one-off-card__content">
                      <h3 className="one-off-card__title">
                        {task.is_critical && <span className="one-off-card__critical-star">🛡️ </span>}
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="one-off-card__desc">{task.description}</p>
                      )}
                    </div>

                    <div className="one-off-card__tags">
                      <span className={`one-off-card__tag one-off-card__tag--effort-${complexityKey.toLowerCase()}`}>
                        {effortInfo.emoji} {effortInfo.label}
                      </span>
                      <span className="one-off-card__tag one-off-card__tag--time">
                        ⏱️ {duration}m
                      </span>
                    </div>

                    <button
                      type="button"
                      className="one-off-card__btn"
                      onClick={() => handleSelect(task)}
                    >
                      ⚡ Start / Complete
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="one-off-modal__empty">
              <span className="one-off-modal__empty-emoji">🎉</span>
              <h4 className="one-off-modal__empty-title">All Feat Tasks Completed!</h4>
              <p className="one-off-modal__empty-text">
                No active tasks available in the Feat pool right now. Enable <strong>Allow in Feats pool</strong> on any task to add it here!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

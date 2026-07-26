import React, { useState, useEffect } from 'react';
import {
  isFeat,
  getEligibleTasks,
  drawRandomTask,
} from '../data/feats.js';
import { getTaskBaseCost, getTaskDurationMinutes } from '../data/pricing.js';
import './FeatsDrawer.css';

export default function FeatsDrawer({
  tasks = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  onAcceptTask,
  onClose,
}) {
  const [energy, setEnergy] = useState('HIGH');
  const [timeWindow, setTimeWindow] = useState('LONG');
  const [drawnTask, setDrawnTask] = useState(null);
  const [viewState, setViewState] = useState('filter'); // 'filter' | 'result' | 'empty'
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleRoll = () => {
    const eligible = getEligibleTasks(tasks, energy, timeWindow);
    const selected = drawRandomTask(eligible);

    if (selected) {
      setDrawnTask(selected);
      setViewState('result');
    } else {
      setDrawnTask(null);
      setViewState('empty');
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const handleAccept = () => {
    if (!drawnTask) return;
    setVisible(false);
    setTimeout(() => {
      onAcceptTask?.(drawnTask);
    }, 200);
  };

  return (
    <div
      className={`feats-drawer-overlay theme-feats ${visible ? 'feats-drawer-overlay--visible' : ''}`}
      onClick={handleClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="feats-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="feats-drawer__header">
          <h2 className="feats-drawer__title">
            <span>🎲</span> Task Generator
          </h2>
          <button
            type="button"
            className="feats-drawer__close"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* ── FILTER VIEW ── */}
        {viewState === 'filter' && (
          <>
            <div>
              <div className="feats-drawer__label">Current Energy Level</div>
              <div className="feats-drawer__segment-group">
                {[
                  { key: 'LOW', label: '🟢 Low' },
                  { key: 'MEDIUM', label: '🟡 Medium' },
                  { key: 'HIGH', label: '🔴 High' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`feats-drawer__segment-btn ${energy === opt.key ? 'feats-drawer__segment-btn--active' : ''}`}
                    onClick={() => setEnergy(opt.key)}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="feats-drawer__label">Available Time Window</div>
              <div className="feats-drawer__segment-group">
                {[
                  { key: 'SHORT', label: '⚡ 15m' },
                  { key: 'MEDIUM', label: '⏱ 30m' },
                  { key: 'LONG', label: '⏳ 1h+' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`feats-drawer__segment-btn ${timeWindow === opt.key ? 'feats-drawer__segment-btn--active' : ''}`}
                    onClick={() => setTimeWindow(opt.key)}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="feats-drawer__roll-btn"
              onClick={handleRoll}
            >
              Roll the Dice 🎲
            </button>
          </>
        )}

        {/* ── RESULT VIEW ── */}
        {viewState === 'result' && drawnTask && (
          <>
            <div className={`feats-drawer__result-card ${isFeat(drawnTask) ? 'feats-drawer__result-card--feat' : ''}`}>
              <div className="feats-drawer__result-header">
                <span className="feats-drawer__result-emoji">
                  {drawnTask.icon || '📋'}
                </span>
                <div className="feats-drawer__result-details">
                  <h3 className="feats-drawer__result-title">{drawnTask.title}</h3>
                  <div className="feats-drawer__result-tags">
                    {isFeat(drawnTask) && (
                      <span className="feats-drawer__tag feats-drawer__tag--feat">
                        🔥 FEAT
                      </span>
                    )}
                    <span className="feats-drawer__tag feats-drawer__tag--effort">
                      Effort: {drawnTask.complexity || 'LOW'}
                    </span>
                    <span className="feats-drawer__tag feats-drawer__tag--effort">
                      ⏱ {getTaskDurationMinutes(drawnTask)}m
                    </span>
                  </div>
                </div>
                <div className="feats-drawer__result-price">
                  €{getTaskBaseCost(drawnTask, baseRate, complexityMultipliers).toFixed(2)}
                </div>
              </div>

              {drawnTask.description && (
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {drawnTask.description}
                </p>
              )}
            </div>

            <div className="feats-drawer__actions">
              <button
                type="button"
                className="feats-drawer__btn feats-drawer__btn--reroll"
                onClick={handleRoll}
              >
                Reroll 🎲
              </button>
              <button
                type="button"
                className="feats-drawer__btn feats-drawer__btn--accept"
                onClick={handleAccept}
              >
                Accept Task ✓
              </button>
            </div>
          </>
        )}

        {/* ── EMPTY STATE VIEW ── */}
        {viewState === 'empty' && (
          <div className="feats-drawer__empty">
            <span className="feats-drawer__empty-emoji">☕</span>
            <p className="feats-drawer__empty-text">
              No tasks currently available for this energy & time window! Take a break ☕
            </p>
            <div className="feats-drawer__actions" style={{ width: '100%', marginTop: '12px' }}>
              <button
                type="button"
                className="feats-drawer__btn feats-drawer__btn--reroll"
                onClick={() => setViewState('filter')}
              >
                Adjust Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

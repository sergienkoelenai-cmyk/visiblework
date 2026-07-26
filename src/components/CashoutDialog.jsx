import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { getCompletionsForPeriod } from '../data/store';
import './CashoutDialog.css';

export default function CashoutDialog({ user, onConfirm, onCancel, onUndoCompletion }) {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [recentCompletions, setRecentCompletions] = useState([]);
  const [loadingCompletions, setLoadingCompletions] = useState(true);

  const balance = typeof user?.balance === 'number' ? user.balance : 0;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const fetchRecentTasks = async () => {
      try {
        const now = new Date();
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(now.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        const completions = await getCompletionsForPeriod(threeDaysAgo, now);
        const userCompletions = completions.filter((c) => c.userId === user.id);
        setRecentCompletions(userCompletions);
      } catch (err) {
        console.error('Failed to fetch recent completions:', err);
      } finally {
        setLoadingCompletions(false);
      }
    };

    if (user) {
      fetchRecentTasks();
    }
  }, [user]);

  const validate = () => {
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      setError('Enter an amount greater than €0.00');
      return false;
    }
    if (val > balance) {
      setError(`Amount cannot exceed balance (€${balance.toFixed(2)})`);
      return false;
    }
    setError('');
    return true;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm?.(user.id, parseFloat(amount), note.trim());
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onCancel?.(), 300);
  };

  const handleUndo = async (completionId) => {
    if (!completionId) return;
    try {
      await onUndoCompletion?.(completionId);
      setRecentCompletions((prev) => prev.filter((c) => c.id !== completionId));
    } catch (err) {
      console.error('Failed to undo completion:', err);
    }
  };

  return (
    <div
      className={`cashout-overlay ${visible ? 'cashout-overlay--visible' : ''}`}
      onClick={handleClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="cashout-card--compact" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cashout__header">
          <h2 className="cashout__title-text">{user.name}'s Profile</h2>
          <button className="cashout__close-btn" onClick={handleClose} type="button">
            ✕
          </button>
        </div>

        {/* Floating Pure White User Balance Card */}
        <div className="cashout__user-card">
          <Avatar user={user} size="lg" />
          <div className="cashout__user-info">
            <span className="cashout__user-name">{user.name}</span>
            <span className="cashout__user-balance">
              Balance: <strong className="cashout__user-balance-value">€{balance.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="cashout__section">
          <span className="cashout__section-label">RECENT ACTIVITY (LAST 3 DAYS)</span>
          {loadingCompletions ? (
            <div className="cashout__recent-empty">Loading activity...</div>
          ) : recentCompletions.length === 0 ? (
            <div className="cashout__recent-empty">No tasks completed in the last 3 days.</div>
          ) : (
            <ul className="cashout__recent-list">
              {recentCompletions.map((c) => {
                const date = c.completedAt?.toDate
                  ? c.completedAt.toDate()
                  : new Date(c.completedAt?.seconds ? c.completedAt.seconds * 1000 : c.completedAt);
                const rewardAmount = typeof c.amount === 'number' ? c.amount : 0;
                return (
                  <li key={c.id} className="cashout__recent-row">
                    <div className="cashout__recent-left">
                      <span className="cashout__recent-name">{c.taskTitle}</span>
                      <span className="cashout__recent-date">
                        {date.toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="cashout__recent-right">
                      <span className="cashout__recent-reward">€{rewardAmount.toFixed(2)}</span>
                      {onUndoCompletion && (
                        <button
                          type="button"
                          className="cashout__undo-btn"
                          onClick={() => handleUndo(c.id)}
                          title="Undo this task completion"
                        >
                          ↩️ Undo
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Cash Out Form Section */}
        <div className="cashout__section">
          <span className="cashout__section-label">CASH OUT</span>

          <label className="cashout__label">
            Amount (€)
            <input
              className={`cashout__input ${error ? 'cashout__input--error' : ''}`}
              type="number"
              min="0.01"
              max={balance}
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              placeholder="0.00"
            />
            {error && <span className="cashout__error">{error}</span>}
          </label>

          <label className="cashout__label">
            Note <span className="cashout__optional">(optional)</span>
            <input
              className="cashout__input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bought ice cream 🍦"
            />
          </label>
        </div>

        {/* Actions */}
        <div className="cashout__actions">
          <button type="button" className="cashout__btn-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary cashout__btn-confirm" onClick={handleConfirm}>
            Confirm Cash Out
          </button>
        </div>
      </div>
    </div>
  );
}

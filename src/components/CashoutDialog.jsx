import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { getCompletionsForPeriod } from '../data/store';
import './CashoutDialog.css';

export default function CashoutDialog({ user, onConfirm, onCancel }) {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  
  // State for recent completions
  const [recentCompletions, setRecentCompletions] = useState([]);
  const [loadingCompletions, setLoadingCompletions] = useState(true);

  const balance = typeof user?.balance === 'number' ? user.balance : 0;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Fetch last 3 days of completions for this user
  useEffect(() => {
    const fetchRecentTasks = async () => {
      try {
        const now = new Date();
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(now.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        const completions = await getCompletionsForPeriod(threeDaysAgo, now);
        // Filter for this user only
        const userCompletions = completions.filter(c => c.userId === user.id);
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

  return (
    <div 
      className={`cashout ${visible ? 'cashout--visible' : ''}`} 
      onClick={handleClose}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
    >
      <div className="cashout__card" onClick={(e) => e.stopPropagation()}>
        <div className="cashout__header">
          <h2 className="cashout__heading">{user.name}'s Profile</h2>
          <button className="cashout__close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="cashout__user">
          <Avatar user={user} size="lg" />
          <div className="cashout__user-info">
            <span className="cashout__user-balance" style={{ fontSize: '18px' }}>
              Balance: <strong style={{ color: 'var(--color-euro)' }}>€{balance.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="cashout__recent">
          <h3 className="cashout__recent-title">Recent Activity (Last 3 days)</h3>
          {loadingCompletions ? (
            <div className="cashout__recent-empty">Loading...</div>
          ) : recentCompletions.length === 0 ? (
            <div className="cashout__recent-empty">No tasks completed in the last 3 days.</div>
          ) : (
            <ul className="cashout__recent-list">
              {recentCompletions.map(c => {
                const date = c.completedAt?.toDate ? c.completedAt.toDate() : new Date(c.completedAt?.seconds ? c.completedAt.seconds * 1000 : c.completedAt);
                const amount = typeof c.amount === 'number' ? c.amount : 0;
                return (
                  <li key={c.id} className="cashout__recent-item">
                    <div className="cashout__recent-task">
                      <span className="cashout__recent-name">{c.taskTitle}</span>
                      <span className="cashout__recent-date">
                        {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className="cashout__recent-reward">€{amount.toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <hr className="cashout__divider" />

        {/* ── Cashout Form ── */}
        <h3 className="cashout__recent-title">Cash Out</h3>
        
        <label className="cashout__label">
          Amount (€)
          <input
            className={`cashout__input ${error ? 'cashout__input--error' : ''}`}
            type="number"
            min="0.01"
            max={balance}
            step="0.01"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(''); }}
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

        <div className="cashout__actions">
          <button type="button" className="cashout__btn cashout__btn--confirm" onClick={handleConfirm}>
            Confirm Cash Out
          </button>
        </div>
      </div>
    </div>
  );
}

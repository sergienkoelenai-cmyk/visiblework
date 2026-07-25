import React, { useState, useEffect, useMemo } from 'react';
import Avatar from './Avatar';
import './AnalyticsPage.css';

export default function AnalyticsPage({
  users = [],
  completions = [],
  onRevertCompletion,
  onBack,
  onPeriodChange, // callback to notify parent of period changes so it fetches completions
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [revertingId, setRevertingId] = useState(null);

  // Format month and year for header
  const periodLabel = useMemo(() => {
    return currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return newDate;
    });
    setSelectedUserId(null); // clear member filter when month changes
  };

  // Navigate to next month
  const handleNextMonth = () => {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (currentDate >= currentMonthStart) return; // Prevent going into future months

    setCurrentDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return newDate;
    });
    setSelectedUserId(null); // clear member filter when month changes
  };

  // Check if next month arrow should be disabled
  const isNextDisabled = useMemo(() => {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return currentDate >= currentMonthStart;
  }, [currentDate]);

  // Trigger parent callback when date changes to fetch completions for that month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    onPeriodChange?.(startDate, endDate);
  }, [currentDate, onPeriodChange]);

  // Calculate aggregated earnings by person for the selected month
  const aggregatedEarnings = useMemo(() => {
    const earnings = {};
    // Initialize all users with 0
    users.forEach(u => {
      earnings[u.id] = {
        user: u,
        amount: 0,
      };
    });

    completions.forEach(c => {
      if (earnings[c.userId]) {
        earnings[c.userId].amount += c.amount || 0;
      }
    });

    return Object.values(earnings).sort((a, b) => b.amount - a.amount);
  }, [users, completions]);

  // Calculate total earnings in period
  const totalEarned = useMemo(() => {
    return completions.reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [completions]);

  // Filter completions by selected user ID if active
  const filteredCompletions = useMemo(() => {
    if (!selectedUserId) return completions;
    return completions.filter(c => c.userId === selectedUserId);
  }, [completions, selectedUserId]);

  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId);
  }, [users, selectedUserId]);

  return (
    <div className="analytics">
      {/* ── Header ── */}
      <div className="analytics__header">
        <button className="btn btn-secondary analytics__back" onClick={onBack} type="button">
          ⬅️ Back
        </button>
        <h1 className="analytics__title">Analytics & History</h1>
        <div style={{ width: '80px' }} className="analytics__header-spacer" />
      </div>

      {/* ── Period Selector ── */}
      <section className="analytics__section analytics__period-picker">
        <button 
          className="analytics__picker-btn" 
          onClick={handlePrevMonth} 
          type="button"
          title="Previous Month"
        >
          ◀
        </button>
        <span className="analytics__picker-label">{periodLabel}</span>
        <button 
          className="analytics__picker-btn" 
          onClick={handleNextMonth} 
          disabled={isNextDisabled}
          type="button"
          title="Next Month"
        >
          ▶
        </button>
      </section>

      {/* ── Earnings Cards ── */}
      <div className="analytics__summary-row">
        {/* Total Earned Card */}
        <div className="analytics__total-card glass-panel">
          <span className="analytics__total-title">Total Earned</span>
          <span className="analytics__total-amount">€{totalEarned.toFixed(2)}</span>
          <span className="analytics__total-sub">in {currentDate.toLocaleDateString('default', { month: 'long' })}</span>
        </div>

        {/* Member Aggregation Card */}
        <div className="analytics__members-card glass-panel">
          <div className="analytics__members-header">
            <span className="analytics__members-title">Earnings by Person</span>
            {selectedUserId && (
              <button 
                className="analytics__clear-filter" 
                onClick={() => setSelectedUserId(null)}
                type="button"
              >
                Show All
              </button>
            )}
          </div>
          <div className="analytics__members-list">
            {aggregatedEarnings.map(({ user, amount }) => {
              const isSelected = selectedUserId === user.id;
              return (
                <div 
                  key={user.id} 
                  className={`analytics__member-item ${isSelected ? 'analytics__member-item--selected' : ''}`}
                  onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                  title={`Filter history to see only ${user.name}`}
                >
                  <Avatar user={user} size="md" />
                  <div className="analytics__member-info">
                    <span className="analytics__member-name">{user.name}</span>
                    <span className="analytics__member-amount">€{amount.toFixed(2)}</span>
                  </div>
                  {isSelected && <span className="analytics__filter-indicator">👁️</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Period History ── */}
      <section className="analytics__section">
        <h2 className="analytics__section-title">
          {selectedUser ? `${selectedUser.name}'s Completed Tasks` : 'Completed Tasks'} ({filteredCompletions.length})
        </h2>

        {filteredCompletions.length > 0 ? (
          <div className="analytics__history">
            <div className="analytics__history-header">
              <span>Date</span>
              <span>Task</span>
              <span>Who</span>
              <span>Amount</span>
              <span style={{ textAlign: 'center' }}>Undo</span>
            </div>
            {filteredCompletions.map((entry, idx) => (
              <div key={entry.id || idx} className="analytics__history-row">
                <span className="analytics__history-date">
                  {entry.completedAt
                    ? (entry.completedAt.toDate ? entry.completedAt.toDate() : new Date(entry.completedAt)).toLocaleDateString()
                    : '—'}
                </span>
                <span className="analytics__history-task" title={entry.taskTitle}>{entry.taskTitle || '—'}</span>
                <span className="analytics__history-user">{entry.userName || '—'}</span>
                <span className="analytics__history-amount">
                  €{typeof entry.amount === 'number' ? entry.amount.toFixed(2) : '0.00'}
                </span>
                <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <button
                    className="analytics__icon-btn"
                    disabled={revertingId === entry.id}
                    onClick={async () => {
                      if (window.confirm(`Do you want to undo the completion of "${entry.taskTitle || 'this task'}"?`)) {
                        setRevertingId(entry.id);
                        try {
                          await onRevertCompletion?.(entry.id);
                        } finally {
                          setRevertingId(null);
                        }
                      }
                    }}
                    title="Undo this completion"
                    type="button"
                  >
                    {revertingId === entry.id ? '⏳' : '↩️'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="analytics__empty">No completed tasks in this period.</p>
        )}
      </section>
    </div>
  );
}

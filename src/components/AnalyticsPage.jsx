import React, { useState, useEffect, useMemo } from 'react';
import CategorySpendingList from './CategorySpendingList';
import './AnalyticsPage.css';

export default function AnalyticsPage({
  users = [],
  tasks = [],
  categories = [],
  completions = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  onEditTask,
  onPeriodChange,
  onBack,
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedUserId, setSelectedUserId] = useState(null);

  // Month and year label
  const periodLabel = useMemo(() => {
    return currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Prev month handler
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedUserId(null);
  };

  // Next month handler
  const handleNextMonth = () => {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (currentDate >= currentMonthStart) return;

    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedUserId(null);
  };

  // Disable next month if at current month
  const isNextDisabled = useMemo(() => {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return currentDate >= currentMonthStart;
  }, [currentDate]);

  // Handle month picker input change
  const handleMonthInputChange = (e) => {
    if (!e.target.value) return;
    const [year, month] = e.target.value.split('-').map(Number);
    if (year && month) {
      setCurrentDate(new Date(year, month - 1, 1));
      setSelectedUserId(null);
    }
  };

  // Trigger parent callback when date changes to fetch completions for period
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    onPeriodChange?.(startDate, endDate);
  }, [currentDate, onPeriodChange]);

  // Calculate aggregated earnings by user for selected period
  const aggregatedEarnings = useMemo(() => {
    const earnings = {};
    users.forEach((u) => {
      earnings[u.id] = {
        user: u,
        amount: 0,
      };
    });

    completions.forEach((c) => {
      if (earnings[c.userId]) {
        earnings[c.userId].amount += c.amount || 0;
      }
    });

    return Object.values(earnings).sort((a, b) => b.amount - a.amount);
  }, [users, completions]);

  // Total earned in period
  const totalEarned = useMemo(() => {
    return completions.reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [completions]);

  // Formatted YYYY-MM for input type="month"
  const monthInputValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="analytics">
      {/* ── Header ── */}
      <header className="analytics__header">
        <button
          className="btn btn-secondary analytics__back"
          onClick={onBack}
          type="button"
        >
          ⬅️ Back
        </button>
        <h1 className="analytics__title">Analytics</h1>
        <div style={{ width: '80px' }} className="analytics__header-spacer" />
      </header>

      {/* ── Period Selector (Pill Shape) ── */}
      <section className="analytics__period-section">
        <div className="analytics__period-pill">
          <button
            className="analytics__picker-arrow"
            onClick={handlePrevMonth}
            type="button"
            title="Previous Month"
          >
            ‹
          </button>

          <label className="analytics__picker-label-wrapper">
            <span className="analytics__picker-label-text">{periodLabel} ▾</span>
            <input
              type="month"
              className="analytics__month-input"
              value={monthInputValue}
              onChange={handleMonthInputChange}
            />
          </label>

          <button
            className="analytics__picker-arrow"
            onClick={handleNextMonth}
            disabled={isNextDisabled}
            type="button"
            title="Next Month"
          >
            ›
          </button>
        </div>
      </section>

      {/* ── Total Spent Banner ── */}
      <section className="analytics__total-banner glass-panel">
        <span className="analytics__total-title">TOTAL PAYOUT</span>
        <span className="analytics__total-amount">€{totalEarned.toFixed(2)}</span>
        <span className="analytics__total-sub">in {periodLabel}</span>
      </section>

      {/* ── Earnings by Person (Compact Summary Row) ── */}
      <section className="analytics__earnings-section">
        <div className="analytics__section-header">
          <span className="analytics__section-label">EARNINGS BY PERSON</span>
          {selectedUserId && (
            <button
              type="button"
              className="analytics__clear-filter-btn"
              onClick={() => setSelectedUserId(null)}
            >
              Show All
            </button>
          )}
        </div>

        <div className="analytics__chips-row">
          {aggregatedEarnings.map(({ user, amount }) => {
            const isSelected = selectedUserId === user.id;
            const initials = user.name
              ? user.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : '?';

            return (
              <button
                key={user.id}
                type="button"
                className={`analytics__user-chip ${isSelected ? 'analytics__user-chip--selected' : ''}`}
                onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                title={`Filter spending for ${user.name}`}
              >
                <div
                  className="analytics__user-chip-avatar"
                  style={{ borderColor: user.avatarColor || '#38BDF8' }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} draggable={false} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <span className="analytics__user-chip-name">{user.name}:</span>
                <span className="analytics__user-chip-amount">€{amount.toFixed(2)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Category Breakdown & Rate Adjustment ── */}
      <section className="analytics__section">
        <CategorySpendingList
          categories={categories}
          tasks={tasks}
          completions={completions}
          baseRate={baseRate}
          complexityMultipliers={complexityMultipliers}
          onEditTask={onEditTask}
          selectedUserId={selectedUserId}
        />
      </section>
    </div>
  );
}

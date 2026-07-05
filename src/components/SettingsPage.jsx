import React from 'react';
import Avatar from './Avatar';
import './SettingsPage.css';

export default function SettingsPage({
  users = [],
  completions = [],
  onAddUser,
  onEditUser,
  onDeleteUser,
  onCashout,
  onBack,
}) {
  return (
    <div className="settings">
      {/* Header */}
      <header className="settings__header">
        <button className="settings__back" onClick={onBack} type="button">
          ← Back
        </button>
        <h1 className="settings__title">Settings</h1>
      </header>

      {/* ── Family Members ── */}
      <section className="settings__section">
        <div className="settings__section-header">
          <h2 className="settings__section-title">Family Members</h2>
          <button className="settings__add-btn" onClick={onAddUser} type="button">
            + Add Member
          </button>
        </div>

        <div className="settings__members">
          {users.map((user) => (
            <div key={user.id} className="settings__member">
              <Avatar user={user} size="md" />

              <div className="settings__member-info">
                <span className="settings__member-name">{user.name}</span>
                <div className="settings__member-stats">
                  <span className="settings__stat">
                    Balance: <strong className="settings__stat-balance">€{(user.balance ?? 0).toFixed(2)}</strong>
                  </span>
                  <span className="settings__stat">
                    Earned: <span className="settings__stat-earned">€{(user.totalEarned ?? 0).toFixed(2)}</span>
                  </span>
                  <span className="settings__stat">
                    Cashed out: <span className="settings__stat-cashout">€{(user.totalCashedOut ?? 0).toFixed(2)}</span>
                  </span>
                </div>
              </div>

              <div className="settings__member-actions">
                <button className="settings__icon-btn" onClick={() => onCashout?.(user)} title="Cash out" type="button">
                  💰
                </button>
                <button className="settings__icon-btn" onClick={() => onEditUser?.(user)} title="Edit" type="button">
                  ✏️
                </button>
                <button className="settings__icon-btn settings__icon-btn--danger" onClick={() => onDeleteUser?.(user.id)} title="Delete" type="button">
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <p className="settings__empty">No family members yet. Add someone to get started!</p>
          )}
        </div>
      </section>

      {/* ── History ── */}
      <section className="settings__section">
        <h2 className="settings__section-title">History</h2>

        {completions.length > 0 ? (
          <div className="settings__history">
            <div className="settings__history-header">
              <span>Date</span>
              <span>Task</span>
              <span>Who</span>
              <span>Amount</span>
            </div>
            {completions.map((entry, idx) => (
              <div key={entry.id || idx} className="settings__history-row">
                <span className="settings__history-date">
                  {entry.completedAt
                    ? (entry.completedAt.toDate ? entry.completedAt.toDate() : new Date(entry.completedAt)).toLocaleDateString()
                    : '—'}
                </span>
                <span className="settings__history-task">{entry.taskTitle || '—'}</span>
                <span className="settings__history-user">{entry.userName || '—'}</span>
                <span className="settings__history-amount">
                  €{typeof entry.amount === 'number' ? entry.amount.toFixed(2) : '0.00'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="settings__empty">No completed tasks yet.</p>
        )}
      </section>
    </div>
  );
}

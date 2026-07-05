import React from 'react';
import Avatar from './Avatar';
import './SettingsPage.css';

const CATEGORY_MAP = {
  cleaning: { label: 'Cleaning', emoji: '🧹' },
  kitchen: { label: 'Kitchen', emoji: '🍽️' },
  laundry: { label: 'Laundry', emoji: '👕' },
  shopping: { label: 'Shopping', emoji: '🛒' },
  bills: { label: 'Bills', emoji: '💰' },
  repairs: { label: 'Repairs', emoji: '🔧' },
  garden: { label: 'Garden', emoji: '🌱' },
  pets: { label: 'Pets', emoji: '🐾' },
  kids: { label: 'Kids', emoji: '🧒' },
  cars: { label: 'Cars', emoji: '🚗' },
  other: { label: 'Other', emoji: '📋' },
};

function getRecurrenceLabel(task) {
  if (task.type === 'ad-hoc') return 'One-time';
  if (task.type === 'always-available') return 'Always available';
  const rec = task.recurrence;
  if (!rec) return 'Recurring';
  if (rec.mode === 'interval_from_completion') {
    return `Every ${rec.intervalDays} day${rec.intervalDays > 1 ? 's' : ''}`;
  }
  if (rec.mode === 'fixed_interval') {
    return `Every ${rec.fixedIntervalValue} ${rec.fixedIntervalUnit}`;
  }
  if (rec.mode === 'custom_schedule') {
    return 'Custom schedule';
  }
  return 'Recurring';
}

export default function SettingsPage({
  users = [],
  tasks = [],
  completions = [],
  onAddUser,
  onEditUser,
  onDeleteUser,
  onEditTask,
  onDeleteTask,
  onAddTaskInCategory,
  onCashout,
  onSignOut,
  onBack,
}) {
  // Group tasks by category and recurrence type
  const groupedTasks = React.useMemo(() => {
    const groups = {};
    Object.keys(CATEGORY_MAP).forEach((catId) => {
      groups[catId] = { adHoc: [], recurring: [], alwaysAvailable: [] };
    });

    tasks.forEach((task) => {
      const catId = task.category || 'other';
      if (!groups[catId]) {
        groups[catId] = { adHoc: [], recurring: [], alwaysAvailable: [] };
      }
      if (task.type === 'recurring') {
        groups[catId].recurring.push(task);
      } else if (task.type === 'always-available') {
        groups[catId].alwaysAvailable.push(task);
      } else {
        groups[catId].adHoc.push(task);
      }
    });

    return groups;
  }, [tasks]);

  const renderTaskItem = (task) => (
    <div key={task.id} className="settings__task-item">
      <div className="settings__task-item-details">
        <span className="settings__task-item-title">{task.title}</span>
        <div className="settings__task-item-meta">
          <span className="settings__task-item-recurrence">{getRecurrenceLabel(task)}</span>
          <span className="settings__task-item-price">€{(task.price ?? 0).toFixed(2)}</span>
        </div>
      </div>
      <div className="settings__task-item-actions">
        <button className="settings__icon-btn" onClick={() => onEditTask?.(task)} title="Edit task" type="button">
          ✏️
        </button>
        <button className="settings__icon-btn settings__icon-btn--danger" onClick={() => onDeleteTask?.(task.id)} title="Delete task" type="button">
          🗑️
        </button>
      </div>
    </div>
  );

  return (
    <div className="settings">
      {/* Header */}
      <header className="settings__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="settings__back" onClick={onBack} type="button">
            ← Back
          </button>
          <h1 className="settings__title">Settings</h1>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onSignOut}
          type="button"
          style={{ minHeight: '44px' }}
        >
          Sign Out
        </button>
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

      {/* ── Manage Tasks ── */}
      <section className="settings__section">
        <div className="settings__section-header">
          <h2 className="settings__section-title">Manage Tasks</h2>
        </div>

        <div className="settings__tasks-categories">
          {Object.entries(CATEGORY_MAP).map(([catId, cat]) => {
            const catGroup = groupedTasks[catId] || { adHoc: [], recurring: [], alwaysAvailable: [] };
            const hasAdHoc = catGroup.adHoc.length > 0;
            const hasRecurring = catGroup.recurring.length > 0;
            const hasAlwaysAvailable = catGroup.alwaysAvailable.length > 0;
            const hasAnyTasks = hasAdHoc || hasRecurring || hasAlwaysAvailable;

            return (
              <div key={catId} className="settings__category-group">
                <div className="settings__category-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <h3 className="settings__category-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <span className="settings__category-emoji">{cat.emoji}</span> {cat.label}
                  </h3>
                  <button
                    className="settings__add-task-inline"
                    onClick={() => onAddTaskInCategory?.(catId)}
                    type="button"
                  >
                    + Add Task
                  </button>
                </div>
                
                <div className="settings__category-content">
                  {hasAlwaysAvailable && (
                    <div className="settings__type-group">
                      <h4 className="settings__type-title">Always Available</h4>
                      <div className="settings__tasks-list">
                        {catGroup.alwaysAvailable.map(renderTaskItem)}
                      </div>
                    </div>
                  )}

                  {hasRecurring && (
                    <div className="settings__type-group">
                      <h4 className="settings__type-title">Recurring</h4>
                      <div className="settings__tasks-list">
                        {catGroup.recurring.map(renderTaskItem)}
                      </div>
                    </div>
                  )}

                  {hasAdHoc && (
                    <div className="settings__type-group">
                      <h4 className="settings__type-title">One-time</h4>
                      <div className="settings__tasks-list">
                        {catGroup.adHoc.map(renderTaskItem)}
                      </div>
                    </div>
                  )}

                  {!hasAnyTasks && (
                    <p className="settings__category-empty" style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0, paddingLeft: '4px' }}>No tasks in this category.</p>
                  )}
                </div>
              </div>
            );
          })}
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

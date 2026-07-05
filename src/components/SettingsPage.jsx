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
  onCashout,
  onBack,
}) {
  // Group tasks by category and recurrence type
  const groupedTasks = React.useMemo(() => {
    const groups = {};
    Object.keys(CATEGORY_MAP).forEach((catId) => {
      groups[catId] = { adHoc: [], recurring: [] };
    });

    tasks.forEach((task) => {
      const catId = task.category || 'other';
      if (!groups[catId]) {
        groups[catId] = { adHoc: [], recurring: [] };
      }
      if (task.type === 'recurring') {
        groups[catId].recurring.push(task);
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

      {/* ── Manage Tasks ── */}
      <section className="settings__section">
        <div className="settings__section-header">
          <h2 className="settings__section-title">Manage Tasks</h2>
        </div>

        <div className="settings__tasks-categories">
          {Object.entries(groupedTasks).map(([catId, catGroup]) => {
            const hasAdHoc = catGroup.adHoc.length > 0;
            const hasRecurring = catGroup.recurring.length > 0;
            if (!hasAdHoc && !hasRecurring) return null;

            const cat = CATEGORY_MAP[catId] || { label: catId, emoji: '📋' };

            return (
              <div key={catId} className="settings__category-group">
                <h3 className="settings__category-title">
                  <span className="settings__category-emoji">{cat.emoji}</span> {cat.label}
                </h3>
                
                <div className="settings__category-content">
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
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <p className="settings__empty">No tasks yet. Create one from the main screen!</p>
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

import React, { useState, useMemo } from 'react';
import Avatar from './Avatar';
import { getTaskBaseCost } from '../data/pricing';
import './SettingsPage.css';

import { rrulestr } from 'rrule';

const COMMON_EMOJIS = ['🧹', '🍽️', '👕', '🛒', '💰', '🔧', '🌱', '🐾', '🧒', '🚗', '📋', '📚', '🛁', '🏠', '💻', '🔋', '🐱', '🐶', '🍕', '🔑'];

function getRecurrenceLabel(task) {
  if (task.type === 'ad-hoc') return 'One-time';
  if (task.type === 'always-available') return 'Always available';
  const rec = task.recurrence;
  if (!rec) return 'Recurring';

  // Check if it is the new RRULE format
  const rruleString = typeof rec === 'string'
    ? rec
    : (rec.rrule || null);

  if (rruleString) {
    try {
      const rule = rrulestr(rruleString);
      return rule.toText();
    } catch (e) {
      console.error('Failed to parse RRule for label:', e);
      return 'Recurring';
    }
  }

  if (rec.mode === 'interval_from_completion') {
    const val = rec.intervalValue || rec.intervalDays || 1;
    const unit = rec.intervalUnit || 'days';
    return `${val} ${unit} after completion`;
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
  categories = [],
  completions = [],
  baseRate = 10,
  onUpdateSettings,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onEditTask,
  onDeleteTask,
  onAddTaskInCategory,
  onAddCategory,
  onDeleteCategory,
  onRevertCompletion,
  onCashout,
  onSignOut,
  onBack,
}) {
  // Category management local state
  const [showAddCat, setShowAddCat] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState(COMMON_EMOJIS[0]);
  const [catError, setCatError] = useState('');
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  // Economy settings local state
  const [baseRateInput, setBaseRateInput] = useState(String(baseRate));
  const [baseRateSaved, setBaseRateSaved] = useState(false);

  // Keep input in sync if the prop changes from outside (e.g. another device)
  React.useEffect(() => {
    setBaseRateInput(String(baseRate));
  }, [baseRate]);

  // Group tasks by category and recurrence type
  const groupedTasks = useMemo(() => {
    const groups = {};
    categories.forEach((cat) => {
      groups[cat.id] = { adHoc: [], recurring: [], alwaysAvailable: [] };
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
  }, [tasks, categories]);

  const handleStartEditCategory = (cat) => {
    setEditingCategory(cat);
    setNewCatLabel(cat.label);
    setNewCatEmoji(cat.emoji);
    setShowAddCat(true);
    setCatError('');
  };

  const handleCancelCategoryEdit = () => {
    setShowAddCat(false);
    setEditingCategory(null);
    setNewCatLabel('');
    setNewCatEmoji(COMMON_EMOJIS[0]);
    setCatError('');
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!newCatLabel.trim()) {
      setCatError('Label is required');
      return;
    }
    onAddCategory?.({
      id: editingCategory?.id,
      label: newCatLabel.trim(),
      emoji: newCatEmoji,
    });
    setNewCatLabel('');
    setNewCatEmoji(COMMON_EMOJIS[0]);
    setEditingCategory(null);
    setShowAddCat(false);
    setCatError('');
  };

  const renderTaskItem = (task) => {
    const cat = categories.find(c => c.id === task.category);
    const emoji = task.icon || (cat ? cat.emoji : '📋');
    
    return (
      <div key={task.id} className="settings__task-item">
        <div className="settings__task-item-details">
          <span className="settings__task-item-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{emoji}</span>
            {task.isFavorite && <span style={{ fontSize: '14px' }}>⭐</span>}
            {task.title}
          </span>
        <div className="settings__task-item-meta">
          <span className="settings__task-item-recurrence">{getRecurrenceLabel(task)}</span>
          <span className="settings__task-item-price">€{getTaskBaseCost(task, baseRate).toFixed(2)}</span>
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
  };

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

      {/* ── Economy Settings ── */}
      <section className="settings__section">
        <div className="settings__section-header">
          <h2 className="settings__section-title">Economy</h2>
        </div>
        <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
            The <strong style={{ color: 'var(--color-text)' }}>Base Rate</strong> is the reward for a Low-complexity, 15-minute task.
            All task costs are calculated as a multiple of this value.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>€</span>
            <input
              id="base-rate-input"
              type="number"
              min="1"
              step="1"
              className="task-form__input"
              value={baseRateInput}
              onChange={(e) => { setBaseRateInput(e.target.value); setBaseRateSaved(false); }}
              style={{ width: '90px', flex: 'none', fontWeight: 700, fontSize: '16px', textAlign: 'right' }}
            />
            <button
              className="settings__add-btn"
              type="button"
              onClick={() => {
                const n = parseFloat(baseRateInput);
                if (!isNaN(n) && n > 0) {
                  onUpdateSettings?.({ base_rate: n });
                  setBaseRateSaved(true);
                  setTimeout(() => setBaseRateSaved(false), 2000);
                }
              }}
              style={{ minHeight: '38px', padding: '8px 16px' }}
            >
              {baseRateSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Low + 15m', formula: `€${Math.round(parseFloat(baseRateInput) * 1.0 * 1.0) || 0}` },
              { label: 'Medium + 30m', formula: `€${Math.round(parseFloat(baseRateInput) * 1.5 * 1.8) || 0}` },
              { label: 'High + 1h+', formula: `€${Math.round(parseFloat(baseRateInput) * 2.5 * 3.5) || 0}` },
            ].map(ex => (
              <span key={ex.label} style={{ fontSize: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', color: 'var(--color-text-secondary)' }}>
                {ex.label}: <strong style={{ color: 'var(--color-text)' }}>{ex.formula}</strong>
              </span>
            ))}
          </div>
        </div>
      </section>

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
                <button className="settings__icon-btn settings__icon-btn--danger" onClick={() => setDeletingUser(user)} title="Delete" type="button">
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

      {/* ── Manage Categories ── */}
      <section className="settings__section">
        <div className="settings__section-header">
          <h2 className="settings__section-title">Manage Categories</h2>
          {!showAddCat && (
            <button className="settings__add-btn" onClick={() => setShowAddCat(true)} type="button">
              + Add Category
            </button>
          )}
        </div>

        {showAddCat && (
          <form className="settings__cat-form" onSubmit={handleSaveCategory} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Emoji</span>
              <select className="task-form__select" value={newCatEmoji} onChange={(e) => setNewCatEmoji(e.target.value)} style={{ minWidth: '70px', padding: '8px 10px', minHeight: '38px' }}>
                {COMMON_EMOJIS.map(em => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Category Name</span>
              <input
                className="task-form__input"
                type="text"
                value={newCatLabel}
                onChange={(e) => { setNewCatLabel(e.target.value); setCatError(''); }}
                placeholder="e.g. Cooking"
                style={{ padding: '8px 12px', minHeight: '38px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="settings__back" onClick={handleCancelCategoryEdit} type="button" style={{ padding: '8px 14px', minHeight: '38px' }}>
                Cancel
              </button>
              <button className="settings__add-btn" type="submit" style={{ padding: '8px 16px', minHeight: '38px' }}>
                {editingCategory ? 'Save Changes' : 'Save'}
              </button>
            </div>
            {catError && <p style={{ color: 'var(--color-danger)', fontSize: '12px', width: '100%', margin: '4px 0 0 0' }}>{catError}</p>}
          </form>
        )}

        <div className="settings__categories-grid">
          {categories.map((cat) => (
            <div key={cat.id} className="settings__category-item">
              <div className="settings__category-label-group">
                <span className="settings__category-emoji">{cat.emoji}</span>
                <span className="settings__category-label">{cat.label}</span>
              </div>
              {cat.id !== 'other' && (
                <div className="settings__category-actions">
                  <button
                    className="settings__category-btn"
                    onClick={() => handleStartEditCategory(cat)}
                    title={`Edit ${cat.label}`}
                    type="button"
                  >
                    ✏️
                  </button>
                  <button
                    className="settings__category-btn settings__category-btn--danger"
                    onClick={() => setDeletingCategory(cat)}
                    title={`Delete ${cat.label}`}
                    type="button"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Manage Tasks ── */}
      <section className="settings__section">
        <div className="settings__section-header">
          <h2 className="settings__section-title">Manage Tasks</h2>
        </div>

        <div className="settings__tasks-categories">
          {categories.map((cat) => {
            const catGroup = groupedTasks[cat.id] || { adHoc: [], recurring: [], alwaysAvailable: [] };
            const hasAdHoc = catGroup.adHoc.length > 0;
            const hasRecurring = catGroup.recurring.length > 0;
            const hasAlwaysAvailable = catGroup.alwaysAvailable.length > 0;
            const hasAnyTasks = hasAdHoc || hasRecurring || hasAlwaysAvailable;

            return (
              <div key={cat.id} className="settings__category-group">
                <div className="settings__category-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <h3 className="settings__category-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <span className="settings__category-emoji">{cat.emoji}</span> {cat.label}
                  </h3>
                  <button
                    className="settings__add-task-inline"
                    onClick={() => onAddTaskInCategory?.(cat.id)}
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



      {deletingUser && (
        <div className="overlay-backdrop" onClick={() => setDeletingUser(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ animation: 'scaleIn var(--transition-base) ease', maxWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Delete Family Member?
            </h3>
            
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.45', margin: 0 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--color-text)' }}>{deletingUser.name}</strong>?
            </p>

            <div style={{ background: 'rgba(255, 82, 82, 0.05)', border: '1px solid rgba(255, 82, 82, 0.15)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
                This will permanently delete their profile and erase their current accumulated earnings of <strong>€{(deletingUser.balance ?? 0).toFixed(2)}</strong>. Historical completions will remain in logs but won't be editable under this user. This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeletingUser(null)} 
                type="button" 
                style={{ padding: '8px 16px', minHeight: '38px' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  onDeleteUser?.(deletingUser.id);
                  setDeletingUser(null);
                }} 
                type="button" 
                style={{ padding: '8px 16px', minHeight: '38px', background: 'var(--color-danger)', color: 'white', border: 'none' }}
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingCategory && (
        <div className="overlay-backdrop" onClick={() => setDeletingCategory(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ animation: 'scaleIn var(--transition-base) ease', maxWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Delete Category?
            </h3>
            
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.45', margin: 0 }}>
              Are you sure you want to delete the <span style={{ fontSize: '18px', marginRight: '4px' }}>{deletingCategory.emoji}</span> <strong style={{ color: 'var(--color-text)' }}>{deletingCategory.label}</strong> category?
            </p>

            <div style={{ background: 'rgba(108, 92, 231, 0.05)', border: '1px solid rgba(108, 92, 231, 0.15)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Any tasks currently belonging to this category will automatically be moved to the default <strong>📋 Other</strong> category so they aren't lost. This action is permanent.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeletingCategory(null)} 
                type="button" 
                style={{ padding: '8px 16px', minHeight: '38px' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  onDeleteCategory?.(deletingCategory.id);
                  setDeletingCategory(null);
                }} 
                type="button" 
                style={{ padding: '8px 16px', minHeight: '38px', background: 'var(--color-danger)', color: 'white', border: 'none' }}
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '11px', color: 'var(--color-text-muted)', opacity: 0.7, paddingBottom: '24px' }}>
        VisibleWork v1.7.0 • Built: {import.meta.env.VITE_BUILD_TIME || 'Development'}
      </div>
    </div>
  );
}

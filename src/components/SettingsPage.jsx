import React, { useState, useMemo } from 'react';
import EmojiPicker from 'emoji-picker-react';
import Avatar from './Avatar';
import AppEmoji from './AppEmoji';
import IconBadge, { CategoryIcon } from './IconBadge';
import { getTaskBaseCost } from '../data/pricing';
import './SettingsPage.css';

import { rrulestr } from 'rrule';

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
  baseRate = 0.10,
  complexityMultipliers = { LOW: 1.0, MEDIUM: 1.5, HIGH: 2.5 },
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
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatLabel, setEditingCatLabel] = useState('');
  const [editingCatEmoji, setEditingCatEmoji] = useState('📋');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📋');
  const [showCatEmojiPickerForId, setShowCatEmojiPickerForId] = useState(null); // null | 'new' | catId
  const [catError, setCatError] = useState('');
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  // Economy settings local state
  const [baseRateInput, setBaseRateInput] = useState(String(baseRate));
  const [lowMultInput, setLowMultInput] = useState(String(complexityMultipliers?.LOW ?? 1.0));
  const [medMultInput, setMedMultInput] = useState(String(complexityMultipliers?.MEDIUM ?? 1.5));
  const [highMultInput, setHighMultInput] = useState(String(complexityMultipliers?.HIGH ?? 2.5));
  const [baseRateSaved, setBaseRateSaved] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    economy: false,
    family: false,
    categories: false,
  });

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Collapsible task category groups inside Manage Tasks
  const [expandedTaskCats, setExpandedTaskCats] = useState({});

  const toggleTaskCat = (catId) => {
    setExpandedTaskCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Keep input in sync if the prop changes from outside (e.g. another device)
  React.useEffect(() => {
    setBaseRateInput(String(baseRate));
    setLowMultInput(String(complexityMultipliers?.LOW ?? 1.0));
    setMedMultInput(String(complexityMultipliers?.MEDIUM ?? 1.5));
    setHighMultInput(String(complexityMultipliers?.HIGH ?? 2.5));
  }, [baseRate, complexityMultipliers]);

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
    setEditingCatId(cat.id);
    setEditingCatLabel(cat.label);
    setEditingCatEmoji(cat.emoji || '📋');
    setShowAddCat(false);
    setShowCatEmojiPickerForId(null);
    setCatError('');
  };

  const handleCancelInlineCategory = () => {
    setEditingCatId(null);
    setEditingCatLabel('');
    setShowCatEmojiPickerForId(null);
    setCatError('');
  };

  const handleSaveInlineCategory = (e) => {
    e.preventDefault();
    if (!editingCatLabel.trim()) {
      setCatError('Label is required');
      return;
    }
    onAddCategory?.({
      id: editingCatId,
      label: editingCatLabel.trim(),
      emoji: editingCatEmoji || '📋',
    });
    setEditingCatId(null);
    setEditingCatLabel('');
    setShowCatEmojiPickerForId(null);
    setCatError('');
  };

  const handleSaveNewCategory = (e) => {
    e.preventDefault();
    if (!newCatLabel.trim()) {
      setCatError('Label is required');
      return;
    }
    onAddCategory?.({
      label: newCatLabel.trim(),
      emoji: newCatEmoji || '📋',
    });
    setNewCatLabel('');
    setNewCatEmoji('📋');
    setShowAddCat(false);
    setShowCatEmojiPickerForId(null);
    setCatError('');
  };

  const renderTaskItem = (task) => {
    const cat = categories.find(c => c.id === task.category);
    const emoji = task.icon || (cat ? cat.emoji : '📋');
    
    return (
      <div key={task.id} className="settings__task-item">
        <div className="settings__task-item-details">
          <span className="settings__task-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconBadge
              categoryId={!task.icon ? task.category : undefined}
              emoji={emoji}
              emojiOnly={!!task.icon}
              size={28}
              iconSize={15}
            />
            {task.isFavorite && <span style={{ fontSize: '14px' }}>⭐</span>}
            {task.title}
          </span>
        <div className="settings__task-item-meta">
          <span className="settings__task-item-recurrence">{getRecurrenceLabel(task)}</span>
          <span className="settings__task-item-price">€{getTaskBaseCost(task, baseRate, complexityMultipliers).toFixed(2)}</span>
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

      {/* ── Tasks ── */}
      <section className="settings__section">
        <div className="settings__section-header">
          <h2 className="settings__section-title">Tasks</h2>
        </div>

        <div className="settings__tasks-categories">
          {categories.map((cat) => {
            const catGroup = groupedTasks[cat.id] || { adHoc: [], recurring: [], alwaysAvailable: [] };
            const hasAdHoc = catGroup.adHoc.length > 0;
            const hasRecurring = catGroup.recurring.length > 0;
            const hasAlwaysAvailable = catGroup.alwaysAvailable.length > 0;
            const hasAnyTasks = hasAdHoc || hasRecurring || hasAlwaysAvailable;
            const totalTasksInCat = catGroup.adHoc.length + catGroup.recurring.length + catGroup.alwaysAvailable.length;
            const isCatExpanded = !!expandedTaskCats[cat.id];

            return (
              <div key={cat.id} className="settings__category-group">
                <div
                  className="settings__category-header-row"
                  onClick={() => toggleTaskCat(cat.id)}
                >
                  <h3 className="settings__category-title">
                    <span
                      className="settings__category-chevron"
                      style={{ transform: isCatExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      ▶
                    </span>
                    <CategoryIcon categoryId={cat.id} emoji={cat.emoji} size={18} />
                    {cat.label}
                    <span className="settings__category-count">
                      {totalTasksInCat}
                    </span>
                  </h3>
                  <button
                    className="settings__add-task-inline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTaskCats(prev => ({ ...prev, [cat.id]: true }));
                      onAddTaskInCategory?.(cat.id);
                    }}
                    type="button"
                  >
                    + Add Task
                  </button>
                </div>
                
                {isCatExpanded && (
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
                      <p className="settings__category-empty">No tasks in this category.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Economy Settings ── */}
      <section className="settings__section">
        <div
          className="settings__section-header"
          onClick={() => toggleSection('economy')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <h2 className="settings__section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', fontSize: '13px', transition: 'transform 0.2s ease', transform: expandedSections.economy ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--color-text-secondary)' }}>▶</span>
            Economy Settings
          </h2>
        </div>
        {expandedSections.economy && (
          <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              Task reward formula: <strong style={{ color: 'var(--color-text)' }}>Base Rate × Effort Coefficient × Duration (minutes)</strong>
            </p>

            {/* Base Rate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                Base Rate (per minute)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="task-form__input"
                  value={baseRateInput}
                  onChange={(e) => { setBaseRateInput(e.target.value); setBaseRateSaved(false); }}
                  style={{ width: '100px', flex: 'none', fontWeight: 700, fontSize: '16px', textAlign: 'right' }}
                />
              </div>
            </div>

            {/* Effort Coefficients */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                Effort Coefficients
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>🟢 Low</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="task-form__input"
                    value={lowMultInput}
                    onChange={(e) => { setLowMultInput(e.target.value); setBaseRateSaved(false); }}
                    style={{ fontWeight: 700, fontSize: '14px', padding: '6px 8px', minHeight: '34px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>🟡 Medium</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="task-form__input"
                    value={medMultInput}
                    onChange={(e) => { setMedMultInput(e.target.value); setBaseRateSaved(false); }}
                    style={{ fontWeight: 700, fontSize: '14px', padding: '6px 8px', minHeight: '34px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>🔴 High</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="task-form__input"
                    value={highMultInput}
                    onChange={(e) => { setHighMultInput(e.target.value); setBaseRateSaved(false); }}
                    style={{ fontWeight: 700, fontSize: '14px', padding: '6px 8px', minHeight: '34px' }}
                  />
                </div>
              </div>
            </div>

            <button
              className="settings__add-btn"
              type="button"
              onClick={() => {
                const rate = parseFloat(baseRateInput) || 0;
                const low = parseFloat(lowMultInput) || 0;
                const med = parseFloat(medMultInput) || 0;
                const high = parseFloat(highMultInput) || 0;
                if (!isNaN(rate) && rate >= 0 && !isNaN(low) && !isNaN(med) && !isNaN(high)) {
                  onUpdateSettings?.({
                    base_rate: rate,
                    complexity_multipliers: { LOW: low, MEDIUM: med, HIGH: high },
                  });
                  setBaseRateSaved(true);
                  setTimeout(() => setBaseRateSaved(false), 2000);
                }
              }}
              style={{ minHeight: '40px', padding: '8px 20px', alignSelf: 'flex-start' }}
            >
              {baseRateSaved ? '✓ Saved Economy Settings' : 'Save Economy Settings'}
            </button>

            {/* Formula preview chips */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {(() => {
                const r = parseFloat(baseRateInput) || 0;
                const l = parseFloat(lowMultInput) || 1.0;
                const m = parseFloat(medMultInput) || 1.5;
                const h = parseFloat(highMultInput) || 2.5;
                return [
                  { label: `Low (${l}×) + 5m`, cost: `€${(Math.round(r * l * 5 * 100) / 100).toFixed(2)}` },
                  { label: `Medium (${m}×) + 30m`, cost: `€${(Math.round(r * m * 30 * 100) / 100).toFixed(2)}` },
                  { label: `High (${h}×) + 60m`, cost: `€${(Math.round(r * h * 60 * 100) / 100).toFixed(2)}` },
                ].map(ex => (
                  <span key={ex.label} style={{ fontSize: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', color: 'var(--color-text-secondary)' }}>
                    {ex.label}: <strong style={{ color: 'var(--color-text)' }}>{ex.cost}</strong>
                  </span>
                ));
              })()}
            </div>
          </div>
        )}
      </section>

      {/* ── Family Members ── */}
      <section className="settings__section">
        <div
          className="settings__section-header"
          onClick={() => toggleSection('family')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <h2 className="settings__section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', fontSize: '13px', transition: 'transform 0.2s ease', transform: expandedSections.family ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--color-text-secondary)' }}>▶</span>
            Family Members
            <span style={{ fontSize: '12px', background: 'var(--color-surface-active)', color: 'var(--color-text-secondary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
              {users.length}
            </span>
          </h2>
        </div>

        {expandedSections.family && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                className="settings__add-btn"
                onClick={onAddUser}
                type="button"
                style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13px' }}
              >
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
          </div>
        )}
      </section>

      {/* ── Categories ── */}
      <section className="settings__section">
        <div
          className="settings__section-header"
          onClick={() => toggleSection('categories')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <h2 className="settings__section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', fontSize: '13px', transition: 'transform 0.2s ease', transform: expandedSections.categories ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--color-text-secondary)' }}>▶</span>
            Categories
            <span style={{ fontSize: '12px', background: 'var(--color-surface-active)', color: 'var(--color-text-secondary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
              {categories.length}
            </span>
          </h2>
        </div>

        {expandedSections.categories && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                className="settings__add-btn"
                onClick={() => {
                  setShowAddCat((prev) => !prev);
                  setEditingCatId(null);
                  setNewCatLabel('');
                  setNewCatEmoji('📋');
                  setShowCatEmojiPickerForId(null);
                }}
                type="button"
                style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13px' }}
              >
                + Add Category
              </button>
            </div>

            <div className="settings__categories-grid">
              {showAddCat && (
                <form
                  className="settings__category-item settings__category-item--editing"
                  onSubmit={handleSaveNewCategory}
                >
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="task-form__icon-btn"
                      onClick={() => setShowCatEmojiPickerForId(prev => prev === 'new' ? null : 'new')}
                      title="Choose Category Icon"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <AppEmoji symbol={newCatEmoji || '📋'} size={20} />
                    </button>
                    {showCatEmojiPickerForId === 'new' && (
                      <div className="settings__emoji-popover">
                        <EmojiPicker
                          onEmojiClick={(emojiData) => {
                            setNewCatEmoji(emojiData.emoji);
                            setShowCatEmojiPickerForId(null);
                          }}
                          width={260}
                          height={300}
                          lazyLoadEmojis={true}
                          searchDisabled={true}
                          skinTonesDisabled={true}
                        />
                      </div>
                    )}
                  </div>

                  <input
                    className="task-form__input"
                    type="text"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="New Category..."
                    autoFocus
                    style={{ flex: 1, minHeight: '36px', padding: '6px 10px', fontSize: '13px' }}
                  />

                  <div className="settings__category-actions">
                    <button
                      className="settings__category-btn"
                      type="submit"
                      title="Save category"
                      style={{ background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' }}
                    >
                      ✓
                    </button>
                    <button
                      className="settings__category-btn"
                      type="button"
                      onClick={() => { setShowAddCat(false); setShowCatEmojiPickerForId(null); }}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </form>
              )}

              {categories.map((cat) => {
                if (editingCatId === cat.id) {
                  return (
                    <form
                      key={cat.id}
                      className="settings__category-item settings__category-item--editing"
                      onSubmit={handleSaveInlineCategory}
                    >
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className="task-form__icon-btn"
                          onClick={() => setShowCatEmojiPickerForId(prev => prev === cat.id ? null : cat.id)}
                          title="Choose Category Icon"
                          style={{ width: '36px', height: '36px' }}
                        >
                          <AppEmoji symbol={editingCatEmoji || '📋'} size={20} />
                        </button>
                        {showCatEmojiPickerForId === cat.id && (
                          <div className="settings__emoji-popover">
                            <EmojiPicker
                              onEmojiClick={(emojiData) => {
                                setEditingCatEmoji(emojiData.emoji);
                                setShowCatEmojiPickerForId(null);
                              }}
                              width={260}
                              height={300}
                              lazyLoadEmojis={true}
                              searchDisabled={true}
                              skinTonesDisabled={true}
                            />
                          </div>
                        )}
                      </div>

                      <input
                        className="task-form__input"
                        type="text"
                        value={editingCatLabel}
                        onChange={(e) => setEditingCatLabel(e.target.value)}
                        placeholder="Category Name"
                        autoFocus
                        style={{ flex: 1, minHeight: '36px', padding: '6px 10px', fontSize: '13px' }}
                      />

                      <div className="settings__category-actions">
                        <button
                          className="settings__category-btn"
                          type="submit"
                          title="Save changes"
                          style={{ background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' }}
                        >
                          ✓
                        </button>
                        <button
                          className="settings__category-btn"
                          type="button"
                          onClick={handleCancelInlineCategory}
                          title="Cancel editing"
                        >
                          ✕
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div key={cat.id} className="settings__category-item">
                    <div className="settings__category-label-group">
                      <CategoryIcon categoryId={cat.id} emoji={cat.emoji} size={20} />
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
                );
              })}
            </div>
          </div>
        )}
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
            
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.45', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Are you sure you want to delete the <CategoryIcon categoryId={deletingCategory.id} emoji={deletingCategory.emoji} size={20} /> <strong style={{ color: 'var(--color-text)' }}>{deletingCategory.label}</strong> category?
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
        VisibleWork v2.5.2 • Built: {import.meta.env.VITE_BUILD_TIME || 'Development'}
      </div>
    </div>
  );
}

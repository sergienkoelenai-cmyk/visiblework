import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import Avatar from './Avatar';
import AppEmoji from './AppEmoji';
import { CategoryIcon } from './IconBadge';
import CategorySettingCard from './CategorySettingCard';
import ArchivedTasksSection from './ArchivedTasksSection';
import './SettingsPage.css';

export default function SettingsPage({
  users = [],
  tasks = [],
  categories = [],
  completions: _completions = [],
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
  onRevertCompletion: _onRevertCompletion,
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

  // Collapsible task category accordion cards
  const [expandedTaskCats, setExpandedTaskCats] = useState({});

  const toggleTaskCat = (catId) => {
    setExpandedTaskCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Keep input in sync if prop changes
  React.useEffect(() => {
    setBaseRateInput(String(baseRate));
    setLowMultInput(String(complexityMultipliers?.LOW ?? 1.0));
    setMedMultInput(String(complexityMultipliers?.MEDIUM ?? 1.5));
    setHighMultInput(String(complexityMultipliers?.HIGH ?? 2.5));
  }, [baseRate, complexityMultipliers]);

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

  return (
    <div className="settings settings--warm">
      {/* Top Header */}
      <header className="settings__header">
        <button className="settings__back-pill" onClick={onBack} type="button">
          ← Back
        </button>
        <h1 className="settings__title">Settings</h1>
        <div className="settings__header-spacer" />
      </header>

      {/* ── Tasks Section ── */}
      <section className="settings__section">
        {/* Top Prominent Action: Create Task Template */}
        <button
          type="button"
          className="settings__create-template-btn"
          onClick={() => onAddTaskInCategory?.(categories[0]?.id || '')}
        >
          🪸 + Create Task Template
        </button>

        <div className="settings__section-header">
          <h2 className="settings__section-title">Task Categories</h2>
        </div>

        {/* Task Category Accordion Cards */}
        <div className="settings__tasks-categories">
          {categories.map((cat) => {
            const catTasks = tasks.filter((t) => {
              if (t.isActive === false) return false;
              if (t.type === 'recurring' && !t.nextDueDate && t.lastCompletedAt) return false;
              return (t.category || 'other') === cat.id;
            });

            return (
              <CategorySettingCard
                key={cat.id}
                category={cat}
                tasks={catTasks}
                baseRate={baseRate}
                complexityMultipliers={complexityMultipliers}
                isExpanded={!!expandedTaskCats[cat.id]}
                onToggleExpand={toggleTaskCat}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onAddTaskInCategory={onAddTaskInCategory}
              />
            );
          })}
        </div>

        {/* Dedicated Completed & Expired Tasks Archive Section */}
        <ArchivedTasksSection
          tasks={tasks}
          categories={categories}
          baseRate={baseRate}
          complexityMultipliers={complexityMultipliers}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
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
          <div style={{ background: '#FFFFFF', border: '1px solid #FFE4E6', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 14px rgba(251, 113, 133, 0.05)' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#FFF1F2', border: '1px solid #FECDD3', padding: '8px 10px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#E11D48' }}>🟢 Low</span>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '8px 10px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706' }}>🟡 Medium</span>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#FEE2E2', border: '1px solid #FCA5A5', padding: '8px 10px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626' }}>🔴 High</span>
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
              style={{ minHeight: '40px', padding: '8px 20px', alignSelf: 'flex-start', background: '#FB7185', borderRadius: '9999px' }}
            >
              {baseRateSaved ? '✓ Saved Economy Settings' : 'Save Economy Settings'}
            </button>
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
            <span style={{ fontSize: '12px', background: '#FFF1F2', color: '#FB7185', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>
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
                style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13px', background: '#FB7185', borderRadius: '9999px' }}
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

      {/* ── Categories Management ── */}
      <section className="settings__section">
        <div
          className="settings__section-header"
          onClick={() => toggleSection('categories')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <h2 className="settings__section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', fontSize: '13px', transition: 'transform 0.2s ease', transform: expandedSections.categories ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--color-text-secondary)' }}>▶</span>
            Manage Categories
            <span style={{ fontSize: '12px', background: '#FFF1F2', color: '#FB7185', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>
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
                style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13px', background: '#FB7185', borderRadius: '9999px' }}
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
                    className={`task-form__input ${catError ? 'task-form__input--error' : ''}`}
                    type="text"
                    value={newCatLabel}
                    onChange={(e) => { setNewCatLabel(e.target.value); setCatError(''); }}
                    placeholder="New Category..."
                    autoFocus
                    style={{ flex: 1, minHeight: '36px', padding: '6px 10px', fontSize: '13px' }}
                  />

                  <div className="settings__category-actions">
                    <button
                      className="settings__category-btn"
                      type="submit"
                      title="Save category"
                      style={{ background: '#FB7185', color: '#fff', borderColor: '#FB7185' }}
                    >
                      ✓
                    </button>
                    <button
                      className="settings__category-btn"
                      type="button"
                      onClick={() => { setShowAddCat(false); setShowCatEmojiPickerForId(null); setCatError(''); }}
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
                        className={`task-form__input ${catError ? 'task-form__input--error' : ''}`}
                        type="text"
                        value={editingCatLabel}
                        onChange={(e) => { setEditingCatLabel(e.target.value); setCatError(''); }}
                        placeholder="Category Name"
                        autoFocus
                        style={{ flex: 1, minHeight: '36px', padding: '6px 10px', fontSize: '13px' }}
                      />

                      <div className="settings__category-actions">
                        <button
                          className="settings__category-btn"
                          type="submit"
                          title="Save changes"
                          style={{ background: '#FB7185', color: '#fff', borderColor: '#FB7185' }}
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

      {/* Delete Member Confirmation Modal */}
      {deletingUser && (
        <div className="overlay-backdrop" onClick={() => setDeletingUser(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ animation: 'scaleIn var(--transition-base) ease', maxWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#FFFFFF', border: '1px solid #FFE4E6', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Delete Family Member?
            </h3>
            
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.45', margin: 0 }}>
              Are you sure you want to delete <strong style={{ color: '#0F172A' }}>{deletingUser.name}</strong>?
            </p>

            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px 14px', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: '#EF4444', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>
                This will permanently delete their profile and erase their current accumulated earnings of <strong>€{(deletingUser.balance ?? 0).toFixed(2)}</strong>. Historical completions will remain in logs. This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeletingUser(null)} 
                type="button" 
                style={{ padding: '8px 16px', minHeight: '38px', borderRadius: '9999px' }}
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
                style={{ padding: '8px 16px', minHeight: '38px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '9999px' }}
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deletingCategory && (
        <div className="overlay-backdrop" onClick={() => setDeletingCategory(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ animation: 'scaleIn var(--transition-base) ease', maxWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#FFFFFF', border: '1px solid #FFE4E6', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Delete Category?
            </h3>
            
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.45', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Are you sure you want to delete the <CategoryIcon categoryId={deletingCategory.id} emoji={deletingCategory.emoji} size={20} /> <strong style={{ color: '#0F172A' }}>{deletingCategory.label}</strong> category?
            </p>

            <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', padding: '12px 14px', borderRadius: '12px' }}>
              <p style={{ fontSize: '12px', color: '#E11D48', margin: 0, lineHeight: 1.4 }}>
                Any tasks currently belonging to this category will automatically be moved to the default <strong>📋 Other</strong> category so they aren't lost.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeletingCategory(null)} 
                type="button" 
                style={{ padding: '8px 16px', minHeight: '38px', borderRadius: '9999px' }}
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
                style={{ padding: '8px 16px', minHeight: '38px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '9999px' }}
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Account & Navigation Footer ── */}
      <footer className="settings__account-footer">
        <h3 className="settings__account-title">Account</h3>
        <button
          type="button"
          className="settings__signout-btn"
          onClick={onSignOut}
        >
          Sign Out
        </button>
      </footer>

      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#94A3B8', opacity: 0.8, paddingBottom: '24px' }}>
        VisibleWork v2.7.1 • Built: {import.meta.env.VITE_BUILD_TIME || 'Development'}
      </div>
    </div>
  );
}

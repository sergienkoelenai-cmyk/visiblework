import React, { useState, useMemo } from 'react';
import TaskCard from './TaskCard';
import FavoriteTaskCard from './FavoriteTaskCard';
import './TaskList.css';

export default function TaskList({ tasks = [], categories = [], baseRate = 0.10, complexityMultipliers = null, onCompleteTask, showFavorites = false }) {
  // All categories start collapsed
  const [expandedCats, setExpandedCats] = useState({});

  const toggleCategory = (catId) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Separate favorites
  const favoriteTasks = showFavorites ? tasks.filter(t => t.isFavorite) : [];
  const regularTasks = showFavorites ? tasks.filter(t => !t.isFavorite) : tasks;

  // Group regular tasks by category ID
  const groupedTasks = useMemo(() => {
    const groups = {};
    regularTasks.forEach((task) => {
      const catId = task.category || 'other';
      if (!groups[catId]) {
        groups[catId] = [];
      }
      groups[catId].push(task);
    });
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, showFavorites]);

  // Helper to find category details
  const getCategoryDetails = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat || { label: categoryId, emoji: '📋' };
  };

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="task-list task-list--empty">
        <div className="task-list__empty-state">
          <span className="task-list__empty-emoji">🎉</span>
          <p className="task-list__empty-title">All done!</p>
          <p className="task-list__empty-subtitle">No tasks right now. Enjoy your free time!</p>
        </div>
      </div>
    );
  }

  const renderCategorySection = (cat, catTasks) => {
    if (catTasks.length === 0) return null;
    const isExpanded = expandedCats[cat.id] ?? false;

    return (
      <section key={cat.id} className="task-list__group">
        <h3
          className="task-list__group-label"
          onClick={() => toggleCategory(cat.id)}
          style={{
            color: 'var(--color-text)',
            textTransform: 'none',
            fontSize: '16px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '6px',
            marginBottom: isExpanded ? '4px' : '0',
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            className="task-list__chevron"
            style={{
              display: 'inline-block',
              marginRight: '6px',
              fontSize: '12px',
              transition: 'transform 0.2s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              color: 'var(--color-text-secondary)',
            }}
          >
            ▶
          </span>
          <span style={{ marginRight: '6px' }}>{cat.emoji}</span>
          {cat.label}
          <span className="task-list__group-count" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)', marginLeft: '8px', fontSize: '12px', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            {catTasks.length}
          </span>
        </h3>

        {isExpanded && (
          <div className="task-list__cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {catTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={{ ...task, categoryEmoji: cat.emoji }}
                baseRate={baseRate}
                complexityMultipliers={complexityMultipliers}
                statusLabel={task.status}
                onComplete={onCompleteTask}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="task-list">
      {/* ── Favorites Section ── */}
      {favoriteTasks.length > 0 && (
        <section className="task-list__favorites">
          <h3
            className="task-list__group-label"
            style={{
              color: 'var(--color-warning, #f0b429)',
              textTransform: 'none',
              fontSize: '16px',
              borderBottom: '2px solid rgba(240, 180, 41, 0.3)',
              paddingBottom: '6px',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ marginRight: '6px' }}>⭐</span>
            Favorites
            <span className="task-list__group-count" style={{ background: 'rgba(240, 180, 41, 0.12)', color: 'var(--color-warning, #f0b429)', marginLeft: '8px', fontSize: '12px', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              {favoriteTasks.length}
            </span>
          </h3>
          <div className="task-list__cards" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {favoriteTasks.map((task) => {
              const catDetails = getCategoryDetails(task.category || 'other');
              return (
                <FavoriteTaskCard
                  key={task.id}
                  task={{ ...task, categoryEmoji: catDetails.emoji }}
                  baseRate={baseRate}
                  complexityMultipliers={complexityMultipliers}
                  onComplete={onCompleteTask}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Categorized Sections (collapsed by default) ── */}
      {categories.map((cat) => {
        const catTasks = groupedTasks[cat.id] || [];
        return renderCategorySection(cat, catTasks);
      })}

      {/* Render tasks in categories not predefined in categories prop, if any */}
      {Object.entries(groupedTasks).map(([catId, catTasks]) => {
        const isPredefined = categories.some(c => c.id === catId);
        if (isPredefined || catTasks.length === 0) return null;

        const catDetails = getCategoryDetails(catId);
        return renderCategorySection({ id: catId, ...catDetails }, catTasks);
      })}
    </div>
  );
}

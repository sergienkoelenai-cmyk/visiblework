import React, { useState, useMemo } from 'react';
import FavoriteTaskCard from './FavoriteTaskCard';
import { CategoryIcon } from './IconBadge';
import './TaskList.css';

export default function TaskList({ tasks = [], users = [], categories = [], baseRate = 0.10, complexityMultipliers = null, onCompleteTask, showFavorites = false }) {
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
        >
          <span
            className="task-list__chevron"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ▶
          </span>
          <CategoryIcon categoryId={cat.id} emoji={cat.emoji} size={16} />
          {cat.label}
          <span className="task-list__group-count">{catTasks.length}</span>
        </h3>

        {isExpanded && (
          <div className="task-list__cards">
            {catTasks.map((task) => (
              <FavoriteTaskCard
                key={task.id}
                task={{ ...task, categoryEmoji: cat.emoji }}
                users={users}
                baseRate={baseRate}
                complexityMultipliers={complexityMultipliers}
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
          <h3 className="task-list__group-label" style={{ color: 'var(--color-warning, #f0b429)' }}>
            <span>⭐</span>
            Favorites
            <span className="task-list__group-count" style={{ background: 'rgba(240,180,41,0.12)', color: 'var(--color-warning, #f0b429)' }}>
              {favoriteTasks.length}
            </span>
          </h3>
          <div className="task-list__cards">
            {favoriteTasks.map((task) => {
              const catDetails = getCategoryDetails(task.category || 'other');
              return (
                <FavoriteTaskCard
                  key={task.id}
                  task={{ ...task, categoryEmoji: catDetails.emoji }}
                  users={users}
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

import React, { useState, useMemo } from 'react';
import FavoriteTaskCard from './FavoriteTaskCard';
import { CategoryIcon } from './IconBadge';
import './TaskList.css';

export default function TaskList({
  tasks = [],
  users = [],
  categories = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  onCompleteTask,
  showFavorites = false,
  sectionLabel = null,
}) {
  // All categories start collapsed
  const [expandedCats, setExpandedCats] = useState({});

  const toggleCategory = (catId) => {
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Separate favorites
  const favoriteTasks = showFavorites ? tasks.filter((t) => t.isFavorite) : [];
  const regularTasks = showFavorites ? tasks.filter((t) => !t.isFavorite) : tasks;

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
  }, [regularTasks]);

  // Helper to find category details
  const getCategoryDetails = React.useCallback((categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat || { label: categoryId, emoji: '📋' };
  }, [categories]);

  // Filter categories that actually have regular tasks
  const activeCategoryList = useMemo(() => {
    const list = categories.filter((cat) => (groupedTasks[cat.id] || []).length > 0);

    // Also include any non-predefined categories with tasks
    Object.entries(groupedTasks).forEach(([catId, catTasks]) => {
      const isPredefined = categories.some((c) => c.id === catId);
      if (!isPredefined && catTasks.length > 0) {
        const details = getCategoryDetails(catId);
        list.push({ id: catId, ...details });
      }
    });

    return list;
  }, [categories, groupedTasks, getCategoryDetails]);

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

  return (
    <div className="task-list">
      {/* ── Favorites Section ── */}
      {favoriteTasks.length > 0 && (
        <section className="task-list__section">
          <span className="task-list__section-label task-list__section-label--favorite">
            ⭐ FAVORITES
          </span>
          <div className="task-list__cards task-list__cards--favorites">
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

      {/* ── Categories Accordion Card Container ── */}
      {activeCategoryList.length > 0 && (
        <section className="task-list__section">
          {sectionLabel ? (
            <span className="task-list__section-label">{sectionLabel}</span>
          ) : (
            showFavorites && favoriteTasks.length > 0 && (
              <span className="task-list__section-label">CATEGORIES</span>
            )
          )}

          <div className="task-list__categories-card">
            {activeCategoryList.map((cat) => {
              const catTasks = groupedTasks[cat.id] || [];
              const isExpanded = expandedCats[cat.id] ?? false;

              return (
                <div key={cat.id} className="task-list__category-item">
                  <div
                    className={`task-list__category-header ${isExpanded ? 'task-list__category-header--expanded' : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleCategory(cat.id);
                      }
                    }}
                  >
                    <div className="task-list__category-left">
                      <span
                        className={`task-list__chevron ${isExpanded ? 'task-list__chevron--open' : ''}`}
                      >
                        {isExpanded ? '▾' : '▸'}
                      </span>
                      <CategoryIcon categoryId={cat.id} emoji={cat.emoji} size={20} />
                      <span className="task-list__category-title">{cat.label}</span>
                    </div>

                    <div className="task-list__category-right">
                      <span className="task-list__category-count">{catTasks.length}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="task-list__cards task-list__cards--category">
                      {catTasks.map((task) => (
                        <FavoriteTaskCard
                          key={task.id}
                          task={{ ...task, categoryEmoji: cat.emoji }}
                          users={users}
                          baseRate={baseRate}
                          complexityMultipliers={complexityMultipliers}
                          onComplete={onCompleteTask}
                          isNested
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

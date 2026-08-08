import React, { useState, useMemo } from 'react';
import IconBadge from './IconBadge';
import AppEmoji from './AppEmoji';
import { getTaskDurationMinutes, formatDurationHoursMinutes } from '../data/pricing';
import './CategorySpendingList.css';

export default function CategorySpendingList({
  categories = [],
  tasks = [],
  completions = [],
  _onEditTask,
  selectedUserId = null,
}) {
  // Track expanded category IDs
  const [expandedCategories, setExpandedCategories] = useState({});

  // Toggle category expansion
  const toggleExpand = (catId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Map of taskId -> task for quick lookup
  const taskMap = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (t.id) map[t.id] = t;
    });
    return map;
  }, [tasks]);

  // Filter completions by selected user if active
  const filteredCompletions = useMemo(() => {
    if (!selectedUserId) return completions;
    return completions.filter((c) => c.userId === selectedUserId);
  }, [completions, selectedUserId]);

  // Calculate total period spent across filtered completions
  const totalPeriodSpent = useMemo(() => {
    return filteredCompletions.reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [filteredCompletions]);

  // Calculate task-level stats (completion count, total amount spent, and total effort minutes)
  const taskStatsMap = useMemo(() => {
    const map = {};
    filteredCompletions.forEach((c) => {
      if (!c.taskId) return;
      if (!map[c.taskId]) {
        map[c.taskId] = { count: 0, totalSpent: 0, totalMinutes: 0 };
      }
      const task = taskMap[c.taskId];
      const baseMins = task ? getTaskDurationMinutes(task) : 0;
      const mult = (c.multiplier !== null && c.multiplier !== undefined) ? Number(c.multiplier) : 1.0;
      const mins = baseMins * mult;

      map[c.taskId].count += 1;
      map[c.taskId].totalSpent += c.amount || 0;
      map[c.taskId].totalMinutes += mins;
    });
    return map;
  }, [filteredCompletions, taskMap]);

  // Build categorized items
  const categoryData = useMemo(() => {
    // Group completions by category ID
    const spendingMap = {};
    const countMap = {};
    const minutesMap = {};

    filteredCompletions.forEach((c) => {
      // Find category ID from completion record or linked task
      let catId = c.categoryId;
      if (!catId && c.taskId && taskMap[c.taskId]) {
        catId = taskMap[c.taskId].category;
      }
      if (!catId) catId = 'other';

      const task = c.taskId ? taskMap[c.taskId] : null;
      const baseMins = task ? getTaskDurationMinutes(task) : 0;
      const mult = (c.multiplier !== null && c.multiplier !== undefined) ? Number(c.multiplier) : 1.0;
      const mins = baseMins * mult;

      spendingMap[catId] = (spendingMap[catId] || 0) + (c.amount || 0);
      countMap[catId] = (countMap[catId] || 0) + 1;
      minutesMap[catId] = (minutesMap[catId] || 0) + mins;
    });

    // Group tasks by category ID
    const tasksByCategory = {};
    tasks.forEach((t) => {
      const catId = t.category || 'other';
      if (!tasksByCategory[catId]) tasksByCategory[catId] = [];
      tasksByCategory[catId].push(t);
    });

    // Ensure completions for deleted tasks still show up in category breakdown
    filteredCompletions.forEach((c) => {
      if (c.taskId && !taskMap[c.taskId]) {
        let catId = c.categoryId || 'other';
        if (!tasksByCategory[catId]) tasksByCategory[catId] = [];
        if (!tasksByCategory[catId].some((t) => t.id === c.taskId)) {
          tasksByCategory[catId].push({
            id: c.taskId,
            title: c.taskTitle || 'Deleted Task',
            category: catId,
            icon: '📋',
            isDeleted: true,
          });
        }
      }
    });

    // Merge categories list with spending data
    const list = categories.map((cat) => {
      const catSpent = spendingMap[cat.id] || 0;
      const catCount = countMap[cat.id] || 0;
      const catMinutes = minutesMap[cat.id] || 0;
      const catTasks = tasksByCategory[cat.id] || [];
      const pct = totalPeriodSpent > 0 ? (catSpent / totalPeriodSpent) * 100 : 0;

      return {
        ...cat,
        spent: catSpent,
        completionCount: catCount,
        totalMinutes: catMinutes,
        percentage: pct,
        tasks: catTasks,
      };
    });

    // Check if there are tasks/completions in 'other' or uncategorized not covered in categories array
    const knownCatIds = new Set(categories.map((c) => c.id));
    Object.keys(tasksByCategory).forEach((catId) => {
      if (!knownCatIds.has(catId)) {
        const catSpent = spendingMap[catId] || 0;
        const catCount = countMap[catId] || 0;
        const catMinutes = minutesMap[catId] || 0;
        const catTasks = tasksByCategory[catId] || [];
        const pct = totalPeriodSpent > 0 ? (catSpent / totalPeriodSpent) * 100 : 0;

        list.push({
          id: catId,
          label: catId === 'other' ? 'Other' : catId,
          emoji: '📋',
          spent: catSpent,
          completionCount: catCount,
          totalMinutes: catMinutes,
          percentage: pct,
          tasks: catTasks,
        });
      }
    });

    // Sort categories: highest expenditure first, then by task count, then by label
    return list.sort((a, b) => {
      if (b.spent !== a.spent) return b.spent - a.spent;
      if (b.completionCount !== a.completionCount) return b.completionCount - a.completionCount;
      return a.label.localeCompare(b.label);
    });
  }, [categories, tasks, filteredCompletions, totalPeriodSpent, taskMap]);

  return (
    <div className="category-spending">
      <div className="category-spending__header">
        <h2 className="category-spending__title">Category Breakdown & Rates</h2>
        <span className="category-spending__subtitle">
          {categoryData.length} categories
        </span>
      </div>

      <div className="category-spending__list">
        {categoryData.map((cat) => {
          const isExpanded = !!expandedCategories[cat.id];
          const formattedPct = Math.round(cat.percentage);

          // Filter only tasks that have at least 1 completion in this period, sorted by highest expenditure first
          const completedTasks = cat.tasks
            .filter((t) => (taskStatsMap[t.id]?.count || 0) > 0)
            .sort((a, b) => {
              const statsA = taskStatsMap[a.id] || { count: 0, totalSpent: 0 };
              const statsB = taskStatsMap[b.id] || { count: 0, totalSpent: 0 };
              if (statsB.totalSpent !== statsA.totalSpent) return statsB.totalSpent - statsA.totalSpent;
              if (statsB.count !== statsA.count) return statsB.count - statsA.count;
              return a.title.localeCompare(b.title);
            });

          // Total completions performed across all tasks in this category
          const totalCompletionsCount = cat.completionCount || completedTasks.reduce(
            (sum, t) => sum + (taskStatsMap[t.id]?.count || 0),
            0
          );

          return (
            <div
              key={cat.id}
              className={`category-card ${isExpanded ? 'category-card--expanded' : ''}`}
            >
              {/* Category Card Header Bar */}
              <div
                className="category-card__header"
                onClick={() => toggleExpand(cat.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(cat.id);
                  }
                }}
              >
                {/* Left: Emoji Badge + Category Name */}
                <div className="category-card__left">
                  <IconBadge categoryId={cat.id} emoji={cat.emoji} size={36} iconSize={18} />
                  <div className="category-card__name-group">
                    <span className="category-card__name">{cat.label}</span>
                    <span className="category-card__task-count">
                      {totalCompletionsCount} {totalCompletionsCount === 1 ? 'task' : 'tasks'} completed • ⏱️ {formatDurationHoursMinutes(cat.totalMinutes)}
                    </span>
                  </div>
                </div>

                {/* Center: Visual Progress Bar */}
                <div className="category-card__center">
                  <div className="category-card__progress-bar-track">
                    <div
                      className="category-card__progress-bar-fill"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="category-card__percentage-label">
                    {formattedPct}%
                  </span>
                </div>

                {/* Right: Total Category Expenditure + Chevron */}
                <div className="category-card__right">
                  <span className="category-card__cost">
                    €{cat.spent.toFixed(2)}
                  </span>
                  <span className={`category-card__chevron ${isExpanded ? 'category-card__chevron--expanded' : ''}`}>
                    ▾
                  </span>
                </div>
              </div>

              {/* Expanded Collapsible Section: Inline Task Breakdown & Rates */}
              {isExpanded && (
                <div className="category-card__expanded">
                  <div className="category-card__tasks-header">
                    <span>Completed Tasks ({completedTasks.length})</span>
                    <span>Total Time, Payout & Times Done</span>
                  </div>

                  {completedTasks.length > 0 ? (
                    <div className="category-card__tasks-list">
                      {completedTasks.map((t) => {
                        const stats = taskStatsMap[t.id] || { count: 0, totalSpent: 0, totalMinutes: 0 };

                        return (
                          <div key={t.id} className="category-task-row">
                            <div className="category-task-row__left">
                              <AppEmoji symbol={t.icon || cat.emoji || '📋'} size={18} />
                              <span className="category-task-row__title" title={t.title}>{t.title}</span>
                              {t.custom_cost !== null && t.custom_cost !== undefined && (
                                <span className="category-task-row__custom-tag">custom</span>
                              )}
                            </div>

                            <div className="category-task-row__right">
                              <span className="category-task-row__count-badge">
                                {stats.count}× completed
                              </span>
                              <span className="category-task-row__time-badge">
                                ⏱️ {formatDurationHoursMinutes(stats.totalMinutes)}
                              </span>
                              <span className="category-task-row__price">
                                €{stats.totalSpent.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="category-card__empty-tasks">
                      No completed tasks in this category during this period.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {categoryData.length === 0 && (
          <p className="category-spending__empty">No categories available.</p>
        )}
      </div>
    </div>
  );
}

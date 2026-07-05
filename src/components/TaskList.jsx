import React from 'react';
import TaskCard from './TaskCard';
import './TaskList.css';

export default function TaskList({ tasks = [], categories = [], onCompleteTask }) {
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

  // 1. Group tasks by category ID
  const groupedTasks = React.useMemo(() => {
    const groups = {};
    tasks.forEach((task) => {
      const catId = task.category || 'other';
      if (!groups[catId]) {
        groups[catId] = [];
      }
      groups[catId].push(task);
    });
    return groups;
  }, [tasks]);

  // Helper to find category details
  const getCategoryDetails = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat || { label: categoryId, emoji: '📋' };
  };

  return (
    <div className="task-list">
      {categories.map((cat) => {
        const catTasks = groupedTasks[cat.id] || [];
        if (catTasks.length === 0) return null;

        return (
          <section key={cat.id} className="task-list__group">
            <h3 className="task-list__group-label" style={{ color: 'var(--color-text)', textTransform: 'none', fontSize: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '4px' }}>
              <span style={{ marginRight: '6px' }}>{cat.emoji}</span>
              {cat.label}
              <span className="task-list__group-count" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)', marginLeft: '8px', fontSize: '12px', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                {catTasks.length}
              </span>
            </h3>
            
            <div className="task-list__cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {catTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={{ ...task, categoryEmoji: cat.emoji }}
                  statusLabel={task.status}
                  onComplete={onCompleteTask}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Render tasks in categories not predefined in categories prop, if any */}
      {Object.entries(groupedTasks).map(([catId, catTasks]) => {
        const isPredefined = categories.some(c => c.id === catId);
        if (isPredefined || catTasks.length === 0) return null;

        const catDetails = getCategoryDetails(catId);

        return (
          <section key={catId} className="task-list__group">
            <h3 className="task-list__group-label" style={{ color: 'var(--color-text)', textTransform: 'none', fontSize: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '4px' }}>
              <span style={{ marginRight: '6px' }}>{catDetails.emoji}</span>
              {catDetails.label}
              <span className="task-list__group-count" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)', marginLeft: '8px', fontSize: '12px', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                {catTasks.length}
              </span>
            </h3>
            
            <div className="task-list__cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {catTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={{ ...task, categoryEmoji: catDetails.emoji }}
                  statusLabel={task.status}
                  onComplete={onCompleteTask}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

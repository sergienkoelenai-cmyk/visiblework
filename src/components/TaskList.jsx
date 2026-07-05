import React from 'react';
import TaskCard from './TaskCard';
import './TaskList.css';

/**
 * Groups tasks by their pre-computed status field.
 * Status is set in App.jsx via getTaskStatus() before passing here.
 */
function groupTasks(tasks) {
  const overdue = [];
  const dueToday = [];
  const upcoming = [];

  tasks.forEach((task) => {
    switch (task.status) {
      case 'overdue':
        overdue.push(task);
        break;
      case 'due_today':
        dueToday.push(task);
        break;
      case 'upcoming':
      default:
        upcoming.push(task);
        break;
    }
  });

  return { overdue, dueToday, upcoming };
}

export default function TaskList({ tasks = [], categories = [], onCompleteTask, onEditTask, onDeleteTask }) {
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

  const { overdue, dueToday, upcoming } = groupTasks(tasks);

  // Helper to find category emoji
  const getCategoryEmoji = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.emoji : '📋';
  };

  const renderCard = (task, statusLabel) => (
    <TaskCard
      key={task.id}
      task={{ ...task, categoryEmoji: getCategoryEmoji(task.category) }}
      statusLabel={statusLabel}
      onComplete={onCompleteTask}
    />
  );

  return (
    <div className="task-list">
      {overdue.length > 0 && (
        <section className="task-list__group">
          <h3 className="task-list__group-label task-list__group-label--overdue">
            ⏰ Overdue
            <span className="task-list__group-count">{overdue.length}</span>
          </h3>
          <div className="task-list__cards">
            {overdue.map((task) => renderCard(task, 'overdue'))}
          </div>
        </section>
      )}

      {dueToday.length > 0 && (
        <section className="task-list__group">
          <h3 className="task-list__group-label task-list__group-label--due-today">
            📅 Due Today
            <span className="task-list__group-count">{dueToday.length}</span>
          </h3>
          <div className="task-list__cards">
            {dueToday.map((task) => renderCard(task, 'due-today'))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="task-list__group">
          <h3 className="task-list__group-label task-list__group-label--upcoming">
            🗓️ Upcoming
            <span className="task-list__group-count">{upcoming.length}</span>
          </h3>
          <div className="task-list__cards">
            {upcoming.map((task) => renderCard(task, 'upcoming'))}
          </div>
        </section>
      )}
    </div>
  );
}

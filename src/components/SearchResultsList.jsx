import React from 'react';
import IconBadge from './IconBadge';
import { getTaskBaseCost } from '../data/pricing';
import './SearchResultsList.css';

export default function SearchResultsList({
  searchResults = [],
  searchQuery = '',
  baseRate = 0.10,
  complexityMultipliers = null,
  onSelectTask,
}) {
  if (searchResults.length === 0) {
    return (
      <div className="search-results-empty">
        <div className="search-results-empty__card">
          <span className="search-results-empty__icon">🔍</span>
          <h3 className="search-results-empty__title">
            No tasks found for "{searchQuery}"
          </h3>
          <p className="search-results-empty__subtitle">
            Try searching for another keyword, category, or task title.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="search-results__header">
        <span className="search-results__count-label">
          Search Results ({searchResults.length})
        </span>
      </div>

      <div className="search-results__card-list">
        {searchResults.map((task) => {
          const emoji = task.icon || task.categoryEmoji || '📋';
          const cost = getTaskBaseCost(task, baseRate, complexityMultipliers);

          return (
            <div
              key={task.id}
              className="search-result-item"
              onClick={() => onSelectTask?.(task)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectTask?.(task);
                }
              }}
            >
              <div className="search-result-item__left">
                <IconBadge
                  categoryId={!task.icon ? task.category : undefined}
                  emoji={emoji}
                  emojiOnly={!!task.icon}
                  size={38}
                  iconSize={18}
                />
                <div className="search-result-item__info">
                  <span className="search-result-item__title">{task.title}</span>
                  <div className="search-result-item__badges">
                    {task.isFavorite && (
                      <span className="origin-badge origin-badge--favorite">
                        ⭐ Favorite
                      </span>
                    )}

                    {task.isFeatPool && (
                      <span className="origin-badge origin-badge--feat">
                        🔥 Feat Pool
                      </span>
                    )}

                    {task.categoryName && (
                      <span className="origin-badge origin-badge--category">
                        📁 {task.categoryName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="search-result-item__right">
                <span className="search-result-item__reward">
                  €{cost.toFixed(2)}
                </span>
                <span className="search-result-item__action-arrow">›</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

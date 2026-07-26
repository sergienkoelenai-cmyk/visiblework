import React from 'react';
import { isFeat, isTaskCurrentlyAvailable } from '../data/feats.js';
import './FeatsWidget.css';

export default function FeatsWidget({ tasks = [], onOpenGenerator }) {
  // Count currently available feats & tasks
  const availableTasks = tasks.filter(isTaskCurrentlyAvailable);
  const featCount = availableTasks.filter(isFeat).length;
  const totalAvailable = availableTasks.length;

  return (
    <div className="feats-widget theme-feats">
      <div className="feats-widget__left">
        <div className="feats-widget__icon-box">
          🎲
        </div>
        <div className="feats-widget__content">
          <h3 className="feats-widget__title">
            Ready for a Feat?
          </h3>
          <p className="feats-widget__subtitle">
            {featCount > 0
              ? `🔥 ${featCount} Feat${featCount > 1 ? 's' : ''} available today!`
              : totalAvailable > 0
                ? `${totalAvailable} task${totalAvailable > 1 ? 's' : ''} available to draw`
                : 'No tasks due right now'}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="feats-widget__btn"
        onClick={onOpenGenerator}
      >
        <span>Draw a Task</span> 🎲
      </button>
    </div>
  );
}

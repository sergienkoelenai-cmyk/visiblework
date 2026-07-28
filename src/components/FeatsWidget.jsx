import React from 'react';
import { isFeat, isEligibleForDraw, getTaskAllowInFeats } from '../data/feats.js';
import './FeatsWidget.css';

export default function FeatsWidget({ tasks = [], onOpenGenerator, onOpenSelection }) {
  // Count eligible tasks for generator and active one-off tasks for selection showcase
  const eligibleTasks = tasks.filter(isEligibleForDraw);
  const activeOneOffTasks = tasks.filter((t) => {
    if (t.isActive === false) return false;
    if (!getTaskAllowInFeats(t)) return false;
    return t.is_one_off === true || t.type === 'ad-hoc' || (!t.recurrence && t.type !== 'always-available');
  });

  const featCount = eligibleTasks.filter(isFeat).length;
  const totalEligible = eligibleTasks.length;

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
              ? `🔥 ${featCount} Feat${featCount > 1 ? 's' : ''} & ${activeOneOffTasks.length} Quest${activeOneOffTasks.length !== 1 ? 's' : ''} available!`
              : totalEligible > 0
                ? `${totalEligible} task${totalEligible > 1 ? 's' : ''} available to draw`
                : 'No active feats due right now'}
          </p>
        </div>
      </div>

      <div className="feats-widget__btn-group">
        <button
          type="button"
          className="feats-widget__btn feats-widget__btn--draw"
          onClick={onOpenGenerator}
        >
          <span>Draw Task</span> 🎲
        </button>

        <button
          type="button"
          className="feats-widget__btn feats-widget__btn--choose"
          onClick={onOpenSelection}
        >
          <span>Choose Feat</span> 🎯
        </button>
      </div>
    </div>
  );
}


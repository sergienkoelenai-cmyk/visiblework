import React from 'react';
import { isEligibleForDraw } from '../data/feats.js';
import './FeatsWidget.css';

export default function FeatsWidget({ tasks = [], onOpenGenerator, onOpenSelection }) {
  // Count eligible tasks for generator and selection showcase (all tasks in Feat pool)
  const eligibleTasks = tasks.filter(isEligibleForDraw);
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
            {totalEligible > 0
              ? `🔥 ${totalEligible} task${totalEligible > 1 ? 's' : ''} available in Feat pool`
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


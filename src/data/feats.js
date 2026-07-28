/**
 * feats.js
 *
 * Core engine for Feat qualification, availability checking,
 * energy/time candidate filtering, and recency-weighted task generation.
 */

import { rrulestr } from 'rrule';
import { getTaskDurationMinutes } from './pricing.js';
import { getTaskStatus } from './scheduler.js';

/**
 * Determine if a task qualifies dynamically as a "Feat" (High effort & long duration).
 * @param {Object} task
 * @returns {boolean}
 */
export function isFeat(task) {
  if (!task) return false;
  const complexity = String(task.complexity || '').toUpperCase();
  const duration = getTaskDurationMinutes(task);
  return (complexity === 'HIGH') && (duration >= 45 || task.estimated_time === 'LONG');
}

/**
 * Strict availability guard: Check if a task is currently eligible for completion.
 * Excludes completed tasks, paused/inactive tasks, and tasks scheduled for future dates.
 * @param {Object} task
 * @returns {boolean}
 */
export function isTaskCurrentlyAvailable(task) {
  if (!task) return false;

  // 1. Must be active
  if (task.isActive === false) return false;

  // 2. Must be due today, overdue, always-available, or active ad-hoc
  const status = getTaskStatus(task);
  if (status === 'completed' || status === 'upcoming') {
    return false;
  }

  return status === 'overdue' || status === 'due_today';
}

/**
 * Calculate repeat frequency interval in calendar days for recurring tasks.
 * @param {Object} task
 * @returns {number}
 */
export function getRecurrenceIntervalDays(task) {
  if (!task || !task.recurrence) return 0;
  const rec = task.recurrence;

  if (typeof rec === 'object' && rec.mode === 'interval_from_completion') {
    const val = Number(rec.intervalValue || rec.intervalDays || 1);
    const unit = rec.intervalUnit || 'days';
    if (unit === 'weeks') return val * 7;
    if (unit === 'months') return val * 30;
    return val;
  }

  const rruleString = typeof rec === 'string' ? rec : (rec.rrule || null);
  if (rruleString) {
    try {
      const rule = rrulestr(rruleString);
      const options = rule.origOptions || {};
      const interval = options.interval || 1;
      const freq = options.freq;
      if (freq === 1 || String(freq) === '1') return interval * 30;
      if (freq === 0 || String(freq) === '0') return interval * 365;
      if (freq === 2 || String(freq) === '2') return interval * 7;
      if (freq === 3 || String(freq) === '3') return interval;
    } catch (e) {
      const str = String(rruleString).toUpperCase();
      if (str.includes('FREQ=MONTHLY') || str.includes('FREQ=YEARLY')) return 30;
      if (str.includes('FREQ=WEEKLY')) {
        const match = str.match(/INTERVAL=(\d+)/);
        const interval = match ? parseInt(match[1], 10) : 1;
        return interval * 7;
      }
      if (str.includes('FREQ=DAILY')) {
        const match = str.match(/INTERVAL=(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
      }
    }
  }
  return 0;
}

const EXCLUDED_KEYWORDS = ['pay', 'bill', 'electricity', 'water', 'счет', 'счёт', 'оплата', 'электричество', 'вода', 'посылка'];

/**
 * Check if a task title contains any restricted financial/routine utility keywords.
 * @param {string} title
 * @returns {boolean}
 */
export function hasExcludedKeyword(title = '') {
  if (!title) return false;
  const lower = title.toLowerCase();
  return EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Calculate smart default for allow_in_feats:
 * 1. Keyword Exclusion Override (pay, bill, electricity, water, счет, оплата, вода, посылка) -> false
 * 2. is_one_off === true -> true
 * 3. Recurring interval < 14 days -> false
 * 4. Recurring interval >= 14 days -> true
 *
 * @param {Object} task
 * @returns {boolean}
 */
export function computeSmartAllowInFeats(task) {
  if (!task) return false;

  if (hasExcludedKeyword(task.title || '')) {
    return false;
  }

  const isOneOff = task.is_one_off === true || task.type === 'ad-hoc' || (!task.recurrence && task.type !== 'always-available');
  if (isOneOff) {
    return true;
  }

  if (task.type === 'recurring') {
    const intervalDays = getRecurrenceIntervalDays(task);
    return intervalDays >= 14;
  }

  return false;
}

/**
 * Get resolved allow_in_feats flag, falling back to smart defaults if property is missing.
 * @param {Object} task
 * @returns {boolean}
 */
export function getTaskAllowInFeats(task) {
  if (!task) return false;
  if (task.allow_in_feats !== undefined && task.allow_in_feats !== null) {
    return !!task.allow_in_feats;
  }
  return computeSmartAllowInFeats(task);
}

/**
 * Strict pool eligibility check for Draw a Task randomizer & Feat Showcase:
 * Eligible IF AND ONLY IF:
 * - allow_in_feats === true (or computed smart default is true)
 * - task.isActive !== false
 * - For recurring tasks, task is currently due today or overdue.
 *
 * @param {Object} task
 * @returns {boolean}
 */
export function isEligibleForDraw(task) {
  if (!task || task.isActive === false) return false;

  if (!getTaskAllowInFeats(task)) return false;

  const isOneOff = task.is_one_off === true || task.type === 'ad-hoc' || (!task.recurrence && task.type !== 'always-available');

  if (isOneOff) {
    return true;
  }

  if (task.type === 'recurring') {
    return isTaskCurrentlyAvailable(task);
  }

  return false;
}

/**
 * Energy capacity matching logic:
 * - LOW capacity matches LOW effort tasks.
 * - MEDIUM capacity matches LOW and MEDIUM effort tasks.
 * - HIGH capacity matches LOW, MEDIUM, and HIGH effort tasks.
 * @param {string} taskComplexity
 * @param {'LOW'|'MEDIUM'|'HIGH'} userEnergy
 * @returns {boolean}
 */
export function isEnergyCompatible(taskComplexity, userEnergy = 'HIGH') {
  const tc = String(taskComplexity || 'LOW').toUpperCase();
  const ue = String(userEnergy || 'HIGH').toUpperCase();

  if (ue === 'LOW') return tc === 'LOW';
  if (ue === 'MEDIUM') return tc === 'LOW' || tc === 'MEDIUM';
  if (ue === 'HIGH') return true; // HIGH energy can handle any task
  return true;
}

/**
 * Time capacity matching logic:
 * - SHORT (<= 15m) matches tasks <= 15 min.
 * - MEDIUM (<= 30m) matches tasks <= 30 min.
 * - LONG (1h+) matches tasks of any duration.
 * @param {number} durationMinutes
 * @param {'SHORT'|'MEDIUM'|'LONG'} userTimeWindow
 * @returns {boolean}
 */
export function isTimeCompatible(durationMinutes, userTimeWindow = 'LONG') {
  const dur = Number(durationMinutes) || 15;
  const tw = String(userTimeWindow || 'LONG').toUpperCase();

  if (tw === 'SHORT') return dur <= 15;
  if (tw === 'MEDIUM') return dur <= 30;
  if (tw === 'LONG') return true; // LONG can do any duration
  return true;
}

/**
 * Filter all tasks down to eligible candidate tasks based on availability and user capacity.
 * @param {Object[]} allTasks
 * @param {'LOW'|'MEDIUM'|'HIGH'} energy
 * @param {'SHORT'|'MEDIUM'|'LONG'} time
 * @returns {Object[]}
 */
export function getEligibleTasks(allTasks = [], energy = 'HIGH', time = 'LONG') {
  return allTasks.filter((task) => {
    // 1. Strict pool eligibility (one-off or recurring >= 14 days)
    if (!isEligibleForDraw(task)) return false;

    // 2. Capacity matching
    const complexity = task.complexity || 'LOW';
    const duration = getTaskDurationMinutes(task);

    const matchesEnergy = isEnergyCompatible(complexity, energy);
    const matchesTime = isTimeCompatible(duration, time);

    return matchesEnergy && matchesTime;
  });
}

/**
 * Recency-weighted selection (anti-stagnation):
 * Prioritizes tasks that haven't been completed in the longest time (or never completed).
 * Selects randomly among the top candidate pool to keep draws fresh.
 *
 * @param {Object[]} eligibleTasks
 * @returns {Object|null}
 */
export function drawRandomTask(eligibleTasks = []) {
  if (!eligibleTasks || eligibleTasks.length === 0) return null;
  if (eligibleTasks.length === 1) return eligibleTasks[0];

  // Calculate elapsed time score (older completion / creation = higher score)
  const scored = eligibleTasks.map((task) => {
    let lastTime = 0;
    if (task.lastCompletedAt) {
      lastTime = task.lastCompletedAt.toDate
        ? task.lastCompletedAt.toDate().getTime()
        : new Date(task.lastCompletedAt.seconds ? task.lastCompletedAt.seconds * 1000 : task.lastCompletedAt).getTime();
    } else if (task.createdAt) {
      lastTime = task.createdAt.toDate
        ? task.createdAt.toDate().getTime()
        : new Date(task.createdAt.seconds ? task.createdAt.seconds * 1000 : task.createdAt).getTime();
    }
    return { task, lastTime };
  });

  // Sort by oldest last completed time first (never completed comes first)
  scored.sort((a, b) => a.lastTime - b.lastTime);

  // Take top candidates (up to 3 or top 40%) and select randomly among them for variety
  const topPoolSize = Math.max(1, Math.min(3, Math.ceil(scored.length * 0.5)));
  const topPool = scored.slice(0, topPoolSize);
  const randomIndex = Math.floor(Math.random() * topPool.length);

  return topPool[randomIndex].task;
}

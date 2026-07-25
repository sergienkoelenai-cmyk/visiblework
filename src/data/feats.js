/**
 * feats.js
 *
 * Core engine for Feat qualification, availability checking,
 * energy/time candidate filtering, and recency-weighted task generation.
 */

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
    // 1. Strict availability check
    if (!isTaskCurrentlyAvailable(task)) return false;

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

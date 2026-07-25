/**
 * pricing.js
 *
 * Pure utility functions for dynamic task cost calculation.
 * No React, no Firestore — safe to import anywhere.
 *
 * Pricing model:
 *   baseCost = baseRate × complexityMultiplier × durationMinutes
 *   finalReward = baseCost × completionMultiplier
 *
 * If a task has a custom_cost set, that overrides the formula entirely.
 * If a task has no complexity/duration or custom_cost (legacy task),
 * the raw task.price value is returned as a fallback.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** @typedef {'LOW' | 'MEDIUM' | 'HIGH'} Complexity */

export const COMPLEXITY = /** @type {const} */ ({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
});

// ─── Default Multipliers ──────────────────────────────────────────────────────

/**
 * Default effort multipliers if not configured in settings.
 * @type {Record<Complexity, number>}
 */
export const DEFAULT_COMPLEXITY_MULTIPLIERS = {
  [COMPLEXITY.LOW]:    1.0,
  [COMPLEXITY.MEDIUM]: 1.5,
  [COMPLEXITY.HIGH]:   2.5,
};

// Backward-compatible alias
export const COMPLEXITY_MULTIPLIERS = DEFAULT_COMPLEXITY_MULTIPLIERS;

// ─── Human-readable labels ────────────────────────────────────────────────────

export const COMPLEXITY_LABELS = {
  [COMPLEXITY.LOW]:    { label: 'Low',    emoji: '🟢', hint: 'Light effort' },
  [COMPLEXITY.MEDIUM]: { label: 'Medium', emoji: '🟡', hint: 'Moderate effort' },
  [COMPLEXITY.HIGH]:   { label: 'High',   emoji: '🔴', hint: 'Heavy effort' },
};

export const DURATION_PRESETS = [
  { value: 5,  label: '5m',  emoji: '⚡' },
  { value: 15, label: '15m', emoji: '⚡' },
  { value: 30, label: '30m', emoji: '⏱' },
  { value: 45, label: '45m', emoji: '⏱' },
  { value: 60, label: '1h',  emoji: '⏳' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract duration in minutes from a task object.
 * Handles new minute field as well as legacy enum values (SHORT=15, MEDIUM=30, LONG=60).
 *
 * @param {Object} task
 * @returns {number} duration in minutes
 */
export function getTaskDurationMinutes(task) {
  if (typeof task.duration_minutes === 'number' && task.duration_minutes > 0) {
    return task.duration_minutes;
  }
  if (typeof task.estimated_time_minutes === 'number' && task.estimated_time_minutes > 0) {
    return task.estimated_time_minutes;
  }
  if (task.estimated_time === 'SHORT') return 15;
  if (task.estimated_time === 'MEDIUM') return 30;
  if (task.estimated_time === 'LONG') return 60;
  return 15; // default fallback
}

// ─── Core calculations ────────────────────────────────────────────────────────

/**
 * Calculate the base cost for a task given a global base rate and effort multipliers.
 *
 * Priority:
 *  1. task.custom_cost (manual override, if not null/undefined)
 *  2. formula: baseRate × complexityMultiplier × durationMinutes (rounded to 2 decimals)
 *  3. task.price (legacy fallback for tasks without the new fields)
 *
 * @param {Object} task
 * @param {number} baseRate - Global base rate (e.g. 0.10 or 0.75)
 * @param {Record<string, number>} [complexityMultipliers] - Custom multipliers from settings
 * @returns {number}
 */
export function getTaskBaseCost(task, baseRate = 0.10, complexityMultipliers = DEFAULT_COMPLEXITY_MULTIPLIERS) {
  // 1. Manual override takes precedence
  if (task.custom_cost !== null && task.custom_cost !== undefined) {
    return Number(task.custom_cost);
  }

  // 2. Dynamic formula when complexity exists (or default to LOW)
  const cmMap = complexityMultipliers || DEFAULT_COMPLEXITY_MULTIPLIERS;
  const cm = cmMap[task.complexity] ?? cmMap.LOW ?? 1.0;
  const duration = getTaskDurationMinutes(task);

  if (task.complexity || task.duration_minutes || task.estimated_time) {
    return Math.round(baseRate * cm * duration * 100) / 100;
  }

  // 3. Legacy fallback — tasks that still only have a static price
  return Number(task.price ?? 0);
}

/**
 * Calculate the final earned reward at completion time.
 *
 * @param {Object} task
 * @param {number} baseRate
 * @param {number} [multiplier=1.0] - Completion-time bonus multiplier
 * @param {Record<string, number>} [complexityMultipliers] - Custom multipliers from settings
 * @returns {number}
 */
export function calculateFinalReward(task, baseRate, multiplier = 1.0, complexityMultipliers = DEFAULT_COMPLEXITY_MULTIPLIERS) {
  const baseCost = getTaskBaseCost(task, baseRate, complexityMultipliers);
  return Math.round(baseCost * multiplier * 100) / 100;
}

// ─── Completion multiplier presets ────────────────────────────────────────────

export const COMPLETION_MULTIPLIERS = [
  { value: 1.0, label: '1×' },
  { value: 1.5, label: '1.5×' },
  { value: 2.0, label: '2×' },
];

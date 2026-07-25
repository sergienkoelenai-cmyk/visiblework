/**
 * pricing.js
 *
 * Pure utility functions for dynamic task cost calculation.
 * No React, no Firestore — safe to import anywhere.
 *
 * Pricing model:
 *   baseCost = baseRate × complexityMultiplier × timeMultiplier
 *   finalReward = baseCost × completionMultiplier
 *
 * If a task has a custom_cost set, that overrides the formula entirely.
 * If a task has neither complexity/estimated_time nor custom_cost (legacy task),
 * the raw task.price value is returned as a fallback.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** @typedef {'LOW' | 'MEDIUM' | 'HIGH'} Complexity */
/** @typedef {'SHORT' | 'MEDIUM' | 'LONG'} EstimatedTime */

export const COMPLEXITY = /** @type {const} */ ({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
});

export const ESTIMATED_TIME = /** @type {const} */ ({
  SHORT: 'SHORT',
  MEDIUM: 'MEDIUM',
  LONG: 'LONG',
});

// ─── Multiplier tables ────────────────────────────────────────────────────────

/**
 * Physical effort + mental resistance multipliers.
 * @type {Record<Complexity, number>}
 */
export const COMPLEXITY_MULTIPLIERS = {
  [COMPLEXITY.LOW]:    1.0,
  [COMPLEXITY.MEDIUM]: 1.5,
  [COMPLEXITY.HIGH]:   2.5,
};

/**
 * Expected duration multipliers.
 * SHORT = 10-15 min, MEDIUM = ~30 min, LONG = 1 h+
 * @type {Record<EstimatedTime, number>}
 */
export const TIME_MULTIPLIERS = {
  [ESTIMATED_TIME.SHORT]:  1.0,
  [ESTIMATED_TIME.MEDIUM]: 1.8,
  [ESTIMATED_TIME.LONG]:   3.5,
};

// ─── Human-readable labels ────────────────────────────────────────────────────

export const COMPLEXITY_LABELS = {
  [COMPLEXITY.LOW]:    { label: 'Low',    emoji: '🟢', hint: 'Light effort' },
  [COMPLEXITY.MEDIUM]: { label: 'Medium', emoji: '🟡', hint: 'Moderate effort' },
  [COMPLEXITY.HIGH]:   { label: 'High',   emoji: '🔴', hint: 'Heavy effort' },
};

export const TIME_LABELS = {
  [ESTIMATED_TIME.SHORT]:  { label: '15m',  emoji: '⚡', hint: '10 – 15 min' },
  [ESTIMATED_TIME.MEDIUM]: { label: '30m',  emoji: '⏱', hint: '~30 min' },
  [ESTIMATED_TIME.LONG]:   { label: '1h+',  emoji: '⏳', hint: '1 hour or more' },
};

// ─── Core calculations ────────────────────────────────────────────────────────

/**
 * Calculate the base cost for a task given a global base rate.
 *
 * Priority:
 *  1. task.custom_cost (manual override, if not null/undefined)
 *  2. formula: baseRate × complexityMultiplier × timeMultiplier (rounded to 2 decimals)
 *  3. task.price (legacy fallback for tasks without the new fields)
 *
 * @param {Object} task
 * @param {number|null|undefined} task.custom_cost
 * @param {Complexity|undefined} task.complexity
 * @param {EstimatedTime|undefined} task.estimated_time
 * @param {number|undefined} task.price
 * @param {number} baseRate - Global base rate (e.g. 10 or 0.75)
 * @returns {number}
 */
export function getTaskBaseCost(task, baseRate) {
  // 1. Manual override takes precedence
  if (task.custom_cost !== null && task.custom_cost !== undefined) {
    return Number(task.custom_cost);
  }

  // 2. Dynamic formula when new fields exist
  if (task.complexity && task.estimated_time) {
    const cm = COMPLEXITY_MULTIPLIERS[task.complexity] ?? 1.0;
    const tm = TIME_MULTIPLIERS[task.estimated_time] ?? 1.0;
    return Math.round(baseRate * cm * tm * 100) / 100;
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
 * @returns {number}
 */
export function calculateFinalReward(task, baseRate, multiplier = 1.0) {
  const baseCost = getTaskBaseCost(task, baseRate);
  return Math.round(baseCost * multiplier * 100) / 100;
}

// ─── Completion multiplier presets ────────────────────────────────────────────

/**
 * Standard completion multiplier options shown to the user.
 * @type {{ value: number, label: string }[]}
 */
export const COMPLETION_MULTIPLIERS = [
  { value: 1.0, label: '1×' },
  { value: 1.5, label: '1.5×' },
  { value: 2.0, label: '2×' },
];

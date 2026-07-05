/**
 * Scheduling engine for VisibleWork.
 *
 * Calculates next due dates for recurring tasks and provides
 * task status/urgency helpers.
 *
 * All functions work with plain JavaScript Date objects.
 * Firestore Timestamps must be converted with .toDate() before
 * being passed to these functions.
 *
 * Date comparisons are done at DAY granularity (time-of-day is ignored).
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip the time component from a Date, returning midnight of that day.
 * Returns a NEW Date object — the original is not mutated.
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Add `days` calendar days to a Date.
 */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add `months` calendar months to a Date.
 * If the resulting month has fewer days, the date is clamped
 * (e.g. Jan 31 + 1 month → Feb 28).
 */
function addMonths(date, months) {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // Clamp: if we overshot (e.g. 31 Jan + 1 month → 3 Mar), roll back
  // to the last day of the intended month.
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0); // last day of previous month
  }
  return d;
}

// ─── Core API ───────────────────────────────────────────────────────────────

/**
 * Calculate the next due date for a task after it has been completed.
 *
 * @param {Object} task          - The task document (with recurrence sub-object).
 * @param {Date}   completionDate - When the task was completed (JS Date).
 * @returns {Date|null}           Next due date, or null if the task is done.
 */
export function calculateNextDueDate(task, completionDate) {
  // Ad-hoc tasks are one-shot — no next date.
  if (task.type === 'ad-hoc') {
    return null;
  }

  const recurrence = task.recurrence;
  if (!recurrence || !recurrence.mode) {
    return null;
  }

  const today = startOfDay(new Date());

  switch (recurrence.mode) {
    // ── interval_from_completion ──────────────────────────────────────
    // Next due date = completion date + intervalDays
    case 'interval_from_completion': {
      const interval = recurrence.intervalDays || 1;
      return startOfDay(addDays(completionDate, interval));
    }

    // ── fixed_interval ───────────────────────────────────────────────
    // Uses an anchor date and a fixed cadence (days or months).
    // We walk forward from the anchor until we find the first occurrence
    // that is strictly after today.
    case 'fixed_interval': {
      const anchor = recurrence.fixedAnchorDate
        ? startOfDay(
            recurrence.fixedAnchorDate instanceof Date
              ? recurrence.fixedAnchorDate
              : recurrence.fixedAnchorDate.toDate
                ? recurrence.fixedAnchorDate.toDate()
                : new Date(recurrence.fixedAnchorDate)
          )
        : today;

      const unit = recurrence.fixedIntervalUnit || 'days';
      const value = recurrence.fixedIntervalValue || 1;

      let next = new Date(anchor);

      if (unit === 'months') {
        // Walk forward month-by-month from the anchor.
        let multiplier = 0;
        while (startOfDay(next) <= today) {
          multiplier++;
          next = addMonths(anchor, value * multiplier);
        }
      } else {
        // unit === 'days' (default)
        const intervalMs = value * 24 * 60 * 60 * 1000;
        if (next <= today) {
          // Jump forward: calculate how many intervals we need to skip
          const diff = today.getTime() - next.getTime();
          const periods = Math.floor(diff / intervalMs);
          next = addDays(anchor, value * (periods + 1));
          // Edge-case: if we landed exactly on today, push one more
          if (startOfDay(next) <= today) {
            next = addDays(next, value);
          }
        }
      }

      return startOfDay(next);
    }

    // ── custom_schedule ──────────────────────────────────────────────
    // A manually-specified list of dates. Return the next one that's
    // after today, or null if all dates are exhausted.
    case 'custom_schedule': {
      const dates = (recurrence.customDates || [])
        .map((d) => {
          if (d instanceof Date) return startOfDay(d);
          if (d.toDate) return startOfDay(d.toDate());
          return startOfDay(new Date(d));
        })
        .sort((a, b) => a - b);

      for (const d of dates) {
        if (d > today) {
          return d;
        }
      }
      // All dates exhausted — task is done.
      return null;
    }

    default:
      return null;
  }
}

// ─── Task Status ────────────────────────────────────────────────────────────

/**
 * Determine the display status of a task.
 *
 * @param {Object} task - Task document. `nextDueDate` should already be a
 *                        JS Date (or null).
 * @returns {'overdue'|'due_today'|'upcoming'|'completed'}
 */
export function getTaskStatus(task) {
  // Ad-hoc tasks that are no longer active are considered completed.
  if (task.type === 'ad-hoc' && !task.isActive) {
    return 'completed';
  }

  // Recurring tasks with no next due date are also completed
  // (e.g. custom_schedule exhausted).
  if (!task.nextDueDate) {
    return 'completed';
  }

  const today = startOfDay(new Date());
  const dueDate = startOfDay(
    task.nextDueDate instanceof Date
      ? task.nextDueDate
      : task.nextDueDate.toDate
        ? task.nextDueDate.toDate()
        : new Date(task.nextDueDate)
  );

  if (dueDate < today) return 'overdue';
  if (dueDate.getTime() === today.getTime()) return 'due_today';
  return 'upcoming';
}

// ─── Sorting ────────────────────────────────────────────────────────────────

/** Priority ordering for statuses (lower = more urgent). */
const STATUS_PRIORITY = {
  overdue: 0,
  due_today: 1,
  upcoming: 2,
  completed: 3,
};

/**
 * Sort tasks by urgency: overdue → due today → upcoming → completed.
 * Within each group, higher-priced tasks come first.
 *
 * Returns a NEW sorted array — the original is not mutated.
 *
 * @param {Object[]} tasks - Array of task documents.
 * @returns {Object[]}       Sorted copy.
 */
export function sortTasksByUrgency(tasks) {
  return [...tasks].sort((a, b) => {
    const statusA = getTaskStatus(a);
    const statusB = getTaskStatus(b);

    // Primary sort: urgency
    const priorityDiff = STATUS_PRIORITY[statusA] - STATUS_PRIORITY[statusB];
    if (priorityDiff !== 0) return priorityDiff;

    // Secondary sort: higher price first
    return (b.price || 0) - (a.price || 0);
  });
}

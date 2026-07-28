/**
 * Data access layer for VisibleWork.
 *
 * Wraps Firestore with clean CRUD methods for users, tasks,
 * completions, and cashouts.  Uses Firebase v9+ modular imports.
 *
 * Real-time listeners (onSnapshot) are exposed via subscribe* helpers.
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  increment,
} from 'firebase/firestore';

import { db, storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { calculateNextDueDate } from './scheduler.js';
import { calculateFinalReward } from './pricing.js';
import { computeSmartAllowInFeats } from './feats.js';

// ─── Collection references ──────────────────────────────────────────────────

const usersCol = collection(db, 'users');
const tasksCol = collection(db, 'tasks');
const completionsCol = collection(db, 'completions');
const cashoutsCol = collection(db, 'cashouts');
const settingsDoc = doc(db, 'settings', 'global');

// ─── Helper: convert Firestore doc → plain object with id ───────────────────

function docToObj(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

// ═════════════════════════════════════════════════════════════════════════════
//  USERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all users (one-time read).
 * @returns {Promise<Object[]>}
 */
export async function getUsers() {
  const snap = await getDocs(usersCol);
  return snap.docs.map(docToObj);
}

/**
 * Add a new user.
 * @param {Object} data - { name, avatar?, avatarColor? }
 * @returns {Promise<string>} The new document ID.
 */
export async function addUser(data) {
  const ref = await addDoc(usersCol, {
    name: data.name || '',
    avatar: data.avatar || '',
    avatarColor: data.avatarColor || '#6366f1',
    balance: 0,
    totalEarned: 0,
    totalCashedOut: 0,
    createdAt: serverTimestamp(),
    ...data, // allow caller overrides (e.g. pre-set balance for testing)
  });
  return ref.id;
}

/**
 * Update fields on an existing user.
 * @param {string} id
 * @param {Object} data - Partial user fields to merge.
 */
export async function updateUser(id, data) {
  await updateDoc(doc(db, 'users', id), data);
}

/**
 * Delete a user by ID.
 * @param {string} id
 */
export async function deleteUser(id) {
  await deleteDoc(doc(db, 'users', id));
}

/**
 * Subscribe to real-time user updates.
 * @param {Function} callback - Called with an array of user objects.
 * @returns {Function} Unsubscribe function.
 */
export function subscribeToUsers(callback) {
  return onSnapshot(usersCol, (snap) => {
    callback(snap.docs.map(docToObj));
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═════════════════════════════════════════════════════════════════════════════

const DEFAULT_SETTINGS = {
  base_rate: 0.10,
  complexity_multipliers: { LOW: 1.0, MEDIUM: 1.5, HIGH: 2.5 },
};

/**
 * Fetch global settings (one-time read).
 * Returns defaults if the document doesn't exist yet.
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  const snap = await getDoc(settingsDoc);
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...snap.data() };
}

/**
 * Write / merge global settings.
 * @param {Object} data - Partial settings fields to merge.
 */
export async function updateSettings(data) {
  await setDoc(settingsDoc, data, { merge: true });
}

/**
 * Subscribe to real-time settings updates.
 * @param {Function} callback - Called with the settings object.
 * @returns {Function} Unsubscribe function.
 */
export function subscribeToSettings(callback) {
  return onSnapshot(settingsDoc, (snap) => {
    callback(snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  TASKS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all tasks (one-time read).
 * @returns {Promise<Object[]>}
 */
export async function getTasks() {
  const snap = await getDocs(tasksCol);
  return snap.docs.map(docToObj);
}

/**
 * Fetch only active tasks.
 * @returns {Promise<Object[]>}
 */
export async function getActiveTasks() {
  const q = query(tasksCol, where('isActive', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}

/**
 * Add a new task.
 * @param {Object} data - Task fields (title, description, price, etc.)
 * @returns {Promise<string>} The new document ID.
 */
export async function addTask(data) {
  const isOneOff = data.is_one_off !== undefined 
    ? !!data.is_one_off 
    : (data.type === 'ad-hoc' || (!data.recurrence && data.type !== 'always-available'));

  const taskData = {
    title: data.title || '',
    description: data.description || '',
    price: data.price || 0,
    complexity: data.complexity || null,
    duration_minutes: data.duration_minutes || null,
    estimated_time: data.estimated_time || null,
    custom_cost: data.custom_cost !== undefined ? data.custom_cost : null,
    category: data.category || (isOneOff ? 'one-off' : ''),
    type: data.type || (isOneOff ? 'ad-hoc' : 'recurring'),
    is_one_off: isOneOff,
    recurrence: data.recurrence || null,
    isActive: data.isActive !== undefined ? data.isActive : true,
    is_critical: data.is_critical !== undefined ? !!data.is_critical : false,
    nextDueDate: data.nextDueDate || null,
    lastCompletedAt: null,
    lastCompletedBy: null,
    createdBy: data.createdBy || '',
    createdAt: serverTimestamp(),
    ...data, // allow caller overrides
  };

  taskData.allow_in_feats = data.allow_in_feats !== undefined
    ? !!data.allow_in_feats
    : computeSmartAllowInFeats(taskData);

  const ref = await addDoc(tasksCol, taskData);
  return ref.id;
}

/**
 * Update fields on an existing task.
 * @param {string} id
 * @param {Object} data - Partial task fields to merge.
 */
export async function updateTask(id, data) {
  await updateDoc(doc(db, 'tasks', id), data);
}

/**
 * Delete a task by ID.
 * @param {string} id
 */
export async function deleteTask(id) {
  await deleteDoc(doc(db, 'tasks', id));
}

/**
 * Subscribe to real-time task updates.
 * @param {Function} callback - Called with an array of task objects.
 * @returns {Function} Unsubscribe function.
 */
export function subscribeToTasks(callback) {
  return onSnapshot(tasksCol, (snap) => {
    callback(snap.docs.map(docToObj));
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  COMPLETIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Record a task completion.
 * @param {Object} data - { taskId, taskTitle, userId, userName, amount }
 * @returns {Promise<string>}
 */
export async function addCompletion(data) {
  const ref = await addDoc(completionsCol, {
    taskId: data.taskId,
    taskTitle: data.taskTitle || '',
    userId: data.userId,
    userName: data.userName || '',
    amount: data.amount || 0,
    completedAt: serverTimestamp(),
    ...data,
  });
  return ref.id;
}

/**
 * Fetch recent completions, newest first.
 * @param {number} [max=50]
 * @returns {Promise<Object[]>}
 */
export async function getCompletions(max = 50) {
  const q = query(
    completionsCol,
    orderBy('completedAt', 'desc'),
    firestoreLimit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}

/**
 * Fetch completions within a specific date range.
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Object[]>}
 */
export async function getCompletionsForPeriod(startDate, endDate) {
  const q = query(
    completionsCol,
    where('completedAt', '>=', Timestamp.fromDate(startDate)),
    where('completedAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('completedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}


// ═════════════════════════════════════════════════════════════════════════════
//  CASHOUTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Record a cashout.
 * @param {Object} data - { userId, amount, note }
 * @returns {Promise<string>}
 */
export async function addCashout(data) {
  const ref = await addDoc(cashoutsCol, {
    userId: data.userId,
    amount: data.amount || 0,
    note: data.note || '',
    createdAt: serverTimestamp(),
    ...data,
  });
  return ref.id;
}

/**
 * Fetch cashouts for a specific user, newest first.
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
export async function getCashouts(userId) {
  const q = query(
    cashoutsCol,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}

// ═════════════════════════════════════════════════════════════════════════════
//  COMPOSITE OPERATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Mark a task completed, calculating its next due date, incrementing the
 * doer's balance/earnings, and creating a completion log.
 * Runs inside a Firestore transaction for atomicity.
 * Supports userId as an array of IDs for reward splitting.
 *
 * @param {string} taskId - ID of the task being completed.
 * @param {string|string[]} userId - ID or IDs of the users who completed it.
 * @param {number} [baseRate=0.10] - Global base rate for dynamic pricing.
 * @param {number} [multiplier=1.0] - Completion-time reward multiplier.
 * @param {Record<string, number>} [complexityMultipliers] - Custom effort multipliers.
 * @returns {Promise<{completionId: string}>}
 */
export async function completeTask(taskId, userId, baseRate = 0.10, multiplier = 1.0, complexityMultipliers = null, completedAtDate = null) {
  const isArray = Array.isArray(userId);
  const userIds = isArray ? userId : [userId];
  if (userIds.length === 0) throw new Error('At least one doer is required.');

  const taskRef = doc(db, 'tasks', taskId);
  const userRefs = userIds.map(id => doc(db, 'users', id));

  const result = await runTransaction(db, async (transaction) => {
    // Read task and all user documents inside the transaction
    const taskSnap = await transaction.get(taskRef);
    const userSnaps = await Promise.all(userRefs.map(ref => transaction.get(ref)));

    if (!taskSnap.exists()) throw new Error(`Task ${taskId} not found.`);
    userSnaps.forEach((snap, idx) => {
      if (!snap.exists()) throw new Error(`User ${userIds[idx]} not found.`);
    });

    const task = { id: taskSnap.id, ...taskSnap.data() };
    const users = userSnaps.map(snap => ({ id: snap.id, ...snap.data() }));
    const now = completedAtDate instanceof Date && !isNaN(completedAtDate.getTime()) ? completedAtDate : new Date();

    // ── Calculate next due date using the scheduler ──────────────────
    const nextDueDate = calculateNextDueDate(task, now);
    const isStillActive = nextDueDate !== null;

    // ── Update the task ──────────────────────────────────────────────
    transaction.update(taskRef, {
      lastCompletedAt: Timestamp.fromDate(now),
      lastCompletedBy: isArray ? userIds.join(',') : userId,
      isActive: isStillActive,
      nextDueDate: nextDueDate ? Timestamp.fromDate(nextDueDate) : null,
    });

    // ── Award money to the users (split if multiple) ─────────────────
    const totalReward = calculateFinalReward(task, baseRate, multiplier, complexityMultipliers);
    const splitPrice = totalReward / userIds.length;
    let firstCompletionId = '';

    users.forEach((user, idx) => {
      transaction.update(doc(db, 'users', user.id), {
        balance: increment(splitPrice),
        totalEarned: increment(splitPrice),
      });

      // ── Create completion record for each user ─────────────────────
      const completionRef = doc(completionsCol);
      if (idx === 0) firstCompletionId = completionRef.id;

      transaction.set(completionRef, {
        taskId: task.id,
        taskTitle: task.title || '',
        userId: user.id,
        userName: user.name || '',
        amount: splitPrice,
        multiplier,
        baseRate,
        completedAt: Timestamp.fromDate(now),
        previousDueDate: task.nextDueDate || null,
        splitWith: userIds.filter(id => id !== user.id),
      });
    });

    return { completionId: firstCompletionId };
  });

  return result;
}

/**
 * Skip a scheduled task instance: recalculates its next due date,
 * sets amount = 0 with status = "skipped", and creates an audit log entry.
 *
 * Runs inside a Firestore transaction.
 *
 * @param {string} taskId - ID of task being skipped.
 * @returns {Promise<{nextDueDate: Date|null, completionId: string}>}
 */
export async function skipTask(taskId) {
  if (!taskId) throw new Error('taskId is required to skip a task');

  const taskRef = doc(db, 'tasks', taskId);

  const result = await runTransaction(db, async (transaction) => {
    const taskSnap = await transaction.get(taskRef);
    if (!taskSnap.exists()) throw new Error(`Task ${taskId} not found.`);

    const task = { id: taskSnap.id, ...taskSnap.data() };
    const now = new Date();

    // Calculate next due date after today
    const nextDueDate = calculateNextDueDate(task, now);
    const isStillActive = nextDueDate !== null;

    // Update task
    transaction.update(taskRef, {
      lastSkippedAt: Timestamp.fromDate(now),
      isActive: isStillActive,
      nextDueDate: nextDueDate ? Timestamp.fromDate(nextDueDate) : null,
    });

    // Create skipped audit record in completions collection
    const completionRef = doc(completionsCol);
    transaction.set(completionRef, {
      taskId: task.id,
      taskTitle: task.title || '',
      userId: 'system',
      userName: 'Skipped',
      amount: 0,
      status: 'skipped',
      completedAt: Timestamp.fromDate(now),
      previousDueDate: task.nextDueDate || null,
    });

    return { nextDueDate, completionId: completionRef.id };
  });

  return result;
}


/**
 * Undo/revert a task completion: delete the completion log, subtract the
 * earnings from the user, and restore the task's active status and previous
 * due date.
 *
 * Uses a single Firestore transaction (no pre-queries) for maximum
 * reliability. If the task was completed with split rewards, each person's
 * completion can be undone individually.
 *
 * @param {string} completionId
 * @returns {Promise<{success: boolean}>}
 */
export async function revertTaskCompletion(completionId) {
  if (!completionId) throw new Error('completionId is required');

  const completionRef = doc(db, 'completions', completionId);

  const result = await runTransaction(db, async (transaction) => {
    // ── Read everything inside the transaction ───────────────────────
    const compSnap = await transaction.get(completionRef);
    if (!compSnap.exists()) {
      throw new Error(`Completion ${completionId} not found.`);
    }
    const comp = compSnap.data();

    const taskId = comp.taskId;
    const userId = comp.userId;
    if (!taskId) throw new Error('Completion is missing taskId.');
    if (!userId) throw new Error('Completion is missing userId.');

    const taskRef = doc(db, 'tasks', taskId);
    const userRef = doc(db, 'users', userId);

    const taskSnap = await transaction.get(taskRef);
    const userSnap = await transaction.get(userRef);

    // ── Deduct reward from the user ──────────────────────────────────
    if (userSnap.exists()) {
      const refund = Number(comp.amount) || 0;
      transaction.update(userRef, {
        balance: increment(-refund),
        totalEarned: increment(-refund),
      });
    }

    // ── Delete the completion record ─────────────────────────────────
    transaction.delete(completionRef);

    // ── Restore task to active ───────────────────────────────────────
    if (taskSnap.exists()) {
      const task = taskSnap.data();
      let nextDueDate = comp.previousDueDate || null;

      // Fallback: recurring tasks with no previousDueDate → set to now
      if (!nextDueDate && task.type === 'recurring') {
        nextDueDate = Timestamp.fromDate(new Date());
      }

      transaction.update(taskRef, {
        isActive: true,
        nextDueDate,
        lastCompletedAt: null,
        lastCompletedBy: null,
      });
    }

    return { success: true };
  });

  return result;
}

/**
 * Cash out a user: deduct from their balance and create a cashout record.
 *
 * Uses a Firestore transaction for atomicity.
 *
 * @param {string} userId - The user cashing out.
 * @param {number} amount - Euro amount to cash out (must be > 0).
 * @param {string} [note=''] - Optional note describing the cashout.
 * @returns {Promise<{cashoutId: string}>}
 */
export async function cashoutUser(userId, amount, note = '') {
  if (amount <= 0) throw new Error('Cashout amount must be positive.');

  const userRef = doc(db, 'users', userId);

  const result = await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error(`User ${userId} not found.`);

    const user = userSnap.data();
    if ((user.balance || 0) < amount) {
      throw new Error(
        `Insufficient balance. User has €${user.balance}, tried to cash out €${amount}.`
      );
    }

    // ── Deduct balance, track total cashed out ───────────────────────
    transaction.update(userRef, {
      balance: increment(-amount),
      totalCashedOut: increment(amount),
    });

    // ── Create cashout record ────────────────────────────────────────
    const cashoutRef = doc(cashoutsCol);
    transaction.set(cashoutRef, {
      userId,
      amount,
      note,
      createdAt: serverTimestamp(),
    });

    return { cashoutId: cashoutRef.id };
  });

  return result;
}

// ═════════════════════════════════════════════════════════════════════════════
//  AVATAR UPLOAD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Upload an avatar image to Firebase Storage and return the download URL.
 *
 * @param {File} file    - The image file to upload.
 * @param {string} userId - User ID (used to namespace the file path).
 * @returns {Promise<string>} Public download URL of the uploaded image.
 */
export async function uploadAvatar(file, userId) {
  const ext = file.name.split('.').pop() || 'jpg';
  const storageRef = ref(storage, `avatars/${userId}.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ═════════════════════════════════════════════════════════════════════════════
//  CATEGORIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all categories (one-time read).
 * @returns {Promise<Object[]>}
 */
export async function getCategories() {
  const q = query(collection(db, 'categories'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}
async function seedCategories() {
  const defaults = [
    { id: 'one-off', label: 'One-Off Tasks', emoji: '🎯', createdAt: new Date() },
    { id: 'cleaning', label: 'Cleaning', emoji: '🧹', createdAt: new Date() },
    { id: 'kitchen', label: 'Kitchen', emoji: '🍽️', createdAt: new Date() },
    { id: 'laundry', label: 'Laundry', emoji: '👕', createdAt: new Date() },
    { id: 'shopping', label: 'Shopping', emoji: '🛒', createdAt: new Date() },
    { id: 'bills', label: 'Bills', emoji: '💰', createdAt: new Date() },
    { id: 'repairs', label: 'Repairs', emoji: '🔧', createdAt: new Date() },
    { id: 'garden', label: 'Garden', emoji: '🌱', createdAt: new Date() },
    { id: 'pets', label: 'Pets', emoji: '🐾', createdAt: new Date() },
    { id: 'kids', label: 'Kids', emoji: '🧒', createdAt: new Date() },
    { id: 'cars', label: 'Cars', emoji: '🚗', createdAt: new Date() },
    { id: 'other', label: 'Other', emoji: '📋', createdAt: new Date() },
  ];
  for (const cat of defaults) {
    await setDoc(doc(db, 'categories', cat.id), cat);
  }
}

/**
 * Subscribe to real-time categories updates.
 * Seeds with default categories if the collection is empty.
 *
 * @param {Function} callback
 * @returns {Function} Unsubscribe function.
 */
export function subscribeToCategories(callback) {
  const q = query(collection(db, 'categories'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, 
    (snap) => {
      if (snap.empty) {
        seedCategories().catch(console.error);
      } else {
        callback(snap.docs.map(docToObj));
      }
    },
    (err) => {
      console.error("Error subscribing to categories (check your Firestore rules):", err);
      // Graceful fallback to default categories to prevent blank screen crash
      const defaults = [
        { id: 'one-off', label: 'One-Off Tasks', emoji: '🎯' },
        { id: 'cleaning', label: 'Cleaning', emoji: '🧹' },
        { id: 'kitchen', label: 'Kitchen', emoji: '🍽️' },
        { id: 'laundry', label: 'Laundry', emoji: '👕' },
        { id: 'shopping', label: 'Shopping', emoji: '🛒' },
        { id: 'bills', label: 'Bills', emoji: '💰' },
        { id: 'repairs', label: 'Repairs', emoji: '🔧' },
        { id: 'garden', label: 'Garden', emoji: '🌱' },
        { id: 'pets', label: 'Pets', emoji: '🐾' },
        { id: 'kids', label: 'Kids', emoji: '🧒' },
        { id: 'cars', label: 'Cars', emoji: '🚗' },
        { id: 'other', label: 'Other', emoji: '📋' },
      ];
      callback(defaults);
    }
  );
}

/**
 * Add a new custom category.
 *
 * @param {Object} data - { label, emoji }
 * @returns {Promise<string>} Created category ID.
 */
export async function addCategory(data) {
  const id = data.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'custom';
  const catDoc = {
    id,
    label: data.label.trim(),
    emoji: data.emoji || '📋',
    createdAt: new Date(),
  };
  await setDoc(doc(db, 'categories', id), catDoc);
  return id;
}

/**
 * Delete a category and assign all of its tasks to the 'other' category fallback.
 *
 * @param {string} id - Category ID.
 */
export async function deleteCategory(id) {
  if (id === 'other') return;

  // 1. Delete category document
  await deleteDoc(doc(db, 'categories', id));

  // 2. Query all tasks with this category and update them to 'other'
  const tasksQuery = query(collection(db, 'tasks'), where('category', '==', id));
  const snap = await getDocs(tasksQuery);
  for (const docSnap of snap.docs) {
    await updateDoc(docSnap.ref, { category: 'other' });
  }
}

/**
 * Update an existing custom category.
 *
 * @param {string} id - Category ID.
 * @param {Object} data - { label, emoji }
 */
export async function updateCategory(id, data) {
  const catRef = doc(db, 'categories', id);
  await updateDoc(catRef, {
    label: data.label.trim(),
    emoji: data.emoji || '📋',
  });
}


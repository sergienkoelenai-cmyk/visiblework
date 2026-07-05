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

// ─── Collection references ──────────────────────────────────────────────────

const usersCol = collection(db, 'users');
const tasksCol = collection(db, 'tasks');
const completionsCol = collection(db, 'completions');
const cashoutsCol = collection(db, 'cashouts');

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
  const taskData = {
    title: data.title || '',
    description: data.description || '',
    price: data.price || 0,
    category: data.category || '',
    type: data.type || 'ad-hoc',
    recurrence: data.recurrence || null,
    isActive: data.isActive !== undefined ? data.isActive : true,
    nextDueDate: data.nextDueDate || null,
    lastCompletedAt: null,
    lastCompletedBy: null,
    createdBy: data.createdBy || '',
    createdAt: serverTimestamp(),
    ...data, // allow caller overrides
  };

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
 * Complete a task: mark it done, award money to the user, create a
 * completion record, and — if recurring — calculate the next due date.
 *
 * Uses a Firestore transaction to keep everything consistent.
 *
 * @param {string} taskId - ID of the task being completed.
 * @param {string} userId - ID of the user who completed it.
 * @returns {Promise<{completionId: string}>}
 */
export async function completeTask(taskId, userId) {
  const taskRef = doc(db, 'tasks', taskId);
  const userRef = doc(db, 'users', userId);

  const result = await runTransaction(db, async (transaction) => {
    // Read both documents inside the transaction
    const taskSnap = await transaction.get(taskRef);
    const userSnap = await transaction.get(userRef);

    if (!taskSnap.exists()) throw new Error(`Task ${taskId} not found.`);
    if (!userSnap.exists()) throw new Error(`User ${userId} not found.`);

    const task = { id: taskSnap.id, ...taskSnap.data() };
    const user = { id: userSnap.id, ...userSnap.data() };
    const now = new Date();

    // ── Calculate next due date using the scheduler ──────────────────
    const nextDueDate = calculateNextDueDate(task, now);
    const isStillActive = nextDueDate !== null;

    // ── Update the task ──────────────────────────────────────────────
    transaction.update(taskRef, {
      lastCompletedAt: Timestamp.fromDate(now),
      lastCompletedBy: userId,
      isActive: isStillActive,
      nextDueDate: nextDueDate ? Timestamp.fromDate(nextDueDate) : null,
    });

    // ── Award money to the user ──────────────────────────────────────
    transaction.update(userRef, {
      balance: increment(task.price || 0),
      totalEarned: increment(task.price || 0),
    });

    // ── Create completion record ─────────────────────────────────────
    const completionRef = doc(completionsCol);
    transaction.set(completionRef, {
      taskId: task.id,
      taskTitle: task.title || '',
      userId: user.id,
      userName: user.name || '',
      amount: task.price || 0,
      completedAt: Timestamp.fromDate(now),
      previousDueDate: task.nextDueDate || null,
    });

    return { completionId: completionRef.id };
  });

  return result;
}

/**
 * Undo/revert a task completion: delete the log, subtract the earnings
 * from the user, and restore the task's active status and previous due date.
 *
 * Runs inside a Firestore transaction for atomicity.
 *
 * @param {string} completionId
 */
export async function revertTaskCompletion(completionId) {
  const completionRef = doc(db, 'completions', completionId);

  const result = await runTransaction(db, async (transaction) => {
    const compSnap = await transaction.get(completionRef);
    if (!compSnap.exists()) {
      throw new Error(`Completion record ${completionId} not found.`);
    }
    const comp = compSnap.data();

    const taskRef = doc(db, 'tasks', comp.taskId);
    const userRef = doc(db, 'users', comp.userId);

    const taskSnap = await transaction.get(taskRef);
    const userSnap = await transaction.get(userRef);

    // Revert user earnings if user still exists
    if (userSnap.exists()) {
      const refund = comp.amount || 0;
      transaction.update(userRef, {
        balance: increment(-refund),
        totalEarned: increment(-refund),
      });
    }

    // Revert task state if task still exists
    if (taskSnap.exists()) {
      const updates = {
        isActive: true, // Make it active again
        nextDueDate: comp.previousDueDate || null,
        lastCompletedAt: null,
        lastCompletedBy: null,
      };
      transaction.update(taskRef, updates);
    }

    // Delete completion log
    transaction.delete(completionRef);

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

async function seedCategories() {
  const defaults = [
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
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      seedCategories().catch(console.error);
    } else {
      callback(snap.docs.map(docToObj));
    }
  });
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


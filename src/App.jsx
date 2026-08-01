import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { 
  subscribeToUsers, 
  subscribeToTasks, 
  subscribeToCategories,
  subscribeToSettings,
  addUser, 
  updateUser, 
  deleteUser, 
  addTask, 
  updateTask, 
  deleteTask, 
  addCategory,
  updateCategory,
  deleteCategory,
  completeTask, 
  revertTaskCompletion,
  skipTask,
  cashoutUser, 
  getCompletions, 
  getCompletionsForPeriod,
  getUsers,
  getTasks,
  getCategories,
  uploadAvatar,
  updateSettings,
} from './data/store'
import { sortTasksByUrgency, getTaskStatus, calculateNextDueDate, shouldDisplayScheduledTask, formatNextDueDateLabel, toJsDate } from './data/scheduler'
import FamilyBar from './components/FamilyBar'
import TaskList from './components/TaskList'
import TaskForm from './components/TaskForm'
import UserForm from './components/UserForm'
import CashoutDialog from './components/CashoutDialog'
import TaskCompletionOverlay from './components/TaskCompletionOverlay'
import SettingsPage from './components/SettingsPage'
import AnalyticsPage from './components/AnalyticsPage'
import PullToRefresh from './components/PullToRefresh'
import FeatsWidget from './components/FeatsWidget'
import FeatsDrawer from './components/FeatsDrawer'
import CriticalFocusBlock from './components/CriticalFocusBlock'
import OneOffTaskSelectionModal from './components/OneOffTaskSelectionModal'
import HomeFooter from './components/HomeFooter'
import SearchResultsList from './components/SearchResultsList'
import { useTaskSearch } from './hooks/useTaskSearch'
import { getTaskAllowInFeats } from './data/feats'

import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './data/firebase'
import Login from './components/Login'

function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // --- Data State ---
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [completions, setCompletions] = useState([])
  const [analyticsCompletions, setAnalyticsCompletions] = useState([])
  const [analyticsPeriod, setAnalyticsPeriod] = useState(null)
  const [settings, setSettings] = useState({
    base_rate: 0.10,
    complexity_multipliers: { LOW: 1.0, MEDIUM: 1.5, HIGH: 2.5 },
  })
  const [page, setPage] = useState('dashboard') // 'dashboard' | 'settings' | 'analytics'
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  const searchResults = useTaskSearch(searchQuery, tasks, categories)

  // Modal states
  const [completingTask, setCompletingTask] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [taskFormMode, setTaskFormMode] = useState('simplified') // 'simplified' | 'full'
  const [cashoutUser_, setCashoutUser] = useState(null)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showFeatsDrawer, setShowFeatsDrawer] = useState(false)
  const [showOneOffSelectionModal, setShowOneOffSelectionModal] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // --- Auth subscription ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setAuthLoading(false)
    })
    return unsubscribe
  }, [])

  // --- Real-time subscriptions ---
  useEffect(() => {
    if (!currentUser) return

    const unsubUsers = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers)
    })
    const unsubTasks = subscribeToTasks((updatedTasks) => {
      setTasks(updatedTasks)
    })
    const unsubCategories = subscribeToCategories((updatedCategories) => {
      setCategories(updatedCategories)
    })
    const unsubSettings = subscribeToSettings((updatedSettings) => {
      setSettings(updatedSettings)
    })

    return () => {
      unsubUsers()
      unsubTasks()
      unsubCategories()
      unsubSettings()
    }
  }, [currentUser])

  // --- Database Auto-Fixer for existing tasks with stale due dates ---
  const hasRanAutoFix = useRef(false);

  useEffect(() => {
    if (!currentUser || tasks.length === 0 || hasRanAutoFix.current) return;
    hasRanAutoFix.current = true;

    let isMounted = true;

    async function autoFixStaleTasks() {
      try {
        const completionsList = await getCompletions(500);
        const completionMap = {};
        (completionsList || []).forEach(comp => {
          const compDate = toJsDate(comp.completedAt);
          if (comp.taskId && compDate) {
            if (!completionMap[comp.taskId] || compDate > completionMap[comp.taskId]) {
              completionMap[comp.taskId] = compDate;
            }
          }
        });

        if (!isMounted) return;

        for (const task of tasks) {
          if (!task) continue;
          if (task.recurrence || task.type === 'recurring') {
            const compDate = completionMap[task.id] || toJsDate(task.lastCompletedAt) || toJsDate(task.lastSkippedAt);
            const currentDue = toJsDate(task.nextDueDate);

            if (task.isActive === false) {
              // Task is inactive: check if it was mistakenly deactivated without completion
              if (!compDate) {
                const created = toJsDate(task.created_at) || new Date();
                const refDate = new Date(created.getTime() - 24 * 60 * 60 * 1000);
                const calculatedDate = calculateNextDueDate(task, refDate);
                if (calculatedDate && !isNaN(calculatedDate.getTime())) {
                  console.log(`[Auto-Fix] Reactivating mistakenly deactivated task "${task.title}" with nextDueDate ${calculatedDate.toISOString()}`);
                  await updateTask(task.id, {
                    isActive: true,
                    nextDueDate: calculatedDate,
                  });
                }
              }
              continue;
            }

            if (compDate) {
              const compDay = new Date(compDate);
              compDay.setHours(0, 0, 0, 0);

              // If nextDueDate is missing OR nextDueDate <= compDay (stale due date)
              if (!currentDue || currentDue.getTime() <= compDay.getTime()) {
                const calculatedDate = calculateNextDueDate(task, compDate);
                if (calculatedDate && !isNaN(calculatedDate.getTime())) {
                  console.log(`[Auto-Fix] Updating "${task.title}" nextDueDate to ${calculatedDate.toISOString()}`);
                  await updateTask(task.id, {
                    lastCompletedAt: compDate,
                    nextDueDate: calculatedDate
                  });
                } else {
                  console.log(`[Auto-Fix] Deactivating exhausted task "${task.title}"`);
                  await updateTask(task.id, {
                    lastCompletedAt: compDate,
                    nextDueDate: null,
                    isActive: false
                  });
                }
              }
            } else if (!currentDue) {
              // Task has no completion date AND no nextDueDate: calculate initial due date
              const created = toJsDate(task.created_at) || new Date();
              const refDate = new Date(created.getTime() - 24 * 60 * 60 * 1000);
              const calculatedDate = calculateNextDueDate(task, refDate);
              if (calculatedDate && !isNaN(calculatedDate.getTime())) {
                console.log(`[Auto-Fix] Setting initial nextDueDate for "${task.title}" to ${calculatedDate.toISOString()}`);
                await updateTask(task.id, {
                  nextDueDate: calculatedDate
                });
              } else {
                console.log(`[Auto-Fix] Deactivating task with no occurrences "${task.title}"`);
                await updateTask(task.id, {
                  nextDueDate: null,
                  isActive: false
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('[Auto-Fix] Error running completion auto-fixer:', err);
      }
    }

    autoFixStaleTasks();

    return () => { isMounted = false; };
  }, [currentUser, tasks]);
  useEffect(() => {
    if (page === 'settings' && currentUser) {
      getCompletions(100).then(setCompletions)
    }
  }, [page, currentUser])

  // --- Derived data ---
  // Date boundaries for dashboard sections
  const now = new Date();
  now.setHours(0,0,0,0);
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);
  threeDaysFromNow.setHours(23,59,59,999);

  // Active tasks (enforcing strict scheduled task visibility: due today or overdue)
  const activeTasks = tasks.filter(t => {
    if (!t.isActive) return false;
    return shouldDisplayScheduledTask(t, now);
  });

  // Sort and add status
  const sortedTasks = sortTasksByUrgency(activeTasks);
  const tasksWithStatus = sortedTasks.map(t => ({
    ...t,
    status: getTaskStatus(t),
  }));

  const criticalTasks = tasksWithStatus.filter(t => t.is_critical && shouldDisplayScheduledTask(t, now));

  const todayTasks = tasksWithStatus.filter(t => !getTaskAllowInFeats(t) && shouldDisplayScheduledTask(t, now));

  const upcomingTasks = tasks.filter(t => {
    if (!t.isActive || t.type === 'always-available' || t.type === 'ad-hoc') return false;
    if (getTaskAllowInFeats(t)) return false;
    if (!t.nextDueDate) return false;
    const due = toJsDate(t.nextDueDate);
    if (!due) return false;
    const endOfToday = new Date(now.getTime() + 24*60*60*1000);
    return due >= endOfToday && due <= threeDaysFromNow;
  });

  // --- Handlers ---
  const handleCompleteTask = useCallback((task) => {
    setCompletingTask(task)
  }, [])

  const handleSkipTask = useCallback(async (task) => {
    try {
      const res = await skipTask(task.id);
      const label = formatNextDueDateLabel(res.nextDueDate);
      const lower = label.toLowerCase();
      const formattedDue = lower === 'today' || lower === 'tomorrow' ? lower : `on ${label}`;
      setToastMessage(`Task skipped. Next due ${formattedDue}`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to skip task:', err);
      alert('Failed to skip task: ' + err.message);
    }
  }, []);

  const handleConfirmCompletion = useCallback(async (taskId, userId, multiplier = 1.0, completedAtDate = null) => {
    await completeTask(taskId, userId, settings.base_rate ?? 0.10, multiplier, settings.complexity_multipliers, completedAtDate)
    setCompletingTask(null)
  }, [settings.base_rate, settings.complexity_multipliers])

  const handleUndoCompletion = useCallback(async (completionId) => {
    try {
      await revertTaskCompletion(completionId);
      setToastMessage('Completion undone');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to undo completion:', err);
      alert('Failed to undo: ' + err.message);
    }
  }, []);

  const handleToggleFavorite = useCallback(async (taskId, isFavorite) => {
    try {
      await updateTask(taskId, { isFavorite })
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }, [])

  const handleSaveTask = useCallback(async (taskData) => {
    if (editingTask && editingTask.id) {
      await updateTask(editingTask.id, taskData)
    } else {
      await addTask(taskData)
    }
    setShowTaskForm(false)
    setEditingTask(null)
  }, [editingTask])

  const handleUpdateSettings = useCallback(async (data) => {
    await updateSettings(data)
  }, [])

  const handleEditTask = useCallback((task) => {
    setEditingTask(task)
    setTaskFormMode('full')
    setShowTaskForm(true)
  }, [])

  const handleDeleteTask = useCallback(async (taskId) => {
    await deleteTask(taskId)
  }, [])

  const handleAddTaskInCategory = useCallback((categoryId) => {
    setEditingTask({ category: categoryId })
    setTaskFormMode('full')
    setShowTaskForm(true)
  }, [])

  const handleSaveCategory = useCallback(async (categoryData) => {
    if (categoryData.id) {
      await updateCategory(categoryData.id, categoryData)
    } else {
      await addCategory(categoryData)
    }
  }, [])

  const handleDeleteCategory = useCallback(async (categoryId) => {
    await deleteCategory(categoryId)
  }, [])

  const handleRevertCompletion = useCallback(async (completionId) => {
    try {
      await revertTaskCompletion(completionId)
      // Refresh completions for whatever page is active
      if (page === 'settings') {
        const updatedCompletions = await getCompletions(100)
        setCompletions(updatedCompletions)
      }
      if (page === 'analytics' && analyticsPeriod) {
        const updated = await getCompletionsForPeriod(analyticsPeriod.start, analyticsPeriod.end)
        setAnalyticsCompletions(updated)
      }
      alert('Completion undone successfully!')
    } catch (err) {
      console.error("Failed to revert completion:", err)
      alert("Error undoing completion: " + err.message)
    }
  }, [page, analyticsPeriod])

  const handleAnalyticsPeriodChange = useCallback(async (startDate, endDate) => {
    setAnalyticsPeriod({ start: startDate, end: endDate })
    try {
      const periodCompletions = await getCompletionsForPeriod(startDate, endDate)
      setAnalyticsCompletions(periodCompletions)
    } catch (err) {
      console.error('Failed to fetch period completions:', err)
    }
  }, [])

  // Pull-to-refresh handler: re-fetches all data from server
  const handleRefresh = useCallback(async () => {
    const [freshUsers, freshTasks, freshCategories] = await Promise.all([
      getUsers(),
      getTasks(),
      getCategories(),
    ])
    setUsers(freshUsers)
    setTasks(freshTasks)
    setCategories(freshCategories)

    // Also refresh completions for the current page context
    if (page === 'settings') {
      const c = await getCompletions(100)
      setCompletions(c)
    }
    if (page === 'analytics' && analyticsPeriod) {
      const c = await getCompletionsForPeriod(analyticsPeriod.start, analyticsPeriod.end)
      setAnalyticsCompletions(c)
    }
  }, [page, analyticsPeriod])

  const handleSaveUser = useCallback(async (userData, avatarFile) => {
    let avatarUrl = userData.avatar || ''
    
    if (avatarFile) {
      avatarUrl = await uploadAvatar(avatarFile, editingUser?.id || 'new')
    }

    const userPayload = { ...userData, avatar: avatarUrl }

    if (editingUser) {
      await updateUser(editingUser.id, userPayload)
    } else {
      await addUser(userPayload)
    }
    setShowUserForm(false)
    setEditingUser(null)
  }, [editingUser])

  const handleEditUser = useCallback((user) => {
    setEditingUser(user)
    setShowUserForm(true)
  }, [])

  const handleDeleteUser = useCallback(async (userId) => {
    await deleteUser(userId)
  }, [])

  const handleCashout = useCallback(async (userId, amount, note) => {
    await cashoutUser(userId, amount, note)
    setCashoutUser(null)
  }, [])

  const handleUserClick = useCallback((user) => {
    setCashoutUser(user)
  }, [])

  // --- Render ---
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text-secondary)',
        fontSize: '18px',
        fontWeight: 600,
        fontFamily: 'var(--font-family)',
      }}>
        Loading VisibleWork...
      </div>
    )
  }

  if (!currentUser) {
    return <Login />
  }

  if (page === 'analytics') {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="app theme-analytics">
          <AnalyticsPage
            users={users}
            tasks={tasks}
            categories={categories}
            completions={analyticsCompletions}
            baseRate={settings.base_rate ?? 0.10}
            complexityMultipliers={settings.complexity_multipliers}
            onEditTask={handleEditTask}
            onRevertCompletion={handleRevertCompletion}
            onPeriodChange={handleAnalyticsPeriodChange}
            onBack={() => setPage('dashboard')}
          />

          {showTaskForm && (
            <TaskForm
              task={editingTask}
              categories={categories}
              baseRate={settings.base_rate ?? 0.10}
              complexityMultipliers={settings.complexity_multipliers}
              mode={taskFormMode}
              onSave={handleSaveTask}
              onCancel={() => { setShowTaskForm(false); setEditingTask(null) }}
            />
          )}
        </div>
      </PullToRefresh>
    )
  }


  if (page === 'settings') {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="app theme-settings">
          <SettingsPage
          users={users}
          tasks={tasks}
          categories={categories}
          completions={completions}
          baseRate={settings.base_rate ?? 0.10}
          complexityMultipliers={settings.complexity_multipliers}
          onUpdateSettings={handleUpdateSettings}
          onAddUser={() => { setEditingUser(null); setShowUserForm(true) }}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onAddTaskInCategory={handleAddTaskInCategory}
          onAddCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
          onRevertCompletion={handleRevertCompletion}
          onCashout={(user) => setCashoutUser(user)}
          onSignOut={() => signOut(auth)}
          onBack={() => setPage('dashboard')}
        />

        {showUserForm && (
          <UserForm
            user={editingUser}
            onSave={handleSaveUser}
            onCancel={() => { setShowUserForm(false); setEditingUser(null) }}
          />
        )}

        {cashoutUser_ && (
          <CashoutDialog
            user={cashoutUser_}
            onConfirm={handleCashout}
            onCancel={() => setCashoutUser(null)}
            onUndoCompletion={handleUndoCompletion}
          />
        )}

        {showTaskForm && (
          <TaskForm
            task={editingTask}
            categories={categories}
            baseRate={settings.base_rate ?? 0.10}
            complexityMultipliers={settings.complexity_multipliers}
            mode={taskFormMode}
            onSave={handleSaveTask}
            onCancel={() => { setShowTaskForm(false); setEditingTask(null) }}
          />
        )}
      </div>
      </PullToRefresh>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="app theme-home">
      {/* Header Block Container */}
      <header className="app-header-block">
        <div className="app-header">
          <div className="app-logo">
            <img src="/favicon.svg" alt="" className="app-logo-icon" />
            <span className="app-logo-text">VisibleWork</span>
          </div>
          <div className="app-header-actions">
            <button
              className={`btn btn-ghost btn-icon ${isSearchOpen ? 'btn-icon--active' : ''}`}
              onClick={() => {
                setIsSearchOpen((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  } else {
                    setSearchQuery('');
                  }
                  return next;
                });
              }}
              id="search-btn"
              title="Search tasks"
              type="button"
            >
              🔍
            </button>
            <button
              className="btn btn-primary app-header-new-btn"
              onClick={() => { setEditingTask(null); setTaskFormMode('simplified'); setShowTaskForm(true) }}
              id="add-task-btn"
            >
              <span>+</span> <span className="app-header-btn-text">New Task</span>
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setPage('analytics')}
              id="analytics-btn"
              title="Analytics & History"
            >
              📊
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setPage('settings')}
              id="settings-btn"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Expandable Search Input Bar */}
        {isSearchOpen && (
          <div className="app-search-bar">
            <div className="app-search-input-wrapper">
              <span className="app-search-icon">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                className="app-search-input"
                placeholder="Search tasks, categories, feats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="app-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              className="app-search-cancel-btn"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
            >
              Cancel
            </button>
          </div>
        )}

        <FamilyBar users={users} onUserClick={handleUserClick} />
      </header>

      {/* Main Dashboard */}
      <main className="app-main">
        {isSearchOpen && searchQuery.trim().length > 0 ? (
          <section className="dashboard-section">
            <SearchResultsList
              searchResults={searchResults}
              searchQuery={searchQuery}
              baseRate={settings.base_rate ?? 0.10}
              complexityMultipliers={settings.complexity_multipliers}
              onSelectTask={(task) => {
                handleCompleteTask(task);
              }}
            />
          </section>
        ) : (
          <>
            {/* Critical Focus Block */}
            <CriticalFocusBlock
              tasks={criticalTasks}
              categories={categories}
              baseRate={settings.base_rate ?? 0.10}
              complexityMultipliers={settings.complexity_multipliers}
              onCompleteTask={handleCompleteTask}
            />

            {/* Feats & Task Generator Widget */}
            <FeatsWidget
              tasks={tasks}
              onOpenGenerator={() => setShowFeatsDrawer(true)}
              onOpenSelection={() => setShowOneOffSelectionModal(true)}
            />

            <section className="dashboard-section">
              <TaskList
                tasks={todayTasks}
                users={users}
                categories={categories}
                baseRate={settings.base_rate ?? 0.10}
                complexityMultipliers={settings.complexity_multipliers}
                onCompleteTask={handleCompleteTask}
                showFavorites
              />
            </section>

            {upcomingTasks.length > 0 && (
              <section className="dashboard-section">
                <TaskList
                  tasks={upcomingTasks}
                  users={users}
                  categories={categories}
                  baseRate={settings.base_rate ?? 0.10}
                  complexityMultipliers={settings.complexity_multipliers}
                  onCompleteTask={handleCompleteTask}
                  sectionLabel="UPCOMING TASKS"
                />
              </section>
            )}

            {/* End-of-Scroll Footer Anchor */}
            <HomeFooter version="v2.7.0" />
          </>
        )}
      </main>

      {/* --- Toast Notification Banner --- */}
      {toastMessage && (
        <div className="toast-notification">
          <span>⏭️ {toastMessage}</span>
        </div>
      )}

      {/* --- Modals / Overlays --- */}

      {completingTask && (
        <TaskCompletionOverlay
          task={completingTask}
          users={users}
          baseRate={settings.base_rate ?? 0.10}
          complexityMultipliers={settings.complexity_multipliers}
          onConfirm={handleConfirmCompletion}
          onCancel={() => setCompletingTask(null)}
          onSkip={(taskToSkip) => {
            setCompletingTask(null);
            handleSkipTask(taskToSkip);
          }}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {showTaskForm && (
        <TaskForm
          task={editingTask}
          categories={categories}
          baseRate={settings.base_rate ?? 0.10}
          complexityMultipliers={settings.complexity_multipliers}
          mode={taskFormMode}
          onSave={handleSaveTask}
          onCancel={() => { setShowTaskForm(false); setEditingTask(null) }}
        />
      )}

      {cashoutUser_ && (
        <CashoutDialog
          user={cashoutUser_}
          onConfirm={handleCashout}
          onCancel={() => setCashoutUser(null)}
          onUndoCompletion={handleUndoCompletion}
        />
      )}

      {showUserForm && (
        <UserForm
          user={editingUser}
          onSave={handleSaveUser}
          onCancel={() => { setShowUserForm(false); setEditingUser(null) }}
        />
      )}

      {showFeatsDrawer && (
        <FeatsDrawer
          tasks={tasks}
          baseRate={settings.base_rate ?? 0.10}
          complexityMultipliers={settings.complexity_multipliers}
          onAcceptTask={(drawnTask) => {
            setShowFeatsDrawer(false)
            handleCompleteTask(drawnTask)
          }}
          onClose={() => setShowFeatsDrawer(false)}
        />
      )}

      {showOneOffSelectionModal && (
        <OneOffTaskSelectionModal
          tasks={tasks}
          categories={categories}
          baseRate={settings.base_rate ?? 0.10}
          complexityMultipliers={settings.complexity_multipliers}
          onSelectTask={(selectedTask) => {
            setShowOneOffSelectionModal(false)
            handleCompleteTask(selectedTask)
          }}
          onClose={() => setShowOneOffSelectionModal(false)}
        />
      )}
    </div>
    </PullToRefresh>
  )
}

export default App

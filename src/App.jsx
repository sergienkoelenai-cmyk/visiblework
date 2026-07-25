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
  cashoutUser, 
  getCompletions, 
  getCompletionsForPeriod,
  getUsers,
  getTasks,
  getCategories,
  uploadAvatar,
  updateSettings,
} from './data/store'
import { sortTasksByUrgency, getTaskStatus, calculateNextDueDate } from './data/scheduler'
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
  
  // Modal states
  const [completingTask, setCompletingTask] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [cashoutUser_, setCashoutUser] = useState(null)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showFeatsDrawer, setShowFeatsDrawer] = useState(false)

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

  // --- Database Auto-Fixer for anomalous due dates ---
  const hasFixedRef = useRef(false)
  useEffect(() => {
    if (!currentUser || tasks.length === 0 || hasFixedRef.current) return
    hasFixedRef.current = true

    const today = new Date()
    today.setHours(0,0,0,0)


    tasks.forEach(async (task) => {
      try {
        if (task.type === 'recurring' && task.nextDueDate) {
          const dueDate = task.nextDueDate.toDate ? task.nextDueDate.toDate() : new Date(task.nextDueDate)
          if (isNaN(dueDate.getTime())) return

          if (dueDate < today) {
            if (task.lastCompletedAt) {
              const compDate = task.lastCompletedAt.toDate ? task.lastCompletedAt.toDate() : new Date(task.lastCompletedAt)
              if (isNaN(compDate.getTime())) return

              const calculatedDate = calculateNextDueDate(task, compDate)
              if (calculatedDate && !isNaN(calculatedDate.getTime()) && calculatedDate > dueDate) {
                console.log(`[Auto-Fix] Correcting nextDueDate for "${task.title}"`)
                await updateTask(task.id, {
                  nextDueDate: calculatedDate
                })
              }
            }
          }
        }
      } catch (err) {
        console.error('[Auto-Fix] Error checking task:', task.title, err)
      }
    })
  }, [currentUser, tasks])
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

  // Active tasks (including always-available, ad-hoc, and those due within next 3 days)
  const activeTasks = tasks.filter(t => {
    if (!t.isActive) return false;
    if (t.type === 'always-available') return true;
    if (t.type === 'ad-hoc') return true;
    if (t.nextDueDate) {
      const dueDate = t.nextDueDate.toDate ? t.nextDueDate.toDate() : new Date(t.nextDueDate);
      return dueDate <= threeDaysFromNow;
    }
    return true;
  });

  // Sort and add status
  const sortedTasks = sortTasksByUrgency(activeTasks);
  const tasksWithStatus = sortedTasks.map(t => ({
    ...t,
    status: getTaskStatus(t),
  }));

  // Split tasks for dashboard sections
  const endOfToday = new Date(now.getTime() + 24*60*60*1000);

  const criticalTasks = tasksWithStatus.filter(t => {
    if (!t.is_critical) return false;
    if (t.type === 'always-available' || t.type === 'ad-hoc') return true;
    if (!t.nextDueDate) return false;
    const due = t.nextDueDate.toDate ? t.nextDueDate.toDate() : new Date(t.nextDueDate);
    return due < endOfToday; // Due today or overdue
  });

  const todayTasks = tasksWithStatus.filter(t => {
    if (t.type === 'always-available' || t.type === 'ad-hoc') return true;
    if (!t.nextDueDate) return false;
    const due = t.nextDueDate.toDate ? t.nextDueDate.toDate() : new Date(t.nextDueDate);
    return due < endOfToday; // Includes overdue and due today
  });

  const upcomingTasks = tasksWithStatus.filter(t => {
    if (t.type === 'always-available' || t.type === 'ad-hoc') return false;
    if (!t.nextDueDate) return false;
    const due = t.nextDueDate.toDate ? t.nextDueDate.toDate() : new Date(t.nextDueDate);
    return due >= endOfToday && due <= threeDaysFromNow;
  });

  // --- Handlers ---
  const handleCompleteTask = useCallback((task) => {
    setCompletingTask(task)
  }, [])

  const handleConfirmCompletion = useCallback(async (taskId, userId, multiplier = 1.0, completedAtDate = null) => {
    await completeTask(taskId, userId, settings.base_rate ?? 0.10, multiplier, settings.complexity_multipliers, completedAtDate)
    setCompletingTask(null)
  }, [settings.base_rate, settings.complexity_multipliers])

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
    setShowTaskForm(true)
  }, [])

  const handleDeleteTask = useCallback(async (taskId) => {
    await deleteTask(taskId)
  }, [])

  const handleAddTaskInCategory = useCallback((categoryId) => {
    setEditingTask({ category: categoryId })
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
        <div className="app">
          <AnalyticsPage
            users={users}
            completions={analyticsCompletions}
            onRevertCompletion={handleRevertCompletion}
            onPeriodChange={handleAnalyticsPeriodChange}
            onBack={() => setPage('dashboard')}
          />
        </div>
      </PullToRefresh>
    )
  }

  if (page === 'settings') {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="app">
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
          />
        )}

        {showTaskForm && (
          <TaskForm
            task={editingTask}
            categories={categories}
            baseRate={settings.base_rate ?? 0.10}
            complexityMultipliers={settings.complexity_multipliers}
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
      <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <img src="/favicon.svg" alt="" className="app-logo-icon" />
          <span className="app-logo-text">VisibleWork</span>
        </div>
        <div className="app-header-actions">
          <button
            className="btn btn-primary"
            onClick={() => { setEditingTask(null); setShowTaskForm(true) }}
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
      </header>

      {/* Main Dashboard */}
      <main className="app-main">
        {/* Critical Focus Block */}
        <CriticalFocusBlock
          tasks={criticalTasks}
          categories={categories}
          baseRate={settings.base_rate ?? 0.10}
          complexityMultipliers={settings.complexity_multipliers}
          onCompleteTask={handleCompleteTask}
        />

        {/* Family Members */}
        <FamilyBar users={users} onUserClick={handleUserClick} />

        {/* Feats & Task Generator Widget */}
        <FeatsWidget tasks={tasks} onOpenGenerator={() => setShowFeatsDrawer(true)} />

        <section className="dashboard-section">
          <h2 className="section-title">Due today</h2>
          <TaskList tasks={todayTasks} categories={categories} baseRate={settings.base_rate ?? 0.10} complexityMultipliers={settings.complexity_multipliers} onCompleteTask={handleCompleteTask} showFavorites />
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Upcoming tasks</h2>
          <TaskList tasks={upcomingTasks} categories={categories} baseRate={settings.base_rate ?? 0.10} complexityMultipliers={settings.complexity_multipliers} onCompleteTask={handleCompleteTask} />
        </section>

        {/* Full task list removed */}
      </main>

      {/* --- Modals / Overlays --- */}

      {completingTask && (
        <TaskCompletionOverlay
          task={completingTask}
          users={users}
          baseRate={settings.base_rate ?? 0.10}
          complexityMultipliers={settings.complexity_multipliers}
          onConfirm={handleConfirmCompletion}
          onCancel={() => setCompletingTask(null)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {showTaskForm && (
        <TaskForm
          task={editingTask}
          categories={categories}
          baseRate={settings.base_rate ?? 0.10}
          complexityMultipliers={settings.complexity_multipliers}
          onSave={handleSaveTask}
          onCancel={() => { setShowTaskForm(false); setEditingTask(null) }}
        />
      )}

      {cashoutUser_ && (
        <CashoutDialog
          user={cashoutUser_}
          onConfirm={handleCashout}
          onCancel={() => setCashoutUser(null)}
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
    </div>
    </PullToRefresh>
  )
}

export default App

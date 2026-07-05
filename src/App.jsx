import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { 
  subscribeToUsers, 
  subscribeToTasks, 
  subscribeToCategories,
  addUser, 
  updateUser, 
  deleteUser, 
  addTask, 
  updateTask, 
  deleteTask, 
  addCategory,
  deleteCategory,
  completeTask, 
  revertTaskCompletion,
  cashoutUser, 
  getCompletions, 
  uploadAvatar 
} from './data/store'
import { sortTasksByUrgency, getTaskStatus } from './data/scheduler'
import FamilyBar from './components/FamilyBar'
import TaskList from './components/TaskList'
import TaskCompletionOverlay from './components/TaskCompletionOverlay'
import TaskForm from './components/TaskForm'
import CashoutDialog from './components/CashoutDialog'
import SettingsPage from './components/SettingsPage'
import UserForm from './components/UserForm'

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
  const [page, setPage] = useState('dashboard') // 'dashboard' | 'settings'
  
  // Modal states
  const [completingTask, setCompletingTask] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [cashoutUser_, setCashoutUser] = useState(null)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

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

    return () => {
      unsubUsers()
      unsubTasks()
      unsubCategories()
    }
  }, [currentUser])

  // Load completions when going to settings
  useEffect(() => {
    if (page === 'settings' && currentUser) {
      getCompletions(100).then(setCompletions)
    }
  }, [page, currentUser])

  // --- Derived data ---
  const activeTasks = tasks.filter(t => {
    if (!t.isActive) return false;
    if (t.type === 'always-available') return true;
    if (t.type === 'ad-hoc') return true;
    if (t.nextDueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);
      
      const dueDate = t.nextDueDate.toDate ? t.nextDueDate.toDate() : new Date(t.nextDueDate);
      return dueDate <= threeDaysFromNow;
    }
    return true;
  })
  const sortedTasks = sortTasksByUrgency(activeTasks)
  const tasksWithStatus = sortedTasks.map(t => ({
    ...t,
    status: getTaskStatus(t),
  }))

  // --- Handlers ---
  const handleCompleteTask = useCallback((task) => {
    setCompletingTask(task)
  }, [])

  const handleConfirmCompletion = useCallback(async (taskId, userId) => {
    await completeTask(taskId, userId)
    setCompletingTask(null)
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
    await addCategory(categoryData)
  }, [])

  const handleDeleteCategory = useCallback(async (categoryId) => {
    await deleteCategory(categoryId)
  }, [])

  const handleRevertCompletion = useCallback(async (completionId) => {
    await revertTaskCompletion(completionId)
    if (page === 'settings') {
      const updatedCompletions = await getCompletions(100)
      setCompletions(updatedCompletions)
    }
  }, [page])

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

  if (page === 'settings') {
    return (
      <div className="app">
        <SettingsPage
          users={users}
          tasks={tasks}
          categories={categories}
          completions={completions}
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
            categories={CATEGORIES}
            onSave={handleSaveTask}
            onCancel={() => { setShowTaskForm(false); setEditingTask(null) }}
          />
        )}
      </div>
    )
  }

  return (
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
            <span>+</span> New Task
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
        {/* Family Members */}
        <FamilyBar users={users} onUserClick={handleUserClick} />

        {/* Task List */}
        <TaskList
          tasks={tasksWithStatus}
          categories={CATEGORIES}
          onCompleteTask={handleCompleteTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
        />
      </main>

      {/* --- Modals / Overlays --- */}

      {completingTask && (
        <TaskCompletionOverlay
          task={completingTask}
          users={users}
          onConfirm={handleConfirmCompletion}
          onCancel={() => setCompletingTask(null)}
        />
      )}

      {showTaskForm && (
        <TaskForm
          task={editingTask}
          categories={CATEGORIES}
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
    </div>
  )
}

export default App

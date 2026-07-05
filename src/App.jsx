import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { subscribeToUsers, subscribeToTasks, addUser, updateUser, deleteUser, addTask, updateTask, deleteTask, completeTask, cashoutUser, getCompletions, uploadAvatar } from './data/store'
import { sortTasksByUrgency, getTaskStatus } from './data/scheduler'
import FamilyBar from './components/FamilyBar'
import TaskList from './components/TaskList'
import TaskCompletionOverlay from './components/TaskCompletionOverlay'
import TaskForm from './components/TaskForm'
import CashoutDialog from './components/CashoutDialog'
import SettingsPage from './components/SettingsPage'
import UserForm from './components/UserForm'

const CATEGORIES = [
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
]

function App() {
  // --- State ---
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [completions, setCompletions] = useState([])
  const [page, setPage] = useState('dashboard') // 'dashboard' | 'settings'
  
  // Modal states
  const [completingTask, setCompletingTask] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [cashoutUser_, setCashoutUser] = useState(null)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  // --- Real-time subscriptions ---
  useEffect(() => {
    const unsubUsers = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers)
    })
    const unsubTasks = subscribeToTasks((updatedTasks) => {
      setTasks(updatedTasks)
    })

    return () => {
      unsubUsers()
      unsubTasks()
    }
  }, [])

  // Load completions when going to settings
  useEffect(() => {
    if (page === 'settings') {
      getCompletions(100).then(setCompletions)
    }
  }, [page])

  // --- Derived data ---
  const activeTasks = tasks.filter(t => t.isActive)
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
    if (editingTask) {
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
  if (page === 'settings') {
    return (
      <div className="app">
        <SettingsPage
          users={users}
          tasks={tasks}
          completions={completions}
          onAddUser={() => { setEditingUser(null); setShowUserForm(true) }}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onCashout={(user) => setCashoutUser(user)}
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

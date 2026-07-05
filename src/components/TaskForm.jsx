import React, { useState, useEffect } from 'react';
import './TaskForm.css';

const RECURRENCE_MODES = [
  { value: 'interval_from_completion', label: 'After completion' },
  { value: 'fixed_interval', label: 'Fixed schedule' },
  { value: 'custom_schedule', label: 'Custom dates' },
];

export default function TaskForm({ task = null, categories = [], onSave, onCancel }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [taskType, setTaskType] = useState('ad-hoc');

  // Recurrence
  const [recurrenceMode, setRecurrenceMode] = useState('interval_from_completion');
  const [intervalDays, setIntervalDays] = useState('');
  const [fixedIntervalValue, setFixedIntervalValue] = useState('');
  const [fixedIntervalUnit, setFixedIntervalUnit] = useState('days');
  const [fixedAnchorDate, setFixedAnchorDate] = useState('');
  const [customDates, setCustomDates] = useState(['']);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setCategory(task.category || '');
      setPrice(task.price != null ? String(task.price) : '');
      setTaskType(task.type || 'ad-hoc');
      if (task.recurrence) {
        setRecurrenceMode(task.recurrence.mode || 'interval_from_completion');
        setIntervalDays(task.recurrence.intervalDays != null ? String(task.recurrence.intervalDays) : '');
        setFixedIntervalValue(task.recurrence.fixedIntervalValue != null ? String(task.recurrence.fixedIntervalValue) : '');
        setFixedIntervalUnit(task.recurrence.fixedIntervalUnit || 'days');
        setFixedAnchorDate(task.recurrence.fixedAnchorDate || '');
        setCustomDates(task.recurrence.customDates?.length ? task.recurrence.customDates : ['']);
      }
    }
    requestAnimationFrame(() => setVisible(true));
  }, [task]);

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!price || Number(price) <= 0) errs.price = 'Enter a valid price';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Calculate initial nextDueDate for new recurring tasks
    let nextDueDate = null;
    if (taskType === 'recurring') {
      if (recurrenceMode === 'interval_from_completion') {
        // First occurrence is due today (it hasn't been done yet)
        nextDueDate = new Date();
      } else if (recurrenceMode === 'fixed_interval') {
        const anchor = fixedAnchorDate ? new Date(fixedAnchorDate) : new Date();
        nextDueDate = anchor;
      } else if (recurrenceMode === 'custom_schedule') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sorted = customDates
          .filter(d => d)
          .map(d => new Date(d))
          .sort((a, b) => a - b);
        nextDueDate = sorted.find(d => d >= today) || sorted[0] || new Date();
      }
    } else if (taskType === 'always-available') {
      nextDueDate = new Date();
    } else {
      // Ad-hoc tasks are due today by default
      nextDueDate = new Date();
    }

    const data = {
      title: title.trim(),
      description: description.trim(),
      category,
      price: parseFloat(price),
      type: taskType,
      isActive: true,
      nextDueDate,
    };

    if (taskType === 'recurring') {
      const recurrence = { mode: recurrenceMode };
      
      if (recurrenceMode === 'interval_from_completion') {
        recurrence.intervalDays = parseInt(intervalDays, 10) || 1;
      } else if (recurrenceMode === 'fixed_interval') {
        recurrence.fixedIntervalValue = parseInt(fixedIntervalValue, 10) || 1;
        recurrence.fixedIntervalUnit = fixedIntervalUnit;
        recurrence.fixedAnchorDate = fixedAnchorDate || new Date().toISOString().slice(0, 10);
      } else if (recurrenceMode === 'custom_schedule') {
        recurrence.customDates = customDates.filter(d => d);
      }

      data.recurrence = recurrence;
    } else {
      data.recurrence = null;
    }

    onSave?.(data);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onCancel?.(), 300);
  };

  const addCustomDate = () => setCustomDates([...customDates, '']);
  const removeCustomDate = (idx) => setCustomDates(customDates.filter((_, i) => i !== idx));
  const updateCustomDate = (idx, val) => {
    const next = [...customDates];
    next[idx] = val;
    setCustomDates(next);
  };

  return (
    <div className={`task-form-overlay ${visible ? 'task-form-overlay--visible' : ''}`} onClick={handleClose}>
      <form className="task-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="task-form__title">{task ? 'Edit Task' : 'New Task'}</h2>

        {/* Title */}
        <label className="task-form__label">
          Title
          <input
            className={`task-form__input ${errors.title ? 'task-form__input--error' : ''}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Vacuum living room"
          />
          {errors.title && <span className="task-form__error">{errors.title}</span>}
        </label>

        {/* Description */}
        <label className="task-form__label">
          Description <span className="task-form__optional">(optional)</span>
          <textarea
            className="task-form__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Any extra details…"
          />
        </label>

        {/* Category & Price Row */}
        <div className="task-form__row">
          {/* Category */}
          <label className="task-form__label">
            Category
            <select className="task-form__select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select category…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </label>

          {/* Price */}
          <label className="task-form__label">
            Price (€)
            <input
              className={`task-form__input ${errors.price ? 'task-form__input--error' : ''}`}
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
            {errors.price && <span className="task-form__error">{errors.price}</span>}
          </label>
        </div>

        {/* Task type toggle */}
        <div className="task-form__toggle-group">
          <button
            type="button"
            className={`task-form__toggle ${taskType === 'ad-hoc' ? 'task-form__toggle--active' : ''}`}
            onClick={() => setTaskType('ad-hoc')}
          >
            One-time
          </button>
          <button
            type="button"
            className={`task-form__toggle ${taskType === 'recurring' ? 'task-form__toggle--active' : ''}`}
            onClick={() => setTaskType('recurring')}
          >
            ↻ Recurring
          </button>
          <button
            type="button"
            className={`task-form__toggle ${taskType === 'always-available' ? 'task-form__toggle--active' : ''}`}
            onClick={() => setTaskType('always-available')}
          >
            ∞ Always available
          </button>
        </div>

        {/* Recurrence config */}
        {taskType === 'recurring' && (
          <div className="task-form__recurrence">
            <label className="task-form__label">
              Recurrence Mode
              <select className="task-form__select" value={recurrenceMode} onChange={(e) => setRecurrenceMode(e.target.value)}>
                {RECURRENCE_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>

            {recurrenceMode === 'interval_from_completion' && (
              <label className="task-form__label">
                Days after completion
                <input
                  className="task-form__input"
                  type="number"
                  min="1"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  placeholder="e.g. 3"
                />
              </label>
            )}

            {recurrenceMode === 'fixed_interval' && (
              <>
                <div className="task-form__row">
                  <label className="task-form__label task-form__label--flex">
                    Every
                    <input
                      className="task-form__input"
                      type="number"
                      min="1"
                      value={fixedIntervalValue}
                      onChange={(e) => setFixedIntervalValue(e.target.value)}
                      placeholder="1"
                    />
                  </label>
                  <label className="task-form__label task-form__label--flex">
                    Unit
                    <select className="task-form__select" value={fixedIntervalUnit} onChange={(e) => setFixedIntervalUnit(e.target.value)}>
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                    </select>
                  </label>
                </div>
                <label className="task-form__label">
                  Starting from (anchor date)
                  <input
                    className="task-form__input"
                    type="date"
                    value={fixedAnchorDate}
                    onChange={(e) => setFixedAnchorDate(e.target.value)}
                  />
                </label>
              </>
            )}

            {recurrenceMode === 'custom_schedule' && (
              <div className="task-form__custom-dates">
                <span className="task-form__label-text">Dates</span>
                {customDates.map((d, idx) => (
                  <div key={idx} className="task-form__date-row">
                    <input
                      className="task-form__input"
                      type="date"
                      value={d}
                      onChange={(e) => updateCustomDate(idx, e.target.value)}
                    />
                    {customDates.length > 1 && (
                      <button type="button" className="task-form__date-remove" onClick={() => removeCustomDate(idx)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="task-form__date-add" onClick={addCustomDate}>
                  + Add date
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="task-form__actions">
          <button type="button" className="task-form__btn task-form__btn--cancel" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="task-form__btn task-form__btn--save">
            {task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

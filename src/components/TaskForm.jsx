import React, { useState, useEffect, useMemo } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { RRule, rrulestr } from 'rrule';
import {
  COMPLEXITY,
  ESTIMATED_TIME,
  COMPLEXITY_LABELS,
  TIME_LABELS,
  getTaskBaseCost,
} from '../data/pricing';
import './TaskForm.css';

const WEEKDAYS = [
  { key: 'MO', label: 'M' },
  { key: 'TU', label: 'T' },
  { key: 'WE', label: 'W' },
  { key: 'TH', label: 'T' },
  { key: 'FR', label: 'F' },
  { key: 'SA', label: 'S' },
  { key: 'SU', label: 'S' },
];

export default function TaskForm({ task = null, categories = [], baseRate = 10, onSave, onCancel }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // Pricing state
  const [complexity, setComplexity] = useState(COMPLEXITY.LOW);
  const [estimatedTime, setEstimatedTime] = useState(ESTIMATED_TIME.SHORT);
  const [customCost, setCustomCost] = useState(null); // null = auto
  const [editingCost, setEditingCost] = useState(false); // show inline input
  const [customCostInput, setCustomCostInput] = useState('');

  // Icon
  const [icon, setIcon] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // New Recurrence States
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDateType, setEndDateType] = useState('never');
  const [endDateValue, setEndDateValue] = useState(new Date().toISOString().slice(0, 10));
  const [endCountValue, setEndCountValue] = useState(10);
  const [repeatFrequency, setRepeatFrequency] = useState('none');
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [monthlyStrategy, setMonthlyStrategy] = useState('day_of_month');
  const [monthlyDayOfMonth, setMonthlyDayOfMonth] = useState(new Date().getDate());
  const [monthlyDayOfWeekPos, setMonthlyDayOfWeekPos] = useState(1);
  const [monthlyDayOfWeekDay, setMonthlyDayOfWeekDay] = useState('MO');
  const [customInterval, setCustomInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState('days');
  const [fromLastCompletion, setFromLastCompletion] = useState(false);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setCategory(task.category || '');

      // Pricing fields
      setComplexity(task.complexity || COMPLEXITY.LOW);
      setEstimatedTime(task.estimated_time || ESTIMATED_TIME.SHORT);
      if (task.custom_cost !== null && task.custom_cost !== undefined) {
        setCustomCost(task.custom_cost);
        setCustomCostInput(String(task.custom_cost));
      } else {
        setCustomCost(null);
        setCustomCostInput('');
      }
      setIcon(task.icon || '');

      // Parse existing recurrence/RRule string
      const parsed = parseRRuleToState(task.recurrence, task.type);
      setStartDate(parsed.startDate);
      setEndDateType(parsed.endDateType);
      setEndDateValue(parsed.endDateValue);
      setEndCountValue(parsed.endCountValue);
      setRepeatFrequency(parsed.repeatFrequency);
      setWeeklyDays(parsed.weeklyDays);
      setMonthlyStrategy(parsed.monthlyStrategy);
      setMonthlyDayOfMonth(parsed.monthlyDayOfMonth);
      setMonthlyDayOfWeekPos(parsed.monthlyDayOfWeekPos);
      setMonthlyDayOfWeekDay(parsed.monthlyDayOfWeekDay);
      setCustomInterval(parsed.customInterval);
      setCustomUnit(parsed.customUnit);
      setFromLastCompletion(parsed.fromLastCompletion);
    }
    requestAnimationFrame(() => setVisible(true));
  }, [task]);

  const toggleWeeklyDay = (dayKey) => {
    if (weeklyDays.includes(dayKey)) {
      setWeeklyDays(weeklyDays.filter(d => d !== dayKey));
    } else {
      setWeeklyDays([...weeklyDays, dayKey]);
    }
  };

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    let computedType = 'ad-hoc';
    if (repeatFrequency === 'always') {
      computedType = 'always-available';
    } else if (repeatFrequency !== 'none') {
      computedType = 'recurring';
    }

    let recurrence = null;
    if (computedType === 'recurring') {
      if (repeatFrequency === 'custom' && fromLastCompletion) {
        recurrence = {
          mode: 'interval_from_completion',
          intervalValue: parseInt(customInterval, 10) || 1,
          intervalUnit: customUnit,
          startDate: startDate,
        };
      } else {
        const rule = generateRRule({
          startDate,
          endDateType,
          endDateValue,
          endCountValue,
          repeatFrequency,
          weeklyDays,
          monthlyStrategy,
          monthlyDayOfMonth,
          monthlyDayOfWeekPos,
          monthlyDayOfWeekDay,
          customInterval,
          customUnit,
        });
        recurrence = rule ? rule.toString() : null;
      }
    }

    let nextDueDate = null;

    // Check if configuration did not change to preserve existing nextDueDate
    if (task && computedType === task.type) {
      const oldStr = typeof task.recurrence === 'string' ? task.recurrence : JSON.stringify(task.recurrence);
      const newStr = typeof recurrence === 'string' ? recurrence : JSON.stringify(recurrence);
      if (oldStr === newStr && task.nextDueDate) {
        nextDueDate = task.nextDueDate.toDate ? task.nextDueDate.toDate() : new Date(task.nextDueDate);
      }
    }

    // Recalculate if it is a new task or if configuration changed
    if (nextDueDate === null) {
      if (computedType === 'always-available') {
        nextDueDate = new Date();
      } else if (computedType === 'recurring') {
        const lastComp = task && task.lastCompletedAt
          ? (task.lastCompletedAt.toDate ? task.lastCompletedAt.toDate() : new Date(task.lastCompletedAt))
          : null;

        if (repeatFrequency === 'custom' && fromLastCompletion) {
          if (lastComp) {
            const val = parseInt(customInterval, 10) || 1;
            const unit = customUnit;
            if (unit === 'weeks') {
              nextDueDate = new Date(lastComp.getTime() + val * 7 * 24 * 60 * 60 * 1000);
            } else if (unit === 'months') {
              const d = new Date(lastComp);
              d.setMonth(d.getMonth() + val);
              nextDueDate = d;
            } else {
              nextDueDate = new Date(lastComp.getTime() + val * 24 * 60 * 60 * 1000);
            }
            nextDueDate.setHours(0, 0, 0, 0);
          } else {
            const [year, month, day] = startDate.split('-').map(Number);
            nextDueDate = new Date(year, month - 1, day);
          }
        } else {
          const rule = generateRRule({
            startDate,
            endDateType,
            endDateValue,
            endCountValue,
            repeatFrequency,
            weeklyDays,
            monthlyStrategy,
            monthlyDayOfMonth,
            monthlyDayOfWeekPos,
            monthlyDayOfWeekDay,
            customInterval,
            customUnit,
          });
          if (rule) {
            const refDate = lastComp
              ? lastComp
              : (() => {
                  const [year, month, day] = startDate.split('-').map(Number);
                  return new Date(new Date(year, month - 1, day).getTime() - 1000);
                })();
            const initial = rule.after(refDate);
            nextDueDate = initial ? new Date(initial) : new Date();
          } else {
            nextDueDate = new Date();
          }
        }
      } else {
        // Ad-hoc tasks start on the chosen start date
        const [year, month, day] = startDate.split('-').map(Number);
        nextDueDate = new Date(year, month - 1, day);
      }
    }

    const data = {
      title: title.trim(),
      description: description.trim(),
      category,
      complexity,
      estimated_time: estimatedTime,
      custom_cost: customCost,
      // Compute and persist the effective price so legacy readers still work
      price: getTaskBaseCost(
        { complexity, estimated_time: estimatedTime, custom_cost: customCost },
        baseRate
      ),
      type: computedType,
      icon: icon || null,
      isActive: true,
      nextDueDate,
      recurrence,
    };

    onSave?.(data);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onCancel?.(), 300);
  };

  const recurrenceSummary = useMemo(() => {
    if (repeatFrequency === 'none') {
      const [year, month, day] = startDate.split('-').map(Number);
      const startD = new Date(year, month - 1, day);
      const startStr = startD.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      return `One-time task scheduled for ${startStr}.`;
    }
    if (repeatFrequency === 'always') {
      return 'Always available task (can be completed multiple times at any time).';
    }
    if (repeatFrequency === 'custom' && fromLastCompletion) {
      const [year, month, day] = startDate.split('-').map(Number);
      const startD = new Date(year, month - 1, day);
      const startStr = startD.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      return `This task will repeat every ${customInterval} ${customUnit} after each completion starting ${startStr}.`;
    }

    try {
      const rule = generateRRule({
        startDate,
        endDateType,
        endDateValue,
        endCountValue,
        repeatFrequency,
        weeklyDays,
        monthlyStrategy,
        monthlyDayOfMonth,
        monthlyDayOfWeekPos,
        monthlyDayOfWeekDay,
        customInterval,
        customUnit,
      });

      if (!rule) return 'Recurring schedule config error.';

      const [year, month, day] = startDate.split('-').map(Number);
      const startD = new Date(year, month - 1, day);
      const startStr = startD.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      
      return `This task will run ${rule.toText()} starting ${startStr}.`;
    } catch (e) {
      return 'Calculating schedule summary…';
    }
  }, [
    startDate,
    endDateType,
    endDateValue,
    endCountValue,
    repeatFrequency,
    weeklyDays,
    monthlyStrategy,
    monthlyDayOfMonth,
    monthlyDayOfWeekPos,
    monthlyDayOfWeekDay,
    customInterval,
    customUnit,
    fromLastCompletion,
  ]);

  return (
    <div 
      className={`task-form-overlay ${visible ? 'task-form-overlay--visible' : ''}`} 
      onClick={handleClose}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
    >
      <form className="task-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="task-form__title">{task ? 'Edit Task' : 'New Task'}</h2>

        {/* Icon and Title */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <label className="task-form__label">
              Icon
              <button 
                type="button"
                className="task-form__input"
                style={{ width: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', cursor: 'pointer', padding: 0 }}
                onClick={(e) => { e.preventDefault(); setShowEmojiPicker(prev => !prev); }}
              >
                {icon || '📋'}
              </button>
            </label>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: '4px' }}>
                <EmojiPicker 
                  onEmojiClick={(emojiData) => {
                    setIcon(emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                  width={280}
                  height={350}
                  lazyLoadEmojis={true}
                  searchDisabled={true}
                  skinTonesDisabled={true}
                />
              </div>
            )}
          </div>

          <label className="task-form__label" style={{ flex: 1 }}>
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
        </div>

        {/* Description */}
        <label className="task-form__label">
          Description <span className="task-form__optional">(optional)</span>
          <textarea
            className="task-form__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Any extra details…"
          />
        </label>

        {/* Category row */}
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
        </div>

        {/* Pricing section */}
        <div className="task-form__pricing-section">
          {/* Complexity */}
          <div>
            <div className="task-form__pricing-label">Effort / Complexity</div>
            <div className="task-form__segment-group">
              {Object.values(COMPLEXITY).map((val) => {
                const info = COMPLEXITY_LABELS[val];
                const active = complexity === val;
                return (
                  <button
                    key={val}
                    type="button"
                    className={`task-form__segment-btn task-form__segment-btn--${val.toLowerCase()} ${active ? 'task-form__segment-btn--active' : ''}`}
                    onClick={() => { setComplexity(val); setCustomCost(null); setEditingCost(false); }}
                  >
                    <span className="task-form__segment-emoji">{info.emoji}</span>
                    <span className="task-form__segment-label">{info.label}</span>
                    <span className="task-form__segment-hint">{info.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <div className="task-form__pricing-label">Duration</div>
            <div className="task-form__segment-group">
              {Object.values(ESTIMATED_TIME).map((val) => {
                const info = TIME_LABELS[val];
                const active = estimatedTime === val;
                return (
                  <button
                    key={val}
                    type="button"
                    className={`task-form__segment-btn ${active ? 'task-form__segment-btn--active' : ''}`}
                    onClick={() => { setEstimatedTime(val); setCustomCost(null); setEditingCost(false); }}
                  >
                    <span className="task-form__segment-emoji">{info.emoji}</span>
                    <span className="task-form__segment-label">{info.label}</span>
                    <span className="task-form__segment-hint">{info.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cost badge */}
          {!editingCost ? (
            <div className="task-form__cost-badge">
              <span className="task-form__cost-value">
                €{getTaskBaseCost({ complexity, estimated_time: estimatedTime, custom_cost: customCost }, baseRate).toFixed(2)}
              </span>
              <span className={`task-form__cost-tag ${customCost !== null ? 'task-form__cost-tag--custom' : ''}`}>
                {customCost !== null ? 'custom' : 'auto'}
              </span>
              <button
                type="button"
                className="task-form__cost-edit-btn"
                onClick={() => {
                  setCustomCostInput(String(getTaskBaseCost({ complexity, estimated_time: estimatedTime, custom_cost: customCost }, baseRate)));
                  setEditingCost(true);
                }}
              >
                ✏️ Edit
              </button>
            </div>
          ) : (
            <div className="task-form__custom-cost-row">
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>€</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="task-form__input"
                value={customCostInput}
                autoFocus
                onChange={(e) => setCustomCostInput(e.target.value)}
                onBlur={() => {
                  const n = parseFloat(customCostInput);
                  if (!isNaN(n) && n >= 0) {
                    setCustomCost(n);
                  }
                  setEditingCost(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
                  if (e.key === 'Escape') { setEditingCost(false); }
                }}
              />
              <button
                type="button"
                className="task-form__custom-cost-reset"
                onClick={() => { setCustomCost(null); setCustomCostInput(''); setEditingCost(false); }}
              >
                🔄 Reset to auto
              </button>
            </div>
          )}
        </div>

        {/* PROGRESSIVE RECURRENCE EDITOR */}
        <div className="task-form__recurrence-section">
          {/* Row 1: Start date & Ends */}
          <div className="task-form__row">
            <label className="task-form__label">
              Start date
              <input
                type="date"
                className="task-form__input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            {repeatFrequency !== 'none' && repeatFrequency !== 'always' && (
              <label className="task-form__label">
                Ends
                <select
                  className="task-form__select"
                  value={endDateType}
                  onChange={(e) => setEndDateType(e.target.value)}
                >
                  <option value="never">Never ends</option>
                  <option value="date">On date</option>
                  <option value="count">After occurrences</option>
                </select>
              </label>
            )}
          </div>

          {/* Conditional Ends value fields */}
          {repeatFrequency !== 'none' && repeatFrequency !== 'always' && endDateType === 'date' && (
            <label className="task-form__label">
              End Date
              <input
                type="date"
                className="task-form__input"
                value={endDateValue}
                onChange={(e) => setEndDateValue(e.target.value)}
              />
            </label>
          )}

          {repeatFrequency !== 'none' && repeatFrequency !== 'always' && endDateType === 'count' && (
            <label className="task-form__label">
              Number of occurrences
              <input
                type="number"
                min="1"
                className="task-form__input"
                value={endCountValue}
                onChange={(e) => setEndCountValue(parseInt(e.target.value, 10) || 1)}
              />
            </label>
          )}

          {/* Row 2: Repeat frequency */}
          <label className="task-form__label">
            Repeat Frequency
            <select
              className="task-form__select"
              value={repeatFrequency}
              onChange={(e) => {
                const freq = e.target.value;
                setRepeatFrequency(freq);
                if (freq === 'weekly' && weeklyDays.length === 0) {
                  const todayDay = new Date().getDay();
                  const weekdayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
                  setWeeklyDays([weekdayMap[todayDay]]);
                }
              }}
            >
              <option value="none">Does not repeat (One-time)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="always">Always available</option>
              <option value="custom">Custom...</option>
            </select>
          </label>

          {/* Row 3+: Dynamic Containers */}
          {repeatFrequency === 'custom' && (
            <div className="task-form__dynamic-container task-form__card">
              <div className="task-form__row">
                <label className="task-form__label">
                  Repeat every
                  <input
                    type="number"
                    min="1"
                    className="task-form__input"
                    value={customInterval}
                    onChange={(e) => setCustomInterval(parseInt(e.target.value, 10) || 1)}
                  />
                </label>
                <label className="task-form__label">
                  Unit
                  <select
                    className="task-form__select"
                    value={customUnit}
                    onChange={(e) => {
                      const unit = e.target.value;
                      setCustomUnit(unit);
                      if (unit === 'weeks' && weeklyDays.length === 0) {
                        const todayDay = new Date().getDay();
                        const weekdayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
                        setWeeklyDays([weekdayMap[todayDay]]);
                      }
                    }}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="from-last-completion"
                  checked={fromLastCompletion}
                  onChange={(e) => setFromLastCompletion(e.target.checked)}
                  style={{ width: 'auto', minHeight: 'auto', cursor: 'pointer' }}
                />
                <label htmlFor="from-last-completion" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                  from last completion
                </label>
              </div>
            </div>
          )}

          {/* Weekly configuration (shown for 'weekly' or 'custom' with 'weeks' unit) */}
          {(repeatFrequency === 'weekly' || (repeatFrequency === 'custom' && customUnit === 'weeks')) && (
            <div className="task-form__dynamic-container task-form__card">
              <label className="task-form__label">
                Repeat on
                <div className="task-form__weekdays">
                  {WEEKDAYS.map(d => {
                    const active = weeklyDays.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        className={`task-form__weekday-pill ${active ? 'task-form__weekday-pill--active' : ''}`}
                        onClick={() => toggleWeeklyDay(d.key)}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </label>
            </div>
          )}

          {/* Monthly configuration (shown for 'monthly' or 'custom' with 'months' unit) */}
          {(repeatFrequency === 'monthly' || (repeatFrequency === 'custom' && customUnit === 'months')) && (
            <div className="task-form__dynamic-container task-form__card">
              <div className="task-form__row">
                <label className="task-form__label">
                  Monthly strategy
                  <select
                    className="task-form__select"
                    value={monthlyStrategy}
                    onChange={(e) => setMonthlyStrategy(e.target.value)}
                  >
                    <option value="day_of_month">On specific day of month</option>
                    <option value="day_of_week">On specific weekday</option>
                  </select>
                </label>

                {monthlyStrategy === 'day_of_month' ? (
                  <label className="task-form__label">
                    Day of month
                    <select
                      className="task-form__select"
                      value={monthlyDayOfMonth}
                      onChange={(e) => setMonthlyDayOfMonth(parseInt(e.target.value, 10))}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="task-form__row" style={{ flex: 1, gap: '8px' }}>
                    <label className="task-form__label">
                      Position
                      <select
                        className="task-form__select"
                        value={monthlyDayOfWeekPos}
                        onChange={(e) => setMonthlyDayOfWeekPos(parseInt(e.target.value, 10))}
                      >
                        <option value={1}>First</option>
                        <option value={2}>Second</option>
                        <option value={3}>Third</option>
                        <option value={4}>Fourth</option>
                        <option value={-1}>Last</option>
                      </select>
                    </label>
                    <label className="task-form__label">
                      Weekday
                      <select
                        className="task-form__select"
                        value={monthlyDayOfWeekDay}
                        onChange={(e) => setMonthlyDayOfWeekDay(e.target.value)}
                      >
                        <option value="MO">Monday</option>
                        <option value="TU">Tuesday</option>
                        <option value="WE">Wednesday</option>
                        <option value="TH">Thursday</option>
                        <option value="FR">Friday</option>
                        <option value="SA">Saturday</option>
                        <option value="SU">Sunday</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic human readable summary */}
        <div className="task-form__summary">
          <span className="task-form__summary-label">Schedule Summary</span>
          <p className="task-form__summary-text">{recurrenceSummary}</p>
        </div>

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

// ─── Helpers to map between Form State and RRule format ───────────────────

function parseRRuleToState(rruleStr, taskType) {
  const defaultState = {
    startDate: new Date().toISOString().slice(0, 10),
    endDateType: 'never',
    endDateValue: new Date().toISOString().slice(0, 10),
    endCountValue: 10,
    repeatFrequency: 'none',
    weeklyDays: [],
    monthlyStrategy: 'day_of_month',
    monthlyDayOfMonth: new Date().getDate(),
    monthlyDayOfWeekPos: 1,
    monthlyDayOfWeekDay: 'MO',
    customInterval: 1,
    customUnit: 'days',
  };

  if (taskType === 'always-available') {
    defaultState.repeatFrequency = 'always';
    return defaultState;
  }
  if (taskType === 'ad-hoc' || !taskType) {
    defaultState.repeatFrequency = 'none';
    return defaultState;
  }

  // If there's no string but old object pattern is sent
  if (!rruleStr) {
    return defaultState;
  }

  // Handle completion relative recurrence object (mode: 'interval_from_completion')
  if (typeof rruleStr === 'object' && rruleStr.mode === 'interval_from_completion') {
    defaultState.repeatFrequency = 'custom';
    defaultState.fromLastCompletion = true;
    defaultState.customInterval = rruleStr.intervalValue || rruleStr.intervalDays || 1;
    defaultState.customUnit = rruleStr.intervalUnit || 'days';
    if (rruleStr.startDate) {
      defaultState.startDate = rruleStr.startDate;
    }
    return defaultState;
  }

  try {
    const ruleString = typeof rruleStr === 'string' ? rruleStr : (rruleStr.rrule || null);
    if (!ruleString) return defaultState;

    const rule = rrulestr(ruleString);
    const options = rule.options;

    if (options.dtstart) {
      // options.dtstart is local/UTC Date, convert to YYYY-MM-DD
      const d = new Date(options.dtstart);
      defaultState.startDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    if (options.until) {
      defaultState.endDateType = 'date';
      const d = new Date(options.until);
      defaultState.endDateValue = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    } else if (options.count) {
      defaultState.endDateType = 'count';
      defaultState.endCountValue = options.count;
    }

    const isCustom = options.interval > 1;
    if (isCustom) {
      defaultState.repeatFrequency = 'custom';
      defaultState.customInterval = options.interval;
      if (options.freq === RRule.DAILY) defaultState.customUnit = 'days';
      if (options.freq === RRule.WEEKLY) defaultState.customUnit = 'weeks';
      if (options.freq === RRule.MONTHLY) defaultState.customUnit = 'months';
    } else {
      if (options.freq === RRule.DAILY) defaultState.repeatFrequency = 'daily';
      if (options.freq === RRule.WEEKLY) defaultState.repeatFrequency = 'weekly';
      if (options.freq === RRule.MONTHLY) defaultState.repeatFrequency = 'monthly';
    }

    // Weekly days
    const weekdayMap = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    if (options.byweekday && options.byweekday.length > 0) {
      defaultState.weeklyDays = options.byweekday.map(w => weekdayMap[w]);
    }

    // Monthly strategy
    if (options.bymonthday && options.bymonthday.length > 0) {
      defaultState.monthlyStrategy = 'day_of_month';
      defaultState.monthlyDayOfMonth = options.bymonthday[0];
    } else if (options.bynweekday && options.bynweekday.length > 0) {
      defaultState.monthlyStrategy = 'day_of_week';
      defaultState.monthlyDayOfWeekPos = options.bynweekday[0][1];
      defaultState.monthlyDayOfWeekDay = weekdayMap[options.bynweekday[0][0]];
    }

  } catch (e) {
    console.error('Error parsing RRule string to state:', e);
  }

  return defaultState;
}

function generateRRule(state) {
  const {
    startDate,
    endDateType,
    endDateValue,
    endCountValue,
    repeatFrequency,
    weeklyDays,
    monthlyStrategy,
    monthlyDayOfMonth,
    monthlyDayOfWeekPos,
    monthlyDayOfWeekDay,
    customInterval,
    customUnit,
  } = state;

  if (repeatFrequency === 'none' || repeatFrequency === 'always') {
    return null;
  }

  const options = {};

  // Frequency & Interval
  if (repeatFrequency === 'daily') {
    options.freq = RRule.DAILY;
    options.interval = 1;
  } else if (repeatFrequency === 'weekly') {
    options.freq = RRule.WEEKLY;
    options.interval = 1;
    if (weeklyDays.length > 0) {
      options.byweekday = weeklyDays.map(d => RRule[d]);
    }
  } else if (repeatFrequency === 'monthly') {
    options.freq = RRule.MONTHLY;
    options.interval = 1;
    if (monthlyStrategy === 'day_of_month') {
      options.bymonthday = [parseInt(monthlyDayOfMonth, 10)];
    } else {
      const day = RRule[monthlyDayOfWeekDay];
      options.byweekday = [day.nth(parseInt(monthlyDayOfWeekPos, 10))];
    }
  } else if (repeatFrequency === 'custom') {
    options.interval = parseInt(customInterval, 10) || 1;
    if (customUnit === 'days') {
      options.freq = RRule.DAILY;
    } else if (customUnit === 'weeks') {
      options.freq = RRule.WEEKLY;
      if (weeklyDays.length > 0) {
        options.byweekday = weeklyDays.map(d => RRule[d]);
      }
    } else if (customUnit === 'months') {
      options.freq = RRule.MONTHLY;
      if (monthlyStrategy === 'day_of_month') {
        options.bymonthday = [parseInt(monthlyDayOfMonth, 10)];
      } else {
        const day = RRule[monthlyDayOfWeekDay];
        options.byweekday = [day.nth(parseInt(monthlyDayOfWeekPos, 10))];
      }
    }
  }

  // Start Date (Anchor)
  const [year, month, day] = startDate.split('-').map(Number);
  options.dtstart = new Date(year, month - 1, day);

  // End Date / Occurrences
  if (endDateType === 'date') {
    const [eyear, emonth, eday] = endDateValue.split('-').map(Number);
    options.until = new Date(eyear, emonth - 1, eday, 23, 59, 59);
  } else if (endDateType === 'count') {
    options.count = parseInt(endCountValue, 10) || 1;
  }

  return new RRule(options);
}

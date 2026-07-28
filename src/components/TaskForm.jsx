import React, { useState, useEffect, useMemo } from 'react';
import EmojiPicker from 'emoji-picker-react';
import AppEmoji from './AppEmoji';
import { RRule, rrulestr } from 'rrule';
import {
  COMPLEXITY,
  COMPLEXITY_LABELS,
  DURATION_PRESETS,
  getTaskDurationMinutes,
  getTaskBaseCost,
} from '../data/pricing';
import { computeSmartAllowInFeats, getTaskAllowInFeats } from '../data/feats';
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

export default function TaskForm({
  task = null,
  categories = [],
  baseRate = 0.10,
  complexityMultipliers = null,
  mode = 'simplified',
  onSave,
  onCancel,
}) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [category, setCategory] = useState('');

  // Pricing state
  const [complexity, setComplexity] = useState(COMPLEXITY.LOW);
  const [durationInput, setDurationInput] = useState('10');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customCost, setCustomCost] = useState(null); // null = auto
  const [editingCost, setEditingCost] = useState(false);
  const [customCostInput, setCustomCostInput] = useState('');

  const durationMinutes = durationInput === '' ? 0 : parseInt(durationInput, 10) || 0;

  // Icon
  const [icon, setIcon] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Progressive Disclosure: Schedule state
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [makeRecurring, setMakeRecurring] = useState(mode === 'full');

  // Recurrence States
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDateType, setEndDateType] = useState('never');
  const [endDateValue, setEndDateValue] = useState(new Date().toISOString().slice(0, 10));
  const [endCountValue, setEndCountValue] = useState('10');
  const [repeatFrequency, setRepeatFrequency] = useState('none');
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [monthlyStrategy, setMonthlyStrategy] = useState('day_of_month');
  const [monthlyDayOfMonth, setMonthlyDayOfMonth] = useState(new Date().getDate());
  const [monthlyDayOfWeekPos, setMonthlyDayOfWeekPos] = useState(1);
  const [monthlyDayOfWeekDay, setMonthlyDayOfWeekDay] = useState('MO');
  const [customInterval, setCustomInterval] = useState('1');
  const [customUnit, setCustomUnit] = useState('days');
  const [fromLastCompletion, setFromLastCompletion] = useState(false);
  const [isCritical, setIsCritical] = useState(task ? !!task.is_critical : false);
  const [allowInFeats, setAllowInFeats] = useState(task ? getTaskAllowInFeats(task) : true);
  const [isAllowInFeatsTouched, setIsAllowInFeatsTouched] = useState(task ? task.allow_in_feats !== undefined : false);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      if (task.description) setShowDescription(true);
      setCategory(task.category || '');

      // Pricing fields
      setComplexity(task.complexity || COMPLEXITY.LOW);
      const loadedDuration = String(getTaskDurationMinutes(task));
      const isPreset = DURATION_PRESETS.some(p => String(p.value) === loadedDuration);
      if (isPreset) {
        setDurationInput(loadedDuration);
        setIsCustomDuration(false);
      } else {
        setDurationInput(loadedDuration);
        setIsCustomDuration(true);
      }
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
      setIsCritical(!!task.is_critical);
      setAllowInFeats(getTaskAllowInFeats(task));
      setIsAllowInFeatsTouched(task.allow_in_feats !== undefined);

      const isRecurring = parsed.repeatFrequency !== 'none' && task.type !== 'ad-hoc';
      setMakeRecurring(isRecurring);
      if (isRecurring || parsed.startDate !== new Date().toISOString().slice(0, 10)) {
        setShowScheduleEditor(true);
      }
    } else {
      if (mode === 'simplified') {
        const hasOneOff = categories.some(c => c.id === 'one-off');
        setCategory(hasOneOff ? 'one-off' : (categories[0]?.id || ''));
        setMakeRecurring(false);
        setRepeatFrequency('none');
        setShowScheduleEditor(false);
      } else {
        setCategory(categories[0]?.id || '');
        setMakeRecurring(true);
      }
      const smartDefault = computeSmartAllowInFeats({
        title: '',
        is_one_off: mode === 'simplified',
        type: mode === 'simplified' ? 'ad-hoc' : 'recurring',
      });
      setAllowInFeats(smartDefault);
      setIsAllowInFeatsTouched(false);
    }
    requestAnimationFrame(() => setVisible(true));
  }, [task, mode, categories]);

  // Auto-recalculate allowInFeats on title/recurrence changes if user hasn't manually touched it
  useEffect(() => {
    if (!isAllowInFeatsTouched && !task) {
      const isOneOff = (mode === 'simplified' && !makeRecurring) || repeatFrequency === 'none';
      const computedType = isOneOff ? 'ad-hoc' : (repeatFrequency === 'always' ? 'always-available' : 'recurring');
      const smart = computeSmartAllowInFeats({
        title,
        is_one_off: isOneOff,
        type: computedType,
        recurrence: repeatFrequency,
      });
      setAllowInFeats(smart);
    }
  }, [title, makeRecurring, repeatFrequency, mode, isAllowInFeatsTouched, task]);

  const toggleWeeklyDay = (dayKey) => {
    if (weeklyDays.includes(dayKey)) {
      setWeeklyDays(weeklyDays.filter((d) => d !== dayKey));
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

    const isOneOff = (mode === 'simplified' && !makeRecurring) || repeatFrequency === 'none';
    let computedType = 'ad-hoc';
    if (!isOneOff) {
      if (repeatFrequency === 'always') {
        computedType = 'always-available';
      } else {
        computedType = 'recurring';
      }
    }

    let recurrence = null;
    if (computedType === 'recurring') {
      const parsedInterval = customInterval === '' ? 0 : parseInt(customInterval, 10) || 0;
      if (repeatFrequency === 'custom' && fromLastCompletion) {
        recurrence = {
          mode: 'interval_from_completion',
          intervalValue: parsedInterval,
          intervalUnit: customUnit,
          startDate: startDate,
        };
      } else {
        const rule = generateRRule({
          startDate,
          endDateType,
          endDateValue,
          endCountValue,
          repeatFrequency: repeatFrequency === 'none' ? 'daily' : repeatFrequency,
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

    if (task && computedType === task.type) {
      const oldStr = typeof task.recurrence === 'string' ? task.recurrence : JSON.stringify(task.recurrence);
      const newStr = typeof recurrence === 'string' ? recurrence : JSON.stringify(recurrence);
      if (oldStr === newStr && task.nextDueDate) {
        nextDueDate = task.nextDueDate.toDate ? task.nextDueDate.toDate() : new Date(task.nextDueDate);
      }
    }

    if (!nextDueDate) {
      if (computedType === 'always-available') {
        nextDueDate = null;
      } else if (computedType === 'recurring') {
        const lastComp = task?.lastCompletedAt?.toDate
          ? task.lastCompletedAt.toDate()
          : task?.lastCompletedAt
          ? new Date(task.lastCompletedAt)
          : null;

        if (repeatFrequency === 'custom' && fromLastCompletion) {
          const val = customInterval === '' ? 0 : parseInt(customInterval, 10) || 0;
          if (lastComp) {
            if (customUnit === 'weeks') {
              nextDueDate = new Date(lastComp.getTime() + val * 7 * 24 * 60 * 60 * 1000);
            } else if (customUnit === 'months') {
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
            repeatFrequency: repeatFrequency === 'none' ? 'daily' : repeatFrequency,
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
        const [year, month, day] = startDate.split('-').map(Number);
        nextDueDate = new Date(year, month - 1, day);
      }
    }

    const data = {
      title: title.trim(),
      description: description.trim(),
      category: category || (isOneOff ? 'one-off' : ''),
      complexity,
      duration_minutes: durationMinutes,
      custom_cost: customCost,
      price: getTaskBaseCost(
        { complexity, duration_minutes: durationMinutes, custom_cost: customCost },
        baseRate,
        complexityMultipliers
      ),
      type: computedType,
      is_one_off: isOneOff,
      allow_in_feats: allowInFeats,
      icon: icon || null,
      isActive: true,
      is_critical: isCritical,
      nextDueDate,
      recurrence,
    };

    onSave?.(data);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onCancel?.(), 300);
  };

  const scheduleSummaryText = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isToday = startDate === todayStr;
    const dateText = isToday ? 'Starts today' : `Starts ${startDate}`;

    if (repeatFrequency === 'none') {
      return `${dateText}, no repeat`;
    }
    if (repeatFrequency === 'always') {
      return 'Always available task';
    }
    if (repeatFrequency === 'daily') {
      return `${dateText}, repeats daily`;
    }
    if (repeatFrequency === 'weekly') {
      return `${dateText}, repeats weekly`;
    }
    if (repeatFrequency === 'monthly') {
      return `${dateText}, repeats monthly`;
    }
    return `${dateText}, custom schedule`;
  }, [startDate, repeatFrequency]);

  const calculatedCost = getTaskBaseCost(
    { complexity, duration_minutes: durationMinutes, custom_cost: customCost },
    baseRate,
    complexityMultipliers
  );

  return (
    <div
      className={`task-form-overlay theme-settings ${visible ? 'task-form-overlay--visible' : ''}`}
      onClick={handleClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <form
        className="task-form task-form--compact"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        {/* Top Header */}
        <div className="task-form__header">
          <h2 className="task-form__title-text">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            className="task-form__close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* 1. Main Row: Icon Picker + Title */}
        <div className="task-form__icon-title-row">
          <div className="task-form__icon-wrapper">
            <button
              type="button"
              className="task-form__icon-btn"
              onClick={(e) => {
                e.preventDefault();
                setShowEmojiPicker((prev) => !prev);
              }}
              title="Choose Icon"
            >
              <AppEmoji symbol={icon || '\u{1F4CB}'} size={22} />
            </button>
            {showEmojiPicker && (
              <div className="task-form__emoji-popover">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setIcon(emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                  width={270}
                  height={320}
                  lazyLoadEmojis={true}
                  searchDisabled={true}
                  skinTonesDisabled={true}
                />
              </div>
            )}
          </div>

          <div className="task-form__title-field">
            <input
              className={`task-form__input ${
                errors.title ? 'task-form__input--error' : ''
              }`}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Vacuum living room"
            />
            {errors.title && (
              <span className="task-form__error">{errors.title}</span>
            )}
          </div>
        </div>

        {/* 2. Category & Description Toggle Row */}
        <div className="task-form__category-row">
          <select
            className="task-form__select task-form__select--category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select category…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.label}
              </option>
            ))}
          </select>

          {!showDescription && !description && (
            <button
              type="button"
              className="task-form__add-desc-btn"
              onClick={() => setShowDescription(true)}
            >
              + Add Description
            </button>
          )}
        </div>

        {/* Expanded Description Input */}
        {(showDescription || description) && (
          <div className="task-form__desc-container">
            <textarea
              className="task-form__textarea task-form__textarea--compact"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Any extra details…"
            />
            <button
              type="button"
              className="task-form__desc-hide-btn"
              onClick={() => {
                setDescription('');
                setShowDescription(false);
              }}
              title="Remove description"
            >
              ✕
            </button>
          </div>
        )}

        {/* 3. Effort / Complexity Picker */}
        <div className="task-form__section">
          <div className="task-form__section-label">EFFORT LEVEL</div>
          <div className="task-form__segment-group task-form__segment-group--compact">
            {Object.values(COMPLEXITY).map((val) => {
              const info = COMPLEXITY_LABELS[val];
              const active = complexity === val;
              return (
                <button
                  key={val}
                  type="button"
                  className={`task-form__segment-btn task-form__segment-btn--${val.toLowerCase()} ${
                    active ? 'task-form__segment-btn--active' : ''
                  }`}
                  onClick={() => {
                    setComplexity(val);
                    setCustomCost(null);
                    setEditingCost(false);
                  }}
                >
                  <span className="task-form__segment-emoji">{info.emoji}</span>
                  <span className="task-form__segment-label">{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Duration & Inlined Auto-Cost Row */}
        <div className="task-form__section">
          <div className="task-form__section-header-inline">
            <span className="task-form__section-label">DURATION & REWARD</span>
            {!editingCost ? (
              <div className="task-form__cost-chip">
                <span className="task-form__cost-chip-value">
                  €{calculatedCost.toFixed(2)}
                </span>
                <span
                  className={`task-form__cost-chip-tag ${
                    customCost !== null ? 'task-form__cost-chip-tag--custom' : ''
                  }`}
                >
                  {customCost !== null ? 'custom' : 'auto'}
                </span>
                <button
                  type="button"
                  className="task-form__cost-chip-edit"
                  onClick={() => {
                    setCustomCostInput(String(calculatedCost));
                    setEditingCost(true);
                  }}
                >
                  ✏️
                </button>
              </div>
            ) : (
              <div className="task-form__cost-inline-edit">
                <span>€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="task-form__input task-form__cost-input"
                  value={customCostInput}
                  autoFocus
                  onChange={(e) => setCustomCostInput(e.target.value)}
                  onBlur={() => {
                    if (customCostInput.trim() === '') {
                      setCustomCost(0);
                    } else {
                      const n = parseFloat(customCostInput);
                      if (!isNaN(n) && n >= 0) setCustomCost(n);
                    }
                    setEditingCost(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.target.blur();
                    }
                    if (e.key === 'Escape') setEditingCost(false);
                  }}
                />
                <button
                  type="button"
                  className="task-form__cost-reset-btn"
                  onClick={() => {
                    setCustomCost(null);
                    setCustomCostInput('');
                    setEditingCost(false);
                  }}
                  title="Reset to auto"
                >
                  🔄
                </button>
              </div>
            )}
          </div>

          <div className="task-form__pills-row">
            {DURATION_PRESETS.map((preset) => {
              const active = !isCustomDuration && durationMinutes === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  className={`task-form__duration-pill ${
                    active ? 'task-form__duration-pill--active' : ''
                  }`}
                  onClick={() => {
                    setDurationInput(String(preset.value));
                    setIsCustomDuration(false);
                    setCustomCost(null);
                    setEditingCost(false);
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              className={`task-form__duration-pill ${
                isCustomDuration ? 'task-form__duration-pill--active' : ''
              }`}
              onClick={() => {
                setIsCustomDuration(true);
                setDurationInput('');
                setCustomCost(null);
                setEditingCost(false);
              }}
            >
              Custom
            </button>
            {isCustomDuration && (
              <input
                type="number"
                min="1"
                max="480"
                className="task-form__input task-form__custom-dur-input"
                value={durationInput}
                onChange={(e) => {
                  setDurationInput(e.target.value);
                  setCustomCost(null);
                }}
                placeholder="min"
                autoFocus
              />
            )}
          </div>
        </div>

        {/* 5. Schedule & Critical Priority (Progressive Disclosure) */}
        <div className="task-form__section">
          {mode === 'simplified' && (
            <div className="task-form__critical-inline-row" style={{ marginBottom: makeRecurring ? '6px' : '0' }}>
              <div className="task-form__critical-text-group">
                <span className="task-form__critical-title">
                  🔄 Make recurring
                </span>
                <span className="task-form__critical-subtitle">
                  Turn this quest into a routine schedule
                </span>
              </div>
              <label className="task-form__switch">
                <input
                  type="checkbox"
                  checked={makeRecurring}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setMakeRecurring(checked);
                    if (checked) {
                      if (repeatFrequency === 'none') setRepeatFrequency('daily');
                      setShowScheduleEditor(true);
                    } else {
                      setRepeatFrequency('none');
                      setShowScheduleEditor(false);
                    }
                  }}
                />
                <span className="task-form__switch-slider" />
              </label>
            </div>
          )}

          {(mode === 'full' || makeRecurring) && (
            <>
              {/* Schedule Compact Summary Row */}
              <div className="task-form__summary-row">
                <span className="task-form__summary-text">
                  📅 {scheduleSummaryText}
                </span>
                <button
                  type="button"
                  className="task-form__edit-summary-btn"
                  onClick={() => setShowScheduleEditor((prev) => !prev)}
                >
                  {showScheduleEditor ? 'Done' : 'Edit'}
                </button>
              </div>

              {/* Collapsible Schedule Editor */}
              {showScheduleEditor && (
                <div className="task-form__schedule-editor">
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

                    <label className="task-form__label">
                      Repeat
                      <select
                        className="task-form__select"
                        value={repeatFrequency}
                        onChange={(e) => setRepeatFrequency(e.target.value)}
                      >
                        <option value="none">Does not repeat</option>
                        <option value="always">Always available</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom">Custom interval</option>
                      </select>
                    </label>
                  </div>

                  {repeatFrequency === 'weekly' && (
                    <div className="task-form__weekly-group">
                      {WEEKDAYS.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          className={`task-form__weekday-pill ${
                            weeklyDays.includes(d.key)
                              ? 'task-form__weekday-pill--active'
                              : ''
                          }`}
                          onClick={() => toggleWeeklyDay(d.key)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {repeatFrequency === 'custom' && (
                    <div className="task-form__custom-interval-box">
                      <div className="task-form__row">
                        <label className="task-form__label">
                          Every
                          <input
                            type="number"
                            min="1"
                            className="task-form__input"
                            value={customInterval}
                            onChange={(e) => setCustomInterval(e.target.value)}
                          />
                        </label>
                        <label className="task-form__label">
                          Unit
                          <select
                            className="task-form__select"
                            value={customUnit}
                            onChange={(e) => setCustomUnit(e.target.value)}
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                        </label>
                      </div>
                      <label className="task-form__checkbox-label">
                        <input
                          type="checkbox"
                          checked={fromLastCompletion}
                          onChange={(e) => setFromLastCompletion(e.target.checked)}
                        />
                        <span>Schedule from completion date</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Compact Inline Critical Priority Row */}
          <div className="task-form__critical-inline-row">
            <div className="task-form__critical-text-group">
              <span className="task-form__critical-title">
                🛡️ Critical Deadline
              </span>
              <span className="task-form__critical-subtitle">
                Appears in Critical Focus when due
              </span>
            </div>
            <label className="task-form__switch">
              <input
                type="checkbox"
                checked={isCritical}
                onChange={(e) => setIsCritical(e.target.checked)}
              />
              <span className="task-form__switch-slider" />
            </label>
          </div>

          {/* Allow in Feats Pool Switch */}
          <div className="task-form__critical-inline-row">
            <div className="task-form__critical-text-group">
              <span className="task-form__critical-title">
                🎲 Allow in Feats pool
              </span>
              <span className="task-form__critical-subtitle">
                Appears in "Draw a Task" & Feat Showcase
              </span>
            </div>
            <label className="task-form__switch">
              <input
                type="checkbox"
                checked={allowInFeats}
                onChange={(e) => {
                  setIsAllowInFeatsTouched(true);
                  setAllowInFeats(e.target.checked);
                }}
              />
              <span className="task-form__switch-slider" />
            </label>
          </div>
        </div>

        {/* 6. Fixed Footer Actions */}
        <div className="task-form__actions">
          <button
            type="button"
            className="task-form__btn-cancel"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary task-form__btn-submit">
            {task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Helpers for parsing RRule string ──
function parseRRuleToState(recurrence, taskType) {
  const defaults = {
    startDate: new Date().toISOString().slice(0, 10),
    endDateType: 'never',
    endDateValue: new Date().toISOString().slice(0, 10),
    endCountValue: '10',
    repeatFrequency: taskType === 'always-available' ? 'always' : 'none',
    weeklyDays: [],
    monthlyStrategy: 'day_of_month',
    monthlyDayOfMonth: new Date().getDate(),
    monthlyDayOfWeekPos: 1,
    monthlyDayOfWeekDay: 'MO',
    customInterval: '1',
    customUnit: 'days',
    fromLastCompletion: false,
  };

  if (!recurrence) return defaults;

  if (typeof recurrence === 'object' && recurrence.mode === 'interval_from_completion') {
    return {
      ...defaults,
      repeatFrequency: 'custom',
      customInterval: String(recurrence.intervalValue || 1),
      customUnit: recurrence.intervalUnit || 'days',
      fromLastCompletion: true,
      startDate: recurrence.startDate || defaults.startDate,
    };
  }

  const rruleString = typeof recurrence === 'string' ? recurrence : recurrence.rrule || null;
  if (!rruleString) return defaults;

  try {
    const rule = rrulestr(rruleString);
    const options = rule.origOptions;

    let repeatFrequency = 'none';
    if (options.freq === RRule.DAILY) repeatFrequency = 'daily';
    else if (options.freq === RRule.WEEKLY) repeatFrequency = 'weekly';
    else if (options.freq === RRule.MONTHLY) repeatFrequency = 'monthly';

    let weeklyDays = [];
    if (options.byweekday) {
      const daysArr = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday];
      weeklyDays = daysArr.map((d) => {
        if (typeof d === 'number') {
          return ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][d];
        }
        return d.toString();
      });
    }

    let startDate = defaults.startDate;
    if (options.dtstart) {
      startDate = options.dtstart.toISOString().slice(0, 10);
    }

    return {
      ...defaults,
      startDate,
      repeatFrequency,
      weeklyDays,
    };
  } catch (e) {
    return defaults;
  }
}

function generateRRule(state) {
  if (state.repeatFrequency === 'none' || state.repeatFrequency === 'always') {
    return null;
  }

  const [year, month, day] = state.startDate.split('-').map(Number);
  const dtstart = new Date(Date.UTC(year, month - 1, day));

  const options = {
    dtstart,
  };

  if (state.repeatFrequency === 'daily') {
    options.freq = RRule.DAILY;
  } else if (state.repeatFrequency === 'weekly') {
    options.freq = RRule.WEEKLY;
    if (state.weeklyDays.length > 0) {
      options.byweekday = state.weeklyDays.map((d) => {
        switch (d) {
          case 'MO': return RRule.MO;
          case 'TU': return RRule.TU;
          case 'WE': return RRule.WE;
          case 'TH': return RRule.TH;
          case 'FR': return RRule.FR;
          case 'SA': return RRule.SA;
          case 'SU': return RRule.SU;
          default: return RRule.MO;
        }
      });
    }
  } else if (state.repeatFrequency === 'monthly') {
    options.freq = RRule.MONTHLY;
  } else if (state.repeatFrequency === 'custom') {
    const val = state.customInterval === '' ? 1 : parseInt(state.customInterval, 10) || 1;
    options.interval = val;
    if (state.customUnit === 'days') options.freq = RRule.DAILY;
    else if (state.customUnit === 'weeks') options.freq = RRule.WEEKLY;
    else if (state.customUnit === 'months') options.freq = RRule.MONTHLY;
  }

  try {
    return new RRule(options);
  } catch (e) {
    return null;
  }
}

/**
 * IconBadge — renders a Lucide vector icon (for known categories)
 * or an emoji string (for custom categories / task icons)
 * inside a soft pastel rounded-square container.
 */
import React from 'react';
import AppEmoji from './AppEmoji';
import {
  Sparkles,
  Utensils,
  Shirt,
  ShoppingBag,
  Receipt,
  Wrench,
  Flower2,
  PawPrint,
  Baby,
  Car,
  Package,
} from 'lucide-react';
import './IconBadge.css';

/* ── Category → { LucideComponent, bg, color } map ── */
const CATEGORY_MAP = {
  cleaning:  { Icon: Sparkles,    bg: '#EFF6FF', color: '#3B82F6' },
  kitchen:   { Icon: Utensils,    bg: '#FFFBEB', color: '#D97706' },
  laundry:   { Icon: Shirt,       bg: '#EDE9FE', color: '#7C3AED' },
  shopping:  { Icon: ShoppingBag, bg: '#F0FDF4', color: '#16A34A' },
  bills:     { Icon: Receipt,     bg: '#FFF7ED', color: '#EA580C' },
  repairs:   { Icon: Wrench,      bg: '#F1F5F9', color: '#475569' },
  garden:    { Icon: Flower2,     bg: '#F0FDF4', color: '#15803D' },
  pets:      { Icon: PawPrint,    bg: '#FEFCE8', color: '#CA8A04' },
  kids:      { Icon: Baby,        bg: '#FDF4FF', color: '#A855F7' },
  cars:      { Icon: Car,         bg: '#F0F9FF', color: '#0284C7' },
  other:     { Icon: Package,     bg: '#F8FAFC', color: '#64748B' },
};

/**
 * IconBadge
 *
 * @param {string}  categoryId   - If provided, look up Lucide icon from map
 * @param {string}  emoji        - Fallback emoji (always used for task-level icons)
 * @param {string}  bg           - Override background colour
 * @param {string}  color        - Override icon colour
 * @param {number}  size         - Badge container px size (default 34)
 * @param {number}  iconSize     - Lucide stroke icon px size (default 18)
 * @param {string}  className    - Extra class names
 * @param {boolean} emojiOnly    - Force emoji rendering even if categoryId matches
 */
export default function IconBadge({
  categoryId,
  emoji,
  bg,
  color,
  size = 34,
  iconSize = 17,
  className = '',
  emojiOnly = false,
}) {
  const mapped = !emojiOnly && categoryId ? CATEGORY_MAP[categoryId] : null;

  const bgColor = bg || mapped?.bg || '#F8FAFC';
  const iconColor = color || mapped?.color || '#64748B';
  const Icon = mapped?.Icon ?? null;

  return (
    <span
      className={`icon-badge ${className}`}
      style={{
        width: size,
        height: size,
        background: bgColor,
        borderRadius: Math.round(size * 0.32),
        flexShrink: 0,
      }}
    >
      {Icon ? (
        <Icon size={iconSize} strokeWidth={1.75} color={iconColor} />
      ) : (
        <AppEmoji symbol={emoji || '\u{1F4CB}'} size={iconSize} />
      )}
    </span>
  );
}

/** Thin wrapper just for inline category header icons (no bg square) */
export function CategoryIcon({ categoryId, emoji, size = 18 }) {
  const mapped = CATEGORY_MAP[categoryId];
  if (!mapped) {
    return <AppEmoji symbol={emoji || '📋'} size={size} style={{ display: 'inline-block' }} />;
  }
  const { Icon, color } = mapped;
  return <Icon size={size} strokeWidth={1.75} color={color} />;
}

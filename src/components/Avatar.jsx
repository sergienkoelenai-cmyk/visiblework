import React from 'react';
import './Avatar.css';

const SIZES = {
  sm: 40,
  md: 56,
  lg: 80,
  xl: 120,
};

export default function Avatar({ user, size = 'md', showBalance, showName, onClick, selected, glowing }) {
  const px = SIZES[size] || SIZES.md;
  const fontSize = Math.max(px * 0.36, 12);

  const initials = user.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const borderColor = user.avatarColor || 'var(--color-accent)';

  const containerClasses = [
    'avatar',
    `avatar--${size}`,
    selected && 'avatar--selected',
    glowing && 'avatar--glowing',
    onClick && 'avatar--clickable',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div
        className="avatar__circle"
        style={{
          width: px,
          height: px,
          borderColor,
          '--avatar-color': borderColor,
        }}
      >
        {user.avatar ? (
          <img className="avatar__image" src={user.avatar} alt={user.name} draggable={false} />
        ) : (
          <span className="avatar__initials" style={{ fontSize }}>
            {initials}
          </span>
        )}
      </div>

      {(showName || showBalance) && (
        <div className="avatar__info">
          {showName && <span className="avatar__name">{user.name}</span>}
          {showBalance && (
            <span className="avatar__balance">
              €{typeof user.balance === 'number' ? user.balance.toFixed(2) : '0.00'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

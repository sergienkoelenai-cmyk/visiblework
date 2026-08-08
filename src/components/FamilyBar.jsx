import React from 'react';
import './FamilyBar.css';

export default function FamilyBar({ users = [], activeUserId = '', onUserClick, onSwitchUser }) {
  if (!users.length) return null;

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="family-bar">
      {users.map((user) => {
        const isActive = user.id === activeUserId;
        return (
          <button
            key={user.id}
            className={`family-bar__chip ${isActive ? 'family-bar__chip--active' : ''}`}
            onClick={() => {
              if (!isActive && onSwitchUser) {
                onSwitchUser(user.id);
              } else {
                onUserClick?.(user);
              }
            }}
            type="button"
            title={isActive ? `${user.name} (Active Profile)` : `Switch active profile to ${user.name}`}
          >
            <div
              className="family-bar__chip-avatar"
              style={{ background: user.avatarColor || 'var(--color-accent-bg)' }}
            >
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="family-bar__chip-img" />
                : <span className="family-bar__chip-initials">{getInitials(user.name)}</span>
              }
            </div>
            <span className="family-bar__chip-name">
              {user.name}
              {isActive && <span className="family-bar__active-dot">✨</span>}
            </span>
            <span className="family-bar__chip-balance">
              €{typeof user.balance === 'number' ? user.balance.toFixed(2) : '0.00'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

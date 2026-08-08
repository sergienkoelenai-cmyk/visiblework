import React from 'react';
import './ProfileSwitcherModal.css';

export default function ProfileSwitcherModal({
  users = [],
  activeUserId = '',
  onSelectUser,
  onClose,
  onOpenSettings,
}) {
  const getInitials = (name = '') =>
    (name || '')
      .trim()
      .split(/\s+/)
      .map((w) => (w && w[0] ? w[0] : ''))
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <div className="profile-switcher-backdrop" onClick={onClose}>
      <div className="profile-switcher-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-switcher-header">
          <div className="profile-switcher-title-group">
            <h2 className="profile-switcher-title">Who's working?</h2>
            <p className="profile-switcher-subtitle">Select a family member to switch account</p>
          </div>
          {onClose && (
            <button
              type="button"
              className="profile-switcher-close-btn"
              onClick={onClose}
              title="Close profile switcher"
            >
              ✕
            </button>
          )}
        </div>

        <div className="profile-switcher-grid">
          {users.map((user) => {
            const isActive = user.id === activeUserId;
            return (
              <button
                key={user.id}
                type="button"
                className={`profile-card ${isActive ? 'profile-card--active' : ''}`}
                onClick={() => {
                  onSelectUser(user.id);
                  onClose?.();
                }}
              >
                <div
                  className="profile-card__avatar-wrapper"
                  style={{ background: user.avatarColor || '#6366f1' }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="profile-card__avatar-img" />
                  ) : (
                    <span className="profile-card__avatar-initials">
                      {getInitials(user.name)}
                    </span>
                  )}
                  {isActive && <span className="profile-card__active-badge">ACTIVE</span>}
                </div>

                <div className="profile-card__info">
                  <span className="profile-card__name">{user.name}</span>
                  <span className="profile-card__balance">
                    €{typeof user.balance === 'number' ? user.balance.toFixed(2) : '0.00'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {onOpenSettings && (
          <div className="profile-switcher-footer">
            <button
              type="button"
              className="profile-switcher-manage-btn"
              onClick={() => {
                onClose?.();
                onOpenSettings();
              }}
            >
              ⚙️ Manage Family Profiles
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

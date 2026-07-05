import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import './TaskCompletionOverlay.css';

export default function TaskCompletionOverlay({ task, users = [], onConfirm, onCancel }) {
  const [confirmed, setConfirmed] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [visible, setVisible] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleSelect = (user) => {
    setSelectedUser(user);
    setConfirmed(true);
    setTimeout(() => {
      onConfirm?.(task.id, user.id);
    }, 2000);
  };

  const handleCancel = () => {
    setVisible(false);
    setTimeout(() => onCancel?.(), 300);
  };

  return (
    <div className={`tco ${visible ? 'tco--visible' : ''}`} onClick={handleCancel}>
      <div className={`tco__card ${confirmed ? 'tco__card--confirmed' : ''}`} onClick={(e) => e.stopPropagation()}>
        {!confirmed ? (
          <>
            <h2 className="tco__heading">Who completed this task?</h2>
            <div className="tco__task-info">
              <span className="tco__task-emoji">{task.categoryEmoji || '📋'}</span>
              <span className="tco__task-title">{task.title}</span>
              <span className="tco__task-price">€{typeof task.price === 'number' ? task.price.toFixed(2) : '0.00'}</span>
            </div>

            <div className="tco__avatars">
              {users.map((user) => (
                <Avatar
                  key={user.id}
                  user={user}
                  size="xl"
                  showName
                  onClick={() => handleSelect(user)}
                />
              ))}
            </div>

            <button className="tco__cancel" onClick={handleCancel} type="button">
              Cancel
            </button>
          </>
        ) : (
          <div className="tco__success">
            <div className="tco__checkmark">
              <svg viewBox="0 0 52 52" className="tco__checkmark-svg">
                <circle className="tco__checkmark-circle" cx="26" cy="26" r="24" fill="none" />
                <path className="tco__checkmark-check" fill="none" d="M14 27l7 7 16-16" />
              </svg>
            </div>
            <div className="tco__price-float">
              +€{typeof task.price === 'number' ? task.price.toFixed(2) : '0.00'}
            </div>
            <p className="tco__success-name">{selectedUser?.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}

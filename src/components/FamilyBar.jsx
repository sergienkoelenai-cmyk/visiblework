import React from 'react';
import Avatar from './Avatar';
import './FamilyBar.css';

export default function FamilyBar({ users = [], onUserClick }) {
  return (
    <div className="family-bar">
      <div className="family-bar__track">
        {users.map((user) => (
          <Avatar
            key={user.id}
            user={user}
            size="lg"
            showBalance
            showName
            onClick={() => onUserClick?.(user)}
          />
        ))}
      </div>
    </div>
  );
}

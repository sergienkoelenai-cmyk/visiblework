import React, { useState, useEffect, useRef } from 'react';
import './UserForm.css';

const PRESET_COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#fdcb6e',
  '#0984e3', '#e84393', '#00cec9', '#ff7675',
];

export default function UserForm({ user = null, onSave, onCancel }) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [avatarColor, setAvatarColor] = useState(PRESET_COLORS[0]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarColor(user.avatarColor || PRESET_COLORS[0]);
      if (user.avatar) setPhotoPreview(user.avatar);
    }
    requestAnimationFrame(() => setVisible(true));
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const userData = {
      name: name.trim(),
      avatarColor,
      avatar: user?.avatar || '',
    };
    onSave?.(userData, photoFile);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onCancel?.(), 300);
  };

  return (
    <div className={`user-form-overlay ${visible ? 'user-form-overlay--visible' : ''}`} onClick={handleClose}>
      <div className="user-form" onClick={(e) => e.stopPropagation()}>
        <h2 className="user-form__title">{user ? 'Edit Member' : 'New Member'}</h2>

        {/* Name */}
        <label className="user-form__label">
          Name
          <input
            className={`user-form__input ${error ? 'user-form__input--error' : ''}`}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Enter name"
          />
          {error && <span className="user-form__error">{error}</span>}
        </label>

        {/* Avatar color */}
        <div className="user-form__section">
          <span className="user-form__section-label">Avatar Color</span>
          <div className="user-form__colors">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`user-form__color-swatch ${avatarColor === color ? 'user-form__color-swatch--active' : ''}`}
                style={{ background: color }}
                onClick={() => setAvatarColor(color)}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Photo upload */}
        <div className="user-form__section">
          <span className="user-form__section-label">Photo</span>
          <div
            className="user-form__upload"
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            {photoPreview ? (
              <img className="user-form__upload-preview" src={photoPreview} alt="Preview" />
            ) : (
              <div className="user-form__upload-placeholder">
                <span className="user-form__upload-icon">📷</span>
                <span className="user-form__upload-text">Click to upload photo</span>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="user-form__file-input"
            onChange={handleFileChange}
          />
        </div>

        {/* Actions */}
        <div className="user-form__actions">
          <button type="button" className="user-form__btn user-form__btn--cancel" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="user-form__btn user-form__btn--save" onClick={handleSave}>
            {user ? 'Save Changes' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import './CashoutDialog.css';

export default function CashoutDialog({ user, onConfirm, onCancel }) {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const balance = typeof user?.balance === 'number' ? user.balance : 0;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const validate = () => {
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      setError('Enter an amount greater than €0.00');
      return false;
    }
    if (val > balance) {
      setError(`Amount cannot exceed balance (€${balance.toFixed(2)})`);
      return false;
    }
    setError('');
    return true;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm?.(user.id, parseFloat(amount), note.trim());
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onCancel?.(), 300);
  };

  return (
    <div className={`cashout ${visible ? 'cashout--visible' : ''}`} onClick={handleClose}>
      <div className="cashout__card" onClick={(e) => e.stopPropagation()}>
        <h2 className="cashout__heading">Cash Out</h2>

        <div className="cashout__user">
          <Avatar user={user} size="lg" />
          <div className="cashout__user-info">
            <span className="cashout__user-name">{user.name}</span>
            <span className="cashout__user-balance">
              Balance: <strong>€{balance.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        <label className="cashout__label">
          Amount (€)
          <input
            className={`cashout__input ${error ? 'cashout__input--error' : ''}`}
            type="number"
            min="0.01"
            max={balance}
            step="0.01"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(''); }}
            placeholder="0.00"
          />
          {error && <span className="cashout__error">{error}</span>}
        </label>

        <label className="cashout__label">
          Note <span className="cashout__optional">(optional)</span>
          <input
            className="cashout__input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Bought ice cream 🍦"
          />
        </label>

        <div className="cashout__actions">
          <button type="button" className="cashout__btn cashout__btn--cancel" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="cashout__btn cashout__btn--confirm" onClick={handleConfirm}>
            Confirm Cash Out
          </button>
        </div>
      </div>
    </div>
  );
}

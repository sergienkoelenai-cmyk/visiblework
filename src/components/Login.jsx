import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../data/firebase';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password.');
      } else {
        setError('Failed to log in. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card__logo">
          <img src="/favicon.svg" alt="" className="login-card__logo-icon" />
          <span className="login-card__logo-text">VisibleWork</span>
        </div>

        <h1 className="login-card__title">Welcome, Family!</h1>
        <p className="login-card__subtitle">Please enter your family credentials to access your task dashboard.</p>

        {error && <div className="login-card__error-box">{error}</div>}

        <label className="login-card__label">
          Family Email
          <input
            type="email"
            className="login-card__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="family@example.com"
            disabled={loading}
            required
          />
        </label>

        <label className="login-card__label">
          Password
          <input
            type="password"
            className="login-card__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </label>

        <button type="submit" className="login-card__btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Access Dashboard'}
        </button>
      </form>
    </div>
  );
}

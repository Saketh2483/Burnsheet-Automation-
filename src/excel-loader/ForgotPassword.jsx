import { useState } from 'react';
import './Login.css';

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="auth-icon">🔒</div>
        <h2>Forgot Password</h2>
        <p className="auth-subtitle">Enter your email address and we'll send you a link to reset your password.</p>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="login-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoFocus
            />
          </div>
          <button type="submit" className="login-btn">Send Reset Link</button>
        </form>
        <div className="login-links">
          <button type="button" onClick={onBack} className="forgot-password-link">← Back to Login</button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

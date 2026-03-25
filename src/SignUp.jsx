import { useState } from 'react';
import './Login.css';

function SignUp({ onBack }) {
  const [form, setForm] = useState({ fullName: '', email: '', username: '', password: '', confirmPassword: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="login-container">
      <div className="login-card login-card--wide">
        <div className="auth-icon">👤</div>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Fill in the details below to create your account.</p>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="login-field">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoFocus
            />
          </div>
          <div className="login-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
            />
          </div>
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Choose a username"
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password"
            />
          </div>
          <div className="login-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
            />
          </div>
          <button type="submit" className="login-btn">Create Account</button>
        </form>
        <div className="login-links">
          <button type="button" onClick={onBack} className="forgot-password-link">← Back to Login</button>
        </div>
      </div>
    </div>
  );
}

export default SignUp;

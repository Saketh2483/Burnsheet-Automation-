import React, { useState } from 'react';
import './Login.css';

const CREDENTIALS = { username: 'admin', password: 'admin' };

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
      onLogin();
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Verizon Burnsheet</h2>
        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn">Login</button>
        </form>
        <div className="login-links">
          <a href="#" className="forgot-password-link">Forgot Password?</a>
          <span className="signup-separator">|</span>
          <a href="#" className="signup-link">Sign Up</a>
        </div>
      </div>
    </div>
  );
}

export default Login;

import { useState } from 'react';
import PropTypes from 'prop-types';
import './Login.css';
import ForgotPassword from './ForgotPassword';
import SignUp from './SignUp';

const CREDENTIALS = { username: 'admin', password: 'admin' };

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState('login');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
      onLogin();
    } else {
      setError('Invalid username or password.');
    }
  };

  if (page === 'forgot') return <ForgotPassword onBack={() => setPage('login')} />;
  if (page === 'signup') return <SignUp onBack={() => setPage('login')} />;

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Verizon Burnsheet</h2>
        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
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
          <button type="button" onClick={() => setPage('forgot')} className="forgot-password-link">Forgot Password?</button>
          <span className="signup-separator">|</span>
          <button type="button" onClick={() => setPage('signup')} className="signup-link">Sign Up</button>
        </div>
      </div>
    </div>
  );
}

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default Login;

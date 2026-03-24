import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './excel-loader/App';
import Login from './excel-loader/Login';

function Root() {
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');

  const handleLogin = () => { localStorage.setItem('isLoggedIn', 'true'); setLoggedIn(true); };
  const handleLogout = () => { localStorage.removeItem('isLoggedIn'); setLoggedIn(false); };

  return loggedIn ? <App onLogout={handleLogout} /> : <Login onLogin={handleLogin} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

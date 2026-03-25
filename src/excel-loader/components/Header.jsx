import React, { useRef, useEffect } from 'react';

export const Header = ({ showDashboard, isProfileOpen, setIsProfileOpen, onLogout }) => {
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsProfileOpen]);

  return (
    <div className="header-top">
      <div className="header-left"></div>
      <h1>{showDashboard ? 'Verizon Home & Marketing Dashboard' : 'Verizon Home & Marketing Burnsheet'}</h1>
      <div className="header-right">
        <div className="profile-menu" ref={profileRef}>
          <span className="welcome-text">Welcome, Admin 👋</span>
          <button className="profile-btn" onClick={() => setIsProfileOpen(!isProfileOpen)}>
            <span className="profile-icon">👤</span>
            <span className="profile-arrow">{isProfileOpen ? '▲' : '▼'}</span>
          </button>
          {isProfileOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-item" onClick={() => { alert('My Profile'); setIsProfileOpen(false); }}>👤 My Profile</div>
              <div className="profile-dropdown-item logout-item" onClick={() => { setIsProfileOpen(false); onLogout(); }}>🚪 Logout</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (path) => {
    if (location.pathname === path) {
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('You have been logged out.');
    navigate('/');
  };

  return (
    <nav className="navbar" id="navbar">
      <Link to="/" className="navbar-brand" onClick={() => handleNavClick('/')}>URL Shortener</Link>
      <div className="navbar-links">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        {user ? (
          <>
            <Link to="/my-links" className="navbar-link" id="my-links-link" onClick={() => handleNavClick('/my-links')}>
              My Links
            </Link>
            <div className="profile-container" ref={dropdownRef}>
              <div 
                className="profile-avatar" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                title={user.email}
              >
                {user.email.charAt(0).toUpperCase()}
              </div>
              
              {isDropdownOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-email">{user.email}</div>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link" id="login-link" onClick={() => handleNavClick('/login')}>
              Log In
            </Link>
            <Link to="/signup" className="navbar-link navbar-link-primary" id="signup-link" onClick={() => handleNavClick('/signup')}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;

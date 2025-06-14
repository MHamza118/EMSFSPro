import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Menu } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const Navbar = ({ onMobileMenuToggle }) => {
  const { userProfile } = useAuth();

  return (
    <div className="navbar">
      <div className="navbar-left">
        {/* Mobile Menu Button - Only visible on mobile */}
        <button
          className="mobile-menu-btn"
          onClick={onMobileMenuToggle}
          aria-label="Toggle mobile menu"
        >
          <Menu size={24} />
        </button>

        {/* Dashboard Title - Hidden on mobile */}
        <div className="navbar-title">
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#333', margin: 0 }}>
            Dashboard
          </h1>
        </div>
      </div>

      <div className="flex align-center gap-10">
        <div className="flex align-center gap-10">
          <NotificationDropdown />
          <div className="flex align-center gap-10">
            <User size={20} style={{ color: '#666' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {userProfile?.name || userProfile?.displayName || userProfile?.email || 'Unknown User'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {userProfile?.role === 'admin' ? 'Administrator' : 'Employee'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

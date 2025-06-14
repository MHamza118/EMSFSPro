import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Clock,
  Calendar,
  FileText,
  Briefcase,
  Users,
  Settings,
  LogOut,
  ClockIcon,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import Logo from '../Common/Logo';

const Sidebar = ({ activeTab, setActiveTab, isMobileOpen, onMobileClose }) => {
  const { userProfile, logout } = useAuth();
  const isAdmin = userProfile?.role === 'admin';

  const employeeMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'checkin', label: 'Check In/Out', icon: Clock },
    { id: 'timetable', label: 'Time Table', icon: Calendar },
    { id: 'progress', label: 'Progress Report', icon: FileText },
    { id: 'holidays', label: 'Holiday Requests', icon: Calendar },
    { id: 'tasks', label: 'My Tasks', icon: Briefcase },
    { id: 'compensation', label: 'Compensate Hours', icon: ClockIcon }
  ];

  const adminMenuItems = [
    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: BarChart3 },
    { id: 'employees', label: 'Employee Management', icon: Users },
    { id: 'admin-timetable', label: 'Time Table Management', icon: Calendar },
    { id: 'admin-progress-reports', label: 'Progress Reports', icon: FileText },
    { id: 'attendance-records', label: 'Attendance Records', icon: Clock },
    { id: 'holiday-management', label: 'Holiday Management', icon: Calendar },
    { id: 'task-management', label: 'Task Management', icon: Briefcase },
    { id: 'compensation-records', label: 'Compensation Records', icon: ClockIcon }
  ];

  const menuItems = isAdmin ? adminMenuItems : employeeMenuItems;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div style={{ padding: '0 15px', marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '0px',
          padding: '0px 0 0 0',
          justifyContent: 'center'
        }}>
          <Logo
            height="auto"
            width="240px"
            style={{
              maxHeight: '110px',
              maxWidth: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))'
            }}
          />
        </div>
        <div style={{ fontSize: '14px', opacity: 0.8, textAlign: 'center', marginTop: '0px', paddingTop: '0px' }}>
          {userProfile?.name} | ID: {userProfile?.employeeId}
        </div>
      </div>

      <nav>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <a href="#" onClick={(e) => e.preventDefault()}>
                <Icon size={18} />
                {item.label}
              </a>
            </div>
          );
        })}

        <div className="nav-item" onClick={handleLogout} style={{ marginTop: '20px' }}>
          <a href="#" onClick={(e) => e.preventDefault()}>
            <LogOut size={18} />
            Logout
          </a>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;

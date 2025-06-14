import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { timetableService } from './services/timetableService';
import { Toaster } from 'react-hot-toast';

// Components
import Login from './components/Auth/Login';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import CheckInOut from './components/Attendance/CheckInOut';
import TimeTable from './components/TimeTable/TimeTable';
import ProgressReport from './components/Reports/ProgressReport';
import HolidayRequest from './components/Holiday/HolidayRequest';
import TaskManagement from './components/Tasks/TaskManagement';
import AdminPanel from './components/Admin/AdminPanel';
import EmployeeManagement from './components/Admin/EmployeeManagement';
import AdminTimeTableManagement from './components/Admin/AdminTimeTableManagement';
import AdminProgressReports from './components/Admin/AdminProgressReports';
import AdminAttendanceManagement from './components/Admin/AdminAttendanceManagement';
import AdminHolidayManagement from './components/Admin/AdminHolidayManagement';
import AdminTaskManagement from './components/Admin/AdminTaskManagement';
import EmployeeCompensation from './components/Compensation/EmployeeCompensation';
import CompensationManagement from './components/Admin/CompensationManagement';

// Styles
import './styles/globals.css';

const AppContent = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Perform weekly timetable reset check when app loads
  useEffect(() => {
    if (userProfile) {
      timetableService.checkAndPerformWeeklyReset().catch(error => {
        console.error('Error in weekly timetable reset:', error);
      });
    }
  }, [userProfile]);

  // Handle mobile sidebar toggle
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Handle tab change and auto-close mobile sidebar
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false); // Auto-close sidebar on mobile
  };

  // Set initial tab based on user role - NO REDIRECTIONS
  React.useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'admin') {
        handleTabChange('admin-dashboard');
      } else {
        handleTabChange('dashboard');
      }
    }
  }, [userProfile]);

  const renderContent = () => {
    switch (activeTab) {
      // Employee routes
      case 'dashboard':
        return <Dashboard />;
      case 'checkin':
        return <CheckInOut />;
      case 'timetable':
        return <TimeTable />;
      case 'progress':
        return <ProgressReport />;
      case 'holidays':
        return <HolidayRequest />;
      case 'tasks':
        return <TaskManagement />;
      case 'compensation':
        return <EmployeeCompensation />;

      // Admin routes
      case 'admin-dashboard':
        return <AdminPanel onNavigate={setActiveTab} />;
      case 'employees':
        return <EmployeeManagement />;
      case 'admin-timetable':
        return <AdminTimeTableManagement />;
      case 'admin-progress-reports':
        return <AdminProgressReports />;
      case 'attendance-records':
        return <AdminAttendanceManagement />;
      case 'holiday-management':
        return <AdminHolidayManagement />;
      case 'task-management':
        return <AdminTaskManagement />;
      case 'compensation-records':
        return <CompensationManagement />;

      default:
        return userProfile?.role === 'admin' ? <AdminPanel /> : <Dashboard />;
    }
  };

  // Simple role-based access - NO REDIRECTIONS
  if (!currentUser) {
    return <Login />;
  }

  if (!userProfile) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#666' }}>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="main-content">
        <Navbar onMobileMenuToggle={toggleMobileSidebar} />
        {renderContent()}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4aed88',
            },
          },
        }}
      />
    </AuthProvider>
  );
};

export default App;

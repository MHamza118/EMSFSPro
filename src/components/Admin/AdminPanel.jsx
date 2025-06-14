import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, COLLECTIONS } from '../../services/firestore';
import {
  Users,
  Clock,
  FileText,
  Calendar,
  Briefcase,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

const AdminPanel = ({ onNavigate }) => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalAttendance: 0,
    pendingLateCheckins: 0,
    pendingReports: 0,
    pendingHolidays: 0,
    totalTasks: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      loadAdminStats();
      loadRecentActivity();
    }
  }, [userProfile]);

  const loadAdminStats = async () => {
    try {
      const [users, attendance, reports, holidays, tasks] = await Promise.all([
        firestoreService.getAll(COLLECTIONS.USERS),
        firestoreService.getAll(COLLECTIONS.ATTENDANCE),
        firestoreService.getAll(COLLECTIONS.PROGRESS_REPORTS),
        firestoreService.getAll(COLLECTIONS.HOLIDAY_REQUESTS),
        firestoreService.getAll(COLLECTIONS.TASKS)
      ]);

      const employees = users.filter(user => user.role === 'employee');
      const pendingReports = reports.filter(report => report.status === 'submitted');
      const pendingHolidays = holidays.filter(request => request.status === 'pending');

      setStats({
        totalEmployees: employees.length,
        totalAttendance: attendance.length,
        pendingLateCheckins: 0, // Removed late check-in functionality
        pendingReports: pendingReports.length,
        pendingHolidays: pendingHolidays.length,
        totalTasks: tasks.length
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Get recent activities from different collections
      const [reports, holidays] = await Promise.all([
        firestoreService.getAll(COLLECTIONS.PROGRESS_REPORTS),
        firestoreService.getAll(COLLECTIONS.HOLIDAY_REQUESTS)
      ]);

      // Combine and sort by creation date
      const activities = [
        ...reports.map(item => ({
          ...item,
          type: 'progress-report',
          title: 'Progress Report',
          description: `${item.employeeName} submitted progress report`
        })),
        ...holidays.map(item => ({
          ...item,
          type: 'holiday-request',
          title: 'Holiday Request',
          description: `${item.employeeName} requested ${item.days} days leave`
        }))
      ].sort((a, b) => new Date(b.createdAt?.seconds * 1000) - new Date(a.createdAt?.seconds * 1000))
        .slice(0, 10);

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color = '#3498db', trend }) => (
    <div className="stat-card">
      <div className="flex justify-between align-center mb-10">
        <Icon size={32} style={{ color }} />
        {trend && (
          <TrendingUp size={16} style={{ color: '#27ae60' }} />
        )}
      </div>
      <div className="stat-number" style={{ color }}>
        {loading ? '...' : value}
      </div>
      <div className="stat-label">{title}</div>
    </div>
  );

  const getActivityIcon = (type) => {
    switch (type) {
      case 'progress-report':
        return <FileText size={16} style={{ color: '#3498db' }} />;
      case 'holiday-request':
        return <Calendar size={16} style={{ color: '#9b59b6' }} />;
      default:
        return <Clock size={16} style={{ color: '#95a5a6' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f39c12';
      case 'approved':
        return '#27ae60';
      case 'rejected':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  if (userProfile?.role !== 'admin') {
    return (
      <div className="content">
        <div className="card text-center">
          <XCircle size={64} style={{ color: '#e74c3c', marginBottom: '20px' }} />
          <h3 style={{ color: '#e74c3c' }}>Access Denied</h3>
          <p>You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <h2 style={{ marginBottom: '30px', color: '#333' }}>Admin Dashboard</h2>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon={Users}
          title="Total Employees"
          value={stats.totalEmployees}
          color="#27ae60"
        />
        <StatCard
          icon={Clock}
          title="Total Attendance Records"
          value={stats.totalAttendance}
          color="#3498db"
        />
        <StatCard
          icon={AlertCircle}
          title="Pending Late Check-ins"
          value={stats.pendingLateCheckins}
          color="#f39c12"
        />
        <StatCard
          icon={FileText}
          title="Pending Reports"
          value={stats.pendingReports}
          color="#9b59b6"
        />
        <StatCard
          icon={Calendar}
          title="Pending Holidays"
          value={stats.pendingHolidays}
          color="#e74c3c"
        />
        <StatCard
          icon={Briefcase}
          title="Total Tasks"
          value={stats.totalTasks}
          color="#34495e"
        />
      </div>

      {/* Quick Actions */}
      <div className="card mb-20">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '15px' }}
            onClick={() => onNavigate && onNavigate('employees')}
          >
            <Users size={18} style={{ marginRight: '8px' }} />
            Manage Employees
          </button>
          <button
            className="btn btn-info"
            style={{ padding: '15px' }}
            onClick={() => onNavigate && onNavigate('admin-timetable')}
          >
            <Calendar size={18} style={{ marginRight: '8px' }} />
            Manage Time Tables
          </button>
          <button
            className="btn btn-warning"
            style={{ padding: '15px' }}
            onClick={() => onNavigate && onNavigate('late-records')}
          >
            <AlertCircle size={18} style={{ marginRight: '8px' }} />
            Review Late Check-ins
          </button>
          <button
            className="btn btn-success"
            style={{ padding: '15px' }}
            onClick={() => onNavigate && onNavigate('holiday-management')}
          >
            <Calendar size={18} style={{ marginRight: '8px' }} />
            Approve Holidays
          </button>
          <button
            className="btn btn-info"
            style={{ padding: '15px' }}
            onClick={() => onNavigate && onNavigate('admin-progress-reports')}
          >
            <FileText size={18} style={{ marginRight: '8px' }} />
            Progress Reports
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '15px' }}
            onClick={() => onNavigate && onNavigate('task-management')}
          >
            <Briefcase size={18} style={{ marginRight: '8px' }} />
            Assign Tasks
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                style={{
                  padding: '15px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}
              >
                <div>{getActivityIcon(activity.type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {activity.title}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {activity.description}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: 'white',
                    background: getStatusColor(activity.status),
                    marginBottom: '4px'
                  }}>
                    {activity.status?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {activity.createdAt ?
                      new Date(activity.createdAt.seconds * 1000).toLocaleDateString() :
                      'Recently'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Clock size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;

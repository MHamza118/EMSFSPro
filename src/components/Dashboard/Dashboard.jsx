import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, COLLECTIONS } from '../../services/firestore';
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react';

const Dashboard = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalCheckIns: 0,
    totalCheckOuts: 0,
    lateCheckIns: 0,
    totalAbsences: 0,
    unapprovedLeaves: 0,
    totalEmployees: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, [userProfile]);

  const loadDashboardStats = async () => {
    try {
      if (userProfile?.role === 'admin') {
        // Admin dashboard stats
        const [attendance, holidays, users] = await Promise.all([
          firestoreService.getAll(COLLECTIONS.ATTENDANCE),
          firestoreService.getAll(COLLECTIONS.HOLIDAY_REQUESTS),
          firestoreService.getAll(COLLECTIONS.USERS)
        ]);

        const checkIns = attendance.filter(record => record.type === 'checkin').length;
        const checkOuts = attendance.filter(record => record.type === 'checkout').length;
        const unapproved = holidays.filter(req => req.status === 'pending').length;
        const employees = users.filter(user => user.role === 'employee').length;

        setStats({
          totalCheckIns: checkIns,
          totalCheckOuts: checkOuts,
          lateCheckIns: 0, // Removed late check-in functionality
          totalAbsences: 0, // Calculate based on your logic
          unapprovedLeaves: unapproved,
          totalEmployees: employees
        });
      } else {
        // Employee dashboard stats
        const [attendance, holidays, tasks] = await Promise.all([
          firestoreService.getWhere(COLLECTIONS.ATTENDANCE, 'userId', '==', userProfile.uid),
          firestoreService.getWhere(COLLECTIONS.HOLIDAY_REQUESTS, 'userId', '==', userProfile.uid),
          firestoreService.getWhere(COLLECTIONS.TASKS, 'assignedTo', '==', userProfile.uid)
        ]);

        const checkIns = attendance.filter(record => record.type === 'checkin').length;
        const checkOuts = attendance.filter(record => record.type === 'checkout').length;
        const pendingHolidays = holidays.filter(req => req.status === 'pending').length;

        setStats({
          totalCheckIns: checkIns,
          totalCheckOuts: checkOuts,
          lateCheckIns: 0, // Removed late check-in functionality
          totalAbsences: 0,
          unapprovedLeaves: pendingHolidays,
          totalTasks: tasks.length
        });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color = '#3498db' }) => (
    <div className="stat-card">
      <Icon size={32} style={{ color, marginBottom: '10px' }} />
      <div className="stat-number" style={{ color }}>
        {loading ? '...' : value}
      </div>
      <div className="stat-label">{title}</div>
    </div>
  );

  return (
    <div className="content">
      <h2 style={{ marginBottom: '30px', color: '#333' }}>
        {userProfile?.role === 'admin' ? 'Admin Dashboard' : 'Employee Dashboard'}
      </h2>

      <div className="stats-grid">
        {userProfile?.role === 'admin' ? (
          <>
            <StatCard
              icon={Users}
              title="Total Employees"
              value={stats.totalEmployees}
              color="#27ae60"
            />
            <StatCard
              icon={CheckCircle}
              title="Total Check-Ins"
              value={stats.totalCheckIns}
              color="#3498db"
            />
            <StatCard
              icon={XCircle}
              title="Total Check-Outs"
              value={stats.totalCheckOuts}
              color="#9b59b6"
            />
            <StatCard
              icon={AlertCircle}
              title="Late Check-Ins"
              value={stats.lateCheckIns}
              color="#e74c3c"
            />
            <StatCard
              icon={Calendar}
              title="Unapproved Leaves"
              value={stats.unapprovedLeaves}
              color="#f39c12"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={CheckCircle}
              title="Total Check-Ins"
              value={stats.totalCheckIns}
              color="#3498db"
            />
            <StatCard
              icon={XCircle}
              title="Total Check-Outs"
              value={stats.totalCheckOuts}
              color="#9b59b6"
            />
            <StatCard
              icon={AlertCircle}
              title="Late Check-Ins"
              value={stats.lateCheckIns}
              color="#e74c3c"
            />
            <StatCard
              icon={Calendar}
              title="Pending Leaves"
              value={stats.unapprovedLeaves}
              color="#f39c12"
            />
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>Recent Activity</h3>
        <div style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
          <Clock size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>Recent activity will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

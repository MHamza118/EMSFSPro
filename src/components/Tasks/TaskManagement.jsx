import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskService } from '../../services/firestore';
import { Briefcase, CheckCircle, XCircle, Clock, Filter, Eye, MessageSquare } from 'lucide-react';
import TextModal from '../Common/TextModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { notifyTaskCompleted, notifyTaskUpdated } from '../../utils/notificationHelper';

const TaskManagement = () => {
  const { userProfile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    date: 'all'
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [modalData, setModalData] = useState({});

  useEffect(() => {
    loadTasks();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const loadTasks = async () => {
    try {
      const userTasks = await taskService.getUserTasks(userProfile.uid);
      setTasks(userTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    // Filter by date
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (filters.date) {
      case 'today':
        filtered = filtered.filter(task => task.date === today);
        break;
      case 'week':
        filtered = filtered.filter(task => {
          const taskDate = new Date(task.date);
          return taskDate >= thisWeekStart;
        });
        break;
      case 'month':
        filtered = filtered.filter(task => {
          const taskDate = new Date(task.date);
          return taskDate >= thisMonthStart;
        });
        break;
      default:
        break;
    }

    setFilteredTasks(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleTaskUpdate = (task) => {
    setSelectedTask(task);
    setUpdateData({
      status: task.status,
      reason: task.reason || ''
    });
    setShowUpdateModal(true);
  };

  const submitTaskUpdate = async () => {
    // Validate required reason for not-achieved status
    if (updateData.status === 'not-achieved' && !updateData.reason.trim()) {
      toast.error('Please provide a reason for not completing the task');
      return;
    }

    setLoading(true);
    try {
      await taskService.updateTaskStatus(
        selectedTask.id,
        updateData.status,
        updateData.reason,
        updateData.reason // Employee remarks
      );

      // Send notification to admin based on status
      if (updateData.status === 'completed') {
        await notifyTaskCompleted(
          selectedTask.assignedBy,
          selectedTask.description,
          userProfile.name
        );
      } else {
        await notifyTaskUpdated(
          selectedTask.assignedBy,
          selectedTask.description,
          userProfile.name,
          updateData.status
        );
      }

      toast.success('Task updated successfully!');
      setShowUpdateModal(false);
      setSelectedTask(null);
      setUpdateData({ status: '', reason: '' });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', icon: Clock, text: 'Pending' },
      completed: { class: 'status-approved', icon: CheckCircle, text: 'Completed' },
      'not-achieved': { class: 'status-rejected', icon: XCircle, text: 'Not Achieved' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`status-badge ${config.class}`}>
        <Icon size={12} style={{ marginRight: '4px' }} />
        {config.text}
      </span>
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const showDescriptionModal = (task) => {
    setModalData({
      title: 'Task Description',
      content: `${task.description}\n\n${task.details || ''}`.trim(),
      type: 'details',
      employeeName: `Task for ${userProfile.name}`,
      date: task.date,
      time: task.day
    });
    setShowTextModal(true);
  };

  const showReasonModal = (task) => {
    setModalData({
      title: 'Task Reason/Comments',
      content: task.reason,
      type: 'remarks',
      employeeName: `Task for ${userProfile.name}`,
      date: task.date,
      time: task.day
    });
    setShowTextModal(true);
  };

  return (
    <div className="content">
      <h2 style={{ marginBottom: '30px', color: '#333' }}>My Tasks</h2>

      {/* Filters */}
      <div className="card mb-20">
        <div className="flex align-center gap-10 mb-20">
          <Filter size={20} style={{ color: '#666' }} />
          <h3 style={{ margin: 0, color: '#333' }}>Filters</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <label className="form-label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-select"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="not-achieved">Not Achieved</option>
            </select>
          </div>

          <div>
            <label className="form-label">Date Range</label>
            <select
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="form-select"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          Tasks ({filteredTasks.length})
        </h3>

        {filteredTasks.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Description</th>
                <th>Priority</th>
                <th>File</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.date}</td>
                  <td>{task.day}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => showDescriptionModal(task)}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        margin: '0 auto'
                      }}
                      title="View task description and details"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: 'white',
                      background: getPriorityColor(task.priority)
                    }}>
                      {task.priority?.toUpperCase() || 'NORMAL'}
                    </span>
                  </td>
                  <td>
                    {task.fileName ? (
                      <span style={{ fontSize: '12px', color: '#3498db' }}>
                        📎 {task.fileName}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>No file</span>
                    )}
                  </td>
                  <td>{getStatusBadge(task.status)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => showReasonModal(task)}
                      className="btn btn-info"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        margin: '0 auto',
                        opacity: task.reason ? 1 : 0.6
                      }}
                      title={task.reason ? "View reason/comments" : "No reason provided"}
                    >
                      <MessageSquare size={14} />
                      {task.reason ? 'View Reason' : 'No Reason'}
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleTaskUpdate(task)}
                      className="btn btn-primary"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Briefcase size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No tasks found matching the current filters</p>
          </div>
        )}
      </div>

      {/* Update Task Modal */}
      {showUpdateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>Update Task Status</h3>

            <div className="form-group">
              <label className="form-label">Task Description</label>
              <div style={{
                padding: '10px',
                background: '#f8f9fa',
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                {selectedTask?.description}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                value={updateData.status}
                onChange={(e) => setUpdateData(prev => ({ ...prev, status: e.target.value }))}
                className="form-select"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="not-achieved">Not Achieved</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {updateData.status === 'not-achieved' ? 'Reason for Not Completing (Required)' : 'Reason/Comments'}
                {updateData.status === 'not-achieved' && <span style={{ color: '#e74c3c' }}> *</span>}
              </label>
              <textarea
                value={updateData.reason}
                onChange={(e) => setUpdateData(prev => ({ ...prev, reason: e.target.value }))}
                className="form-textarea"
                placeholder={
                  updateData.status === 'not-achieved'
                    ? "Please explain why the task could not be completed..."
                    : "Provide reason for status change or additional comments..."
                }
                required={updateData.status === 'not-achieved'}
                style={{
                  borderColor: updateData.status === 'not-achieved' && !updateData.reason.trim() ? '#e74c3c' : undefined
                }}
              />
              {updateData.status === 'not-achieved' && !updateData.reason.trim() && (
                <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '5px' }}>
                  Reason is required when marking task as not achieved
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={submitTaskUpdate}
                className="btn btn-primary"
                disabled={loading || (updateData.status === 'not-achieved' && !updateData.reason.trim())}
              >
                {loading ? 'Updating...' : 'Update Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Modal */}
      <TextModal
        isOpen={showTextModal}
        onClose={() => setShowTextModal(false)}
        title={modalData.title}
        content={modalData.content}
        type={modalData.type}
        employeeName={modalData.employeeName}
        date={modalData.date}
        time={modalData.time}
      />
    </div>
  );
};

export default TaskManagement;

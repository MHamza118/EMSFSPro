import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskService, userService, firestoreService, COLLECTIONS } from '../../services/firestore';
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  MessageSquare
} from 'lucide-react';
import TextModal from '../Common/TextModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { notifyTaskAssigned } from '../../utils/notificationHelper';

const AdminTaskManagement = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [modalData, setModalData] = useState({});
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    details: '',
    assignedTo: '',
    assignedToName: '',
    priority: 'medium',
    dueDate: '',
    status: 'pending'
  });

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      loadTasks();
      loadEmployees();
    }
  }, [userProfile]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      console.log('Admin loading tasks...');
      const allTasks = await taskService.getAllTasks();
      console.log('Fetched tasks:', allTasks);

      // Sort by creation date (newest first)
      const sortedTasks = allTasks.sort((a, b) => {
        const aDate = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt || 0);
        const bDate = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt || 0);
        return bDate - aDate;
      });

      setTasks(sortedTasks);

      if (sortedTasks.length === 0) {
        console.log('No tasks found');
      } else {
        console.log(`Loaded ${sortedTasks.length} tasks`);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const allEmployees = await userService.getAllEmployees();
      console.log('Loaded employees:', allEmployees);
      setEmployees(allEmployees || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
      setEmployees([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaskForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Update assigned employee name when employee is selected
    if (name === 'assignedTo') {
      const selectedEmployee = employees.find(emp => emp.uid === value);
      setTaskForm(prev => ({
        ...prev,
        assignedToName: selectedEmployee ? selectedEmployee.name : ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if auth is still loading
      if (authLoading) {
        toast.error('Please wait while user profile loads...');
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!taskForm.title?.trim()) {
        toast.error('Task title is required');
        setLoading(false);
        return;
      }

      if (!taskForm.description?.trim()) {
        toast.error('Task description is required');
        setLoading(false);
        return;
      }

      if (!taskForm.assignedTo) {
        toast.error('Please select an employee to assign the task');
        setLoading(false);
        return;
      }

      if (!taskForm.dueDate) {
        toast.error('Due date is required');
        setLoading(false);
        return;
      }

      // Ensure we have valid user profile data
      if (!userProfile) {
        toast.error('User profile not loaded. Please refresh the page.');
        setLoading(false);
        return;
      }

      // Check for uid (could be uid or id)
      const userId = userProfile.uid || userProfile.id;
      if (!userId) {
        console.error('No user ID found in profile:', userProfile);
        toast.error('User ID not found. Please refresh the page.');
        setLoading(false);
        return;
      }

      // Check for name (could be name, displayName, or email)
      const userName = userProfile.name || userProfile.displayName || userProfile.email;
      if (!userName) {
        console.error('No user name found in profile:', userProfile);
        toast.error('User name not found. Please refresh the page.');
        setLoading(false);
        return;
      }

      // Create clean task data with no undefined values
      const taskData = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        details: taskForm.details?.trim() || '',
        assignedTo: taskForm.assignedTo,
        assignedToName: taskForm.assignedToName || '',
        assignedBy: userId,
        assignedByName: userName,
        priority: taskForm.priority || 'medium',
        dueDate: taskForm.dueDate,
        date: taskForm.dueDate,
        day: format(new Date(taskForm.dueDate), 'EEEE'),
        status: taskForm.status || 'pending',
        employeeRemarks: '',
        reason: ''
        // Note: createdAt and updatedAt will be added automatically by firestoreService.create
      };

      console.log('Submitting task data:', taskData);

      if (editingTask) {
        await taskService.updateTask(editingTask.id, taskData);
        toast.success('Task updated successfully!');
      } else {
        await taskService.createTask(taskData);

        // Send notification to assigned employee
        if (taskForm.assignedTo && taskForm.assignedToName) {
          await notifyTaskAssigned(
            taskForm.assignedTo,
            taskForm.title,
            userProfile.name
          );
        }

        toast.success('Task assigned successfully!');
      }

      resetForm();
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      details: task.details || '',
      assignedTo: task.assignedTo || '',
      assignedToName: task.assignedToName || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate || task.date || '',
      status: task.status || 'pending'
    });
    setShowTaskModal(true);
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await taskService.deleteTask(taskId);
      toast.success('Task deleted successfully!');
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      details: '',
      assignedTo: '',
      assignedToName: '',
      priority: 'medium',
      dueDate: '',
      status: 'pending'
    });
    setEditingTask(null);
    setShowTaskModal(false);
  };

  const filteredTasks = (tasks || []).filter(task => {
    if (!task) return false;

    const matchesSearch =
      (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assignedToName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesEmployee = employeeFilter === 'all' || task.assignedTo === employeeFilter;

    return matchesSearch && matchesStatus && matchesEmployee;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: '#f39c12', bg: '#fef9e7', text: 'Pending', icon: Clock },
      completed: { color: '#27ae60', bg: '#eafaf1', text: 'Completed', icon: CheckCircle },
      'not-achieved': { color: '#e74c3c', bg: '#fdedec', text: 'Not Achieved', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}20`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <Icon size={12} />
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

  const getTaskStats = () => {
    const safeTasks = tasks || [];
    const stats = {
      total: safeTasks.length,
      pending: safeTasks.filter(t => t && t.status === 'pending').length,
      completed: safeTasks.filter(t => t && t.status === 'completed').length,
      notAchieved: safeTasks.filter(t => t && t.status === 'not-achieved').length
    };
    return stats;
  };

  const showDescriptionModal = (task) => {
    setModalData({
      title: 'Task Description & Details',
      content: `${task.description || 'No description'}\n\n${task.details || ''}`.trim(),
      type: 'details',
      employeeName: `Assigned to: ${task.assignedToName || 'Unknown Employee'}`,
      date: task.dueDate || task.date,
      time: task.day || ''
    });
    setShowTextModal(true);
  };

  const showRemarksModal = (task) => {
    setModalData({
      title: 'Employee Remarks',
      content: task.employeeRemarks || task.reason || '',
      type: 'remarks',
      employeeName: `From: ${task.assignedToName || 'Unknown Employee'}`,
      date: task.dueDate || task.date,
      time: task.day || ''
    });
    setShowTextModal(true);
  };

  const stats = getTaskStats();

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="content">
        <div className="card text-center">
          <h3>Loading...</h3>
          <p>Please wait while we load your profile.</p>
        </div>
      </div>
    );
  }

  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <div className="content">
        <div className="card">
          <h2 style={{ color: '#e74c3c', marginBottom: '10px' }}>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#333', margin: 0 }}>Task Management</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadTasks}
            className="btn btn-secondary"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="btn btn-primary"
            disabled={authLoading || !userProfile}
          >
            <Plus size={16} />
            Assign New Task
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div className="stat-card">
          <Briefcase size={32} style={{ color: '#3498db', marginBottom: '10px' }} />
          <div className="stat-number" style={{ color: '#3498db' }}>{stats.total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <Clock size={32} style={{ color: '#f39c12', marginBottom: '10px' }} />
          <div className="stat-number" style={{ color: '#f39c12' }}>{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <CheckCircle size={32} style={{ color: '#27ae60', marginBottom: '10px' }} />
          <div className="stat-number" style={{ color: '#27ae60' }}>{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <XCircle size={32} style={{ color: '#e74c3c', marginBottom: '10px' }} />
          <div className="stat-number" style={{ color: '#e74c3c' }}>{stats.notAchieved}</div>
          <div className="stat-label">Not Achieved</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', alignItems: 'end' }}>
          <div style={{ position: 'relative' }}>
            <label className="form-label">Search Tasks</label>
            <Search size={20} style={{
              position: 'absolute',
              left: '12px',
              bottom: '12px',
              color: '#666'
            }} />
            <input
              type="text"
              placeholder="Search by title, description, or employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <div>
            <label className="form-label">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="not-achieved">Not Achieved</option>
            </select>
          </div>
          <div>
            <label className="form-label">Employee Filter</label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="form-input"
            >
              <option value="all">All Employees</option>
              {employees.map(employee => (
                <option key={employee.uid} value={employee.uid}>
                  {employee.name} ({employee.employeeId})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          Tasks ({filteredTasks.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: '#666' }}>Loading tasks...</div>
          </div>
        ) : filteredTasks.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Title</th>
                  <th style={{ minWidth: '150px' }}>Description</th>
                  <th style={{ minWidth: '120px' }}>Assigned To</th>
                  <th style={{ minWidth: '80px' }}>Priority</th>
                  <th style={{ minWidth: '100px' }}>Due Date</th>
                  <th style={{ minWidth: '100px' }}>Status</th>
                  <th style={{ minWidth: '150px' }}>Employee Remarks</th>
                  <th style={{ minWidth: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td style={{ fontWeight: '500' }}>{task.title || task.description || 'Untitled Task'}</td>
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
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {task.assignedToName || 'Unknown Employee'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {employees.find(emp => emp.uid === task.assignedTo)?.employeeId || 'N/A'}
                      </div>
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
                        {task.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        try {
                          const date = task.dueDate || task.date;
                          return date ? new Date(date).toLocaleDateString() : 'No due date';
                        } catch (error) {
                          return 'Invalid date';
                        }
                      })()}
                    </td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => showRemarksModal(task)}
                        className="btn btn-info"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto',
                          opacity: (task.employeeRemarks || task.reason) ? 1 : 0.6
                        }}
                        title={(task.employeeRemarks || task.reason) ? "View employee remarks" : "No remarks available"}
                      >
                        <MessageSquare size={14} />
                        {(task.employeeRemarks || task.reason) ? 'View Remarks' : 'No Remarks'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleEdit(task)}
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="btn btn-danger"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Briefcase size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No tasks found</p>
            {searchTerm && <p>Try adjusting your search criteria</p>}
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              {editingTask ? 'Edit Task' : 'Assign New Task'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={taskForm.title}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter task title..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign To *</label>
                  <select
                    name="assignedTo"
                    value={taskForm.assignedTo}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(employee => (
                      <option key={employee.uid} value={employee.uid}>
                        {employee.name} ({employee.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Task Description *</label>
                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Enter task description..."
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Additional Details</label>
                <textarea
                  name="details"
                  value={taskForm.details}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Enter additional task details..."
                  rows={2}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date *</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={taskForm.dueDate}
                    onChange={handleInputChange}
                    className="form-input"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingTask ? 'Update Task' : 'Assign Task')}
                </button>
              </div>
            </form>
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

export default AdminTaskManagement;
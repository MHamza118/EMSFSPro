import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { compensationService } from '../../services/firestore';
import { Clock, Plus, Search, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const EmployeeCompensation = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [compensations, setCompensations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [missedSlots, setMissedSlots] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    hours: '',
    reason: ''
  });

  useEffect(() => {
    if (userProfile) {
      loadCompensations();
      checkMissedCheckIns();
    }
  }, [userProfile]);

  const loadCompensations = async () => {
    try {
      const userCompensations = await compensationService.getUserCompensation(userProfile.uid);
      setCompensations(userCompensations);
    } catch (error) {
      console.error('Error loading compensations:', error);
      toast.error('Failed to load compensation records');
    }
  };

  const checkMissedCheckIns = async () => {
    try {
      const missed = await compensationService.checkMissedCheckIns(userProfile.uid);
      setMissedSlots(missed);
    } catch (error) {
      console.error('Error checking missed check-ins:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate hours
      const hours = parseFloat(formData.hours);
      if (isNaN(hours) || hours <= 0 || hours > 24) {
        toast.error('Please enter valid hours (1-24)');
        return;
      }

      // Create compensation request
      await compensationService.createCompensation({
        employeeId: userProfile.uid,
        employeeName: userProfile.name,
        date: formData.date,
        hours: hours,
        reason: formData.reason,
        status: 'pending'
      });

      toast.success('Compensation request submitted successfully');
      setShowForm(false);
      setFormData({ date: '', hours: '', reason: '' });
      loadCompensations();
    } catch (error) {
      console.error('Error submitting compensation:', error);
      toast.error('Failed to submit compensation request');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoCompensation = async (slot) => {
    setLoading(true);
    try {
      await compensationService.createCompensation({
        employeeId: userProfile.uid,
        employeeName: userProfile.name,
        date: slot.date,
        hours: slot.hours,
        reason: slot.reason,
        status: 'pending'
      });

      toast.success('Compensation request submitted successfully');
      setMissedSlots(prev => prev.filter(s => s.date !== slot.date));
      loadCompensations();
    } catch (error) {
      console.error('Error submitting auto compensation:', error);
      toast.error('Failed to submit compensation request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: { background: '#fff3cd', color: '#856404' },
      approved: { background: '#d4edda', color: '#155724' },
      rejected: { background: '#f8d7da', color: '#721c24' }
    };

    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        ...statusStyles[status]
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="content">
      <div className="flex justify-between align-center mb-20">
        <h2 style={{ color: '#333' }}>Compensation Hours</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
          disabled={loading}
        >
          <Plus size={16} style={{ marginRight: '8px' }} />
          Request Compensation
        </button>
      </div>

      {/* Missed Check-ins Section */}
      {missedSlots.length > 0 && (
        <div className="card mb-20">
          <h3 style={{ marginBottom: '20px', color: '#333' }}>
            <AlertCircle size={20} style={{ marginRight: '8px', color: '#e74c3c' }} />
            Missed Check-ins
          </h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Hours</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {missedSlots.map((slot, index) => (
                  <tr key={index}>
                    <td>{
                      slot.date
                        ? format(
                            slot.date.toDate
                              ? slot.date.toDate()
                              : new Date(slot.date),
                            'MMM dd, yyyy'
                          )
                        : '-'
                    }</td>
                    <td>
                      {slot.startTime && slot.endTime
                        ? `${
                            format(
                              slot.startTime.toDate
                                ? slot.startTime.toDate()
                                : new Date(slot.startTime),
                              'HH:mm'
                            )
                          } - ${
                            format(
                              slot.endTime.toDate
                                ? slot.endTime.toDate()
                                : new Date(slot.endTime),
                              'HH:mm'
                            )
                          }`
                        : '-'}
                    </td>
                    <td>{slot.hours.toFixed(1)}</td>
                    <td>{slot.reason}</td>
                    <td>
                      <button
                        onClick={() => handleAutoCompensation(slot)}
                        className="btn btn-primary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        disabled={loading}
                      >
                        Request Compensation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compensation Request Form */}
      {showForm && (
        <div className="card mb-20">
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Request Compensation Hours</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="form-input"
                required
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hours</label>
              <input
                type="number"
                name="hours"
                value={formData.hours}
                onChange={handleInputChange}
                className="form-input"
                required
                min="0.5"
                max="24"
                step="0.5"
                placeholder="Enter hours (0.5-24)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reason</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="form-textarea"
                required
                placeholder="Enter reason for compensation"
                rows="4"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ date: '', hours: '', reason: '' });
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Compensation List */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>My Compensation Requests</h3>
        {compensations.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Admin Remarks</th>
              </tr>
            </thead>
            <tbody>
              {compensations.map((compensation) => (
                <tr key={compensation.id}>
                  <td>{compensation.date}</td>
                  <td>{compensation.hours}</td>
                  <td>{compensation.reason}</td>
                  <td>{getStatusBadge(compensation.status)}</td>
                  <td>{
                    compensation.createdAt
                      ? format(
                          compensation.createdAt.toDate
                            ? compensation.createdAt.toDate()
                            : new Date(compensation.createdAt),
                          'MMM dd, yyyy HH:mm'
                        )
                      : '-'
                  }</td>
                  <td>{compensation.adminRemarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Clock size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No compensation requests found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeCompensation; 
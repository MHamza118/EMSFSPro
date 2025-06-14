import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { holidayService, firestoreService, COLLECTIONS } from '../../services/firestore';
import { Calendar, Plus } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { notifyHolidaySubmitted } from '../../utils/notificationHelper';

const HolidayRequest = () => {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHolidayRequests();
  }, [userProfile]);

  const loadHolidayRequests = async () => {
    try {
      const userRequests = await holidayService.getUserRequests(userProfile.uid);
      setRequests(userRequests);
    } catch (error) {
      console.error('Error loading holiday requests:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const days = differenceInDays(end, start) + 1;
      return days > 0 ? days : 0;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const days = calculateDays();
      if (days <= 0) {
        toast.error('End date must be after start date');
        return;
      }

      const requestData = {
        userId: userProfile.uid,
        employeeId: userProfile.employeeId,
        employeeName: userProfile.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: days,
        reason: formData.reason,
        status: 'pending',
        adminRemarks: '',
        requestDate: format(new Date(), 'yyyy-MM-dd')
      };

      await holidayService.createRequest(requestData);

      // Notify all admins about the new holiday request
      const allUsers = await firestoreService.getAll(COLLECTIONS.USERS);
      const admins = allUsers.filter(user => user.role === 'admin');

      for (const admin of admins) {
        await notifyHolidaySubmitted(
          admin.uid,
          userProfile.name,
          formData.startDate,
          formData.endDate
        );
      }

      toast.success('Holiday request submitted successfully!');

      setFormData({
        startDate: '',
        endDate: '',
        reason: ''
      });
      setShowForm(false);
      loadHolidayRequests();
    } catch (error) {
      console.error('Error submitting holiday request:', error);
      toast.error('Failed to submit holiday request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected'
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="content">
      <div className="flex justify-between align-center mb-20">
        <h2 style={{ color: '#333' }}>Your Holiday Requests</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          {showForm ? 'Cancel' : 'Request Holiday'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-20">
          <h3 style={{ marginBottom: '20px', color: '#333' }}>New Holiday Request</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  min={formData.startDate || format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Holiday</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Please provide the reason for your holiday request..."
                required
              />
            </div>

            <div className="flex justify-between align-center">
              <div style={{ color: '#666' }}>
                {formData.startDate && formData.endDate && (
                  <span>
                    Total Days: <strong>{calculateDays()}</strong>
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading || calculateDays() <= 0}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>Request History</h3>
        {requests.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Admin Remarks</th>
                <th>Request Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.startDate}</td>
                  <td>{request.endDate}</td>
                  <td>
                    <span style={{
                      fontWeight: 'bold',
                      color: '#3498db',
                      padding: '2px 8px',
                      background: '#e3f2fd',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {request.days}
                    </span>
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    {request.reason.length > 50
                      ? `${request.reason.substring(0, 50)}...`
                      : request.reason
                    }
                  </td>
                  <td>{getStatusBadge(request.status)}</td>
                  <td style={{ maxWidth: '150px' }}>
                    {request.adminRemarks || (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>
                        Pending review
                      </span>
                    )}
                  </td>
                  <td>{request.requestDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Calendar size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No holiday requests submitted yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidayRequest;

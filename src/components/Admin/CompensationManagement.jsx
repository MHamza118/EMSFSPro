import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { compensationService } from '../../services/firestore';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const CompensationManagement = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [compensations, setCompensations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCompensation, setSelectedCompensation] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      loadCompensations();
    }
  }, [userProfile]);

  const loadCompensations = async () => {
    try {
      const allCompensations = await compensationService.getAllCompensation();
      setCompensations(allCompensations);
    } catch (error) {
      console.error('Error loading compensations:', error);
      toast.error('Failed to load compensation records');
    }
  };

  const handleStatusUpdate = async (compensationId, status) => {
    setLoading(true);
    try {
      await compensationService.updateCompensationStatus(
        compensationId,
        status,
        adminRemarks
      );
      toast.success(`Compensation request ${status} successfully`);
      setShowModal(false);
      setAdminRemarks('');
      setSelectedCompensation(null);
      loadCompensations();
    } catch (error) {
      console.error('Error updating compensation status:', error);
      toast.error('Failed to update compensation status');
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (compensation) => {
    setSelectedCompensation(compensation);
    setAdminRemarks('');
    setShowModal(true);
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

  if (userProfile?.role !== 'admin') {
    return (
      <div className="content">
        <div className="card text-center">
          <Clock size={64} style={{ color: '#e74c3c', marginBottom: '20px' }} />
          <h3 style={{ color: '#e74c3c' }}>Access Denied</h3>
          <p>You don't have permission to manage compensation requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="flex justify-between align-center mb-20">
        <h2 style={{ color: '#333' }}>Compensation Management</h2>
      </div>

      {/* Compensation List */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>All Compensation Requests</h3>
        {compensations.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {compensations.map((compensation) => (
                <tr key={compensation.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{compensation.employeeName}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>ID: {compensation.employeeId}</div>
                    </div>
                  </td>
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
                  <td>
                    {compensation.status === 'pending' && (
                      <div className="flex gap-10">
                        <button
                          onClick={() => openStatusModal(compensation)}
                          className="btn btn-success"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          title="Approve Request"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          onClick={() => openStatusModal(compensation)}
                          className="btn btn-danger"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          title="Reject Request"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    )}
                  </td>
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

      {/* Status Update Modal */}
      {showModal && selectedCompensation && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setAdminRemarks('');
          setSelectedCompensation(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Compensation Request</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowModal(false);
                  setAdminRemarks('');
                  setSelectedCompensation(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <p><strong>Employee:</strong> {selectedCompensation.employeeName}</p>
                <p><strong>Date:</strong> {selectedCompensation.date}</p>
                <p><strong>Hours:</strong> {selectedCompensation.hours}</p>
                <p><strong>Reason:</strong> {selectedCompensation.reason}</p>
              </div>

              <div className="form-group">
                <label className="form-label">Admin Remarks</label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className="form-textarea"
                  placeholder="Enter your remarks..."
                  rows="4"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setAdminRemarks('');
                    setSelectedCompensation(null);
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedCompensation.id, 'approved')}
                  className="btn btn-success"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedCompensation.id, 'rejected')}
                  className="btn btn-danger"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationManagement; 
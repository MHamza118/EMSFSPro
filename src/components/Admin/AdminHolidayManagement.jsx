import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, holidayService, COLLECTIONS } from '../../services/firestore';
import { Calendar, CheckCircle, XCircle, Clock, MessageSquare, Search, Filter, Eye, User } from 'lucide-react';
import TextModal from '../Common/TextModal';
import toast from 'react-hot-toast';
import { notifyHolidayApproved, notifyHolidayRejected } from '../../utils/notificationHelper';

const AdminHolidayManagement = () => {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [modalData, setModalData] = useState({});

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      loadHolidayRequests();
    }
  }, [userProfile]);

  const loadHolidayRequests = async () => {
    setLoading(true);
    try {
      console.log('Admin loading holiday requests...');
      const allRequests = await firestoreService.getAll(COLLECTIONS.HOLIDAY_REQUESTS);
      console.log('Fetched holiday requests:', allRequests);

      // Sort by request date (newest first)
      const sortedRequests = allRequests.sort((a, b) => {
        return new Date(b.requestDate) - new Date(a.requestDate);
      });

      setRequests(sortedRequests);

      if (sortedRequests.length === 0) {
        toast.info('No holiday requests found');
      } else {
        toast.success(`Loaded ${sortedRequests.length} holiday requests`);
      }
    } catch (error) {
      console.error('Error loading holiday requests:', error);
      toast.error('Failed to load holiday requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await holidayService.updateRequestStatus(requestId, newStatus, remarks);

      // Send notification to employee based on status
      const request = requests.find(req => req.id === requestId);
      if (request && request.userId) {
        if (newStatus === 'approved') {
          await notifyHolidayApproved(
            request.userId,
            request.startDate,
            request.endDate
          );
        } else if (newStatus === 'rejected') {
          await notifyHolidayRejected(
            request.userId,
            request.startDate,
            request.endDate,
            remarks || 'No reason provided'
          );
        }
      }

      toast.success(`Holiday request ${newStatus} successfully`);

      // Update local state
      setRequests(prev => prev.map(req =>
        req.id === requestId
          ? { ...req, status: newStatus, adminRemarks: remarks }
          : req
      ));

      setShowRemarksModal(false);
      setRemarks('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
    }
  };

  const openRemarksModal = (request, action) => {
    setSelectedRequest({ ...request, action });
    setRemarks(request.adminRemarks || '');
    setShowRemarksModal(true);
  };

  const showReasonModal = (request) => {
    setModalData({
      title: 'Holiday Request Reason',
      content: request.reason,
      type: 'details',
      employeeName: request.employeeName,
      date: `${request.startDate} to ${request.endDate}`,
      time: `${request.days} days`
    });
    setShowTextModal(true);
  };

  const showAdminRemarksModal = (request) => {
    setModalData({
      title: 'Admin Remarks',
      content: request.adminRemarks || '',
      type: 'remarks',
      employeeName: request.employeeName,
      date: `${request.startDate} to ${request.endDate}`,
      time: `${request.days} days`
    });
    setShowTextModal(true);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch =
      request.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: '#f39c12', bg: '#fef9e7', text: 'Pending' },
      approved: { color: '#27ae60', bg: '#eafaf1', text: 'Approved' },
      rejected: { color: '#e74c3c', bg: '#fdedec', text: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}20`
      }}>
        {config.text}
      </span>
    );
  };

  const getStatusStats = () => {
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length
    };
    return stats;
  };

  const stats = getStatusStats();

  if (userProfile?.role !== 'admin') {
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
        <h2 style={{ color: '#333', margin: 0 }}>Holiday Request Management</h2>
        <button
          onClick={loadHolidayRequests}
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div className="stat-card">
          <Calendar size={32} style={{ color: '#3498db', marginBottom: '10px' }} />
          <div className="stat-number" style={{ color: '#3498db' }}>{stats.total}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-card">
          <Clock size={32} style={{ color: '#f39c12', marginBottom: '10px' }} />
          <div className="stat-number" style={{ color: '#f39c12' }}>{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <CheckCircle size={32} style={{ color: '#27ae60', marginBottom: '10px' }} />
          <div className="stat-number" style={{ color: '#27ae60' }}>{stats.approved}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card">
          <XCircle size={32} style={{ color: '#e74c3c', marginBottom: '10px' }} />
          <div className="stat-number" style={{ color: '#e74c3c' }}>{stats.rejected}</div>
          <div className="stat-label">Rejected</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '20px',
          alignItems: 'center',
          '@media (max-width: 768px)': {
            gridTemplateColumns: '1fr',
            gap: '15px'
          }
        }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666'
            }} />
            <input
              type="text"
              placeholder="Search by employee name, ID, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '35px' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Holiday Requests Table */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          Holiday Requests ({filteredRequests.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: '#666' }}>Loading holiday requests...</div>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px', minWidth: '120px' }}>Employee</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>Start Date</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>End Date</th>
                  <th style={{ width: '70px', minWidth: '70px' }}>Days</th>
                  <th style={{ width: '120px', minWidth: '120px' }}>Reason</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>Status</th>
                  <th style={{ width: '120px', minWidth: '120px' }}>Admin Remarks</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>Request Date</th>
                  <th style={{ width: '180px', minWidth: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td style={{
                      padding: '12px 8px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={14} style={{ color: '#3498db' }} />
                        <div>
                          <div style={{
                            fontWeight: 'bold',
                            fontSize: '13px',
                            maxWidth: '100px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {request.employeeName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            ID: {request.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '13px'
                    }}>
                      {request.startDate}
                    </td>
                    <td style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '13px'
                    }}>
                      {request.endDate}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 'bold',
                        color: '#3498db',
                        padding: '4px 8px',
                        background: '#e3f2fd',
                        borderRadius: '12px',
                        fontSize: '12px',
                        display: 'inline-block'
                      }}>
                        {request.days}
                      </span>
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '8px'
                    }}>
                      <button
                        onClick={() => showReasonModal(request)}
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto'
                        }}
                        title="View holiday reason"
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '8px'
                    }}>
                      {getStatusBadge(request.status)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '8px'
                    }}>
                      <button
                        onClick={() => showAdminRemarksModal(request)}
                        className="btn btn-info"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto',
                          opacity: request.adminRemarks ? 1 : 0.6
                        }}
                        title={request.adminRemarks ? "View admin remarks" : "No remarks available"}
                      >
                        <MessageSquare size={14} />
                        {request.adminRemarks ? 'View Remarks' : 'No Remarks'}
                      </button>
                    </td>
                    <td style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '13px'
                    }}>
                      {request.requestDate}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                      }}>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openRemarksModal(request, 'approve')}
                              className="btn btn-success"
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                minWidth: '70px'
                              }}
                              title="Approve request"
                            >
                              <CheckCircle size={12} />
                              Approve
                            </button>
                            <button
                              onClick={() => openRemarksModal(request, 'reject')}
                              className="btn btn-danger"
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                minWidth: '70px'
                              }}
                              title="Reject request"
                            >
                              <XCircle size={12} />
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openRemarksModal(request, 'remark')}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            minWidth: '70px'
                          }}
                          title="Add/Edit remarks"
                        >
                          <MessageSquare size={12} />
                          Remarks
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
            <Calendar size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No holiday requests found</p>
            {searchTerm && <p>Try adjusting your search criteria</p>}
          </div>
        )}
      </div>

      {/* Remarks Modal */}
      {showRemarksModal && selectedRequest && (
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
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              {selectedRequest.action === 'approve' ? 'Approve Request' :
                selectedRequest.action === 'reject' ? 'Reject Request' : 'Add/Edit Remarks'}
            </h3>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <p><strong>Employee:</strong> {selectedRequest.employeeName}</p>
              <p><strong>Dates:</strong> {selectedRequest.startDate} to {selectedRequest.endDate}</p>
              <p><strong>Days:</strong> {selectedRequest.days}</p>
              <p><strong>Reason:</strong> {selectedRequest.reason}</p>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="form-textarea"
                placeholder="Add your remarks here..."
                rows={4}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRemarksModal(false);
                  setRemarks('');
                  setSelectedRequest(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              {selectedRequest.action === 'approve' && (
                <button
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'approved')}
                  className="btn btn-success"
                >
                  <CheckCircle size={16} />
                  Approve Request
                </button>
              )}
              {selectedRequest.action === 'reject' && (
                <button
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'rejected')}
                  className="btn btn-danger"
                >
                  <XCircle size={16} />
                  Reject Request
                </button>
              )}
              {selectedRequest.action === 'remark' && (
                <button
                  onClick={() => handleStatusUpdate(selectedRequest.id, selectedRequest.status)}
                  className="btn btn-primary"
                >
                  <MessageSquare size={16} />
                  Save Remarks
                </button>
              )}
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

export default AdminHolidayManagement;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, COLLECTIONS } from '../../services/firestore';
import { storageService } from '../../services/storage';
import { FileText, MessageSquare, Search, Calendar, User, CheckCircle, Clock, AlertCircle, Download, Eye } from 'lucide-react';
import TextModal from '../Common/TextModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const AdminProgressReports = () => {
  const { userProfile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [modalData, setModalData] = useState({});

  useEffect(() => {
    if (userProfile) {
      console.log('AdminProgressReports - User Profile:', userProfile);
      console.log('AdminProgressReports - User Role:', userProfile.role);

      if (userProfile.role === 'admin') {
        loadProgressReports();
      } else {
        console.log('User is not admin, skipping report loading');
      }
    }
  }, [userProfile]);

  const loadProgressReports = async () => {
    setLoading(true);
    try {
      console.log('Admin loading progress reports...');
      console.log('Current user profile:', userProfile);
      console.log('User role:', userProfile?.role);
      console.log('User UID:', userProfile?.uid);

      // Try different approaches to fetch progress reports
      let allReports = [];

      try {
        // First try: Use getAll with default ordering
        console.log('Attempting to fetch with default ordering...');
        allReports = await firestoreService.getAll(COLLECTIONS.PROGRESS_REPORTS);
        console.log('Success with default ordering. Fetched reports:', allReports.length);
      } catch (orderError) {
        console.log('Default ordering failed, trying without ordering...');

        try {
          // Second try: Use getAll without ordering
          const { collection, getDocs } = await import('firebase/firestore');
          const { db } = await import('../../config/firebase');

          const querySnapshot = await getDocs(collection(db, COLLECTIONS.PROGRESS_REPORTS));
          allReports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('Success without ordering. Fetched reports:', allReports.length);
        } catch (simpleError) {
          console.error('Simple query also failed:', simpleError);
          throw simpleError;
        }
      }

      console.log('Raw fetched reports:', allReports);

      // Sort by date and time (newest first)
      const sortedReports = allReports.sort((a, b) => {
        try {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB - dateA;
        } catch (sortError) {
          console.warn('Error sorting reports:', sortError);
          return 0;
        }
      });

      setReports(sortedReports);

      if (sortedReports.length === 0) {
        console.log('No progress reports found');
        toast.info('No progress reports found. Try submitting a test report first.');
      } else {
        console.log(`Successfully loaded ${sortedReports.length} progress reports`);
        toast.success(`Loaded ${sortedReports.length} progress reports`);
      }
    } catch (error) {
      console.error('Error loading progress reports:', error);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);

      if (error.message.includes('permission') || error.message.includes('insufficient') || error.code === 'permission-denied') {
        toast.error('Permission denied. Firebase rules may need updating.');
        console.log('Permission denied - check Firebase rules for admin access');
      } else if (error.message.includes('index') || error.code === 'failed-precondition') {
        toast.error('Database index missing. Loading without sorting...');
        console.log('Index error - trying alternative query method');
      } else {
        toast.error('Failed to load progress reports: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRemarks = (report) => {
    setSelectedReport(report);
    setRemarks(report.adminRemarks || '');
    setShowRemarksModal(true);
  };

  const handleSaveRemarks = async () => {
    if (!selectedReport) return;

    try {
      const updatedData = {
        adminRemarks: remarks,
        status: 'reviewed',
        reviewedBy: userProfile.uid,
        reviewedAt: new Date().toISOString()
      };

      await firestoreService.update(COLLECTIONS.PROGRESS_REPORTS, selectedReport.id, updatedData);

      toast.success('Remarks added successfully!');
      setShowRemarksModal(false);
      setSelectedReport(null);
      setRemarks('');
      loadProgressReports();
    } catch (error) {
      console.error('Error saving remarks:', error);
      toast.error('Failed to save remarks');
    }
  };

  const showTasksModal = (report) => {
    setModalData({
      title: 'Tasks Completed',
      content: report.tasksCompleted,
      type: 'details',
      employeeName: report.employeeName,
      date: report.date,
      time: report.time
    });
    setShowTextModal(true);
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.tasksCompleted?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      submitted: { class: 'status-pending', icon: Clock, text: 'Submitted' },
      reviewed: { class: 'status-approved', icon: CheckCircle, text: 'Reviewed' },
      rejected: { class: 'status-rejected', icon: AlertCircle, text: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.submitted;
    const Icon = config.icon;

    return (
      <span className={`status-badge ${config.class}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Icon size={12} />
        {config.text}
      </span>
    );
  };

  const getStatusStats = () => {
    const stats = {
      total: reports.length,
      submitted: reports.filter(r => r.status === 'submitted').length,
      reviewed: reports.filter(r => r.status === 'reviewed').length,
      rejected: reports.filter(r => r.status === 'rejected').length
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
      <div className="flex justify-between align-center mb-20">
        <h2 style={{ color: '#333' }}>Employee Progress Reports</h2>
        <button
          onClick={loadProgressReports}
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center' }}>
          <h3 style={{ color: '#3498db', margin: '0 0 5px 0' }}>{stats.total}</h3>
          <p style={{ margin: 0, color: '#666' }}>Total Reports</p>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center' }}>
          <h3 style={{ color: '#f39c12', margin: '0 0 5px 0' }}>{stats.submitted}</h3>
          <p style={{ margin: 0, color: '#666' }}>Pending Review</p>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center' }}>
          <h3 style={{ color: '#27ae60', margin: '0 0 5px 0' }}>{stats.reviewed}</h3>
          <p style={{ margin: 0, color: '#666' }}>Reviewed</p>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center' }}>
          <h3 style={{ color: '#e74c3c', margin: '0 0 5px 0' }}>{stats.rejected}</h3>
          <p style={{ margin: 0, color: '#666' }}>Rejected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-20">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'center' }}>
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
              placeholder="Search by employee name, ID, or tasks..."
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
            <option value="submitted">Pending Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          Progress Reports ({filteredReports.length})
        </h3>

        {filteredReports.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px', minWidth: '120px' }}>Date</th>
                  <th style={{ width: '150px', minWidth: '150px' }}>Employee</th>
                  <th style={{ width: '150px', minWidth: '150px' }}>Tasks Completed</th>
                  <th style={{ width: '150px', minWidth: '150px' }}>File</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>Status</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td style={{
                      padding: '12px 8px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} style={{ color: '#666' }} />
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                            {format(new Date(report.date), 'MMM dd')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            {report.time}
                          </div>
                        </div>
                      </div>
                    </td>
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
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {report.employeeName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            ID: {report.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '12px 8px'
                    }}>
                      <button
                        onClick={() => showTasksModal(report)}
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto'
                        }}
                        title="View task details"
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                    </td>
                    <td style={{
                      padding: '12px 8px',
                      textAlign: 'center'
                    }}>
                      {report.fileName ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '4px'
                          }}>
                            <FileText size={16} style={{ color: '#3498db' }} />
                            <div style={{ textAlign: 'left' }}>
                              <div style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                maxWidth: '120px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {report.fileName}
                              </div>
                              <div style={{ fontSize: '10px', color: '#666' }}>
                                {report.fileSize ? `${(report.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                              </div>
                            </div>
                          </div>
                          {report.fileData ? (
                            <button
                              onClick={() => {
                                try {
                                  console.log('Admin downloading file:', report.fileName);
                                  storageService.createDownloadLink(report.fileName, report.fileData);
                                  toast.success(`Downloaded: ${report.fileName}`);
                                } catch (error) {
                                  console.error('Admin download error:', error);
                                  toast.error('Failed to download file: ' + error.message);
                                }
                              }}
                              style={{
                                background: '#27ae60',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#219a52'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'}
                              title="Download file"
                            >
                              <Download size={12} />
                              Download
                            </button>
                          ) : (
                            <span style={{
                              color: '#ccc',
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              File not available
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          color: '#999',
                          fontSize: '12px',
                          fontStyle: 'italic'
                        }}>
                          No file attached
                        </span>
                      )}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '12px 8px'
                    }}>
                      {getStatusBadge(report.status)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '12px 8px'
                    }}>
                      <button
                        onClick={() => handleAddRemarks(report)}
                        className="btn btn-secondary"
                        style={{
                          padding: '8px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          margin: '0 auto'
                        }}
                        title="Add/Edit Remarks"
                      >
                        <MessageSquare size={14} />
                        Remarks
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No progress reports found</p>
          </div>
        )}
      </div>

      {/* Remarks Modal */}
      {showRemarksModal && (
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
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              Add Remarks - {selectedReport?.employeeName}
            </h3>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Report Summary:</h4>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Date:</strong> {selectedReport?.date} at {selectedReport?.time}
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Tasks Completed:</strong> {selectedReport?.tasksCompleted}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="form-textarea"
                placeholder="Add your remarks about this progress report..."
                style={{ minHeight: '120px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRemarksModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRemarks}
                className="btn btn-success"
              >
                Save Remarks
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

export default AdminProgressReports;

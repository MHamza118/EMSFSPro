import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, COLLECTIONS } from '../../services/firestore';
import { storageService } from '../../services/storage';
import { FileText, Upload, Download, Clock, CheckCircle, MessageSquare, Eye } from 'lucide-react';
import TextModal from '../Common/TextModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ProgressReport = () => {
  const { currentUser, userProfile } = useAuth();
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tasksCompleted: '',
    file: null
  });
  const [loading, setLoading] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [modalData, setModalData] = useState({});

  useEffect(() => {
    loadProgressReports();
  }, [userProfile]);

  const loadProgressReports = async () => {
    try {
      const userReports = await firestoreService.getWhere(
        COLLECTIONS.PROGRESS_REPORTS,
        'userId',
        '==',
        userProfile.uid
      );
      setReports(userReports);
    } catch (error) {
      console.error('Error loading progress reports:', error);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.name === 'file') {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (0.8MB limit for Firestore Base64 storage)
        const fileSizeMB = file.size / (1024 * 1024);
        const maxSizeMB = 0.8;
        if (fileSizeMB > maxSizeMB) {
          toast.error(`File size must be less than ${maxSizeMB}MB for Firestore storage`);
          e.target.value = '';
          return;
        }

        // Validate file type using storage service
        if (!storageService.isValidFileType(file)) {
          toast.error('Invalid file type. Please upload PDF, DOC, DOCX, TXT, JPG, or PNG files.');
          e.target.value = '';
          return;
        }

        setFormData({
          ...formData,
          file: file
        });
      }
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.tasksCompleted.trim()) {
      toast.error('Please describe the tasks you completed today');
      return;
    }

    // Check if user profile is available
    if (!userProfile) {
      toast.error('User profile not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();

      // Debug log to see what userProfile contains
      console.log('User Profile:', userProfile);

      let fileData = {
        fileName: '',
        fileSize: 0,
        fileType: '',
        fileData: '',
        hasFile: false
      };

      // Process file for Firestore storage if a file is selected
      if (formData.file) {
        try {
          console.log('Processing file for Firestore storage...');

          // Check file size limit (1MB for Firestore base64 storage)
          const fileSizeMB = formData.file.size / (1024 * 1024);
          const maxSizeMB = 0.8; // Keep under 1MB to account for base64 encoding overhead

          if (fileSizeMB > maxSizeMB) {
            console.warn(`File too large: ${fileSizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`);
            toast.error(`File too large (${fileSizeMB.toFixed(2)}MB). Maximum size is ${maxSizeMB}MB for Firestore storage.`);

            // Store only file metadata without the actual file data
            fileData = {
              fileName: formData.file.name,
              fileSize: formData.file.size,
              fileType: formData.file.type,
              fileData: '', // Empty - file too large
              hasFile: true,
              uploadedAt: new Date().toISOString(),
              uploadError: 'File too large for Firestore storage'
            };
          } else {
            const processResult = await storageService.processFile(formData.file);

            fileData = {
              fileName: processResult.fileName,
              fileSize: processResult.fileSize,
              fileType: processResult.fileType,
              fileData: processResult.fileData,
              hasFile: true,
              uploadedAt: processResult.uploadedAt
            };

            console.log('File processed successfully:', {
              name: processResult.fileName,
              size: processResult.fileSize
            });
            toast.success('File processed successfully!');
          }
        } catch (uploadError) {
          console.error('Error processing file:', uploadError);
          toast.error('Failed to process file. Report will be saved without attachment.');

          // Store file metadata even if processing fails
          fileData = {
            fileName: formData.file.name,
            fileSize: formData.file.size,
            fileType: formData.file.type,
            fileData: '',
            hasFile: true,
            uploadedAt: new Date().toISOString(),
            uploadError: uploadError.message
          };
        }
      }

      const reportData = {
        userId: userProfile.uid || userProfile.id || '',
        employeeId: userProfile.employeeId || userProfile.uid || '',
        employeeName: userProfile.name || userProfile.displayName || userProfile.email || 'Unknown User',
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm:ss'),
        tasksCompleted: formData.tasksCompleted.trim(),
        ...fileData, // Include file data (fileName, fileSize, fileURL, filePath)
        status: 'submitted',
        adminRemarks: '',
        createdAt: now.toISOString()
      };

      // Debug log to see what data we're sending
      console.log('Current User:', currentUser);
      console.log('User Profile:', userProfile);
      console.log('Report Data:', reportData);

      // Remove the createdAt field since firestoreService.create will add serverTimestamp
      const { createdAt, ...dataToSave } = reportData;
      await firestoreService.create(COLLECTIONS.PROGRESS_REPORTS, dataToSave);

      toast.success('Progress report submitted successfully!');
      setFormData({
        tasksCompleted: '',
        file: null
      });
      setShowForm(false);
      loadProgressReports();
    } catch (error) {
      console.error('Error submitting progress report:', error);
      toast.error('Failed to submit progress report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      submitted: 'status-pending',
      reviewed: 'status-approved',
      rejected: 'status-rejected'
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  const showRemarksModal = (report) => {
    setModalData({
      title: 'Admin Remarks',
      content: report.adminRemarks,
      type: 'remarks',
      employeeName: report.employeeName,
      date: report.date,
      time: report.time
    });
    setShowTextModal(true);
  };

  return (
    <div className="content">
      <div className="flex justify-between align-center mb-20">
        <h2 style={{ color: '#333' }}>Submit Daily Progress</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : 'Submit Progress'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-20">
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Daily Progress Report</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tasks Completed Today *</label>
              <textarea
                name="tasksCompleted"
                value={formData.tasksCompleted}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Describe your daily progress, tasks completed, achievements, etc..."
                required
                style={{ minHeight: '120px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attach File (Optional)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  name="file"
                  onChange={handleInputChange}
                  className="form-input"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG (Max 0.8MB for Firestore storage)
                </div>
              </div>
              {formData.file && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: '#f8f9fa',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Upload size={16} style={{ color: '#27ae60' }} />
                  <span style={{ fontSize: '14px' }}>
                    {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between align-center">
              <div style={{ color: '#666', fontSize: '14px' }}>
                Report Date: {format(new Date(), 'MMMM do, yyyy')}
              </div>
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Progress'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333' }}>Your Previous Reports</h3>
        {reports.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px', minWidth: '100px' }}>Date</th>
                  <th style={{ width: '80px', minWidth: '80px' }}>Time</th>
                  <th style={{ width: '150px', minWidth: '150px' }}>Tasks Completed</th>
                  <th style={{ width: '120px', minWidth: '120px' }}>File</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>Status</th>
                  <th style={{ width: '150px', minWidth: '150px' }}>Admin Remarks</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {report.date}
                    </td>
                    <td style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {report.time}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '8px'
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
                      padding: '8px',
                      textAlign: 'center'
                    }}>
                      {report.fileName ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '2px'
                          }}>
                            <FileText size={14} style={{ color: '#3498db' }} />
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              maxWidth: '80px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {report.fileName}
                            </span>
                          </div>
                          {report.fileData ? (
                            <button
                              onClick={() => {
                                try {
                                  storageService.createDownloadLink(report.fileName, report.fileData);
                                  toast.success('File downloaded!');
                                } catch (error) {
                                  console.error('Download error:', error);
                                  toast.error('Failed to download file');
                                }
                              }}
                              style={{
                                background: '#27ae60',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Download file"
                            >
                              <Download size={12} />
                              Download
                            </button>
                          ) : (
                            <span style={{
                              color: report.uploadError ? '#e74c3c' : '#ccc',
                              fontSize: '10px',
                              fontStyle: 'italic'
                            }}>
                              {report.uploadError ? 'Too large' : 'Not available'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          color: '#999',
                          fontSize: '12px',
                          fontStyle: 'italic'
                        }}>
                          No file
                        </span>
                      )}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '8px'
                    }}>
                      {getStatusBadge(report.status)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '8px'
                    }}>
                      <button
                        onClick={() => showRemarksModal(report)}
                        className="btn btn-info"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto',
                          opacity: report.adminRemarks ? 1 : 0.6
                        }}
                        title={report.adminRemarks ? "View admin remarks" : "No remarks available"}
                      >
                        <MessageSquare size={14} />
                        {report.adminRemarks ? 'View Remarks' : 'No Remarks'}
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
            <p>No progress reports submitted yet</p>
          </div>
        )}
      </div>

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

export default ProgressReport;

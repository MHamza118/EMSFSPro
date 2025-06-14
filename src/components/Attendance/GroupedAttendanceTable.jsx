import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { WorkingHoursCalculator } from '../../services/workingHoursCalculator';

const GroupedAttendanceTable = ({ attendanceRecords, schedule }) => {
  const [expandedDates, setExpandedDates] = useState({});

  // Group records by date
  const groupedRecords = attendanceRecords.reduce((groups, record) => {
    const date = record.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {});

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedRecords).sort((a, b) => new Date(b) - new Date(a));

  const toggleExpanded = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    // Ensure HH:MM:SS format
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return `${parts[0]}:${parts[1]}:00`;
    }
    return timeStr;
  };

  const calculateDaySummary = (records) => {
    const hoursCalculation = WorkingHoursCalculator.calculateDayWorkingHours(records);
    return hoursCalculation;
  };

  if (sortedDates.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <Clock size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
        <p>No attendance records found</p>
      </div>
    );
  }

  return (
    <div className="grouped-attendance">
      {sortedDates.map(date => {
        const records = groupedRecords[date];
        const isExpanded = expandedDates[date];
        const daySummary = calculateDaySummary(records);
        
        // Sort records by timestamp (newest first)
        const sortedRecords = [...records].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );

        return (
          <div key={date} className="date-group" style={{ marginBottom: '20px' }}>
            {/* Date Header */}
            <div 
              className="date-header"
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '15px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.2s'
              }}
              onClick={() => toggleExpanded(date)}
              onMouseEnter={(e) => e.target.style.background = '#e9ecef'}
              onMouseLeave={(e) => e.target.style.background = '#f8f9fa'}
            >
              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                  {formatDate(date)}
                </h4>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <span style={{ marginRight: '20px' }}>
                    Records: {records.length}
                  </span>
                  <span style={{ marginRight: '20px' }}>
                    Working Hours: {WorkingHoursCalculator.formatWorkingHoursDisplay(daySummary)}
                  </span>
                  <span>
                    Status: {daySummary.status === 'INCOMPLETE' ? 'Incomplete' : 'Complete'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </span>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            {/* Expanded Records */}
            {isExpanded && (
              <div 
                className="date-records"
                style={{
                  border: '1px solid #dee2e6',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  background: 'white'
                }}
              >
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th>Type</th>
                      <th>Actual Time</th>
                      <th>Scheduled Time</th>
                      <th>Working Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((record, index) => (
                      <tr key={index}>
                        <td>
                          <span className={`status-badge ${record.type === 'checkin'
                            ? (record.isLate ? 'status-rejected' : 'status-approved')
                            : (record.isLate ? 'status-rejected' : 'status-pending')
                            }`}>
                            {record.type === 'checkin'
                              ? (record.isLate ? 'Late Check In' : 'Check In')
                              : (record.isLate ? 'Late Check Out' : 'Check Out')}
                          </span>
                          {record.isLate && record.lateReason && (
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                              Reason: {record.lateReason}
                            </div>
                          )}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {formatTime(record.type === 'checkin' ? record.checkInTime : record.checkOutTime)}
                        </td>
                        <td style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                          {formatTime(record.type === 'checkin' 
                            ? record.scheduledCheckIn 
                            : record.scheduledCheckOut) || '-'}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {record.workingHoursDisplay || (record.workingHours ? `${record.workingHours}h` : '-')}
                        </td>
                        <td>
                          {record.type === 'checkin' ? (
                            <span style={{ color: '#28a745', fontSize: '12px' }}>✓ Checked In</span>
                          ) : (
                            <span style={{ color: '#dc3545', fontSize: '12px' }}>✓ Checked Out</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Day Summary */}
                <div style={{ 
                  padding: '15px', 
                  background: '#f8f9fa', 
                  borderTop: '1px solid #dee2e6',
                  borderRadius: '0 0 8px 8px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div>
                      <strong>Regular Hours:</strong><br />
                      <span style={{ color: '#28a745' }}>{daySummary.regularHours?.display || '0h 0m'}</span>
                    </div>
                    <div>
                      <strong>Late Hours:</strong><br />
                      <span style={{ color: '#ffc107' }}>{daySummary.lateHours?.display || '0h 0m'}</span>
                    </div>
                    <div>
                      <strong>Total Hours:</strong><br />
                      <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                        {daySummary.totalHours?.display || '0h 0m'}
                      </span>
                    </div>
                    <div>
                      <strong>Pairs:</strong><br />
                      <span style={{ color: '#6c757d' }}>
                        {daySummary.breakdown?.totalPairs || 0} complete
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedAttendanceTable;

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, X, AlertTriangle } from 'lucide-react';
import { WorkingHoursCalculator } from '../../services/workingHoursCalculator';
import { TimeValidationService } from '../../services/timeValidationService';

const PairedAttendanceTable = ({ attendanceRecords, schedule }) => {
  const [expandedDates, setExpandedDates] = useState({});
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState({ reason: '', type: '', time: '' });

  // Group records by date and pair check-ins with check-outs
  const groupedAndPairedRecords = () => {
    const grouped = attendanceRecords.reduce((groups, record) => {
      const date = record.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(record);
      return groups;
    }, {});

    // Process each date to create pairs
    const pairedGroups = {};
    Object.keys(grouped).forEach(date => {
      const records = grouped[date];
      pairedGroups[date] = createPairs(records);
    });

    return pairedGroups;
  };

  // Create check-in/check-out pairs from records
  const createPairs = (records) => {
    const checkIns = records.filter(r => r.type === 'checkin').sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    const checkOuts = records.filter(r => r.type === 'checkout').sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const pairs = [];
    const usedCheckOuts = new Set();

    checkIns.forEach((checkIn, index) => {
      // Find the corresponding check-out for this check-in
      let correspondingCheckOut = null;

      // Look for the next available check-out after this check-in (chronologically)
      for (let i = 0; i < checkOuts.length; i++) {
        const checkOut = checkOuts[i];
        if (!usedCheckOuts.has(i) &&
          new Date(checkOut.timestamp) > new Date(checkIn.timestamp)) {
          correspondingCheckOut = checkOut;
          usedCheckOuts.add(i);
          break;
        }
      }

      // Calculate working hours if both check-in and check-out exist
      let workingHours = null;
      if (correspondingCheckOut) {
        workingHours = TimeValidationService.calculateWorkingHours(
          checkIn.checkInTime,
          correspondingCheckOut.checkOutTime
        );
      }

      pairs.push({
        checkIn,
        checkOut: correspondingCheckOut,
        workingHours,
        pairIndex: index,
        isComplete: !!correspondingCheckOut,
        isLate: checkIn.isLate || (correspondingCheckOut && correspondingCheckOut.isLate)
      });
    });

    // Add any unpaired check-outs
    checkOuts.forEach((checkOut, index) => {
      if (!usedCheckOuts.has(index)) {
        pairs.push({
          checkIn: null,
          checkOut,
          workingHours: null,
          pairIndex: pairs.length,
          isComplete: false,
          isLate: checkOut.isLate
        });
      }
    });

    // Sort pairs by check-in time (or check-out time if no check-in)
    return pairs.sort((a, b) => {
      const timeA = a.checkIn ? new Date(a.checkIn.timestamp) : new Date(a.checkOut.timestamp);
      const timeB = b.checkIn ? new Date(b.checkIn.timestamp) : new Date(b.checkOut.timestamp);
      return timeB - timeA; // Newest first
    });
  };

  const toggleExpanded = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const showLateReason = (record, type) => {
    if (record && record.lateReason) {
      setSelectedReason({
        reason: record.lateReason,
        type: type === 'checkin' ? 'Check-in' : 'Check-out',
        time: type === 'checkin' ? record.checkInTime : record.checkOutTime
      });
      setShowReasonModal(true);
    }
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
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return `${parts[0]}:${parts[1]}:00`;
    }
    return timeStr;
  };

  const getStatusBadge = (record, type) => {
    if (!record) return null;

    const isLate = record.isLate;
    const badgeClass = isLate ? 'status-rejected' :
      (type === 'checkin' ? 'status-approved' : 'status-pending');
    const text = type === 'checkin' ?
      (isLate ? 'Late Check In' : 'Check In') :
      (isLate ? 'Late Check Out' : 'Check Out');

    return (
      <div>
        <span className={`status-badge ${badgeClass}`}>
          {text}
        </span>
        {isLate && record.lateReason && (
          <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
            Reason: {record.lateReason}
          </div>
        )}
      </div>
    );
  };

  const calculateDaySummary = (pairs) => {
    const completePairs = pairs.filter(pair => pair.isComplete);
    let totalMinutes = 0;
    let regularMinutes = 0;
    let lateMinutes = 0;

    completePairs.forEach(pair => {
      if (pair.workingHours && pair.workingHours.total > 0) {
        const minutes = pair.workingHours.hours * 60 + pair.workingHours.minutes;
        totalMinutes += minutes;

        if (pair.isLate) {
          lateMinutes += minutes;
        } else {
          regularMinutes += minutes;
        }
      }
    });

    return {
      totalHours: {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
        display: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      },
      regularHours: {
        hours: Math.floor(regularMinutes / 60),
        minutes: regularMinutes % 60,
        display: `${Math.floor(regularMinutes / 60)}h ${regularMinutes % 60}m`
      },
      lateHours: {
        hours: Math.floor(lateMinutes / 60),
        minutes: lateMinutes % 60,
        display: `${Math.floor(lateMinutes / 60)}h ${lateMinutes % 60}m`
      },
      completePairs: completePairs.length,
      totalPairs: pairs.length
    };
  };

  const pairedGroups = groupedAndPairedRecords();
  const sortedDates = Object.keys(pairedGroups).sort((a, b) => new Date(b) - new Date(a));

  if (sortedDates.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <Clock size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
        <p>No attendance records found</p>
      </div>
    );
  }

  return (
    <div className="paired-attendance">
      {sortedDates.map(date => {
        const pairs = pairedGroups[date];
        const isExpanded = expandedDates[date];
        const daySummary = calculateDaySummary(pairs);

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
                    Pairs: {daySummary.completePairs}/{daySummary.totalPairs}
                  </span>
                  <span style={{ marginRight: '20px' }}>
                    Total Hours: {daySummary.totalHours.display}
                  </span>
                  {daySummary.lateHours.hours > 0 && (
                    <span style={{ color: '#e67e22' }}>
                      Late: {daySummary.lateHours.display}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </span>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            {/* Expanded Pairs */}
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
                      <th>Regular Check In</th>
                      <th>Regular Check Out</th>
                      <th>Late Check In</th>
                      <th>Late Check Out</th>
                      <th>Working Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((pair, index) => (
                      <tr key={index} style={{
                        background: pair.isComplete ? 'white' : '#fff3cd',
                        borderLeft: pair.isLate ? '3px solid #e74c3c' : '3px solid transparent'
                      }}>
                        {/* Regular Check In */}
                        <td>
                          {pair.checkIn && !pair.checkIn.isLate ? (
                            <div>
                              <div style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '4px' }}>
                                {formatTime(pair.checkIn.checkInTime)}
                              </div>
                              {getStatusBadge(pair.checkIn, 'checkin')}
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        {/* Regular Check Out */}
                        <td>
                          {pair.checkOut && !pair.checkOut.isLate ? (
                            <div>
                              <div style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '4px' }}>
                                {formatTime(pair.checkOut.checkOutTime)}
                              </div>
                              {getStatusBadge(pair.checkOut, 'checkout')}
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        {/* Late Check In */}
                        <td>
                          {pair.checkIn && pair.checkIn.isLate ? (
                            <div>
                              <div style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '4px', color: '#f39c12' }}>
                                {formatTime(pair.checkIn.checkInTime)}
                              </div>
                              <button
                                onClick={() => showLateReason(pair.checkIn, 'checkin')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#f39c12',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  textDecoration: 'underline',
                                  padding: '2px 0',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Click to view late reason"
                              >
                                <AlertTriangle size={12} style={{ marginRight: '3px' }} />
                                Late (View Reason)
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        {/* Late Check Out */}
                        <td>
                          {pair.checkOut && pair.checkOut.isLate ? (
                            <div>
                              <div style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '4px', color: '#f39c12' }}>
                                {formatTime(pair.checkOut.checkOutTime)}
                              </div>
                              <div style={{ fontSize: '11px', color: '#f39c12', display: 'flex', alignItems: 'center' }}>
                                <AlertTriangle size={12} style={{ marginRight: '3px' }} />
                                Late Check Out
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {pair.isComplete ? (
                            <div>
                              <div style={{ color: '#007bff', fontWeight: 'bold' }}>
                                {pair.workingHours ? pair.workingHours.display : '0h 0m'}
                              </div>
                              {(pair.checkIn?.isLate || pair.checkOut?.isLate) && (
                                <div style={{ fontSize: '11px', color: '#f39c12', marginTop: '2px' }}>
                                  (Includes Late Hours)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#ffc107' }}>Incomplete</span>
                          )}
                        </td>
                        <td>
                          {pair.isComplete ? (
                            <span style={{ color: '#28a745', fontSize: '12px' }}>
                              ✓ Complete {pair.isLate ? '(Late)' : ''}
                            </span>
                          ) : (
                            <span style={{ color: '#ffc107', fontSize: '12px' }}>
                              ⚠ Incomplete
                            </span>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    <div>
                      <strong>Regular Hours:</strong><br />
                      <span style={{ color: '#28a745' }}>{daySummary.regularHours.display}</span>
                    </div>
                    <div>
                      <strong>Late Hours:</strong><br />
                      <span style={{ color: '#ffc107' }}>{daySummary.lateHours.display}</span>
                    </div>
                    <div>
                      <strong>Total Hours:</strong><br />
                      <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                        {daySummary.totalHours.display}
                      </span>
                    </div>
                    <div>
                      <strong>Completion:</strong><br />
                      <span style={{ color: '#6c757d' }}>
                        {daySummary.completePairs}/{daySummary.totalPairs} pairs
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Late Reason Modal */}
      {showReasonModal && (
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
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} style={{ color: '#f39c12' }} />
                Late {selectedReason.type} Reason
              </h3>
              <button
                onClick={() => setShowReasonModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#fff3cd',
                borderRadius: '6px',
                border: '1px solid #ffeaa7',
                marginBottom: '15px'
              }}>
                <div style={{ fontSize: '14px', color: '#856404', marginBottom: '5px' }}>
                  <strong>Time:</strong> {selectedReason.time}
                </div>
                <div style={{ fontSize: '14px', color: '#856404' }}>
                  <strong>Type:</strong> Late {selectedReason.type}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  Reason for Late {selectedReason.type}:
                </label>
                <div style={{
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  minHeight: '80px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#333'
                }}>
                  {selectedReason.reason}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setShowReasonModal(false)}
                className="btn btn-secondary"
                style={{ padding: '10px 20px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PairedAttendanceTable;

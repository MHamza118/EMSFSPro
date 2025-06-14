import { useState } from 'react';
import { TimeValidationService } from '../../services/timeValidationService';
import { AlertTriangle, X } from 'lucide-react';

const TodayPairedTable = ({ todayAttendance }) => {
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState({ reason: '', type: '', time: '' });

  // Create check-in/check-out pairs from records (copied from PairedAttendanceTable)
  const createPairs = (records) => {
    const checkIns = records.filter(r => r.type === 'checkin').sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const checkOuts = records.filter(r => r.type === 'checkout').sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const pairs = [];
    const usedCheckOuts = new Set();

    checkIns.forEach((checkIn, index) => {
      // Find the corresponding check-out for this check-in
      let correspondingCheckOut = null;
      for (let i = 0; i < checkOuts.length; i++) {
        const checkOut = checkOuts[i];
        if (!usedCheckOuts.has(i) && new Date(checkOut.timestamp) > new Date(checkIn.timestamp)) {
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
      return timeA - timeB; // Oldest first for today
    });
  };

  // Calculate total working hours for the day (copied from PairedAttendanceTable)
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

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const parts = timeStr.split(':');
    return parts.length === 2 ? `${parts[0]}:${parts[1]}:00` : timeStr;
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
        <span className={`status-badge ${badgeClass}`} style={{ fontSize: '11px' }}>
          {text}
        </span>
        {isLate && record.lateReason && (
          <button
            style={{ fontSize: '10px', color: '#f39c12', marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => showLateReason(record, type)}
          >
            <AlertTriangle size={12} style={{ marginRight: '3px' }} />
            View Reason
          </button>
        )}
      </div>
    );
  };

  const pairs = createPairs(todayAttendance);
  const summary = calculateDaySummary(pairs);

  return (
    <div>
      <table className="table" style={{
        tableLayout: 'fixed',
        width: '100%',
        borderCollapse: 'collapse'
      }}>
        <thead>
          <tr>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Working Hours</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair, index) => (
            <tr key={index} style={{
              background: pair.isComplete ? 'white' : '#fff3cd',
              borderLeft: pair.isLate ? '3px solid #e74c3c' : '3px solid transparent',
              height: 'auto',
              verticalAlign: 'top'
            }}>
              {/* Check In */}
              <td style={{ padding: '12px', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' }}>
                {pair.checkIn ? (
                  <div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '4px', color: pair.checkIn.isLate ? '#f39c12' : undefined }}>
                      {formatTime(pair.checkIn.checkInTime)}
                    </div>
                    {getStatusBadge(pair.checkIn, 'checkin')}
                  </div>
                ) : (
                  <span style={{ color: '#999' }}>-</span>
                )}
              </td>
              {/* Check Out */}
              <td style={{ padding: '12px', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' }}>
                {pair.checkOut ? (
                  <div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 'bold', marginBottom: '4px', color: pair.checkOut.isLate ? '#f39c12' : undefined }}>
                      {formatTime(pair.checkOut.checkOutTime)}
                    </div>
                    {getStatusBadge(pair.checkOut, 'checkout')}
                  </div>
                ) : (
                  <span style={{ color: '#999' }}>-</span>
                )}
              </td>
              {/* Working Hours */}
              <td style={{ padding: '12px', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' }}>
                {pair.workingHours ? pair.workingHours.display : '-'}
              </td>
              {/* Status */}
              <td style={{ padding: '12px', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' }}>
                {pair.isComplete ? (
                  <span style={{ color: pair.isLate ? '#f39c12' : '#27ae60', fontWeight: 500 }}>
                    ✓ Complete{pair.isLate ? ' (Late)' : ''}
                  </span>
                ) : (
                  <span style={{ color: '#999' }}>Incomplete</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Total working hours summary */}
      <div style={{ marginTop: '10px', fontWeight: 500, color: '#333' }}>
        Total Working Hours: {summary.totalHours.display}
        {summary.lateHours.totalMinutes > 0 && (
          <span style={{ color: '#f39c12', marginLeft: '10px' }}>
            (Late: {summary.lateHours.display})
          </span>
        )}
      </div>
      {/* Modal for late reason */}
      {showReasonModal && (
        <div className="modal-overlay" onClick={() => setShowReasonModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Late {selectedReason.type} Reason</h3>
              <button className="modal-close" onClick={() => setShowReasonModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Time:</strong> {selectedReason.time}</p>
              <p><strong>Reason:</strong> {selectedReason.reason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayPairedTable;

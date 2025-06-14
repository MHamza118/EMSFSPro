import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, firestoreService, COLLECTIONS } from '../../services/firestore';
import { TimeValidationService } from '../../services/timeValidationService';
import { WorkingHoursCalculator } from '../../services/workingHoursCalculator';
import PairedAttendanceTable from './PairedAttendanceTable';
import TodayPairedTable from './TodayPairedTable';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { notifyLateCheckin } from '../../utils/notificationHelper';

const CheckInOut = () => {
  const { userProfile } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [modalType, setModalType] = useState(''); // 'checkin' or 'checkout'
  const [schedule, setSchedule] = useState(null);
  const [validationStatus, setValidationStatus] = useState({});
  const [allAttendance, setAllAttendance] = useState([]);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  // Remove displayMode, go back to simple showAllRecords

  useEffect(() => {
    loadTodayAttendance();
    loadEmployeeSchedule();
  }, [userProfile]);

  useEffect(() => {
    if (schedule && todayAttendance) {
      updateValidationStatus(todayAttendance);
    }
  }, [schedule, todayAttendance]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadEmployeeSchedule = async () => {
    try {
      console.log('Loading schedule for user:', userProfile.uid);

      const timeTables = await firestoreService.getWhere(
        COLLECTIONS.TIME_TABLES,
        'userId',
        '==',
        userProfile.uid
      );

      console.log('Found time tables:', timeTables);

      if (timeTables.length > 0) {
        const scheduleData = timeTables[0].schedule || {};
        console.log('Setting schedule data:', scheduleData);
        setSchedule(scheduleData);
      } else {
        console.log('No time tables found, setting empty schedule');
        setSchedule({});
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      setSchedule({});
    }
  };

  const loadTodayAttendance = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Load all attendance records for this user (for comprehensive tracking)
      const attendance = await firestoreService.getWhere(
        COLLECTIONS.ATTENDANCE,
        'userId',
        '==',
        userProfile.uid
      );



      // Sort all attendance by date and timestamp (newest first)
      const sortedAttendance = attendance.sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      setAllAttendance(sortedAttendance);

      // Filter today's records
      const todayRecords = attendance.filter(record =>
        record.date === today
      ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setTodayAttendance(todayRecords);



      // Determine current status using validation service
      const isCheckedIn = TimeValidationService.isCurrentlyCheckedIn(todayRecords);
      setCurrentStatus(isCheckedIn ? 'checked-in' : 'not-checked-in');



      // Update validation status when both schedule and attendance are loaded
      if (schedule) {
        updateValidationStatus(todayRecords);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const updateValidationStatus = (attendanceRecords) => {
    if (!schedule) {
      return;
    }

    const regularCheckInValidation = TimeValidationService.validateRegularCheckIn(schedule, attendanceRecords);
    const lateCheckInValidation = TimeValidationService.validateLateCheckIn(schedule, attendanceRecords);
    const regularCheckOutValidation = TimeValidationService.validateRegularCheckOut(schedule, attendanceRecords);
    const lateCheckOutValidation = TimeValidationService.validateLateCheckOut(schedule, attendanceRecords);

    setValidationStatus({
      regularCheckIn: regularCheckInValidation,
      lateCheckIn: lateCheckInValidation,
      regularCheckOut: regularCheckOutValidation,
      lateCheckOut: lateCheckOutValidation
    });
  };

  const handleCheckIn = async () => {
    // Validate check-in before proceeding
    const validation = TimeValidationService.validateRegularCheckIn(schedule, todayAttendance);

    if (!validation.allowed) {
      toast.error(validation.message);
      return;
    }

    // Check for multiple check-ins within 10 minutes
    const recentCheckIns = TimeValidationService.getRecentCheckIns(todayAttendance, 10);
    if (recentCheckIns.length > 0) {
      toast.error('Multiple check-ins within 10 minutes are not allowed');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const nextSlot = validation.slot;

      const checkInData = {
        userId: userProfile.uid,
        employeeId: userProfile.employeeId,
        employeeName: userProfile.name,
        date: format(now, 'yyyy-MM-dd'),
        day: format(now, 'EEEE'),
        checkInTime: format(now, 'HH:mm:ss'),
        timestamp: now.toISOString(),
        type: 'checkin',
        scheduledCheckIn: nextSlot.scheduledCheckIn,
        scheduledCheckOut: nextSlot.scheduledCheckOut,
        slotIndex: nextSlot.slotIndex
      };

      await attendanceService.checkIn(userProfile.uid, checkInData);
      toast.success('Checked in successfully!');
      loadTodayAttendance();
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    // Validate check-out before proceeding
    const validation = TimeValidationService.validateRegularCheckOut(schedule, todayAttendance);

    if (!validation.allowed) {
      toast.error(validation.message);
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const lastCheckIn = validation.lastCheckIn;

      // Calculate working hours using the new service
      const workingHours = TimeValidationService.calculateWorkingHours(
        lastCheckIn.checkInTime,
        format(now, 'HH:mm:ss')
      );

      const checkOutData = {
        userId: userProfile.uid,
        employeeId: userProfile.employeeId,
        employeeName: userProfile.name,
        date: format(now, 'yyyy-MM-dd'),
        day: format(now, 'EEEE'),
        checkOutTime: format(now, 'HH:mm:ss'),
        workingHours: workingHours.total,
        workingHoursDisplay: workingHours.display,
        timestamp: now.toISOString(),
        type: 'checkout',
        checkInTime: lastCheckIn.checkInTime,
        scheduledCheckIn: lastCheckIn.scheduledCheckIn,
        scheduledCheckOut: lastCheckIn.scheduledCheckOut,
        slotIndex: lastCheckIn.slotIndex
      };

      await firestoreService.create(COLLECTIONS.ATTENDANCE, checkOutData);
      toast.success('Checked out successfully!');
      loadTodayAttendance();
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error('Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const handleLateCheckIn = async () => {
    if (!lateReason.trim()) {
      toast.error('Please provide a reason for late check-in');
      return;
    }

    // Validate late check-in before proceeding
    const validation = TimeValidationService.validateLateCheckIn(schedule, todayAttendance);

    if (!validation.allowed) {
      toast.error(validation.message);
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const nextSlot = validation.slot;

      const checkInData = {
        userId: userProfile.uid,
        employeeId: userProfile.employeeId,
        employeeName: userProfile.name,
        date: format(now, 'yyyy-MM-dd'),
        day: format(now, 'EEEE'),
        checkInTime: format(now, 'HH:mm:ss'),
        timestamp: now.toISOString(),
        type: 'checkin',
        isLate: true,
        lateReason: lateReason.trim(),
        scheduledCheckIn: nextSlot.scheduledCheckIn,
        scheduledCheckOut: nextSlot.scheduledCheckOut,
        slotIndex: nextSlot.slotIndex
      };

      await attendanceService.checkIn(userProfile.uid, checkInData);

      // Notify all admins about the late check-in
      const allUsers = await firestoreService.getAll(COLLECTIONS.USERS);
      const admins = allUsers.filter(user => user.role === 'admin');

      for (const admin of admins) {
        await notifyLateCheckin(
          admin.uid,
          userProfile.name,
          format(now, 'HH:mm:ss'),
          lateReason.trim()
        );
      }

      toast.success('Late check-in recorded successfully!');
      setShowLateModal(false);
      setLateReason('');
      setModalType('');
      loadTodayAttendance();
    } catch (error) {
      console.error('Late check-in error:', error);
      toast.error('Failed to record late check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleLateCheckOut = async () => {
    // No reason required for late check-out

    // Validate late check-out before proceeding
    const validation = TimeValidationService.validateLateCheckOut(schedule, todayAttendance);

    if (!validation.allowed) {
      toast.error(validation.message);
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const lastCheckIn = validation.lastCheckIn;

      // Calculate working hours using the new service
      const workingHours = TimeValidationService.calculateWorkingHours(
        lastCheckIn.checkInTime,
        format(now, 'HH:mm:ss')
      );

      const checkOutData = {
        userId: userProfile.uid,
        employeeId: userProfile.employeeId,
        employeeName: userProfile.name,
        date: format(now, 'yyyy-MM-dd'),
        day: format(now, 'EEEE'),
        checkOutTime: format(now, 'HH:mm:ss'),
        workingHours: workingHours.total,
        workingHoursDisplay: workingHours.display,
        timestamp: now.toISOString(),
        type: 'checkout',
        checkInTime: lastCheckIn.checkInTime,
        scheduledCheckIn: lastCheckIn.scheduledCheckIn,
        scheduledCheckOut: lastCheckIn.scheduledCheckOut,
        slotIndex: lastCheckIn.slotIndex,
        isLate: true
        // No lateReason field for late check-out
      };

      await firestoreService.create(COLLECTIONS.ATTENDANCE, checkOutData);
      toast.success('Late check-out recorded successfully!');
      setShowLateModal(false);
      setLateReason('');
      setModalType('');
      loadTodayAttendance();
    } catch (error) {
      console.error('Late check-out error:', error);
      toast.error('Failed to record late check-out');
    } finally {
      setLoading(false);
    }
  };

  const handleLateAction = () => {
    if (modalType === 'checkin') {
      handleLateCheckIn();
    } else if (modalType === 'checkout') {
      handleLateCheckOut();
    }
  };

  const getStatusDisplay = () => {
    const isCheckedIn = currentStatus === 'checked-in';

    // Determine if regular check-in should be available
    const shouldShowRegularCheckIn = () => {
      if (!schedule || isCheckedIn) return false;
      return validationStatus.regularCheckIn?.allowed === true;
    };

    // Determine if late check-in should be available
    const shouldShowLateCheckIn = () => {
      if (!schedule || isCheckedIn) return false;
      return validationStatus.regularCheckIn?.allowed === false &&
        validationStatus.regularCheckIn?.reason === 'TOO_LATE';
    };

    // Determine if regular check-out should be available
    const shouldShowRegularCheckOut = () => {
      if (!schedule || !isCheckedIn) return false;
      const lastCheckIn = todayAttendance.find(record => record.type === 'checkin');
      return lastCheckIn && !lastCheckIn.isLate && validationStatus.regularCheckOut?.allowed === true;
    };

    // Determine if late check-out should be available
    const shouldShowLateCheckOut = () => {
      if (!schedule || !isCheckedIn) return false;
      const lastCheckIn = todayAttendance.find(record => record.type === 'checkin');
      return lastCheckIn && lastCheckIn.isLate && validationStatus.regularCheckOut?.allowed === false;
    };

    if (isCheckedIn) {
      return {
        text: 'Currently Checked In',
        color: '#27ae60',
        icon: CheckCircle,
        action: 'Check Out',
        handler: handleCheckOut,
        canRegularCheckOut: shouldShowRegularCheckOut(),
        canLateCheckOut: shouldShowLateCheckOut()
      };
    } else {
      return {
        text: 'Not Checked In',
        color: '#f39c12',
        icon: Clock,
        action: 'Check In',
        handler: handleCheckIn,
        canRegularCheckIn: shouldShowRegularCheckIn(),
        canLateCheckIn: shouldShowLateCheckIn()
      };
    }
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  // Make isCheckedIn available in render scope
  const isCheckedIn = currentStatus === 'checked-in';

  // Get validation results for current slot
  const regularCheckInValidation = TimeValidationService.validateRegularCheckIn(schedule, todayAttendance);
  const lateCheckInValidation = TimeValidationService.validateLateCheckIn(schedule, todayAttendance);
  const regularCheckOutValidation = TimeValidationService.validateRegularCheckOut(schedule, todayAttendance);
  const lateCheckOutValidation = TimeValidationService.validateLateCheckOut(schedule, todayAttendance);

  // Find the last check-in record for today
  const lastCheckIn = todayAttendance.filter(r => r.type === 'checkin').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  const lastCheckInIsLate = lastCheckIn?.isLate === true;

  return (
    <div className="content">
      {/* Current Status Card */}
      <div className="card text-center" style={{ marginBottom: '20px', marginTop: '10px' }}>
        <h2 style={{ marginBottom: '15px', color: '#333', fontSize: '24px' }}>Check In/Out</h2>
        <StatusIcon size={48} style={{ color: status.color, marginBottom: '15px' }} />
        <h3 style={{ color: status.color, marginBottom: '15px', fontSize: '20px' }}>
          {status.text}
        </h3>
        <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
          Current Time: {format(currentTime, 'HH:mm:ss - EEEE, MMMM do, yyyy')}
        </p>

        {/* Show validation error if neither regular nor late is allowed */}
        {!isCheckedIn && !regularCheckInValidation.allowed && !lateCheckInValidation.allowed && (
          <div style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '15px',
            color: '#721c24',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ❌ {regularCheckInValidation.message || lateCheckInValidation.message}
          </div>
        )}
        {isCheckedIn && !regularCheckOutValidation.allowed && !lateCheckOutValidation.allowed && (
          <div style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '15px',
            color: '#721c24',
            fontSize: '14px'
          }}>
            ❌ {regularCheckOutValidation.message || lateCheckOutValidation.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Regular Check-in Button */}
          {!isCheckedIn && regularCheckInValidation.allowed && (
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="btn btn-success"
              style={{ fontSize: '16px', padding: '12px 24px' }}
            >
              {loading ? 'Processing...' : 'Regular Check-in'}
            </button>
          )}
          {/* Late Check-in Button */}
          {!isCheckedIn && !regularCheckInValidation.allowed && lateCheckInValidation.allowed && (
            <button
              onClick={() => {
                setModalType('checkin');
                setShowLateModal(true);
              }}
              disabled={loading}
              className="btn btn-warning"
              style={{ fontSize: '16px', padding: '12px 24px' }}
              title="Submit late check-in with reason"
            >
              <AlertTriangle size={16} style={{ marginRight: '6px' }} />
              Late Check-in
            </button>
          )}
          {/* Regular Check-out Button (only if last check-in was regular) */}
          {isCheckedIn && !lastCheckInIsLate && regularCheckOutValidation.allowed && (
            <button
              onClick={handleCheckOut}
              disabled={loading}
              className="btn btn-danger"
              style={{ fontSize: '16px', padding: '12px 24px' }}
            >
              {loading ? 'Processing...' : 'Regular Check-out'}
            </button>
          )}
          {/* Late Check-out Button (only if last check-in was late) */}
          {isCheckedIn && lastCheckInIsLate && lateCheckOutValidation.allowed && (
            <button
              onClick={() => {
                setModalType('checkout');
                setShowLateModal(true);
              }}
              disabled={loading}
              className="btn btn-warning"
              style={{ fontSize: '16px', padding: '12px 24px' }}
              title="Submit late check-out"
            >
              <AlertTriangle size={16} style={{ marginRight: '6px' }} />
              Late Check-out
            </button>
          )}
        </div>
      </div>

      {/* Attendance Records */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#333' }}>
            {showAllRecords ? 'All Attendance Records' : 'Today\'s Attendance'}
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowAllRecords(false)}
              className={`btn ${!showAllRecords ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              Today Only
            </button>
            <button
              onClick={() => setShowAllRecords(true)}
              className={`btn ${showAllRecords ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              All Records
            </button>
          </div>
        </div>
        {showAllRecords ? (
          <PairedAttendanceTable
            attendanceRecords={allAttendance}
            schedule={schedule}
          />
        ) : (
          <>
            {todayAttendance.length > 0 ? (
              <>
                <TodayPairedTable todayAttendance={todayAttendance} />
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <Clock size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p>No attendance records for today</p>
              </div>
            )}
          </>
        )}

        {/* Late Check-in/out Modal */}
        {showLateModal && (
          <div className="modal-overlay" onClick={() => {
            setShowLateModal(false);
            setLateReason('');
            setModalType('');
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Late {modalType === 'checkin' ? 'Check-in' : 'Check-out'}</h3>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowLateModal(false);
                    setLateReason('');
                    setModalType('');
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                {modalType === 'checkin' ? (
                  <>
                    <p style={{ marginBottom: '15px', color: '#666' }}>
                      Please provide a reason for your late check-in:
                    </p>
                    <textarea
                      value={lateReason}
                      onChange={(e) => setLateReason(e.target.value)}
                      placeholder="Enter reason for late check-in..."
                      className="form-textarea"
                      rows="4"
                      style={{ width: '100%', marginBottom: '20px' }}
                    />
                  </>
                ) : (
                  <p style={{ marginBottom: '20px', color: '#666' }}>
                    Are you sure you want to submit a late check-out?
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowLateModal(false);
                      setLateReason('');
                      setModalType('');
                    }}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLateAction}
                    className="btn btn-warning"
                    disabled={loading || (modalType === 'checkin' && !lateReason.trim())}
                  >
                    {loading ? 'Processing...' : `Submit Late ${modalType === 'checkin' ? 'Check-in' : 'Check-out'}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckInOut;

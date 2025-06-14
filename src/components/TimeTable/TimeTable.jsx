import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, COLLECTIONS } from '../../services/firestore';
import { timetableService } from '../../services/timetableService';
import { Calendar, Plus, X, Lock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const TimeTable = () => {
  const { userProfile } = useAuth();
  const [timeTable, setTimeTable] = useState({});
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [editRestriction, setEditRestriction] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (userProfile) {
      loadTimeTable();
      checkEditPermissions();
      // Perform weekly reset check when component loads
      timetableService.checkAndPerformWeeklyReset();
    }
  }, [userProfile]);

  const checkEditPermissions = async () => {
    try {
      const permission = await timetableService.canEmployeeEditTimetable(userProfile.uid);
      setCanEdit(permission.canEdit);
      setEditRestriction(permission);
    } catch (error) {
      console.error('Error checking edit permissions:', error);
      setCanEdit(false);
    }
  };

  const loadTimeTable = async () => {
    try {
      const timeTables = await firestoreService.getWhere(
        COLLECTIONS.TIME_TABLES,
        'userId',
        '==',
        userProfile.uid
      );

      if (timeTables.length > 0) {
        setTimeTable(timeTables[0].schedule || {});
      } else {
        // Initialize empty timetable
        const emptySchedule = {};
        daysOfWeek.forEach(day => {
          emptySchedule[day] = [];
        });
        setTimeTable(emptySchedule);
      }
    } catch (error) {
      console.error('Error loading timetable:', error);
    }
  };

  const addTimeSlot = (day) => {
    setTimeTable(prev => ({
      ...prev,
      [day]: [
        ...(prev[day] || []),
        { checkIn: '', checkOut: '' }
      ]
    }));
  };

  const removeTimeSlot = (day, index) => {
    setTimeTable(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const updateTimeSlot = (day, index, field, value) => {
    setTimeTable(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '00:00:00';

    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const checkOutTime = new Date(`2000-01-01T${checkOut}`);

    if (checkOutTime <= checkInTime) return '00:00:00';

    const diffMs = checkOutTime - checkInTime;
    const totalSeconds = Math.floor(diffMs / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalDayHours = (day) => {
    const slots = timeTable[day] || [];
    let totalSeconds = 0;

    slots.forEach(slot => {
      if (slot.checkIn && slot.checkOut) {
        const checkInTime = new Date(`2000-01-01T${slot.checkIn}`);
        const checkOutTime = new Date(`2000-01-01T${slot.checkOut}`);

        if (checkOutTime > checkInTime) {
          const diffMs = checkOutTime - checkInTime;
          totalSeconds += Math.floor(diffMs / 1000);
        }
      }
    });

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const saveTimeTable = async () => {
    setLoading(true);
    try {
      // Use the new timetable service with restrictions
      await timetableService.saveEmployeeTimetable(
        userProfile.uid,
        {
          employeeId: userProfile.employeeId,
          name: userProfile.name
        },
        timeTable
      );

      toast.success('Time table saved successfully!');
      setEditMode(false);
      // Refresh permissions after saving
      await checkEditPermissions();
    } catch (error) {
      console.error('Error saving timetable:', error);
      toast.error(error.message || 'Failed to save time table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="flex justify-between align-center mb-20">
        <div>
          <h2 style={{ color: '#333', margin: '0 0 5px 0' }}>Set Your Time Table</h2>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            Current Week: {timetableService.getCurrentWeekId()}
          </p>
        </div>
        <div className="flex gap-10">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={saveTimeTable}
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="btn btn-primary"
              disabled={!canEdit}
              style={{
                opacity: canEdit ? 1 : 0.6,
                cursor: canEdit ? 'pointer' : 'not-allowed'
              }}
            >
              {canEdit ? 'Edit Time Table' : 'Cannot Edit'}
            </button>
          )}
        </div>
      </div>

      {/* Restriction Notice */}
      {!canEdit && editRestriction && (
        <div className="card" style={{
          marginBottom: '20px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderLeft: '4px solid #f39c12'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px' }}>
            <Lock size={24} style={{ color: '#f39c12' }} />
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#856404' }}>Timetable Editing Restricted</h4>
              <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                {editRestriction.message || 'You cannot edit your timetable at this time.'}
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#856404', fontSize: '12px', fontStyle: 'italic' }}>
                You can set a new timetable at the beginning of next week.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Carried Over Schedule Notice */}
      {canEdit && editRestriction && editRestriction.reason === 'CARRIED_OVER_SCHEDULE' && (
        <div className="card" style={{
          marginBottom: '20px',
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderLeft: '4px solid #17a2b8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px' }}>
            <AlertTriangle size={24} style={{ color: '#17a2b8' }} />
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#0c5460' }}>Previous Week Schedule Carried Over</h4>
              <p style={{ margin: 0, color: '#0c5460', fontSize: '14px' }}>
                Your previous week's schedule has been carried over. You can modify it or save as-is.
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#0c5460', fontSize: '12px', fontStyle: 'italic' }}>
                Once you save, you won't be able to modify it again this week.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {daysOfWeek.map(day => (
          <div key={day} style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
            <div className="flex justify-between align-center mb-20">
              <h3 style={{ color: '#333', margin: 0 }}>{day}</h3>
              <div className="flex align-center gap-10">
                <span style={{ color: '#666', fontSize: '14px' }}>
                  Total: {getTotalDayHours(day)}
                </span>
                {editMode && (
                  <button
                    onClick={() => addTimeSlot(day)}
                    className="btn btn-primary"
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                  >
                    <Plus size={14} /> Add Time Slot
                  </button>
                )}
              </div>
            </div>

            {timeTable[day] && timeTable[day].length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {timeTable[day].map((slot, index) => (
                  <div key={index} className="flex align-center gap-10" style={{ padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                    <div className="flex align-center gap-10" style={{ flex: 1 }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666' }}>Check In</label>
                        <input
                          type="time"
                          value={slot.checkIn}
                          onChange={(e) => updateTimeSlot(day, index, 'checkIn', e.target.value)}
                          className="form-input"
                          style={{ width: '120px' }}
                          disabled={!editMode}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666' }}>Check Out</label>
                        <input
                          type="time"
                          value={slot.checkOut}
                          onChange={(e) => updateTimeSlot(day, index, 'checkOut', e.target.value)}
                          className="form-input"
                          style={{ width: '120px' }}
                          disabled={!editMode}
                        />
                      </div>
                      <div style={{ minWidth: '80px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>Duration</div>
                        <div style={{ fontWeight: 'bold', color: '#3498db', fontFamily: 'monospace' }}>
                          {calculateWorkingHours(slot.checkIn, slot.checkOut)}
                        </div>
                      </div>
                    </div>
                    {editMode && (
                      <button
                        onClick={() => removeTimeSlot(day, index)}
                        className="btn btn-danger"
                        style={{ padding: '5px', minWidth: 'auto' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666', background: '#f8f9fa', borderRadius: '4px' }}>
                <Calendar size={24} style={{ opacity: 0.3, marginBottom: '5px' }} />
                <p style={{ fontSize: '14px' }}>No time slots set for {day}</p>
                {editMode && (
                  <button
                    onClick={() => addTimeSlot(day)}
                    className="btn btn-primary"
                    style={{ marginTop: '10px', padding: '5px 15px', fontSize: '12px' }}
                  >
                    <Plus size={14} /> Add Time Slot
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeTable;

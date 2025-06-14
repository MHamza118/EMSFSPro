import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, COLLECTIONS } from '../../services/firestore';
import { timetableService } from '../../services/timetableService';
import {
  Users,
  Calendar,
  Clock,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Edit,
  Save,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminTimeTableManagement = () => {
  const { userProfile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [timeTable, setTimeTable] = useState({});
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Load employees on component mount
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      loadEmployees();
    }
  }, [userProfile]);

  // Load timetable when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeTimeTable();
    } else {
      setTimeTable({});
      setEditMode(false);
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const employeesData = await firestoreService.getAll(COLLECTIONS.USERS);
      const employeeUsers = employeesData.filter(user => user.role === 'employee');
      setEmployees(employeeUsers);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeTimeTable = async () => {
    try {
      setLoading(true);
      const timeTables = await firestoreService.getWhere(
        COLLECTIONS.TIME_TABLES,
        'userId',
        '==',
        selectedEmployee
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
      console.error('Error loading employee timetable:', error);
      toast.error('Failed to load employee timetable');
    } finally {
      setLoading(false);
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

  const getTotalDayHours = (day) => {
    if (!timeTable[day] || timeTable[day].length === 0) return '00:00:00';

    let totalSeconds = 0;
    timeTable[day].forEach(slot => {
      if (slot.checkIn && slot.checkOut) {
        const checkIn = new Date(`2000-01-01T${slot.checkIn}`);
        const checkOut = new Date(`2000-01-01T${slot.checkOut}`);
        if (checkOut > checkIn) {
          const diffMs = checkOut - checkIn;
          totalSeconds += Math.floor(diffMs / 1000);
        }
      }
    });

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalWeekHours = () => {
    let totalSeconds = 0;
    daysOfWeek.forEach(day => {
      if (timeTable[day] && timeTable[day].length > 0) {
        timeTable[day].forEach(slot => {
          if (slot.checkIn && slot.checkOut) {
            const checkIn = new Date(`2000-01-01T${slot.checkIn}`);
            const checkOut = new Date(`2000-01-01T${slot.checkOut}`);
            if (checkOut > checkIn) {
              const diffMs = checkOut - checkIn;
              totalSeconds += Math.floor(diffMs / 1000);
            }
          }
        });
      }
    });

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const saveTimeTable = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first');
      return;
    }

    try {
      setSaving(true);

      const selectedEmployeeData = employees.find(emp => emp.uid === selectedEmployee);

      // Use admin timetable service (no restrictions)
      await timetableService.saveAdminTimetable(
        selectedEmployee,
        {
          employeeId: selectedEmployeeData?.employeeId || 'Unknown',
          name: selectedEmployeeData?.name || 'Unknown'
        },
        timeTable,
        userProfile.uid
      );

      toast.success('Time table saved successfully! Employee has been notified.');
      setEditMode(false);
    } catch (error) {
      console.error('Error saving timetable:', error);
      toast.error('Failed to save time table');
    } finally {
      setSaving(false);
    }
  };

  // Show access denied if not admin
  if (userProfile?.role !== 'admin') {
    return (
      <div className="content">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <AlertTriangle size={48} style={{ color: '#e74c3c', marginBottom: '20px' }} />
          <h3>Access Denied</h3>
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', color: '#333' }}>Employee Time Table Management</h2>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            Current Week: {timetableService.getCurrentWeekId()} | Admin can modify any timetable
          </p>
        </div>
        {selectedEmployee && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  <XCircle size={16} style={{ marginRight: '5px' }} />
                  Cancel
                </button>
                <button
                  onClick={saveTimeTable}
                  className="btn btn-success"
                  disabled={saving}
                >
                  <Save size={16} style={{ marginRight: '5px' }} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="btn btn-primary"
                disabled={loading}
              >
                <Edit size={16} style={{ marginRight: '5px' }} />
                Edit Time Table
              </button>
            )}
          </div>
        )}
      </div>

      {/* Employee Selection */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px', color: '#333' }}>Select Employee</h3>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'end' }}>
          <div style={{ minWidth: '300px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="form-select"
              style={{ width: '100%' }}
              disabled={loading}
            >
              <option value="">Select an employee...</option>
              {employees.map(employee => (
                <option key={employee.uid} value={employee.uid}>
                  {employee.name} ({employee.employeeId})
                </option>
              ))}
            </select>
          </div>
          {selectedEmployee && (
            <div style={{ padding: '10px 15px', backgroundColor: '#e8f5e8', borderRadius: '5px', border: '1px solid #c3e6c3' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Weekly Hours</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#27ae60', fontFamily: 'monospace' }}>
                {getTotalWeekHours()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Show message when no employee is selected */}
      {!selectedEmployee && (
        <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
          <Users size={48} style={{ color: '#3498db', marginBottom: '20px', opacity: 0.5 }} />
          <h3 style={{ color: '#666', marginBottom: '10px' }}>No Employee Selected</h3>
          <p style={{ color: '#999', marginBottom: '0' }}>
            Please select an employee from the dropdown above to view and manage their time table.
          </p>
        </div>
      )}

      {/* Time Table Display */}
      {selectedEmployee && (
        <div className="card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Clock size={48} style={{ color: '#3498db', marginBottom: '20px' }} />
              <h3>Loading Time Table</h3>
              <p>Loading employee time table...</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>
                  Time Table for {employees.find(emp => emp.uid === selectedEmployee)?.name}
                </h3>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  Employee ID: {employees.find(emp => emp.uid === selectedEmployee)?.employeeId}
                </p>
              </div>

              {daysOfWeek.map(day => (
                <div key={day} style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ color: '#333', margin: 0 }}>{day}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ color: '#666', fontSize: '14px', fontFamily: 'monospace' }}>
                        Total: {getTotalDayHours(day)}
                      </span>
                      {editMode && (
                        <button
                          onClick={() => addTimeSlot(day)}
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          <Plus size={14} style={{ marginRight: '3px' }} />
                          Add Slot
                        </button>
                      )}
                    </div>
                  </div>

                  {timeTable[day] && timeTable[day].length > 0 ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {timeTable[day].map((slot, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px',
                          padding: '15px',
                          backgroundColor: editMode ? '#fff3cd' : '#f8f9fa',
                          borderRadius: '6px',
                          border: editMode ? '1px solid #ffeaa7' : '1px solid #e9ecef'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                            <div>
                              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>
                                Check In
                              </label>
                              <input
                                type="time"
                                value={slot.checkIn}
                                onChange={(e) => updateTimeSlot(day, index, 'checkIn', e.target.value)}
                                className="form-input"
                                style={{ width: '130px' }}
                                disabled={!editMode}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '3px' }}>
                                Check Out
                              </label>
                              <input
                                type="time"
                                value={slot.checkOut}
                                onChange={(e) => updateTimeSlot(day, index, 'checkOut', e.target.value)}
                                className="form-input"
                                style={{ width: '130px' }}
                                disabled={!editMode}
                              />
                            </div>
                            {slot.checkIn && slot.checkOut && (
                              <div style={{ padding: '8px 12px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
                                <div style={{ fontSize: '11px', color: '#666' }}>Duration</div>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#27ae60', fontFamily: 'monospace' }}>
                                  {(() => {
                                    const checkIn = new Date(`2000-01-01T${slot.checkIn}`);
                                    const checkOut = new Date(`2000-01-01T${slot.checkOut}`);
                                    if (checkOut > checkIn) {
                                      const diffMs = checkOut - checkIn;
                                      const totalSeconds = Math.floor(diffMs / 1000);
                                      const hours = Math.floor(totalSeconds / 3600);
                                      const minutes = Math.floor((totalSeconds % 3600) / 60);
                                      const seconds = totalSeconds % 60;
                                      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                    }
                                    return '00:00:00';
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                          {editMode && (
                            <button
                              onClick={() => removeTimeSlot(day, index)}
                              className="btn btn-danger"
                              style={{ padding: '8px', minWidth: 'auto' }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '30px',
                      color: '#666',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      border: '2px dashed #dee2e6'
                    }}>
                      <Calendar size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                      <p style={{ fontSize: '14px', margin: '0 0 10px 0' }}>No time slots set for {day}</p>
                      {editMode && (
                        <button
                          onClick={() => addTimeSlot(day)}
                          className="btn btn-primary"
                          style={{ padding: '8px 15px', fontSize: '12px' }}
                        >
                          <Plus size={14} style={{ marginRight: '5px' }} />
                          Add First Time Slot
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTimeTableManagement;

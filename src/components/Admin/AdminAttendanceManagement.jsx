import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, COLLECTIONS } from '../../services/firestore';
import { WorkingHoursCalculator } from '../../services/workingHoursCalculator';
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';

const AdminAttendanceManagement = () => {
  const { user, userProfile } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [summaryData, setSummaryData] = useState({ daily: {} });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState({ reason: '', type: '', time: '', employee: '' });

  // Load employees on component mount
  useEffect(() => {
    loadEmployees();
  }, []);

  // Load attendance data when filters change
  useEffect(() => {
    if (employees.length > 0) {
      loadAttendanceData();
    }
  }, [selectedEmployee, dateRange, customStartDate, customEndDate, employees]);

  const loadEmployees = async () => {
    try {
      const employeesData = await firestoreService.getAll(COLLECTIONS.USERS);
      const employeeUsers = employeesData.filter(user => user.role === 'employee');
      setEmployees(employeeUsers);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const getDateRange = () => {
    const now = new Date();

    switch (dateRange) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'custom':
        return {
          start: customStartDate ? startOfDay(new Date(customStartDate)) : startOfDay(now),
          end: customEndDate ? endOfDay(new Date(customEndDate)) : endOfDay(now)
        };
      default:
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      console.log('Loading attendance data with filters:', {
        selectedEmployee,
        dateRange,
        start: start.toISOString(),
        end: end.toISOString()
      });

      let attendanceRecords = [];

      if (selectedEmployee === 'all') {
        attendanceRecords = await firestoreService.getAll(COLLECTIONS.ATTENDANCE);
      } else {
        attendanceRecords = await firestoreService.getWhere(
          COLLECTIONS.ATTENDANCE,
          'userId',
          '==',
          selectedEmployee
        );
      }

      console.log('Raw attendance records from Firebase:', attendanceRecords.length);

      // Filter by date range with better date handling
      const filteredRecords = attendanceRecords.filter(record => {
        if (!record.date) return false;

        // Handle different date formats
        let recordDate;
        if (typeof record.date === 'string') {
          // If it's a string like "2025-06-02"
          recordDate = new Date(record.date + 'T00:00:00');
        } else if (record.date.toDate) {
          // If it's a Firestore timestamp
          recordDate = record.date.toDate();
        } else {
          // If it's already a Date object
          recordDate = new Date(record.date);
        }

        // Compare dates (start of day to end of day)
        const recordDateStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
        const startDateStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDateEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);

        return recordDateStart >= startDateStart && recordDateStart <= endDateEnd;
      });

      console.log('Filtered attendance records:', filteredRecords.length);

      setAttendanceData(filteredRecords);
      processSummaryData(filteredRecords);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast.error('Failed to load attendance data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const processSummaryData = (records) => {
    try {
      const dailyData = {};

      records.forEach(record => {
        // Validate record has required fields
        if (!record || typeof record !== 'object' || !record.userId || !record.date) {
          console.warn('Invalid record found:', record);
          return;
        }

        // Ensure record has proper structure
        if (!record.type || (record.type !== 'checkin' && record.type !== 'checkout')) {
          console.warn('Record missing type or invalid type:', record);
          return;
        }

        const key = `${record.userId}_${record.date}`;

        if (!dailyData[key]) {
          const employee = employees.find(emp => emp.uid === record.userId);
          dailyData[key] = {
            userId: record.userId,
            date: record.date,
            employeeName: employee?.name || 'Unknown Employee',
            employee: employee || { employeeId: 'Unknown', name: 'Unknown Employee' },
            records: []
          };
        }

        dailyData[key].records.push(record);
      });

      // Calculate working hours for each day
      Object.values(dailyData).forEach(dayData => {
        try {
          dayData.workingHours = WorkingHoursCalculator.calculateDayWorkingHours(dayData.records);
        } catch (error) {
          console.error('Error calculating working hours for day:', dayData.date, error);
          dayData.workingHours = {
            regularHours: { hours: 0, minutes: 0, totalMinutes: 0, display: '0h 0m' },
            lateHours: { hours: 0, minutes: 0, totalMinutes: 0, display: '0h 0m' },
            totalHours: { hours: 0, minutes: 0, totalMinutes: 0, display: '0h 0m' },
            status: 'ERROR'
          };
        }
      });

      setSummaryData({ daily: dailyData });
    } catch (error) {
      console.error('Error processing summary data:', error);
      setSummaryData({ daily: {} });
    }
  };

  const toggleRowExpansion = (rowId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(rowId)) {
      newExpandedRows.delete(rowId);
    } else {
      newExpandedRows.add(rowId);
    }
    setExpandedRows(newExpandedRows);
  };

  const getStatusIcon = (record) => {
    if (record.lateReason) {
      return <AlertTriangle size={16} style={{ color: '#f39c12' }} />;
    }
    return <CheckCircle size={16} style={{ color: '#27ae60' }} />;
  };

  const showLateReasonModal = (record, type, employeeName) => {
    if (record && record.lateReason) {
      setSelectedReason({
        reason: record.lateReason,
        type: type === 'checkin' ? 'Check-in' : 'Check-out',
        time: type === 'checkin' ? record.checkInTime : record.checkOutTime,
        employee: employeeName
      });
      setShowReasonModal(true);
    }
  };

  // Component to render multiple records with dropdown
  const MultipleRecordsDisplay = ({ records, type, color, isLate = false, employeeName = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const dropdownRef = React.useRef(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }
    }, [isOpen]);

    // Calculate dropdown position when opening
    const handleToggleDropdown = () => {
      if (!isOpen && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX
        });
      }
      setIsOpen(!isOpen);
    };

    if (records.length === 0) {
      return <span style={{ color: '#666', fontStyle: 'italic' }}>No {isLate ? 'late' : 'regular'} records</span>;
    }

    if (records.length === 1) {
      const record = records[0];
      const time = type === 'checkin' ? record.checkInTime : record.checkOutTime;
      if (!time) {
        return <span style={{ color: '#666', fontStyle: 'italic' }}>No time recorded</span>;
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {getStatusIcon(record)}
            <span style={{ color }}>
              {type === 'checkin' ? 'In' : 'Out'}: {time}
            </span>
            {isLate && <span style={{ color: '#f39c12', fontSize: '10px' }}>(Late)</span>}
          </div>
          {record.lateReason && (
            <div
              style={{
                color: '#f39c12',
                fontSize: '10px',
                fontStyle: 'italic',
                marginLeft: '21px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '2px 0'
              }}
              onClick={() => showLateReasonModal(record, type, employeeName)}
              title="Click to view full reason"
            >
              Reason: {record.lateReason.length > 30 ? record.lateReason.substring(0, 30) + '...' : record.lateReason}
            </div>
          )}
        </div>
      );
    }

    // Multiple records - show dropdown
    const latestRecord = records[0]; // Assuming records are sorted by time
    const latestTime = type === 'checkin' ? latestRecord.checkInTime : latestRecord.checkOutTime;

    if (!latestTime) {
      return <span style={{ color: '#666', fontStyle: 'italic' }}>No time recorded</span>;
    }

    return (
      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '2px',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: '4px',
            backgroundColor: isOpen ? '#e9ecef' : 'transparent',
            border: isOpen ? '1px solid #ddd' : '1px solid transparent',
            transition: 'all 0.2s ease'
          }}
          onClick={handleToggleDropdown}
        >
          {getStatusIcon(latestRecord)}
          <span style={{ color }}>
            {type === 'checkin' ? 'In' : 'Out'}: {latestTime}
          </span>
          {isLate && <span style={{ color: '#f39c12', fontSize: '10px' }}>(Late)</span>}
          <span style={{ color: '#666', fontSize: '10px', marginLeft: '5px' }}>
            (+{records.length - 1} more)
          </span>
          <ChevronDown size={12} style={{ color: '#666' }} />
        </div>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.1)',
                zIndex: 99998
              }}
              onClick={() => setIsOpen(false)}
            />
            {/* Dropdown */}
            <div style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              zIndex: 99999,
              maxHeight: '350px',
              overflowY: 'auto',
              minWidth: '320px',
              maxWidth: '450px',
              whiteSpace: 'nowrap'
            }}>
              {records.map((record, index) => {
                const time = type === 'checkin' ? record.checkInTime : record.checkOutTime;
                if (!time) return null; // Skip records without time
                return (
                  <div
                    key={index}
                    style={{
                      padding: '10px 15px',
                      borderBottom: index < records.length - 1 ? '1px solid #eee' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: index === 0 ? '#f8f9fa' : 'white',
                      cursor: 'default'
                    }}
                  >
                    {getStatusIcon(record)}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <span style={{ color, fontSize: '13px', fontWeight: '500' }}>
                        {type === 'checkin' ? 'Check In' : 'Check Out'}: {time}
                      </span>
                      {record.lateReason && (
                        <span
                          style={{
                            color: '#f39c12',
                            fontSize: '11px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                          onClick={() => showLateReasonModal(record, type, employeeName)}
                          title="Click to view full reason"
                        >
                          Late: {record.lateReason.length > 40 ? record.lateReason.substring(0, 40) + '...' : record.lateReason}
                        </span>
                      )}
                      {record.scheduledCheckIn && type === 'checkin' && (
                        <span style={{ color: '#666', fontSize: '10px' }}>
                          Scheduled: {record.scheduledCheckIn}
                        </span>
                      )}
                      {record.scheduledCheckOut && type === 'checkout' && (
                        <span style={{ color: '#666', fontSize: '10px' }}>
                          Scheduled: {record.scheduledCheckOut}
                        </span>
                      )}
                    </div>
                    {index === 0 && (
                      <span style={{
                        color: '#666',
                        fontSize: '10px',
                        backgroundColor: '#e9ecef',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                      }}>
                        Latest
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const exportToCSV = () => {
    if (attendanceData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvData = attendanceData.map(record => {
      const employee = employees.find(emp => emp.uid === record.userId);
      return {
        'Employee Name': employee?.name || 'Unknown',
        'Employee ID': employee?.employeeId || 'Unknown',
        'Date': record.date,
        'Day': format(parseISO(record.date), 'EEEE'),
        'Type': record.type,
        'Time': record.type === 'checkin' ? record.checkInTime : record.checkOutTime,
        'Scheduled Time': record.type === 'checkin' ? record.scheduledCheckIn : record.scheduledCheckOut,
        'Late Reason': record.lateReason || '',
        'Status': record.lateReason ? 'Late' : 'On Time'
      };
    });

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Attendance report exported successfully!');
  };

  // Show loading state
  if (loading && employees.length === 0) {
    return (
      <div className="content">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Clock size={48} style={{ color: '#3498db', marginBottom: '20px' }} />
          <h3>Loading Attendance Management</h3>
          <p>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  // If user is not admin, show access denied
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
        <h2 style={{ margin: 0, color: '#333' }}>Attendance Management</h2>
        <button
          onClick={exportToCSV}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          disabled={attendanceData.length === 0}
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {/* Show message if no employees found */}
      {employees.length === 0 && (
        <div className="card" style={{ marginBottom: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
          <div style={{ padding: '15px', textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: '#f39c12', marginBottom: '10px' }} />
            <h4 style={{ color: '#856404', margin: '0 0 10px 0' }}>No Employees Found</h4>
            <p style={{ color: '#856404', margin: 0 }}>
              No employees are registered in the system. Please add employees first to view attendance records.
            </p>
          </div>
        </div>
      )}

      {/* Professional Filters Section */}
      {employees.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', color: '#333', fontSize: '18px' }}>
            <Filter size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Filter Attendance Records
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            alignItems: 'end'
          }}>
            <div>
              <label className="form-label">
                <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="form-select"
              >
                <option value="all">All Employees</option>
                {employees.map(employee => (
                  <option key={employee.uid} value={employee.uid}>
                    {employee.name} ({employee.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                <Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="form-select"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </>
            )}

            <button
              onClick={loadAttendanceData}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifySelf: 'start'
              }}
              disabled={loading}
            >
              <Filter size={18} />
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      )}

      {/* Professional Attendance Records Table */}
      <div className="card">
        <h3 style={{ marginBottom: '20px', color: '#333', fontSize: '18px' }}>
          <Clock size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Attendance Records ({Object.keys(summaryData.daily).length})
        </h3>

        {attendanceData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Clock size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No attendance records found for the selected criteria</p>
            {employees.length === 0 && (
              <p style={{ fontSize: '14px', marginTop: '10px' }}>
                No employees found. Please ensure employees are registered in the system.
              </p>
            )}
          </div>
        ) : Object.keys(summaryData.daily).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Clock size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>Processing attendance data...</p>
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
            <table className="table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '700px' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px', minWidth: '120px' }}>Employee</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>Date</th>
                  <th style={{ width: '80px', minWidth: '80px' }}>Day</th>
                  <th style={{ width: '120px', minWidth: '120px' }}>Regular Check In/Out</th>
                  <th style={{ width: '120px', minWidth: '120px' }}>Late Check In/Out</th>
                  <th style={{ width: '160px', minWidth: '160px' }}>Working Hours</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(summaryData.daily).map((dayData) => {
                  const rowId = `${dayData.userId}_${dayData.date}`;
                  const checkIns = dayData.records.filter(r => r.type === 'checkin');
                  const checkOuts = dayData.records.filter(r => r.type === 'checkout');
                  const regularCheckIns = checkIns.filter(r => !r.isLate && !r.lateReason);
                  const regularCheckOuts = checkOuts.filter(r => !r.isLate && !r.lateReason);
                  const lateCheckIns = checkIns.filter(r => r.isLate || r.lateReason);
                  const lateCheckOuts = checkOuts.filter(r => r.isLate || r.lateReason);

                  return (
                    <tr key={rowId} style={{ backgroundColor: 'white' }}>
                      <td style={{
                        padding: '12px 8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={14} style={{ color: '#3498db', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontWeight: 'bold',
                              fontSize: '13px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {dayData.employeeName}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: '#666',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              ID: {dayData.employee?.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{
                        padding: '12px 8px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                          {format(parseISO(dayData.date), 'MMM dd')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {format(parseISO(dayData.date), 'yyyy')}
                        </div>
                      </td>
                      <td style={{
                        padding: '12px 8px',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {format(parseISO(dayData.date), 'EEE')}
                      </td>
                      {/* Regular Check In/Out Column */}
                      <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                        {regularCheckIns.length === 0 && regularCheckOuts.length === 0 ? (
                          <span style={{ color: '#999', fontSize: '11px', fontStyle: 'italic' }}>
                            No regular records
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {regularCheckIns.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                <CheckCircle size={12} style={{ color: '#27ae60' }} />
                                <span style={{ fontSize: '11px', color: '#27ae60', fontWeight: 'bold' }}>
                                  In: {regularCheckIns.length}
                                </span>
                              </div>
                            )}
                            {regularCheckOuts.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                <XCircle size={12} style={{ color: '#2980b9' }} />
                                <span style={{ fontSize: '11px', color: '#2980b9', fontWeight: 'bold' }}>
                                  Out: {regularCheckOuts.length}
                                </span>
                              </div>
                            )}
                            {(regularCheckIns.length > 0 || regularCheckOuts.length > 0) && (
                              <button
                                onClick={() => {
                                  setSelectedReason({
                                    reason: `Regular Check-ins: ${regularCheckIns.length}, Check-outs: ${regularCheckOuts.length}`,
                                    type: 'Regular Records',
                                    time: dayData.date,
                                    employee: dayData.employeeName,
                                    records: [...regularCheckIns, ...regularCheckOuts]
                                  });
                                  setShowReasonModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '9px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  margin: '0 auto',
                                  minWidth: '50px'
                                }}
                                title="View regular check-in/out details"
                              >
                                <Clock size={10} />
                                Details
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      {/* Late Check In/Out Column */}
                      <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                        {lateCheckIns.length === 0 && lateCheckOuts.length === 0 ? (
                          <span style={{ color: '#999', fontSize: '11px', fontStyle: 'italic' }}>
                            No late records
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {lateCheckIns.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                <AlertTriangle size={12} style={{ color: '#f39c12' }} />
                                <span style={{ fontSize: '11px', color: '#f39c12', fontWeight: 'bold' }}>
                                  Late In: {lateCheckIns.length}
                                </span>
                              </div>
                            )}
                            {lateCheckOuts.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                <AlertTriangle size={12} style={{ color: '#e74c3c' }} />
                                <span style={{ fontSize: '11px', color: '#e74c3c', fontWeight: 'bold' }}>
                                  Late Out: {lateCheckOuts.length}
                                </span>
                              </div>
                            )}
                            {(lateCheckIns.length > 0 || lateCheckOuts.length > 0) && (
                              <button
                                onClick={() => {
                                  setSelectedReason({
                                    reason: `Late Check-ins: ${lateCheckIns.length}, Late Check-outs: ${lateCheckOuts.length}`,
                                    type: 'Late Records',
                                    time: dayData.date,
                                    employee: dayData.employeeName,
                                    records: [...lateCheckIns, ...lateCheckOuts]
                                  });
                                  setShowReasonModal(true);
                                }}
                                className="btn btn-warning"
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '9px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  margin: '0 auto',
                                  minWidth: '50px'
                                }}
                                title="View late check-in/out details and reasons"
                              >
                                <AlertTriangle size={10} />
                                Details
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontSize: '11px', textAlign: 'center' }}>
                          {dayData.workingHours.regularHours.totalMinutes > 0 && (
                            <div style={{
                              color: '#27ae60',
                              marginBottom: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}>
                              <CheckCircle size={10} />
                              <span style={{ fontSize: '10px' }}>
                                R: {dayData.workingHours.regularHours.display}
                              </span>
                            </div>
                          )}
                          {dayData.workingHours.lateHours.totalMinutes > 0 && (
                            <div style={{
                              color: '#f39c12',
                              marginBottom: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}>
                              <AlertTriangle size={10} />
                              <span style={{ fontSize: '10px' }}>
                                L: {dayData.workingHours.lateHours.display}
                              </span>
                            </div>
                          )}
                          <div style={{
                            fontWeight: 'bold',
                            borderTop: '1px solid #eee',
                            paddingTop: '4px',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={12} style={{ color: '#333' }} />
                            <span style={{ fontSize: '11px' }}>
                              {dayData.workingHours.totalHours.display}
                            </span>
                          </div>
                          {dayData.workingHours.status === 'INCOMPLETE' && (
                            <div style={{
                              color: '#e74c3c',
                              fontSize: '9px',
                              marginTop: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px'
                            }}>
                              <XCircle size={8} />
                              Incomplete
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Professional Attendance Details Modal */}
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
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '95%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, color: '#333', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={24} style={{ color: '#3498db' }} />
                {selectedReason.type} Details
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
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div>
                  <strong style={{ color: '#666', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={16} />
                    Employee:
                  </strong>
                  <div style={{ color: '#333', fontSize: '16px', fontWeight: 'bold' }}>{selectedReason.employee}</div>
                </div>
                <div>
                  <strong style={{ color: '#666', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} />
                    Date:
                  </strong>
                  <div style={{ color: '#333', fontSize: '16px', fontWeight: 'bold' }}>{selectedReason.time}</div>
                </div>
              </div>
            </div>

            {selectedReason.records && selectedReason.records.length > 0 ? (
              <div style={{ marginBottom: '25px' }}>
                <strong style={{ color: '#666', fontSize: '16px', display: 'block', marginBottom: '15px' }}>
                  Detailed Records:
                </strong>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {selectedReason.records.map((record, index) => (
                    <div key={index} style={{
                      padding: '15px',
                      borderBottom: index < selectedReason.records.length - 1 ? '1px solid #e9ecef' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {record.type === 'checkin' ? (
                          <CheckCircle size={16} style={{ color: record.isLate ? '#f39c12' : '#27ae60' }} />
                        ) : (
                          <XCircle size={16} style={{ color: record.isLate ? '#e74c3c' : '#2980b9' }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            {record.type === 'checkin' ? 'Check In' : 'Check Out'}
                            {record.isLate && <span style={{ color: '#f39c12', marginLeft: '8px' }}>(Late)</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Time: {record.type === 'checkin' ? record.checkInTime : record.checkOutTime}
                          </div>
                        </div>
                      </div>
                      {record.lateReason && (
                        <div style={{
                          backgroundColor: '#fff3cd',
                          border: '1px solid #ffeaa7',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          color: '#856404',
                          maxWidth: '300px'
                        }}>
                          <strong>Reason:</strong> {record.lateReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '25px' }}>
                <strong style={{ color: '#666', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Summary:
                </strong>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px',
                  padding: '15px',
                  color: '#333',
                  fontSize: '15px',
                  lineHeight: '1.5'
                }}>
                  {selectedReason.reason}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setShowReasonModal(false)}
                className="btn btn-primary"
                style={{
                  padding: '12px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 0 0 auto'
                }}
              >
                <CheckCircle size={16} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceManagement;

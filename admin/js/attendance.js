// Import Firebase functions
import { isLoggedIn, getUserRole, getAllEmployees, logoutUser } from '../../js/firebase-service.js';
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { calculateWorkingHours } from '../../js/working-hours.js';

// Get database reference
const database = getDatabase();

// Global variables
let employeesData = [];

// Check authentication
document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is logged in and is admin
    if (!isLoggedIn() || getUserRole() !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    console.log("Admin attendance page loaded");

    // Load initial data
    await loadEmployees();
    loadAttendanceRecords();
    loadLateCheckins();

    // Set up event listeners
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Handle filter application
    document.getElementById('applyFilters').addEventListener('click', function () {
        const date = document.getElementById('dateFilter').value;
        const employee = document.getElementById('employeeFilter').value;
        const status = document.getElementById('statusFilter').value;

        // Reload data with filters
        loadAttendanceRecords(date, employee, status);
    });

    // Handle export button click
    document.getElementById('exportAttendance').addEventListener('click', function () {
        exportAttendanceRecords();
    });

    // Handle logout
    document.getElementById('logout').addEventListener('click', async function () {
        try {
            await logoutUser();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            alert('Failed to log out. Please try again.');
        }
    });
}

// Load employees for filter dropdown
async function loadEmployees() {
    try {
        // Get all employees
        const result = await getAllEmployees();

        if (!result.success) {
            console.error('Error loading employees:', result.error);
            return;
        }

        employeesData = result.employees;

        // Populate employee filter dropdown
        const select = document.getElementById('employeeFilter');
        select.innerHTML = '<option value="">All Employees</option>';

        employeesData.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Load attendance records
async function loadAttendanceRecords(date = '', employee = '', status = '') {
    try {
        // Show loading indicator
        const tableBody = document.getElementById('attendanceTable');
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading attendance records...</td></tr>';

        // Get attendance records from Firebase
        const attendanceRef = ref(database, 'attendance');
        const snapshot = await get(attendanceRef);

        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No attendance records found</td></tr>';
            return;
        }

        const attendanceData = snapshot.val();
        const records = [];

        // Process attendance data
        Object.keys(attendanceData).forEach(userId => {
            const userAttendance = attendanceData[userId];

            // Find employee name
            console.log(`Looking for employee with ID: ${userId}`);
            console.log(`Available employees:`, employeesData);

            // Try to match by id, uid, employeeId, or email
            const employee = employeesData.find(emp => {
                // Check direct matches
                if (emp.id === userId || emp.uid === userId || (emp.employeeId && emp.employeeId === userId)) {
                    return true;
                }

                // Check email and email prefix
                if (emp.email) {
                    const emailPrefix = emp.email.split('@')[0];
                    if (emailPrefix === userId || emp.email === userId) {
                        return true;
                    }
                }

                return false;
            });

            const employeeName = employee ? employee.name : 'Unknown Employee';
            console.log(`Found employee: ${employeeName}`);

            // Process each date
            Object.keys(userAttendance).forEach(dateKey => {
                console.log(`Processing date: ${dateKey}`);

                // Apply date filter if provided
                if (date && dateKey !== date) {
                    console.log(`Skipping date ${dateKey} due to filter ${date}`);
                    return;
                }

                const dayData = userAttendance[dateKey];

                // Skip if no check-ins
                if (!dayData.checkIns || !Array.isArray(dayData.checkIns) || dayData.checkIns.length === 0) {
                    console.log(`No valid check-ins for date ${dateKey}`);
                    return;
                }

                console.log(`Processing ${dayData.checkIns.length} check-ins for date ${dateKey}`);

                // Process check-ins to ensure standardized time formats
                const processedCheckIns = dayData.checkIns.map(checkIn => {
                    // Import standardizeTimeFormat function from checkin-service.js
                    // Since we can't directly import it here, we'll implement a simplified version
                    const processedCheckIn = { ...checkIn };

                    // Add standardized time formats if they don't exist
                    if (!processedCheckIn.time24h && processedCheckIn.time) {
                        try {
                            // Convert to 24-hour format if it's in 12-hour format
                            if (processedCheckIn.time.includes('AM') || processedCheckIn.time.includes('PM')) {
                                const [timePart, meridiem] = processedCheckIn.time.split(' ');
                                let [hours, minutes] = timePart.split(':').map(num => parseInt(num, 10));

                                if (meridiem.toUpperCase() === 'PM' && hours < 12) {
                                    hours += 12;
                                } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
                                    hours = 0;
                                }

                                processedCheckIn.time24h = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            } else {
                                processedCheckIn.time24h = processedCheckIn.time;
                            }
                        } catch (error) {
                            console.error(`Error standardizing time format for ${processedCheckIn.time}:`, error);
                            processedCheckIn.time24h = processedCheckIn.time;
                        }
                    }

                    return processedCheckIn;
                });

                // Count late check-ins
                const lateCheckIns = processedCheckIns.filter(checkIn => checkIn.isLate).length;
                console.log(`Found ${lateCheckIns} late check-ins`);

                // Get first check-in and last check-out
                const firstCheckIn = processedCheckIns[0];
                console.log(`First check-in:`, firstCheckIn);

                // Find the last check-out (if any)
                let lastCheckOut = null;
                for (let i = processedCheckIns.length - 1; i >= 0; i--) {
                    if (processedCheckIns[i].isCheckOut) {
                        lastCheckOut = processedCheckIns[i];
                        break;
                    }
                }
                console.log(`Last check-out:`, lastCheckOut);

                // Determine status
                let status = 'Present';
                if (lateCheckIns > 0) {
                    status = 'Late';
                }

                // Calculate working hours
                const workingHoursResult = calculateWorkingHours(processedCheckIns);
                console.log(`Working hours calculation for ${dateKey}:`, workingHoursResult);

                // Create record
                records.push({
                    userId: userId,
                    date: dateKey,
                    employee: employeeName,
                    checkIn: firstCheckIn.time,
                    checkIn24h: firstCheckIn.time24h || firstCheckIn.time,
                    checkOut: lastCheckOut ? lastCheckOut.checkOutTime : '-',
                    checkOut24h: lastCheckOut && lastCheckOut.checkOutTime24h ? lastCheckOut.checkOutTime24h : '-',
                    workingHours: workingHoursResult.display,
                    status: status,
                    lateCheckins: lateCheckIns,
                    details: processedCheckIns
                });
            });
        });

        // Sort records by date (newest first)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Clear container
        tableBody.innerHTML = '';

        if (records.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No attendance records found</td></tr>';
            return;
        }

        // Display records
        records.forEach(record => {
            const row = document.createElement('tr');
            // Determine working hours display class
            let workingHoursClass = 'working-hours';
            if (record.workingHours === 'Error' || record.workingHours === 'Incomplete') {
                workingHoursClass += record.workingHours === 'Error' ? ' working-hours-error' : ' working-hours-incomplete';
            }

            row.innerHTML = `
                <td>${record.date}</td>
                <td>${record.employee}</td>
                <td>${record.checkIn24h || record.checkIn}</td>
                <td>${record.checkOut24h || record.checkOut}</td>
                <td><span class="${workingHoursClass}">${record.workingHours}</span></td>
                <td>
                    <span class="status-badge status-${record.status.toLowerCase()}">
                        ${record.status}
                    </span>
                </td>
                <td>${record.lateCheckins}</td>
                <td>
                    <button class="btn btn-sm btn-primary view-details" data-userid="${record.userId}" data-date="${record.date}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-warning edit-record" data-userid="${record.userId}" data-date="${record.date}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-userid');
                const date = this.getAttribute('data-date');
                viewDetails(userId, date);
            });
        });

        document.querySelectorAll('.edit-record').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-userid');
                const date = this.getAttribute('data-date');
                editRecord(userId, date);
            });
        });
    } catch (error) {
        console.error('Error loading attendance records:', error);
        const tableBody = document.getElementById('attendanceTable');
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading attendance records: ${error.message}</td></tr>`;
    }
}

// Load late check-ins
async function loadLateCheckins() {
    try {
        // Show loading indicator
        const tableBody = document.getElementById('lateCheckinsTable');
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading late check-ins...</td></tr>';

        // Get attendance records from Firebase
        const attendanceRef = ref(database, 'attendance');
        const snapshot = await get(attendanceRef);

        if (!snapshot.exists()) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No late check-ins found</td></tr>';
            return;
        }

        const attendanceData = snapshot.val();
        const lateCheckIns = [];

        // Process attendance data to find late check-ins
        Object.keys(attendanceData).forEach(userId => {
            const userAttendance = attendanceData[userId];

            // Find employee name
            console.log(`Looking for employee with ID: ${userId}`);

            // Try to match by id, uid, employeeId, or email
            const employee = employeesData.find(emp => {
                // Check direct matches
                if (emp.id === userId || emp.uid === userId || (emp.employeeId && emp.employeeId === userId)) {
                    return true;
                }

                // Check email and email prefix
                if (emp.email) {
                    const emailPrefix = emp.email.split('@')[0];
                    if (emailPrefix === userId || emp.email === userId) {
                        return true;
                    }
                }

                return false;
            });

            const employeeName = employee ? employee.name : 'Unknown Employee';
            console.log(`Found employee: ${employeeName}`);

            // Process each date
            Object.keys(userAttendance).forEach(date => {
                const dayData = userAttendance[date];

                // Skip if no check-ins
                if (!dayData.checkIns || dayData.checkIns.length === 0) {
                    return;
                }

                // Find late check-ins
                dayData.checkIns.forEach(checkIn => {
                    if (checkIn.isLate) {
                        // Standardize time format if needed
                        let checkInTime24h = checkIn.time24h;
                        if (!checkInTime24h && checkIn.time) {
                            try {
                                // Convert to 24-hour format if it's in 12-hour format
                                if (checkIn.time.includes('AM') || checkIn.time.includes('PM')) {
                                    const [timePart, meridiem] = checkIn.time.split(' ');
                                    let [hours, minutes] = timePart.split(':').map(num => parseInt(num, 10));

                                    if (meridiem.toUpperCase() === 'PM' && hours < 12) {
                                        hours += 12;
                                    } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
                                        hours = 0;
                                    }

                                    checkInTime24h = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                                } else {
                                    checkInTime24h = checkIn.time;
                                }
                            } catch (error) {
                                console.error(`Error standardizing time format for ${checkIn.time}:`, error);
                                checkInTime24h = checkIn.time;
                            }
                        }

                        lateCheckIns.push({
                            userId: userId,
                            date: date,
                            employee: employeeName,
                            checkInTime: checkIn.time,
                            checkInTime24h: checkInTime24h || checkIn.time,
                            reason: checkIn.reason || 'No reason provided',
                            approved: checkIn.approved
                        });
                    }
                });
            });
        });

        // Sort late check-ins by date (newest first)
        lateCheckIns.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Clear container
        tableBody.innerHTML = '';

        if (lateCheckIns.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No late check-ins found</td></tr>';
            return;
        }

        // Display late check-ins
        lateCheckIns.forEach(checkin => {
            const row = document.createElement('tr');

            // Determine if already approved/rejected
            let actionButtons = '';
            if (checkin.approved === true) {
                actionButtons = `<span class="status-badge status-approved">Approved</span>`;
            } else if (checkin.approved === false) {
                actionButtons = `<span class="status-badge status-rejected">Rejected</span>`;
            } else {
                actionButtons = `
                    <button class="btn btn-sm btn-primary approve-late" data-userid="${checkin.userId}" data-date="${checkin.date}" data-time="${checkin.checkInTime}">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-sm btn-danger reject-late" data-userid="${checkin.userId}" data-date="${checkin.date}" data-time="${checkin.checkInTime}">
                        <i class="fas fa-times"></i> Reject
                    </button>
                `;
            }

            row.innerHTML = `
                <td>${checkin.date}</td>
                <td>${checkin.employee}</td>
                <td>${checkin.checkInTime24h || checkin.checkInTime}</td>
                <td>${checkin.reason}</td>
                <td>${actionButtons}</td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.approve-late').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-userid');
                const date = this.getAttribute('data-date');
                const time = this.getAttribute('data-time');
                approveLateCheckin(userId, date, time);
            });
        });

        document.querySelectorAll('.reject-late').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-userid');
                const date = this.getAttribute('data-date');
                const time = this.getAttribute('data-time');
                rejectLateCheckin(userId, date, time);
            });
        });
    } catch (error) {
        console.error('Error loading late check-ins:', error);
        const tableBody = document.getElementById('lateCheckinsTable');
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading late check-ins: ${error.message}</td></tr>`;
    }
}

// View attendance details
function viewDetails(userId, date) {
    // For now, we'll just show an alert. Later this should open a modal with details
    alert(`Viewing details for user ${userId} on ${date}`);
}

// Edit attendance record
function editRecord(userId, date) {
    // For now, we'll just show an alert. Later this should open an edit modal
    alert(`Editing record for user ${userId} on ${date}`);
}

// Approve late check-in
async function approveLateCheckin(userId, date, time) {
    if (confirm(`Approve late check-in for this employee on ${date}?`)) {
        try {
            // Get the attendance record
            const attendanceRef = ref(database, `attendance/${userId}/${date}`);
            const snapshot = await get(attendanceRef);

            if (!snapshot.exists()) {
                alert('Attendance record not found');
                return;
            }

            const attendanceData = snapshot.val();

            // Find the late check-in
            let found = false;
            for (let i = 0; i < attendanceData.checkIns.length; i++) {
                if (attendanceData.checkIns[i].isLate && attendanceData.checkIns[i].time === time) {
                    // Update the check-in
                    attendanceData.checkIns[i].approved = true;
                    found = true;
                    break;
                }
            }

            if (!found) {
                alert('Late check-in not found');
                return;
            }

            // Update the record
            await update(attendanceRef, attendanceData);

            alert('Late check-in approved successfully');

            // Reload late check-ins
            loadLateCheckins();
        } catch (error) {
            console.error('Error approving late check-in:', error);
            alert(`Error approving late check-in: ${error.message}`);
        }
    }
}

// Reject late check-in
async function rejectLateCheckin(userId, date, time) {
    if (confirm(`Reject late check-in for this employee on ${date}?`)) {
        try {
            // Get the attendance record
            const attendanceRef = ref(database, `attendance/${userId}/${date}`);
            const snapshot = await get(attendanceRef);

            if (!snapshot.exists()) {
                alert('Attendance record not found');
                return;
            }

            const attendanceData = snapshot.val();

            // Find the late check-in
            let found = false;
            for (let i = 0; i < attendanceData.checkIns.length; i++) {
                if (attendanceData.checkIns[i].isLate && attendanceData.checkIns[i].time === time) {
                    // Update the check-in
                    attendanceData.checkIns[i].approved = false;
                    found = true;
                    break;
                }
            }

            if (!found) {
                alert('Late check-in not found');
                return;
            }

            // Update the record
            await update(attendanceRef, attendanceData);

            alert('Late check-in rejected successfully');

            // Reload late check-ins
            loadLateCheckins();
        } catch (error) {
            console.error('Error rejecting late check-in:', error);
            alert(`Error rejecting late check-in: ${error.message}`);
        }
    }
}

// Export attendance records
function exportAttendanceRecords() {
    alert('Exporting attendance records... This feature will be implemented soon.');
}
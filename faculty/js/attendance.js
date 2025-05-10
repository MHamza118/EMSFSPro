// Import check-in service
import { getTodayTimeSlots, isWithinCheckInWindow, getNextAvailableSlot, recordCheckIn, recordCheckOut, getAttendanceRecords } from '../../js/checkin-service.js';
import { getCurrentUser } from '../../js/firebase-service.js';
import { calculateWorkingHours } from '../../js/working-hours.js';

// Global variables
let currentUser = null;
let todayTimeSlots = [];
let nextAvailableSlot = null;

// Check authentication
document.addEventListener('DOMContentLoaded', async function () {
    // Get current user from session
    const userJson = sessionStorage.getItem('currentUser');
    if (!userJson) {
        window.location.href = '../index.html';
        return;
    }

    currentUser = JSON.parse(userJson);
    if (currentUser.role !== 'faculty' && currentUser.role !== 'employee') {
        window.location.href = '../index.html';
        return;
    }

    // Load today's schedule
    await loadTodaySchedule();

    // Load attendance data
    await loadAttendanceData();

    // Update check-in button status
    updateCheckInStatus();

    // Set up refresh timer (check every minute)
    setInterval(updateCheckInStatus, 60000);
});

// Modal functionality
const modal = document.getElementById('lateCheckInModal');
const closeModal = document.querySelector('.close-modal');

// Open modal when add late check-in button is clicked
document.getElementById('addLateCheckInBtn').addEventListener('click', function () {
    modal.style.display = 'block';
});

// Close modal when close button is clicked
closeModal.addEventListener('click', function () {
    modal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Load today's schedule
async function loadTodaySchedule() {
    try {
        const userId = currentUser.employeeId || currentUser.uid;

        // Get today's time slots
        todayTimeSlots = await getTodayTimeSlots(userId);

        // Get next available slot
        nextAvailableSlot = await getNextAvailableSlot(userId);

        // Update schedule display
        updateScheduleDisplay();
    } catch (error) {
        console.error('Error loading today schedule:', error);
    }
}

// Update the schedule display
function updateScheduleDisplay() {
    const scheduleContainer = document.getElementById('todaySchedule');
    if (!scheduleContainer) return;

    scheduleContainer.innerHTML = '';

    if (todayTimeSlots.length === 0) {
        scheduleContainer.innerHTML = '<div class="alert alert-warning">No schedule set for today</div>';
        return;
    }

    // Create schedule table
    const table = document.createElement('table');
    table.className = 'table';

    // Add header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Status</th>
        </tr>
    `;
    table.appendChild(thead);

    // Add body
    const tbody = document.createElement('tbody');

    todayTimeSlots.forEach(slot => {
        const row = document.createElement('tr');

        // Check if this is the next available slot
        const isNextSlot = nextAvailableSlot &&
            slot.start === nextAvailableSlot.start &&
            slot.end === nextAvailableSlot.end;

        // Determine status
        let status = 'Upcoming';
        let statusClass = 'status-upcoming';

        if (isNextSlot) {
            const checkInStatus = isWithinCheckInWindow(slot);

            if (checkInStatus.isValid) {
                status = 'Available for Check-in';
                statusClass = 'status-available';
            } else if (checkInStatus.requiresLateCheckIn) {
                status = 'Late Check-in Required';
                statusClass = 'status-late';
            } else {
                status = 'Not Available';
                statusClass = 'status-unavailable';
            }
        }

        row.innerHTML = `
            <td>${slot.start}</td>
            <td>${slot.end}</td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
        `;

        // Highlight next available slot
        if (isNextSlot) {
            row.className = 'next-slot';
        }

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    scheduleContainer.appendChild(table);
}

// Update check-in button status
function updateCheckInStatus() {
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const lateCheckInBtn = document.getElementById('addLateCheckInBtn');

    if (!nextAvailableSlot) {
        // No slots available
        checkInBtn.disabled = true;
        checkInBtn.title = 'No schedule available for check-in';
        lateCheckInBtn.disabled = true;
        return;
    }

    // Check if within check-in window
    const checkInStatus = isWithinCheckInWindow(nextAvailableSlot);

    if (checkInStatus.isValid) {
        // Regular check-in available
        checkInBtn.disabled = false;
        checkInBtn.title = 'Check in for your current time slot';
        lateCheckInBtn.disabled = true;
    } else if (checkInStatus.requiresLateCheckIn) {
        // Late check-in required
        checkInBtn.disabled = true;
        checkInBtn.title = 'You are late. Please use late check-in';
        lateCheckInBtn.disabled = false;
    } else {
        // No check-in available
        checkInBtn.disabled = true;
        checkInBtn.title = 'No available time slot for check-in';
        lateCheckInBtn.disabled = true;
    }

    // Update schedule display
    updateScheduleDisplay();
}

// Handle late check-in form submission
document.getElementById('lateCheckInForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const reason = document.getElementById('lateCheckInReason').value;

    if (!reason) {
        alert('Please provide a reason for late check-in');
        return;
    }

    try {
        // Disable submit button
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        // Record late check-in
        const userId = currentUser.employeeId || currentUser.uid;
        console.log(`Attempting late check-in for user ID: ${userId}`);
        console.log(`Current user:`, currentUser);
        console.log(`Reason:`, reason);

        const result = await recordCheckIn(userId, true, reason);
        console.log(`Late check-in result:`, result);

        if (result.success) {
            alert(result.message || `Late check-in recorded at ${result.checkInTime24h || result.checkInTime}`);

            // Reset form and close modal
            this.reset();
            modal.style.display = 'none';

            // Reload attendance data
            await loadAttendanceData();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error submitting late check-in:', error);
        alert(`Error: ${error.message}`);
    } finally {
        // Re-enable submit button
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit';
    }
});

// Handle check-in
document.getElementById('checkInBtn').addEventListener('click', async function () {
    try {
        // Disable button
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        // Record check-in directly without checking for slots
        // Our updated recordCheckIn function will handle the case where there's no schedule
        const userId = currentUser.employeeId || currentUser.uid;
        console.log(`Attempting check-in for user ID: ${userId}`);
        console.log(`Current user:`, currentUser);

        const result = await recordCheckIn(userId);
        console.log(`Check-in result:`, result);

        if (result.success) {
            if (result.isDefaultCheckIn) {
                alert(`Successfully checked in at ${result.checkInTime24h || result.checkInTime} (no schedule found, using default check-in)`);
            } else {
                alert(`Successfully checked in at ${result.checkInTime24h || result.checkInTime}`);
            }

            // Reload attendance data
            await loadAttendanceData();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error checking in:', error);
        alert(`Error: ${error.message}`);
    } finally {
        // Re-enable button
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-sign-in-alt"></i> Check In';
    }
});

// Handle check-out
document.getElementById('checkOutBtn').addEventListener('click', async function () {
    try {
        // Disable button
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        // Record check-out
        const userId = currentUser.employeeId || currentUser.uid;
        console.log(`Attempting check-out for user ID: ${userId}`);
        console.log(`Current user:`, currentUser);

        const result = await recordCheckOut(userId);
        console.log(`Check-out result:`, result);

        if (result.success) {
            alert(`Successfully checked out at ${result.checkOutTime24h || result.checkOutTime}`);

            // Reload attendance data
            await loadAttendanceData();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error checking out:', error);
        alert(`Error: ${error.message}`);
    } finally {
        // Re-enable button
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-sign-out-alt"></i> Check Out';
    }
});

// Load attendance data
async function loadAttendanceData() {
    try {
        // Show loading indicator
        const historyContainer = document.getElementById('attendanceHistory');
        historyContainer.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading attendance data...</td></tr>';

        // Get filter values
        const monthFilter = document.getElementById('monthFilter').value;
        const yearFilter = document.getElementById('yearFilter').value;

        // Calculate date range using ISO format (YYYY-MM-DD)
        const today = new Date();
        let startDate, endDate;

        if (monthFilter && yearFilter) {
            // Specific month and year
            const month = parseInt(monthFilter) - 1; // JS months are 0-indexed
            const year = parseInt(yearFilter);
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0); // Last day of month
        } else if (yearFilter) {
            // Entire year
            const year = parseInt(yearFilter);
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31);
        } else {
            // Default to current month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        // Format dates in ISO format (YYYY-MM-DD)
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Get attendance records
        const userId = currentUser.employeeId || currentUser.uid;
        console.log(`Getting attendance records for user ID: ${userId}`);
        console.log(`Current user:`, currentUser);
        console.log(`Date range: ${startDateStr} to ${endDateStr}`);

        const records = await getAttendanceRecords(userId, startDateStr, endDateStr);
        console.log(`Retrieved ${records.length} records:`, records);

        // Clear container
        historyContainer.innerHTML = '';

        if (records.length === 0) {
            historyContainer.innerHTML = '<tr><td colspan="7" class="text-center">No attendance records found for the selected period</td></tr>';
            return;
        }

        // Process and display records
        console.log(`Processing ${records.length} records for display`);

        records.forEach(dayRecord => {
            console.log(`Processing record for date ${dayRecord.date}`, dayRecord);

            // Skip days with no check-ins
            if (!dayRecord.checkIns || !Array.isArray(dayRecord.checkIns) || dayRecord.checkIns.length === 0) {
                console.log(`No check-ins for date ${dayRecord.date}`);
                return;
            }

            console.log(`Processing ${dayRecord.checkIns.length} check-ins for date ${dayRecord.date}`);

            // Count late check-ins
            const lateCheckIns = dayRecord.checkIns.filter(checkIn => checkIn.isLate).length;
            console.log(`Late check-ins: ${lateCheckIns}`);

            // Get first check-in and last check-out
            const firstCheckIn = dayRecord.checkIns[0];
            console.log(`First check-in:`, firstCheckIn);

            // Find the last check-out (if any)
            let lastCheckOut = null;
            for (let i = dayRecord.checkIns.length - 1; i >= 0; i--) {
                if (dayRecord.checkIns[i].isCheckOut) {
                    lastCheckOut = dayRecord.checkIns[i];
                    break;
                }
            }
            console.log(`Last check-out:`, lastCheckOut);

            // Determine status (use capitalized status for consistency with admin view)
            let status = 'Present';
            if (lateCheckIns > 0) {
                status = 'Late';
            }

            // Format check-in time (always use 24h format for consistency with admin view)
            const checkInTime = firstCheckIn.time24h || firstCheckIn.time;
            console.log(`Using check-in time: ${checkInTime} (from ${firstCheckIn.time24h ? 'time24h' : 'time'})`);

            // Format check-out time (always use 24h format for consistency with admin view)
            const checkOutTime = lastCheckOut ?
                (lastCheckOut.checkOutTime24h || lastCheckOut.checkOutTime) :
                'Not checked out';
            console.log(`Using check-out time: ${checkOutTime}`);

            // Calculate working hours
            const workingHoursResult = calculateWorkingHours(dayRecord.checkIns);
            console.log(`Working hours calculation:`, workingHoursResult);

            // Determine working hours display class
            let workingHoursClass = 'working-hours';
            if (workingHoursResult.error) {
                workingHoursClass += workingHoursResult.isComplete ? ' working-hours-error' : ' working-hours-incomplete';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dayRecord.date}</td>
                <td>${dayRecord.day}</td>
                <td>${checkInTime}</td>
                <td>${checkOutTime}</td>
                <td><span class="${workingHoursClass}">${workingHoursResult.display}</span></td>
                <td>${lateCheckIns}</td>
                <td>
                    <span class="status-badge status-${status.toLowerCase()}">
                        ${status}
                    </span>
                </td>
            `;
            historyContainer.appendChild(row);
            console.log(`Added row for date ${dayRecord.date}`);
        });
    } catch (error) {
        console.error('Error loading attendance data:', error);
        const historyContainer = document.getElementById('attendanceHistory');
        historyContainer.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading attendance data: ${error.message}</td></tr>`;
    }
}

// Handle filter changes
document.getElementById('monthFilter').addEventListener('change', function () {
    loadAttendanceData();
});

document.getElementById('yearFilter').addEventListener('change', function () {
    loadAttendanceData();
});
// Import Firebase functions
import { isLoggedIn, getUserRole, getAllEmployees, getEmployeeTimetable, logoutUser } from '../../js/firebase-service.js';

// Global variables
let employeesData = [];

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Check authentication
    if (!isLoggedIn() || getUserRole() !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    console.log("Admin timetable page loaded");

    // Set up event listeners
    setupEventListeners();

    // Load employees data
    await loadEmployees();
});

// Set up all event listeners
function setupEventListeners() {
    // Handle employee selection
    document.getElementById('employeeSelect').addEventListener('change', async function () {
        const selectedEmployee = this.value;
        if (selectedEmployee) {
            await loadEmployeeTimetable(selectedEmployee);
        } else {
            clearTimetable();
        }
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

// Load employees for dropdown
async function loadEmployees() {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'spinner';
    document.querySelector('.card-body').prepend(loadingIndicator);

    try {
        console.log("Loading employees from Firebase...");

        // Get all employees from Firebase
        employeesData = await getAllEmployees();
        console.log("Employees loaded:", employeesData);

        const select = document.getElementById('employeeSelect');
        select.innerHTML = '<option value="">Select an employee</option>';

        if (employeesData.length === 0) {
            // No employees found
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'No employees found';
            select.appendChild(option);
            return;
        }

        employeesData.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id; // Using employee ID (could be custom ID or Firebase UID)
            option.textContent = employee.name || employee.email;
            select.appendChild(option);
        });

        console.log("Employee dropdown populated");
    } catch (error) {
        console.error('Error loading employees:', error);
        alert('Failed to load employees. Please try again later.');
    } finally {
        // Remove loading indicator
        loadingIndicator.remove();
    }
}

// Load employee timetable
async function loadEmployeeTimetable(employeeId) {
    // Clear existing timetable
    clearTimetable();

    // Remove any existing update info
    const existingUpdateInfo = document.querySelector('.update-info');
    if (existingUpdateInfo) {
        existingUpdateInfo.remove();
    }

    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'spinner';
    document.querySelector('.timetable-container').prepend(loadingIndicator);

    try {
        console.log(`Loading timetable for employee ID: ${employeeId}`);

        // Find the employee to get their name for display
        const employee = employeesData.find(emp => emp.id === employeeId);
        console.log("Found employee:", employee);
        const employeeName = employee ? (employee.name || employee.email) : 'Unknown Employee';

        // Update the timetable header to show which employee's timetable is being viewed
        document.querySelector('.card-header h2').textContent = `${employeeName}'s Timetable`;

        // Try to get the timetable using the employee ID first
        let employeeData = await getEmployeeTimetable(employeeId);
        console.log("Timetable data using employee ID:", employeeData);

        // If no data found and employee has a UID, try using the UID
        if ((!employeeData || !employeeData.timetable) && employee && employee.uid) {
            console.log("No timetable found with employee ID, trying with UID:", employee.uid);
            employeeData = await getEmployeeTimetable(employee.uid);
            console.log("Timetable data using UID:", employeeData);
        }

        if (!employeeData || !employeeData.timetable) {
            // No timetable found for this employee
            const message = document.createElement('div');
            message.className = 'alert alert-info';
            message.textContent = 'No timetable found for this employee.';
            document.querySelector('.timetable-container').prepend(message);
            return;
        }

        const timetableData = employeeData.timetable;

        // Load timetable for each day
        Object.keys(timetableData).forEach(day => {
            const daySlots = timetableData[day];
            const container = document.getElementById(`${day}Slots`);

            if (!daySlots || daySlots.length === 0) {
                // No slots for this day
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-day';
                emptyMessage.textContent = 'No time slots for this day';
                container.appendChild(emptyMessage);
                return;
            }

            daySlots.forEach(slot => {
                const slotElement = document.createElement('div');
                slotElement.className = `time-slot ${slot.type.toLowerCase()}`;
                slotElement.innerHTML = `
                    <div class="slot-time">${slot.start} - ${slot.end}</div>
                    <div class="slot-type">${slot.type}</div>
                `;
                container.appendChild(slotElement);
            });
        });

        // Show last updated time
        if (employeeData.lastUpdated) {
            const lastUpdated = new Date(employeeData.lastUpdated);
            const formattedDate = lastUpdated.toLocaleString();

            const updateInfo = document.createElement('div');
            updateInfo.className = 'update-info';
            updateInfo.textContent = `Last updated: ${formattedDate}`;
            document.querySelector('.card-header').appendChild(updateInfo);
        }

        console.log("Timetable loaded successfully");
    } catch (error) {
        console.error('Error loading timetable:', error);
        const message = document.createElement('div');
        message.className = 'alert alert-danger';
        message.textContent = 'Failed to load timetable. Please try again later.';
        document.querySelector('.timetable-container').prepend(message);
    } finally {
        // Remove loading indicator
        loadingIndicator.remove();
    }
}

// Clear timetable
function clearTimetable() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    days.forEach(day => {
        document.getElementById(`${day}Slots`).innerHTML = '';
    });
}
// Import Firebase functions
import { isLoggedIn, getUserRole, getCurrentUser, logoutUser, submitHolidayRequest, getEmployeeHolidayRequests } from '../js/firebase-service.js';

// Global variables
let holidayRequestsData = [];
let currentUser = null;

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is logged in and is an employee
    if (!isLoggedIn() || getUserRole() !== 'employee') {
        window.location.href = '../index.html';
        return;
    }

    // Get current user
    currentUser = getCurrentUser();
    console.log("Current user:", currentUser);

    // Set up event listeners
    setupEventListeners();

    // Load initial data
    await loadHolidayRequests();
});

// Listen for the custom submit event from the inline script
document.addEventListener('submit-holiday-form', async function (e) {
    console.log('Received submit-holiday-form event:', e.detail);

    if (!e.detail) {
        console.error('No form data provided');
        return;
    }

    const { startDate, endDate, reason, submitButton } = e.detail;

    try {
        // Calculate number of days
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const diffTime = Math.abs(endDateObj - startDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Validate dates
        if (startDateObj > endDateObj) {
            alert('End date cannot be before start date');

            // Re-enable submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Submit Request';
            }
            return;
        }

        // Get the employee ID (could be custom ID or UID)
        const employeeId = currentUser.employeeId || currentUser.uid;
        console.log("Using employee ID for submission:", employeeId);

        // Create holiday request data
        const requestData = {
            employeeId: employeeId,
            employeeName: currentUser.displayName || currentUser.email,
            startDate: startDate,
            endDate: endDate,
            days: diffDays,
            reason: reason
        };

        // Submit holiday request to Firebase
        const result = await submitHolidayRequest(requestData);

        if (result.success) {
            alert(`Holiday request submitted successfully for ${diffDays} days`);

            // Reset and hide form
            document.getElementById('holidayForm').reset();
            document.getElementById('holidayRequestForm').style.display = 'none';

            // Reload holiday requests
            await loadHolidayRequests();
        } else {
            alert(`Failed to submit holiday request: ${result.error}`);
        }
    } catch (error) {
        console.error("Error submitting holiday request:", error);
        alert(`Error submitting holiday request: ${error.message}`);
    } finally {
        // Re-enable submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Submit Request';
        }
    }
});

// Set up all event listeners
function setupEventListeners() {
    // Handle logout
    document.getElementById('logout').addEventListener('click', async function () {
        try {
            await logoutUser();
            window.location.href = '../index.html';
        } catch (error) {
            console.error("Error logging out:", error);
            alert(`Error logging out: ${error.message}`);
        }
    });

    // Holiday Request Form elements
    const requestHolidayBtn = document.getElementById('requestHolidayBtn');
    const holidayRequestForm = document.getElementById('holidayRequestForm');
    const cancelRequestBtn = document.getElementById('cancelRequest');
    const holidayForm = document.getElementById('holidayForm');

    // Show holiday request form
    requestHolidayBtn.addEventListener('click', () => {
        console.log('Request holiday button clicked');
        holidayRequestForm.style.display = 'block';
    });

    // Close holiday request form
    cancelRequestBtn.addEventListener('click', () => {
        holidayRequestForm.style.display = 'none';
        holidayForm.reset();
    });

    // Close form when clicking outside
    holidayRequestForm.addEventListener('click', (e) => {
        if (e.target === holidayRequestForm) {
            holidayRequestForm.style.display = 'none';
            holidayForm.reset();
        }
    });

    // Form submission is now handled by the custom event listener
}

// Load holiday requests
async function loadHolidayRequests() {
    try {
        console.log("Loading holiday requests from Firebase");

        // Show loading indicator
        const requestsContainer = document.getElementById('holidayRequests');
        requestsContainer.innerHTML = '<tr><td colspan="5" class="text-center">Loading requests...</td></tr>';

        // Get the employee ID (could be custom ID or UID)
        const employeeId = currentUser.employeeId || currentUser.uid;
        console.log("Using employee ID for retrieval:", employeeId);

        // Get holiday requests for the current employee
        holidayRequestsData = await getEmployeeHolidayRequests(employeeId);
        console.log(`Loaded ${holidayRequestsData.length} holiday requests for employee ${employeeId}`);

        // Display holiday requests
        displayHolidayRequests(holidayRequestsData);

        return holidayRequestsData;
    } catch (error) {
        console.error("Error loading holiday requests:", error);
        const requestsContainer = document.getElementById('holidayRequests');
        requestsContainer.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading requests</td></tr>';
        return [];
    }
}

// Display holiday requests
function displayHolidayRequests(requests) {
    // Update holiday requests table
    const requestsContainer = document.getElementById('holidayRequests');
    requestsContainer.innerHTML = '';

    if (requests.length === 0) {
        requestsContainer.innerHTML = '<tr><td colspan="5" class="text-center">No holiday requests found</td></tr>';
        return;
    }

    // Sort requests by date (newest first)
    requests.sort((a, b) => {
        const dateA = new Date(a.submittedAt || a.startDate);
        const dateB = new Date(b.submittedAt || b.startDate);
        return dateB - dateA;
    });

    requests.forEach(request => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${request.startDate}</td>
            <td>${request.endDate}</td>
            <td>${request.days}</td>
            <td>${request.reason}</td>
            <td>
                <span class="status-badge status-${request.status}">
                    ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
            </td>
        `;
        requestsContainer.appendChild(row);
    });
}


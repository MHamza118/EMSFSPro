// Import Firebase functions
import { isLoggedIn, getUserRole, getAllEmployees, addEmployee, logoutUser } from '../js/firebase-service.js';

// Global variables
let employeesList = [];

// Check authentication and set up event listeners
document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is logged in and is admin
    if (!isLoggedIn() || getUserRole() !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    console.log("Admin dashboard loaded");

    // Load data
    await loadEmployees();
    updateStats();
    loadMockActivity();
    loadMockRequests();

    // Set up direct event listeners for the Add Employee button
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const modal = document.getElementById('addEmployeeModal');

    // Make sure the button is clickable
    if (addEmployeeBtn) {
        console.log("Add Employee button found, adding click event");
        addEmployeeBtn.onclick = function () {
            console.log("Add Employee button clicked");
            modal.style.display = 'block';
        };
    } else {
        console.error("Add Employee button not found!");
    }

    // Close modal button
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.onclick = function () {
            modal.style.display = 'none';
        };
    }

    // Close modal when clicking outside
    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Form submission
    const form = document.getElementById('addEmployeeForm');
    if (form) {
        form.onsubmit = handleFormSubmit;
    }

    // Delete employee button
    const deleteBtn = document.getElementById('deleteEmployeeBtn');
    if (deleteBtn) {
        deleteBtn.onclick = handleDeleteEmployee;
    }

    // Logout button
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.onclick = handleLogout;
    }

    console.log("Event listeners set up directly");
});

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    // Get form values
    const name = document.getElementById('employeeName').value;
    const email = document.getElementById('employeeEmail').value;
    const password = document.getElementById('employeePassword').value;
    const role = document.getElementById('employeeRole').value;

    // Disable submit button
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    console.log(`Adding employee: ${name}, ${email}, ${role}`);

    try {
        // Add employee to Firebase
        const result = await addEmployee(email, password, name, role);

        if (result.success) {
            alert(`Employee ${name} added successfully!`);

            // Reset form and close modal
            this.reset();
            document.getElementById('addEmployeeModal').style.display = 'none';

            // Reload data
            await loadEmployees();
            updateStats();
        } else {
            alert(`Failed to add employee: ${result.error}`);
        }
    } catch (error) {
        console.error("Error adding employee:", error);
        alert(`Error adding employee: ${error.message}`);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Handle delete employee
function handleDeleteEmployee() {
    const select = document.getElementById('employeeSelect');
    const selectedId = select.value;

    if (!selectedId) {
        alert('Please select an employee to delete');
        return;
    }

    const selectedName = select.options[select.selectedIndex].text;

    if (confirm(`Are you sure you want to delete ${selectedName}?`)) {
        // For now, just show an alert
        alert(`Employee ${selectedName} deleted`);

        // Reload data
        loadEmployees();
        updateStats();
    }
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();

    try {
        await logoutUser();
        window.location.href = '../index.html';
    } catch (error) {
        console.error("Error logging out:", error);
        alert(`Error logging out: ${error.message}`);
    }
}

// Load employees
async function loadEmployees() {
    try {
        console.log("Loading employees from Firebase...");

        // Get employees from Firebase
        employeesList = await getAllEmployees();
        console.log("Employees loaded:", employeesList);

        // Update employee select dropdown
        const select = document.getElementById('employeeSelect');
        select.innerHTML = '<option value="">Select an employee</option>';

        employeesList.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name || employee.email.split('@')[0];
            select.appendChild(option);
        });

        // Update stats
        updateStats();
    } catch (error) {
        console.error("Error loading employees:", error);
    }
}

// Update stats
function updateStats() {
    const totalEmployees = employeesList.length;

    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('presentToday').textContent = '0';
    document.getElementById('onLeave').textContent = '0';
}

// Load mock activity data
function loadMockActivity() {
    const mockActivity = [
        { time: '10:00 AM', employee: 'Test User', activity: 'Check In', status: 'on-time' }
    ];

    const container = document.getElementById('recentActivity');
    container.innerHTML = '';

    mockActivity.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${activity.time}</td>
            <td>${activity.employee}</td>
            <td>${activity.activity}</td>
            <td><span class="status-badge status-${activity.status}">${activity.status}</span></td>
        `;
        container.appendChild(row);
    });
}

// Load mock requests
function loadMockRequests() {
    const mockRequests = [
        { employee: 'Test User', type: 'Holiday', date: '2024-03-25', id: 1 }
    ];

    const container = document.getElementById('pendingRequests');
    container.innerHTML = '';

    mockRequests.forEach(request => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${request.employee}</td>
            <td>${request.type}</td>
            <td>${request.date}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="approveRequest(${request.id})">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-sm btn-danger" onclick="rejectRequest(${request.id})">
                    <i class="fas fa-times"></i> Reject
                </button>
            </td>
        `;
        container.appendChild(row);
    });
}

// Global functions for request handling
window.approveRequest = function (id) {
    alert(`Request ${id} approved`);
    loadMockRequests();
};

window.rejectRequest = function (id) {
    alert(`Request ${id} rejected`);
    loadMockRequests();
};
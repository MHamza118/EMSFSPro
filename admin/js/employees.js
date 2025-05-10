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

    console.log("Employees page loaded");

    // Load employees
    await loadEmployees();

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
    const department = document.getElementById('employeeDepartment').value;

    // Disable submit button
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    console.log(`Adding employee: ${name}, ${email}, ${department}`);

    try {
        // Add employee to Firebase
        const result = await addEmployee(email, password, name, department);

        if (result.success) {
            alert(`Employee ${name} added successfully!`);

            // Reset form and close modal
            this.reset();
            document.getElementById('addEmployeeModal').style.display = 'none';

            // Reload data
            await loadEmployees();
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

// Load employees
async function loadEmployees() {
    // Show loading indicator
    const tableBody = document.getElementById('employeesTable');
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner"></div></td></tr>';

    try {
        console.log("Loading employees from Firebase...");

        // Get employees from Firebase
        employeesList = await getAllEmployees();
        console.log("Employees loaded:", employeesList);

        // Clear loading indicator
        tableBody.innerHTML = '';

        if (employeesList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No employees found</td></tr>';
            return;
        }

        employeesList.forEach(employee => {
            const status = employee.status || 'Active'; // Default to Active if not specified
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.id}</td>
                <td>${employee.name || 'N/A'}</td>
                <td>${employee.email}</td>
                <td>${employee.position || employee.department || 'N/A'}</td>
                <td>
                    <span class="status-badge status-${status.toLowerCase()}">
                        ${status}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-primary edit-employee" data-id="${employee.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger delete-employee" data-id="${employee.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to the new buttons
        addButtonEventListeners();
    } catch (error) {
        console.error('Error loading employees:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading employees</td></tr>';
    }
}

// Add event listeners to edit and delete buttons
function addButtonEventListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-employee').forEach(button => {
        button.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            editEmployee(id);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-employee').forEach(button => {
        button.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            deleteEmployee(id);
        });
    });
}

// Edit employee function
function editEmployee(id) {
    // For now, we'll just show an alert. Later this should open an edit modal
    alert(`Edit employee with ID: ${id}`);
}

// Delete employee function
function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        // For now, we'll just show an alert. Later this will be replaced with actual API call
        alert(`Employee with ID ${id} deleted`);
        loadEmployees();
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
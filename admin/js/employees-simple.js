// Import Firebase functions
import { isLoggedIn, getUserRole, getAllEmployees, addEmployee, logoutUser } from '../js/firebase-service.js';

// Check authentication
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in and is admin
    if (!isLoggedIn() || getUserRole() !== 'admin') {
        window.location.href = '../index.html';
        return;
    }
    
    // Load initial data
    await loadEmployees();
    
    // Set up event listeners for modal
    setupModalListeners();
});

// Set up modal event listeners
function setupModalListeners() {
    const modal = document.getElementById('addEmployeeModal');
    const addBtn = document.getElementById('addEmployeeBtn');
    const closeBtn = document.querySelector('.close-modal');
    
    // Add Employee button - open modal
    addBtn.addEventListener('click', function() {
        modal.style.display = 'block';
    });
    
    // Close button - close modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Click outside modal - close modal
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Form submission
    document.getElementById('addEmployeeForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('employeeName').value;
        const email = document.getElementById('employeeEmail').value;
        const password = document.getElementById('employeePassword').value;
        const department = document.getElementById('employeeDepartment').value;
        
        // Disable submit button
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        
        try {
            // Add employee to Firebase
            const result = await addEmployee(email, password, name, department);
            
            if (result.success) {
                alert(`Employee ${name} added successfully!`);
                
                // Reset form and close modal
                this.reset();
                modal.style.display = 'none';
                
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
            submitBtn.textContent = 'Add Employee';
        }
    });
    
    // Logout button
    document.getElementById('logout').addEventListener('click', async function(e) {
        e.preventDefault();
        try {
            await logoutUser();
            window.location.href = '../index.html';
        } catch (error) {
            console.error("Error logging out:", error);
            alert(`Error logging out: ${error.message}`);
        }
    });
}

// Load employees
async function loadEmployees() {
    // Show loading indicator
    const tableBody = document.getElementById('employeesTable');
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner"></div></td></tr>';
    
    try {
        // Get employees from Firebase
        const employees = await getAllEmployees();
        
        // Clear loading indicator
        tableBody.innerHTML = '';
        
        if (employees.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No employees found</td></tr>';
            return;
        }
        
        employees.forEach(employee => {
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
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            alert(`Edit employee with ID: ${id}`);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-employee').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this employee?')) {
                alert(`Employee with ID ${id} deleted`);
                loadEmployees();
            }
        });
    });
}

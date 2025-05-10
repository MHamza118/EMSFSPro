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
    updateStats();
    loadMockActivity();
    loadMockRequests();
    
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
        const role = document.getElementById('employeeRole').value;
        
        // Disable submit button
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        
        try {
            // Add employee to Firebase
            const result = await addEmployee(email, password, name, role);
            
            if (result.success) {
                alert(`Employee ${name} added successfully!`);
                
                // Reset form and close modal
                this.reset();
                modal.style.display = 'none';
                
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
            submitBtn.textContent = 'Add Employee';
        }
    });
    
    // Delete employee button
    document.getElementById('deleteEmployeeBtn').addEventListener('click', function() {
        const select = document.getElementById('employeeSelect');
        const selectedId = select.value;
        
        if (!selectedId) {
            alert('Please select an employee to delete');
            return;
        }
        
        const selectedName = select.options[select.selectedIndex].text;
        
        if (confirm(`Are you sure you want to delete ${selectedName}?`)) {
            alert(`Employee ${selectedName} deleted`);
            loadEmployees();
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

// Global variables
let employeesList = [];

// Load employees
async function loadEmployees() {
    try {
        // Get employees from Firebase
        employeesList = await getAllEmployees();
        
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
window.approveRequest = function(id) {
    alert(`Request ${id} approved`);
    loadMockRequests();
};

window.rejectRequest = function(id) {
    alert(`Request ${id} rejected`);
    loadMockRequests();
};

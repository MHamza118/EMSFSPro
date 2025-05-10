// Import Firebase functions
import { isLoggedIn, getUserRole, getCurrentUser, logoutUser, getEmployeeTasks, updateTaskStatus } from '../../js/firebase-service.js';

// Global variables
let currentTaskId = '';
let tasksData = [];
let currentUser = null;

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Check authentication
    if (!isLoggedIn()) {
        window.location.href = '../index.html';
        return;
    }

    console.log("Faculty tasks page loaded");

    // Get current user
    currentUser = getCurrentUser();
    console.log("Current user:", currentUser);

    if (!currentUser) {
        alert('Error: Could not retrieve user information');
        window.location.href = '../index.html';
        return;
    }

    // Set up event listeners
    setupEventListeners();

    // Load tasks
    await loadTasks();
});

// Set up all event listeners
function setupEventListeners() {
    // Modal functionality
    const modal = document.getElementById('taskStatusModal');
    const closeModal = document.querySelector('.close-modal');

    // Open modal when update status button is clicked
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('update-status-btn')) {
            currentTaskId = e.target.dataset.taskId;
            modal.style.display = 'block';
        }
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

    // Handle task status form submission
    document.getElementById('taskStatusForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const status = document.getElementById('taskStatus').value;
        const reason = document.getElementById('taskReason').value;

        // Disable submit button
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        try {
            // Update task status in Firebase
            const result = await updateTaskStatus(currentTaskId, status, reason);

            if (result.success) {
                alert(`Task status updated to ${status}`);

                // Reset form and close modal
                this.reset();
                modal.style.display = 'none';

                // Reload tasks
                await loadTasks();
            } else {
                alert(`Failed to update task status: ${result.error}`);
            }
        } catch (error) {
            console.error("Error updating task status:", error);
            alert(`Error updating task status: ${error.message}`);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Status';
        }
    });



    // Handle filter changes
    document.getElementById('taskStatusFilter').addEventListener('change', function () {
        filterTasks(this.value, document.getElementById('taskDateFilter').value);
    });

    document.getElementById('taskDateFilter').addEventListener('change', function () {
        filterTasks(document.getElementById('taskStatusFilter').value, this.value);
    });

    // Handle logout
    document.getElementById('logout').addEventListener('click', async function (e) {
        e.preventDefault();
        try {
            await logoutUser();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            alert('Failed to log out. Please try again.');
        }
    });
}

// Load tasks from Firebase
async function loadTasks() {
    try {
        console.log("Loading tasks from Firebase");

        // Show loading indicator
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '<tr><td colspan="7" class="text-center">Loading tasks...</td></tr>';

        // Get tasks assigned to the current user
        const employeeId = currentUser.employeeId || currentUser.uid;
        tasksData = await getEmployeeTasks(employeeId);

        console.log(`Loaded ${tasksData.length} tasks for employee ${employeeId}`);

        // Display tasks
        displayTasks(tasksData);

        return tasksData;
    } catch (error) {
        console.error("Error loading tasks:", error);
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading tasks</td></tr>';
        return [];
    }
}

// Filter and display tasks
function filterTasks(status = '', date = '') {
    console.log(`Filtering tasks - Status: ${status}, Date: ${date}`);

    let filteredTasks = [...tasksData];

    // Apply status filter
    if (status) {
        filteredTasks = filteredTasks.filter(task =>
            task.status.toLowerCase() === status.toLowerCase()
        );
    }

    // Apply date filter
    if (date) {
        const filterDate = new Date(date);
        filteredTasks = filteredTasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === filterDate.toDateString();
        });
    }

    // Display filtered tasks
    displayTasks(filteredTasks);
}

// Display tasks in the table
function displayTasks(tasks) {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = ''; // Clear existing content

    if (tasks.length === 0) {
        taskList.innerHTML = '<tr><td colspan="7" class="text-center">No tasks found</td></tr>';
        return;
    }

    tasks.forEach(task => {
        // Format the date
        const taskDate = new Date(task.dueDate);
        const formattedDate = taskDate.toLocaleDateString();
        const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][taskDate.getDay()];

        // Check if task is overdue
        const today = new Date();
        const isOverdue = taskDate < today && task.status.toLowerCase() !== 'completed';

        // Determine status display
        let statusDisplay = task.status;
        let statusClass = task.status.toLowerCase();

        if (isOverdue) {
            statusDisplay = 'Overdue';
            statusClass = 'overdue';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${day}</td>
            <td>${task.title}</td>
            <td>
                ${task.description ? `<span class="description-text">${task.description}</span>` : '-'}
            </td>
            <td>
                <span class="status-badge status-${statusClass}">
                    ${statusDisplay}
                </span>
            </td>
            <td>${task.reason || '-'}</td>
            <td>
                <button class="btn btn-primary update-status-btn" data-task-id="${task.id}">
                    Update Status
                </button>
            </td>
        `;
        taskList.appendChild(row);
    });
}


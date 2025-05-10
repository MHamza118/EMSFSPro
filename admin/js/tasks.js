// Import Firebase functions
import { isLoggedIn, getUserRole, logoutUser, getAllEmployees, createTask, getAllTasks, deleteTask, getAllProgressReports, updateProgressStatus, updateTask } from '../../js/firebase-service.js';

// Global variables
let employeesData = [];
let tasksData = [];
let progressReportsData = [];

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is logged in and is an admin
    if (!isLoggedIn() || getUserRole() !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    console.log("Admin tasks page loaded");

    // Set up event listeners
    setupEventListeners();

    // Load initial data
    await loadEmployees();
    await loadTasks();
    updateProgressStats();
});

// Set up all event listeners
function setupEventListeners() {
    // Handle task creation form submission
    document.getElementById('createTaskForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const assignedTo = document.getElementById('assignedTo').value;
        const dueDate = document.getElementById('dueDate').value;
        const priority = document.getElementById('priority').value;

        // Disable submit button
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        try {
            // Create task in Firebase
            const taskData = {
                title: title,
                description: description,
                assignedTo: assignedTo,
                assignedToName: document.getElementById('assignedTo').options[document.getElementById('assignedTo').selectedIndex].text,
                dueDate: dueDate,
                priority: priority,
                status: 'pending'
            };

            const result = await createTask(taskData);

            if (result.success) {
                alert(`Task "${title}" created successfully!`);

                // Reset form
                this.reset();

                // Reload tasks and update stats
                await loadTasks();
                updateProgressStats();
            } else {
                alert(`Failed to create task: ${result.error}`);
            }
        } catch (error) {
            console.error("Error creating task:", error);
            alert(`Error creating task: ${error.message}`);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Task';
        }
    });

    // Handle edit task form submission
    document.getElementById('editTaskForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const taskId = document.getElementById('editTaskId').value;
        const title = document.getElementById('editTaskTitle').value;
        const description = document.getElementById('editTaskDescription').value;
        const assignedTo = document.getElementById('editAssignedTo').value;
        const dueDate = document.getElementById('editDueDate').value;
        const priority = document.getElementById('editPriority').value;
        const status = document.getElementById('editStatus').value;

        // Disable submit button
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        try {
            // Update task in Firebase
            const taskData = {
                title: title,
                description: description,
                assignedTo: assignedTo,
                assignedToName: document.getElementById('editAssignedTo').options[document.getElementById('editAssignedTo').selectedIndex].text,
                dueDate: dueDate,
                priority: priority,
                status: status,
                updatedAt: new Date().toISOString()
            };

            const result = await updateTask(taskId, taskData);

            if (result.success) {
                alert(`Task "${title}" updated successfully!`);

                // Close the modal
                document.getElementById('editTaskModal').style.display = 'none';

                // Reload tasks and update stats
                await loadTasks();
                updateProgressStats();
            } else {
                alert(`Failed to update task: ${result.error}`);
            }
        } catch (error) {
            console.error("Error updating task:", error);
            alert(`Error updating task: ${error.message}`);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Task';
        }
    });

    // Handle modal close button
    document.querySelector('#editTaskModal .close-modal').addEventListener('click', function () {
        document.getElementById('editTaskModal').style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        const modal = document.getElementById('editTaskModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle filter changes
    document.getElementById('statusFilter').addEventListener('change', function () {
        filterTasks(this.value, document.getElementById('priorityFilter').value);
    });

    document.getElementById('priorityFilter').addEventListener('change', function () {
        filterTasks(document.getElementById('statusFilter').value, this.value);
    });

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
}

// Load employees for assignment dropdown
async function loadEmployees() {
    try {
        console.log("Loading employees for task assignment");

        // Show loading indicator
        const select = document.getElementById('assignedTo');
        select.innerHTML = '<option value="">Loading employees...</option>';

        // Get all employees from Firebase
        employeesData = await getAllEmployees();

        // Update dropdown
        select.innerHTML = '<option value="">Select Employee</option>';

        if (employeesData.length === 0) {
            select.innerHTML = '<option value="" disabled>No employees found</option>';
            return;
        }

        employeesData.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name || employee.email;
            select.appendChild(option);
        });

        console.log(`Loaded ${employeesData.length} employees`);
    } catch (error) {
        console.error("Error loading employees:", error);
        alert(`Error loading employees: ${error.message}`);
    }
}

// Load tasks from Firebase
async function loadTasks() {
    try {
        console.log("Loading tasks from Firebase");

        // Show loading indicator
        const tableBody = document.getElementById('tasksTable');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading tasks...</td></tr>';

        // Get all tasks from Firebase
        tasksData = await getAllTasks();

        // Also load progress reports to check for submissions
        progressReportsData = await getAllProgressReports();

        // Display tasks
        displayTasks(tasksData);

        console.log(`Loaded ${tasksData.length} tasks`);
        return tasksData;
    } catch (error) {
        console.error("Error loading tasks:", error);
        const tableBody = document.getElementById('tasksTable');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading tasks</td></tr>';
        return [];
    }
}

// Filter and display tasks
function filterTasks(status = '', priority = '') {
    console.log(`Filtering tasks - Status: ${status}, Priority: ${priority}`);

    let filteredTasks = [...tasksData];

    // Apply status filter
    if (status) {
        filteredTasks = filteredTasks.filter(task =>
            task.status.toLowerCase() === status.toLowerCase()
        );
    }

    // Apply priority filter
    if (priority) {
        filteredTasks = filteredTasks.filter(task =>
            task.priority.toLowerCase() === priority.toLowerCase()
        );
    }

    // Display filtered tasks
    displayTasks(filteredTasks);
}

// Display tasks in the table
function displayTasks(tasks) {
    const tableBody = document.getElementById('tasksTable');
    tableBody.innerHTML = '';

    if (tasks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No tasks found</td></tr>';
        return;
    }

    tasks.forEach(task => {
        const row = document.createElement('tr');

        // Check if task is overdue
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const isOverdue = dueDate < today && task.status.toLowerCase() !== 'completed';

        // Determine status display
        let statusDisplay = task.status;
        if (isOverdue) {
            statusDisplay = 'Overdue';
        }

        row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.title}</td>
            <td>${task.assignedToName || 'Unknown'}</td>
            <td>${task.dueDate}</td>
            <td>
                <span class="priority-badge priority-${task.priority.toLowerCase()}">
                    ${task.priority}
                </span>
            </td>
            <td>
                <span class="status-badge status-${isOverdue ? 'overdue' : task.status.toLowerCase()}">
                    ${statusDisplay}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary view-task" data-task-id="${task.id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-warning edit-task" data-task-id="${task.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger delete-task" data-task-id="${task.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;

        // Add event listeners for buttons
        row.querySelector('.view-task').addEventListener('click', () => viewTask(task.id));
        row.querySelector('.edit-task').addEventListener('click', () => editTask(task.id));
        row.querySelector('.delete-task').addEventListener('click', () => deleteTaskHandler(task.id));

        tableBody.appendChild(row);
    });
}

// Update progress stats based on loaded tasks
function updateProgressStats() {
    // Calculate stats from tasksData
    const stats = {
        total: tasksData.length,
        completed: tasksData.filter(task => task.status.toLowerCase() === 'completed').length,
        inProgress: tasksData.filter(task => task.status.toLowerCase() === 'in progress').length,
        overdue: 0
    };

    // Check for overdue tasks
    const today = new Date();
    stats.overdue = tasksData.filter(task => {
        const dueDate = new Date(task.dueDate);
        return dueDate < today && task.status.toLowerCase() !== 'completed';
    }).length;

    // Update UI
    document.getElementById('totalTasks').textContent = stats.total;
    document.getElementById('completedTasks').textContent = stats.completed;
    document.getElementById('inProgressTasks').textContent = stats.inProgress;
    document.getElementById('overdueTasks').textContent = stats.overdue;
}

// View task details
function viewTask(id) {
    const task = tasksData.find(t => t.id === id);
    if (!task) {
        alert('Task not found');
        return;
    }

    // Find related progress reports
    const relatedReports = progressReportsData.filter(report => report.taskId === id);

    // Format the details for display
    let details = `
        Task ID: ${task.id}
        Title: ${task.title}
        Description: ${task.description}
        Assigned To: ${task.assignedToName}
        Due Date: ${task.dueDate}
        Priority: ${task.priority}
        Status: ${task.status}
        Created: ${new Date(task.createdAt).toLocaleString()}
    `;

    if (relatedReports.length > 0) {
        details += '\n\nProgress Reports:\n';
        relatedReports.forEach(report => {
            details += `- ${new Date(report.submittedAt).toLocaleString()}: ${report.details} (${report.status})\n`;
        });
    }

    alert(details);

    // In a real implementation, this would open a modal with the details
}

// Edit task
function editTask(id) {
    const task = tasksData.find(t => t.id === id);
    if (!task) {
        alert('Task not found');
        return;
    }

    // Get the edit task modal elements
    const modal = document.getElementById('editTaskModal');
    const form = document.getElementById('editTaskForm');
    const titleInput = document.getElementById('editTaskTitle');
    const descriptionInput = document.getElementById('editTaskDescription');
    const assignedToSelect = document.getElementById('editAssignedTo');
    const dueDateInput = document.getElementById('editDueDate');
    const prioritySelect = document.getElementById('editPriority');
    const statusSelect = document.getElementById('editStatus');
    const taskIdInput = document.getElementById('editTaskId');

    // Fill the form with task data
    titleInput.value = task.title;
    descriptionInput.value = task.description;
    dueDateInput.value = task.dueDate;
    prioritySelect.value = task.priority;
    statusSelect.value = task.status;
    taskIdInput.value = task.id;

    // Populate the assigned to dropdown
    assignedToSelect.innerHTML = '<option value="">Select Employee</option>';
    employeesData.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = employee.name || employee.email;
        if (employee.id === task.assignedTo) {
            option.selected = true;
        }
        assignedToSelect.appendChild(option);
    });

    // Show the modal
    modal.style.display = 'block';
}

// Delete task handler
async function deleteTaskHandler(id) {
    const task = tasksData.find(t => t.id === id);
    if (!task) {
        alert('Task not found');
        return;
    }

    if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
        try {
            // Delete task from Firebase
            const result = await deleteTask(id);

            if (result.success) {
                alert(`Task "${task.title}" deleted successfully!`);

                // Reload tasks and update stats
                await loadTasks();
                updateProgressStats();
            } else {
                alert(`Failed to delete task: ${result.error}`);
            }
        } catch (error) {
            console.error("Error deleting task:", error);
            alert(`Error deleting task: ${error.message}`);
        }
    }
}
// Import Firebase functions
import { isLoggedIn, getUserRole, logoutUser, getAllEmployees, getAllProgressReports, updateProgressStatus } from '../../js/firebase-service.js';

// Global variables
let employeesData = [];
let progressReportsData = [];
let currentReportId = '';

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is logged in and is an admin
    if (!isLoggedIn() || getUserRole() !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    console.log("Admin progress reports page loaded");

    // Set up event listeners
    setupEventListeners();

    // Load initial data
    await Promise.all([
        loadEmployees(),
        loadProgressReports()
    ]);
});

// Set up all event listeners
function setupEventListeners() {
    // Modal functionality
    const modal = document.getElementById('reviewModal');
    const closeModal = document.querySelector('.close-modal');

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

    // Handle review form submission
    document.getElementById('reviewForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const reportId = document.getElementById('reportId').value;
        const status = document.getElementById('reportStatus').value;
        const remarks = document.getElementById('reportRemarks').value;

        // Disable submit button
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        try {
            // Update progress report status in Firebase
            const result = await updateProgressStatus(reportId, status, remarks);

            if (result.success) {
                alert(`Progress report ${status === 'approved' ? 'approved' : 'rejected'} successfully`);

                // Reset form and close modal
                this.reset();
                modal.style.display = 'none';

                // Reload progress reports
                await loadProgressReports();
            } else {
                alert(`Failed to update progress report: ${result.error}`);
            }
        } catch (error) {
            console.error("Error updating progress report:", error);
            alert(`Error updating progress report: ${error.message}`);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Review';
        }
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

// Load employees data (still needed for employee names in reports)
async function loadEmployees() {
    try {
        console.log("Loading employees data");

        // Get all employees from Firebase
        employeesData = await getAllEmployees();

        console.log(`Loaded ${employeesData.length} employees`);
    } catch (error) {
        console.error("Error loading employees:", error);
    }
}

// Load progress reports from Firebase
async function loadProgressReports() {
    try {
        console.log("Loading progress reports from Firebase");

        // Show loading indicator
        const tableBody = document.getElementById('progressReportsTable');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading progress reports...</td></tr>';

        // Get all progress reports from Firebase
        progressReportsData = await getAllProgressReports();

        console.log(`Loaded ${progressReportsData.length} progress reports`);

        // Display progress reports
        displayProgressReports(progressReportsData);

        return progressReportsData;
    } catch (error) {
        console.error("Error loading progress reports:", error);
        const tableBody = document.getElementById('progressReportsTable');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading progress reports</td></tr>';
        return [];
    }
}



// Display progress reports in the table
function displayProgressReports(reports) {
    const tableBody = document.getElementById('progressReportsTable');
    tableBody.innerHTML = ''; // Clear existing content

    if (reports.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No progress reports found</td></tr>';
        return;
    }

    // Sort reports by date (newest first)
    reports.sort((a, b) => {
        const dateA = new Date(a.submittedAt || a.date);
        const dateB = new Date(b.submittedAt || b.date);
        return dateB - dateA;
    });

    reports.forEach(report => {
        // Find employee name
        const employee = employeesData.find(emp => emp.id === report.employeeId);
        const employeeName = employee ? (employee.name || employee.email) : (report.employeeName || 'Unknown');

        // Format the date and time
        const submittedDate = report.submittedAt ? new Date(report.submittedAt) : new Date(`${report.date}T${report.time}`);
        const formattedDate = submittedDate.toLocaleDateString();
        const formattedTime = report.time || submittedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${employeeName}</td>
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td>${report.details}</td>
            <td>
                ${report.fileName ? `
                <a href="#" class="file-link">
                    <i class="fas fa-file"></i> ${report.fileName}
                </a>
                ` : '-'}
            </td>
            <td>
                <span class="status-badge status-${report.status || 'pending'}">
                    ${report.status || 'Pending'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-success approve-report" data-id="${report.id}">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-sm btn-danger reject-report" data-id="${report.id}">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="btn btn-sm btn-secondary view-report" data-id="${report.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;

        // Add event listeners for buttons
        tableBody.appendChild(row);
    });

    // Add event listeners for approve buttons
    document.querySelectorAll('.approve-report').forEach(button => {
        button.addEventListener('click', function () {
            const reportId = this.getAttribute('data-id');
            approveReport(reportId);
        });
    });

    // Add event listeners for reject buttons
    document.querySelectorAll('.reject-report').forEach(button => {
        button.addEventListener('click', function () {
            const reportId = this.getAttribute('data-id');
            rejectReport(reportId);
        });
    });

    // Add event listeners for view buttons
    document.querySelectorAll('.view-report').forEach(button => {
        button.addEventListener('click', function () {
            const reportId = this.getAttribute('data-id');
            viewReport(reportId);
        });
    });
}

// Open review modal
function openReviewModal(reportId) {
    const report = progressReportsData.find(r => r.id === reportId);
    if (!report) {
        alert('Report not found');
        return;
    }

    // Set report ID in hidden field
    document.getElementById('reportId').value = reportId;

    // Show modal
    document.getElementById('reviewModal').style.display = 'block';
}

// Approve report
async function approveReport(reportId) {
    try {
        if (confirm('Are you sure you want to approve this progress report?')) {
            // Update progress report status in Firebase
            const result = await updateProgressStatus(reportId, 'approved', 'Approved by admin');

            if (result.success) {
                alert('Progress report approved successfully');
                // Reload progress reports
                await loadProgressReports();
            } else {
                alert(`Failed to approve progress report: ${result.error}`);
            }
        }
    } catch (error) {
        console.error("Error approving progress report:", error);
        alert(`Error approving progress report: ${error.message}`);
    }
}

// Reject report
async function rejectReport(reportId) {
    try {
        const remarks = prompt('Please enter a reason for rejection:', '');
        if (remarks !== null) {  // User didn't cancel
            // Update progress report status in Firebase
            const result = await updateProgressStatus(reportId, 'rejected', remarks || 'Rejected by admin');

            if (result.success) {
                alert('Progress report rejected successfully');
                // Reload progress reports
                await loadProgressReports();
            } else {
                alert(`Failed to reject progress report: ${result.error}`);
            }
        }
    } catch (error) {
        console.error("Error rejecting progress report:", error);
        alert(`Error rejecting progress report: ${error.message}`);
    }
}

// View report details
function viewReport(reportId) {
    const report = progressReportsData.find(r => r.id === reportId);
    if (!report) {
        alert('Report not found');
        return;
    }

    // Find employee name
    const employee = employeesData.find(emp => emp.id === report.employeeId);
    const employeeName = employee ? (employee.name || employee.email) : (report.employeeName || 'Unknown');

    // Format the date and time
    const submittedDate = report.submittedAt ? new Date(report.submittedAt) : new Date(`${report.date}T${report.time}`);
    const formattedDate = submittedDate.toLocaleDateString();
    const formattedTime = report.time || submittedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Format the details for display
    let details = `
        Report ID: ${report.id}
        Employee: ${employeeName}
        Date: ${formattedDate}
        Time: ${formattedTime}
        Details: ${report.details}
        File: ${report.fileName || 'None'}
        Status: ${report.status || 'Pending'}
        Remarks: ${report.remarks || 'None'}
    `;

    alert(details);
}

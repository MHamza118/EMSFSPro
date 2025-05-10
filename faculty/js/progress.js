// Import Firebase functions
import { isLoggedIn, getUserRole, getCurrentUser, logoutUser, submitTaskProgress, getEmployeeProgressReports, getAllProgressReports } from '../../js/firebase-service.js';

// Global variables
let progressReportsData = [];
let currentUser = null;

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Check authentication
    if (!isLoggedIn()) {
        window.location.href = '../index.html';
        return;
    }

    console.log("Faculty progress reports page loaded");

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

    // Load progress reports
    await loadProgressReports();
});

// Set up all event listeners
function setupEventListeners() {
    // Handle progress form submission
    document.getElementById('progressForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const date = document.getElementById('progressDate').value;
        const details = document.getElementById('progressDetails').value;
        const file = document.getElementById('progressFile').files[0] ? document.getElementById('progressFile').files[0].name : null;

        // Disable submit button
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        try {
            // Get the employee ID (could be custom ID or UID)
            const employeeId = currentUser.employeeId || currentUser.uid;
            console.log("Using employee ID for submission:", employeeId);

            // Create progress report data
            const progressData = {
                employeeId: employeeId,
                employeeName: currentUser.displayName || currentUser.email,
                details: details,
                fileName: file,
                date: date,
                time: new Date().toTimeString().split(' ')[0].substring(0, 5)
            };

            // Submit progress report to Firebase
            const result = await submitTaskProgress(progressData);

            if (result.success) {
                alert('Progress report submitted successfully');

                // Reset form
                this.reset();

                // Reload progress reports
                await loadProgressReports();
            } else {
                alert(`Failed to submit progress report: ${result.error}`);
            }
        } catch (error) {
            console.error("Error submitting progress report:", error);
            alert(`Error submitting progress report: ${error.message}`);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Progress';
        }
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

// Load progress reports from Firebase
async function loadProgressReports() {
    try {
        console.log("Loading progress reports from Firebase");

        // Show loading indicator
        const reportsList = document.getElementById('previousReports');
        reportsList.innerHTML = '<tr><td colspan="6" class="text-center">Loading reports...</td></tr>';

        // Get progress reports for the current user
        const employeeId = currentUser.employeeId || currentUser.uid;
        console.log("Current user:", currentUser);
        console.log("Using employee ID for retrieval:", employeeId);

        // Get all progress reports first for debugging
        const allReports = await getAllProgressReports();
        console.log("All progress reports:", allReports);

        // Now get the employee's reports
        progressReportsData = await getEmployeeProgressReports(employeeId);

        // If no reports found, try with all possible IDs
        if (progressReportsData.length === 0 && allReports.length > 0) {
            console.log("No reports found with primary ID, checking all reports...");

            // Filter reports manually to find any that might belong to this user
            progressReportsData = allReports.filter(report => {
                // Check if the report's email matches the current user's email
                return (report.employeeName && currentUser.email &&
                    report.employeeName.toLowerCase() === currentUser.email.toLowerCase());
            });

            console.log("Reports found by email match:", progressReportsData.length);
        }

        console.log(`Loaded ${progressReportsData.length} progress reports for employee ${employeeId}`);

        // Display progress reports
        displayProgressReports(progressReportsData);

        return progressReportsData;
    } catch (error) {
        console.error("Error loading progress reports:", error);
        const reportsList = document.getElementById('previousReports');
        reportsList.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading reports</td></tr>';
        return [];
    }
}



// Display progress reports in the table
function displayProgressReports(reports) {
    const reportsList = document.getElementById('previousReports');
    reportsList.innerHTML = ''; // Clear existing content

    if (reports.length === 0) {
        reportsList.innerHTML = '<tr><td colspan="6" class="text-center">No progress reports found</td></tr>';
        return;
    }

    // Sort reports by date (newest first)
    reports.sort((a, b) => {
        const dateA = new Date(a.submittedAt || a.date);
        const dateB = new Date(b.submittedAt || b.date);
        return dateB - dateA;
    });

    reports.forEach(report => {
        // Format the date and time
        const submittedDate = report.submittedAt ? new Date(report.submittedAt) : new Date(`${report.date}T${report.time}`);
        const formattedDate = submittedDate.toLocaleDateString();
        const formattedTime = report.time || submittedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const row = document.createElement('tr');
        row.innerHTML = `
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
                <div class="remarks-container ${report.remarks ? 'has-remarks' : ''}">
                    <div class="remarks-content">${report.remarks || 'No remarks provided'}</div>
                    ${report.remarks ? `<button class="btn-view-remarks" data-remarks="${encodeURIComponent(report.remarks)}">View Full Remarks</button>` : ''}
                </div>
            </td>
        `;
        reportsList.appendChild(row);
    });

    // Add event listeners for the "View Full Remarks" buttons
    document.querySelectorAll('.btn-view-remarks').forEach(button => {
        button.addEventListener('click', function () {
            const remarks = decodeURIComponent(this.getAttribute('data-remarks'));
            showRemarksModal(remarks);
        });
    });
}

// Function to show the remarks modal
function showRemarksModal(remarks) {
    // Check if modal already exists, if not create it
    let modal = document.getElementById('remarksModal');

    if (!modal) {
        // Create modal elements
        modal = document.createElement('div');
        modal.id = 'remarksModal';
        modal.className = 'modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content remarks-modal-content';

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = `
            <h2>Admin Remarks</h2>
            <button class="close-modal">&times;</button>
        `;

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.innerHTML = `<div id="modalRemarks" class="full-remarks"></div>`;

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);

        // Add event listener to close button
        modal.querySelector('.close-modal').addEventListener('click', function () {
            modal.style.display = 'none';
        });

        // Close modal when clicking outside
        window.addEventListener('click', function (event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Set the remarks content
    document.getElementById('modalRemarks').textContent = remarks;

    // Show the modal
    modal.style.display = 'block';
}
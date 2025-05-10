// Check authentication
document.addEventListener('DOMContentLoaded', function () {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }

    const userData = JSON.parse(currentUser);
    console.log("Faculty dashboard - Current user:", userData);

    // Allow both 'faculty' and 'employee' roles to access faculty dashboard
    if (userData.role !== 'faculty' && userData.role !== 'employee') {
        console.log("Unauthorized role:", userData.role);
        window.location.href = '../index.html';
        return;
    }

    // Load dashboard data
    loadDashboardData();
});

// Logout functionality
document.getElementById('logout').addEventListener('click', function (e) {
    e.preventDefault();
    sessionStorage.removeItem('currentUser');
    window.location.href = '../index.html';
});

// Load dashboard data
function loadDashboardData() {
    // For now, we'll use mock data. Later this will be replaced with actual API calls
    const mockData = {
        notifications: [
            { id: 1, message: 'New task assigned', date: '2024-03-20' },
            { id: 2, message: 'Holiday request approved', date: '2024-03-19' }
        ],
        stats: {
            totalCheckIns: 45,
            totalCheckOuts: 45,
            lateCheckIns: 3,
            totalAbsences: 2
        },
        recentActivity: [
            { date: '2024-03-20', activity: 'Check In', status: 'On Time' },
            { date: '2024-03-20', activity: 'Check Out', status: 'Completed' },
            { date: '2024-03-19', activity: 'Holiday Request', status: 'Approved' }
        ]
    };

    // Update notifications
    const notificationsContainer = document.getElementById('notifications');
    mockData.notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.className = 'notification-item';
        notificationElement.innerHTML = `
            <p>${notification.message}</p>
            <small>${notification.date}</small>
        `;
        notificationsContainer.appendChild(notificationElement);
    });

    // Update stats
    document.getElementById('totalCheckIns').textContent = mockData.stats.totalCheckIns;
    document.getElementById('totalCheckOuts').textContent = mockData.stats.totalCheckOuts;
    document.getElementById('lateCheckIns').textContent = mockData.stats.lateCheckIns;
    document.getElementById('totalAbsences').textContent = mockData.stats.totalAbsences;

    // Update recent activity
    const activityContainer = document.getElementById('recentActivity');
    mockData.recentActivity.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${activity.date}</td>
            <td>${activity.activity}</td>
            <td>${activity.status}</td>
        `;
        activityContainer.appendChild(row);
    });
}

// Check In/Out functionality
document.getElementById('checkInBtn').addEventListener('click', function () {
    const currentTime = new Date();
    const checkInTime = currentTime.toLocaleTimeString();

    // For now, we'll just show an alert. Later this will be replaced with actual API call
    alert(`Checked in at ${checkInTime}`);
});

document.getElementById('checkOutBtn').addEventListener('click', function () {
    const currentTime = new Date();
    const checkOutTime = currentTime.toLocaleTimeString();

    // For now, we'll just show an alert. Later this will be replaced with actual API call
    alert(`Checked out at ${checkOutTime}`);
});

// Add Late Check-In functionality
document.getElementById('addLateCheckInBtn').addEventListener('click', function () {
    // For now, we'll just show an alert. Later this will be replaced with actual form
    alert('Late check-in form will be shown here');
});

// Request Holiday functionality
document.getElementById('requestHolidayBtn').addEventListener('click', function () {
    // For now, we'll just show an alert. Later this will be replaced with actual form
    alert('Holiday request form will be shown here');
});
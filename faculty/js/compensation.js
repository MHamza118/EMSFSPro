// Check authentication
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser || JSON.parse(currentUser).role !== 'faculty') {
        window.location.href = '../index.html';
        return;
    }

    // Load compensation history
    loadCompensationHistory();
});

// Handle compensation form submission
document.getElementById('compensationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const missedDate = document.getElementById('missedDate').value;
    const compensationDate = document.getElementById('compensationDate').value;
    const hours = document.getElementById('compensationHours').value;
    const reason = document.getElementById('compensationReason').value;
    
    // Validate dates
    const today = new Date();
    const selectedCompensationDate = new Date(compensationDate);
    
    if (selectedCompensationDate < today) {
        alert('Compensation date cannot be in the past');
        return;
    }
    
    // For now, we'll just show an alert. Later this will be replaced with actual API call
    alert(`Compensation request submitted for ${hours} hours on ${compensationDate}`);
    
    // Reset form
    this.reset();
    
    // Reload compensation history
    loadCompensationHistory();
});

// Load compensation history
function loadCompensationHistory() {
    // For now, we'll use mock data. Later this will be replaced with actual API calls
    const mockData = [
        {
            missedDate: '2024-03-15',
            compensationDate: '2024-03-20',
            hours: 4,
            reason: 'Medical appointment',
            status: 'approved'
        },
        {
            missedDate: '2024-03-18',
            compensationDate: '2024-03-25',
            hours: 6,
            reason: 'Family emergency',
            status: 'pending'
        }
    ];

    // Update compensation history table
    const historyContainer = document.getElementById('compensationHistory');
    historyContainer.innerHTML = '';
    
    mockData.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.missedDate}</td>
            <td>${record.compensationDate}</td>
            <td>${record.hours}</td>
            <td>${record.reason}</td>
            <td>
                <span class="status-badge status-${record.status}">
                    ${record.status}
                </span>
            </td>
        `;
        historyContainer.appendChild(row);
    });
} 
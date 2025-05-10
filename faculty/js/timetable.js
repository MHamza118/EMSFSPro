// Import Firebase functions
import { isLoggedIn, getUserRole, getCurrentUser, saveEmployeeTimetable, getEmployeeTimetable } from '../../js/firebase-service.js';

// Global variables
let currentDay = '';
let currentTimetable = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: []
};

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Check authentication
    if (!isLoggedIn()) {
        window.location.href = '../index.html';
        return;
    }

    console.log("Timetable page loaded");

    // Set up event listeners
    setupEventListeners();

    // Load timetable data
    await loadTimeTable();
});

// Set up all event listeners
function setupEventListeners() {
    // Modal functionality
    const modal = document.getElementById('addSlotModal');
    const closeModal = document.querySelector('.close-modal');

    // Add slot buttons
    document.querySelectorAll('.add-slot-btn').forEach(button => {
        button.addEventListener('click', function () {
            currentDay = this.dataset.day;
            modal.style.display = 'block';
        });
    });

    // Close modal button
    closeModal.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Add slot form submission
    document.getElementById('addSlotForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const startTimeInput = document.getElementById('startTime').value;
        const endTimeInput = document.getElementById('endTime').value;
        const slotType = document.getElementById('slotType').value;

        console.log(`Form submitted with start time: ${startTimeInput}, end time: ${endTimeInput}`);

        // HTML time inputs are in 24-hour format (HH:MM)
        // We'll use this format directly for consistency
        const startTime = startTimeInput;
        const endTime = endTimeInput;

        console.log(`Formatted times - start: ${startTime}, end: ${endTime}`);

        // Add time slot to UI and data
        addTimeSlot(currentDay, startTime, endTime, slotType);

        // Reset form and close modal
        this.reset();
        modal.style.display = 'none';
    });

    // Save timetable button
    document.getElementById('saveTimeTable').addEventListener('click', saveTimeTable);
}

// Load timetable data from Firebase
async function loadTimeTable() {
    // Clear existing timetable first
    clearTimetable();

    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'spinner';
    document.querySelector('.time-table-container').prepend(loadingIndicator);

    try {
        console.log("Loading timetable data from Firebase...");

        // Get current user
        const currentUser = getCurrentUser();
        if (!currentUser) {
            console.error("No current user found");
            return;
        }

        console.log("Current user:", currentUser.uid);

        // Try to load saved timetable for this user from Firebase
        const savedData = await getEmployeeTimetable(currentUser.uid);
        console.log("Saved timetable data:", savedData);

        if (savedData && savedData.timetable) {
            // Use saved data
            currentTimetable = savedData.timetable;

            // Show last updated time if available
            if (savedData.lastUpdated) {
                const lastUpdated = new Date(savedData.lastUpdated);
                const updateInfo = document.createElement('div');
                updateInfo.className = 'update-info';
                // Format date in ISO format YYYY-MM-DD
                const dateStr = lastUpdated.toISOString().split('T')[0];
                const timeStr = lastUpdated.toTimeString().split(' ')[0];
                updateInfo.textContent = `Last updated: ${dateStr} ${timeStr}`;
                document.querySelector('.card').appendChild(updateInfo);
            }
        }

        // Populate timetable with data
        Object.keys(currentTimetable).forEach(day => {
            currentTimetable[day].forEach(slot => {
                addTimeSlot(day, slot.start, slot.end, slot.type);
            });
        });

        console.log("Timetable loaded successfully");
    } catch (error) {
        console.error('Error loading timetable:', error);
        alert('Failed to load timetable. Please try again later.');
    } finally {
        // Remove loading indicator
        loadingIndicator.remove();
    }
}

// Clear timetable UI
function clearTimetable() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    days.forEach(day => {
        document.getElementById(`${day}Slots`).innerHTML = '';
    });
}

// Add time slot to the specified day
function addTimeSlot(day, startTime, endTime, type) {
    // Ensure time is in 24-hour format for consistency
    console.log(`Adding time slot: ${startTime} - ${endTime} (${type}) to ${day}`);

    // Format times to ensure consistency
    let formattedStartTime = startTime;
    let formattedEndTime = endTime;

    // Create slot element
    const slotsContainer = document.getElementById(`${day}Slots`);
    const slotElement = document.createElement('div');
    slotElement.className = `time-slot ${type.toLowerCase()}`;
    slotElement.innerHTML = `
        <div class="slot-time">${formattedStartTime} - ${formattedEndTime}</div>
        <div class="slot-type">${type}</div>
        <button class="btn btn-danger delete-slot">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add delete functionality
    const deleteBtn = slotElement.querySelector('.delete-slot');
    deleteBtn.addEventListener('click', function () {
        slotElement.remove();
    });

    // Add to UI
    slotsContainer.appendChild(slotElement);

    console.log(`Time slot added: ${formattedStartTime} - ${formattedEndTime}`);
}

// Save timetable to Firebase
async function saveTimeTable() {
    // Disable button to prevent multiple submissions
    const saveButton = document.getElementById('saveTimeTable');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
        console.log("Saving timetable to Firebase...");

        // Collect timetable data from UI
        const timetable = {};
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        days.forEach(day => {
            const slots = [];
            const slotElements = document.querySelectorAll(`#${day}Slots .time-slot`);

            slotElements.forEach(slot => {
                const time = slot.querySelector('.slot-time').textContent.split(' - ');
                const type = slot.querySelector('.slot-type').textContent;

                slots.push({
                    start: time[0],
                    end: time[1],
                    type: type
                });
            });

            timetable[day] = slots;
        });

        // Update current timetable data
        currentTimetable = timetable;

        // Get current user
        const currentUser = getCurrentUser();
        if (!currentUser) {
            alert('You must be logged in to save your timetable.');
            return;
        }

        console.log("Saving timetable for user:", currentUser.uid);

        // Save the timetable to Firebase using the user's UID
        const result = await saveEmployeeTimetable(currentUser.uid, timetable);

        // If the user has an employee ID that's different from their UID, save with that too
        // This ensures the timetable can be accessed from both the admin and faculty pages
        if (currentUser.employeeId && currentUser.employeeId !== currentUser.uid) {
            console.log("Also saving timetable with employee ID:", currentUser.employeeId);
            await saveEmployeeTimetable(currentUser.employeeId, timetable);
        }

        if (result.success) {
            console.log('Timetable saved successfully');

            // Update last updated time
            const now = new Date();
            // Format date in ISO format YYYY-MM-DD
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0];
            const formattedDateTime = `${dateStr} ${timeStr}`;

            const updateInfo = document.querySelector('.update-info');
            if (updateInfo) {
                updateInfo.textContent = `Last updated: ${formattedDateTime}`;
            } else {
                const newUpdateInfo = document.createElement('div');
                newUpdateInfo.className = 'update-info';
                newUpdateInfo.textContent = `Last updated: ${formattedDateTime}`;
                document.querySelector('.card').appendChild(newUpdateInfo);
            }

            alert('Timetable saved successfully!');
        } else {
            console.error("Failed to save timetable:", result.error);
            alert('Failed to save timetable: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving timetable:', error);
        alert('An error occurred while saving your timetable. Please try again.');
    } finally {
        // Re-enable button
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
    }
}
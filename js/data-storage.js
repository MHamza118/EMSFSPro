/**
 * Data Storage Module
 * Temporary solution for storing and retrieving data until Firebase integration
 */

// Key constants
const TIMETABLE_KEY = 'employee_timetables';
const EMPLOYEES_KEY = 'employees';

/**
 * Save an employee's timetable
 * @param {string} username - The employee's username
 * @param {Object} timetable - The timetable data
 */
function saveEmployeeTimetable(username, timetable) {
    // Get existing timetables or initialize empty object
    const timetables = JSON.parse(sessionStorage.getItem(TIMETABLE_KEY) || '{}');
    
    // Add or update this employee's timetable
    timetables[username] = {
        username: username,
        timetable: timetable,
        lastUpdated: new Date().toISOString()
    };
    
    // Save back to storage
    sessionStorage.setItem(TIMETABLE_KEY, JSON.stringify(timetables));
    
    // Make sure this employee is in the employees list
    addEmployeeIfNotExists(username);
}

/**
 * Get an employee's timetable
 * @param {string} username - The employee's username
 * @returns {Object|null} The timetable data or null if not found
 */
function getEmployeeTimetable(username) {
    const timetables = JSON.parse(sessionStorage.getItem(TIMETABLE_KEY) || '{}');
    return timetables[username] || null;
}

/**
 * Get all employee timetables
 * @returns {Object} All timetables
 */
function getAllTimetables() {
    return JSON.parse(sessionStorage.getItem(TIMETABLE_KEY) || '{}');
}

/**
 * Add an employee to the employees list if they don't exist
 * @param {string} username - The employee's username
 */
function addEmployeeIfNotExists(username) {
    const employees = JSON.parse(sessionStorage.getItem(EMPLOYEES_KEY) || '[]');
    
    // Check if employee already exists
    const exists = employees.some(emp => emp.username === username);
    
    if (!exists) {
        // Add the employee
        employees.push({
            id: generateEmployeeId(),
            username: username,
            name: username // Using username as name for now
        });
        
        // Save back to storage
        sessionStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
    }
}

/**
 * Get all employees
 * @returns {Array} Array of employee objects
 */
function getAllEmployees() {
    return JSON.parse(sessionStorage.getItem(EMPLOYEES_KEY) || '[]');
}

/**
 * Generate a unique employee ID
 * @returns {number} A unique ID
 */
function generateEmployeeId() {
    const employees = JSON.parse(sessionStorage.getItem(EMPLOYEES_KEY) || '[]');
    if (employees.length === 0) return 1;
    
    // Find the highest ID and add 1
    const maxId = Math.max(...employees.map(emp => emp.id));
    return maxId + 1;
}

/**
 * Get the current logged in user
 * @returns {Object|null} The current user or null if not logged in
 */
function getCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * Check if a user is logged in
 * @returns {boolean} True if logged in, false otherwise
 */
function isLoggedIn() {
    return sessionStorage.getItem('currentUser') !== null;
}

/**
 * Get the current user's role
 * @returns {string|null} The user's role or null if not logged in
 */
function getUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

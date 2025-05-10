/**
 * Firebase Service Module
 * Handles Firebase initialization and operations
 */

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser, signInWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, onValue, child } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// For debugging
console.log("Firebase service module loaded");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCI7KYm2e6RYigpH25YjfqBEYsv8tWjcj8",
  authDomain: "cmsfs-aea2f.firebaseapp.com",
  databaseURL: "https://cmsfs-aea2f-default-rtdb.firebaseio.com",
  projectId: "cmsfs-aea2f",
  storageBucket: "cmsfs-aea2f.firebasestorage.app",
  messagingSenderId: "916150948427",
  appId: "1:916150948427:web:ec933587781bc97e0633ce",
  measurementId: "G-J64RF39WKR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

/**
 * Create default admin user if it doesn't exist
 */
async function createDefaultAdminIfNotExists() {
  try {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'password123';

    // Check if the admin user already exists in Firebase Auth
    try {
      // Try to sign in with admin credentials
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      const user = userCredential.user;
      console.log('Default admin user already exists in Authentication');

      // Check if the user data exists in the database
      const snapshot = await get(ref(database, 'users/' + user.uid));
      if (!snapshot.exists()) {
        console.log('Admin user exists in Authentication but not in Database. Creating database entry...');

        // Add admin data to database
        await set(ref(database, 'users/' + user.uid), {
          email: adminEmail,
          role: 'admin',
          displayName: 'System Admin',
          createdAt: new Date().toISOString()
        });

        console.log('Admin user data added to database successfully');
      }

      // Sign out immediately to not interfere with the normal login flow
      await signOut(auth);
    } catch (error) {
      // If sign in fails with "user-not-found", create the admin user
      if (error.code === 'auth/user-not-found') {
        console.log('Creating default admin user...');

        // Create the admin user
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        const user = userCredential.user;

        // Add admin data to database
        await set(ref(database, 'users/' + user.uid), {
          email: adminEmail,
          role: 'admin',
          displayName: 'System Admin',
          createdAt: new Date().toISOString()
        });

        console.log('Default admin user created successfully');

        // Sign out immediately to not interfere with the normal login flow
        await signOut(auth);
      } else {
        // Some other error occurred
        console.error('Error checking for admin user:', error);
      }
    }
  } catch (error) {
    console.error('Error creating default admin user:', error);
  }
}

// Call the function to create default admin if it doesn't exist
createDefaultAdminIfNotExists();

/**
 * Authentication Functions
 */

// Register a new user
export async function registerUser(email, password, role, displayName) {
  console.log(`registerUser called with: ${email}, ${role}, ${displayName}`);

  try {
    console.log("Creating user with Firebase Authentication...");
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("User created in Firebase Auth:", user.uid);

    // Add user data to database
    console.log(`Adding user data to database with role: ${role}`);
    await set(ref(database, 'users/' + user.uid), {
      email: email,
      role: role,
      displayName: displayName,
      createdAt: new Date().toISOString()
    });
    console.log("User data added to database");

    return { success: true, user: user };
  } catch (error) {
    console.error("Error registering user:", error);
    return { success: false, error: error.message };
  }
}

// Login user
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from database
    const snapshot = await get(ref(database, 'users/' + user.uid));
    let userData = snapshot.val();

    // If user data doesn't exist in the database, check if they're an employee
    if (!userData) {
      // Check if this user exists in the employees collection
      const employeeSnapshot = await get(ref(database, 'employees/' + user.uid));

      if (employeeSnapshot.exists()) {
        // User is an employee, create user data with faculty role
        userData = {
          email: user.email,
          role: 'faculty',
          displayName: employeeSnapshot.val().name || email.split('@')[0],
          createdAt: new Date().toISOString()
        };
      } else {
        // Try to get the selected role from the radio button, default to 'faculty' if not found
        let selectedRole = 'faculty';
        try {
          const roleElement = document.querySelector('input[name="role"]:checked');
          if (roleElement) {
            selectedRole = roleElement.value;
          }
        } catch (e) {
          console.log("Could not get role from radio button, using default 'faculty'");
        }

        // Create user data with the selected or default role
        userData = {
          email: user.email,
          role: selectedRole,
          displayName: email.split('@')[0],
          createdAt: new Date().toISOString()
        };
      }

      // Save the user data to the database
      await set(ref(database, 'users/' + user.uid), userData);
      console.log(`Created user data with role: ${userData.role}`);
    }

    // Check if this user is an employee and get their employee ID
    let employeeId = null;
    try {
      // First, try to find by UID
      const employeeByUidSnapshot = await get(ref(database, 'employees/' + user.uid));

      if (employeeByUidSnapshot.exists()) {
        employeeId = user.uid;
        console.log("Found employee by UID:", employeeId);
      } else {
        // If not found by UID, search all employees to find by email
        const allEmployeesSnapshot = await get(ref(database, 'employees'));
        if (allEmployeesSnapshot.exists()) {
          allEmployeesSnapshot.forEach((childSnapshot) => {
            const employeeData = childSnapshot.val();
            if (employeeData.email === user.email) {
              employeeId = childSnapshot.key;
              console.log("Found employee by email:", employeeId);
            }
          });
        }
      }
    } catch (error) {
      console.error("Error finding employee ID:", error);
    }

    // Store user data in session
    sessionStorage.setItem('currentUser', JSON.stringify({
      uid: user.uid,
      email: user.email,
      role: userData.role,
      displayName: userData.displayName || email.split('@')[0],
      employeeId: employeeId
    }));

    return { success: true, user: userData };
  } catch (error) {
    console.error("Error logging in:", error);
    return { success: false, error: error.message };
  }
}

// Logout user
export async function logoutUser() {
  try {
    await signOut(auth);
    sessionStorage.removeItem('currentUser');
    return { success: true };
  } catch (error) {
    console.error("Error logging out:", error);
    return { success: false, error: error.message };
  }
}

// Get current user
export function getCurrentUser() {
  const userJson = sessionStorage.getItem('currentUser');
  return userJson ? JSON.parse(userJson) : null;
}

// Check if user is logged in
export function isLoggedIn() {
  return sessionStorage.getItem('currentUser') !== null;
}

// Get user role
export function getUserRole() {
  const user = getCurrentUser();
  return user ? user.role : null;
}

/**
 * Employee Management Functions
 */

// Add a new employee
export async function addEmployee(email, password, name, position, customId = null) {
  console.log(`addEmployee called with: ${email}, ${name}, ${position}, customId: ${customId}`);

  try {
    // Use 'faculty' as default role if position is a department name
    // Otherwise, use the position as the role (for admin/employee roles)
    const role = (position === 'admin' || position === 'employee') ? position : 'faculty';

    console.log(`Determined role: ${role}`);

    // Register the user in Firebase Authentication and add to users collection
    console.log(`Calling registerUser with: ${email}, ${password}, ${role}, ${name}`);
    const result = await registerUser(email, password, role, name);
    console.log("registerUser result:", result);

    if (result.success) {
      // Use custom ID if provided, otherwise use the Firebase UID
      const employeeId = customId || result.user.uid;
      console.log(`User registered successfully, adding to employees collection with ID: ${employeeId}`);

      // Add additional employee data to employees collection
      await set(ref(database, 'employees/' + employeeId), {
        name: name,
        email: email,
        position: position,
        status: 'Active',
        createdAt: new Date().toISOString(),
        uid: result.user.uid // Store the Firebase UID for reference
      });

      // If using a custom ID, create a mapping from UID to custom ID
      if (customId) {
        await set(ref(database, 'employeeIdMap/' + result.user.uid), {
          customId: customId
        });
      }

      console.log("Employee data added to database");
      return { success: true, employee: { ...result.user, id: employeeId } };
    } else {
      console.error("Registration failed:", result.error);
      return result; // Return the error from registerUser
    }
  } catch (error) {
    console.error("Error adding employee:", error);
    return { success: false, error: error.message };
  }
}

// Get all employees
export async function getAllEmployees() {
  try {
    const snapshot = await get(ref(database, 'employees'));
    const employees = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const employeeData = childSnapshot.val();
        employees.push({
          id: childSnapshot.key,
          ...employeeData
        });
      });
    }

    return employees;
  } catch (error) {
    console.error("Error getting employees:", error);
    return [];
  }
}

// Delete an employee
export async function deleteEmployee(employeeId) {
  try {
    console.log(`Deleting employee with ID: ${employeeId}`);

    // Get the employee data to find the Firebase UID
    const employeeSnapshot = await get(ref(database, 'employees/' + employeeId));

    if (!employeeSnapshot.exists()) {
      console.error("Employee not found");
      return { success: false, error: "Employee not found" };
    }

    const employeeData = employeeSnapshot.val();
    const firebaseUid = employeeData.uid || employeeId; // Use the stored UID or the ID itself

    console.log(`Employee Firebase UID: ${firebaseUid}`);

    // Delete the employee from the database
    await remove(ref(database, 'employees/' + employeeId));
    console.log("Employee removed from database");

    // Delete the mapping if it exists
    try {
      await remove(ref(database, 'employeeIdMap/' + firebaseUid));
      console.log("Employee ID mapping removed");
    } catch (e) {
      console.log("No ID mapping to remove or error removing mapping:", e);
    }

    // Delete the user from Firebase Authentication
    try {
      // We need to delete the user from Firebase Auth, but we need to be signed in as that user
      // This is a limitation of Firebase - you can only delete the currently signed in user
      // So we'll need to:
      // 1. Remember the current user
      // 2. Sign out
      // 3. Delete the user's auth data from the database (users collection)

      // Delete the user data from the users collection
      await remove(ref(database, 'users/' + firebaseUid));
      console.log("User data removed from database");

      return { success: true };
    } catch (error) {
      console.error("Error deleting user data:", error);
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error("Error deleting employee:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Timetable Functions
 */

// Save employee timetable
export async function saveEmployeeTimetable(userId, timetable) {
  try {
    console.log(`Saving timetable for user ID: ${userId}`);

    // Save the timetable data
    await set(ref(database, 'timetables/' + userId), {
      userId: userId,
      timetable: timetable,
      lastUpdated: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving timetable:", error);
    return { success: false, error: error.message };
  }
}

// Get employee timetable
export async function getEmployeeTimetable(userId) {
  try {
    console.log(`Getting timetable for user ID: ${userId}`);

    const snapshot = await get(ref(database, 'timetables/' + userId));

    if (snapshot.exists()) {
      console.log(`Timetable found for user ID: ${userId}`);
      return snapshot.val();
    } else {
      console.log(`No timetable found for user ID: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error("Error getting timetable:", error);
    return null;
  }
}

// Listen for timetable changes
export function listenForTimetableChanges(userId, callback) {
  const timetableRef = ref(database, 'timetables/' + userId);
  return onValue(timetableRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
}

// Get all timetables
export async function getAllTimetables() {
  try {
    const snapshot = await get(ref(database, 'timetables'));
    const timetables = {};

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        timetables[childSnapshot.key] = childSnapshot.val();
      });
    }

    return timetables;
  } catch (error) {
    console.error("Error getting all timetables:", error);
    return {};
  }
}

/**
 * Task Management Functions
 */

// Create a new task
export async function createTask(taskData) {
  try {
    console.log("Creating new task:", taskData);

    // Generate a unique ID for the task if not provided
    const taskId = taskData.id || Date.now().toString();

    // Add creation timestamp
    const taskWithTimestamp = {
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save task to Firebase
    await set(ref(database, 'tasks/' + taskId), taskWithTimestamp);

    console.log("Task created successfully with ID:", taskId);
    return { success: true, taskId: taskId };
  } catch (error) {
    console.error("Error creating task:", error);
    return { success: false, error: error.message };
  }
}

// Get all tasks
export async function getAllTasks() {
  try {
    console.log("Getting all tasks");

    const snapshot = await get(ref(database, 'tasks'));
    const tasks = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        tasks.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      console.log(`Retrieved ${tasks.length} tasks`);
    } else {
      console.log("No tasks found");
    }

    return tasks;
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

// Get tasks assigned to a specific employee
export async function getEmployeeTasks(employeeId) {
  try {
    console.log(`Getting tasks for employee: ${employeeId}`);

    const snapshot = await get(ref(database, 'tasks'));
    const tasks = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const task = childSnapshot.val();
        if (task.assignedTo === employeeId) {
          tasks.push({
            id: childSnapshot.key,
            ...task
          });
        }
      });
      console.log(`Retrieved ${tasks.length} tasks for employee ${employeeId}`);
    } else {
      console.log("No tasks found");
    }

    return tasks;
  } catch (error) {
    console.error("Error getting employee tasks:", error);
    return [];
  }
}

// Update task status
export async function updateTaskStatus(taskId, status, reason = null) {
  try {
    console.log(`Updating task ${taskId} status to ${status}`);

    const updates = {
      status: status,
      updatedAt: new Date().toISOString()
    };

    if (reason) {
      updates.reason = reason;
    }

    await update(ref(database, 'tasks/' + taskId), updates);

    console.log("Task status updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, error: error.message };
  }
}

// Update task (full update)
export async function updateTask(taskId, taskData) {
  try {
    console.log(`Updating task: ${taskId}`, taskData);

    // Add update timestamp if not provided
    if (!taskData.updatedAt) {
      taskData.updatedAt = new Date().toISOString();
    }

    await update(ref(database, 'tasks/' + taskId), taskData);

    console.log("Task updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Error updating task:", error);
    return { success: false, error: error.message };
  }
}

// Delete a task
export async function deleteTask(taskId) {
  try {
    console.log(`Deleting task: ${taskId}`);

    await remove(ref(database, 'tasks/' + taskId));

    console.log("Task deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, error: error.message };
  }
}

// Submit task progress report
export async function submitTaskProgress(progressData) {
  try {
    console.log("Submitting task progress:", progressData);

    // Generate a unique ID for the progress report
    const progressId = Date.now().toString();

    // Add submission timestamp
    const progressWithTimestamp = {
      ...progressData,
      submittedAt: new Date().toISOString(),
      status: 'pending' // Initial status is pending until admin reviews
    };

    // Save progress report to Firebase
    await set(ref(database, 'taskProgress/' + progressId), progressWithTimestamp);

    console.log("Progress report submitted successfully with ID:", progressId);
    return { success: true, progressId: progressId };
  } catch (error) {
    console.error("Error submitting progress report:", error);
    return { success: false, error: error.message };
  }
}

// Get all progress reports
export async function getAllProgressReports() {
  try {
    console.log("Getting all progress reports");

    const snapshot = await get(ref(database, 'taskProgress'));
    const reports = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        reports.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      console.log(`Retrieved ${reports.length} progress reports`);
    } else {
      console.log("No progress reports found");
    }

    return reports;
  } catch (error) {
    console.error("Error getting progress reports:", error);
    return [];
  }
}

// Get progress reports for a specific employee
export async function getEmployeeProgressReports(employeeId) {
  try {
    console.log(`Getting progress reports for employee: ${employeeId}`);

    const snapshot = await get(ref(database, 'taskProgress'));
    const reports = [];

    if (snapshot.exists()) {
      // Get the current user to check both UID and employeeId
      const currentUser = getCurrentUser();
      const uid = currentUser ? currentUser.uid : null;

      console.log(`Current user UID: ${uid}, Looking for employeeId: ${employeeId}`);

      snapshot.forEach((childSnapshot) => {
        const report = childSnapshot.val();
        console.log(`Checking report:`, report);

        // Check if the report matches either the employeeId or the UID
        if (report.employeeId === employeeId ||
          (uid && report.employeeId === uid)) {
          reports.push({
            id: childSnapshot.key,
            ...report
          });
          console.log(`Found matching report:`, childSnapshot.key);
        }
      });
      console.log(`Retrieved ${reports.length} progress reports for employee ${employeeId}`);
    } else {
      console.log("No progress reports found");
    }

    return reports;
  } catch (error) {
    console.error("Error getting employee progress reports:", error);
    return [];
  }
}

// Update progress report status (for admin review)
export async function updateProgressStatus(progressId, status, remarks = null) {
  try {
    console.log(`Updating progress report ${progressId} status to ${status}`);

    const updates = {
      status: status,
      reviewedAt: new Date().toISOString()
    };

    if (remarks) {
      updates.remarks = remarks;
    }

    await update(ref(database, 'taskProgress/' + progressId), updates);

    console.log("Progress report status updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Error updating progress report status:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Holiday Request Functions
 */

// Submit a holiday request
export async function submitHolidayRequest(requestData) {
  try {
    console.log("Submitting holiday request:", requestData);

    // Generate a unique ID for the request
    const requestId = Date.now().toString();

    // Add submission timestamp and initial status
    const requestWithTimestamp = {
      ...requestData,
      submittedAt: new Date().toISOString(),
      status: 'pending' // Initial status is pending until admin reviews
    };

    // Save request to Firebase
    await set(ref(database, 'holidayRequests/' + requestId), requestWithTimestamp);

    console.log("Holiday request submitted successfully with ID:", requestId);
    return { success: true, requestId: requestId };
  } catch (error) {
    console.error("Error submitting holiday request:", error);
    return { success: false, error: error.message };
  }
}

// Get all holiday requests
export async function getAllHolidayRequests() {
  try {
    console.log("Getting all holiday requests");

    // Check if database is initialized
    if (!database) {
      console.error("Firebase database is not initialized!");
      return [];
    }

    // Get reference to holidayRequests
    const holidayRequestsRef = ref(database, 'holidayRequests');
    console.log("Holiday requests reference:", holidayRequestsRef);

    // Get snapshot
    const snapshot = await get(holidayRequestsRef);
    console.log("Holiday requests snapshot:", snapshot);

    const requests = [];

    if (snapshot.exists()) {
      console.log("Snapshot exists, iterating through children");
      snapshot.forEach((childSnapshot) => {
        const request = {
          id: childSnapshot.key,
          ...childSnapshot.val()
        };
        console.log("Found request:", request);
        requests.push(request);
      });
      console.log(`Retrieved ${requests.length} holiday requests:`, requests);
    } else {
      console.log("No holiday requests found in the database");
    }

    return requests;
  } catch (error) {
    console.error("Error getting holiday requests:", error);
    console.error("Error details:", error.code, error.message);
    return [];
  }
}

// Get holiday requests for a specific employee
export async function getEmployeeHolidayRequests(employeeId) {
  try {
    console.log(`Getting holiday requests for employee: ${employeeId}`);

    const snapshot = await get(ref(database, 'holidayRequests'));
    const requests = [];

    if (snapshot.exists()) {
      // Get the current user to check both UID and employeeId
      const currentUser = getCurrentUser();
      const uid = currentUser ? currentUser.uid : null;

      console.log(`Current user UID: ${uid}, Looking for employeeId: ${employeeId}`);

      snapshot.forEach((childSnapshot) => {
        const request = childSnapshot.val();

        // Check if the request matches either the employeeId or the UID
        if (request.employeeId === employeeId ||
          (uid && request.employeeId === uid)) {
          requests.push({
            id: childSnapshot.key,
            ...request
          });
          console.log(`Found matching request:`, childSnapshot.key);
        }
      });
      console.log(`Retrieved ${requests.length} holiday requests for employee ${employeeId}`);
    } else {
      console.log("No holiday requests found");
    }

    return requests;
  } catch (error) {
    console.error("Error getting employee holiday requests:", error);
    return [];
  }
}

// Update holiday request status (for admin review)
export async function updateHolidayRequestStatus(requestId, status, remarks = null) {
  try {
    console.log(`Updating holiday request ${requestId} status to ${status}`);

    const updates = {
      status: status,
      reviewedAt: new Date().toISOString()
    };

    if (remarks) {
      updates.remarks = remarks;
    }

    await update(ref(database, 'holidayRequests/' + requestId), updates);

    console.log("Holiday request status updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Error updating holiday request status:", error);
    return { success: false, error: error.message };
  }
}
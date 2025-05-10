/**
 * Check-in Service Module
 * Handles employee check-in functionality, rules, and validation
 */

import { getDatabase, ref, set, get, update, remove, onValue, push } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { getEmployeeTimetable, getCurrentUser } from './firebase-service.js';

// Get database reference
const database = getDatabase();

/**
 * Check-in Window Constants
 */
const EARLY_WINDOW_HOURS = 1; // Can check in up to 1 hour before scheduled time
const LATE_WINDOW_MINUTES = 30; // Regular check-in allowed up to 30 minutes after scheduled time
const LATE_CHECKIN_WINDOW_HOURS = 2; // Late check-in allowed up to 2 hours after scheduled time
const LATE_CHECKIN_INTERVAL_MINUTES = 30; // Minimum interval between late check-ins

/**
 * Get the current day of the week in lowercase
 * @returns {string} The current day (monday, tuesday, etc.)
 */
function getCurrentDay() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = new Date().getDay();
    return days[dayIndex];
}

/**
 * Convert time string to Date object
 * @param {string} timeStr - Time string in format "HH:MM AM/PM" or "HH:MM" (24-hour)
 * @returns {Date} Date object representing the time today
 */
function timeStringToDate(timeStr) {
    if (!timeStr) {
        console.error('Invalid time string:', timeStr);
        return new Date(); // Return current time as fallback
    }

    console.log(`Converting time string to date: "${timeStr}"`);

    const now = new Date();
    let hours, minutes;

    // Check if the time string contains AM/PM (12-hour format)
    if (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm')) {
        // 12-hour format with AM/PM
        const [timePart, meridiem] = timeStr.split(' ');
        [hours, minutes] = timePart.split(':').map(num => parseInt(num, 10));

        // Convert to 24-hour format
        if (meridiem.toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
        } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
        }
    } else {
        // 24-hour format (HH:MM)
        [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    }

    console.log(`Parsed time: ${hours}:${minutes} (24-hour format)`);

    // Create and return the date object
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
}

/**
 * Format a Date object to time string
 * @param {Date} date - The date object
 * @param {boolean} use24Hour - Whether to use 24-hour format (true) or 12-hour format with AM/PM (false)
 * @returns {string} Formatted time string
 */
function formatTimeString(date, use24Hour = false) {
    if (!date || !(date instanceof Date) || isNaN(date)) {
        console.error('Invalid date object:', date);
        return '';
    }

    try {
        if (use24Hour) {
            // 24-hour format (for timetable compatibility)
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } else {
            // 12-hour format with AM/PM
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
    } catch (error) {
        console.error('Error formatting time string:', error);
        return '';
    }
}

/**
 * Standardize time format for comparison
 * @param {string} timeStr - Time string in either 12-hour or 24-hour format
 * @returns {string} Standardized time string in 24-hour format
 */
function standardizeTimeFormat(timeStr) {
    if (!timeStr) {
        console.error('Invalid time string for standardization:', timeStr);
        return '';
    }

    console.log(`Standardizing time format: "${timeStr}"`);

    try {
        // Convert to Date object first (handles both formats)
        const dateObj = timeStringToDate(timeStr);

        // Then convert back to 24-hour string format
        return dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (error) {
        console.error('Error standardizing time format:', error, 'for time string:', timeStr);
        return timeStr; // Return original as fallback
    }
}

/**
 * Get the current time slots for today from employee's timetable
 * @param {string} userId - The employee's user ID
 * @returns {Promise<Array>} Array of time slots for today
 */
export async function getTodayTimeSlots(userId) {
    try {
        const timetableData = await getEmployeeTimetable(userId);
        if (!timetableData || !timetableData.timetable) {
            console.log('No timetable found for user');
            return [];
        }

        const day = getCurrentDay();
        const todaySlots = timetableData.timetable[day] || [];

        // Sort slots by start time
        return todaySlots.sort((a, b) => {
            const timeA = timeStringToDate(a.start);
            const timeB = timeStringToDate(b.start);
            return timeA - timeB;
        });
    } catch (error) {
        console.error('Error getting today time slots:', error);
        return [];
    }
}

/**
 * Check if the current time is within the valid check-in window for a time slot
 * @param {Object} slot - The time slot object with start and end times
 * @returns {Object} Result with isValid and status
 */
export function isWithinCheckInWindow(slot) {
    if (!slot || !slot.start) {
        console.error('Invalid slot for check-in window check:', slot);
        return { isValid: false, status: 'invalid', error: 'Invalid time slot' };
    }

    console.log(`Checking if current time is within check-in window for slot:`, slot);

    try {
        const now = new Date();
        console.log(`Current time: ${now.toLocaleTimeString()}`);

        // Convert slot start time to Date object, handling both formats
        const startTime = timeStringToDate(slot.start);
        console.log(`Slot start time: ${startTime.toLocaleTimeString()} (converted from ${slot.start})`);

        // Calculate early window (1 hour before start time)
        const earlyWindow = new Date(startTime);
        earlyWindow.setHours(earlyWindow.getHours() - EARLY_WINDOW_HOURS);
        console.log(`Early window starts at: ${earlyWindow.toLocaleTimeString()}`);

        // Calculate late window (30 minutes after start time)
        const lateWindow = new Date(startTime);
        lateWindow.setMinutes(lateWindow.getMinutes() + LATE_WINDOW_MINUTES);
        console.log(`Late window ends at: ${lateWindow.toLocaleTimeString()}`);

        // Calculate late check-in window (2 hours after start time)
        const lateCheckInWindow = new Date(startTime);
        lateCheckInWindow.setHours(lateCheckInWindow.getHours() + LATE_CHECKIN_WINDOW_HOURS);
        console.log(`Late check-in window ends at: ${lateCheckInWindow.toLocaleTimeString()}`);

        if (now >= earlyWindow && now <= startTime) {
            // Early or on-time check-in
            console.log(`Result: Early or on-time check-in`);
            return {
                isValid: true,
                status: 'on-time',
                message: `You are within the regular check-in window (up to ${formatTimeString(startTime)})`
            };
        } else if (now > startTime && now <= lateWindow) {
            // Slightly late but within regular window
            console.log(`Result: Slightly late but within regular window`);
            return {
                isValid: true,
                status: 'slightly-late',
                message: `You are slightly late but within the regular check-in window (up to ${formatTimeString(lateWindow)})`
            };
        } else if (now > lateWindow && now <= lateCheckInWindow) {
            // Late check-in required
            console.log(`Result: Late check-in required`);
            return {
                isValid: false,
                status: 'late',
                requiresLateCheckIn: true,
                error: `You are more than ${LATE_WINDOW_MINUTES} minutes late. Please use the late check-in option.`,
                lateWindowEnd: formatTimeString(lateCheckInWindow)
            };
        } else if (now < earlyWindow) {
            // Too early for check-in
            console.log(`Result: Too early for check-in`);
            return {
                isValid: false,
                status: 'early',
                error: `It's too early to check in. Check-in window opens at ${formatTimeString(earlyWindow)}.`
            };
        } else {
            // Too late for any check-in
            console.log(`Result: Too late for any check-in`);
            return {
                isValid: false,
                status: 'invalid',
                error: `You are too late for check-in. The late check-in window closed at ${formatTimeString(lateCheckInWindow)}.`
            };
        }
    } catch (error) {
        console.error('Error checking check-in window:', error);
        return { isValid: false, status: 'error', error: error.message };
    }
}

/**
 * Get the next available time slot for check-in
 * @param {string} userId - The employee's user ID
 * @param {Array} existingCheckIns - Optional array of existing check-ins for today
 * @returns {Promise<Object>} The next available slot or null
 */
export async function getNextAvailableSlot(userId, existingCheckIns = []) {
    try {
        const todaySlots = await getTodayTimeSlots(userId);
        if (todaySlots.length === 0) {
            return null;
        }

        const now = new Date();

        // Find the next slot that hasn't ended yet and hasn't been checked in
        for (const slot of todaySlots) {
            const startTime = timeStringToDate(slot.start);
            const endTime = timeStringToDate(slot.end);

            // Skip slots that have already ended
            if (endTime <= now) {
                continue;
            }

            // Check if this slot already has an active check-in (not checked out)
            const hasActiveCheckIn = existingCheckIns.some(checkIn => {
                // Skip check-outs
                if (checkIn.isCheckOut) {
                    return false;
                }

                // Check if this check-in is for the current slot
                const checkInSlotStart = checkIn.slotStart;
                const checkInSlotEnd = checkIn.slotEnd;

                return checkInSlotStart === slot.start && checkInSlotEnd === slot.end;
            });

            // If this slot has no active check-in, it's available
            if (!hasActiveCheckIn) {
                return slot;
            }
        }

        return null; // No more available slots today
    } catch (error) {
        console.error('Error getting next available slot:', error);
        return null;
    }
}

/**
 * Check if a late check-in is allowed based on previous late check-ins
 * @param {string} userId - The employee's user ID
 * @param {string} todayDate - Today's date in YYYY-MM-DD format
 * @returns {Promise<Object>} Result with isAllowed and reason
 */
async function isLateCheckInAllowed(userId, todayDate) {
    try {
        // Get check-ins for today
        const checkInsRef = ref(database, `attendance/${userId}/${todayDate}`);
        const checkInsSnapshot = await get(checkInsRef);

        if (!checkInsSnapshot.exists()) {
            // No check-ins today, late check-in is allowed
            return { isAllowed: true };
        }

        const checkInsData = checkInsSnapshot.val();
        if (!checkInsData.checkIns || !Array.isArray(checkInsData.checkIns) || checkInsData.checkIns.length === 0) {
            // No check-ins today, late check-in is allowed
            return { isAllowed: true };
        }

        // Find the most recent late check-in
        const lateCheckIns = checkInsData.checkIns.filter(checkIn => checkIn.isLate);
        if (lateCheckIns.length === 0) {
            // No late check-ins today, late check-in is allowed
            return { isAllowed: true };
        }

        // Sort late check-ins by timestamp (newest first)
        lateCheckIns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Get the most recent late check-in
        const latestLateCheckIn = lateCheckIns[0];
        const latestTimestamp = new Date(latestLateCheckIn.timestamp);
        const now = new Date();

        // Calculate time difference in minutes
        const timeDiffMinutes = Math.floor((now - latestTimestamp) / (1000 * 60));

        // Check if enough time has passed since the last late check-in
        if (timeDiffMinutes < LATE_CHECKIN_INTERVAL_MINUTES) {
            return {
                isAllowed: false,
                reason: `You must wait at least ${LATE_CHECKIN_INTERVAL_MINUTES} minutes between late check-ins. Please try again in ${LATE_CHECKIN_INTERVAL_MINUTES - timeDiffMinutes} minutes.`
            };
        }

        return { isAllowed: true };
    } catch (error) {
        console.error('Error checking late check-in allowance:', error);
        return {
            isAllowed: false,
            reason: `Error checking late check-in allowance: ${error.message}`
        };
    }
}

/**
 * Ensure user has a timetable, create a default one if not
 * @param {string} userId - The employee's user ID
 * @returns {Promise<boolean>} True if timetable exists or was created
 */
async function ensureUserHasTimetable(userId) {
    try {
        console.log(`Ensuring user ${userId} has a timetable`);

        // Try to get the user's timetable
        const timetableData = await getEmployeeTimetable(userId);

        if (timetableData && timetableData.timetable) {
            console.log(`User ${userId} already has a timetable`);
            return true;
        }

        console.log(`No timetable found for user ${userId}, creating a default one`);

        // Create a default timetable with office hours 9 AM to 5 PM on weekdays
        const defaultTimetable = {
            monday: [{ start: '09:00', end: '17:00', type: 'Office Hours' }],
            tuesday: [{ start: '09:00', end: '17:00', type: 'Office Hours' }],
            wednesday: [{ start: '09:00', end: '17:00', type: 'Office Hours' }],
            thursday: [{ start: '09:00', end: '17:00', type: 'Office Hours' }],
            friday: [{ start: '09:00', end: '17:00', type: 'Office Hours' }],
            saturday: [],
            sunday: []
        };

        // Save the default timetable
        const result = await saveEmployeeTimetable(userId, defaultTimetable);

        if (result.success) {
            console.log(`Default timetable created for user ${userId}`);
            return true;
        } else {
            console.error(`Failed to create default timetable for user ${userId}:`, result.error);
            return false;
        }
    } catch (error) {
        console.error(`Error ensuring user has timetable:`, error);
        return false;
    }
}

/**
 * Record a check-in for the employee
 * @param {string} userId - The employee's user ID
 * @param {boolean} isLate - Whether this is a late check-in
 * @param {string} reason - Reason for late check-in (if applicable)
 * @returns {Promise<Object>} Result of the check-in operation
 */
export async function recordCheckIn(userId, isLate = false, reason = '') {
    try {
        const user = getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not logged in' };
        }

        const now = new Date();
        const todayDate = now.toISOString().split('T')[0];
        const checkInTime = formatTimeString(now);
        const checkInTime24h = formatTimeString(now, true);

        // Ensure the user has a timetable
        await ensureUserHasTimetable(userId);

        // Get today's slots
        const todaySlots = await getTodayTimeSlots(userId);
        if (todaySlots.length === 0) {
            console.log(`No schedule set for today for user ${userId}`);

            // Try with alternative user IDs
            const currentUser = getCurrentUser();
            if (currentUser) {
                if (currentUser.uid && currentUser.uid !== userId) {
                    console.log(`Trying with UID: ${currentUser.uid}`);
                    await ensureUserHasTimetable(currentUser.uid);
                    const uidSlots = await getTodayTimeSlots(currentUser.uid);
                    if (uidSlots.length > 0) {
                        console.log(`Found schedule using UID: ${currentUser.uid}`);
                        return await recordCheckIn(currentUser.uid, isLate, reason);
                    }
                }

                if (currentUser.employeeId && currentUser.employeeId !== userId && currentUser.employeeId !== currentUser.uid) {
                    console.log(`Trying with employeeId: ${currentUser.employeeId}`);
                    await ensureUserHasTimetable(currentUser.employeeId);
                    const empIdSlots = await getTodayTimeSlots(currentUser.employeeId);
                    if (empIdSlots.length > 0) {
                        console.log(`Found schedule using employeeId: ${currentUser.employeeId}`);
                        return await recordCheckIn(currentUser.employeeId, isLate, reason);
                    }
                }
            }

            // If we still don't have a schedule, create a default check-in without a schedule
            console.log(`Creating default check-in without a schedule for user ${userId}`);

            const checkInsRef = ref(database, `attendance/${userId}/${todayDate}`);
            const checkInsSnapshot = await get(checkInsRef);
            const checkInsData = checkInsSnapshot.exists() ? checkInsSnapshot.val() : { checkIns: [] };

            // Initialize checkIns array if it doesn't exist
            if (!checkInsData.checkIns) {
                checkInsData.checkIns = [];
            }

            // Create a default check-in record
            const defaultCheckInRecord = {
                time: checkInTime,
                time24h: checkInTime24h, // Use directly calculated 24h time
                isLate: isLate,
                reason: isLate ? reason : '',
                isCheckOut: false,
                timestamp: now.toISOString(),
                isDefaultCheckIn: true // Mark as a default check-in
            };

            // Add to check-ins array
            checkInsData.checkIns.push(defaultCheckInRecord);

            // Save to database
            await set(checkInsRef, checkInsData);
            console.log(`Default check-in saved for user ${userId}`);

            // Also save to alternative user IDs
            if (currentUser) {
                if (currentUser.uid && currentUser.uid !== userId) {
                    const uidCheckInsRef = ref(database, `attendance/${currentUser.uid}/${todayDate}`);
                    await set(uidCheckInsRef, checkInsData);
                }

                if (currentUser.employeeId && currentUser.employeeId !== userId && currentUser.employeeId !== currentUser.uid) {
                    const empIdCheckInsRef = ref(database, `attendance/${currentUser.employeeId}/${todayDate}`);
                    await set(empIdCheckInsRef, checkInsData);
                }
            }

            return {
                success: true,
                message: isLate ? 'Late check-in recorded' : 'Check-in successful',
                checkInTime: checkInTime,
                checkInTime24h: checkInTime24h,
                isDefaultCheckIn: true
            };
        }

        // Get existing check-ins for today
        const checkInsRef = ref(database, `attendance/${userId}/${todayDate}`);
        const checkInsSnapshot = await get(checkInsRef);
        const checkInsData = checkInsSnapshot.exists() ? checkInsSnapshot.val() : { checkIns: [] };

        // Initialize checkIns array if it doesn't exist
        if (!checkInsData.checkIns) {
            checkInsData.checkIns = [];
        }

        // If this is a late check-in, check if it's allowed
        if (isLate) {
            // Check if late check-in is allowed based on interval
            const lateCheckInAllowed = await isLateCheckInAllowed(userId, todayDate);
            if (!lateCheckInAllowed.isAllowed) {
                return { success: false, error: lateCheckInAllowed.reason };
            }

            // Require a reason for late check-in
            if (!reason) {
                return { success: false, error: 'A reason is required for late check-in' };
            }
        }

        // Find the current slot, passing existing check-ins to avoid slots that already have active check-ins
        const currentSlot = await getNextAvailableSlot(userId, checkInsData.checkIns);
        if (!currentSlot) {
            return { success: false, error: 'No available time slots for check-in' };
        }

        // Check if already checked in for this slot
        const slotStartTime = timeStringToDate(currentSlot.start);
        const slotEndTime = timeStringToDate(currentSlot.end);

        // Only check for existing check-ins if there are any
        let existingCheckIn = null;
        if (checkInsData.checkIns.length > 0) {
            existingCheckIn = checkInsData.checkIns.find(checkIn => {
                // Skip check-outs
                if (checkIn.isCheckOut) {
                    return false;
                }

                // Check if this check-in is for the current slot
                const checkInSlotStart = checkIn.slotStart;
                const checkInSlotEnd = checkIn.slotEnd;

                return checkInSlotStart === currentSlot.start && checkInSlotEnd === currentSlot.end && !checkIn.isCheckOut;
            });
        }

        if (existingCheckIn) {
            return { success: false, error: 'Already checked in for this time slot' };
        }

        // For regular check-ins, verify we're within the check-in window
        if (!isLate) {
            const checkInStatus = isWithinCheckInWindow(currentSlot);
            if (!checkInStatus.isValid) {
                if (checkInStatus.requiresLateCheckIn) {
                    return {
                        success: false,
                        error: 'You are more than 30 minutes late. Please use the late check-in option.',
                        requiresLateCheckIn: true
                    };
                } else {
                    return {
                        success: false,
                        error: 'You are outside the valid check-in window for this time slot'
                    };
                }
            }
        } else {
            // For late check-ins, verify we're within the late check-in window
            const now = new Date();
            const startTime = timeStringToDate(currentSlot.start);
            const lateCheckInWindow = new Date(startTime);
            lateCheckInWindow.setHours(lateCheckInWindow.getHours() + LATE_CHECKIN_WINDOW_HOURS);

            if (now > lateCheckInWindow) {
                return {
                    success: false,
                    error: `Late check-in is only allowed up to ${LATE_CHECKIN_WINDOW_HOURS} hours after the scheduled time`
                };
            }
        }

        // Create check-in record with standardized time formats
        const checkInRecord = {
            time: checkInTime,
            time24h: checkInTime24h, // Use directly calculated 24h time
            isLate: isLate,
            reason: isLate ? reason : '',
            slotStart: currentSlot.start,
            slotStart24h: standardizeTimeFormat(currentSlot.start), // Add 24h format for comparison
            slotEnd: currentSlot.end,
            slotEnd24h: standardizeTimeFormat(currentSlot.end), // Add 24h format for comparison
            isCheckOut: false,
            timestamp: now.toISOString()
        };

        // Add to check-ins array
        checkInsData.checkIns = checkInsData.checkIns || [];
        checkInsData.checkIns.push(checkInRecord);

        console.log(`Saving check-in data to Firebase:`, checkInsData);
        console.log(`Path: attendance/${userId}/${todayDate}`);

        // Update database
        try {
            // Save to the primary user ID path
            await set(checkInsRef, checkInsData);
            console.log(`Check-in data saved successfully to path: attendance/${userId}/${todayDate}`);

            // Verify the data was saved
            const verifySnapshot = await get(checkInsRef);
            if (verifySnapshot.exists()) {
                console.log(`Verification successful, data exists:`, verifySnapshot.val());
            } else {
                console.error(`Verification failed, data does not exist after save`);
            }

            // Also save to alternative user IDs if available
            const currentUser = getCurrentUser();
            if (currentUser) {
                // Save to UID if different from userId
                if (currentUser.uid && currentUser.uid !== userId) {
                    const uidCheckInsRef = ref(database, `attendance/${currentUser.uid}/${todayDate}`);
                    await set(uidCheckInsRef, checkInsData);
                    console.log(`Check-in data also saved to UID path: attendance/${currentUser.uid}/${todayDate}`);
                }

                // Save to employeeId if different from userId and UID
                if (currentUser.employeeId &&
                    currentUser.employeeId !== userId &&
                    currentUser.employeeId !== currentUser.uid) {
                    const empIdCheckInsRef = ref(database, `attendance/${currentUser.employeeId}/${todayDate}`);
                    await set(empIdCheckInsRef, checkInsData);
                    console.log(`Check-in data also saved to employeeId path: attendance/${currentUser.employeeId}/${todayDate}`);
                }
            }

            return {
                success: true,
                message: isLate ? 'Late check-in recorded' : 'Check-in successful',
                checkInTime: checkInTime,
                checkInTime24h: checkInTime24h
            };
        } catch (saveError) {
            console.error(`Error saving check-in data:`, saveError);
            return {
                success: false,
                error: `Error saving check-in data: ${saveError.message}`
            };
        }
    } catch (error) {
        console.error('Error recording check-in:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Record a check-out for the employee
 * @param {string} userId - The employee's user ID
 * @returns {Promise<Object>} Result of the check-out operation
 */
export async function recordCheckOut(userId) {
    try {
        const user = getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not logged in' };
        }

        const now = new Date();
        const todayDate = now.toISOString().split('T')[0];
        const checkOutTime = formatTimeString(now);
        const checkOutTime24h = formatTimeString(now, true);

        // Get check-ins for today
        const checkInsRef = ref(database, `attendance/${userId}/${todayDate}`);
        const checkInsSnapshot = await get(checkInsRef);

        if (!checkInsSnapshot.exists()) {
            return { success: false, error: 'No check-in found for today' };
        }

        const checkInsData = checkInsSnapshot.val();

        // Find the latest check-in that hasn't been checked out
        let latestCheckInIndex = -1;
        let latestCheckInTimestamp = null;

        for (let i = checkInsData.checkIns.length - 1; i >= 0; i--) {
            if (!checkInsData.checkIns[i].isCheckOut) {
                // If we haven't found a check-in yet, or this one is more recent
                if (latestCheckInIndex === -1 ||
                    new Date(checkInsData.checkIns[i].timestamp) > new Date(latestCheckInTimestamp)) {
                    latestCheckInIndex = i;
                    latestCheckInTimestamp = checkInsData.checkIns[i].timestamp;
                }
            }
        }

        if (latestCheckInIndex === -1) {
            return { success: false, error: 'No active check-in found' };
        }

        // Get the slot information for the check-in
        const checkInSlot = {
            start: checkInsData.checkIns[latestCheckInIndex].slotStart,
            end: checkInsData.checkIns[latestCheckInIndex].slotEnd
        };

        // Verify check-out is not too early (optional validation)
        const slotEndTime = checkInSlot.end ? timeStringToDate(checkInSlot.end) : null;

        // Update the check-in record with check-out information
        checkInsData.checkIns[latestCheckInIndex].isCheckOut = true;
        checkInsData.checkIns[latestCheckInIndex].checkOutTime = checkOutTime;
        checkInsData.checkIns[latestCheckInIndex].checkOutTime24h = checkOutTime24h; // Use directly calculated 24h time
        checkInsData.checkIns[latestCheckInIndex].checkOutTimestamp = now.toISOString();

        // Update database
        await set(checkInsRef, checkInsData);
        console.log(`Check-out data saved successfully to path: attendance/${userId}/${todayDate}`);

        // Also save to alternative user IDs if available
        const currentUser = getCurrentUser();
        if (currentUser) {
            // Save to UID if different from userId
            if (currentUser.uid && currentUser.uid !== userId) {
                const uidCheckInsRef = ref(database, `attendance/${currentUser.uid}/${todayDate}`);
                await set(uidCheckInsRef, checkInsData);
                console.log(`Check-out data also saved to UID path: attendance/${currentUser.uid}/${todayDate}`);
            }

            // Save to employeeId if different from userId and UID
            if (currentUser.employeeId &&
                currentUser.employeeId !== userId &&
                currentUser.employeeId !== currentUser.uid) {
                const empIdCheckInsRef = ref(database, `attendance/${currentUser.employeeId}/${todayDate}`);
                await set(empIdCheckInsRef, checkInsData);
                console.log(`Check-out data also saved to employeeId path: attendance/${currentUser.employeeId}/${todayDate}`);
            }
        }

        return {
            success: true,
            message: 'Check-out successful',
            checkOutTime: checkOutTime,
            checkOutTime24h: checkOutTime24h
        };
    } catch (error) {
        console.error('Error recording check-out:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get attendance records for a specific date range
 * @param {string} userId - The employee's user ID
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of attendance records
 */
export async function getAttendanceRecords(userId, startDate, endDate) {
    try {
        console.log(`Getting attendance records for user ${userId} from ${startDate} to ${endDate}`);

        // Try to get the current user to check for alternative IDs
        const currentUser = getCurrentUser();
        console.log(`Current user:`, currentUser);

        // Create an array of possible user IDs to check
        const possibleUserIds = [userId];

        if (currentUser) {
            // Add all possible IDs from the current user
            if (currentUser.uid && !possibleUserIds.includes(currentUser.uid)) {
                possibleUserIds.push(currentUser.uid);
            }
            if (currentUser.employeeId && !possibleUserIds.includes(currentUser.employeeId)) {
                possibleUserIds.push(currentUser.employeeId);
            }
            if (currentUser.email && !possibleUserIds.includes(currentUser.email)) {
                // Use email without domain as a possible ID
                const emailPrefix = currentUser.email.split('@')[0];
                if (!possibleUserIds.includes(emailPrefix)) {
                    possibleUserIds.push(emailPrefix);
                }
            }
        }

        console.log(`Checking attendance records for possible user IDs:`, possibleUserIds);

        // Try each possible user ID
        let attendanceData = null;
        let foundUserId = null;

        for (const id of possibleUserIds) {
            console.log(`Checking attendance for ID: ${id}`);
            const attendanceRef = ref(database, `attendance/${id}`);
            const attendanceSnapshot = await get(attendanceRef);

            if (attendanceSnapshot.exists()) {
                console.log(`Found attendance records for ID: ${id}`);
                attendanceData = attendanceSnapshot.val();
                foundUserId = id;
                break;
            }
        }

        if (!attendanceData) {
            console.log(`No attendance records found for any of the user IDs:`, possibleUserIds);
            return [];
        }

        console.log(`Using attendance data for user ID: ${foundUserId}`);
        console.log(`Attendance data:`, attendanceData);

        const records = [];

        // Convert date strings to Date objects for comparison
        // Set hours to 0 to compare dates only
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);

        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);

        console.log(`Attendance data keys: ${Object.keys(attendanceData)}`);

        // Loop through each date in the attendance data
        Object.keys(attendanceData).forEach(date => {
            // Create a date object from the date string
            const dateParts = date.split('-').map(part => parseInt(part, 10));
            const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            dateObj.setHours(0, 0, 0, 0);

            console.log(`Comparing date: ${date}, dateObj: ${dateObj}, startDateObj: ${startDateObj}, endDateObj: ${endDateObj}`);
            console.log(`Is within range: ${dateObj >= startDateObj && dateObj <= endDateObj}`);

            // Check if date is within range
            if (dateObj >= startDateObj && dateObj <= endDateObj) {
                const dayData = attendanceData[date];

                // Skip if no check-ins
                if (!dayData.checkIns || !Array.isArray(dayData.checkIns) || dayData.checkIns.length === 0) {
                    console.log(`No check-ins for date ${date}`);
                    return;
                }

                console.log(`Processing ${dayData.checkIns.length} check-ins for date ${date}`);

                // Process each check-in to ensure it has standardized time formats
                const processedCheckIns = dayData.checkIns.map(checkIn => {
                    // Create a copy of the check-in
                    const processedCheckIn = { ...checkIn };

                    // Add standardized time formats if they don't exist
                    if (!processedCheckIn.time24h && processedCheckIn.time) {
                        processedCheckIn.time24h = standardizeTimeFormat(processedCheckIn.time);
                    }

                    if (!processedCheckIn.slotStart24h && processedCheckIn.slotStart) {
                        processedCheckIn.slotStart24h = standardizeTimeFormat(processedCheckIn.slotStart);
                    }

                    if (!processedCheckIn.slotEnd24h && processedCheckIn.slotEnd) {
                        processedCheckIn.slotEnd24h = standardizeTimeFormat(processedCheckIn.slotEnd);
                    }

                    if (!processedCheckIn.checkOutTime24h && processedCheckIn.checkOutTime) {
                        processedCheckIn.checkOutTime24h = standardizeTimeFormat(processedCheckIn.checkOutTime);
                    }

                    return processedCheckIn;
                });

                console.log(`Adding record for date ${date} with ${processedCheckIns.length} processed check-ins`);

                // Add to records
                records.push({
                    date: date,
                    day: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
                    checkIns: processedCheckIns
                });
            }
        });

        console.log(`Returning ${records.length} records`);
        return records;
    } catch (error) {
        console.error('Error getting attendance records:', error);
        return [];
    }
}

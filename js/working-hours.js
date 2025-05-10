/**
 * Working Hours Calculation Module
 * Handles calculation of working hours from check-in/check-out records
 */

/**
 * Convert time string to minutes since midnight
 * @param {string} timeStr - Time string in format "HH:MM" (24-hour) or "HH:MM AM/PM" (12-hour)
 * @returns {number} Minutes since midnight
 */
function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
        console.error('Invalid time string for conversion to minutes:', timeStr);
        return null;
    }

    try {
        let hours, minutes;

        // Check if the time string contains AM/PM (12-hour format)
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
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

        // Calculate total minutes
        return hours * 60 + minutes;
    } catch (error) {
        console.error('Error converting time to minutes:', error, 'for time string:', timeStr);
        return null;
    }
}

/**
 * Format minutes as hours and minutes string
 * @param {number} totalMinutes - Total minutes
 * @returns {string} Formatted string in "Xh Ym" format
 */
function formatMinutesToHoursAndMinutes(totalMinutes) {
    if (totalMinutes === null || isNaN(totalMinutes)) {
        return 'Error';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

/**
 * Calculate working hours for a single check-in/check-out pair
 * @param {Object} checkIn - Check-in record
 * @param {Object} checkOut - Check-out record
 * @returns {Object} Working hours calculation result
 */
function calculatePairWorkingHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) {
        return { 
            minutes: null, 
            formatted: 'Incomplete', 
            error: 'Missing check-in or check-out' 
        };
    }

    // Use 24h format for calculation if available
    const checkInTime = checkIn.time24h || checkIn.time;
    const checkOutTime = checkOut.checkOutTime24h || checkOut.checkOutTime;

    if (!checkInTime || !checkOutTime) {
        return { 
            minutes: null, 
            formatted: 'Incomplete', 
            error: 'Invalid time format' 
        };
    }

    // Convert times to minutes
    const checkInMinutes = timeToMinutes(checkInTime);
    const checkOutMinutes = timeToMinutes(checkOutTime);

    if (checkInMinutes === null || checkOutMinutes === null) {
        return { 
            minutes: null, 
            formatted: 'Error', 
            error: 'Invalid time format' 
        };
    }

    // Calculate difference
    let minutesWorked = checkOutMinutes - checkInMinutes;

    // Handle overnight shifts
    if (minutesWorked < 0) {
        // This is likely an error - check-out should be after check-in
        return { 
            minutes: null, 
            formatted: 'Error', 
            error: 'Check-out time is before check-in time' 
        };
    }

    return {
        minutes: minutesWorked,
        formatted: formatMinutesToHoursAndMinutes(minutesWorked),
        error: null
    };
}

/**
 * Calculate total working hours from multiple check-in/check-out pairs
 * @param {Array} checkIns - Array of check-in/check-out records
 * @returns {Object} Working hours calculation result
 */
export function calculateWorkingHours(checkIns) {
    if (!checkIns || !Array.isArray(checkIns) || checkIns.length === 0) {
        return {
            regular: { minutes: 0, formatted: '0h 0m' },
            late: { minutes: 0, formatted: '0h 0m' },
            total: { minutes: 0, formatted: '0h 0m' },
            display: '0h 0m',
            error: null,
            isComplete: true
        };
    }

    // Separate check-ins and check-outs
    const checkInRecords = checkIns.filter(record => !record.isCheckOut);
    const checkOutRecords = checkIns.filter(record => record.isCheckOut);

    // Check if we have complete records
    const isComplete = checkInRecords.length === checkOutRecords.length;

    // Separate regular and late check-ins
    const regularCheckIns = checkInRecords.filter(record => !record.isLate);
    const lateCheckIns = checkInRecords.filter(record => record.isLate);

    // Calculate regular working hours
    let regularMinutes = 0;
    let regularError = null;
    let regularFormatted = '0h 0m';

    // Process each regular check-in with its corresponding check-out
    for (let i = 0; i < regularCheckIns.length; i++) {
        // Find the corresponding check-out
        const checkOut = checkOutRecords.find(co => 
            co.timestamp > regularCheckIns[i].timestamp && 
            (!co.matchedWithCheckIn || co.matchedWithCheckIn === regularCheckIns[i].timestamp)
        );

        if (checkOut) {
            // Mark this check-out as matched
            checkOut.matchedWithCheckIn = regularCheckIns[i].timestamp;
            
            const result = calculatePairWorkingHours(regularCheckIns[i], checkOut);
            if (result.error) {
                regularError = result.error;
            } else {
                regularMinutes += result.minutes;
            }
        } else {
            regularError = 'Incomplete record';
        }
    }

    regularFormatted = formatMinutesToHoursAndMinutes(regularMinutes);

    // Calculate late working hours
    let lateMinutes = 0;
    let lateError = null;
    let lateFormatted = '0h 0m';

    // Process each late check-in with its corresponding check-out
    for (let i = 0; i < lateCheckIns.length; i++) {
        // Find the corresponding check-out
        const checkOut = checkOutRecords.find(co => 
            co.timestamp > lateCheckIns[i].timestamp && 
            (!co.matchedWithCheckIn || co.matchedWithCheckIn === lateCheckIns[i].timestamp)
        );

        if (checkOut) {
            // Mark this check-out as matched
            checkOut.matchedWithCheckIn = lateCheckIns[i].timestamp;
            
            const result = calculatePairWorkingHours(lateCheckIns[i], checkOut);
            if (result.error) {
                lateError = result.error;
            } else {
                lateMinutes += result.minutes;
            }
        } else {
            lateError = 'Incomplete record';
        }
    }

    lateFormatted = formatMinutesToHoursAndMinutes(lateMinutes);

    // Calculate total working hours
    const totalMinutes = regularMinutes + lateMinutes;
    const totalFormatted = formatMinutesToHoursAndMinutes(totalMinutes);

    // Determine display format
    let display;
    if (regularMinutes > 0 && lateMinutes > 0) {
        display = `${regularFormatted} + ${lateFormatted} = ${totalFormatted}`;
    } else if (regularMinutes > 0) {
        display = regularFormatted;
    } else if (lateMinutes > 0) {
        display = lateFormatted;
    } else {
        display = '0h 0m';
    }

    // Determine if there's an error
    const error = regularError || lateError;

    return {
        regular: { minutes: regularMinutes, formatted: regularFormatted },
        late: { minutes: lateMinutes, formatted: lateFormatted },
        total: { minutes: totalMinutes, formatted: totalFormatted },
        display: error ? (isComplete ? 'Error' : 'Incomplete') : display,
        error: error,
        isComplete: isComplete
    };
}

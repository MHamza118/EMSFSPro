import { format } from 'date-fns';

/**
 * Time Validation Service
 * Handles all check-in/check-out rules and validations
 */

export class TimeValidationService {

  /**
   * Convert time string to minutes since midnight
   * @param {string} timeStr - Time in HH:MM or HH:MM:SS format
   * @returns {number} Minutes since midnight
   */
  static timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    // Ignore seconds for minute calculation
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes to time string
   * @param {number} minutes - Minutes since midnight
   * @returns {string} Time in HH:MM format
   */
  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Get current day name
   * @returns {string} Day name (e.g., 'Monday')
   */
  static getCurrentDay() {
    return format(new Date(), 'EEEE');
  }

  /**
   * Get current time in HH:MM:SS format
   * @returns {string} Current time
   */
  static getCurrentTime() {
    return format(new Date(), 'HH:mm:ss');
  }

  /**
   * Check if employee has a schedule set
   * @param {Object} schedule - Employee's schedule
   * @returns {boolean} True if schedule exists
   */
  static hasSchedule(schedule) {
    if (!schedule) {
      console.log('No schedule provided');
      return false;
    }

    const currentDay = this.getCurrentDay();
    console.log('Checking schedule for day:', {
      currentDay,
      scheduleKeys: Object.keys(schedule),
      scheduleForToday: schedule[currentDay],
      hasSlots: schedule[currentDay] && schedule[currentDay].length > 0
    });

    return schedule[currentDay] && schedule[currentDay].length > 0;
  }

  /**
   * Get today's schedule slots
   * @param {Object} schedule - Employee's schedule
   * @returns {Array} Today's time slots
   */
  static getTodaySchedule(schedule) {
    if (!schedule) {
      console.log('No schedule provided to getTodaySchedule');
      return [];
    }

    const currentDay = this.getCurrentDay();
    const todaySlots = schedule[currentDay] || [];

    console.log('Getting today\'s schedule:', {
      currentDay,
      scheduleKeys: Object.keys(schedule),
      todaySlots,
      slotsCount: todaySlots.length
    });

    return todaySlots;
  }

  /**
   * Find the next scheduled slot for check-in
   * @param {Object} schedule - Employee's schedule
   * @param {Array} todayAttendance - Today's attendance records
   * @returns {Object|null} Next slot or null
   */
  static getNextScheduledSlot(schedule, todayAttendance) {
    const todaySlots = this.getTodaySchedule(schedule);
    const currentTime = this.timeToMinutes(this.getCurrentTime());

    if (todaySlots.length === 0) {
      return null;
    }

    // Get completed slots (those with both check-in and check-out)
    const completedSlots = this.getCompletedSlots(todayAttendance);

    // Find the next available slot
    for (let i = 0; i < todaySlots.length; i++) {
      const slot = todaySlots[i];
      const slotStartTime = this.timeToMinutes(slot.checkIn);
      const slotEndTime = this.timeToMinutes(slot.checkOut);

      // Check if this slot is already completed (has both check-in and check-out)
      const isCompleted = completedSlots.some(completed => completed.slotIndex === i);

      // Check if there's an ongoing check-in for this slot (checked in but not checked out)
      const hasOngoingCheckIn = todayAttendance.some(record =>
        record.type === 'checkin' &&
        (record.slotIndex === i || Math.abs(this.timeToMinutes(record.scheduledCheckIn || record.checkInTime) - slotStartTime) < 15) &&
        !todayAttendance.some(checkout =>
          checkout.type === 'checkout' &&
          (checkout.slotIndex === i || checkout.checkInTime === record.checkInTime) &&
          new Date(checkout.timestamp) > new Date(record.timestamp)
        )
      );

      // Check if slot is still within late check-in window (up to 2 hours after scheduled time)
      const lateWindowEnd = slotStartTime + 120; // 2 hours after scheduled start
      const isWithinLateWindow = currentTime <= lateWindowEnd;

      // Check if this slot's regular check-in window has passed
      const regularWindowEnd = slotStartTime + 30; // 30 minutes after scheduled start
      const hasMissedRegularWindow = currentTime > regularWindowEnd;

      // Return the first available slot (not completed, no ongoing check-in, and within late window)
      if (!isCompleted && !hasOngoingCheckIn && isWithinLateWindow) {
        const nextSlot = {
          ...slot,
          slotIndex: i,
          scheduledCheckIn: slot.checkIn,
          scheduledCheckOut: slot.checkOut,
          hasMissedRegularWindow // Add this flag to indicate if regular window was missed
        };

        return nextSlot;
      }
    }

    return null;
  }

  /**
   * Get completed slots from attendance records
   * @param {Array} todayAttendance - Today's attendance records
   * @returns {Array} Completed slots
   */
  static getCompletedSlots(todayAttendance) {
    const checkIns = todayAttendance.filter(record => record.type === 'checkin');
    const checkOuts = todayAttendance.filter(record => record.type === 'checkout');

    const completedSlots = [];

    checkIns.forEach(checkIn => {
      // Find corresponding check-out for this check-in
      const correspondingCheckOut = checkOuts.find(checkOut => {
        // Match by slot index if available
        if (checkIn.slotIndex !== undefined && checkOut.slotIndex !== undefined) {
          return checkOut.slotIndex === checkIn.slotIndex &&
            new Date(checkOut.timestamp) > new Date(checkIn.timestamp);
        }

        // Fallback: match by check-in time reference
        return checkOut.checkInTime === checkIn.checkInTime;
      });

      if (correspondingCheckOut) {
        completedSlots.push({
          slotIndex: checkIn.slotIndex,
          scheduledCheckIn: checkIn.scheduledCheckIn || checkIn.checkInTime,
          scheduledCheckOut: correspondingCheckOut.scheduledCheckOut || correspondingCheckOut.checkOutTime,
          checkInTime: checkIn.checkInTime,
          checkOutTime: correspondingCheckOut.checkOutTime
        });
      }
    });

    return completedSlots;
  }

  /**
   * Check if employee is currently checked in
   * @param {Array} todayAttendance - Today's attendance records
   * @returns {boolean} True if checked in
   */
  static isCurrentlyCheckedIn(todayAttendance) {
    const checkIns = todayAttendance.filter(record => record.type === 'checkin').length;
    const checkOuts = todayAttendance.filter(record => record.type === 'checkout').length;
    return checkIns > checkOuts;
  }

  /**
   * Get the last check-in record
   * @param {Array} todayAttendance - Today's attendance records
   * @returns {Object|null} Last check-in record
   */
  static getLastCheckIn(todayAttendance) {
    const checkIns = todayAttendance.filter(record => record.type === 'checkin');
    return checkIns.length > 0 ? checkIns[checkIns.length - 1] : null;
  }

  /**
   * Validate regular check-in
   * @param {Object} schedule - Employee's schedule
   * @param {Array} todayAttendance - Today's attendance records
   * @returns {Object} Validation result
   */
  static validateRegularCheckIn(schedule, todayAttendance) {
    // Check if schedule exists
    if (!this.hasSchedule(schedule)) {
      return {
        allowed: false,
        reason: 'NO_SCHEDULE',
        message: '📅 Please set up your work schedule in the Timetable section first to start checking in'
      };
    }

    // Check if already checked in
    if (this.isCurrentlyCheckedIn(todayAttendance)) {
      return {
        allowed: false,
        reason: 'ALREADY_CHECKED_IN',
        message: '✅ You are already checked in for this session. Please check out first before checking in again'
      };
    }

    // Check for multiple check-ins within 10 minutes
    const recentCheckIns = this.getRecentCheckIns(todayAttendance, 10);
    if (recentCheckIns.length > 0) {
      return {
        allowed: false,
        reason: 'RECENT_CHECKIN',
        message: '⏰ Please wait 10 minutes between check-in attempts to prevent duplicate entries'
      };
    }

    // Get next scheduled slot
    const nextSlot = this.getNextScheduledSlot(schedule, todayAttendance);
    if (!nextSlot) {
      return {
        allowed: false,
        reason: 'NO_MORE_SLOTS',
        message: '🎯 All your scheduled work sessions for today are complete. Great job!'
      };
    }

    // Check if a late check-in has already been done for this slot
    const lateCheckInForSlot = todayAttendance.find(record =>
      record.type === 'checkin' &&
      record.isLate === true &&
      record.slotIndex === nextSlot.slotIndex
    );

    if (lateCheckInForSlot) {
      return {
        allowed: false,
        reason: 'LATE_CHECKIN_DONE',
        message: 'Late check-in already completed for this slot'
      };
    }

    const currentTime = this.timeToMinutes(this.getCurrentTime());
    const scheduledTime = this.timeToMinutes(nextSlot.scheduledCheckIn);

    // Check-in window: 1 hour before to 30 minutes after
    const windowStart = scheduledTime - 60; // 1 hour before
    const windowEnd = scheduledTime + 30;   // 30 minutes after

    // If this is a subsequent slot and the regular window has passed
    if (nextSlot.hasMissedRegularWindow) {
      const slotNumber = nextSlot.slotIndex + 1;
      return {
        allowed: false,
        reason: 'MISSED_REGULAR_WINDOW',
        message: `You missed the regular check-in window for slot ${slotNumber}. Please use late check-in option.`
      };
    }

    if (currentTime < windowStart) {
      return {
        allowed: false,
        reason: 'TOO_EARLY',
        message: `⏰ Check-in window opens at ${this.minutesToTime(windowStart)} (1 hour before your scheduled time)`
      };
    }

    // If more than 30 minutes late, require late check-in
    if (currentTime > windowEnd) {
      const minutesLate = currentTime - scheduledTime;
      const hoursLate = Math.floor(minutesLate / 60);
      const remainingMinutes = minutesLate % 60;

      return {
        allowed: false,
        reason: 'TOO_LATE',
        message: `🚨 You are ${hoursLate > 0 ? `${hoursLate}h ` : ''}${remainingMinutes}m late. Please use the "Late Check-in" button and provide a reason`
      };
    }

    return {
      allowed: true,
      slot: nextSlot,
      message: 'Regular check-in allowed'
    };
  }

  /**
   * Validate late check-in
   * @param {Object} schedule - Employee's schedule
   * @param {Array} todayAttendance - Today's attendance records
   * @returns {Object} Validation result
   */
  static validateLateCheckIn(schedule, todayAttendance) {
    // Check if schedule exists
    if (!this.hasSchedule(schedule)) {
      return {
        allowed: false,
        reason: 'NO_SCHEDULE',
        message: '📅 Please set up your work schedule in the Timetable section first to start checking in'
      };
    }

    // Check if already checked in
    if (this.isCurrentlyCheckedIn(todayAttendance)) {
      return {
        allowed: false,
        reason: 'ALREADY_CHECKED_IN',
        message: 'You are already checked in'
      };
    }

    // Check for multiple check-ins within 10 minutes
    const recentCheckIns = this.getRecentCheckIns(todayAttendance, 10);
    if (recentCheckIns.length > 0) {
      return {
        allowed: false,
        reason: 'RECENT_CHECKIN',
        message: 'Multiple check-ins within 10 minutes are not allowed'
      };
    }

    // Get next scheduled slot
    const nextSlot = this.getNextScheduledSlot(schedule, todayAttendance);
    if (!nextSlot) {
      return {
        allowed: false,
        reason: 'NO_MORE_SLOTS',
        message: 'No more scheduled slots for today'
      };
    }

    const currentTime = this.timeToMinutes(this.getCurrentTime());
    const scheduledTime = this.timeToMinutes(nextSlot.scheduledCheckIn);

    // Late check-in rules:
    // 1. Must be more than 30 minutes after scheduled time
    // 2. Up to 2 hours after scheduled time
    const regularWindowEnd = scheduledTime + 30; // Regular window ends 30 minutes after
    const lateWindowEnd = scheduledTime + 120;   // Late window ends 2 hours after

    // Check if late check-in window has expired (more than 2 hours late)
    if (currentTime > lateWindowEnd) {
      return {
        allowed: false,
        reason: 'TOO_LATE_FOR_LATE',
        message: '❌ Late check-in window has expired (maximum 2 hours after scheduled time). Please contact your administrator'
      };
    }

    // If we're within the regular window (less than 30 minutes late), don't allow late check-in
    if (currentTime <= regularWindowEnd) {
      return {
        allowed: false,
        reason: 'USE_REGULAR',
        message: 'Use regular check-in option - you are not late yet'
      };
    }

    // Allow late check-in if we're more than 30 minutes late but within 2 hours
    if (currentTime > regularWindowEnd && currentTime <= lateWindowEnd) {
      const minutesLate = currentTime - scheduledTime;
      const hoursLate = Math.floor(minutesLate / 60);
      const remainingMinutes = minutesLate % 60;

      return {
        allowed: true,
        slot: nextSlot,
        message: `Late check-in allowed (${hoursLate > 0 ? `${hoursLate}h ` : ''}${remainingMinutes}m late)`
      };
    }

    return {
      allowed: false,
      reason: 'UNKNOWN',
      message: 'Unable to determine late check-in eligibility'
    };
  }

  /**
   * Validate regular check-out
   * @param {Object} schedule - Employee's schedule
   * @param {Array} todayAttendance - Today's attendance records
   * @returns {Object} Validation result
   */
  static validateRegularCheckOut(schedule, todayAttendance) {
    // Check if currently checked in
    if (!this.isCurrentlyCheckedIn(todayAttendance)) {
      return {
        allowed: false,
        reason: 'NOT_CHECKED_IN',
        message: '📝 Please check in first before you can check out'
      };
    }

    const lastCheckIn = this.getLastCheckIn(todayAttendance);
    if (!lastCheckIn) {
      return {
        allowed: false,
        reason: 'NO_CHECKIN_FOUND',
        message: 'No check-in record found'
      };
    }

    // Check for multiple check-outs within 10 minutes
    const recentCheckOuts = this.getRecentCheckOuts(todayAttendance, 10);
    if (recentCheckOuts.length > 0) {
      return {
        allowed: false,
        reason: 'RECENT_CHECKOUT',
        message: '⏰ Please wait 10 minutes between check-out attempts to prevent duplicate entries'
      };
    }

    const currentTime = this.timeToMinutes(this.getCurrentTime());
    const checkInTime = this.timeToMinutes(lastCheckIn.checkInTime);

    // Check-out must be after check-in (allow at least 1 minute difference)
    if (currentTime <= checkInTime) {
      return {
        allowed: false,
        reason: 'INVALID_TIME',
        message: '⚠️ Check-out time must be after your check-in time. Please wait a moment and try again'
      };
    }

    // For regular check-out, always allow if basic conditions are met
    return {
      allowed: true,
      lastCheckIn: lastCheckIn,
      message: 'Regular check-out allowed'
    };
  }

  /**
   * Validate late check-out
   * @param {Object} schedule - Employee's schedule
   * @param {Array} todayAttendance - Today's attendance records
   * @returns {Object} Validation result
   */
  static validateLateCheckOut(schedule, todayAttendance) {
    // Check if currently checked in
    if (!this.isCurrentlyCheckedIn(todayAttendance)) {
      return {
        allowed: false,
        reason: 'NOT_CHECKED_IN',
        message: '📝 Please check in first before you can check out'
      };
    }

    const lastCheckIn = this.getLastCheckIn(todayAttendance);
    if (!lastCheckIn) {
      return {
        allowed: false,
        reason: 'NO_CHECKIN_FOUND',
        message: 'No check-in record found'
      };
    }

    // Check for multiple check-outs within 10 minutes
    const recentCheckOuts = this.getRecentCheckOuts(todayAttendance, 10);
    if (recentCheckOuts.length > 0) {
      return {
        allowed: false,
        reason: 'RECENT_CHECKOUT',
        message: 'Multiple check-outs within 10 minutes are not allowed'
      };
    }

    const currentTime = this.timeToMinutes(this.getCurrentTime());
    const checkInTime = this.timeToMinutes(lastCheckIn.checkInTime);

    // Check-out must be after check-in
    if (currentTime <= checkInTime) {
      return {
        allowed: false,
        reason: 'INVALID_TIME',
        message: 'Check-out time must be after check-in time'
      };
    }

    // For late check-out, we need to determine if it's actually late
    const scheduledCheckOut = lastCheckIn.scheduledCheckOut;
    if (scheduledCheckOut) {
      const scheduledTime = this.timeToMinutes(scheduledCheckOut);
      const lateThreshold = scheduledTime + 30; // 30 minutes after scheduled

      if (currentTime < lateThreshold) {
        return {
          allowed: false,
          reason: 'NOT_LATE_YET',
          message: '✅ Please use the regular check-out button as you are not working overtime yet'
        };
      }
    }

    return {
      allowed: true,
      lastCheckIn: lastCheckIn,
      message: 'Late check-out allowed'
    };
  }

  /**
   * Get recent check-outs within specified minutes
   * @param {Array} todayAttendance - Today's attendance records
   * @param {number} withinMinutes - Time window in minutes
   * @returns {Array} Recent check-out records
   */
  static getRecentCheckOuts(todayAttendance, withinMinutes) {
    const currentTime = this.timeToMinutes(this.getCurrentTime());
    const checkOuts = todayAttendance.filter(record => record.type === 'checkout');

    return checkOuts.filter(checkOut => {
      const checkOutTime = this.timeToMinutes(checkOut.checkOutTime);
      return (currentTime - checkOutTime) <= withinMinutes;
    });
  }

  /**
   * Get recent check-ins within specified minutes
   * @param {Array} todayAttendance - Today's attendance records
   * @param {number} withinMinutes - Time window in minutes
   * @returns {Array} Recent check-in records
   */
  static getRecentCheckIns(todayAttendance, withinMinutes) {
    const currentTime = this.timeToMinutes(this.getCurrentTime());
    const checkIns = todayAttendance.filter(record => record.type === 'checkin');

    return checkIns.filter(checkIn => {
      const checkInTime = this.timeToMinutes(checkIn.checkInTime);
      return (currentTime - checkInTime) <= withinMinutes;
    });
  }

  /**
   * Calculate working hours between check-in and check-out
   * @param {string} checkInTime - Check-in time in HH:MM format
   * @param {string} checkOutTime - Check-out time in HH:MM format
   * @returns {Object} Working hours calculation
   */
  static calculateWorkingHours(checkInTime, checkOutTime) {
    if (!checkInTime || !checkOutTime) {
      return { hours: 0, minutes: 0, total: 0, display: 'Incomplete' };
    }

    const checkInMinutes = this.timeToMinutes(checkInTime);
    const checkOutMinutes = this.timeToMinutes(checkOutTime);

    let diffMinutes = checkOutMinutes - checkInMinutes;

    // Handle overnight shifts (check-out next day)
    if (diffMinutes < 0) {
      return { hours: 0, minutes: 0, total: 0, display: 'Error: Invalid time range' };
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const totalHours = diffMinutes / 60;

    return {
      hours,
      minutes,
      total: totalHours,
      display: `${hours}h ${minutes}m`
    };
  }

  /**
   * Check if employee can use compensation hours
   * @param {Array} todayAttendance - Today's attendance records
   * @param {Object} schedule - Employee's schedule
   * @returns {Object} Compensation eligibility
   */
  static canUseCompensationHours(todayAttendance, schedule) {
    // Must be at least 24 hours after the missed day
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    // Check if there are any records for today
    if (todayAttendance.length > 0) {
      return {
        allowed: false,
        reason: 'HAS_RECORDS',
        message: 'Compensation hours can only be used for completely missed days'
      };
    }

    // Check if there's a schedule for today
    if (!this.hasSchedule(schedule)) {
      return {
        allowed: false,
        reason: 'NO_SCHEDULE',
        message: 'No schedule set for today'
      };
    }

    return {
      allowed: true,
      message: 'Compensation hours can be used'
    };
  }
}

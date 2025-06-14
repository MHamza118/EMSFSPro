import { TimeValidationService } from './timeValidationService';

/**
 * Working Hours Calculator Service
 * Handles complex working hours calculations including regular and late hours
 */

export class WorkingHoursCalculator {

  /**
   * Calculate working hours for a set of attendance records
   * @param {Array} attendanceRecords - Array of check-in/check-out records
   * @returns {Object} Detailed working hours breakdown
   */
  static calculateDayWorkingHours(attendanceRecords) {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return {
        regularHours: { hours: 0, minutes: 0, totalMinutes: 0, display: '0h 0m' },
        lateHours: { hours: 0, minutes: 0, totalMinutes: 0, display: '0h 0m' },
        totalHours: { hours: 0, minutes: 0, totalMinutes: 0, display: '0h 0m' },
        pairs: [],
        status: 'NO_RECORDS'
      };
    }

    const checkIns = attendanceRecords.filter(record => record.type === 'checkin');
    const checkOuts = attendanceRecords.filter(record => record.type === 'checkout');

    // Pair all check-ins with check-outs first, then separate by late status
    const allPairs = this.pairCheckInOuts(checkIns, checkOuts);

    // Separate pairs into regular and late based on whether either check-in or check-out is late
    const regularPairs = allPairs.filter(pair => !pair.isLate);
    const latePairs = allPairs.filter(pair => pair.isLate);

    // Calculate hours for each type
    const regularHours = this.calculatePairsHours(regularPairs);
    const lateHours = this.calculatePairsHours(latePairs);

    // Calculate total hours
    const totalMinutes = regularHours.totalMinutes + lateHours.totalMinutes;
    const totalHours = {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      totalMinutes: totalMinutes,
      display: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    };

    // Determine status
    let status = 'COMPLETE';
    if (checkIns.length !== checkOuts.length) {
      status = 'INCOMPLETE';
    } else if (allPairs.some(pair => !pair.complete)) {
      status = 'INCOMPLETE';
    }

    return {
      regularHours,
      lateHours,
      totalHours,
      pairs: allPairs,
      status,
      breakdown: {
        regularPairs: regularPairs.length,
        latePairs: latePairs.length,
        totalPairs: allPairs.length
      }
    };
  }

  /**
   * Pair check-ins with check-outs
   * @param {Array} checkIns - Check-in records
   * @param {Array} checkOuts - Check-out records
   * @returns {Array} Paired records
   */
  static pairCheckInOuts(checkIns, checkOuts) {
    const pairs = [];

    // Sort by time
    const sortedCheckIns = [...checkIns].sort((a, b) =>
      TimeValidationService.timeToMinutes(a.checkInTime) - TimeValidationService.timeToMinutes(b.checkInTime)
    );

    const sortedCheckOuts = [...checkOuts].sort((a, b) =>
      TimeValidationService.timeToMinutes(a.checkOutTime) - TimeValidationService.timeToMinutes(b.checkOutTime)
    );

    // Pair each check-in with the next available check-out
    for (let i = 0; i < sortedCheckIns.length; i++) {
      const checkIn = sortedCheckIns[i];
      const checkOut = sortedCheckOuts[i]; // Corresponding check-out

      if (checkOut) {
        pairs.push({
          checkIn,
          checkOut,
          complete: true,
          isLate: checkIn.isLate || checkIn.lateReason || checkOut.isLate || checkOut.lateReason,
          workingHours: TimeValidationService.calculateWorkingHours(
            checkIn.checkInTime,
            checkOut.checkOutTime
          )
        });
      } else {
        // Incomplete pair (check-in without check-out)
        pairs.push({
          checkIn,
          checkOut: null,
          complete: false,
          isLate: checkIn.isLate || checkIn.lateReason,
          workingHours: { hours: 0, minutes: 0, total: 0, display: 'Incomplete' }
        });
      }
    }

    return pairs;
  }

  /**
   * Calculate total hours for a set of pairs
   * @param {Array} pairs - Check-in/check-out pairs
   * @returns {Object} Total hours calculation
   */
  static calculatePairsHours(pairs) {
    let totalMinutes = 0;
    let completePairs = 0;

    pairs.forEach(pair => {
      if (pair.complete && pair.workingHours.total > 0) {
        totalMinutes += pair.workingHours.hours * 60 + pair.workingHours.minutes;
        completePairs++;
      }
    });

    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      totalMinutes,
      display: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      completePairs
    };
  }

  /**
   * Format working hours for display
   * @param {Object} hoursCalculation - Hours calculation result
   * @returns {string} Formatted display string
   */
  static formatWorkingHoursDisplay(hoursCalculation) {
    const { regularHours, lateHours, totalHours, status } = hoursCalculation;

    if (status === 'NO_RECORDS') {
      return 'No records';
    }

    if (status === 'INCOMPLETE') {
      return 'Incomplete';
    }

    // If only regular hours
    if (lateHours.totalMinutes === 0) {
      return regularHours.display;
    }

    // If only late hours
    if (regularHours.totalMinutes === 0) {
      return `${lateHours.display} (Late)`;
    }

    // If both regular and late hours
    return `${regularHours.display} + ${lateHours.display} = ${totalHours.display}`;
  }

  /**
   * Calculate scheduled hours for a day
   * @param {Object} schedule - Employee's schedule
   * @param {string} day - Day name (e.g., 'Monday')
   * @returns {Object} Scheduled hours calculation
   */
  static calculateScheduledHours(schedule, day) {
    if (!schedule || !schedule[day]) {
      return { hours: 0, minutes: 0, display: '0h 0m' };
    }

    const slots = schedule[day];
    let totalMinutes = 0;

    slots.forEach(slot => {
      if (slot.checkIn && slot.checkOut) {
        const hours = TimeValidationService.calculateWorkingHours(slot.checkIn, slot.checkOut);
        if (hours.total > 0) {
          totalMinutes += hours.hours * 60 + hours.minutes;
        }
      }
    });

    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      totalMinutes,
      display: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    };
  }

  /**
   * Compare actual vs scheduled hours
   * @param {Object} actualHours - Actual working hours
   * @param {Object} scheduledHours - Scheduled working hours
   * @returns {Object} Comparison result
   */
  static compareHours(actualHours, scheduledHours) {
    const actualMinutes = actualHours.totalMinutes || 0;
    const scheduledMinutes = scheduledHours.totalMinutes || 0;
    const difference = actualMinutes - scheduledMinutes;

    let status = 'EXACT';
    if (difference > 0) {
      status = 'OVERTIME';
    } else if (difference < 0) {
      status = 'UNDERTIME';
    }

    const diffHours = Math.floor(Math.abs(difference) / 60);
    const diffMins = Math.abs(difference) % 60;

    return {
      status,
      difference: {
        hours: diffHours,
        minutes: diffMins,
        totalMinutes: Math.abs(difference),
        display: `${diffHours}h ${diffMins}m`
      },
      percentage: scheduledMinutes > 0 ? (actualMinutes / scheduledMinutes) * 100 : 0
    };
  }

  /**
   * Validate working hours calculation
   * @param {Array} attendanceRecords - Attendance records
   * @returns {Object} Validation result
   */
  static validateWorkingHours(attendanceRecords) {
    const errors = [];
    const warnings = [];

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return { valid: true, errors, warnings };
    }

    const checkIns = attendanceRecords.filter(record => record.type === 'checkin');
    const checkOuts = attendanceRecords.filter(record => record.type === 'checkout');

    // Check for unequal check-ins and check-outs
    if (checkIns.length !== checkOuts.length) {
      errors.push('Unequal number of check-ins and check-outs');
    }

    // Check for invalid time ranges
    checkIns.forEach((checkIn, index) => {
      const correspondingCheckOut = checkOuts[index];
      if (correspondingCheckOut) {
        const checkInTime = TimeValidationService.timeToMinutes(checkIn.checkInTime);
        const checkOutTime = TimeValidationService.timeToMinutes(correspondingCheckOut.checkOutTime);

        if (checkOutTime <= checkInTime) {
          errors.push(`Invalid time range: ${checkIn.checkInTime} to ${correspondingCheckOut.checkOutTime}`);
        }
      }
    });

    // Check for multiple check-ins within 10 minutes
    for (let i = 0; i < checkIns.length - 1; i++) {
      const current = TimeValidationService.timeToMinutes(checkIns[i].checkInTime);
      const next = TimeValidationService.timeToMinutes(checkIns[i + 1].checkInTime);

      if (Math.abs(next - current) < 10) {
        warnings.push('Multiple check-ins within 10 minutes detected');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

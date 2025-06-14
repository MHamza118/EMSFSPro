import { firestoreService, COLLECTIONS, notificationService } from './firestore';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export const timetableService = {
  // Get current week identifier (YYYY-WW format)
  getCurrentWeekId() {
    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    return format(startOfCurrentWeek, 'yyyy-\'W\'II');
  },

  // Get week start and end dates
  getCurrentWeekDates() {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return { start, end };
  },

  // Check if employee can edit timetable for current week
  async canEmployeeEditTimetable(userId) {
    try {
      const currentWeekId = this.getCurrentWeekId();

      // Get employee's timetable
      const timeTables = await firestoreService.getWhere(
        COLLECTIONS.TIME_TABLES,
        'userId',
        '==',
        userId
      );

      if (timeTables.length === 0) {
        // No timetable exists, employee can create one
        return { canEdit: true, reason: 'NO_TIMETABLE' };
      }

      const timetable = timeTables[0];

      // Check if timetable was set by employee for current week
      if (timetable.weekId === currentWeekId && timetable.setByEmployee) {
        return {
          canEdit: false,
          reason: 'ALREADY_SET_THIS_WEEK',
          message: 'You have already set your timetable for this week. You cannot modify it until next week.'
        };
      }

      // Check if timetable was carried over from previous week (system_reset)
      if (timetable.weekId === currentWeekId && timetable.lastModifiedBy === 'system_reset') {
        return {
          canEdit: true,
          reason: 'CARRIED_OVER_SCHEDULE',
          message: 'Previous week schedule carried over. You can modify it or save as-is.'
        };
      }

      return { canEdit: true, reason: 'CAN_EDIT' };
    } catch (error) {
      console.error('Error checking timetable edit permission:', error);
      return { canEdit: false, reason: 'ERROR', message: 'Error checking permissions' };
    }
  },

  // Save employee timetable with week tracking
  async saveEmployeeTimetable(userId, employeeData, schedule) {
    try {
      const currentWeekId = this.getCurrentWeekId();

      // Check if employee can edit
      const permission = await this.canEmployeeEditTimetable(userId);
      if (!permission.canEdit) {
        throw new Error(permission.message || 'Cannot edit timetable');
      }

      // Get existing timetable
      const existingTimeTables = await firestoreService.getWhere(
        COLLECTIONS.TIME_TABLES,
        'userId',
        '==',
        userId
      );

      const timeTableData = {
        userId: userId,
        employeeId: employeeData.employeeId,
        employeeName: employeeData.name,
        schedule: schedule,
        weekId: currentWeekId,
        setByEmployee: true,
        lastModifiedBy: 'employee',
        lastModifiedAt: new Date().toISOString()
      };

      if (existingTimeTables.length > 0) {
        await firestoreService.update(COLLECTIONS.TIME_TABLES, existingTimeTables[0].id, timeTableData);
      } else {
        await firestoreService.create(COLLECTIONS.TIME_TABLES, timeTableData);
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving employee timetable:', error);
      throw error;
    }
  },

  // Admin save timetable (no restrictions)
  async saveAdminTimetable(userId, employeeData, schedule, adminUserId) {
    try {
      const currentWeekId = this.getCurrentWeekId();

      // Get existing timetable
      const existingTimeTables = await firestoreService.getWhere(
        COLLECTIONS.TIME_TABLES,
        'userId',
        '==',
        userId
      );

      const timeTableData = {
        userId: userId,
        employeeId: employeeData.employeeId,
        employeeName: employeeData.name,
        schedule: schedule,
        weekId: currentWeekId,
        setByEmployee: false,
        lastModifiedBy: 'admin',
        lastModifiedAt: new Date().toISOString(),
        modifiedByAdminId: adminUserId
      };

      let isUpdate = false;
      if (existingTimeTables.length > 0) {
        await firestoreService.update(COLLECTIONS.TIME_TABLES, existingTimeTables[0].id, timeTableData);
        isUpdate = true;
      } else {
        await firestoreService.create(COLLECTIONS.TIME_TABLES, timeTableData);
      }

      // Notify employee about admin changes
      if (isUpdate) {
        await this.notifyEmployeeOfTimetableChange(userId, employeeData.name);
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving admin timetable:', error);
      throw error;
    }
  },

  // Notify employee when admin changes their timetable
  async notifyEmployeeOfTimetableChange(userId, employeeName) {
    try {
      const notification = {
        userId: userId,
        title: 'Timetable Updated by Admin',
        message: `Your timetable has been updated by the administrator. Please check your new schedule.`,
        type: 'timetable_update',
        date: format(new Date(), 'yyyy-MM-dd'),
        read: false,
        priority: 'medium'
      };

      await notificationService.createNotification(notification);
    } catch (error) {
      console.error('Error creating timetable notification:', error);
    }
  },

  // Reset all timetables for new week (called automatically)
  async resetTimetablesForNewWeek() {
    try {
      const currentWeekId = this.getCurrentWeekId();
      console.log('Checking for timetable reset for week:', currentWeekId);

      // Get all timetables
      const allTimeTables = await firestoreService.getAll(COLLECTIONS.TIME_TABLES);

      let resetCount = 0;
      for (const timetable of allTimeTables) {
        // Only reset if it's from a previous week
        if (timetable.weekId && timetable.weekId !== currentWeekId) {
          const resetData = {
            ...timetable,
            weekId: currentWeekId,
            setByEmployee: false,
            lastModifiedBy: 'system_reset',
            lastModifiedAt: new Date().toISOString(),
            schedule: timetable.schedule || {} // Carry over previous schedule instead of clearing
          };

          await firestoreService.update(COLLECTIONS.TIME_TABLES, timetable.id, resetData);
          resetCount++;
        }
      }

      console.log(`Reset ${resetCount} timetables for new week with previous schedules carried over`);
      return { resetCount };
    } catch (error) {
      console.error('Error resetting timetables for new week:', error);
      throw error;
    }
  },

  // Check and perform weekly reset if needed
  async checkAndPerformWeeklyReset() {
    try {
      // This will be called when the app loads
      // We'll check if we need to reset based on the current week
      await this.resetTimetablesForNewWeek();
    } catch (error) {
      console.error('Error in weekly reset check:', error);
    }
  }
};

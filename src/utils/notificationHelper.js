import { notificationService } from '../services/firestore';

export const createNotification = async (userId, type, title, message, additionalData = {}) => {
  try {
    const notificationData = {
      userId,
      type,
      title,
      message,
      date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      isRead: false,
      ...additionalData
    };

    await notificationService.createNotification(notificationData);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Notification types and their generators
export const NotificationTypes = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TASK_UPDATED: 'task_updated',
  HOLIDAY_APPROVED: 'holiday_approved',
  HOLIDAY_REJECTED: 'holiday_rejected',
  HOLIDAY_SUBMITTED: 'holiday_submitted',
  REPORT_SUBMITTED: 'report_submitted',
  REPORT_REVIEWED: 'report_reviewed',
  LATE_CHECKIN: 'late_checkin',
  ATTENDANCE_REMINDER: 'attendance_reminder',
  SYSTEM_ANNOUNCEMENT: 'system_announcement'
};

// Helper functions for specific notification types
export const notifyTaskAssigned = async (employeeId, taskTitle, assignedBy) => {
  await createNotification(
    employeeId,
    NotificationTypes.TASK_ASSIGNED,
    'New Task Assigned',
    `You have been assigned a new task: "${taskTitle}" by ${assignedBy}`,
    { taskTitle, assignedBy }
  );
};

export const notifyTaskCompleted = async (adminId, taskTitle, employeeName) => {
  await createNotification(
    adminId,
    NotificationTypes.TASK_COMPLETED,
    'Task Completed',
    `${employeeName} has completed the task: "${taskTitle}"`,
    { taskTitle, employeeName }
  );
};

export const notifyTaskUpdated = async (adminId, taskTitle, employeeName, status) => {
  await createNotification(
    adminId,
    NotificationTypes.TASK_UPDATED,
    'Task Status Updated',
    `${employeeName} has updated the task "${taskTitle}" status to: ${status}`,
    { taskTitle, employeeName, status }
  );
};

export const notifyHolidayApproved = async (employeeId, startDate, endDate) => {
  await createNotification(
    employeeId,
    NotificationTypes.HOLIDAY_APPROVED,
    'Holiday Request Approved',
    `Your holiday request from ${startDate} to ${endDate} has been approved`,
    { startDate, endDate }
  );
};

export const notifyHolidayRejected = async (employeeId, startDate, endDate, reason) => {
  await createNotification(
    employeeId,
    NotificationTypes.HOLIDAY_REJECTED,
    'Holiday Request Rejected',
    `Your holiday request from ${startDate} to ${endDate} has been rejected. Reason: ${reason}`,
    { startDate, endDate, reason }
  );
};

export const notifyHolidaySubmitted = async (adminId, employeeName, startDate, endDate) => {
  await createNotification(
    adminId,
    NotificationTypes.HOLIDAY_SUBMITTED,
    'New Holiday Request',
    `${employeeName} has submitted a holiday request from ${startDate} to ${endDate}`,
    { employeeName, startDate, endDate }
  );
};

export const notifyReportSubmitted = async (adminId, employeeName, reportType) => {
  await createNotification(
    adminId,
    NotificationTypes.REPORT_SUBMITTED,
    'New Progress Report',
    `${employeeName} has submitted a new ${reportType} progress report`,
    { employeeName, reportType }
  );
};

export const notifyReportReviewed = async (employeeId, reportType, status) => {
  await createNotification(
    employeeId,
    NotificationTypes.REPORT_REVIEWED,
    'Progress Report Reviewed',
    `Your ${reportType} progress report has been ${status}`,
    { reportType, status }
  );
};

export const notifyLateCheckin = async (adminId, employeeName, time, reason) => {
  await createNotification(
    adminId,
    NotificationTypes.LATE_CHECKIN,
    'Late Check-in Alert',
    `${employeeName} checked in late at ${time}. Reason: ${reason}`,
    { employeeName, time, reason }
  );
};

export const notifyAttendanceReminder = async (employeeId, message) => {
  await createNotification(
    employeeId,
    NotificationTypes.ATTENDANCE_REMINDER,
    'Attendance Reminder',
    message
  );
};

export const notifySystemAnnouncement = async (userId, title, message) => {
  await createNotification(
    userId,
    NotificationTypes.SYSTEM_ANNOUNCEMENT,
    title,
    message
  );
};

// Bulk notification functions
export const notifyAllEmployees = async (employeeIds, type, title, message, additionalData = {}) => {
  const promises = employeeIds.map(employeeId => 
    createNotification(employeeId, type, title, message, additionalData)
  );
  await Promise.all(promises);
};

export const notifyAllAdmins = async (adminIds, type, title, message, additionalData = {}) => {
  const promises = adminIds.map(adminId => 
    createNotification(adminId, type, title, message, additionalData)
  );
  await Promise.all(promises);
};

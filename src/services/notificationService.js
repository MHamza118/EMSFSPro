import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

class NotificationService {
  constructor() {
    this.collectionName = 'notifications';
  }

  // Create a new notification
  async createNotification(notification) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...notification,
        createdAt: Timestamp.now(),
        isRead: false
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      // Return null instead of throwing to prevent app crashes
      return null;
    }
  }

  // Get today's notifications for a user
  async getTodayNotifications(userId) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<', Timestamp.fromDate(endOfDay)),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting today notifications:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  // Get unread count for a user
  async getUnreadCount(userId) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('isRead', '==', false),
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<', Timestamp.fromDate(endOfDay))
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      // Return 0 instead of throwing to prevent app crashes
      return 0;
    }
  }

  // Mark a notification as read
  async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('isRead', '==', false),
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<', Timestamp.fromDate(endOfDay))
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.docs.forEach((docSnapshot) => {
        batch.update(docSnapshot.ref, {
          isRead: true,
          readAt: Timestamp.now()
        });
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Create notification for task assignment
  async notifyTaskAssigned(employeeId, taskTitle, assignedBy) {
    return await this.createNotification({
      userId: employeeId,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${taskTitle}" by ${assignedBy}`,
      data: { taskTitle, assignedBy }
    });
  }

  // Create notification for task completion
  async notifyTaskCompleted(adminId, taskTitle, completedBy) {
    return await this.createNotification({
      userId: adminId,
      type: 'task_completed',
      title: 'Task Completed',
      message: `Task "${taskTitle}" has been completed by ${completedBy}`,
      data: { taskTitle, completedBy }
    });
  }

  // Create notification for late check-in
  async notifyLateCheckin(userId, reason) {
    return await this.createNotification({
      userId: userId,
      type: 'late_checkin',
      title: 'Late Check-in Recorded',
      message: `Your late check-in has been recorded. Reason: ${reason}`,
      data: { reason }
    });
  }

  // Create notification for report submission
  async notifyReportSubmitted(adminId, employeeName, reportType) {
    return await this.createNotification({
      userId: adminId,
      type: 'report_submitted',
      title: 'Progress Report Submitted',
      message: `${employeeName} has submitted a ${reportType} progress report`,
      data: { employeeName, reportType }
    });
  }
}

export default new NotificationService();

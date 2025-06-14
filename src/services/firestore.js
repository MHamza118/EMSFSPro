import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  ATTENDANCE: 'attendance',
  PROGRESS_REPORTS: 'progressReports',
  HOLIDAY_REQUESTS: 'holidayRequests',
  TASKS: 'tasks',
  TIME_TABLES: 'timeTables',
  SCHEDULES: 'timeTables', // Using timeTables collection for schedules
  COMPENSATION: 'compensation',
  NOTIFICATIONS: 'notifications'
};

// Generic CRUD operations
export const firestoreService = {
  // Create document
  async create(collectionName, data) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  },

  // Read document by ID
  async getById(collectionName, id) {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  },

  // Read all documents
  async getAll(collectionName, orderByField = 'createdAt') {
    try {
      // Try with ordering first
      try {
        const q = query(collection(db, collectionName), orderBy(orderByField, 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (orderError) {
        // If ordering fails (field doesn't exist), get all documents without ordering
        console.warn(`Ordering by ${orderByField} failed, fetching without order:`, orderError.message);
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  },

  // Read documents with condition
  async getWhere(collectionName, field, operator, value) {
    try {
      const q = query(collection(db, collectionName), where(field, operator, value));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting documents with condition:', error);
      throw error;
    }
  },

  // Update document
  async update(collectionName, id, data) {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  // Delete document
  async delete(collectionName, id) {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  // Real-time listener
  onSnapshot(collectionName, callback, conditions = []) {
    try {
      let q = collection(db, collectionName);

      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });

      return onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(docs);
      });
    } catch (error) {
      console.error('Error setting up real-time listener:', error);
      throw error;
    }
  }
};

// Specific service functions
export const userService = {
  async createUser(userData) {
    try {
      // Use the user's UID as the document ID for easier retrieval
      const docRef = doc(db, COLLECTIONS.USERS, userData.uid);
      await setDoc(docRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return userData.uid;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async getUserByEmail(email) {
    try {
      const users = await firestoreService.getWhere(COLLECTIONS.USERS, 'email', '==', email);
      return users[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  },

  async getUserByUid(uid) {
    try {
      return await firestoreService.getById(COLLECTIONS.USERS, uid);
    } catch (error) {
      console.error('Error getting user by UID:', error);
      return null;
    }
  },

  async getAllEmployees() {
    try {
      return await firestoreService.getWhere(COLLECTIONS.USERS, 'role', '==', 'employee');
    } catch (error) {
      console.error('Error getting employees:', error);
      return [];
    }
  }
};

export const attendanceService = {
  async checkIn(userId, checkInData) {
    return firestoreService.create(COLLECTIONS.ATTENDANCE, {
      userId,
      ...checkInData,
      type: 'checkin'
    });
  },

  async checkOut(attendanceId, checkOutData) {
    return firestoreService.update(COLLECTIONS.ATTENDANCE, attendanceId, {
      ...checkOutData,
      type: 'checkout'
    });
  },

  async getUserAttendance(userId, date) {
    return firestoreService.getWhere(COLLECTIONS.ATTENDANCE, 'userId', '==', userId);
  }
};

export const taskService = {
  async createTask(taskData) {
    return firestoreService.create(COLLECTIONS.TASKS, taskData);
  },

  async getUserTasks(userId) {
    return firestoreService.getWhere(COLLECTIONS.TASKS, 'assignedTo', '==', userId);
  },

  async getAllTasks() {
    return firestoreService.getAll(COLLECTIONS.TASKS, 'createdAt');
  },

  async updateTaskStatus(taskId, status, reason = '', employeeRemarks = '') {
    const updateData = {
      status,
      reason,
      employeeRemarks,
      updatedAt: new Date().toISOString()
    };
    return firestoreService.update(COLLECTIONS.TASKS, taskId, updateData);
  },

  async updateTask(taskId, taskData) {
    return firestoreService.update(COLLECTIONS.TASKS, taskId, taskData);
  },

  async deleteTask(taskId) {
    return firestoreService.delete(COLLECTIONS.TASKS, taskId);
  }
};

export const holidayService = {
  async createRequest(requestData) {
    return firestoreService.create(COLLECTIONS.HOLIDAY_REQUESTS, requestData);
  },

  async getUserRequests(userId) {
    return firestoreService.getWhere(COLLECTIONS.HOLIDAY_REQUESTS, 'userId', '==', userId);
  },

  async getAllRequests() {
    return firestoreService.getAll(COLLECTIONS.HOLIDAY_REQUESTS, 'requestDate');
  },

  async updateRequestStatus(requestId, status, adminRemarks = '') {
    return firestoreService.update(COLLECTIONS.HOLIDAY_REQUESTS, requestId, { status, adminRemarks });
  }
};

export const notificationService = {
  async createNotification(notificationData) {
    return firestoreService.create(COLLECTIONS.NOTIFICATIONS, notificationData);
  },

  async getUserNotifications(userId) {
    return firestoreService.getWhere(COLLECTIONS.NOTIFICATIONS, 'userId', '==', userId);
  },

  async getTodayNotifications(userId) {
    const today = new Date().toISOString().split('T')[0];
    const notifications = await firestoreService.getWhere(COLLECTIONS.NOTIFICATIONS, 'userId', '==', userId);
    return notifications.filter(notification =>
      notification.date === today
    ).sort((a, b) => new Date(b.createdAt?.seconds * 1000) - new Date(a.createdAt?.seconds * 1000));
  },

  async markAsRead(notificationId) {
    return firestoreService.update(COLLECTIONS.NOTIFICATIONS, notificationId, {
      isRead: true,
      readAt: new Date().toISOString()
    });
  },

  async markAllAsRead(userId) {
    const today = new Date().toISOString().split('T')[0];
    const notifications = await this.getTodayNotifications(userId);
    const unreadNotifications = notifications.filter(n => !n.isRead);

    const updatePromises = unreadNotifications.map(notification =>
      this.markAsRead(notification.id)
    );

    return Promise.all(updatePromises);
  },

  async getUnreadCount(userId) {
    const todayNotifications = await this.getTodayNotifications(userId);
    return todayNotifications.filter(n => !n.isRead).length;
  }
};

export const compensationService = {
  async getUserCompensation(employeeId) {
    return firestoreService.getWhere(COLLECTIONS.COMPENSATION, 'employeeId', '==', employeeId);
  },

  async createCompensation(data) {
    return firestoreService.create(COLLECTIONS.COMPENSATION, data);
  },

  // Placeholder: implement your own logic for missed check-ins if needed
  async checkMissedCheckIns(userId) {
    // This should return an array of missed check-in slots for the user
    // For now, return an empty array
    return [];
  },

  async getAllCompensation() {
    return firestoreService.getAll(COLLECTIONS.COMPENSATION, 'createdAt');
  },

  async updateCompensationStatus(compensationId, status, adminRemarks = '') {
    return firestoreService.update(COLLECTIONS.COMPENSATION, compensationId, {
      status,
      adminRemarks
    });
  }
};

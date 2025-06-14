// Common imports used across multiple components
// This file helps reduce duplication of import statements

// React hooks
export { useState, useEffect } from 'react';

// Authentication context
export { useAuth } from '../context/AuthContext';

// Firebase services
export { 
  firestoreService, 
  userService, 
  taskService, 
  attendanceService, 
  holidayService,
  COLLECTIONS 
} from '../services/firestore';

// Date utilities
export { format } from 'date-fns';

// Toast notifications
export { default as toast } from 'react-hot-toast';

// Common Lucide React icons
export {
  // Status icons
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  
  // Action icons
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  
  // UI icons
  Calendar,
  User,
  Users,
  Bell,
  FileText,
  Briefcase,
  MessageSquare
} from 'lucide-react';

// Common component patterns
export const commonStyles = {
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px'
  },
  
  button: {
    primary: 'btn btn-primary',
    secondary: 'btn btn-secondary',
    danger: 'btn btn-danger'
  },
  
  input: 'form-input',
  label: 'form-label',
  textarea: 'form-textarea'
};

// Common loading states
export const LoadingSpinner = () => (
  <div style={{ textAlign: 'center', padding: '40px' }}>
    <div style={{ color: '#666' }}>Loading...</div>
  </div>
);

// Common error handling
export const handleError = (error, defaultMessage = 'An error occurred') => {
  console.error('Error:', error);
  toast.error(error.message || defaultMessage);
};

// Common success handling
export const handleSuccess = (message) => {
  toast.success(message);
};

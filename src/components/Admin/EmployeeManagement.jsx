import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService, firestoreService, COLLECTIONS } from '../../services/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { secondaryAuth } from '../../config/firebase';
import {
  Users,
  Plus,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Search,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

const EmployeeManagement = () => {
  const { userProfile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    employeeId: '',
    role: 'employee',
    isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [lastCreatedEmployee, setLastCreatedEmployee] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState({});

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      loadEmployees();
    }
  }, [userProfile]);

  const loadEmployees = async () => {
    try {
      const allUsers = await firestoreService.getAll(COLLECTIONS.USERS);
      setEmployees(allUsers);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.employeeId) {
      newErrors.employeeId = 'Employee ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Firebase Authentication user using secondary auth instance
      // This prevents the admin from being logged out
      console.log('Creating Firebase Auth user with secondary auth...');
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password
      );

      const firebaseUser = userCredential.user;
      console.log('Firebase Auth user created:', firebaseUser.uid);

      // Step 2: Create user profile in Firestore using Firebase UID
      const userProfileData = {
        uid: firebaseUser.uid,
        email: formData.email,
        name: formData.name,
        employeeId: formData.employeeId,
        role: formData.role,
        isActive: formData.isActive,
        createdAt: new Date().toISOString(),
        createdBy: userProfile.uid
      };

      console.log('Creating Firestore profile...');
      await userService.createUser(userProfileData);
      console.log('Firestore profile created successfully');

      // Step 3: Sign out from secondary auth to clean up
      console.log('Signing out from secondary auth...');
      await secondaryAuth.signOut();

      // Store the credentials for sending email
      setLastCreatedEmployee({
        id: firebaseUser.uid,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        employeeId: formData.employeeId,
        role: formData.role
      });

      toast.success(`Employee ${formData.name} added successfully! They can now login with their credentials.`);

      // Reset form
      setFormData({
        email: '',
        password: '',
        name: '',
        employeeId: '',
        role: 'employee',
        isActive: true
      });
      setShowAddForm(false);
      loadEmployees();

    } catch (error) {
      console.error('Error adding employee:', error);
      let errorMessage = 'Failed to add employee';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email is already registered';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password must be at least 6 characters';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        default:
          errorMessage = error.message;
      }

      toast.error(errorMessage);
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployeeStatus = async (employeeId, currentStatus) => {
    try {
      await firestoreService.update(COLLECTIONS.USERS, employeeId, {
        isActive: !currentStatus
      });
      toast.success(`Employee ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  // Migration function for legacy users
  const migrateEmployeeToFirebaseAuth = async (employee) => {
    if (!employee.password) {
      toast.error('Cannot migrate: Password not available. Please create a new account.');
      return;
    }

    setMigrationStatus(prev => ({ ...prev, [employee.id]: 'migrating' }));

    try {
      // Create Firebase Auth account using secondary auth to avoid logging out admin
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        employee.email,
        employee.password
      );

      const firebaseUser = userCredential.user;

      // Update the existing Firestore document with new Firebase UID
      await firestoreService.update(COLLECTIONS.USERS, employee.id, {
        uid: firebaseUser.uid,
        migratedAt: new Date().toISOString(),
        migratedBy: userProfile.uid
      });

      // Create a new document with Firebase UID as the document ID
      const migratedUserData = {
        ...employee,
        uid: firebaseUser.uid,
        migratedAt: new Date().toISOString(),
        migratedBy: userProfile.uid
      };

      await userService.createUser(migratedUserData);

      // Sign out from secondary auth
      await secondaryAuth.signOut();

      // Delete the old document (optional - you might want to keep it for backup)
      // await firestoreService.delete(COLLECTIONS.USERS, employee.id);

      setMigrationStatus(prev => ({ ...prev, [employee.id]: 'success' }));
      toast.success(`Employee ${employee.name} migrated successfully!`);
      loadEmployees();

    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStatus(prev => ({ ...prev, [employee.id]: 'failed' }));

      let errorMessage = 'Migration failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already has a Firebase account';
      }

      toast.error(errorMessage);
    }
  };

  // Check if employee is legacy (no proper Firebase UID)
  const isLegacyEmployee = (employee) => {
    return !employee.uid || employee.uid.startsWith('emp_');
  };

  const sendCredentials = (employee) => {
    // For newly created employees, use stored credentials
    if (lastCreatedEmployee && lastCreatedEmployee.id === employee.id) {
      const credentials = lastCreatedEmployee;
      sendEmailWithCredentials(credentials);
      return;
    }

    // For existing employees, use their stored information but prompt for password
    const credentials = {
      name: employee.name || 'Employee',
      email: employee.email,
      password: '[Contact Admin for Password]',
      employeeId: employee.employeeId || 'N/A',
      role: employee.role || 'employee'
    };

    sendEmailWithCredentials(credentials);
  };

  const sendEmailWithCredentials = (credentials) => {
    const subject = encodeURIComponent('Your Employee Login Credentials - Employee Management System');

    const body = encodeURIComponent(`Dear ${credentials.name},

Welcome to the Employee Management System!

Your login credentials:

📧 Email: ${credentials.email}
🔑 Password: ${credentials.password}
👤 Employee ID: ${credentials.employeeId}
🎯 Role: ${credentials.role.charAt(0).toUpperCase() + credentials.role.slice(1)}

For security reasons:
1. Please change your password after your first login
2. Keep your credentials secure and do not share them
3. Contact the administrator if you face any login issues

Please use these credentials to log into the system at: ${window.location.origin}

Best regards,
Admin Team
Employee Management System`);

    const mailtoLink = `mailto:${credentials.email}?subject=${subject}&body=${body}`;

    // Open the mailto link without navigating away from the page
    const link = document.createElement('a');
    link.href = mailtoLink;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Email client opened with credentials for ${credentials.name}`);
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (userProfile?.role !== 'admin') {
    return (
      <div className="content">
        <div className="card text-center">
          <Users size={64} style={{ color: '#e74c3c', marginBottom: '20px' }} />
          <h3 style={{ color: '#e74c3c' }}>Access Denied</h3>
          <p>You don't have permission to manage employees.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="flex justify-between align-center mb-20">
        <h2 style={{ color: '#333' }}>Employee Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          {showAddForm ? 'Cancel' : 'Add Employee'}
        </button>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="card mb-20">
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Add New Employee</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter full name"
                />
                {errors.name && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '5px' }}>{errors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Employee ID *</label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., EMP001"
                />
                {errors.employeeId && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '5px' }}>{errors.employeeId}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter email address"
                />
                {errors.email && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '5px' }}>{errors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '5px' }}>{errors.password}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="form-select"
                style={{ maxWidth: '200px' }}
              >
                <option value="employee">Employee</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {errors.submit && (
              <div style={{
                color: '#e74c3c',
                fontSize: '14px',
                marginBottom: '15px',
                padding: '10px',
                background: '#fdf2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px'
              }}>
                {errors.submit}
              </div>
            )}

            <div className="flex justify-between align-center">
              <div style={{ color: '#666', fontSize: '14px' }}>
                * Required fields
              </div>
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Adding Employee...' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List */}
      <div className="card">
        <div className="flex justify-between align-center mb-20">
          <h3 style={{ color: '#333' }}>All Employees ({filteredEmployees.length})</h3>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666'
            }} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '35px' }}
            />
          </div>
        </div>

        {filteredEmployees.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Account Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td style={{ fontWeight: 'bold', color: '#3498db' }}>
                    {employee.employeeId || 'N/A'}
                  </td>
                  <td>{employee.name || 'N/A'}</td>
                  <td>{employee.email}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: 'white',
                      background: employee.role === 'admin' ? '#e74c3c' : '#3498db'
                    }}>
                      {employee.role?.toUpperCase() || 'EMPLOYEE'}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: 'white',
                      background: isLegacyEmployee(employee) ? '#f39c12' : '#27ae60'
                    }}>
                      {isLegacyEmployee(employee) ? 'LEGACY' : 'FIREBASE'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${employee.isActive !== false ? 'status-approved' : 'status-rejected'
                      }`}>
                      {employee.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-10" style={{ flexWrap: 'wrap' }}>
                      <button
                        onClick={() => sendCredentials(employee)}
                        className="btn btn-info"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        title="Send Credentials via Email"
                      >
                        <Mail size={14} />
                      </button>

                      {isLegacyEmployee(employee) && (
                        <button
                          onClick={() => migrateEmployeeToFirebaseAuth(employee)}
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          title="Migrate to Firebase Auth"
                          disabled={migrationStatus[employee.id] === 'migrating'}
                        >
                          {migrationStatus[employee.id] === 'migrating' ? '...' : '🔄'}
                        </button>
                      )}

                      <button
                        onClick={() => toggleEmployeeStatus(employee.id, employee.isActive)}
                        className={`btn ${employee.isActive !== false ? 'btn-warning' : 'btn-success'}`}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        title={employee.isActive !== false ? 'Deactivate' : 'Activate'}
                      >
                        {employee.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No employees found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;

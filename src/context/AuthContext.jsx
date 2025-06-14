import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { userService } from '../services/firestore';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ignoreAuthChanges, setIgnoreAuthChanges] = useState(false);

  // Enhanced login function - handles both Firebase Auth and legacy users
  const login = async (email, password) => {
    try {
      // First, try Firebase Authentication
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get user profile from Firestore using Firebase UID
        const profile = await userService.getUserByUid(user.uid);

        if (!profile) {
          throw new Error('User profile not found');
        }

        if (!profile.isActive) {
          throw new Error('Account is deactivated');
        }

        setCurrentUser(user);
        setUserProfile(profile);
        toast.success('Logged in successfully!');

        return { user, profile };
      } catch (authError) {
        // If Firebase Auth fails, check for legacy users (old method)
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
          console.log('Firebase Auth failed, checking for legacy user...');

          // Check if user exists in Firestore with email/password (legacy method)
          const legacyProfile = await userService.getUserByEmail(email);

          if (legacyProfile && legacyProfile.password === password) {
            if (!legacyProfile.isActive) {
              throw new Error('Account is deactivated');
            }

            // For legacy users, create a mock user object
            const mockUser = {
              uid: legacyProfile.uid || legacyProfile.id,
              email: legacyProfile.email
            };

            setCurrentUser(mockUser);
            setUserProfile(legacyProfile);

            toast.success('Logged in successfully! (Legacy Account)');
            toast.info('Please contact admin to upgrade your account for better security.');

            return { user: mockUser, profile: legacyProfile };
          }
        }

        // If both methods fail, throw the original error
        throw authError;
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to sign in';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        default:
          errorMessage = error.message;
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Simple logout function
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      toast.success('Logged out successfully!');
    } catch (error) {
      toast.error('Error logging out');
      throw error;
    }
  };

  // Load user profile from Firestore - only when auth state changes
  const loadUserProfile = async (user) => {
    if (user) {
      try {
        let profile = await userService.getUserByUid(user.uid);

        if (profile) {
          setUserProfile(profile);
        } else {
          console.error('No profile found for user:', user.uid);
          console.log('Creating default admin profile for authenticated user...');

          // Create a default admin profile for the authenticated user
          const defaultProfile = {
            uid: user.uid,
            email: user.email || 'admin@fspro.com',
            name: 'System Administrator',
            employeeId: 'ADMIN001',
            role: 'admin',
            isActive: true
          };

          try {
            await userService.createUser(defaultProfile);
            console.log('Default admin profile created successfully');
            setUserProfile(defaultProfile);
            toast.success('Welcome! Admin profile created successfully.');
          } catch (createError) {
            console.error('Error creating default profile:', createError);
            setUserProfile(null);
            toast.error('Error creating user profile. Please contact support.');
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        setUserProfile(null);
      }
    } else {
      setUserProfile(null);
    }
  };

  // Monitor auth state changes - IGNORE WHEN CREATING EMPLOYEES
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // IGNORE auth changes when admin is creating employees
      if (ignoreAuthChanges) {
        return;
      }

      setCurrentUser(user);
      await loadUserProfile(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [ignoreAuthChanges]);

  const value = {
    currentUser,
    userProfile,
    login,
    logout,
    loading,
    setIgnoreAuthChanges
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

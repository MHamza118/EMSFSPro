// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8GW8S1UFOmCyrKV80n331G3Tm5tfW-fo",
  authDomain: "fspro-8f755.firebaseapp.com",
  projectId: "fspro-8f755",
  storageBucket: "fspro-8f755.firebasestorage.app",
  messagingSenderId: "83658549317",
  appId: "1:83658549317:web:fe0b8659df5015b7889b2c",
  measurementId: "G-301EY8V9S4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize a secondary Firebase app for admin operations
const secondaryApp = initializeApp(firebaseConfig, 'secondary');

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const storage = getStorage(app);

export default app;

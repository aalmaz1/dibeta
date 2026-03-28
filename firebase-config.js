// ==========================================
// Firebase Configuration
// Replace with your Firebase project config
// ==========================================

// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCkjTO4oSRdCyehUsJ1QVj0KqdB_QzigAc",
    authDomain: "traaxcker.firebaseapp.com",
    databaseURL: "https://traaxcker-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "traaxcker",
    storageBucket: "traaxcker.firebasestorage.app",
    messagingSenderId: "315863450054",
    appId: "1:315863450054:web:9accc8bdf57fda00c6f2c7",
    measurementId: "G-MM216YNWC3"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    getDatabase, 
    ref, 
    onValue, 
    off,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { 
    auth, 
    database, 
    ref, 
    onValue, 
    off,
    serverTimestamp,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
};

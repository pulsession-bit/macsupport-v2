import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuration Production - MacBook Assistance
const firebaseConfig = {
  apiKey: "AIzaSyB3CNMnvWipHsMK193vhFgmYuVgMaAJgiI",
  authDomain: "macbook-1e222.firebaseapp.com",
  databaseURL: "https://macbook-1e222-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "macbook-1e222",
  storageBucket: "macbook-1e222.firebasestorage.app",
  messagingSenderId: "67498652056",
  appId: "1:67498652056:web:4f444b32a1ef792f693bed",
  measurementId: "G-N97JKB8PN2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
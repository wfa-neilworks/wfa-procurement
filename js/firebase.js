// js/firebase.js

  const firebaseConfig = {
    apiKey: "AIzaSyD6IpTBkW8Rv3XwEE0cNJlnaLkRlnrS-Hk",
    authDomain: "neil-works.firebaseapp.com",
    projectId: "neil-works",
    storageBucket: "neil-works.firebasestorage.app",
    messagingSenderId: "125693511957",
    appId: "1:125693511957:web:816e6b2cac396e8a9f411c",
    measurementId: "G-QZSE1S119E"
  };



import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  // Firestore core
  initializeFirestore, collection, addDoc, getDocs, query, orderBy, limit,
  serverTimestamp, Timestamp, doc, deleteDoc,
  // Extras used by Inventory / import / new item
  where, updateDoc, runTransaction, writeBatch, increment, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// App + Firestore (long-polling helps on strict/corporate networks)
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false
});
const auth = getAuth(app);

// Exports for the app
export {
  db, auth,
  // Firestore
  collection, addDoc, getDocs, query, orderBy, limit,
  serverTimestamp, Timestamp, doc, deleteDoc,
  where, updateDoc, runTransaction, writeBatch, increment, setDoc, getDoc,
  // Auth
  signInWithEmailAndPassword, signOut, onAuthStateChanged
};

// Debug (optional): confirm project id in DevTools console
console.log("Firebase projectId:", app.options.projectId);

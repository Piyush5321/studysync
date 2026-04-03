// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ⚠️ Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyDE3QzfIgsKdeLB11I91W0JOQEgvTLUqQo",
  authDomain: "studysync-f3037.firebaseapp.com",
  projectId: "studysync-f3037",
  storageBucket: "studysync-f3037.firebasestorage.app",
  messagingSenderId: "507515237199",
  appId: "1:507515237199:web:a5d1c77354ddacbfea8b3a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

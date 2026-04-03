// js/auth.js
import { auth, db } from './firebase-init.js';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, updateProfile, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();

// Redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes('index')) {
    window.location.href = 'dashboard.html';
  }
});

async function ensureUserDoc(user, name) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      name: name || user.displayName || "Student",
      email: user.email,
      avatar: user.photoURL || "",
      points: 0,
      tasksCompleted: 0,
      tasksOnTime: 0,
      groupId: null,
      joinedAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });
  }
}

window.handleLogin = async function() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;
  if (!email || !pass) return showMsg("Please fill all fields", "error");
  setLoading('loginBtn', true);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await ensureUserDoc(cred.user);
    showMsg("Welcome back! Redirecting...", "success");
    setTimeout(() => window.location.href = "dashboard.html", 900);
  } catch (e) {
    showMsg(firebaseErrMsg(e.code), "error");
    setLoading('loginBtn', false);
  }
};

window.handleSignup = async function() {
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pass = document.getElementById("signupPassword").value;
  if (!name || !email || !pass) return showMsg("Please fill all fields", "error");
  if (pass.length < 8) return showMsg("Password must be at least 8 characters", "error");
  setLoading('signupBtn', true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await ensureUserDoc(cred.user, name);
    showMsg("Account created! Redirecting...", "success");
    setTimeout(() => window.location.href = "dashboard.html", 900);
  } catch (e) {
    showMsg(firebaseErrMsg(e.code), "error");
    setLoading('signupBtn', false);
  }
};

window.handleGoogleLogin = async function() {
  try {
    showMsg("Opening Google...", "info");
    const cred = await signInWithPopup(auth, provider);
    await ensureUserDoc(cred.user);
    showMsg("Signed in! Redirecting...", "success");
    setTimeout(() => window.location.href = "dashboard.html", 900);
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') showMsg(firebaseErrMsg(e.code), "error");
    else showMsg("Google login cancelled.", "info");
  }
};

function firebaseErrMsg(code) {
  const m = {
    "auth/user-not-found": "No account with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "Email already registered.",
    "auth/invalid-email": "Invalid email address.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
  };
  return m[code] || "Something went wrong. Please try again.";
}

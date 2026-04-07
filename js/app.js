// js/app.js - StudySync Complete App

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, onSnapshot, orderBy, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getDatabase, ref, set, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { initDoubtSolver, askDoubt } from './ai-doubt-solver.js';
import { prioritizeTasks, displayPrioritization } from './ai-task-prioritizer.js';
import { analyzePredictivePerformance, renderPredictions } from './ai-predictions.js';

// ⚠️ Replace with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyDE3QzfIgsKdeLB11I91W0JOQEgvTLUqQo",
  authDomain: "studysync-f3037.firebaseapp.com",
  projectId: "studysync-f3037",
  storageBucket: "studysync-f3037.firebasestorage.app",
  messagingSenderId: "507515237199",
  appId: "1:507515237199:web:a5d1c77354ddacbfea8b3a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Export Firebase to window for other scripts
window.db = db;
window.auth = auth;
window.rtdb = rtdb;

// Export Firebase modules to window for study-tracker.js and group-discussion.js
window.firebaseModules = {
  ref, set, remove, onValue,
  collection, addDoc, updateDoc, doc, serverTimestamp, query, where, onSnapshot, orderBy, getDoc, setDoc, deleteDoc, getDocs
};

const POINTS = {
  TASK_ADD: 5, TASK_COMPLETE: 20, EARLY_COMPLETION: 10,
  EVENT_ADD: 5, RESOURCE_SHARE: 15, FILE_UPLOAD: 20, LOGIN_STREAK: 10
};

let currentUser = null, userDoc = null, groupDoc = null;
let groupMembers = [], tasks = [], events = [], resources = [], activity = [];
let calDate = new Date(), calView = 'month';
let editingEventId = null, editingTaskId = null, selectedColor = '#ff6b35';
let uploadingFile = false;
let pendingApprovalFilter = 'all'; // Filter for pending approval tasks: 'all', 'mine', 'others'

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  currentUser = user;
  window.currentUser = currentUser; // Export to window for other scripts
  await loadUserDoc();
  initUI();
  setupListeners();

  // Auto-sync data after 2 seconds to ensure real-time listeners are set up
  setTimeout(() => {
    if (window.refreshAllData) {
      window.refreshAllData();
    }
  }, 2000);
});

async function loadUserDoc() {
  try {
    const ref = doc(db, "users", currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      userDoc = snap.data();
    } else {
      userDoc = { name: currentUser.displayName || "Student", email: currentUser.email, points: 0, tasksCompleted: 0, groupId: null, streak: 0, lastLoginDate: null };
      await setDoc(ref, { ...userDoc, uid: currentUser.uid, joinedAt: serverTimestamp(), lastActive: serverTimestamp() });
    }
    await updateLoginStreak();
  } catch (error) {
    console.error("Error loading user doc:", error);
    // Set default user doc if there's an error
    userDoc = { name: currentUser.displayName || "Student", email: currentUser.email, points: 0, tasksCompleted: 0, groupId: null, streak: 0, lastLoginDate: null };
  }
}

async function updateLoginStreak() {
  try {
    if (!userDoc) return;
    const today = new Date().toDateString();
    if (userDoc.lastLoginDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const streak = userDoc.lastLoginDate === yesterday ? (userDoc.streak || 0) + 1 : 1;
      userDoc.streak = streak;
      userDoc.lastLoginDate = today;
      await updateDoc(doc(db, "users", currentUser.uid), { streak, lastLoginDate: today, lastActive: serverTimestamp() });
    }
  } catch (e) {
    console.warn("Could not update login streak:", e);
  }
}

function initUI() {
  const name = userDoc.name || currentUser.displayName || currentUser.email?.split('@')[0] || "User";
  const initial = name.charAt(0).toUpperCase();
  document.getElementById('sidebarUserName').textContent = name;
  document.getElementById('sidebarUserPts').textContent = (userDoc.points || 0) + ' pts';
  document.getElementById('sidebarAvatar').textContent = initial;
  document.getElementById('topbarAvatar').textContent = initial;
  document.getElementById('welcomeName').textContent = name;
  const hr = new Date().getHours();
  document.getElementById('welcomeGreeting').textContent = (hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening") + ' 👋';
  document.getElementById('wsPoints').textContent = userDoc.points || 0;
  document.getElementById('wsStreak').textContent = (userDoc.streak || 0) + ' 🔥';

  // Request notification permission
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  if (userDoc.groupId) { loadGroup(userDoc.groupId); }
  else { openGroupModal(); document.getElementById('smartMsg').textContent = "Set up your study group to get started!"; }
  renderMiniCalendar();
  renderCalendar();
  initDoubtSolver(currentUser);
  // Initialize study tracker
  if (window.initStudyTracker) {
    window.initStudyTracker(rtdb, currentUser, userDoc.groupId, [], []);
  }
  // Initialize Smart Learn
  if (window.initSmartLearn) {
    window.initSmartLearn();
  }
  // Initialize Quiz Generator
  if (window.initQuizGenerator) {
    window.initQuizGenerator();
  }
  // Initialize Task Proof Verification
  if (window.initTaskProofVerification) {
    window.initTaskProofVerification(db, currentUser, userDoc.groupId);
  }
  // Initialize Quiz Task Verification
  if (window.initQuizTaskVerification) {
    window.initQuizTaskVerification(db, currentUser, userDoc.groupId);
    // Load verification results after a short delay to ensure modules are ready
    setTimeout(function () {
      if (window.loadVerificationResults) {
        window.loadVerificationResults();
      }
    }, 500);
  }
  // Group discussion will be initialized after group members are loaded
}

function setupListeners() {
  if (!userDoc.groupId) return;
  const gid = userDoc.groupId;

  // First, load members synchronously before setting up listeners
  loadGroupMembers(gid).then(() => {
    console.log("✅ Initial members loaded, now setting up real-time listeners");

    // Listen to group document for real-time member updates
    console.log("📡 Setting up real-time listener for group members...");
    onSnapshot(doc(db, "groups", gid), async (groupSnap) => {
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const memberIds = groupData.members || [];
        console.log("🔄 Group members updated in real-time:", memberIds);

        // Fetch fresh member data
        const freshMembers = [];
        for (const memberId of memberIds) {
          try {
            const userSnap = await getDoc(doc(db, "users", memberId));
            if (userSnap.exists()) {
              freshMembers.push(userSnap.data());
            }
          } catch (error) {
            console.error("Error loading member:", memberId, error);
          }
        }

        // Only update if members actually changed
        if (freshMembers.length !== groupMembers.length ||
          freshMembers.some((m, i) => m.uid !== groupMembers[i]?.uid)) {
          groupMembers = freshMembers;
          console.log("✅ Group members updated:", groupMembers.length);

          // Update UI elements that depend on members
          document.getElementById('sidebarGroupMembers').textContent = groupMembers.length + ' members';
          populateAssigneeDropdown();
          renderLeaderboard();
          renderProgressCharts();
          renderBurnoutMonitor();
        }
      }
    });
  });

  onSnapshot(query(collection(db, "groups", gid, "tasks"), orderBy("createdAt", "desc")), snap => {
    tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.tasksGlobal = tasks;
    renderKanban(); renderTaskSummary(); renderDashboardTaskBadge(); renderSmartPlanner(); renderProgressCharts();
    // Update study tracker with new tasks
    if (window.updateStudyTrackerTasks) {
      window.updateStudyTrackerTasks(tasks, groupMembers);
    }
    // Update group discussion with new tasks
    if (window.updateGroupDiscussionData) {
      window.updateGroupDiscussionData(tasks, groupMembers);
    }
    // Populate discussion task dropdown
    populateDiscussionTaskDropdown(tasks);
    if (window.renderMyTasks) {
      window.renderMyTasks();
    }
    if (window.renderLiveStudy) {
      window.renderLiveStudy();
    }
  });
  onSnapshot(query(collection(db, "groups", gid, "events"), orderBy("date")), snap => {
    events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCalendar(); renderMiniCalendar(); renderTodayEvents();
  });
  onSnapshot(query(collection(db, "groups", gid, "resources"), orderBy("createdAt", "desc")), snap => {
    resources = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderResources(); buildResourceFilters();
  });
  onSnapshot(query(collection(db, "groups", gid, "activity"), orderBy("createdAt", "desc")), snap => {
    activity = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderActivity();
  });

  // Listen to user notifications
  console.log("📡 Setting up notification listener for user:", currentUser.uid);
  onSnapshot(query(collection(db, "users", currentUser.uid, "notifications"), orderBy("createdAt", "desc")), snap => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        const notification = change.doc.data();
        console.log("🔔 New notification:", notification);

        // Show toast notification
        if (notification.type === "task_approved") {
          toast(`✅ ${notification.approvedBy} approved: ${notification.taskTitle}`, "success");
        } else if (notification.type === "task_rejected") {
          toast(`❌ ${notification.rejectedBy} rejected: ${notification.taskTitle}`, "error");
        }

        // Show browser notification if available
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("StudySync Task Update", {
            body: notification.message,
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>📋</text></svg>"
          });
        }
      }
    });
  });

  // Initialize group discussion after members are loaded
  setTimeout(() => {
    if (window.initGroupDiscussion) {
      window.initGroupDiscussion(db, currentUser, userDoc.groupId, tasks, groupMembers);
    }

    // Load verification results after group is loaded
    if (window.loadVerificationResults) {
      window.loadVerificationResults();
    }
  }, 500);
}

async function loadGroup(gid) {
  const snap = await getDoc(doc(db, "groups", gid));
  if (snap.exists()) {
    groupDoc = snap.data();
    document.getElementById('sidebarGroupName').textContent = groupDoc.name || "My Group";
    document.getElementById('sidebarGroupAvatar').textContent = (groupDoc.name || "SG").substring(0, 2).toUpperCase();
    document.getElementById('sidebarGroupMembers').textContent = '';
    const codeEl = document.getElementById('groupCodeDisplay');
    if (codeEl) codeEl.textContent = 'Code: ' + (groupDoc.code || '');
  }
}

async function loadGroupMembers(gid) {
  try {
    console.log("=== LOADING GROUP MEMBERS ===");
    console.log("Group ID:", gid);

    // First, get the group document to get the members array
    const groupSnap = await getDoc(doc(db, "groups", gid));
    if (!groupSnap.exists()) {
      console.error("❌ Group not found");
      groupMembers = [];
      return;
    }

    const groupData = groupSnap.data();
    const memberIds = groupData.members || [];
    console.log("📋 Group members IDs from Firestore:", memberIds);
    console.log("📊 Total member IDs:", memberIds.length);

    // Now fetch each member's user document
    groupMembers = [];
    for (const memberId of memberIds) {
      try {
        console.log("🔍 Fetching user document for UID:", memberId);
        const userSnap = await getDoc(doc(db, "users", memberId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          console.log("✅ Member found:", userData.name, "| UID:", userData.uid, "| Points:", userData.points);
          groupMembers.push(userData);
        } else {
          console.warn("⚠️ User document not found for UID:", memberId);
        }
      } catch (error) {
        console.error("❌ Error loading member:", memberId, error);
      }
    }

    console.log("✅ Loaded", groupMembers.length, "group members");
    console.log("📊 All members:", groupMembers.map(m => ({ name: m.name, uid: m.uid, points: m.points })));

    // Update sidebar
    const sidebarEl = document.getElementById('sidebarGroupMembers');
    if (sidebarEl) {
      sidebarEl.textContent = groupMembers.length + ' members';
    }

    populateAssigneeDropdown();
    renderLeaderboard();
    renderProgressCharts();
    renderBurnoutMonitor();

    // Initialize study tracker with current data
    if (window.initStudyTracker) {
      window.initStudyTracker(rtdb, currentUser, userDoc.groupId, tasks, groupMembers);
    }

  } catch (error) {
    console.error("❌ Error loading group members:", error);
  }
}



// ===== MY TASKS RENDER =====
// Delegated to study-tracker.js

// ===== LIVE STUDY RENDER =====
// Delegated to study-tracker.js

function formatTimeMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function switchPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles = { dashboard: 'Dashboard', calendar: 'Calendar', tasks: 'Tasks', progress: 'Progress', leaderboard: 'Leaderboard', resources: 'Resources', mytasks: 'My Tasks', livestudy: 'Live Study', discussion: 'Group Discussion', 'manage-doubts': 'Manage Doubts', learn: 'Smart Learn', quiz: 'Quiz Generator' };
  const subs = { dashboard: 'Overview', calendar: 'Schedule & Events', tasks: 'Task Manager', progress: 'Analytics & Insights', leaderboard: 'Rankings & Points', resources: 'Shared Files & Links', mytasks: 'Track Your Study Time', livestudy: 'Real-time Group Activity', discussion: 'Collaborate & Solve Doubts', 'manage-doubts': 'View & Manage All Doubts', learn: 'YouTube Videos & Wikipedia Articles', quiz: 'Create & Take Quizzes' };
  document.getElementById('pageTitle').textContent = titles[name] || name;
  document.getElementById('breadcrumb').textContent = subs[name] || '';
  if (name === 'calendar') renderCalendar();
  if (name === 'leaderboard') renderLeaderboard();
  if (name === 'progress') renderProgressCharts();
  if (name === 'resources') renderResources();
  if (name === 'mytasks') {
    if (window.renderMyTasks) window.renderMyTasks();
  }
  if (name === 'livestudy') {
    if (window.renderLiveStudy) window.renderLiveStudy();
  }
  if (name === 'discussion') {
    if (window.renderDiscussions) window.renderDiscussions();
  }
  if (name === 'manage-doubts') {
    if (window.renderManageDoubts) window.renderManageDoubts('all');
  }
  if (name === 'learn') {
    if (window.showSearchHistory) window.showSearchHistory();
  }
  if (name === 'quiz') {
    // Initialize quiz results tracker
    if (window.initQuizResultsTracker) {
      window.initQuizResultsTracker();
    }
  }
}
window.switchPage = switchPage;

// Switch between quiz tabs
window.switchQuizTab = function (tab) {
  const quizTabBtn = document.querySelectorAll('.quiz-tab-btn')[0];
  const resultsTabBtn = document.querySelectorAll('.quiz-tab-btn')[1];
  const quizTabContent = document.getElementById('quizTabContent');
  const resultsTabContent = document.getElementById('resultsTabContent');

  if (tab === 'quiz') {
    quizTabBtn.style.background = 'var(--accent)';
    quizTabBtn.style.color = 'white';
    quizTabBtn.style.borderColor = 'var(--accent)';
    resultsTabBtn.style.background = 'var(--surface2)';
    resultsTabBtn.style.color = 'var(--text)';
    resultsTabBtn.style.borderColor = 'var(--border)';
    quizTabContent.style.display = 'block';
    resultsTabContent.style.display = 'none';
  } else if (tab === 'results') {
    quizTabBtn.style.background = 'var(--surface2)';
    quizTabBtn.style.color = 'var(--text)';
    quizTabBtn.style.borderColor = 'var(--border)';
    resultsTabBtn.style.background = 'var(--accent)';
    resultsTabBtn.style.color = 'white';
    resultsTabBtn.style.borderColor = 'var(--accent)';
    quizTabContent.style.display = 'none';
    resultsTabContent.style.display = 'block';
    // Load and display results when switching to results tab (non-blocking)
    if (window.loadQuizResults && window.displayQuizResultsInTab) {
      setTimeout(async () => {
        await window.loadQuizResults();
        window.displayQuizResultsInTab();
      }, 0);
    }
  }
};

window.toggleSidebar = function () {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('mainContent').classList.toggle('sidebar-collapsed');
};

window.handleLogout = async function () { await signOut(auth); window.location.href = 'index.html'; };

// Refresh all data from Firebase
window.refreshAllData = async function () {
  try {
    toast("Syncing data...", "info");

    if (!userDoc.groupId) return toast("Join a group first", "error");
    const gid = userDoc.groupId;

    // Fetch fresh data from Firebase
    const tasksSnap = await getDocs(query(collection(db, "groups", gid, "tasks"), orderBy("createdAt", "desc")));
    tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.tasksGlobal = tasks;

    const eventsSnap = await getDocs(query(collection(db, "groups", gid, "events"), orderBy("date")));
    events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const resourcesSnap = await getDocs(query(collection(db, "groups", gid, "resources"), orderBy("createdAt", "desc")));
    resources = resourcesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const activitySnap = await getDocs(query(collection(db, "groups", gid, "activity"), orderBy("createdAt", "desc")));
    activity = activitySnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Re-render all UI
    renderKanban();
    renderTaskSummary();
    renderDashboardTaskBadge();
    renderSmartPlanner();
    renderProgressCharts();
    renderCalendar();
    renderMiniCalendar();
    renderTodayEvents();
    renderResources();
    buildResourceFilters();
    renderActivity();

    if (window.updateStudyTrackerTasks) {
      window.updateStudyTrackerTasks(tasks, groupMembers);
    }
    if (window.updateGroupDiscussionData) {
      window.updateGroupDiscussionData(tasks, groupMembers);
    }
    if (window.renderMyTasks) {
      window.renderMyTasks();
    }
    if (window.renderLiveStudy) {
      window.renderLiveStudy();
    }

    populateDiscussionTaskDropdown(tasks);
    toast("Data synced successfully!", "success");
  } catch (e) {
    console.error("Error refreshing data:", e);
    toast("Error syncing data", "error");
  }
};

// Export functions to window
// These are delegated to study-tracker.js
window.refreshLiveStudy = function () {
  if (window.renderLiveStudy) {
    window.renderLiveStudy();
  }
};

function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast show ${type}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  // Clear doubt solver chat when opening
  if (id === 'doubtSolverModal') {
    const chatBox = document.getElementById('doubtChatBox');
    if (chatBox) {
      chatBox.innerHTML = '';
      // Clear any error messages
      const errors = chatBox.querySelectorAll('.doubt-error');
      errors.forEach(err => err.remove());
    }
  }
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
window.openModal = openModal;
window.closeModal = closeModal;

window.filterPendingApproval = function (filter, buttonEl) {
  pendingApprovalFilter = filter;

  // Update button styles
  const buttons = document.querySelectorAll('.kanban-filter-btn');
  buttons.forEach(btn => {
    btn.style.background = 'var(--surface2)';
    btn.style.color = 'var(--text)';
    btn.style.border = '1px solid var(--border)';
  });

  // Highlight active button
  if (buttonEl) {
    buttonEl.style.background = 'var(--accent)';
    buttonEl.style.color = 'white';
    buttonEl.style.border = 'none';
  }

  renderKanban();
};

window.openGroupModal = function () { openModal('groupModal'); };
window.openGroupDetailsModal = function () {
  console.log("=== OPENING GROUP DETAILS MODAL ===");
  console.log("userDoc.groupId:", userDoc?.groupId);

  if (!userDoc.groupId) {
    toast("You are not in a group", "error");
    return;
  }

  // Force reload members from Firestore every time modal opens
  console.log("🔄 Force reloading group members from Firestore...");

  (async () => {
    try {
      // Fetch fresh group data
      const groupSnap = await getDoc(doc(db, "groups", userDoc.groupId));
      if (!groupSnap.exists()) {
        console.error("❌ Group not found");
        toast("Group not found", "error");
        return;
      }

      const groupData = groupSnap.data();
      const memberIds = groupData.members || [];
      console.log("📋 Member IDs from Firestore:", memberIds);
      console.log("📊 Total members in group:", memberIds.length);

      // Fetch each member's data
      const freshMembers = [];
      for (const memberId of memberIds) {
        try {
          console.log("🔍 Fetching user data for UID:", memberId);
          const userSnap = await getDoc(doc(db, "users", memberId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("✅ Fetched member:", userData.name, "| UID:", userData.uid, "| Points:", userData.points);
            freshMembers.push(userData);
          } else {
            console.warn("⚠️ User document not found for UID:", memberId);
          }
        } catch (error) {
          console.error("❌ Error fetching member:", memberId, error);
        }
      }

      console.log("✅ Total members fetched:", freshMembers.length);
      console.log("📊 Members data:", freshMembers.map(m => ({ name: m.name, uid: m.uid, points: m.points })));

      // Update global groupMembers
      groupMembers = freshMembers;

      // Display modal with fresh data
      displayGroupDetailsModal();
    } catch (error) {
      console.error("❌ Error reloading members:", error);
      toast("Error loading group members", "error");
    }
  })();
};

function displayGroupDetailsModal() {
  try {
    console.log("=== DISPLAYING GROUP DETAILS MODAL ===");
    console.log("groupDoc:", groupDoc);
    console.log("groupMembers (cached):", groupMembers);

    const groupName = groupDoc?.name || "Study Group";
    const groupSubject = groupDoc?.subject || "N/A";
    const groupCode = groupDoc?.code || "N/A";
    const totalMembers = groupMembers.length;
    const isUserInGroup = groupMembers.some(m => m.uid === currentUser.uid);

    console.log("Group info:", { groupName, groupSubject, groupCode, totalMembers });
    console.log("Members to display:", groupMembers.map(m => ({ name: m.name, uid: m.uid, points: m.points })));
    console.log("Is current user in group:", isUserInGroup);

    let html = `
    <div style="padding: 20px;">
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: var(--text);">${escapeHtml(groupName)}</h3>
        <p style="margin: 0; font-size: 13px; color: var(--text-muted);">${escapeHtml(groupSubject)}</p>
      </div>

      <div style="background: var(--surface2); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 13px; color: var(--text-muted);">Invite Code</span>
          <span style="font-family: monospace; font-weight: 600; color: var(--accent); font-size: 14px;">${escapeHtml(groupCode)}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-small" onclick="window.copyGroupCode('${groupCode}')" style="flex: 1; padding: 8px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            <i class="fa-solid fa-copy"></i> Copy Code
          </button>
          ${!isUserInGroup ? `
          <button class="btn-small" onclick="window.joinGroupFromModal('${groupCode}')" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            <i class="fa-solid fa-user-plus"></i> Join Group
          </button>
          ` : ''}
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text); display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-users"></i> Team Members (${totalMembers})
        </h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
  `;

    if (groupMembers.length === 0) {
      html += `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No members yet</div>`;
    } else {
      groupMembers.forEach((member, index) => {
        console.log(`Member ${index}:`, member.name, member.uid, member.points);
        const isCurrentUser = member.uid === currentUser.uid;
        const avatar = member.name?.charAt(0).toUpperCase() || "?";
        html += `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border);">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
            ${avatar}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 500; color: var(--text);">
              ${escapeHtml(member.name || "Unknown")}
              ${isCurrentUser ? '<span style="margin-left: 8px; font-size: 11px; background: var(--accent); color: white; padding: 2px 6px; border-radius: 3px; font-weight: 600;">You</span>' : ''}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">${member.points || 0} pts</div>
          </div>
        </div>
      `;
      });
    }

    html += `
        </div>
      </div>

      <button class="btn-primary" onclick="closeModal('groupDetailsModal')" style="width: 100%; padding: 10px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
        Close
      </button>
    </div>
  `;

    document.getElementById('groupDetailsContent').innerHTML = html;
    openModal('groupDetailsModal');
    console.log("✅ Group details modal opened with", groupMembers.length, "members");
  } catch (error) {
    console.error("❌ Error displaying group details:", error);
    toast("Error loading group details", "error");
  }
}

window.debugGroupMembers = async function () {
  console.log("=== DEBUG GROUP MEMBERS ===");
  console.log("Current user UID:", currentUser.uid);
  console.log("Current user groupId:", userDoc.groupId);

  if (!userDoc.groupId) {
    console.error("❌ User not in a group");
    return;
  }

  try {
    // Fetch group document
    const groupSnap = await getDoc(doc(db, "groups", userDoc.groupId));
    if (!groupSnap.exists()) {
      console.error("❌ Group document not found");
      return;
    }

    const groupData = groupSnap.data();
    console.log("📋 Group data:", groupData);
    console.log("📊 Members array in Firestore:", groupData.members);
    console.log("📊 Total members in array:", groupData.members?.length || 0);

    // Fetch each member
    if (groupData.members && groupData.members.length > 0) {
      console.log("🔍 Fetching individual member documents...");
      for (const memberId of groupData.members) {
        const userSnap = await getDoc(doc(db, "users", memberId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          console.log(`✅ Member: ${userData.name} (${memberId}) - ${userData.points} pts`);
        } else {
          console.warn(`⚠️ User document not found for ${memberId}`);
        }
      }
    }

    console.log("✅ Debug complete");
  } catch (error) {
    console.error("❌ Debug error:", error);
  }
};

window.copyGroupCode = function (code) {
  navigator.clipboard.writeText(code).then(() => {
    toast("Code copied to clipboard!", "success");
  }).catch(() => {
    toast("Failed to copy code", "error");
  });
};

window.joinGroupFromModal = async function (code) {
  console.log("🔍 Joining group from modal with code:", code);
  try {
    const q = query(collection(db, "groups"), where("code", "==", code));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.error("❌ No group found with code:", code);
      toast("Invalid code", "error");
      return;
    }

    const gid = snap.docs[0].id;
    const groupRef = snap.docs[0].ref;
    const groupData = snap.docs[0].data();
    const currentMembers = groupData.members || [];

    console.log("✅ Found group:", gid);
    console.log("📋 Current members in group:", currentMembers);
    console.log("👤 Current user UID:", currentUser.uid);

    // Check if user is already a member
    if (currentMembers.includes(currentUser.uid)) {
      console.warn("⚠️ User already in group");
      toast("You are already a member of this group", "error");
      return;
    }

    // Add user to members array
    const updatedMembers = [...currentMembers, currentUser.uid];
    console.log("➕ Adding user to members. New members array:", updatedMembers);

    // Update group document with new members
    await updateDoc(groupRef, { members: updatedMembers });
    console.log("✅ Group document updated with new members");

    // Wait a moment for Firestore to sync
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify the update was successful
    const verifySnap = await getDoc(groupRef);
    const verifyData = verifySnap.data();
    const verifyMembers = verifyData.members || [];
    console.log("✅ Verification - Members in group after update:", verifyMembers);
    console.log("✅ Verification - Total members:", verifyMembers.length);

    if (!verifyMembers.includes(currentUser.uid)) {
      console.error("❌ CRITICAL: User was not added to group!");
      toast("Error: Failed to add you to group. Please try again.", "error");
      return;
    }

    // Update user document with groupId
    await updateDoc(doc(db, "users", currentUser.uid), { groupId: gid });
    console.log("✅ User document updated with groupId");

    userDoc.groupId = gid;
    toast("Successfully joined group!", "success");

    // Reload group and listeners
    await loadGroup(gid);
    setupListeners();

    // Refresh the modal to show updated members
    setTimeout(() => {
      window.openGroupDetailsModal();
    }, 500);

  } catch (e) {
    console.error("❌ Error joining group from modal:", e);
    toast("Error joining group: " + e.message, "error");
  }
};
window.switchModalTab = function (tab, el) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  ['create', 'join'].forEach(t => { const e2 = document.getElementById('modal-' + t); if (e2) e2.classList.toggle('hidden', t !== tab); });
};

window.createGroup = async function () {
  const name = document.getElementById('grpName').value.trim();
  const subject = document.getElementById('grpSubject').value.trim();
  if (!name) return groupMsg("Enter a group name", "error");
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  try {
    const ref = await addDoc(collection(db, "groups"), { name, subject, code, createdBy: currentUser.uid, createdAt: serverTimestamp(), members: [currentUser.uid] });
    await updateDoc(doc(db, "users", currentUser.uid), { groupId: ref.id });
    userDoc.groupId = ref.id;
    groupMsg(`Group created! Invite Code: ${code}`, "success");
    await loadGroup(ref.id); setupListeners();
    setTimeout(() => closeModal('groupModal'), 2000);
  } catch (e) { groupMsg("Error creating group", "error"); }
};

window.joinGroup = async function () {
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  if (!code) return groupMsg("Enter invite code", "error");
  try {
    console.log("🔍 Searching for group with code:", code);
    const q = query(collection(db, "groups"), where("code", "==", code));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.error("❌ No group found with code:", code);
      return groupMsg("Invalid code", "error");
    }

    const gid = snap.docs[0].id;
    const groupRef = snap.docs[0].ref;
    const groupData = snap.docs[0].data();
    const currentMembers = groupData.members || [];

    console.log("✅ Found group:", gid);
    console.log("📋 Current members in group:", currentMembers);
    console.log("👤 Current user UID:", currentUser.uid);

    // Check if user is already a member
    if (currentMembers.includes(currentUser.uid)) {
      console.warn("⚠️ User already in group");
      return groupMsg("You are already a member of this group", "error");
    }

    // Add user to members array
    const updatedMembers = [...currentMembers, currentUser.uid];
    console.log("➕ Adding user to members. New members array:", updatedMembers);

    // Update group document with new members using arrayUnion for safety
    await updateDoc(groupRef, {
      members: updatedMembers
    });
    console.log("✅ Group document updated with new members");

    // Wait a moment for Firestore to sync
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify the update was successful by fetching fresh data
    const verifySnap = await getDoc(groupRef);
    const verifyData = verifySnap.data();
    const verifyMembers = verifyData.members || [];
    console.log("✅ Verification - Members in group after update:", verifyMembers);
    console.log("✅ Verification - Total members:", verifyMembers.length);

    if (!verifyMembers.includes(currentUser.uid)) {
      console.error("❌ CRITICAL: User was not added to group!");
      return groupMsg("Error: Failed to add you to group. Please try again.", "error");
    }

    // Update user document with groupId
    await updateDoc(doc(db, "users", currentUser.uid), { groupId: gid });
    console.log("✅ User document updated with groupId");

    userDoc.groupId = gid;
    groupMsg("Joined! Loading...", "success");

    // Clear form
    document.getElementById('joinCode').value = '';

    await loadGroup(gid);
    setupListeners();

    setTimeout(() => closeModal('groupModal'), 1200);
  } catch (e) {
    console.error("❌ Error joining group:", e);
    groupMsg("Error joining group: " + e.message, "error");
  }
};

function groupMsg(msg, type) {
  const el = document.getElementById('groupModalMsg');
  el.className = `auth-msg ${type}`; el.textContent = msg; el.classList.remove('hidden');
}

// ===== Mini Calendar =====
function renderMiniCalendar() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let html = `<div class="mini-cal-header"><span>${months[m]} ${y}</span></div><div class="mini-cal-grid">`;
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => html += `<div class="mini-day-label">${d}</div>`);
  for (let i = 0; i < first; i++) html += `<div class="mini-day other-month"></div>`;
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasEv = events.some(e => e.date === ds), hasTask = tasks.some(t => t.deadline === ds && t.column !== 'completed'), isToday = d === now.getDate();
    html += `<div class="mini-day ${isToday ? 'today' : ''} ${hasEv ? 'has-event' : ''} ${hasTask ? 'has-task' : ''}">${d}</div>`;
  }
  html += `</div>`;
  document.getElementById('miniCalendar').innerHTML = html;
  renderTodayEvents();
}

function renderTodayEvents() {
  const now = new Date();
  const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const el = document.getElementById('todayEvents'); if (!el) return;
  const todayEvs = events.filter(e => e.date === ds);
  el.innerHTML = todayEvs.length ? todayEvs.slice(0, 3).map(e => `<div class="ev-chip" style="--c:${e.color || 'var(--accent)'}"><span class="ev-chip-time">${e.startTime || e.time || '—'}</span><span class="ev-chip-title">${e.title}</span></div>`).join('') : '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px">No events today</div>';
}

// ===== Full Calendar =====
function renderCalendar() {
  document.getElementById('calHeader').innerHTML = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="cal-day-label">${d}</div>`).join('');
  if (calView === 'month') renderMonthCal(); else renderWeekCal();
}

function renderMonthCal() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('calTitle').textContent = `${months[m]} ${y}`;
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
  const now = new Date(); let html = '';
  for (let i = first - 1; i >= 0; i--) html += `<div class="cal-cell other-month"><div class="cell-num">${prevDays - i}</div></div>`;
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = d === now.getDate() && m === now.getMonth() && y === now.getFullYear();
    const dayEvs = events.filter(e => e.date === ds), dayTasks = tasks.filter(t => t.deadline === ds && t.column !== 'completed');
    const total = dayEvs.length + dayTasks.length;
    html += `<div class="cal-cell ${isToday ? 'today' : ''}" onclick="openEventModal('${ds}')">
      <div class="cell-num">${d}</div>
      ${dayEvs.slice(0, 2).map(e => `<div class="cal-event" style="--c:${e.color || 'var(--accent)'}"><i class="fa-solid fa-circle" style="font-size:5px"></i> ${e.title}</div>`).join('')}
      ${dayTasks.slice(0, 1).map(t => `<div class="cal-event task-ev" style="--c:#a78bfa">📋 ${t.title}</div>`).join('')}
      ${total > 3 ? `<div class="cal-more">+${total - 3} more</div>` : ''}
    </div>`;
  }
  const remain = (first + days) % 7 === 0 ? 0 : 7 - ((first + days) % 7);
  for (let i = 1; i <= remain; i++) html += `<div class="cal-cell other-month"><div class="cell-num">${i}</div></div>`;
  document.getElementById('calBody').innerHTML = html;
  document.getElementById('calBody').style.gridTemplateColumns = '';
}

function renderWeekCal() {
  const start = new Date(calDate); start.setDate(calDate.getDate() - calDate.getDay());
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const endDate = new Date(start); endDate.setDate(start.getDate() + 6);
  document.getElementById('calTitle').textContent = `${months[start.getMonth()]} ${start.getDate()} – ${months[endDate.getMonth()]} ${endDate.getDate()}, ${start.getFullYear()}`;
  let html = '';
  for (let d = 0; d < 7; d++) {
    const day = new Date(start); day.setDate(start.getDate() + d);
    const ds = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const dayEvs = events.filter(e => e.date === ds), dayTasks = tasks.filter(t => t.deadline === ds && t.column !== 'completed');
    const isToday = ds === new Date().toISOString().split('T')[0];
    html += `<div class="cal-cell ${isToday ? 'today' : ''}" style="min-height:140px" onclick="openEventModal('${ds}')">
      <div class="cell-num" style="font-size:14px">${day.getDate()}</div>
      ${dayEvs.map(e => `<div class="cal-event" style="--c:${e.color || 'var(--accent)'}">${e.startTime || ''} ${e.title}</div>`).join('')}
      ${dayTasks.map(t => `<div class="cal-event task-ev" style="--c:#a78bfa">📋 ${t.title}</div>`).join('')}
    </div>`;
  }
  document.getElementById('calBody').innerHTML = html;
  document.getElementById('calBody').style.gridTemplateColumns = 'repeat(7,1fr)';
}

window.calNav = function (dir) {
  if (calView === 'month') calDate.setMonth(calDate.getMonth() + dir);
  else calDate.setDate(calDate.getDate() + dir * 7);
  renderCalendar();
};
window.setCalView = function (v, btn) {
  calView = v;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCalendar();
};
window.goToToday = function () { calDate = new Date(); renderCalendar(); };

// ===== Events =====
window.openEventModal = function (dateStr) {
  editingEventId = null;
  document.getElementById('eventModalTitle').textContent = 'Add Event';
  document.getElementById('evTitle').value = '';
  document.getElementById('evDate').value = typeof dateStr === 'string' ? dateStr : new Date().toISOString().split('T')[0];
  document.getElementById('evStartTime').value = '';
  document.getElementById('evEndTime').value = '';
  document.getElementById('evNotes').value = '';
  document.getElementById('evSaveTxt').textContent = 'Save Event';
  selectedColor = '#ff6b35';
  document.querySelectorAll('.color-dot').forEach(d => d.classList.toggle('active', d.dataset.color === selectedColor));
  openModal('eventModal');
};
window.pickColor = function (btn) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  btn.classList.add('active'); selectedColor = btn.dataset.color;
};
window.saveEvent = async function () {
  const title = document.getElementById('evTitle').value.trim();
  const date = document.getElementById('evDate').value;
  const startTime = document.getElementById('evStartTime').value;
  const endTime = document.getElementById('evEndTime').value;
  const notes = document.getElementById('evNotes').value.trim();
  if (!title || !date) return toast("Title and date required", "error");
  if (!userDoc.groupId) return toast("Join a group first", "error");
  const data = { title, date, startTime, endTime, time: startTime, notes, color: selectedColor, createdBy: currentUser.uid, createdAt: serverTimestamp() };
  try {
    if (editingEventId) { await updateDoc(doc(db, "groups", userDoc.groupId, "events", editingEventId), data); toast("Event updated!", "success"); }
    else {
      await addDoc(collection(db, "groups", userDoc.groupId, "events"), data);
      await awardPoints(POINTS.EVENT_ADD);
      await logActivity(`📅 ${userDoc.name} added event: ${title}`, 'event');
      toast(`Event added! +${POINTS.EVENT_ADD} pts`, "success");
    }
    closeModal('eventModal');
  } catch (e) { toast("Error saving event", "error"); }
};

// ===== Tasks =====
window.openTaskModal = function (col) {
  const defaultCol = col || 'todo'; editingTaskId = null;
  document.getElementById('taskModalTitle').textContent = 'Add Task';
  document.getElementById('tskTitle').value = '';
  document.getElementById('tskDeadline').value = '';
  document.getElementById('tskDeadlineDisplay').value = '';
  document.getElementById('tskType').value = 'learning';
  document.getElementById('tskPriority').value = 'medium';
  document.getElementById('tskColumn').value = defaultCol;
  document.getElementById('tskSaveTxt').textContent = 'Add Task';
  openModal('taskModal');
};

function populateAssigneeDropdown() {
  const sel = document.getElementById('tskAssign');
  if (!sel) return;

  sel.innerHTML = '<option value="">Unassigned</option>';

  // Remove duplicates by using a Set to track UIDs
  const seenUids = new Set();
  const uniqueMembers = [];

  for (const member of groupMembers) {
    if (!seenUids.has(member.uid)) {
      seenUids.add(member.uid);
      uniqueMembers.push(member);
    }
  }

  console.log("📋 Populating dropdown with", uniqueMembers.length, "unique members");

  uniqueMembers.forEach(m => {
    const o = document.createElement('option');
    o.value = m.uid;
    o.textContent = m.name + (m.uid === currentUser.uid ? ' (you)' : '');
    sel.appendChild(o);
  });
}

function populateDiscussionTaskDropdown(tasksList) {
  const sel = document.getElementById('discussionTaskSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Choose a task...</option>';
  tasksList.forEach(t => {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = t.title;
    sel.appendChild(o);
  });
}

window.updateTaskTypeFields = function () {
  const taskType = document.getElementById('tskType').value;
  const fileGroup = document.getElementById('taskTypeFileGroup');
  const fileLabel = document.getElementById('taskTypeFileLabel');
  const fileHint = document.getElementById('taskTypeFileHint');

  if (taskType === 'learning') {
    fileLabel.textContent = 'Upload Quiz Result Screenshot';
    fileHint.textContent = 'For Learning: Screenshot of quiz results (PNG, JPG, GIF)';
    document.getElementById('tskTypeFiles').accept = '.jpg,.jpeg,.png,.gif';
  } else if (taskType === 'creation') {
    fileLabel.textContent = 'Upload Work Files';
    fileHint.textContent = 'For Creation: Doc, PPT, PDF, Report, etc.';
    document.getElementById('tskTypeFiles').accept = '.doc,.docx,.ppt,.pptx,.pdf,.jpg,.png';
  }
  fileGroup.style.display = 'block';
};

window.saveTask = async function () {
  const title = document.getElementById('tskTitle').value.trim();
  const deadline = document.getElementById('tskDeadline').value;
  const priority = document.getElementById('tskPriority').value;
  const assignedTo = document.getElementById('tskAssign').value;
  const column = document.getElementById('tskColumn').value;
  const taskType = document.getElementById('tskType').value;

  if (!title) return toast("Task title required", "error");
  if (!deadline) return toast("Deadline date required", "error");
  if (!userDoc.groupId) return toast("Join a group first", "error");

  const assignedName = groupMembers.find(m => m.uid === assignedTo)?.name || '';
  const points = priority === 'high' ? 25 : priority === 'medium' ? 15 : 10;

  const data = {
    title, deadline, priority, column, assignedTo, assignedName, points,
    type: taskType,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
    uploadedFiles: [],
    approvals: [],
    rejections: [],
    submittedBy: currentUser.uid
  };

  try {
    if (editingTaskId) {
      await updateDoc(doc(db, "groups", userDoc.groupId, "tasks", editingTaskId), data);
      toast("Task updated!", "success");
    } else {
      await addDoc(collection(db, "groups", userDoc.groupId, "tasks"), data);
      await awardPoints(POINTS.TASK_ADD);
      await logActivity(`✅ ${userDoc.name} added task: ${title}`, 'task');
      toast(`Task added! +${POINTS.TASK_ADD} pts`, "success");
    }
    closeModal('taskModal');
  } catch (e) {
    console.error(e);
    toast("Error saving task", "error");
  }
};

function renderKanban() {
  ['todo', 'inprogress', 'completed', 'pending_peer_approval'].forEach(col => {
    let colTasks = tasks.filter(t => t.column === col);

    // Apply filter for pending approval column
    if (col === 'pending_peer_approval') {
      if (pendingApprovalFilter === 'mine') {
        colTasks = colTasks.filter(t => t.assignedTo === currentUser.uid);
      } else if (pendingApprovalFilter === 'others') {
        colTasks = colTasks.filter(t => t.assignedTo !== currentUser.uid);
      }
    }

    document.getElementById('count-' + col).textContent = colTasks.length;
    document.getElementById('cards-' + col).innerHTML = colTasks.map(renderTaskCard).join('');
  });
  setupDragDrop();
}

function renderTaskCard(t) {
  const now = new Date(), deadline = t.deadline ? new Date(t.deadline) : null;
  const isOverdue = deadline && deadline < now && t.column !== 'completed' && t.column !== 'pending_peer_approval';
  const isCompleted = t.column === 'completed';
  const isPendingApproval = t.column === 'pending_peer_approval';
  const approvalCount = (t.approvals || []).length;
  const rejectionCount = (t.rejections || []).length;
  const isApproved = approvalCount >= window.getRequiredApprovals();
  const deadlineStr = deadline ? deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  let verifyButton = '';
  let submitButton = '';
  const isAssignedToUser = !t.assignedTo || t.assignedTo === currentUser.uid;

  if (t.column === 'inprogress' && isAssignedToUser) {
    submitButton = `<button class="task-act-btn submit" onclick="window.openTaskSubmissionModal('${t.id}', '${escapeHtml(t.title)}')" title="Submit as Completed"><i class="fa-solid fa-paper-plane"></i></button>`;
  }
  if ((t.column === 'inprogress' || t.column === 'todo') && isAssignedToUser) {
    verifyButton = `<button class="task-act-btn verify" onclick="window.openTaskVerificationModal('${t.id}', '${escapeHtml(t.title)}', '${escapeHtml(t.description || '')}')" title="Verify with Quiz"><i class="fa-solid fa-quiz"></i></button>`;
  }

  let statusBadge = '';
  if (isPendingApproval) {
    if (isApproved) {
      statusBadge = `<div class="verification-badge completed"><i class="fa-solid fa-check-circle"></i> Completed</div>`;
    } else if (rejectionCount > 0) {
      statusBadge = `<div class="verification-badge failed"><i class="fa-solid fa-x-circle"></i> Rejected</div>`;
    } else {
      statusBadge = `<div class="verification-badge pending"><i class="fa-solid fa-hourglass-half"></i> Pending Approval (${approvalCount}/${window.getRequiredApprovals()})</div>`;
    }
  } else if (isCompleted) {
    statusBadge = `<div class="verification-badge completed"><i class="fa-solid fa-check-circle"></i> Completed</div>`;
  } else if (t.verificationScore) {
    const passed = t.verificationScore >= 70;
    statusBadge = `<div class="verification-badge ${passed ? 'passed' : 'failed'}"><i class="fa-solid fa-${passed ? 'check' : 'x'}"></i> ${t.verificationScore}%</div>`;
  }

  let typeIcon = '';
  if (t.type === 'learning') {
    typeIcon = `<span class="task-type-badge learning" title="Learning Task">📚</span>`;
  } else if (t.type === 'creation') {
    typeIcon = `<span class="task-type-badge creation" title="Creation Task">✏️</span>`;
  }

  let approvalButtons = '';
  if (isPendingApproval && t.assignedTo !== currentUser.uid) {
    const hasApproved = (t.approvals || []).includes(currentUser.uid);
    const hasRejected = (t.rejections || []).includes(currentUser.uid);
    approvalButtons = `
      <div class="task-approval-buttons" style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
        <button class="task-act-btn" onclick="window.openSubmittedFilesModal('${t.id}', '${escapeHtml(t.title)}')" title="View Submitted Files" style="width: 100%; padding: 10px; background: var(--surface3); border: 1px solid var(--border); color: var(--text); cursor: pointer; border-radius: 6px; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <i class="fa-solid fa-file"></i> View Files
        </button>
        <div style="display: flex; gap: 8px;">
          <button class="task-act-btn" onclick="window.approveTask('${t.id}')" title="Approve" style="flex: 1; padding: 10px; background: ${hasApproved ? 'rgba(78, 205, 196, 0.2)' : 'var(--surface3)'}; border: 1px solid ${hasApproved ? '#4ecdc4' : 'var(--border)'}; color: ${hasApproved ? '#4ecdc4' : 'var(--text)'}; cursor: pointer; border-radius: 6px; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-thumbs-up"></i> Approve
          </button>
          <button class="task-act-btn" onclick="window.rejectTask('${t.id}')" title="Reject" style="flex: 1; padding: 10px; background: ${hasRejected ? 'rgba(255, 107, 53, 0.2)' : 'var(--surface3)'}; border: 1px solid ${hasRejected ? '#ff6b35' : 'var(--border)'}; color: ${hasRejected ? '#ff6b35' : 'var(--text)'}; cursor: pointer; border-radius: 6px; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-thumbs-down"></i> Reject
          </button>
        </div>
      </div>
    `;
  } else if (isPendingApproval && t.assignedTo === currentUser.uid) {
    // Show approval status for user's own submitted task
    const approvalCount = (t.approvals || []).length;
    const rejectionCount = (t.rejections || []).length;
    const requiredApprovals = window.getRequiredApprovals();

    let statusText = '';
    let statusColor = '';
    let statusIcon = '';

    if (rejectionCount > 0) {
      statusText = `Rejected by ${rejectionCount} member${rejectionCount > 1 ? 's' : ''}`;
      statusColor = '#ff6b35';
      statusIcon = 'fa-x-circle';
    } else if (approvalCount >= requiredApprovals) {
      statusText = `Approved! (${approvalCount}/${requiredApprovals})`;
      statusColor = '#4ecdc4';
      statusIcon = 'fa-check-circle';
    } else {
      statusText = `Waiting for approval (${approvalCount}/${requiredApprovals})`;
      statusColor = '#a78bfa';
      statusIcon = 'fa-hourglass-half';
    }

    approvalButtons = `
      <div class="task-approval-status" style="margin-top: 12px; padding: 12px; background: var(--surface2); border-radius: 6px; border-left: 4px solid ${statusColor};">
        <div style="display: flex; align-items: center; gap: 8px; color: ${statusColor}; font-size: 13px; font-weight: 500;">
          <i class="fa-solid ${statusIcon}"></i>
          <span>${statusText}</span>
        </div>
      </div>
    `;
  }

  return `<div class="task-card ${isCompleted ? 'task-completed' : ''}" draggable="${(!t.assignedTo || t.assignedTo === '' || t.assignedTo === currentUser.uid || t.createdBy === currentUser.uid) ? 'true' : 'false'}" data-id="${t.id}">
    <div class="task-card-header">
      <label class="task-toggle-wrap" title="${isCompleted ? 'Mark incomplete' : 'Mark complete'}">
        <input type="checkbox" class="task-toggle" ${isCompleted ? 'checked' : ''} onchange="toggleTaskComplete('${t.id}', this.checked)">
        <span class="task-toggle-slider"><span class="toggle-label-on">Done</span><span class="toggle-label-off">To Do</span></span>
      </label>
      <span class="task-pts-badge">+${t.points || 10}pts</span>
    </div>
    <div class="task-card-title ${isCompleted ? 'line-through' : ''}">${t.title}</div>
    <div class="task-card-meta">
      <span class="priority-badge ${t.priority}">${t.priority}</span>
      ${typeIcon}
      ${t.assignedName ? `<span class="task-assignee"><div class="task-assignee-av">${t.assignedName.charAt(0)}</div>${t.assignedName.split(' ')[0]}</span>` : ''}
      ${deadline ? `<span class="task-deadline ${isOverdue ? 'overdue' : ''}"><i class="fa-regular fa-clock"></i> ${deadlineStr}</span>` : ''}
    </div>
    ${statusBadge}
    <div class="task-card-actions">
      ${submitButton}
      ${verifyButton}
      <button class="task-act-btn" onclick="editTask('${t.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <button class="task-act-btn danger" onclick="deleteTask('${t.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
    </div>
    ${approvalButtons}
  </div>`;
}

window.toggleTaskComplete = async function (id, checked) {
  try {
    const task = tasks.find(t => t.id === id); if (!task) return;

    if (checked) {
      // Open proof verification modal instead of direct completion
      if (window.openProofModal) {
        window.openProofModal(id, task.title, task.description || '');
      } else {
        // Fallback if proof verification not available
        const newCol = 'completed';
        await updateDoc(doc(db, "groups", userDoc.groupId, "tasks", id), { column: newCol, updatedAt: serverTimestamp() });
        const pts = task.points || POINTS.TASK_COMPLETE;
        const bonus = task.deadline && new Date(task.deadline) > new Date() ? POINTS.EARLY_COMPLETION : 0;
        await awardPoints(pts + bonus, true);
        await logActivity(`🏆 ${userDoc.name} completed: ${task.title}`, 'complete');
        toast(`Task done! +${pts + bonus} pts${bonus ? ' (Early bonus!)' : ''} 🎉`, "success");
      }
    } else {
      const newCol = 'todo';
      await updateDoc(doc(db, "groups", userDoc.groupId, "tasks", id), { column: newCol, updatedAt: serverTimestamp() });
      toast("Task moved back to To Do", "info");
    }
  } catch (e) { toast("Error", "error"); }
};

window.editTask = function (id) {
  const task = tasks.find(t => t.id === id); if (!task) return;

  console.log('editTask called for task:', task);

  // Check if user can edit this task
  if (!window.canEditTask(task)) {
    console.log('User cannot edit this task - showing alert');
    window.showAlert('Cannot Edit', 'This task is not assigned to you');
    return;
  }

  console.log('User can edit this task - opening modal');
  editingTaskId = id;
  document.getElementById('taskModalTitle').textContent = 'Edit Task';
  document.getElementById('tskTitle').value = task.title;
  document.getElementById('tskDeadline').value = task.deadline || '';
  const st = document.getElementById('tskStartTime'); if (st) st.value = task.startTime || '';
  const et = document.getElementById('tskEndTime'); if (et) et.value = task.endTime || '';
  document.getElementById('tskPriority').value = task.priority || 'medium';
  document.getElementById('tskAssign').value = task.assignedTo || '';
  document.getElementById('tskColumn').value = task.column || 'todo';
  document.getElementById('tskSaveTxt').textContent = 'Save Changes';
  openModal('taskModal');
};

window.deleteTask = async function (id) {
  const task = tasks.find(t => t.id === id); if (!task) return;

  // Check if user can delete this task
  if (!window.canEditTask(task)) {
    window.showAlert('Cannot Delete', 'This task is not assigned to you');
    return;
  }

  if (!confirm('Delete this task?')) return;
  try {
    await deleteDoc(doc(db, "groups", userDoc.groupId, "tasks", id));
    toast("Task deleted", "info");
  } catch (e) {
    toast("Error", "error");
  }
};

window.filterTasks = function (f, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const now = new Date();
  ['todo', 'inprogress', 'completed'].forEach(col => {
    let ct = tasks.filter(t => t.column === col);
    if (f === 'mine') ct = ct.filter(t => t.assignedTo === currentUser.uid);
    if (f === 'overdue') ct = ct.filter(t => t.deadline && new Date(t.deadline) < now && t.column !== 'completed');
    document.getElementById('count-' + col).textContent = ct.length;
    document.getElementById('cards-' + col).innerHTML = ct.map(renderTaskCard).join('');
  });
  setupDragDrop();
};

function setupDragDrop() {
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      // Check if card is actually draggable
      if (card.draggable === false || card.getAttribute('draggable') === 'false') {
        e.preventDefault();
        e.dataTransfer.effectAllowed = 'none';
        setTimeout(() => {
          window.showAlert('Cannot Move Task', 'This is not your assigned task. You cannot take action on them');
        }, 50);
        return false;
      }

      const taskId = card.dataset.id;
      const task = tasks.find(t => t.id === taskId);

      // Double-check permission
      const isUnassigned = !task?.assignedTo || task?.assignedTo === '';
      const isAssignedToMe = task?.assignedTo === currentUser?.uid;
      const isCreatedByMe = task?.createdBy === currentUser?.uid;
      const canDrag = isUnassigned || isAssignedToMe || isCreatedByMe;

      if (!canDrag) {
        e.preventDefault();
        e.dataTransfer.effectAllowed = 'none';
        setTimeout(() => {
          window.showAlert('Cannot Move Task', 'This is not your assigned task. You cannot take action on them');
        }, 50);
        return false;
      }

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('taskId', taskId);
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });
}

window.dropTask = async function (e, col) {
  e.preventDefault();
  document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
  const id = e.dataTransfer.getData('taskId'); if (!id) return;
  try {
    const task = tasks.find(t => t.id === id);

    // Check if user can move this task
    if (!window.canEditTask(task)) {
      window.showAlert('Cannot Move Task', 'This task is not assigned to you');
      return;
    }

    // When task is moved to completed, ask for proof first
    if (col === 'completed' && task?.column !== 'completed') {
      // Open proof submission modal based on task type
      window.openProofSubmissionModal(id, task.title, task.type);
      return;
    }

    // For other columns, just move the task
    const targetCol = col;
    await updateDoc(doc(db, "groups", userDoc.groupId, "tasks", id), { column: targetCol, updatedAt: serverTimestamp() });

  } catch (e) {
    console.error(e);
    toast("Error moving task", "error");
  }
};

// ===== Task Summary =====
let taskDonutChart = null;
function renderTaskSummary() {
  const done = tasks.filter(t => t.column === 'completed').length, inprog = tasks.filter(t => t.column === 'inprogress').length;
  const todo = tasks.filter(t => t.column === 'todo').length, total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('donutPct').textContent = pct + '%';
  document.getElementById('wsToday').textContent = tasks.filter(t => { const d = t.deadline ? new Date(t.deadline) : null; return d && d.toDateString() === new Date().toDateString(); }).length;
  renderDashboardTaskBadge();
  const ctx = document.getElementById('taskDonut')?.getContext('2d'); if (!ctx) return;
  if (taskDonutChart) taskDonutChart.destroy();
  taskDonutChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Done', 'In Progress', 'To Do'], datasets: [{ data: [done, inprog, todo], backgroundColor: ['#4ecdc4', '#ff6b35', '#a78bfa'], borderWidth: 0, hoverOffset: 4 }] }, options: { cutout: '70%', plugins: { legend: { display: false } }, responsive: false } });
  const bars = document.getElementById('taskBarsUI');
  if (bars) bars.innerHTML = [{ label: 'Completed', val: done, color: '#4ecdc4' }, { label: 'In Progress', val: inprog, color: '#ff6b35' }, { label: 'To Do', val: todo, color: '#a78bfa' }].map(b => `<div class="task-bar-item"><span class="label">${b.label}</span><div class="task-bar-track"><div class="task-bar-fill" style="width:${total ? Math.round((b.val / total) * 100) : 0}%;background:${b.color}"></div></div><span class="val">${b.val}</span></div>`).join('');
}

function renderDashboardTaskBadge() {
  const pending = tasks.filter(t => t.column !== 'completed').length;
  const badge = document.getElementById('taskBadge');
  if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'flex' : 'none'; }
}

async function logActivity(text, type) {
  if (!userDoc.groupId) return;
  try { await addDoc(collection(db, "groups", userDoc.groupId, "activity"), { text, type, uid: currentUser.uid, createdAt: serverTimestamp() }); } catch (e) { }
}

function renderActivity() {
  const el = document.getElementById('activityFeed'); if (!el) return;
  if (!activity.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px">No activity yet</div>'; return; }
  const icons = { task: { bg: 'rgba(167,139,250,0.15)', icon: '✅', color: '#a78bfa' }, complete: { bg: 'rgba(78,205,196,0.15)', icon: '🏆', color: '#4ecdc4' }, event: { bg: 'rgba(255,107,53,0.15)', icon: '📅', color: '#ff6b35' }, resource: { bg: 'rgba(96,165,250,0.15)', icon: '📎', color: '#60a5fa' } };
  el.innerHTML = activity.slice(0, 10).map(a => { const t = icons[a.type] || icons.task; return `<div class="activity-item"><div class="act-icon" style="background:${t.bg};color:${t.color}">${t.icon}</div><div class="act-text"><span>${a.text}</span></div><span class="act-time">${a.createdAt?.toDate ? timeAgo(a.createdAt.toDate()) : 'just now'}</span></div>`; }).join('');
}

function timeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago';
}

async function awardPoints(pts, isTask) {
  try {
    userDoc.points = (userDoc.points || 0) + pts;
    if (isTask) userDoc.tasksCompleted = (userDoc.tasksCompleted || 0) + 1;
    await updateDoc(doc(db, "users", currentUser.uid), { points: userDoc.points, tasksCompleted: userDoc.tasksCompleted || 0, lastActive: serverTimestamp() });
    document.getElementById('sidebarUserPts').textContent = userDoc.points + ' pts';
    document.getElementById('wsPoints').textContent = userDoc.points;
    document.getElementById('sidebarUserPts').classList.add('pts-bump');
    setTimeout(() => document.getElementById('sidebarUserPts').classList.remove('pts-bump'), 600);
  } catch (e) { }
}

// ===== Leaderboard =====
function renderLeaderboard() {
  const sorted = [...groupMembers].sort((a, b) => (b.points || 0) - (a.points || 0));
  const preview = document.getElementById('leaderPreview');
  if (preview) preview.innerHTML = sorted.slice(0, 5).map((m, i) => `<div class="leader-item"><span class="leader-rank ${['gold', 'silver', 'bronze'][i] || ''}">${i + 1}</span><div class="leader-avatar">${m.name.charAt(0)}</div><span class="leader-name">${m.name}</span><span class="leader-pts">${m.points || 0} pts</span></div>`).join('') || '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:12px">No members yet</div>';

  const podium = document.getElementById('podiumArea');
  if (podium && sorted.length > 0) {
    const display = [sorted[1], sorted[0], sorted[2]].filter(Boolean);
    const positions = [{ cls: 'second', rank: 2, crown: '🥈', h: '80px' }, { cls: 'first', rank: 1, crown: '👑', h: '120px' }, { cls: 'third', rank: 3, crown: '🥉', h: '60px' }];
    podium.innerHTML = display.map((m) => {
      const c = sorted.indexOf(m), med = c === 0 ? positions[1] : c === 1 ? positions[0] : positions[2];
      const colors = ['linear-gradient(135deg,#ff6b35,#a78bfa)', 'linear-gradient(135deg,#4ecdc4,#60a5fa)', 'linear-gradient(135deg,#a78bfa,#ff6b35)'];
      return `<div class="podium-item ${med.cls}"><div class="podium-crown">${med.crown}</div><div class="podium-avatar" style="background:${colors[c % 3]}">${m.name.charAt(0)}</div><div class="podium-name">${m.name}</div><div class="podium-pts">${m.points || 0} pts</div><div class="podium-base" style="height:${med.h}">${med.rank}</div></div>`;
    }).join('');
  }

  const full = document.getElementById('leaderboardFull');
  if (full) full.innerHTML = sorted.map((m, i) => {
    const isMe = m.uid === currentUser.uid;
    const rankColors = [' style="color:var(--gold)"', ' style="color:#c0c0c0"', ' style="color:#cd7f32"'];
    const streak = m.streak > 2 ? `<span class="streak-badge">${m.streak}🔥</span>` : '';
    return `<div class="lb-full-item ${isMe ? 'me' : ''}">
      <span class="lb-num"${rankColors[i] || ''}>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
      <div class="lb-avatar" style="background:linear-gradient(135deg,var(--accent),var(--accent3))">${m.name.charAt(0)}</div>
      <div class="lb-info"><span class="lb-name">${m.name}${isMe ? '<span class="lb-badge">You</span>' : ''}${streak}</span><span class="lb-sub">${m.tasksCompleted || 0} tasks completed</span></div>
      <div class="lb-right"><span class="lb-pts">${m.points || 0}</span><span class="lb-pts-label">pts</span></div>
    </div>`;
  }).join('') || '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No members yet</div>';

  renderPointsBreakdown();
}

function renderPointsBreakdown() {
  const el = document.getElementById('pointsBreakdown'); if (!el) return;
  const items = [
    { action: 'Add a Task', pts: POINTS.TASK_ADD, icon: '✅' }, { action: 'Complete a Task', pts: POINTS.TASK_COMPLETE, icon: '🏆' },
    { action: 'Early Completion Bonus', pts: POINTS.EARLY_COMPLETION, icon: '⏰' }, { action: 'Add an Event', pts: POINTS.EVENT_ADD, icon: '📅' },
    { action: 'Share a Resource/Link', pts: POINTS.RESOURCE_SHARE, icon: '📎' }, { action: 'Upload a File', pts: POINTS.FILE_UPLOAD, icon: '📁' },
    { action: 'Daily Login Streak', pts: POINTS.LOGIN_STREAK, icon: '🔥' },
  ];
  el.innerHTML = items.map(b => `<div class="pts-breakdown-item"><span class="pts-icon">${b.icon}</span><span class="pts-action">${b.action}</span><span class="pts-val">+${b.pts}</span></div>`).join('');
}

// ===== Progress Charts =====
let pieChart = null, barChart = null, progressBarChart = null, pointsChart = null;
function renderProgressCharts() {
  const done = tasks.filter(t => t.column === 'completed').length, inprog = tasks.filter(t => t.column === 'inprogress').length, todo = tasks.filter(t => t.column === 'todo').length;

  const pieCtx = document.getElementById('bigPieChart')?.getContext('2d');
  if (pieCtx) {
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, { type: 'doughnut', data: { labels: ['Completed', 'In Progress', 'To Do'], datasets: [{ data: [done, inprog, todo], backgroundColor: ['#4ecdc4', '#ff6b35', '#a78bfa'], borderColor: ['#12141a', '#12141a', '#12141a'], borderWidth: 3, hoverOffset: 6 }] }, options: { cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: '#7a7f9a', font: { family: 'DM Sans', size: 12 }, padding: 16, boxWidth: 12 } }, tooltip: { backgroundColor: '#12141a', titleColor: '#f0f0f5', bodyColor: '#7a7f9a', borderColor: '#22263a', borderWidth: 1 } } } });
  }

  const barCtx = document.getElementById('bigBarChart')?.getContext('2d');
  if (barCtx) {
    if (barChart) barChart.destroy();
    const labels = groupMembers.map(m => m.name.split(' ')[0]);
    barChart = new Chart(barCtx, {
      type: 'bar', data: {
        labels, datasets: [
          { label: 'Completed', data: groupMembers.map(m => tasks.filter(t => t.assignedTo === m.uid && t.column === 'completed').length), backgroundColor: '#4ecdc4', borderRadius: 6 },
          { label: 'Pending', data: groupMembers.map(m => tasks.filter(t => t.assignedTo === m.uid && t.column !== 'completed').length), backgroundColor: '#ff6b35', borderRadius: 6 }
        ]
      }, options: { plugins: { legend: { labels: { color: '#7a7f9a', font: { family: 'DM Sans' } } }, tooltip: { backgroundColor: '#12141a', titleColor: '#f0f0f5', bodyColor: '#7a7f9a', borderColor: '#22263a', borderWidth: 1 } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a7f9a' }, stacked: true }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a7f9a', stepSize: 1 }, stacked: true } } }
    });
  }

  const ptCtx = document.getElementById('pointsBarChart')?.getContext('2d');
  if (ptCtx) {
    if (pointsChart) pointsChart.destroy();
    const labels = groupMembers.slice(0, 8).map(m => m.name.split(' ')[0]);
    pointsChart = new Chart(ptCtx, { type: 'bar', data: { labels, datasets: [{ label: 'Points', data: groupMembers.slice(0, 8).map(m => m.points || 0), backgroundColor: ['#ff6b35', '#a78bfa', '#4ecdc4', '#ffd60a', '#60a5fa', '#fb923c', '#34d399', '#f472b6'], borderRadius: 8 }] }, options: { plugins: { legend: { display: false }, tooltip: { backgroundColor: '#12141a', titleColor: '#f0f0f5', bodyColor: '#7a7f9a', borderColor: '#22263a', borderWidth: 1 } }, scales: { x: { grid: { display: false }, ticks: { color: '#7a7f9a' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7a7f9a' } } } } });
  }

  const pBarCtx = document.getElementById('progressBar')?.getContext('2d');
  if (pBarCtx) {
    if (progressBarChart) progressBarChart.destroy();
    progressBarChart = new Chart(pBarCtx, { type: 'bar', data: { labels: groupMembers.slice(0, 5).map(m => m.name.split(' ')[0]), datasets: [{ data: groupMembers.slice(0, 5).map(m => m.points || 0), backgroundColor: ['#ff6b35', '#a78bfa', '#4ecdc4', '#ffd60a', '#60a5fa'], borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#7a7f9a', font: { size: 11 } } }, y: { display: false } } } });
  }
  renderInsights(); renderBurnoutMonitor();

  // Load quiz stats
  if (window.loadQuizStats) {
    window.loadQuizStats();
  }
}

function renderInsights() {
  const el = document.getElementById('insightsList'); if (!el) return;
  const done = tasks.filter(t => t.column === 'completed').length, total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const sorted = [...groupMembers].sort((a, b) => (b.points || 0) - (a.points || 0)), top = sorted[0];
  const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.column !== 'completed');
  const myTasks = tasks.filter(t => t.assignedTo === currentUser.uid && t.column !== 'completed');
  const items = [
    { icon: '📊', title: `${pct}% Complete`, msg: pct < 50 ? 'Behind schedule — pick up pace!' : 'On track, keep going!', color: pct < 50 ? 'var(--danger)' : 'var(--accent2)' },
    { icon: '🏆', title: top ? `${top.name} leads` : 'No leader yet', msg: top ? `${top.points || 0} points earned` : 'Complete tasks to score', color: 'var(--gold)' },
    { icon: '⚠️', title: `${overdue.length} Overdue`, msg: overdue.length ? 'Address overdue tasks now' : 'No overdue tasks! 🎉', color: overdue.length ? 'var(--danger)' : 'var(--accent2)' },
    { icon: '🎯', title: `${myTasks.length} My Tasks`, msg: myTasks.length ? `Focus on: "${myTasks[0]?.title?.substring(0, 20)}"` : 'All done! 🎉', color: 'var(--accent3)' },
    { icon: '⚡', title: `${total} Total Tasks`, msg: `${done} done, ${total - done} remaining`, color: 'var(--accent)' },
    { icon: '👥', title: `${groupMembers.length} Members`, msg: 'Team is active', color: 'var(--accent2)' }
  ];
  el.innerHTML = items.map(i => `<div class="insight-item" style="--c:${i.color}"><div class="insight-icon">${i.icon}</div><strong>${i.title}</strong><span>${i.msg}</span></div>`).join('');
}

function renderBurnoutMonitor() {
  const el = document.getElementById('burnoutList'); if (!el) return;
  if (!groupMembers.length) { el.innerHTML = '<div style="color:var(--text-muted);font-size:13px">No group members yet</div>'; return; }
  el.innerHTML = groupMembers.map(m => {
    const lastActive = m.lastActive?.toDate ? m.lastActive.toDate() : null, daysSince = lastActive ? Math.floor((new Date() - lastActive) / 86400000) : 999;
    let status = 'ok', statusText = 'Active', icon = '✅', msg = 'Great pace!';
    if (daysSince > 3) { status = 'danger'; statusText = 'Inactive'; icon = '🔴'; msg = `Inactive for ${daysSince} days`; }
    else if (daysSince > 1) { status = 'warn'; statusText = 'Low'; icon = '🟡'; msg = 'Low activity — check in!'; }
    return `<div class="burnout-item"><span class="burnout-icon">${icon}</span><div><div class="burnout-name">${m.name}</div><div class="burnout-msg">${msg}</div></div><span class="burnout-status ${status}">${statusText}</span></div>`;
  }).join('');
}

function renderSmartPlanner() {
  const myTasks = tasks.filter(t => (t.assignedTo === currentUser.uid || !t.assignedTo) && t.column !== 'completed');
  const dueSoon = myTasks.filter(t => t.deadline && (new Date(t.deadline) - new Date()) / 86400000 <= 2);
  let msg = '';
  if (!tasks.length) msg = "Add tasks to get personalized study recommendations!";
  else if (!myTasks.length) msg = "All your tasks are done! You're on fire 🔥";
  else if (dueSoon.length) msg = `⚠️ ${dueSoon.length} task${dueSoon.length > 1 ? 's' : ''} due soon. Focus on: "${dueSoon[0].title}"`;
  else msg = `Complete ${Math.min(2, myTasks.length)} task${myTasks.length > 1 ? 's' : ''} today. Start with "${myTasks[0]?.title}"`;
  document.getElementById('smartMsg').textContent = msg;
}

// ===== Resources with File Upload =====
window.openResourceModal = function () {
  ['resTitle', 'resUrl', 'resSubject', 'resDesc'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  document.getElementById('resType').value = 'link';
  const fi = document.getElementById('resFile'); if (fi) fi.value = '';
  const prog = document.getElementById('uploadProgress'); if (prog) prog.style.display = 'none';
  updateResModalUI('link');
  openModal('resourceModal');
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('resType')?.addEventListener('change', function () { updateResModalUI(this.value); });
});

function updateResModalUI(type) {
  const urlRow = document.getElementById('resUrlRow'), fileRow = document.getElementById('resFileRow');
  if (urlRow) urlRow.style.display = type === 'file' ? 'none' : 'block';
  if (fileRow) fileRow.style.display = type === 'file' ? 'block' : 'none';
}

window.saveResource = async function () {
  const title = document.getElementById('resTitle').value.trim();
  const type = document.getElementById('resType').value;
  const subject = document.getElementById('resSubject').value.trim();
  const desc = document.getElementById('resDesc').value.trim();
  if (!title) return toast("Title required", "error");
  if (!userDoc.groupId) return toast("Join a group first", "error");
  const fileInput = document.getElementById('resFile'), file = fileInput?.files?.[0];
  if (type === 'file' && file) { await uploadResourceFile(file, title, subject, desc); }
  else {
    const url = document.getElementById('resUrl').value.trim();
    try {
      await addDoc(collection(db, "groups", userDoc.groupId, "resources"), { title, url, type, subject, desc, addedBy: userDoc.name, addedByAvatar: userDoc.name.charAt(0).toUpperCase(), uid: currentUser.uid, createdAt: serverTimestamp() });
      await awardPoints(POINTS.RESOURCE_SHARE);
      await logActivity(`📎 ${userDoc.name} shared: ${title}`, 'resource');
      toast(`Resource shared! +${POINTS.RESOURCE_SHARE} pts`, "success");
      closeModal('resourceModal');
    } catch (e) { toast("Error", "error"); }
  }
};

async function uploadResourceFile(file, title, subject, desc) {
  if (uploadingFile) return toast("Upload in progress...", "info");
  if (file.size > 1 * 1024 * 1024) return toast("Max file size: 1MB (use links for larger files)", "error");
  uploadingFile = true;
  const prog = document.getElementById('uploadProgress'), progFill = document.getElementById('uploadProgressFill'), progTxt = document.getElementById('uploadProgressTxt');
  if (prog) prog.style.display = 'block';
  try {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (progFill) progFill.style.width = pct + '%';
        if (progTxt) progTxt.textContent = `Processing... ${pct}%`;
      }
    };
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        const ext = file.name.split('.').pop()?.toLowerCase();
        const typeMap = { pdf: 'pdf', doc: 'doc', docx: 'doc', ppt: 'ppt', pptx: 'ppt', xls: 'xls', xlsx: 'xls', mp4: 'video', avi: 'video', mov: 'video', mp3: 'audio', jpg: 'image', jpeg: 'image', png: 'image', gif: 'image' };
        const ft = typeMap[ext] || 'file';
        await addDoc(collection(db, "groups", userDoc.groupId, "resources"), { title, type: ft, subject, desc, fileName: file.name, fileSize: file.size, fileData: base64Data, addedBy: userDoc.name, addedByAvatar: userDoc.name.charAt(0).toUpperCase(), uid: currentUser.uid, createdAt: serverTimestamp() });
        await awardPoints(POINTS.FILE_UPLOAD);
        await logActivity(`📁 ${userDoc.name} uploaded: ${title}`, 'resource');
        toast(`File uploaded! +${POINTS.FILE_UPLOAD} pts`, "success");
        uploadingFile = false; if (prog) prog.style.display = 'none';
        closeModal('resourceModal');
      } catch (e) { toast("Upload error: " + e.message, "error"); uploadingFile = false; if (prog) prog.style.display = 'none'; }
    };
    reader.onerror = () => { toast("File read error", "error"); uploadingFile = false; if (prog) prog.style.display = 'none'; };
    reader.readAsDataURL(file);
  } catch (e) { toast("Upload error: " + e.message, "error"); uploadingFile = false; if (prog) prog.style.display = 'none'; }
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function renderResources(filter = 'all') {
  const el = document.getElementById('resourceGrid'); if (!el) return;
  const filtered = filter === 'all' ? resources : resources.filter(r => r.subject === filter);
  if (!filtered.length) { el.innerHTML = `<div class="resource-empty"><i class="fa-solid fa-folder-open"></i><p>No resources yet. Be the first to share!</p></div>`; return; }
  const typeIcons = { link: '🔗', pdf: '📄', doc: '📝', ppt: '📊', xls: '📋', notes: '📝', video: '🎥', audio: '🎵', image: '🖼️', file: '📁' };
  const typeBg = { link: 'rgba(96,165,250,0.15)', pdf: 'rgba(248,113,113,0.15)', doc: 'rgba(78,205,196,0.15)', ppt: 'rgba(255,107,53,0.15)', xls: 'rgba(74,222,128,0.15)', notes: 'rgba(78,205,196,0.15)', video: 'rgba(253,186,116,0.15)', audio: 'rgba(167,139,250,0.15)', image: 'rgba(96,165,250,0.15)', file: 'rgba(148,163,184,0.15)' };
  el.innerHTML = filtered.map(r => {
    const isOwn = r.uid === currentUser.uid, fileSize = r.fileSize ? formatFileSize(r.fileSize) : '';
    const time = r.createdAt?.toDate ? timeAgo(r.createdAt.toDate()) : 'recently';
    const downloadBtn = r.fileData ? `<button class="res-link" onclick="downloadResource('${r.id}','${r.fileName}')"><i class="fa-solid fa-download"></i> Download</button>` : (r.url ? `<a class="res-link" href="${r.url}" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open</a>` : '');
    return `<div class="resource-card">
      <div class="res-card-header">
        <div class="res-type-icon" style="background:${typeBg[r.type] || typeBg.file}">${typeIcons[r.type] || '📁'}</div>
        ${isOwn ? `<button class="res-delete-btn" onclick="deleteResource('${r.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
      <div class="res-title">${r.title}</div>
      ${r.desc ? `<div class="res-desc">${r.desc}</div>` : ''}
      ${r.fileName ? `<div class="res-filename"><i class="fa-solid fa-file"></i> ${r.fileName}${fileSize ? ' · ' + fileSize : ''}</div>` : ''}
      <div class="res-sharedby">
        <div class="res-avatar">${(r.addedByAvatar || r.addedBy?.charAt(0) || '?').toUpperCase()}</div>
        <div class="res-sharedby-info"><span class="res-sharer">${r.addedBy || 'Anonymous'}</span><span class="res-time">${time}</span></div>
      </div>
      <div class="res-footer">
        ${r.subject ? `<span class="res-subject">${r.subject}</span>` : '<span></span>'}
        ${downloadBtn}
      </div>
    </div>`;
  }).join('');
}

window.deleteResource = async function (id) {
  if (!confirm('Delete this resource?')) return;
  try {
    await deleteDoc(doc(db, "groups", userDoc.groupId, "resources", id));
    toast("Resource deleted", "info");
  } catch (e) { toast("Error", "error"); }
};

window.downloadResource = function (id, fileName) {
  const resource = resources.find(r => r.id === id);
  if (!resource || !resource.fileData) return toast("File not found", "error");
  try {
    const link = document.createElement('a');
    link.href = 'data:application/octet-stream;base64,' + resource.fileData;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("Download started", "success");
  } catch (e) { toast("Download error", "error"); }
};

function buildResourceFilters() {
  const subjects = new Set(resources.map(r => r.subject).filter(Boolean));
  const el = document.getElementById('resourceFilters'); if (!el) return;
  el.innerHTML = `<button class="filter-btn active" onclick="filterResources('all',this)">All</button>`;
  subjects.forEach(s => el.innerHTML += `<button class="filter-btn" onclick="filterResources('${s}',this)">${s}</button>`);
}

window.filterResources = function (f, btn) {
  document.querySelectorAll('#resourceFilters .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderResources(f);
};

window.toggleNotif = function () { document.getElementById('notifPanel').classList.toggle('hidden'); };


// ===== AI FEATURES =====

// Doubt Solver
window.submitDoubt = async function () {
  const input = document.getElementById('doubtInput');
  const question = input.value.trim();
  if (!question) return;
  input.value = '';
  await askDoubt(question);
};

// Task Prioritizer
window.analyzeTasks = async function () {
  if (!tasks || tasks.length === 0) {
    alert('No tasks to analyze. Add some tasks first!');
    return;
  }
  const result = await prioritizeTasks(tasks, currentUser);
  displayPrioritization(result);
};

// AI Settings
window.openAISettings = function () {
  openModal('aiSettingsModal');
  // Load saved HF token
  var savedToken = localStorage.getItem('hf_token') || '';
  var input = document.getElementById('hfTokenInput');
  if (input) {
    input.value = savedToken;
  }
};

// Save HuggingFace Token
window.saveHFToken = function () {
  var input = document.getElementById('hfTokenInput');
  var token = input.value.trim();

  if (!token) {
    alert('Please enter a token');
    return;
  }

  if (!token.startsWith('hf_')) {
    alert('Invalid token format. Token should start with "hf_"');
    return;
  }

  localStorage.setItem('hf_token', token);

  var statusDiv = document.getElementById('hfTokenStatus');
  if (statusDiv) {
    statusDiv.innerHTML = '<div style="background: rgba(74, 222, 128, 0.15); border: 1px solid #4ade80; color: #4ade80; padding: 12px; border-radius: 6px; font-size: 12px;"><i class="fa-solid fa-check"></i> Token saved successfully!</div>';
  }

  setTimeout(function () {
    if (statusDiv) statusDiv.innerHTML = '';
  }, 3000);
};

// Test HuggingFace Connection
window.testHFToken = function () {
  var input = document.getElementById('hfTokenInput');
  var token = input.value.trim();

  if (!token) {
    alert('Please enter a token first');
    return;
  }

  // Validate token format
  if (!token.startsWith('hf_')) {
    var statusDiv = document.getElementById('hfTokenStatus');
    if (statusDiv) {
      statusDiv.innerHTML = '<div style="background: rgba(248, 113, 113, 0.15); border: 1px solid #f87171; color: #f87171; padding: 12px; border-radius: 6px; font-size: 12px;"><i class="fa-solid fa-xmark"></i> ✗ Invalid format! Token must start with "hf_"</div>';
    }
    return;
  }

  var statusDiv = document.getElementById('hfTokenStatus');
  if (statusDiv) {
    statusDiv.innerHTML = '<div style="background: rgba(96, 165, 250, 0.15); border: 1px solid #60a5fa; color: #60a5fa; padding: 12px; border-radius: 6px; font-size: 12px;"><i class="fa-solid fa-spinner"></i> Testing connection...</div>';
  }

  // Test API call
  fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1", {
    headers: { Authorization: "Bearer " + token },
    method: "POST",
    body: JSON.stringify({ inputs: "Test" })
  })
    .then(function (response) {
      console.log("HF API Response Status:", response.status);
      if (response.ok || response.status === 429 || response.status === 503) {
        // 429 = rate limited, 503 = model loading, but token is valid
        localStorage.setItem('hf_token', token);
        if (statusDiv) {
          statusDiv.innerHTML = '<div style="background: rgba(74, 222, 128, 0.15); border: 1px solid #4ade80; color: #4ade80; padding: 12px; border-radius: 6px; font-size: 12px;"><i class="fa-solid fa-check"></i> ✓ Token is valid and working!</div>';
        }
      } else if (response.status === 401) {
        throw new Error('Unauthorized - Token is invalid or expired');
      } else {
        throw new Error('HTTP ' + response.status);
      }
    })
    .catch(function (error) {
      console.error("HF Token Test Error:", error);
      if (statusDiv) {
        var errorMsg = error.message || 'Unknown error';
        statusDiv.innerHTML = '<div style="background: rgba(248, 113, 113, 0.15); border: 1px solid #f87171; color: #f87171; padding: 12px; border-radius: 6px; font-size: 12px;"><i class="fa-solid fa-xmark"></i> ✗ Error: ' + escapeHtml(errorMsg) + '<br><small>Check browser console (F12) for details</small></div>';
      }
    });
};

// Render predictions on dashboard
function renderDashboardPredictions() {
  if (!userDoc.groupId || !tasks.length) return;
  const predictions = analyzePredictivePerformance(tasks, userDoc, groupMembers);
  renderPredictions(predictions);
}

// Update predictions when tasks change
window.addEventListener('tasksUpdated', () => {
  renderDashboardPredictions();
});

// Call predictions on initial load
setTimeout(() => {
  renderDashboardPredictions();
}, 1000);

window.openSubmittedFilesModal = async function (taskId, taskTitle) {
  try {
    const taskRef = doc(db, "groups", userDoc.groupId, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    const task = taskSnap.data();

    if (!task) return toast("Task not found", "error");

    // Get submitter name
    const submitterRef = doc(db, "users", task.submittedBy);
    const submitterSnap = await getDoc(submitterRef);
    const submitterName = submitterSnap.data()?.name || "Unknown";

    // Build modal content
    let html = '<div class="submitted-files-container">';
    html += '<div class="submitted-files-header">';
    html += '<h3>' + escapeHtml(taskTitle) + '</h3>';
    html += '<p style="color: var(--text-muted); font-size: 12px;">Submitted by: <strong>' + escapeHtml(submitterName) + '</strong></p>';
    html += '</div>';

    // Display files based on task type
    if (task.type === 'learning') {
      html += '<div class="submitted-files-section">';
      html += '<h4>📚 Quiz Result Screenshot</h4>';
      if (task.uploadedFiles && task.uploadedFiles.length > 0) {
        const file = task.uploadedFiles[0];
        const fileName = typeof file === 'string' ? file : file.name;
        const fileData = typeof file === 'string' ? null : file.data;

        html += '<div class="submitted-file-item" style="cursor: pointer; padding: 12px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); margin-bottom: 12px;">';
        html += '<i class="fa-solid fa-image" style="font-size: 24px; color: var(--accent); margin-right: 12px;"></i>';
        html += '<span style="font-size: 13px; color: var(--text);">' + escapeHtml(fileName) + '</span>';
        if (fileData) {
          html += '<button class="btn-primary" onclick="window.previewSubmittedFile(\'' + escapeHtml(fileName) + '\', \'' + fileData.replace(/'/g, "\\'") + '\')" style="margin-left: 12px; padding: 6px 12px; font-size: 12px;">View</button>';
        }
        html += '</div>';
      } else {
        html += '<p style="color: var(--text-muted);">No files submitted</p>';
      }
      html += '</div>';
    } else if (task.type === 'creation') {
      html += '<div class="submitted-files-section">';
      html += '<h4>✏️ Work Files</h4>';
      if (task.uploadedFiles && task.uploadedFiles.length > 0) {
        html += '<div class="submitted-files-list">';
        task.uploadedFiles.forEach((file, index) => {
          const fileName = typeof file === 'string' ? file : file.name;
          const fileData = typeof file === 'string' ? null : file.data;
          const icon = getFileIcon(fileName);

          html += '<div class="submitted-file-item" style="padding: 12px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">';
          html += '<div style="display: flex; align-items: center; gap: 12px; flex: 1;">';
          html += '<i class="fa-solid ' + icon + '" style="font-size: 18px; color: var(--accent);"></i>';
          html += '<span style="font-size: 13px; color: var(--text);">' + escapeHtml(fileName) + '</span>';
          html += '</div>';
          if (fileData) {
            html += '<button class="btn-primary" onclick="window.previewSubmittedFile(\'' + escapeHtml(fileName) + '\', \'' + fileData.replace(/'/g, "\\'") + '\')" style="padding: 6px 12px; font-size: 12px;">View</button>';
          }
          html += '</div>';
        });
        html += '</div>';
      } else {
        html += '<p style="color: var(--text-muted);">No files submitted</p>';
      }
      html += '</div>';
    }

    html += '<div class="submitted-files-actions" style="margin-top: 16px; display: flex; gap: 8px;">';
    html += '<button class="btn-primary" onclick="window.closeSubmittedFilesModal()" style="flex: 1;">Close</button>';
    html += '</div>';
    html += '</div>';

    const filesModal = document.getElementById('submittedFilesModal');
    if (filesModal) {
      filesModal.querySelector('.modal-body').innerHTML = html;
      openModal('submittedFilesModal');
    }
  } catch (e) {
    console.error(e);
    toast("Error loading submitted files", "error");
  }
};

window.previewSubmittedFile = function (fileName, fileData) {
  // Open file preview in a new modal similar to resources
  const previewModal = document.getElementById('filePreviewModal');
  if (!previewModal) {
    console.error('File preview modal not found');
    return;
  }

  const ext = fileName.split('.').pop().toLowerCase();
  let previewHtml = '<div class="file-preview-container">';

  // Header
  previewHtml += '<div class="file-preview-header">';
  previewHtml += '<h3>' + escapeHtml(fileName) + '</h3>';
  previewHtml += '<button onclick="window.closeFilePreview()" style="background: none; border: none; color: var(--text); font-size: 24px; cursor: pointer; padding: 0;"><i class="fa-solid fa-xmark"></i></button>';
  previewHtml += '</div>';

  // Content
  previewHtml += '<div class="file-preview-content">';

  // Check if it's an image
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    previewHtml += '<img src="' + fileData + '" alt="' + escapeHtml(fileName) + '" style="max-width: 100%; max-height: 100%; border-radius: 8px; object-fit: contain;">';
  } else {
    // For non-image files, show file info
    previewHtml += '<div style="text-align: center;">';
    previewHtml += '<i class="fa-solid fa-file" style="font-size: 64px; color: var(--accent); margin-bottom: 16px; display: block;"></i>';
    previewHtml += '<p style="color: var(--text-muted); margin-bottom: 16px; font-size: 14px;">This file type cannot be previewed in the browser.</p>';
    previewHtml += '<button class="btn-primary" onclick="window.downloadSubmittedFile(\'' + escapeHtml(fileName) + '\', \'' + fileData.replace(/'/g, "\\'") + '\')" style="padding: 10px 20px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;"><i class="fa-solid fa-download"></i> Download File</button>';
    previewHtml += '</div>';
  }

  previewHtml += '</div>';

  // Actions
  previewHtml += '<div class="file-preview-actions">';
  previewHtml += '<button class="btn-primary" onclick="window.downloadSubmittedFile(\'' + escapeHtml(fileName) + '\', \'' + fileData.replace(/'/g, "\\'") + '\')" style="background: var(--accent); color: white; border: 1px solid var(--accent);"><i class="fa-solid fa-download"></i> Download</button>';
  previewHtml += '<button class="btn-secondary" onclick="window.closeFilePreview()" style="background: var(--surface2); color: var(--text); border: 1px solid var(--border);">Close</button>';
  previewHtml += '</div>';

  previewHtml += '</div>';

  previewModal.querySelector('.modal-body').innerHTML = previewHtml;
  openModal('filePreviewModal');
};

window.downloadSubmittedFile = function (fileName, fileData) {
  const link = document.createElement('a');
  link.href = fileData;
  link.download = fileName;
  link.click();
};

window.closeFilePreview = function () {
  closeModal('filePreviewModal');
};

window.openFilePreview = function (fileName, fileData) {
  // Open file in new tab or download
  const link = document.createElement('a');
  link.href = fileData;
  link.download = fileName;
  link.click();
};

window.closeSubmittedFilesModal = function () {
  closeModal('submittedFilesModal');
};

window.approveTask = async function (taskId) {
  if (!userDoc.groupId) return toast("Join a group first", "error");
  try {
    const taskRef = doc(db, "groups", userDoc.groupId, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    const task = taskSnap.data();

    if (!task) return toast("Task not found", "error");
    if (task.assignedTo === currentUser.uid) return toast("You cannot approve your own task", "error");

    const approvals = task.approvals || [];
    const rejections = task.rejections || [];

    // Remove from rejections if previously rejected
    const updatedRejections = rejections.filter(uid => uid !== currentUser.uid);

    // Add to approvals if not already approved
    let updatedApprovals = approvals;
    if (!approvals.includes(currentUser.uid)) {
      updatedApprovals = [...approvals, currentUser.uid];
    }

    // Check if task should be marked as completed (required approvals met)
    const newColumn = updatedApprovals.length >= window.getRequiredApprovals() ? 'completed' : 'pending_peer_approval';

    await updateDoc(taskRef, {
      approvals: updatedApprovals,
      rejections: updatedRejections,
      column: newColumn,
      updatedAt: serverTimestamp()
    });

    // Send notification to task owner
    if (task.assignedTo) {
      await addDoc(collection(db, "users", task.assignedTo, "notifications"), {
        type: "task_approved",
        taskId: taskId,
        taskTitle: task.title,
        approvedBy: userDoc.name,
        message: `${userDoc.name} approved your task: ${task.title}`,
        isCompleted: newColumn === 'completed',
        createdAt: serverTimestamp(),
        read: false
      });
    }

    if (newColumn === 'completed') {
      const pts = task.points || POINTS.TASK_COMPLETE || 15;
      await awardPoints(pts, true);
      await logActivity(`✅ ${userDoc.name} approved task: ${task.title}`, 'approval');
      toast(`Task approved! +${pts} pts 🎉`, "success");
    } else {
      await logActivity(`👍 ${userDoc.name} approved task: ${task.title}`, 'approval');
      toast("Task approved!", "success");
    }

    renderKanban();
  } catch (e) {
    console.error(e);
    toast("Error approving task", "error");
  }
};

window.rejectTask = async function (taskId) {
  if (!userDoc.groupId) return toast("Join a group first", "error");
  try {
    const taskRef = doc(db, "groups", userDoc.groupId, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    const task = taskSnap.data();

    if (!task) return toast("Task not found", "error");
    if (task.assignedTo === currentUser.uid) return toast("You cannot reject your own task", "error");

    const rejections = task.rejections || [];

    // Add to rejections if not already rejected
    let updatedRejections = rejections;
    if (!rejections.includes(currentUser.uid)) {
      updatedRejections = [...rejections, currentUser.uid];
    }

    // Move rejected task back to todo column
    const newColumn = 'todo';

    await updateDoc(taskRef, {
      rejections: updatedRejections,
      column: newColumn,
      approvals: [], // Clear approvals when rejected
      updatedAt: serverTimestamp()
    });

    // Send notification to task owner
    if (task.assignedTo) {
      await addDoc(collection(db, "users", task.assignedTo, "notifications"), {
        type: "task_rejected",
        taskId: taskId,
        taskTitle: task.title,
        rejectedBy: userDoc.name,
        message: `${userDoc.name} rejected your task: ${task.title}`,
        createdAt: serverTimestamp(),
        read: false
      });
    }

    await logActivity(`👎 ${userDoc.name} rejected task: ${task.title}`, 'rejection');
    toast("Task rejected and moved back to To Do", "success");
    renderKanban();
  } catch (e) {
    console.error(e);
    toast("Error rejecting task", "error");
  }
};

window.updateSubmitTaskTypeFields = function () {
  const taskType = document.getElementById('submitTaskType').value;
  const fileGroup = document.getElementById('submitTaskTypeFileGroup');
  const fileLabel = document.getElementById('submitTaskTypeFileLabel');
  const fileHint = document.getElementById('submitTaskTypeFileHint');

  if (taskType === 'learning') {
    fileLabel.textContent = 'Upload Quiz Result Screenshot';
    fileHint.textContent = 'For Learning: Screenshot of quiz results (PNG, JPG, GIF)';
    document.getElementById('submitTaskTypeFiles').accept = '.jpg,.jpeg,.png,.gif';
  } else if (taskType === 'creation') {
    fileLabel.textContent = 'Upload Work Files';
    fileHint.textContent = 'For Creation: Doc, PPT, PDF, Report, etc.';
    document.getElementById('submitTaskTypeFiles').accept = '.doc,.docx,.ppt,.pptx,.pdf,.jpg,.png';
  }
};

window.openTaskSubmissionModal = function (taskId, taskTitle) {
  window.currentSubmitTaskId = taskId;
  document.getElementById('submitTaskType').value = 'learning';
  document.getElementById('submitTaskTypeFiles').value = '';
  window.updateSubmitTaskTypeFields();
  openModal('taskSubmissionModal');
};

window.closeTaskSubmissionModal = function () {
  closeModal('taskSubmissionModal');
  window.currentSubmitTaskId = null;
};

window.submitTaskAsCompleted = async function () {
  if (!window.currentSubmitTaskId) return toast("Task not found", "error");
  if (!userDoc.groupId) return toast("Join a group first", "error");

  const taskType = document.getElementById('submitTaskType').value;
  const files = document.getElementById('submitTaskTypeFiles').files;

  if (files.length === 0) return toast("Please upload at least one file", "error");

  try {
    const taskRef = doc(db, "groups", userDoc.groupId, "tasks", window.currentSubmitTaskId);

    await updateDoc(taskRef, {
      column: 'pending_peer_approval',
      type: taskType,
      uploadedFiles: Array.from(files).map(f => f.name),
      updatedAt: serverTimestamp()
    });

    await logActivity(`📋 ${userDoc.name} submitted task for approval`, 'pending');
    toast("Task submitted for peer approval!", "success");
    closeModal('taskSubmissionModal');
    renderKanban();
  } catch (e) {
    console.error(e);
    toast("Error submitting task", "error");
  }
};

// Helper function to calculate required approvals
window.getRequiredApprovals = function () {
  // Required approvals = total members - 1 (the submitter)
  const totalMembers = groupMembers.length;
  return Math.max(1, totalMembers - 1);
};
window.deadlineCalendarState = {
  currentDate: new Date(),
  selectedDate: null
};

window.openDeadlineCalendar = function () {
  window.deadlineCalendarState.currentDate = new Date();
  window.renderDeadlineCalendar();
  openModal('deadlineCalendarModal');
};

window.closeDeadlineCalendar = function () {
  closeModal('deadlineCalendarModal');
};

window.renderDeadlineCalendar = function () {
  const state = window.deadlineCalendarState;
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  // Update title
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('deadlineCalendarTitle').textContent = `${monthNames[month]} ${year}`;

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate calendar days
  let html = '';

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="deadline-day empty"></div>';
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    const isPast = date < today;
    const isToday = date.getTime() === today.getTime();
    const isSelected = window.deadlineCalendarState.selectedDate &&
      date.getTime() === new Date(window.deadlineCalendarState.selectedDate).getTime();

    const classes = ['deadline-day'];
    if (isPast) classes.push('past');
    if (isToday) classes.push('today');
    if (isSelected) classes.push('selected');

    if (isPast) {
      html += `<div class="${classes.join(' ')}" style="cursor: not-allowed; opacity: 0.5;">${day}</div>`;
    } else {
      html += `<div class="${classes.join(' ')}" data-day="${day}" style="cursor: pointer;">${day}</div>`;
    }
  }

  const daysContainer = document.getElementById('deadlineCalendarDays');
  daysContainer.innerHTML = html;

  // Add event listeners to all clickable days
  daysContainer.querySelectorAll('[data-day]').forEach(dayEl => {
    dayEl.addEventListener('click', function () {
      const day = parseInt(this.getAttribute('data-day'));
      window.selectDeadlineDate(day);
    });
  });
};

window.selectDeadlineDate = function (day) {
  const state = window.deadlineCalendarState;
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Don't allow past dates
  if (date < today) {
    toast("Cannot select past dates", "error");
    return;
  }

  state.selectedDate = date;

  // Format date as YYYY-MM-DD
  const dateStr = date.toISOString().split('T')[0];
  document.getElementById('tskDeadline').value = dateStr;

  // Format display date
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  const displayStr = date.toLocaleDateString('en-US', options);
  document.getElementById('tskDeadlineDisplay').value = displayStr;

  // Close the calendar modal
  window.closeDeadlineCalendar();
  toast("Date selected!", "success");
};

window.prevDeadlineMonth = function () {
  window.deadlineCalendarState.currentDate.setMonth(window.deadlineCalendarState.currentDate.getMonth() - 1);
  window.renderDeadlineCalendar();
};

window.nextDeadlineMonth = function () {
  window.deadlineCalendarState.currentDate.setMonth(window.deadlineCalendarState.currentDate.getMonth() + 1);
  window.renderDeadlineCalendar();
};


// Proof Submission Functions (for drag to complete)
window.currentProofTaskId = null;
window.currentProofTaskType = null;
window.proofFiles = {
  learning: null,
  creation: []
};

window.openProofSubmissionModal = function (taskId, taskTitle, taskType) {
  window.currentProofTaskId = taskId;
  window.currentProofTaskType = taskType || 'learning';
  window.proofFiles = { learning: null, creation: [] };

  document.getElementById('proofTaskTitle').textContent = taskTitle;

  // Show/hide sections based on task type
  if (taskType === 'learning') {
    document.getElementById('learningProofSection').style.display = 'block';
    document.getElementById('creationProofSection').style.display = 'none';
    document.getElementById('proofTaskType').textContent = '📚 Learning Task - Upload quiz result screenshot';
    document.getElementById('learningProofInput').value = '';
    document.getElementById('learningProofPreview').innerHTML = '';
  } else if (taskType === 'creation') {
    document.getElementById('learningProofSection').style.display = 'none';
    document.getElementById('creationProofSection').style.display = 'block';
    document.getElementById('proofTaskType').textContent = '✏️ Creation Task - Upload work files';
    document.getElementById('creationProofInput').value = '';
    document.getElementById('creationProofPreview').innerHTML = '';
  }

  document.getElementById('proofUploadStatus').innerHTML = '';
  openModal('proofSubmissionModal');

  // Setup drag and drop after modal is opened
  setTimeout(() => {
    window.setupProofUploadDragDrop();
  }, 100);
};

window.closeProofSubmissionModal = function () {
  closeModal('proofSubmissionModal');
  window.currentProofTaskId = null;
  window.currentProofTaskType = null;
  window.proofFiles = { learning: null, creation: [] };
};

window.handleProofImageUpload = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toast("Image must be less than 5MB", "error");
    return;
  }

  window.proofFiles.learning = file;

  const reader = new FileReader();
  reader.onload = function (e) {
    const preview = document.getElementById('learningProofPreview');
    preview.innerHTML = `
      <div class="proof-image-item">
        <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 8px;">
        <p style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">${file.name}</p>
      </div>
    `;
  };
  reader.readAsDataURL(file);
};

window.handleCreationFilesUpload = function (event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  // Validate file sizes
  for (let file of files) {
    if (file.size > 10 * 1024 * 1024) {
      toast(`${file.name} is larger than 10MB`, "error");
      return;
    }
  }

  window.proofFiles.creation = files;

  const preview = document.getElementById('creationProofPreview');
  let html = '<div class="proof-files-list">';

  files.forEach((file, index) => {
    const icon = getFileIcon(file.name);
    html += `
      <div class="proof-file-item">
        <i class="fa-solid ${icon}"></i>
        <span>${file.name}</span>
        <small>${formatFileSize(file.size)}</small>
      </div>
    `;
  });

  html += '</div>';
  preview.innerHTML = html;
};

// Setup drag and drop for proof upload areas
window.setupProofUploadDragDrop = function () {
  const learningArea = document.querySelector('#learningProofSection .proof-upload-area');
  const creationArea = document.querySelector('#creationProofSection .proof-upload-area');

  const setupDragDropForArea = (area, inputId) => {
    if (!area) return;

    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      area.style.borderColor = 'var(--accent)';
      area.style.background = 'var(--surface3)';
    });

    area.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      area.style.borderColor = 'var(--border)';
      area.style.background = 'var(--surface2)';
    });

    area.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      area.style.borderColor = 'var(--border)';
      area.style.background = 'var(--surface2)';

      const files = e.dataTransfer.files;
      const input = document.getElementById(inputId);
      if (input) {
        input.files = files;
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
    });
  };

  setupDragDropForArea(learningArea, 'learningProofInput');
  setupDragDropForArea(creationArea, 'creationProofInput');
};

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    'pdf': 'fa-file-pdf',
    'doc': 'fa-file-word',
    'docx': 'fa-file-word',
    'ppt': 'fa-file-powerpoint',
    'pptx': 'fa-file-powerpoint',
    'xls': 'fa-file-excel',
    'xlsx': 'fa-file-excel',
    'jpg': 'fa-file-image',
    'jpeg': 'fa-file-image',
    'png': 'fa-file-image',
    'gif': 'fa-file-image'
  };
  return icons[ext] || 'fa-file';
}

window.submitProofAndComplete = async function () {
  console.log("=== SUBMITTING PROOF ===");
  console.log("currentProofTaskId:", window.currentProofTaskId);
  console.log("currentProofTaskType:", window.currentProofTaskType);
  console.log("proofFiles:", window.proofFiles);

  if (!window.currentProofTaskId) {
    console.error("❌ Task ID not found");
    return toast("Task not found", "error");
  }

  if (!userDoc.groupId) {
    console.error("❌ User not in a group");
    return toast("Join a group first", "error");
  }

  const taskType = window.currentProofTaskType;
  console.log("Task type:", taskType);

  // Validate proof based on task type
  if (taskType === 'learning') {
    if (!window.proofFiles.learning) {
      console.error("❌ No learning proof file");
      return toast("Please upload a quiz result screenshot", "error");
    }
    console.log("✅ Learning proof file found:", window.proofFiles.learning.name);
  } else if (taskType === 'creation') {
    if (window.proofFiles.creation.length === 0) {
      console.error("❌ No creation proof files");
      return toast("Please upload at least one work file", "error");
    }
    console.log("✅ Creation proof files found:", window.proofFiles.creation.length);
  }

  try {
    console.log("📝 Preparing to submit task...");
    const taskRef = doc(db, "groups", userDoc.groupId, "tasks", window.currentProofTaskId);

    // Prepare files with data for storage
    let uploadedFiles = [];

    if (taskType === 'learning') {
      const file = window.proofFiles.learning;
      console.log("📄 Processing learning file:", file.name);
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = () => {
          uploadedFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result
          });
          console.log("✅ File processed:", file.name);
          resolve();
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } else if (taskType === 'creation') {
      for (const file of window.proofFiles.creation) {
        console.log("📄 Processing creation file:", file.name);
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            uploadedFiles.push({
              name: file.name,
              type: file.type,
              size: file.size,
              data: reader.result
            });
            console.log("✅ File processed:", file.name);
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
    }

    console.log("📤 Uploading to Firestore...");
    await updateDoc(taskRef, {
      column: 'pending_peer_approval',
      type: taskType,
      uploadedFiles: uploadedFiles,
      updatedAt: serverTimestamp()
    });

    console.log("✅ Task updated in Firestore");
    await logActivity(`📋 ${userDoc.name} submitted task for approval: ${document.getElementById('proofTaskTitle').textContent}`, 'pending');
    toast("Task submitted for peer approval!", "success");
    closeModal('proofSubmissionModal');
    renderKanban();
    console.log("✅ Submission complete");
  } catch (e) {
    console.error("❌ Error submitting task:", e);
    toast("Error submitting task: " + e.message, "error");
  }
};


// Alert Modal Functions
window.showAlert = function (title, message) {
  document.getElementById('alertTitle').textContent = title;
  document.getElementById('alertMessage').textContent = message;
  openModal('alertModal');
};

window.closeAlertModal = function () {
  closeModal('alertModal');
};

// Check if user can edit task
window.canEditTask = function (task) {
  // Can edit if: assigned to user OR created by user OR unassigned
  console.log('canEditTask check:', {
    taskAssignedTo: task.assignedTo,
    currentUserUid: currentUser?.uid,
    taskCreatedBy: task.createdBy,
    isUnassigned: !task.assignedTo || task.assignedTo === '',
    isAssignedToUser: task.assignedTo === currentUser?.uid,
    isCreatedByUser: task.createdBy === currentUser?.uid
  });

  // Unassigned tasks can be edited by anyone
  if (!task.assignedTo || task.assignedTo === '') return true;

  // Assigned to current user
  if (task.assignedTo === currentUser?.uid) return true;

  // Created by current user
  if (task.createdBy === currentUser?.uid) return true;

  // Otherwise, cannot edit
  return false;
};

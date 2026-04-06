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
import { initializeAIConfig, setAIApiKey, getAIApiKey } from './ai-config.js';

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

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  currentUser = user;
  await loadUserDoc();
  initUI();
  setupListeners();
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
  if (userDoc.groupId) { loadGroup(userDoc.groupId); }
  else { openGroupModal(); document.getElementById('smartMsg').textContent = "Set up your study group to get started!"; }
  renderMiniCalendar();
  renderCalendar();
  initializeAIConfig();
  initDoubtSolver(currentUser);
  // Initialize study tracker
  if (window.initStudyTracker) {
    window.initStudyTracker(rtdb, currentUser, userDoc.groupId, [], []);
  }
  // Group discussion will be initialized after group members are loaded
}

function setupListeners() {
  if (!userDoc.groupId) return;
  const gid = userDoc.groupId;
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
  loadGroupMembers(gid);
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
  const snap = await getDocs(query(collection(db, "users"), where("groupId", "==", gid)));
  groupMembers = snap.docs.map(d => d.data());
  document.getElementById('sidebarGroupMembers').textContent = groupMembers.length + ' members';
  populateAssigneeDropdown(); renderLeaderboard(); renderProgressCharts(); renderBurnoutMonitor();

  // Initialize study tracker with current data
  if (window.initStudyTracker) {
    window.initStudyTracker(rtdb, currentUser, userDoc.groupId, tasks, groupMembers);
  }

  // Initialize group discussion with correct parameters
  if (window.initGroupDiscussion) {
    window.initGroupDiscussion(db, currentUser, userDoc.groupId, tasks, groupMembers);
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
  const titles = { dashboard: 'Dashboard', calendar: 'Calendar', tasks: 'Tasks', progress: 'Progress', leaderboard: 'Leaderboard', resources: 'Resources', mytasks: 'My Tasks', livestudy: 'Live Study', discussion: 'Group Discussion', 'manage-doubts': 'Manage Doubts' };
  const subs = { dashboard: 'Overview', calendar: 'Schedule & Events', tasks: 'Task Manager', progress: 'Analytics & Insights', leaderboard: 'Rankings & Points', resources: 'Shared Files & Links', mytasks: 'Track Your Study Time', livestudy: 'Real-time Group Activity', discussion: 'Collaborate & Solve Doubts', 'manage-doubts': 'View & Manage All Doubts' };
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
}
window.switchPage = switchPage;

window.toggleSidebar = function () {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('mainContent').classList.toggle('sidebar-collapsed');
};

window.handleLogout = async function () { await signOut(auth); window.location.href = 'index.html'; };

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

window.openGroupModal = function () { openModal('groupModal'); };
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
    const q = query(collection(db, "groups"), where("code", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) return groupMsg("Invalid code", "error");
    const gid = snap.docs[0].id;
    await updateDoc(snap.docs[0].ref, { members: [...(snap.docs[0].data().members || []), currentUser.uid] });
    await updateDoc(doc(db, "users", currentUser.uid), { groupId: gid });
    userDoc.groupId = gid;
    groupMsg("Joined! Loading...", "success");
    await loadGroup(gid); setupListeners();
    setTimeout(() => closeModal('groupModal'), 1200);
  } catch (e) { groupMsg("Error joining group", "error"); }
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
  ['tskTitle', 'tskStartTime', 'tskEndTime'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('tskDeadline').value = '';
  document.getElementById('tskPriority').value = 'medium';
  document.getElementById('tskColumn').value = defaultCol;
  document.getElementById('tskSaveTxt').textContent = 'Add Task';
  openModal('taskModal');
};

function populateAssigneeDropdown() {
  const sel = document.getElementById('tskAssign'); if (!sel) return;
  sel.innerHTML = '<option value="">Unassigned</option>';
  groupMembers.forEach(m => { const o = document.createElement('option'); o.value = m.uid; o.textContent = m.name + (m.uid === currentUser.uid ? ' (you)' : ''); sel.appendChild(o); });
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

window.saveTask = async function () {
  const title = document.getElementById('tskTitle').value.trim();
  const deadline = document.getElementById('tskDeadline').value;
  const startTime = document.getElementById('tskStartTime')?.value || '';
  const endTime = document.getElementById('tskEndTime')?.value || '';
  const priority = document.getElementById('tskPriority').value;
  const assignedTo = document.getElementById('tskAssign').value;
  const column = document.getElementById('tskColumn').value;
  if (!title) return toast("Task title required", "error");
  if (!userDoc.groupId) return toast("Join a group first", "error");
  const assignedName = groupMembers.find(m => m.uid === assignedTo)?.name || '';
  const points = priority === 'high' ? 25 : priority === 'medium' ? 15 : 10;
  const data = { title, deadline, startTime, endTime, priority, column, assignedTo, assignedName, points, createdBy: currentUser.uid, createdAt: serverTimestamp() };
  try {
    if (editingTaskId) { await updateDoc(doc(db, "groups", userDoc.groupId, "tasks", editingTaskId), data); toast("Task updated!", "success"); }
    else {
      await addDoc(collection(db, "groups", userDoc.groupId, "tasks"), data);
      await awardPoints(POINTS.TASK_ADD);
      await logActivity(`✅ ${userDoc.name} added task: ${title}`, 'task');
      toast(`Task added! +${POINTS.TASK_ADD} pts`, "success");
    }
    closeModal('taskModal');
  } catch (e) { toast("Error saving task", "error"); }
};

function renderKanban() {
  ['todo', 'inprogress', 'completed'].forEach(col => {
    const colTasks = tasks.filter(t => t.column === col);
    document.getElementById('count-' + col).textContent = colTasks.length;
    document.getElementById('cards-' + col).innerHTML = colTasks.map(renderTaskCard).join('');
  });
  setupDragDrop();
}

function renderTaskCard(t) {
  const now = new Date(), deadline = t.deadline ? new Date(t.deadline) : null;
  const isOverdue = deadline && deadline < now && t.column !== 'completed';
  const isCompleted = t.column === 'completed';
  const deadlineStr = deadline ? deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  return `<div class="task-card ${isCompleted ? 'task-completed' : ''}" draggable="true" data-id="${t.id}">
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
      ${t.assignedName ? `<span class="task-assignee"><div class="task-assignee-av">${t.assignedName.charAt(0)}</div>${t.assignedName.split(' ')[0]}</span>` : ''}
      ${deadline ? `<span class="task-deadline ${isOverdue ? 'overdue' : ''}"><i class="fa-regular fa-clock"></i> ${deadlineStr}</span>` : ''}
      ${t.startTime ? `<span class="task-time-badge"><i class="fa-regular fa-clock"></i> ${t.startTime}${t.endTime ? '–' + t.endTime : ''}</span>` : ''}
    </div>
    <div class="task-card-actions">
      <button class="task-act-btn" onclick="editTask('${t.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <button class="task-act-btn danger" onclick="deleteTask('${t.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}

window.toggleTaskComplete = async function (id, checked) {
  try {
    const task = tasks.find(t => t.id === id); if (!task) return;
    const newCol = checked ? 'completed' : 'todo';
    await updateDoc(doc(db, "groups", userDoc.groupId, "tasks", id), { column: newCol, updatedAt: serverTimestamp() });
    if (checked) {
      const pts = task.points || POINTS.TASK_COMPLETE;
      const bonus = task.deadline && new Date(task.deadline) > new Date() ? POINTS.EARLY_COMPLETION : 0;
      await awardPoints(pts + bonus, true);
      await logActivity(`🏆 ${userDoc.name} completed: ${task.title}`, 'complete');
      toast(`Task done! +${pts + bonus} pts${bonus ? ' (Early bonus!)' : ''} 🎉`, "success");
    } else { toast("Task moved back to To Do", "info"); }
  } catch (e) { toast("Error", "error"); }
};

window.editTask = function (id) {
  const task = tasks.find(t => t.id === id); if (!task) return;
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
  if (!confirm('Delete this task?')) return;
  try { await deleteDoc(doc(db, "groups", userDoc.groupId, "tasks", id)); toast("Task deleted", "info"); } catch (e) { toast("Error", "error"); }
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
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('taskId', card.dataset.id); card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
}

window.dropTask = async function (e, col) {
  e.preventDefault();
  document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
  const id = e.dataTransfer.getData('taskId'); if (!id) return;
  try {
    const task = tasks.find(t => t.id === id);
    await updateDoc(doc(db, "groups", userDoc.groupId, "tasks", id), { column: col, updatedAt: serverTimestamp() });
    if (col === 'completed' && task?.column !== 'completed') {
      const pts = task?.points || POINTS.TASK_COMPLETE;
      await awardPoints(pts, true);
      await logActivity(`🏆 ${userDoc.name} completed: ${task?.title}`, 'complete');
      toast(`+${pts} pts 🎉`, "success");
    }
  } catch (e) { toast("Error moving task", "error"); }
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
  const result = await prioritizeTasks(tasks);
  displayPrioritization(result);
};

// AI Settings
window.openAISettings = function () {
  openModal('aiSettingsModal');
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

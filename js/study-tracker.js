// js/study-tracker.js - Simple Study Tracker with Firebase Sync

let rtdb = null;
let currentUser = null;
let groupId = null;
let allTasks = [];
let allMembers = [];
let activeSessions = {}; // All group members' active sessions from Firebase

const stopwatches = {};

// Initialize
function initStudyTracker(database, user, gid, tasks, members) {
    rtdb = database;
    currentUser = user;
    groupId = gid;
    allTasks = tasks;
    allMembers = members;
    console.log("✅ Study Tracker initialized with", tasks.length, "tasks");

    // Listen to active sessions from Firebase
    if (rtdb && gid) {
        listenToActiveSessions();
    }
}

// Listen to active sessions from Firebase Realtime Database
function listenToActiveSessions() {
    if (!rtdb || !groupId) return;

    try {
        const { ref, onValue } = window.firebaseModules || {};
        if (!ref || !onValue) {
            console.warn("Firebase modules not available for real-time sync");
            return;
        }

        const sessionsRef = ref(rtdb, `groups/${groupId}/activeSessions`);
        onValue(sessionsRef, (snapshot) => {
            activeSessions = snapshot.val() || {};
            console.log("📡 Active sessions updated:", Object.keys(activeSessions).length);
            updateDisplay();
        });
    } catch (e) {
        console.warn("Could not set up Firebase listener:", e);
    }
}

// Update tasks
function updateStudyTrackerTasks(tasks, members) {
    allTasks = tasks;
    allMembers = members;
    console.log("📝 Study Tracker updated with", tasks.length, "tasks");
    updateDisplay();
}

// ===== STOPWATCH FUNCTIONS =====
function startStopwatch(taskId, taskName) {
    console.log("Starting stopwatch:", taskId, taskName);

    if (!stopwatches[taskId]) {
        stopwatches[taskId] = {
            taskId,
            taskName,
            startTime: Date.now(),
            elapsedMs: 0,
            isRunning: true,
            interval: null
        };
    } else {
        stopwatches[taskId].isRunning = true;
        stopwatches[taskId].startTime = Date.now() - stopwatches[taskId].elapsedMs;
    }

    // Start timer - only update elapsed time, don't re-render
    if (stopwatches[taskId].interval) clearInterval(stopwatches[taskId].interval);

    stopwatches[taskId].interval = setInterval(() => {
        if (stopwatches[taskId] && stopwatches[taskId].isRunning) {
            stopwatches[taskId].elapsedMs = Date.now() - stopwatches[taskId].startTime;
            // Don't call updateDisplay here - it causes re-rendering
        }
    }, 100);

    // Save to Firebase
    saveSessionToFirebase(taskId, taskName, 'running');

    showToast('✅ Stopwatch started', 'success');
    updateDisplay();
}

function pauseStopwatch(taskId) {
    console.log("Pausing stopwatch:", taskId);

    if (stopwatches[taskId]) {
        if (stopwatches[taskId].isRunning) {
            // Pause the stopwatch
            stopwatches[taskId].isRunning = false;
            if (stopwatches[taskId].interval) {
                clearInterval(stopwatches[taskId].interval);
                stopwatches[taskId].interval = null;
            }

            // Update Firebase
            saveSessionToFirebase(stopwatches[taskId].taskId, stopwatches[taskId].taskName, 'paused');

            showToast('⏸ Stopwatch paused', 'info');
        } else {
            // Resume the stopwatch
            stopwatches[taskId].isRunning = true;
            stopwatches[taskId].startTime = Date.now() - stopwatches[taskId].elapsedMs;

            // Restart interval - only update elapsed time
            if (stopwatches[taskId].interval) clearInterval(stopwatches[taskId].interval);
            stopwatches[taskId].interval = setInterval(() => {
                if (stopwatches[taskId] && stopwatches[taskId].isRunning) {
                    stopwatches[taskId].elapsedMs = Date.now() - stopwatches[taskId].startTime;
                }
            }, 100);

            // Update Firebase
            saveSessionToFirebase(stopwatches[taskId].taskId, stopwatches[taskId].taskName, 'running');

            showToast('▶ Stopwatch resumed', 'success');
        }

        updateDisplay();
    }
}

function stopStopwatch(taskId) {
    console.log("Stopping stopwatch:", taskId);

    if (stopwatches[taskId]) {
        if (stopwatches[taskId].interval) {
            clearInterval(stopwatches[taskId].interval);
        }

        const elapsedMs = stopwatches[taskId].elapsedMs;
        const minutes = Math.floor(elapsedMs / 60000);
        const points = Math.min(50, Math.max(5, Math.floor(minutes / 5) * 5 || 5));

        // Remove from Firebase
        removeSessionFromFirebase(taskId);

        delete stopwatches[taskId];
        showToast(`✅ Session ended! +${points} pts`, 'success');
        updateDisplay();
    }
}

function getStopwatchStatus(taskId) {
    if (!stopwatches[taskId]) return 'idle';
    return stopwatches[taskId].isRunning ? 'running' : 'paused';
}

function getElapsedTime(taskId) {
    if (!stopwatches[taskId]) return 0;
    return stopwatches[taskId].elapsedMs;
}

// ===== RENDER FUNCTIONS =====
function renderMyTasks() {
    const container = document.getElementById('myTasksGrid');
    if (!container) return;

    console.log("renderMyTasks called. currentUser:", currentUser, "allTasks:", allTasks.length);

    const myTasks = allTasks.filter(t => {
        console.log("Checking task:", t.title, "assignedTo:", t.assignedTo, "currentUser.uid:", currentUser?.uid);
        return t.assignedTo === currentUser?.uid;
    });

    console.log("Filtered myTasks:", myTasks.length);

    if (myTasks.length === 0) {
        container.innerHTML = '<div class="empty-state">No tasks assigned to you</div>';
        return;
    }

    container.innerHTML = myTasks.map(task => {
        const status = getStopwatchStatus(task.id);
        const elapsed = getElapsedTime(task.id);
        const timeStr = formatTime(elapsed);
        const isRunning = status === 'running';
        const isPaused = status === 'paused';
        const isIdle = status === 'idle';
        const hasStarted = isRunning || isPaused;

        return `
            <div class="my-task-card" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-status ${status}">${status}</div>
                </div>
                <div class="task-timer">${timeStr}</div>
                <div class="task-actions">
                    <button class="btn-small ${isRunning ? 'active' : ''}" onclick="window.startStopwatch('${task.id}', '${escapeHtml(task.title)}')" ${isRunning ? 'disabled' : ''}>
                        <i class="fa-solid fa-play"></i> Start
                    </button>
                    <button class="btn-small ${isPaused ? 'active' : ''}" onclick="window.pauseStopwatch('${task.id}')" ${!hasStarted ? 'disabled' : ''}>
                        <i class="fa-solid fa-pause"></i> ${isRunning ? 'Pause' : 'Resume'}
                    </button>
                    <button class="btn-small" onclick="window.stopStopwatch('${task.id}')" ${isIdle ? 'disabled' : ''}>
                        <i class="fa-solid fa-stop"></i> Stop
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderLiveStudy() {
    const container = document.getElementById('liveStudyGrid');
    if (!container) return;

    console.log("renderLiveStudy called. activeSessions:", Object.keys(activeSessions).length);

    // Get all active sessions from Firebase
    const allActiveSessions = Object.entries(activeSessions)
        .filter(([_, session]) => session && session.status === 'running')
        .map(([userId, session]) => {
            const member = allMembers.find(m => m.uid === userId);
            return {
                userId,
                userName: member?.name || 'Unknown User',
                taskName: session.taskName || 'Unknown Task',
                elapsed: session.elapsedMs || 0,
                startTime: session.startTime || Date.now()
            };
        })
        .sort((a, b) => b.elapsed - a.elapsed);

    console.log("All active sessions:", allActiveSessions.length);

    const countEl = document.getElementById('activeStudentsCount');
    if (countEl) countEl.textContent = `${allActiveSessions.length} studying`;

    if (allActiveSessions.length === 0) {
        container.innerHTML = '<div class="empty-state">No one is studying right now</div>';
        return;
    }

    container.innerHTML = allActiveSessions.map((session, idx) => {
        // Calculate elapsed time from startTime
        const now = Date.now();
        const elapsed = now - session.startTime;
        const timeStr = formatTime(elapsed);

        return `
            <div class="live-study-card ${idx === 0 ? 'top-active' : ''}">
                <div class="study-rank">#${idx + 1}</div>
                <div class="study-user">${escapeHtml(session.userName)}</div>
                <div class="study-task">${escapeHtml(session.taskName)}</div>
                <div class="study-timer">${timeStr}</div>
                <div class="study-status">
                    <span class="status-dot"></span> Studying
                </div>
            </div>
        `;
    }).join('');
}

function filterMyTasks(filter, el) {
    document.querySelectorAll('.task-filters .filter-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    renderMyTasks();
}

// ===== FIREBASE SYNC FUNCTIONS =====
function saveSessionToFirebase(taskId, taskName, status) {
    if (!rtdb || !groupId || !currentUser) return;

    try {
        const { ref, set } = window.firebaseModules || {};
        if (!ref || !set) {
            console.warn("Firebase modules not available for saving session");
            return;
        }

        const sessionRef = ref(rtdb, `groups/${groupId}/activeSessions/${currentUser.uid}`);
        set(sessionRef, {
            taskId,
            taskName,
            status,
            startTime: Date.now(),
            elapsedMs: 0,
            userId: currentUser.uid
        }).catch(e => console.warn("Could not save session:", e));
    } catch (e) {
        console.warn("Error saving session:", e);
    }
}

function removeSessionFromFirebase(taskId) {
    if (!rtdb || !groupId || !currentUser) return;

    try {
        const { ref, remove } = window.firebaseModules || {};
        if (!ref || !remove) {
            console.warn("Firebase modules not available for removing session");
            return;
        }

        const sessionRef = ref(rtdb, `groups/${groupId}/activeSessions/${currentUser.uid}`);
        remove(sessionRef).catch(e => console.warn("Could not remove session:", e));
    } catch (e) {
        console.warn("Error removing session:", e);
    }
}

// ===== UTILITY FUNCTIONS =====
function updateDisplay() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;

    if (activePage.id === 'page-mytasks') {
        renderMyTasks();
    } else if (activePage.id === 'page-livestudy') {
        renderLiveStudy();
    }
}

// Update timer displays every 500ms without full re-render
setInterval(() => {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;

    if (activePage.id === 'page-mytasks') {
        // Update only the timer displays, not the entire page
        document.querySelectorAll('.my-task-card').forEach(card => {
            const taskId = card.getAttribute('data-task-id');
            const timerEl = card.querySelector('.task-timer');
            const statusEl = card.querySelector('.task-status');
            if (timerEl && statusEl) {
                const elapsed = getElapsedTime(taskId);
                const status = getStopwatchStatus(taskId);
                timerEl.textContent = formatTime(elapsed);
                statusEl.textContent = status;
                statusEl.className = `task-status ${status}`;
            }
        });
    } else if (activePage.id === 'page-livestudy') {
        renderLiveStudy();
    }
}, 500);

// Set up continuous update for Live Study page
setInterval(() => {
    const activePage = document.querySelector('.page.active');
    if (activePage && activePage.id === 'page-livestudy') {
        renderLiveStudy();
    }
}, 1000);

function formatTime(ms) {
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

function showToast(msg, type = 'info') {
    const el = document.getElementById('toast');
    if (el) {
        el.textContent = msg;
        el.className = `toast show ${type}`;
        setTimeout(() => el.classList.remove('show'), 3000);
    }
}

// ===== EXPORT TO WINDOW =====
window.initStudyTracker = initStudyTracker;
window.startStopwatch = startStopwatch;
window.pauseStopwatch = pauseStopwatch;
window.stopStopwatch = stopStopwatch;
window.getStopwatchStatus = getStopwatchStatus;
window.getElapsedTime = getElapsedTime;
window.renderMyTasks = renderMyTasks;
window.renderLiveStudy = renderLiveStudy;
window.filterMyTasks = filterMyTasks;
window.updateDisplay = updateDisplay;
window.updateStudyTrackerTasks = updateStudyTrackerTasks;

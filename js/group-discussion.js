// Group Discussion System - Simple Vanilla JS
console.log("Loading group-discussion.js...");

var discussionDB = null;
var discussionUser = null;
var discussionGroupId = null;
var discussionTasks = [];
var discussionMembers = [];
var allDiscussions = [];

function initGroupDiscussion(db, user, gid, tasks, members) {
    discussionDB = db;
    discussionUser = user;
    discussionGroupId = gid;
    discussionTasks = tasks;
    discussionMembers = members;
    console.log("Group Discussion initialized");
    listenToDiscussions();
}

function listenToDiscussions() {
    if (!discussionDB || !discussionGroupId) return;

    try {
        var modules = window.firebaseModules;
        if (!modules) {
            console.warn("Firebase modules not available");
            return;
        }

        var collection = modules.collection;
        var query = modules.query;
        var onSnapshot = modules.onSnapshot;
        var orderBy = modules.orderBy;

        if (!collection || !onSnapshot) {
            console.warn("Required Firebase functions not available");
            return;
        }

        var discussionsRef = collection(discussionDB, "groups", discussionGroupId, "discussions");
        var q = query(discussionsRef, orderBy("createdAt", "desc"));

        onSnapshot(q, function (snapshot) {
            allDiscussions = [];
            snapshot.forEach(function (doc) {
                var data = doc.data();
                var discussion = {
                    id: doc.id,
                    taskId: data.taskId,
                    taskName: data.taskName,
                    doubtText: data.doubtText,
                    authorId: data.authorId,
                    authorName: data.authorName,
                    status: data.status,
                    answers: data.answers || [],
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt
                };
                allDiscussions.push(discussion);
            });
            console.log("Discussions loaded:", allDiscussions.length);
            renderDiscussions();
        });
    } catch (e) {
        console.error("Error listening to discussions:", e);
    }
}

function updateGroupDiscussionData(tasks, members) {
    discussionTasks = tasks;
    discussionMembers = members;
}

function postDoubt() {
    console.log("POST DOUBT CALLED");

    var taskSelect = document.getElementById('discussionTaskSelect');
    var doubtInput = document.getElementById('discussionDoubtInput');

    if (!taskSelect || !doubtInput) {
        alert('Form elements not found');
        return;
    }

    var taskId = taskSelect.value;
    var doubtText = doubtInput.value.trim();

    if (!taskId) {
        alert('Please select a task');
        return;
    }

    if (!doubtText) {
        alert('Please enter your doubt');
        return;
    }

    if (!discussionUser) {
        alert('User not authenticated');
        return;
    }

    if (!discussionGroupId) {
        alert('Group not set');
        return;
    }

    var task = null;
    for (var i = 0; i < discussionTasks.length; i++) {
        if (discussionTasks[i].id === taskId) {
            task = discussionTasks[i];
            break;
        }
    }

    if (!task) {
        alert('Task not found');
        return;
    }

    var discussion = {
        taskId: taskId,
        taskName: task.title,
        doubtText: doubtText,
        authorId: discussionUser.uid,
        authorName: discussionUser.displayName || 'Anonymous',
        status: 'open',
        answers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    saveDiscussionToFirebase(discussion);
    doubtInput.value = '';
    taskSelect.value = '';
    alert('Doubt posted successfully!');
}

function postAnswer(discussionId) {
    var answerInput = document.getElementById('answerInput-' + discussionId);
    if (!answerInput) {
        alert('Answer input not found');
        return;
    }

    var answerText = answerInput.value.trim();
    if (!answerText) {
        alert('Please enter an answer');
        return;
    }

    var discussion = null;
    for (var i = 0; i < allDiscussions.length; i++) {
        if (allDiscussions[i].id === discussionId) {
            discussion = allDiscussions[i];
            break;
        }
    }

    if (!discussion) {
        alert('Discussion not found');
        return;
    }

    var answer = {
        answerId: Date.now() + '-' + Math.random(),
        answerText: answerText,
        authorId: discussionUser.uid,
        authorName: discussionUser.displayName || 'Anonymous',
        createdAt: new Date().toISOString(),
        likes: 0
    };

    if (!discussion.answers) discussion.answers = [];
    discussion.answers.push(answer);
    discussion.updatedAt = new Date().toISOString();

    updateDiscussionInFirebase(discussionId, discussion);
    answerInput.value = '';
    alert('Answer posted!');
}

function markAsAnswered(discussionId) {
    var discussion = null;
    for (var i = 0; i < allDiscussions.length; i++) {
        if (allDiscussions[i].id === discussionId) {
            discussion = allDiscussions[i];
            break;
        }
    }

    if (!discussion) return;

    if (discussion.authorId !== discussionUser.uid) {
        alert('Only the author can mark as answered');
        return;
    }

    discussion.status = 'answered';
    discussion.updatedAt = new Date().toISOString();

    updateDiscussionInFirebase(discussionId, discussion);
    alert('Marked as answered!');
}

function reopenDiscussion(discussionId) {
    var discussion = null;
    for (var i = 0; i < allDiscussions.length; i++) {
        if (allDiscussions[i].id === discussionId) {
            discussion = allDiscussions[i];
            break;
        }
    }

    if (!discussion) return;

    if (discussion.authorId !== discussionUser.uid) {
        alert('Only the author can reopen');
        return;
    }

    discussion.status = 'open';
    discussion.updatedAt = new Date().toISOString();

    updateDiscussionInFirebase(discussionId, discussion);
    alert('Discussion reopened!');
}

function likeAnswer(discussionId, answerId) {
    var discussion = null;
    for (var i = 0; i < allDiscussions.length; i++) {
        if (allDiscussions[i].id === discussionId) {
            discussion = allDiscussions[i];
            break;
        }
    }

    if (!discussion) return;

    var answer = null;
    if (discussion.answers) {
        for (var j = 0; j < discussion.answers.length; j++) {
            if (discussion.answers[j].answerId === answerId) {
                answer = discussion.answers[j];
                break;
            }
        }
    }

    if (!answer) return;

    answer.likes = (answer.likes || 0) + 1;
    discussion.updatedAt = new Date().toISOString();

    updateDiscussionInFirebase(discussionId, discussion);
}

function renderDiscussions() {
    var container = document.getElementById('discussionContainer');
    if (!container) return;

    var openDiscussions = [];
    var answeredDiscussions = [];

    for (var i = 0; i < allDiscussions.length; i++) {
        if (allDiscussions[i].status === 'open') {
            openDiscussions.push(allDiscussions[i]);
        } else {
            answeredDiscussions.push(allDiscussions[i]);
        }
    }

    var html = '<div class="discussion-tabs">';
    html += '<button class="discussion-tab active" onclick="switchDiscussionTab(\'open\', this)">Open Doubts (' + openDiscussions.length + ')</button>';
    html += '<button class="discussion-tab" onclick="switchDiscussionTab(\'answered\', this)">Answered (' + answeredDiscussions.length + ')</button>';
    html += '</div>';

    html += '<div id="openDiscussionsTab" class="discussion-tab-content active">';
    if (openDiscussions.length === 0) {
        html += '<div class="empty-state">No open doubts yet</div>';
    } else {
        for (var i = 0; i < openDiscussions.length; i++) {
            html += renderDiscussionCard(openDiscussions[i]);
        }
    }
    html += '</div>';

    html += '<div id="answeredDiscussionsTab" class="discussion-tab-content">';
    if (answeredDiscussions.length === 0) {
        html += '<div class="empty-state">No answered discussions yet</div>';
    } else {
        for (var i = 0; i < answeredDiscussions.length; i++) {
            html += renderDiscussionCard(answeredDiscussions[i]);
        }
    }
    html += '</div>';

    container.innerHTML = html;
}

function renderDiscussionCard(discussion) {
    var author = null;
    for (var i = 0; i < discussionMembers.length; i++) {
        if (discussionMembers[i].uid === discussion.authorId) {
            author = discussionMembers[i];
            break;
        }
    }

    var authorName = author ? author.name : (discussion.authorName || 'Anonymous');
    var isAuthor = discussion.authorId === discussionUser.uid;
    var statusColor = discussion.status === 'answered' ? '#4ade80' : '#fbbf24';
    var statusBg = discussion.status === 'answered' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)';

    var html = '<div class="discussion-card" style="border-left: 4px solid ' + statusColor + ';">';
    html += '<div class="discussion-header">';
    html += '<div class="discussion-meta">';
    html += '<div class="discussion-author">' + escapeHtml(authorName) + '</div>';
    html += '<div class="discussion-task">📌 ' + escapeHtml(discussion.taskName) + '</div>';
    html += '<div class="discussion-time">' + timeAgo(new Date(discussion.createdAt)) + '</div>';
    html += '</div>';
    html += '<div class="discussion-status" style="background: ' + statusBg + '; color: ' + statusColor + ';">';
    html += discussion.status === 'answered' ? '✅ Answered' : '⏳ Open';
    html += '</div>';
    html += '</div>';

    html += '<div class="discussion-doubt">';
    html += '<strong>Doubt:</strong> ' + escapeHtml(discussion.doubtText);
    html += '</div>';

    html += '<div class="discussion-answers">';
    if (discussion.answers && discussion.answers.length > 0) {
        html += '<div class="answers-header"><strong>Answers (' + discussion.answers.length + ')</strong></div>';
        for (var i = 0; i < discussion.answers.length; i++) {
            var answer = discussion.answers[i];
            html += '<div class="answer-item">';
            html += '<div class="answer-author">' + escapeHtml(answer.authorName) + '</div>';
            html += '<div class="answer-text">' + escapeHtml(answer.answerText) + '</div>';
            html += '<div class="answer-footer">';
            html += '<span class="answer-time">' + timeAgo(new Date(answer.createdAt)) + '</span>';
            html += '<button class="answer-like" onclick="likeAnswer(\'' + discussion.id + '\', \'' + answer.answerId + '\')">👍 ' + (answer.likes || 0) + '</button>';
            html += '</div>';
            html += '</div>';
        }
    }
    html += '</div>';

    if (discussion.status === 'open') {
        html += '<div class="discussion-answer-form">';
        html += '<input type="text" id="answerInput-' + discussion.id + '" placeholder="Post your answer..." class="discussion-input" />';
        html += '<button class="btn-small" onclick="postAnswer(\'' + discussion.id + '\')"><i class="fa-solid fa-paper-plane"></i> Answer</button>';
        if (isAuthor) {
            html += '<button class="btn-small" onclick="markAsAnswered(\'' + discussion.id + '\')" style="background: #4ade80;"><i class="fa-solid fa-check"></i> Mark Answered</button>';
        }
        html += '</div>';
    } else {
        html += '<div class="discussion-answered-footer">';
        if (isAuthor) {
            html += '<button class="btn-small" onclick="reopenDiscussion(\'' + discussion.id + '\')"><i class="fa-solid fa-rotate-left"></i> Reopen</button>';
        }
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function switchDiscussionTab(tab, el) {
    var tabs = document.querySelectorAll('.discussion-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    el.classList.add('active');

    var contents = document.querySelectorAll('.discussion-tab-content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }

    if (tab === 'open') {
        document.getElementById('openDiscussionsTab').classList.add('active');
    } else {
        document.getElementById('answeredDiscussionsTab').classList.add('active');
    }
}

function renderManageDoubts(filter) {
    if (!filter) filter = 'all';

    var container = document.getElementById('manageDoubtsContainer');
    if (!container) return;

    var filtered = [];

    if (filter === 'open') {
        for (var i = 0; i < allDiscussions.length; i++) {
            if (allDiscussions[i].status === 'open') {
                filtered.push(allDiscussions[i]);
            }
        }
    } else if (filter === 'answered') {
        for (var i = 0; i < allDiscussions.length; i++) {
            if (allDiscussions[i].status === 'answered') {
                filtered.push(allDiscussions[i]);
            }
        }
    } else if (filter === 'mine') {
        for (var i = 0; i < allDiscussions.length; i++) {
            if (allDiscussions[i].authorId === discussionUser.uid) {
                filtered.push(allDiscussions[i]);
            }
        }
    } else {
        filtered = allDiscussions;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No doubts found</div>';
        return;
    }

    var html = '<div class="manage-doubts-grid">';
    for (var i = 0; i < filtered.length; i++) {
        var d = filtered[i];
        var statusColor = d.status === 'answered' ? '#4ade80' : '#fbbf24';
        var statusBg = d.status === 'answered' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)';

        html += '<div class="manage-doubt-card" style="border-left: 4px solid ' + statusColor + ';">';
        html += '<div class="doubt-header">';
        html += '<div class="doubt-title">' + escapeHtml(d.taskName) + '</div>';
        html += '<div class="doubt-status" style="background: ' + statusBg + '; color: ' + statusColor + ';">';
        html += d.status === 'answered' ? '✅ Answered' : '⏳ Open';
        html += '</div>';
        html += '</div>';
        html += '<div class="doubt-author">By: ' + escapeHtml(d.authorName) + '</div>';
        html += '<div class="doubt-text">' + escapeHtml(d.doubtText) + '</div>';
        html += '<div class="doubt-stats">';
        html += '<span>📝 ' + (d.answers ? d.answers.length : 0) + ' answers</span>';
        html += '<span>⏰ ' + timeAgo(new Date(d.createdAt)) + '</span>';
        html += '</div>';
        html += '<div class="doubt-actions">';
        html += '<button class="btn-small" onclick="switchPage(\'discussion\', null)"><i class="fa-solid fa-eye"></i> View</button>';
        if (d.authorId === discussionUser.uid) {
            if (d.status === 'open') {
                html += '<button class="btn-small" onclick="markAsAnswered(\'' + d.id + '\')" style="background: #4ade80;"><i class="fa-solid fa-check"></i> Mark Answered</button>';
            } else {
                html += '<button class="btn-small" onclick="reopenDiscussion(\'' + d.id + '\')"><i class="fa-solid fa-rotate-left"></i> Reopen</button>';
            }
        }
        html += '</div>';
        html += '</div>';
    }
    html += '</div>';

    container.innerHTML = html;
}

function filterDoubts(filter, el) {
    var buttons = document.querySelectorAll('.task-filters .filter-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    el.classList.add('active');
    renderManageDoubts(filter);
}

function saveDiscussionToFirebase(discussion) {
    if (!discussionDB || !discussionGroupId) {
        console.error("DB or GroupID not set");
        return;
    }

    try {
        var modules = window.firebaseModules;
        var collection = modules.collection;
        var addDoc = modules.addDoc;
        var serverTimestamp = modules.serverTimestamp;

        if (!collection || !addDoc) {
            console.error("Firestore modules not available");
            return;
        }

        var discussionsRef = collection(discussionDB, "groups", discussionGroupId, "discussions");

        var docData = {
            taskId: discussion.taskId,
            taskName: discussion.taskName,
            doubtText: discussion.doubtText,
            authorId: discussion.authorId,
            authorName: discussion.authorName,
            status: discussion.status,
            answers: discussion.answers,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        addDoc(discussionsRef, docData).then(function (docRef) {
            console.log("Discussion saved:", docRef.id);
        }).catch(function (e) {
            console.error("Error saving:", e);
            alert('Error posting doubt: ' + e.message);
        });
    } catch (e) {
        console.error("Error:", e);
        alert('Error: ' + e.message);
    }
}

function updateDiscussionInFirebase(discussionId, discussion) {
    if (!discussionDB || !discussionGroupId) return;

    try {
        var modules = window.firebaseModules;
        var doc = modules.doc;
        var updateDoc = modules.updateDoc;
        var serverTimestamp = modules.serverTimestamp;

        if (!doc || !updateDoc) {
            console.warn("Firestore modules not available");
            return;
        }

        var discussionRef = doc(discussionDB, "groups", discussionGroupId, "discussions", discussionId);

        var updateData = {
            status: discussion.status,
            answers: discussion.answers,
            updatedAt: serverTimestamp()
        };

        updateDoc(discussionRef, updateData).catch(function (e) {
            console.warn("Could not update:", e);
        });
    } catch (e) {
        console.warn("Error updating:", e);
    }
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function timeAgo(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    return Math.floor(seconds) + 's ago';
}

// Export to window
window.initGroupDiscussion = initGroupDiscussion;
window.updateGroupDiscussionData = updateGroupDiscussionData;
window.postDoubt = postDoubt;
window.postAnswer = postAnswer;
window.markAsAnswered = markAsAnswered;
window.reopenDiscussion = reopenDiscussion;
window.likeAnswer = likeAnswer;
// Export to window
window.initGroupDiscussion = initGroupDiscussion;
window.updateGroupDiscussionData = updateGroupDiscussionData;
window.postDoubt = postDoubt;
window.postAnswer = postAnswer;
window.markAsAnswered = markAsAnswered;
window.reopenDiscussion = reopenDiscussion;
window.likeAnswer = likeAnswer;
window.renderDiscussions = renderDiscussions;
window.switchDiscussionTab = switchDiscussionTab;
window.renderManageDoubts = renderManageDoubts;
window.filterDoubts = filterDoubts;

console.log("✅ group-discussion.js loaded successfully");
console.log("window.postDoubt available:", typeof window.postDoubt);

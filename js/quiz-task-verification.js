/**
 * Quiz-Based Task Verification System with Peer Approval
 * 
 * Features:
 * - Quiz-based task validation (no AI required)
 * - Peer approval system
 * - Verification results tracking
 * - Team visibility
 */

console.log("Loading quiz-task-verification.js...");

// Global state
var verificationDB = null;
var verificationUser = null;
var verificationGroupId = null;
var currentVerificationTask = null;
var currentQuizForVerification = null;
var quizAnswersForVerification = [];

/**
 * Initialize the verification system
 */
function initQuizTaskVerification(db, user, gid) {
    verificationDB = db;
    verificationUser = user;
    verificationGroupId = gid;
    console.log("✅ Quiz Task Verification initialized");
}

/**
 * Open verification modal for a task
 */
function openTaskVerificationModal(taskId, taskTitle, taskDescription) {
    var modal = document.getElementById('taskVerificationModal');
    if (!modal) {
        console.warn("Task verification modal not found");
        return;
    }

    currentVerificationTask = {
        id: taskId,
        title: taskTitle,
        description: taskDescription
    };

    // Update modal header
    document.getElementById('verificationTaskTitle').textContent = taskTitle;
    document.getElementById('verificationTaskDesc').textContent = taskDescription || 'Complete this task to verify';

    // Reset quiz state
    currentQuizForVerification = null;
    quizAnswersForVerification = [];

    // Show modal
    modal.classList.remove('hidden');
}

/**
 * Close verification modal
 */
function closeTaskVerificationModal() {
    var modal = document.getElementById('taskVerificationModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentVerificationTask = null;
    currentQuizForVerification = null;
    quizAnswersForVerification = [];
}

/**
 * Start quiz for task verification
 */
function startTaskVerificationQuiz() {
    if (!currentVerificationTask) {
        alert('No task selected');
        return;
    }

    var topic = currentVerificationTask.title;
    var numQuestions = 5; // Fixed for verification
    var difficulty = 'medium';

    // Show loading
    var startSection = document.getElementById('verificationStartSection');
    if (startSection) {
        startSection.style.display = 'none';
    }

    var loadingDiv = document.getElementById('verificationQuizLoading');
    if (loadingDiv) {
        loadingDiv.style.display = 'flex';
    }

    // Fetch quiz questions
    fetchVerificationQuizQuestions(topic, numQuestions, difficulty);
}

/**
 * Fetch quiz questions from Open Trivia Database
 */
function fetchVerificationQuizQuestions(topic, numQuestions, difficulty) {
    var diffParam = difficulty || 'medium';
    var url = 'https://opentdb.com/api.php?amount=' + numQuestions + '&type=multiple&difficulty=' + diffParam;

    // Category mapping
    var categoryMap = {
        'science': 17, 'history': 23, 'geography': 22, 'sports': 21,
        'entertainment': 11, 'general': 9, 'math': 19, 'technology': 18,
        'literature': 26, 'music': 12, 'movies': 11, 'animals': 27,
        'vehicles': 28, 'politics': 24, 'thermodynamics': 17, 'physics': 17,
        'chemistry': 17, 'biology': 17, 'calculus': 19, 'algebra': 19
    };

    var categoryId = categoryMap[topic.toLowerCase()];
    if (categoryId) {
        url += '&category=' + categoryId;
    }

    fetch(url)
        .then(function (response) {
            if (!response.ok) throw new Error('Failed to fetch quiz');
            return response.json();
        })
        .then(function (data) {
            if (data.response_code !== 0) {
                throw new Error('No questions available for this topic');
            }

            currentQuizForVerification = data.results;
            quizAnswersForVerification = [];
            displayVerificationQuiz();
        })
        .catch(function (error) {
            console.error('Quiz fetch error:', error);
            alert('Failed to load quiz: ' + error.message);

            // Hide loading
            var loadingDiv = document.getElementById('verificationQuizLoading');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }

            // Show start section again
            var startSection = document.getElementById('verificationStartSection');
            if (startSection) {
                startSection.style.display = 'block';
            }
        });
}

/**
 * Display verification quiz
 */
function displayVerificationQuiz() {
    var loadingDiv = document.getElementById('verificationQuizLoading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }

    var quizContainer = document.getElementById('verificationQuizContainer');
    if (!quizContainer) {
        console.warn("Quiz container not found");
        return;
    }

    if (!currentQuizForVerification || currentQuizForVerification.length === 0) {
        alert('No quiz questions available');
        return;
    }

    displayVerificationQuestion(0);
}

/**
 * Display a single verification question
 */
function displayVerificationQuestion(index) {
    if (index >= currentQuizForVerification.length) {
        submitVerificationQuiz();
        return;
    }

    var question = currentQuizForVerification[index];
    var quizContainer = document.getElementById('verificationQuizContainer');

    // Decode HTML entities
    var questionText = decodeHtmlEntity(question.question);
    var correctAnswer = decodeHtmlEntity(question.correct_answer);
    var incorrectAnswers = question.incorrect_answers.map(function (a) {
        return decodeHtmlEntity(a);
    });

    // Shuffle answers
    var allAnswers = [correctAnswer].concat(incorrectAnswers);
    allAnswers = shuffleArray(allAnswers);

    // Build HTML
    var html = '<div class="verification-question">';
    html += '<div class="verification-question-header">';
    html += '<span class="verification-question-number">Question ' + (index + 1) + ' of ' + currentQuizForVerification.length + '</span>';
    html += '<div class="verification-progress-bar">';
    html += '<div class="verification-progress-fill" style="width: ' + ((index / currentQuizForVerification.length) * 100) + '%"></div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="verification-question-text">' + escapeHtml(questionText) + '</div>';
    html += '<div class="verification-answers">';

    allAnswers.forEach(function (answer) {
        var isCorrect = answer === correctAnswer;
        html += '<button class="verification-answer-btn" onclick="selectVerificationAnswer(' + index + ', \'' + escapeHtmlAttr(answer) + '\', ' + isCorrect + ')">';
        html += escapeHtml(answer);
        html += '</button>';
    });

    html += '</div>';
    html += '</div>';

    quizContainer.innerHTML = html;
}

/**
 * Select verification answer
 */
function selectVerificationAnswer(questionIndex, answer, isCorrect) {
    // Store answer
    quizAnswersForVerification[questionIndex] = {
        question: currentQuizForVerification[questionIndex].question,
        answer: answer,
        correct: currentQuizForVerification[questionIndex].correct_answer,
        isCorrect: isCorrect
    };

    // Move to next question
    setTimeout(function () {
        displayVerificationQuestion(questionIndex + 1);
    }, 500);
}

/**
 * Submit verification quiz
 */
function submitVerificationQuiz() {
    if (!currentQuizForVerification || quizAnswersForVerification.length === 0) {
        alert('Please complete the quiz');
        return;
    }

    // Calculate score
    var correctCount = 0;
    quizAnswersForVerification.forEach(function (answer) {
        if (answer && answer.isCorrect) {
            correctCount++;
        }
    });

    var totalQuestions = currentQuizForVerification.length;
    var percentage = Math.round((correctCount / totalQuestions) * 100);
    var passed = percentage >= 70;

    // Show results
    displayVerificationResults(correctCount, totalQuestions, percentage, passed);
}

/**
 * Display verification results
 */
function displayVerificationResults(correctCount, totalQuestions, percentage, passed) {
    var quizContainer = document.getElementById('verificationQuizContainer');
    if (!quizContainer) return;

    var statusClass = passed ? 'success' : 'failed';
    var statusIcon = passed ? '✅' : '❌';
    var statusText = passed ? 'PASSED' : 'FAILED';

    var html = '<div class="verification-results ' + statusClass + '">';
    html += '<div class="verification-results-icon">' + statusIcon + '</div>';
    html += '<div class="verification-results-content">';
    html += '<h3>' + statusText + '</h3>';
    html += '<div class="verification-score">' + correctCount + ' / ' + totalQuestions + ' Correct</div>';
    html += '<div class="verification-percentage">' + percentage + '%</div>';

    if (passed) {
        html += '<p class="verification-message">Great! Your task is now pending peer approval.</p>';
        html += '<button class="btn-primary" onclick="saveVerificationResult(' + correctCount + ', ' + totalQuestions + ', ' + percentage + ', true)" style="margin-top: 16px;">';
        html += '<i class="fa-solid fa-check"></i> Submit for Approval';
        html += '</button>';
    } else {
        html += '<p class="verification-message">Score below 70%. Please try again.</p>';
        html += '<button class="btn-accent" onclick="retakeVerificationQuiz()" style="margin-top: 16px;">';
        html += '<i class="fa-solid fa-rotate-right"></i> Retake Quiz';
        html += '</button>';
    }

    html += '</div>';
    html += '</div>';

    quizContainer.innerHTML = html;
}

/**
 * Retake verification quiz
 */
function retakeVerificationQuiz() {
    currentQuizForVerification = null;
    quizAnswersForVerification = [];

    var quizContainer = document.getElementById('verificationQuizContainer');
    if (quizContainer) {
        quizContainer.innerHTML = '';
    }

    var startSection = document.getElementById('verificationStartSection');
    if (startSection) {
        startSection.style.display = 'block';
    }
}

/**
 * Save verification result to Firebase
 */
function saveVerificationResult(correctCount, totalQuestions, percentage, passed) {
    if (!verificationDB || !verificationGroupId || !currentVerificationTask) {
        console.error("Firebase not configured");
        return;
    }

    try {
        var modules = window.firebaseModules;
        if (!modules) {
            console.warn("Firebase modules not available");
            return;
        }

        var collection = modules.collection;
        var addDoc = modules.addDoc;
        var serverTimestamp = modules.serverTimestamp;
        var doc = modules.doc;
        var updateDoc = modules.updateDoc;

        // Create verification result
        var verificationResult = {
            taskId: currentVerificationTask.id,
            userId: verificationUser.uid,
            userName: verificationUser.displayName || 'Anonymous',
            topic: currentVerificationTask.title,
            score: correctCount,
            totalQuestions: totalQuestions,
            percentage: percentage,
            passed: passed,
            timestamp: serverTimestamp(),
            status: 'pending_peer_approval',
            approvals: [],
            rejections: []
        };

        // Save to verification collection
        var verificationRef = collection(verificationDB, "groups", verificationGroupId, "task_verifications");
        addDoc(verificationRef, verificationResult).then(function (docRef) {
            console.log("Verification result saved:", docRef.id);

            // Update task status
            var taskRef = doc(verificationDB, "groups", verificationGroupId, "tasks", currentVerificationTask.id);
            updateDoc(taskRef, {
                column: 'pending_peer_approval',
                verificationId: docRef.id,
                verificationScore: percentage
            }).catch(function (e) {
                console.warn("Could not update task:", e);
            });

            // Close modal and show success
            toast('Quiz submitted! Waiting for peer approval.', 'success');
            setTimeout(function () {
                closeTaskVerificationModal();
                loadVerificationResults();
            }, 1500);
        }).catch(function (e) {
            console.error("Error saving verification:", e);
            alert('Error saving verification: ' + e.message);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

/**
 * Load and display verification results
 */
function loadVerificationResults() {
    if (!verificationDB || !verificationGroupId) {
        console.warn("Firebase not configured");
        return;
    }

    try {
        var modules = window.firebaseModules;
        if (!modules) {
            console.warn("Firebase modules not available");
            return;
        }

        var collection = modules.collection;
        var query = modules.query;
        var getDocs = modules.getDocs;

        var verificationRef = collection(verificationDB, "groups", verificationGroupId, "task_verifications");
        getDocs(verificationRef).then(function (snapshot) {
            var results = [];
            snapshot.forEach(function (doc) {
                results.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            displayVerificationResults(results);
        }).catch(function (e) {
            console.error("Error loading verification results:", e);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

/**
 * Display verification results in UI
 */
function displayVerificationResults(results) {
    var container = document.getElementById('verificationResultsContainer');
    if (!container) {
        console.warn("Verification results container not found");
        return;
    }

    if (!results || results.length === 0) {
        container.innerHTML = '<div class="empty-state">No verification results yet</div>';
        return;
    }

    var html = '<div class="verification-results-list">';

    results.forEach(function (result) {
        var statusClass = result.status === 'completed' ? 'completed' : result.status === 'rejected' ? 'rejected' : 'pending';
        var statusIcon = result.status === 'completed' ? '✅' : result.status === 'rejected' ? '❌' : '⏳';

        html += '<div class="verification-result-card ' + statusClass + '">';
        html += '<div class="verification-result-header">';
        html += '<div class="verification-result-title">';
        html += '<span class="verification-result-icon">' + statusIcon + '</span>';
        html += '<span class="verification-result-name">' + escapeHtml(result.userName) + '</span>';
        html += '</div>';
        html += '<div class="verification-result-status">' + result.status.replace(/_/g, ' ').toUpperCase() + '</div>';
        html += '</div>';

        html += '<div class="verification-result-details">';
        html += '<div class="verification-result-topic">Topic: ' + escapeHtml(result.topic) + '</div>';
        html += '<div class="verification-result-score">' + result.score + ' / ' + result.totalQuestions + ' (' + result.percentage + '%)</div>';
        html += '<div class="verification-result-time">' + new Date(result.timestamp).toLocaleString() + '</div>';
        html += '</div>';

        // Approvals and rejections
        html += '<div class="verification-result-votes">';
        if (result.approvals && result.approvals.length > 0) {
            html += '<div class="verification-approvals">✅ ' + result.approvals.length + ' Approved</div>';
        }
        if (result.rejections && result.rejections.length > 0) {
            html += '<div class="verification-rejections">❌ ' + result.rejections.length + ' Rejected</div>';
        }
        html += '</div>';

        // Approval buttons (if pending and not own result)
        if (result.status === 'pending_peer_approval' && result.userId !== verificationUser.uid) {
            var hasApproved = result.approvals && result.approvals.includes(verificationUser.uid);
            var hasRejected = result.rejections && result.rejections.includes(verificationUser.uid);

            html += '<div class="verification-result-actions">';
            if (!hasApproved && !hasRejected) {
                html += '<button class="btn-small btn-success" onclick="approveVerification(\'' + result.id + '\')">';
                html += '<i class="fa-solid fa-thumbs-up"></i> Approve';
                html += '</button>';
                html += '<button class="btn-small btn-danger" onclick="rejectVerification(\'' + result.id + '\')">';
                html += '<i class="fa-solid fa-thumbs-down"></i> Reject';
                html += '</button>';
            } else if (hasApproved) {
                html += '<div class="verification-voted">✅ You approved</div>';
            } else if (hasRejected) {
                html += '<div class="verification-voted">❌ You rejected</div>';
            }
            html += '</div>';
        }

        html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Approve verification
 */
function approveVerification(verificationId) {
    if (!verificationDB || !verificationGroupId) {
        console.error("Firebase not configured");
        return;
    }

    try {
        var modules = window.firebaseModules;
        var doc = modules.doc;
        var updateDoc = modules.updateDoc;
        var arrayUnion = modules.arrayUnion;

        var verificationRef = doc(verificationDB, "groups", verificationGroupId, "task_verifications", verificationId);

        // Get current data
        var getDoc = modules.getDoc;
        getDoc(verificationRef).then(function (docSnap) {
            if (!docSnap.exists()) {
                alert('Verification not found');
                return;
            }

            var data = docSnap.data();
            var approvals = data.approvals || [];
            var rejections = data.rejections || [];

            // Check if already voted
            if (approvals.includes(verificationUser.uid)) {
                alert('You already approved this');
                return;
            }

            if (rejections.includes(verificationUser.uid)) {
                alert('You already rejected this. Cannot change vote.');
                return;
            }

            // Add approval
            approvals.push(verificationUser.uid);

            // Check if should mark as completed (2+ approvals)
            var newStatus = approvals.length >= 2 ? 'completed' : 'pending_peer_approval';

            updateDoc(verificationRef, {
                approvals: approvals,
                status: newStatus
            }).then(function () {
                console.log("Verification approved");
                toast('Verification approved!', 'success');
                loadVerificationResults();
            }).catch(function (e) {
                console.error("Error approving:", e);
                alert('Error approving: ' + e.message);
            });
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

/**
 * Reject verification
 */
function rejectVerification(verificationId) {
    if (!verificationDB || !verificationGroupId) {
        console.error("Firebase not configured");
        return;
    }

    try {
        var modules = window.firebaseModules;
        var doc = modules.doc;
        var updateDoc = modules.updateDoc;
        var getDoc = modules.getDoc;

        var verificationRef = doc(verificationDB, "groups", verificationGroupId, "task_verifications", verificationId);

        // Get current data
        getDoc(verificationRef).then(function (docSnap) {
            if (!docSnap.exists()) {
                alert('Verification not found');
                return;
            }

            var data = docSnap.data();
            var approvals = data.approvals || [];
            var rejections = data.rejections || [];

            // Check if already voted
            if (rejections.includes(verificationUser.uid)) {
                alert('You already rejected this');
                return;
            }

            if (approvals.includes(verificationUser.uid)) {
                alert('You already approved this. Cannot change vote.');
                return;
            }

            // Add rejection
            rejections.push(verificationUser.uid);

            updateDoc(verificationRef, {
                rejections: rejections,
                status: 'rejected'
            }).then(function () {
                console.log("Verification rejected");
                toast('Verification rejected', 'info');
                loadVerificationResults();
            }).catch(function (e) {
                console.error("Error rejecting:", e);
                alert('Error rejecting: ' + e.message);
            });
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

/**
 * Helper: Decode HTML entities
 */
function decodeHtmlEntity(html) {
    var txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

/**
 * Helper: Shuffle array
 */
function shuffleArray(array) {
    var arr = array.slice();
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper: Escape HTML attribute
 */
function escapeHtmlAttr(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Export to window
window.initQuizTaskVerification = initQuizTaskVerification;
window.openTaskVerificationModal = openTaskVerificationModal;
window.closeTaskVerificationModal = closeTaskVerificationModal;
window.startTaskVerificationQuiz = startTaskVerificationQuiz;
window.selectVerificationAnswer = selectVerificationAnswer;
window.submitVerificationQuiz = submitVerificationQuiz;
window.retakeVerificationQuiz = retakeVerificationQuiz;
window.saveVerificationResult = saveVerificationResult;
window.loadVerificationResults = loadVerificationResults;
window.approveVerification = approveVerification;
window.rejectVerification = rejectVerification;

console.log("✅ quiz-task-verification.js loaded successfully");

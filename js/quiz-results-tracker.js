// Quiz Results Tracker - Save and display quiz results
console.log("Loading quiz-results-tracker.js...");

let quizResults = [];

/**
 * Save quiz result to Firestore - Simplified version
 */
async function saveQuizResult(topic, difficulty, totalQuestions, correctAnswers) {
    try {
        console.log("🎯 SAVE QUIZ RESULT CALLED");
        console.log("Parameters:", { topic, difficulty, totalQuestions, correctAnswers });

        // Validate inputs
        if (!topic || topic === undefined || topic === null) {
            console.error("❌ Topic is invalid:", topic);
            return;
        }

        if (!window.currentUser || !window.currentUser.uid) {
            console.error("❌ User not authenticated");
            console.error("window.currentUser:", window.currentUser);
            return;
        }

        if (!window.db) {
            console.error("❌ Firestore DB not available");
            return;
        }

        if (!window.firebaseModules) {
            console.error("❌ Firebase modules not available");
            return;
        }

        const { collection, addDoc } = window.firebaseModules;

        // Prepare data
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        const quizData = {
            userId: window.currentUser.uid,
            userName: window.currentUser.displayName || "User",
            topic: String(topic).trim(),
            difficulty: String(difficulty).trim(),
            totalQuestions: Number(totalQuestions),
            correctAnswers: Number(correctAnswers),
            percentage: percentage,
            timestamp: new Date().toISOString(),
            createdAt: new Date()
        };

        console.log("📝 Data to save:", quizData);

        // Save to Firestore
        const quizResultsRef = collection(window.db, 'quiz_results');
        console.log("📤 Saving to Firestore...");

        const docRef = await addDoc(quizResultsRef, quizData);
        console.log("✅ SAVED! Document ID:", docRef.id);

        // Reload and display
        console.log("🔄 Reloading results...");
        await loadQuizResults();
        displayQuizResultsInTab();

        console.log("✅ COMPLETE - Quiz result saved and displayed");
        return { id: docRef.id, ...quizData };

    } catch (error) {
        console.error("❌ SAVE FAILED:", error);
        console.error("Error details:", {
            name: error.name,
            message: error.message,
            code: error.code
        });
        throw error;
    }
}

/**
 * Load all quiz results for current user
 */
async function loadQuizResults() {
    try {
        console.log("📥 LOADING QUIZ RESULTS");

        if (!window.currentUser?.uid) {
            console.error("❌ User not authenticated");
            quizResults = [];
            return [];
        }

        if (!window.db) {
            console.error("❌ Firestore not available");
            quizResults = [];
            return [];
        }

        const { collection, query, where, getDocs } = window.firebaseModules;

        const quizResultsRef = collection(window.db, 'quiz_results');
        // Simple query without orderBy to avoid index requirement
        const q = query(
            quizResultsRef,
            where('userId', '==', window.currentUser.uid)
        );

        console.log("🔍 Querying Firestore...");
        const snapshot = await getDocs(q);
        console.log("📊 Found", snapshot.size, "results");

        quizResults = [];
        snapshot.forEach(doc => {
            quizResults.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort by createdAt in JavaScript instead of Firestore
        quizResults.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.timestamp);
            const dateB = new Date(b.createdAt || b.timestamp);
            return dateB - dateA; // Descending order
        });

        console.log("✅ Loaded results:", quizResults);
        return quizResults;

    } catch (error) {
        console.error("❌ LOAD FAILED:", error);
        console.error("Error:", error.message);
        quizResults = [];
        return [];
    }
}

/**
 * Display quiz results in the Results tab
 */
function displayQuizResultsInTab() {
    const container = document.getElementById('quizResultsContainer');
    if (!container) {
        console.error("❌ Container not found");
        return;
    }

    console.log("🎨 DISPLAYING RESULTS - Count:", quizResults.length);

    if (!quizResults || quizResults.length === 0) {
        console.log("📭 No results to display");
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-inbox" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                <p>No quiz results yet. Take a quiz to see your results here!</p>
            </div>
        `;
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';

    quizResults.forEach((result) => {
        const date = new Date(result.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        html += `
            <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <h4 style="margin: 0; color: var(--text);">${escapeHtml(result.topic)}</h4>
                        <span style="background: var(--accent); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${result.difficulty.toUpperCase()}</span>
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-muted);">
                        <span><i class="fa-solid fa-question"></i> ${result.totalQuestions} questions</span>
                        <span><i class="fa-solid fa-calendar"></i> ${dateStr}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="text-align: right;">
                        <div style="font-size: 24px; font-weight: 700; color: var(--accent);">${result.percentage}%</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${result.correctAnswers}/${result.totalQuestions}</div>
                    </div>
                    <button onclick="window.deleteQuizResult('${result.id}')" title="Delete result" style="padding: 8px 12px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
    console.log("✅ Results displayed");
}

/**
 * Delete quiz result
 */
async function deleteQuizResult(resultId) {
    if (!confirm('Are you sure you want to delete this result?')) {
        return;
    }

    try {
        const { doc, deleteDoc } = window.firebaseModules;
        const docRef = doc(window.db, 'quiz_results', resultId);
        await deleteDoc(docRef);
        quizResults = quizResults.filter(r => r.id !== resultId);
        displayQuizResultsInTab();
        console.log("✅ Result deleted:", resultId);
    } catch (error) {
        console.error("❌ Error deleting result:", error);
    }
}

/**
 * Initialize results tracker with real-time listener
 */
function initQuizResultsTracker() {
    console.log("=== INITIALIZING QUIZ RESULTS TRACKER ===");
    console.log("Current state:");
    console.log("  window.currentUser:", window.currentUser ? "Available" : "NOT AVAILABLE");
    console.log("  window.db:", window.db ? "Available" : "NOT AVAILABLE");
    console.log("  window.firebaseModules:", window.firebaseModules ? "Available" : "NOT AVAILABLE");

    // Retry with exponential backoff
    let retryCount = 0;
    const maxRetries = 50; // 50 * 200ms = 10 seconds max wait

    const tryInit = () => {
        retryCount++;

        if (!window.currentUser) {
            if (retryCount < maxRetries) {
                console.warn(`⏳ Attempt ${retryCount}/${maxRetries}: User not ready yet, retrying in 200ms...`);
                setTimeout(tryInit, 200);
            } else {
                console.error("❌ User not ready after 10 seconds");
            }
            return;
        }

        if (!window.db) {
            if (retryCount < maxRetries) {
                console.warn(`⏳ Attempt ${retryCount}/${maxRetries}: Firestore not ready yet, retrying in 200ms...`);
                setTimeout(tryInit, 200);
            } else {
                console.error("❌ Firestore not ready after 10 seconds");
            }
            return;
        }

        if (!window.firebaseModules) {
            if (retryCount < maxRetries) {
                console.warn(`⏳ Attempt ${retryCount}/${maxRetries}: Firebase modules not ready yet, retrying in 200ms...`);
                setTimeout(tryInit, 200);
            } else {
                console.error("❌ Firebase modules not ready after 10 seconds");
            }
            return;
        }

        // All systems ready!
        console.log("✅ Firebase ready after", retryCount, "attempts");
        console.log("  User UID:", window.currentUser.uid);
        console.log("  DB:", window.db);

        (async () => {
            try {
                console.log("Loading initial results...");
                await loadQuizResults();
                displayQuizResultsInTab();

                console.log("Setting up real-time listener...");
                setupQuizResultsListener();

                console.log("✅ Quiz results tracker fully initialized");
            } catch (error) {
                console.error("❌ Error during initialization:", error);
            }
        })();
    };

    tryInit();
}

/**
 * Set up real-time listener for quiz results
 */
function setupQuizResultsListener() {
    try {
        if (!window.currentUser || !window.db) {
            console.warn("⚠️ Firebase not ready for listener");
            return;
        }

        const { collection, query, where, onSnapshot } = window.firebaseModules;
        const quizResultsRef = collection(window.db, 'quiz_results');
        // Simple query without orderBy to avoid index requirement
        const q = query(
            quizResultsRef,
            where('userId', '==', window.currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("📡 Real-time update: Quiz results changed");
            quizResults = [];
            snapshot.forEach(doc => {
                quizResults.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort by createdAt in JavaScript instead of Firestore
            quizResults.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.timestamp);
                const dateB = new Date(b.createdAt || b.timestamp);
                return dateB - dateA; // Descending order
            });

            console.log("✅ Updated quiz results:", quizResults.length, "items");
            displayQuizResultsInTab();
        }, (error) => {
            console.error("❌ Error in quiz results listener:", error);
        });

        console.log("✅ Real-time listener set up for quiz results");
        return unsubscribe;
    } catch (error) {
        console.error("❌ Error setting up quiz results listener:", error);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Refresh quiz results (call this after submitting a quiz)
 */
async function refreshQuizResults() {
    console.log("=== REFRESHING QUIZ RESULTS ===");
    try {
        await loadQuizResults();
        displayQuizResultsInTab();
        console.log("✅ Quiz results refreshed");
    } catch (error) {
        console.error("❌ Error refreshing quiz results:", error);
    }
}

// Export functions
window.saveQuizResult = saveQuizResult;
window.loadQuizResults = loadQuizResults;
window.displayQuizResultsInTab = displayQuizResultsInTab;
window.deleteQuizResult = deleteQuizResult;
window.initQuizResultsTracker = initQuizResultsTracker;
window.refreshQuizResults = refreshQuizResults;
window.setupQuizResultsListener = setupQuizResultsListener;

// Test function to verify setup
window.testQuizResultsSetup = function () {
    console.log("=== TESTING QUIZ RESULTS SETUP ===");
    console.log("✓ window.currentUser:", window.currentUser ? "Available" : "NOT AVAILABLE");
    console.log("✓ window.db:", window.db ? "Available" : "NOT AVAILABLE");
    console.log("✓ window.firebaseModules:", window.firebaseModules ? "Available" : "NOT AVAILABLE");
    console.log("✓ window.saveQuizResult:", typeof window.saveQuizResult);
    console.log("✓ window.loadQuizResults:", typeof window.loadQuizResults);
    console.log("✓ window.displayQuizResultsInTab:", typeof window.displayQuizResultsInTab);

    if (window.currentUser) {
        console.log("  User UID:", window.currentUser.uid);
        console.log("  User Name:", window.currentUser.displayName);
    }

    if (window.firebaseModules) {
        console.log("  collection:", typeof window.firebaseModules.collection);
        console.log("  addDoc:", typeof window.firebaseModules.addDoc);
        console.log("  getDocs:", typeof window.firebaseModules.getDocs);
        console.log("  query:", typeof window.firebaseModules.query);
        console.log("  where:", typeof window.firebaseModules.where);
        console.log("  orderBy:", typeof window.firebaseModules.orderBy);
    }

    console.log("=== TEST COMPLETE ===");
};

console.log("✅ quiz-results-tracker.js loaded");

// Manual test function to save a test quiz result
window.testSaveQuizResult = async function () {
    console.log("=== MANUAL TEST: SAVING QUIZ RESULT ===");
    try {
        const result = await window.saveQuizResult("Test Topic", "medium", 10, 8);
        console.log("✅ Test result saved:", result);
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
};

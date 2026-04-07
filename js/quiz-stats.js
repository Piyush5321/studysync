// Quiz Stats Visualization
console.log("Loading quiz-stats.js...");

let quizStatsChart = null;

/**
 * Load and display quiz stats
 */
async function loadQuizStats() {
    try {
        console.log("📊 Loading quiz stats...");

        if (!window.currentUser?.uid) {
            console.error("❌ User not authenticated");
            return;
        }

        if (!window.db) {
            console.error("❌ Firestore not available");
            return;
        }

        const { collection, query, where, getDocs } = window.firebaseModules;

        // Fetch all quiz results for current user
        const quizResultsRef = collection(window.db, 'quiz_results');
        const q = query(
            quizResultsRef,
            where('userId', '==', window.currentUser.uid)
        );

        const snapshot = await getDocs(q);
        const quizzes = [];

        snapshot.forEach(doc => {
            quizzes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort by date
        quizzes.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.timestamp);
            const dateB = new Date(b.createdAt || b.timestamp);
            return dateA - dateB; // Ascending order for line graph
        });

        console.log("✅ Loaded", quizzes.length, "quiz results");

        if (quizzes.length === 0) {
            displayNoQuizStats();
            return;
        }

        // Prepare data for chart
        const labels = quizzes.map((q, index) => {
            const date = new Date(q.createdAt || q.timestamp);
            return `${q.topic} #${index + 1}`;
        });

        const percentages = quizzes.map(q => q.percentage);
        const topics = quizzes.map(q => q.topic);

        // Display stats
        displayQuizStats(labels, percentages, topics, quizzes);

    } catch (error) {
        console.error("❌ Error loading quiz stats:", error);
    }
}

/**
 * Display quiz stats chart
 */
function displayQuizStats(labels, percentages, topics, quizzes) {
    const ctx = document.getElementById('quizStatsChart');
    if (!ctx) {
        console.error("❌ Chart canvas not found");
        return;
    }

    // Destroy existing chart if it exists
    if (quizStatsChart) {
        quizStatsChart.destroy();
    }

    // Create color array based on performance
    const colors = percentages.map(pct => {
        if (pct >= 80) return '#4CAF50'; // Green - Excellent
        if (pct >= 60) return '#2196F3'; // Blue - Good
        if (pct >= 40) return '#FF9800'; // Orange - Fair
        return '#F44336'; // Red - Poor
    });

    // Create line chart
    quizStatsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Quiz Score (%)',
                    data: percentages,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: colors,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: 'var(--text)',
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#4CAF50',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        afterLabel: function (context) {
                            const index = context.dataIndex;
                            const quiz = quizzes[index];
                            return `Topic: ${quiz.topic}\nDifficulty: ${quiz.difficulty}\nScore: ${quiz.correctAnswers}/${quiz.totalQuestions}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: 'var(--text-muted)',
                        callback: function (value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'var(--border)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: 'var(--text-muted)',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            }
        }
    });

    // Display stats info
    displayQuizStatsInfo(quizzes);
}

/**
 * Display quiz stats information
 */
function displayQuizStatsInfo(quizzes) {
    const infoDiv = document.getElementById('quizStatsInfo');
    if (!infoDiv) return;

    const totalQuizzes = quizzes.length;
    const avgScore = Math.round(quizzes.reduce((sum, q) => sum + q.percentage, 0) / totalQuizzes);
    const bestScore = Math.max(...quizzes.map(q => q.percentage));
    const worstScore = Math.min(...quizzes.map(q => q.percentage));

    // Count by topic
    const topicCounts = {};
    quizzes.forEach(q => {
        topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    });

    // Count by difficulty
    const difficultyCounts = {};
    quizzes.forEach(q => {
        difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;
    });

    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
            <div style="background: var(--surface); padding: 12px; border-radius: 6px; border-left: 3px solid #4CAF50;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Total Quizzes</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--accent);">${totalQuizzes}</div>
            </div>
            <div style="background: var(--surface); padding: 12px; border-radius: 6px; border-left: 3px solid #2196F3;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Average Score</div>
                <div style="font-size: 20px; font-weight: 700; color: var(--accent);">${avgScore}%</div>
            </div>
            <div style="background: var(--surface); padding: 12px; border-radius: 6px; border-left: 3px solid #4CAF50;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Best Score</div>
                <div style="font-size: 20px; font-weight: 700; color: #4CAF50;">${bestScore}%</div>
            </div>
            <div style="background: var(--surface); padding: 12px; border-radius: 6px; border-left: 3px solid #F44336;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Lowest Score</div>
                <div style="font-size: 20px; font-weight: 700; color: #F44336;">${worstScore}%</div>
            </div>
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
                <strong>Topics:</strong> ${Object.entries(topicCounts).map(([topic, count]) => `${topic} (${count})`).join(', ')}
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">
                <strong>Difficulty:</strong> ${Object.entries(difficultyCounts).map(([diff, count]) => `${diff} (${count})`).join(', ')}
            </div>
        </div>
    `;

    infoDiv.innerHTML = html;
}

/**
 * Display message when no quiz stats available
 */
function displayNoQuizStats() {
    const ctx = document.getElementById('quizStatsChart');
    if (ctx) {
        const parent = ctx.parentElement;
        parent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-chart-line" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                <p>No quiz data yet. Take some quizzes to see your performance stats!</p>
            </div>
        `;
    }

    const infoDiv = document.getElementById('quizStatsInfo');
    if (infoDiv) {
        infoDiv.innerHTML = '';
    }
}

/**
 * Initialize quiz stats when page loads
 */
function initQuizStats() {
    console.log("Initializing quiz stats...");

    // Wait for Firebase to be ready
    let retryCount = 0;
    const maxRetries = 50;

    const tryInit = () => {
        retryCount++;

        if (!window.currentUser || !window.db) {
            if (retryCount < maxRetries) {
                setTimeout(tryInit, 200);
            }
            return;
        }

        loadQuizStats();
    };

    tryInit();
}

// Export functions
window.loadQuizStats = loadQuizStats;
window.initQuizStats = initQuizStats;

console.log("✅ quiz-stats.js loaded");

// Quiz Generator - Using Open Trivia Database API
console.log("Loading quiz-generator.js...");

var currentQuiz = null;
var currentQuestionIndex = 0;
var quizScore = 0;
var userAnswers = [];
var quizStarted = false;

function initQuizGenerator() {
    console.log("Quiz Generator initialized");
}

function openQuizModal() {
    // Reset quiz state when opening modal
    currentQuestionIndex = 0;
    quizScore = 0;
    userAnswers = [];
    quizStarted = false;
    currentQuiz = null;

    // Clear the quiz container
    var quizContainer = document.getElementById('quizContainer');
    if (quizContainer) {
        quizContainer.innerHTML = '';
    }

    // Show the creation form
    var creationForm = document.getElementById('quizCreationForm');
    if (creationForm) {
        creationForm.style.display = 'block';
    }

    // Hide loading
    var loadingDiv = document.getElementById('quizLoading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }

    // Hide next button
    var nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) {
        nextBtn.style.display = 'none';
    }

    // Reset form fields
    document.getElementById('quizTopic').value = '';
    document.getElementById('quizNumQuestions').value = '10';
    document.getElementById('quizDifficulty').value = 'medium';

    // Open the modal
    var modal = document.getElementById('quizModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeQuizModal() {
    var modal = document.getElementById('quizModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function startQuizCreation() {
    var topic = document.getElementById('quizTopic').value.trim();
    var numQuestions = document.getElementById('quizNumQuestions').value;
    var difficulty = document.getElementById('quizDifficulty').value;

    if (!topic) {
        alert('Please enter a topic');
        return;
    }

    if (!numQuestions || numQuestions < 1 || numQuestions > 50) {
        alert('Please enter number of questions (1-50)');
        return;
    }

    // Show loading
    var creationForm = document.getElementById('quizCreationForm');
    if (creationForm) {
        creationForm.style.display = 'none';
    }

    var loadingDiv = document.getElementById('quizLoading');
    if (loadingDiv) {
        loadingDiv.style.display = 'flex';
    }

    // Fetch quiz questions from Open Trivia Database
    fetchQuizQuestions(topic, numQuestions, difficulty);
}

function fetchQuizQuestions(topic, numQuestions, difficulty) {
    // Use Cohere API to generate quiz questions
    if (!window.generateQuizWithCohere) {
        alert('Cohere API not loaded. Please refresh the page.');
        return;
    }

    window.generateQuizWithCohere(topic, difficulty, numQuestions)
        .then(function (questions) {
            // Shuffle answers for each question
            var processedQuestions = questions.map(function (q) {
                var allAnswers = q.options.slice();
                allAnswers = shuffleArray(allAnswers);

                return {
                    question: q.question,
                    answers: allAnswers,
                    correctAnswer: q.correctAnswer,
                    difficulty: difficulty,
                    category: topic
                };
            });

            currentQuiz = {
                topic: topic,
                difficulty: difficulty,
                totalQuestions: processedQuestions.length,
                questions: processedQuestions
            };

            currentQuestionIndex = 0;
            quizScore = 0;
            userAnswers = [];
            quizStarted = true;

            displayQuiz();
        })
        .catch(function (error) {
            console.error('Quiz generation error:', error);
            var loadingDiv = document.getElementById('quizLoading');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            var creationForm = document.getElementById('quizCreationForm');
            if (creationForm) {
                creationForm.style.display = 'block';
            }
            alert('Error generating quiz: ' + error.message + '. Please try again.');
        });
}

function displayQuiz() {
    var loadingDiv = document.getElementById('quizLoading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }

    var creationForm = document.getElementById('quizCreationForm');
    if (creationForm) {
        creationForm.style.display = 'none';
    }

    var quizContainer = document.getElementById('quizContainer');
    if (!quizContainer) return;

    if (currentQuestionIndex >= currentQuiz.questions.length) {
        displayQuizResults();
        return;
    }

    var question = currentQuiz.questions[currentQuestionIndex];
    var progress = currentQuestionIndex + 1;
    var total = currentQuiz.questions.length;

    var html = '<div class="quiz-header">';
    html += '<div class="quiz-progress">';
    html += '<div class="quiz-progress-bar">';
    html += '<div class="quiz-progress-fill" style="width: ' + (progress / total * 100) + '%"></div>';
    html += '</div>';
    html += '<span class="quiz-progress-text">' + progress + ' of ' + total + '</span>';
    html += '</div>';
    html += '<div class="quiz-score">Score: ' + quizScore + '/' + total + '</div>';
    html += '</div>';

    html += '<div class="quiz-question-container">';
    html += '<h3 class="quiz-question">' + escapeHtml(question.question) + '</h3>';
    html += '<div class="quiz-difficulty">Difficulty: <span class="difficulty-' + question.difficulty + '">' + question.difficulty.toUpperCase() + '</span></div>';
    html += '</div>';

    html += '<div class="quiz-answers">';
    for (var i = 0; i < question.answers.length; i++) {
        var answer = question.answers[i];
        var isCorrect = answer === question.correctAnswer;
        html += '<button class="quiz-answer-btn" data-answer-index="' + i + '" onclick="window.selectAnswerByIndex(' + i + ')">';
        html += '<span class="quiz-answer-letter">' + String.fromCharCode(65 + i) + '</span>';
        html += '<span class="quiz-answer-text">' + escapeHtml(answer) + '</span>';
        html += '</button>';
    }
    html += '</div>';

    quizContainer.innerHTML = html;
}

function selectAnswerByIndex(answerIndex) {
    var question = currentQuiz.questions[currentQuestionIndex];
    var answer = question.answers[answerIndex];
    var isCorrect = answer === question.correctAnswer;

    userAnswers.push({
        question: question.question,
        userAnswer: answer,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect
    });

    if (isCorrect) {
        quizScore++;
    }

    // Disable all buttons
    var buttons = document.querySelectorAll('.quiz-answer-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
    }

    // Highlight correct and incorrect answers
    for (var i = 0; i < buttons.length; i++) {
        var btnAnswer = question.answers[i];
        if (btnAnswer === question.correctAnswer) {
            buttons[i].classList.add('correct');
        }
        if (i === answerIndex && !isCorrect) {
            buttons[i].classList.add('incorrect');
        }
    }

    // Show next button and update text based on whether it's the last question
    var nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) {
        nextBtn.style.display = 'block';

        var btn = nextBtn.querySelector('button');
        if (btn) {
            // Check if this is the last question
            if (currentQuestionIndex >= currentQuiz.questions.length - 1) {
                // Last question - show Submit button
                btn.innerHTML = '<span>Submit Quiz</span><i class="fa-solid fa-check"></i>';
            } else {
                // Not last question - show Next Question button
                btn.innerHTML = '<span>Next Question</span><i class="fa-solid fa-arrow-right"></i>';
            }
        }
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= currentQuiz.questions.length) {
        displayQuizResults();
    } else {
        displayQuiz();
    }
}

function displayQuizResults() {
    var percentage = Math.round((quizScore / currentQuiz.totalQuestions) * 100);
    var grade = percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'F';

    console.log("=== QUIZ COMPLETED ===");
    console.log("Topic:", currentQuiz.topic);
    console.log("Difficulty:", currentQuiz.difficulty);
    console.log("Total Questions:", currentQuiz.totalQuestions);
    console.log("Correct Answers:", quizScore);
    console.log("Percentage:", percentage);

    var html = '<div class="quiz-results-page">';
    html += '<div class="quiz-results-header">';
    html += '<h2>Quiz Complete!</h2>';
    html += '<div class="quiz-final-score">' + quizScore + '/' + currentQuiz.totalQuestions + '</div>';
    html += '<div class="quiz-percentage">' + percentage + '%</div>';
    html += '<div class="quiz-grade">Grade: <span class="grade-' + grade + '">' + grade + '</span></div>';
    html += '</div>';

    html += '<div class="quiz-results-details">';
    html += '<p>Topic: <strong>' + escapeHtml(currentQuiz.topic) + '</strong></p>';
    html += '<p>Difficulty: <strong>' + currentQuiz.difficulty.toUpperCase() + '</strong></p>';
    html += '<p>Questions: <strong>' + currentQuiz.totalQuestions + '</strong></p>';
    html += '</div>';

    html += '<div class="quiz-review">';
    html += '<h3>Review Your Answers</h3>';
    for (var i = 0; i < userAnswers.length; i++) {
        var answer = userAnswers[i];
        var statusClass = answer.isCorrect ? 'correct' : 'incorrect';
        var statusText = answer.isCorrect ? '✓ Correct' : '✗ Incorrect';

        html += '<div class="quiz-review-item ' + statusClass + '">';
        html += '<div class="review-question">Q' + (i + 1) + ': ' + escapeHtml(answer.question) + '</div>';
        html += '<div class="review-your-answer">Your answer: ' + escapeHtml(answer.userAnswer) + ' <span class="' + statusClass + '">' + statusText + '</span></div>';
        if (!answer.isCorrect) {
            html += '<div class="review-correct-answer">Correct answer: ' + escapeHtml(answer.correctAnswer) + '</div>';
        }
        html += '</div>';
    }
    html += '</div>';

    html += '<div class="quiz-actions">';
    html += '<button class="btn-accent" onclick="retakeQuiz()"><i class="fa-solid fa-rotate-right"></i> Retake Quiz</button>';
    html += '<button class="btn-primary" onclick="clearQuizResults()"><i class="fa-solid fa-xmark"></i> Close Results</button>';
    html += '</div>';

    html += '</div>';

    // Close modal first
    closeQuizModal();

    // Update results section
    var resultsSection = document.getElementById('quizResultsSection');
    if (resultsSection) {
        resultsSection.innerHTML = html;
        resultsSection.style.display = 'block';
    }

    // Save result to Firestore
    console.log("Attempting to save quiz result...");

    // Try using window.saveQuizResult if available
    if (window.saveQuizResult) {
        console.log("Using window.saveQuizResult");
        window.saveQuizResult(currentQuiz.topic, currentQuiz.difficulty, currentQuiz.totalQuestions, quizScore)
            .then(function (result) {
                console.log("✅ Quiz result saved successfully:", result);
            })
            .catch(function (error) {
                console.error("❌ Failed to save quiz result:", error);
            });
    } else {
        console.warn("⚠️ window.saveQuizResult not available, trying direct Firestore save...");
        // Fallback: Try direct Firestore save
        saveQuizResultDirect(currentQuiz.topic, currentQuiz.difficulty, currentQuiz.totalQuestions, quizScore);
    }

    // Switch to Results tab
    setTimeout(function () {
        if (window.switchQuizTab) {
            window.switchQuizTab('results');
        }
    }, 50);
}

function retakeQuiz() {
    currentQuestionIndex = 0;
    quizScore = 0;
    userAnswers = [];
    quizStarted = false;

    var creationForm = document.getElementById('quizCreationForm');
    if (creationForm) {
        creationForm.style.display = 'block';
    }

    var quizContainer = document.getElementById('quizContainer');
    if (quizContainer) {
        quizContainer.innerHTML = '';
    }

    // Reset form
    document.getElementById('quizTopic').value = '';
    document.getElementById('quizNumQuestions').value = '10';
    document.getElementById('quizDifficulty').value = 'medium';

    // Clear results section
    var resultsSection = document.getElementById('quizResultsSection');
    if (resultsSection) {
        resultsSection.innerHTML = '';
        resultsSection.style.display = 'none';
    }

    // Open modal again
    openQuizModal();
}

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

function decodeHtml(html) {
    var txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeHtmlAttr(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function clearQuizResults() {
    var resultsSection = document.getElementById('quizResultsSection');
    if (resultsSection) {
        resultsSection.innerHTML = '';
        resultsSection.style.display = 'none';
    }

    // Reset quiz state
    currentQuestionIndex = 0;
    quizScore = 0;
    userAnswers = [];
    quizStarted = false;
    currentQuiz = null;
}

// Export to window
window.initQuizGenerator = initQuizGenerator;
window.openQuizModal = openQuizModal;
window.closeQuizModal = closeQuizModal;
window.startQuizCreation = startQuizCreation;
window.selectAnswerByIndex = selectAnswerByIndex;
window.nextQuestion = nextQuestion;
window.retakeQuiz = retakeQuiz;
window.clearQuizResults = clearQuizResults;

/**
 * Direct Firestore save - fallback if window.saveQuizResult not available
 */
async function saveQuizResultDirect(topic, difficulty, totalQuestions, correctAnswers) {
    try {
        console.log("🔴 DIRECT FIRESTORE SAVE - Fallback method");

        if (!window.currentUser || !window.currentUser.uid) {
            console.error("❌ User not authenticated");
            return;
        }

        if (!window.db) {
            console.error("❌ Firestore not available");
            return;
        }

        if (!window.firebaseModules) {
            console.error("❌ Firebase modules not available");
            return;
        }

        const { collection, addDoc } = window.firebaseModules;
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

        console.log("📝 Saving directly to Firestore:", quizData);
        const quizResultsRef = collection(window.db, 'quiz_results');
        const docRef = await addDoc(quizResultsRef, quizData);
        console.log("✅ DIRECT SAVE SUCCESS! Document ID:", docRef.id);

        // Reload results if function available
        if (window.loadQuizResults && window.displayQuizResultsInTab) {
            await window.loadQuizResults();
            window.displayQuizResultsInTab();
        }

    } catch (error) {
        console.error("❌ DIRECT SAVE FAILED:", error);
    }
}

window.saveQuizResultDirect = saveQuizResultDirect;

console.log("✅ quiz-generator.js loaded successfully");

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
    // Map difficulty to API parameter
    var difficultyMap = {
        'easy': 'easy',
        'medium': 'medium',
        'hard': 'hard'
    };

    var diffParam = difficultyMap[difficulty] || '';

    // Build API URL
    var url = 'https://opentdb.com/api.php?amount=' + numQuestions + '&type=multiple';

    if (diffParam) {
        url += '&difficulty=' + diffParam;
    }

    // Add category based on topic (optional - using general knowledge if not found)
    var categoryMap = {
        'science': 17,
        'history': 23,
        'geography': 22,
        'sports': 21,
        'entertainment': 11,
        'general': 9,
        'math': 19,
        'technology': 18,
        'literature': 26,
        'music': 12,
        'movies': 11,
        'animals': 27,
        'vehicles': 28,
        'politics': 24
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
                throw new Error('No questions found for this topic');
            }

            // Process questions
            var questions = data.results.map(function (q) {
                var allAnswers = [q.correct_answer].concat(q.incorrect_answers);
                // Shuffle answers
                allAnswers = shuffleArray(allAnswers);

                return {
                    question: decodeHtml(q.question),
                    answers: allAnswers.map(function (a) { return decodeHtml(a); }),
                    correctAnswer: decodeHtml(q.correct_answer),
                    difficulty: q.difficulty,
                    category: q.category
                };
            });

            currentQuiz = {
                topic: topic,
                difficulty: difficulty,
                totalQuestions: questions.length,
                questions: questions
            };

            currentQuestionIndex = 0;
            quizScore = 0;
            userAnswers = [];
            quizStarted = true;

            displayQuiz();
        })
        .catch(function (error) {
            console.error('Quiz fetch error:', error);
            var loadingDiv = document.getElementById('quizLoading');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            var creationForm = document.getElementById('quizCreationForm');
            if (creationForm) {
                creationForm.style.display = 'block';
            }
            alert('Error: ' + error.message + '. Try a different topic or difficulty level.');
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
        html += '<button class="quiz-answer-btn" onclick="selectAnswer(\'' + escapeHtmlAttr(answer) + '\', ' + isCorrect + ')">';
        html += '<span class="quiz-answer-letter">' + String.fromCharCode(65 + i) + '</span>';
        html += '<span class="quiz-answer-text">' + escapeHtml(answer) + '</span>';
        html += '</button>';
    }
    html += '</div>';

    quizContainer.innerHTML = html;
}

function selectAnswer(answer, isCorrect) {
    var question = currentQuiz.questions[currentQuestionIndex];

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

    // Highlight correct answer
    for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].textContent.includes(question.correctAnswer)) {
            buttons[i].classList.add('correct');
        }
        if (buttons[i].textContent.includes(answer) && !isCorrect) {
            buttons[i].classList.add('incorrect');
        }
    }

    // Show next button
    var nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) {
        nextBtn.style.display = 'block';
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    displayQuiz();
}

function displayQuizResults() {
    // Close modal and show results in results section
    closeQuizModal();

    var resultsSection = document.getElementById('quizResultsSection');
    if (!resultsSection) return;

    var percentage = Math.round((quizScore / currentQuiz.totalQuestions) * 100);
    var grade = percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'F';

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

    resultsSection.innerHTML = html;
    resultsSection.style.display = 'block';
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
window.selectAnswer = selectAnswer;
window.nextQuestion = nextQuestion;
window.retakeQuiz = retakeQuiz;
window.clearQuizResults = clearQuizResults;

console.log("✅ quiz-generator.js loaded successfully");

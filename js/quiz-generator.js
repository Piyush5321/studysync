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

    // Comprehensive category map for Open Trivia Database
    var categoryMap = {
        // Original categories
        'science': 17,
        'history': 23,
        'geography': 22,
        'sports': 21,
        'entertainment': 11,
        'general': 9,
        'general knowledge': 9,
        'math': 19,
        'mathematics': 19,
        'technology': 18,
        'literature': 26,
        'music': 12,
        'movies': 11,
        'film': 11,
        'animals': 27,
        'vehicles': 28,
        'politics': 24,

        // Additional categories
        'biology': 17,
        'chemistry': 17,
        'physics': 17,
        'nature': 17,
        'earth': 22,
        'world': 22,
        'countries': 22,
        'cities': 22,
        'art': 25,
        'mythology': 20,
        'mythology & legends': 20,
        'legends': 20,
        'tv': 14,
        'television': 14,
        'board games': 16,
        'games': 16,
        'video games': 15,
        'comics': 29,
        'cartoon': 32,
        'anime': 31,
        'manga': 31,
        'books': 26,
        'novels': 26,
        'poetry': 26,
        'celebrities': 26,
        'famous people': 26,
        'royalty': 24,
        'government': 24,
        'law': 24,
        'economics': 24,
        'business': 24,
        'finance': 24,
        'money': 24,
        'stocks': 24,
        'trading': 24,
        'cars': 28,
        'motorcycles': 28,
        'trains': 28,
        'planes': 28,
        'aviation': 28,
        'ships': 28,
        'boats': 28,
        'insects': 27,
        'birds': 27,
        'fish': 27,
        'reptiles': 27,
        'mammals': 27,
        'dinosaurs': 27,
        'pets': 27,
        'dogs': 27,
        'cats': 27,
        'horses': 27,
        'food': 21,
        'cooking': 21,
        'recipes': 21,
        'cuisine': 21,
        'restaurants': 21,
        'drinks': 21,
        'beverages': 21,
        'wine': 21,
        'beer': 21,
        'cocktails': 21,
        'sports & leisure': 21,
        'football': 21,
        'soccer': 21,
        'basketball': 21,
        'baseball': 21,
        'tennis': 21,
        'golf': 21,
        'hockey': 21,
        'boxing': 21,
        'wrestling': 21,
        'martial arts': 21,
        'olympics': 21,
        'fitness': 21,
        'health': 21,
        'medicine': 21,
        'anatomy': 21,
        'psychology': 17,
        'sociology': 17,
        'anthropology': 17,
        'archaeology': 23,
        'ancient': 23,
        'medieval': 23,
        'renaissance': 23,
        'modern': 23,
        'contemporary': 23,
        'war': 23,
        'military': 23,
        'battles': 23,
        'revolution': 23,
        'culture': 23,
        'traditions': 23,
        'religion': 23,
        'philosophy': 23,
        'ethics': 23,
        'logic': 19,
        'algebra': 19,
        'geometry': 19,
        'calculus': 19,
        'statistics': 19,
        'probability': 19,
        'programming': 18,
        'coding': 18,
        'software': 18,
        'hardware': 18,
        'computers': 18,
        'internet': 18,
        'web': 18,
        'apps': 18,
        'mobile': 18,
        'artificial intelligence': 18,
        'ai': 18,
        'machine learning': 18,
        'robotics': 18,
        'engineering': 18,
        'architecture': 18,
        'design': 18,
        'dsa': 18,
        'data structures': 18,
        'data structures and algorithms': 18,
        'algorithms': 18,
        'database': 18,
        'databases': 18,
        'sql': 18,
        'python': 18,
        'java': 18,
        'javascript': 18,
        'c++': 18,
        'cpp': 18,
        'csharp': 18,
        'c#': 18,
        'ruby': 18,
        'php': 18,
        'golang': 18,
        'go': 18,
        'rust': 18,
        'swift': 18,
        'kotlin': 18,
        'typescript': 18,
        'react': 18,
        'angular': 18,
        'vue': 18,
        'nodejs': 18,
        'node.js': 18,
        'express': 18,
        'django': 18,
        'flask': 18,
        'spring': 18,
        'docker': 18,
        'kubernetes': 18,
        'devops': 18,
        'cloud': 18,
        'aws': 18,
        'azure': 18,
        'gcp': 18,
        'git': 18,
        'github': 18,
        'gitlab': 18,
        'linux': 18,
        'unix': 18,
        'windows': 18,
        'macos': 18,
        'cybersecurity': 18,
        'security': 18,
        'hacking': 18,
        'network': 18,
        'networking': 18,
        'fashion': 11,
        'beauty': 11,
        'makeup': 11,
        'photography': 11,
        'theater': 11,
        'dance': 11,
        'comedy': 11,
        'drama': 11,
        'action': 11,
        'horror': 11,
        'thriller': 11,
        'romance': 11,
        'adventure': 11,
        'fantasy': 11,
        'science fiction': 11,
        'scifi': 11,
        'western': 11,
        'animation': 11,
        'documentary': 11,
        'sports movies': 11,
        'musicals': 11,
        'actors': 11,
        'directors': 11,
        'producers': 11,
        'screenwriters': 11,
        'oscar': 11,
        'awards': 11,
        'grammy': 12,
        'billboard': 12,
        'concerts': 12,
        'bands': 12,
        'artists': 12,
        'singers': 12,
        'rock': 12,
        'pop': 12,
        'hip hop': 12,
        'rap': 12,
        'jazz': 12,
        'classical': 12,
        'country': 12,
        'folk': 12,
        'blues': 12,
        'reggae': 12,
        'metal': 12,
        'punk': 12,
        'electronic': 12,
        'dance music': 12,
        'house': 12,
        'techno': 12,
        'indie': 12,
        'alternative': 12,
        'rnb': 12,
        'soul': 12,
        'gospel': 12,
        'opera': 12,
        'musical instruments': 12,
        'guitar': 12,
        'piano': 12,
        'drums': 12,
        'violin': 12,
        'trumpet': 12
    };

    // Try to find exact match first
    var categoryId = categoryMap[topic.toLowerCase()];

    // If no exact match, try fuzzy matching
    if (!categoryId) {
        var topicLower = topic.toLowerCase();
        var bestMatch = null;
        var bestScore = 0;

        for (var key in categoryMap) {
            if (key.includes(topicLower) || topicLower.includes(key)) {
                bestMatch = key;
                bestScore = Math.max(bestScore, 1);
            }
        }

        if (bestMatch) {
            categoryId = categoryMap[bestMatch];
            console.log('Fuzzy matched "' + topic + '" to "' + bestMatch + '"');
        }
    }

    if (categoryId) {
        url += '&category=' + categoryId;
    } else {
        console.log('No category match found for "' + topic + '", using general knowledge');
    }

    fetch(url)
        .then(function (response) {
            if (!response.ok) throw new Error('Failed to fetch quiz');
            return response.json();
        })
        .then(function (data) {
            if (data.response_code !== 0) {
                throw new Error('No questions found for this topic. Try a different topic or difficulty level.');
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
window.selectAnswerByIndex = selectAnswerByIndex;
window.nextQuestion = nextQuestion;
window.retakeQuiz = retakeQuiz;
window.clearQuizResults = clearQuizResults;

console.log("✅ quiz-generator.js loaded successfully");

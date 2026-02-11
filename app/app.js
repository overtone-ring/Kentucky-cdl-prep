// CDL Practice Test Application
(function() {
    'use strict';

    // State
    let state = {
        currentTest: null,
        questions: [],
        currentQuestionIndex: 0,
        answers: [],
        studyMode: false,
        isReviewing: false,
        questionsData: null
    };

    // DOM Elements
    const screens = {
        home: document.getElementById('home-screen'),
        test: document.getElementById('test-screen'),
        results: document.getElementById('results-screen'),
        review: document.getElementById('review-screen')
    };

    // Load questions data
    async function loadQuestions() {
        try {
            const response = await fetch('questions.json');
            state.questionsData = await response.json();
            loadStats();
        } catch (error) {
            console.error('Error loading questions:', error);
            alert('Error loading questions. Please refresh the page.');
        }
    }

    // Utility: Show screen
    function showScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    // Utility: Shuffle array (Fisher-Yates)
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Start a test
    function startTest(testType) {
        const testData = state.questionsData[testType];
        if (!testData) {
            alert('Test data not found');
            return;
        }

        state.currentTest = testType;
        state.questions = shuffleArray(testData.questions);
        state.currentQuestionIndex = 0;
        state.answers = new Array(state.questions.length).fill(null);
        state.studyMode = document.getElementById('study-mode-toggle').checked;
        state.isReviewing = false;

        document.getElementById('test-title').textContent = testData.name;

        showScreen('test');
        renderQuestion();
    }

    // Render current question
    function renderQuestion() {
        const question = state.questions[state.currentQuestionIndex];
        const index = state.currentQuestionIndex;
        const total = state.questions.length;

        // Update progress
        document.getElementById('progress').textContent = `${index + 1}/${total}`;
        document.getElementById('question-number').textContent = `Question ${index + 1}`;
        document.getElementById('progress-fill').style.width = `${((index + 1) / total) * 100}%`;

        // Update question text
        document.getElementById('question-text').textContent = question.question;

        // Render choices
        const choicesContainer = document.getElementById('choices');
        choicesContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];

        question.choices.forEach((choice, i) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = `
                <span class="choice-letter">${letters[i]}</span>
                <span class="choice-text">${choice}</span>
            `;

            const userAnswer = state.answers[index];
            const hasAnswered = userAnswer !== null;

            if (hasAnswered) {
                btn.classList.add('disabled');
                if (i === userAnswer) {
                    btn.classList.add('selected');
                    if (i === question.correct) {
                        btn.classList.add('correct');
                    } else {
                        btn.classList.add('incorrect');
                    }
                }
                if (i === question.correct && userAnswer !== question.correct) {
                    btn.classList.add('correct');
                }
            }

            btn.addEventListener('click', () => selectAnswer(i));
            choicesContainer.appendChild(btn);
        });

        // Show/hide explanation
        const explanationEl = document.getElementById('explanation');
        if (state.answers[index] !== null || state.studyMode) {
            if (state.answers[index] !== null) {
                explanationEl.classList.remove('hidden');
                const isCorrect = state.answers[index] === question.correct;
                explanationEl.innerHTML = `
                    <div class="explanation-title">${isCorrect ? 'Correct!' : 'Incorrect'}</div>
                    <div>${question.explanation}</div>
                `;
            } else {
                explanationEl.classList.add('hidden');
            }
        } else {
            explanationEl.classList.add('hidden');
        }

        // Update navigation buttons
        document.getElementById('prev-btn').disabled = index === 0;

        const nextBtn = document.getElementById('next-btn');
        if (index === total - 1) {
            nextBtn.textContent = 'Finish Test';
            nextBtn.classList.add('finish');
        } else {
            nextBtn.textContent = 'Next';
            nextBtn.classList.remove('finish');
        }
    }

    // Select an answer
    function selectAnswer(choiceIndex) {
        const index = state.currentQuestionIndex;
        if (state.answers[index] !== null) return;

        state.answers[index] = choiceIndex;
        renderQuestion();

        // In study mode, don't auto-advance
        if (!state.studyMode) {
            // Auto-advance after a short delay
            setTimeout(() => {
                if (state.currentQuestionIndex < state.questions.length - 1) {
                    nextQuestion();
                }
            }, 1500);
        }
    }

    // Navigate to next question
    function nextQuestion() {
        if (state.currentQuestionIndex < state.questions.length - 1) {
            state.currentQuestionIndex++;
            renderQuestion();
        } else {
            finishTest();
        }
    }

    // Navigate to previous question
    function prevQuestion() {
        if (state.currentQuestionIndex > 0) {
            state.currentQuestionIndex--;
            renderQuestion();
        }
    }

    // Finish the test
    function finishTest() {
        // Check if all questions answered
        const unanswered = state.answers.filter(a => a === null).length;
        if (unanswered > 0) {
            if (!confirm(`You have ${unanswered} unanswered question(s). Do you want to finish anyway?`)) {
                return;
            }
        }

        // Calculate results
        let correct = 0;
        state.questions.forEach((q, i) => {
            if (state.answers[i] === q.correct) {
                correct++;
            }
        });

        const total = state.questions.length;
        const percentage = Math.round((correct / total) * 100);
        const passed = percentage >= 80;

        // Save stats
        saveStats(state.currentTest, percentage, passed);

        // Update results screen
        document.getElementById('score-percent').textContent = `${percentage}%`;
        document.getElementById('correct-count').textContent = correct;
        document.getElementById('incorrect-count').textContent = total - correct;

        const scoreCircle = document.getElementById('score-circle');
        const passFail = document.getElementById('pass-fail');

        if (passed) {
            scoreCircle.classList.remove('fail');
            passFail.className = 'pass-fail passed';
            passFail.textContent = 'PASSED';
        } else {
            scoreCircle.classList.add('fail');
            passFail.className = 'pass-fail failed';
            passFail.textContent = 'FAILED';
        }

        showScreen('results');
    }

    // Review answers
    function reviewAnswers() {
        state.isReviewing = true;
        state.currentQuestionIndex = 0;
        showScreen('review');
        renderReviewQuestion();
    }

    // Render review question
    function renderReviewQuestion() {
        const question = state.questions[state.currentQuestionIndex];
        const index = state.currentQuestionIndex;
        const total = state.questions.length;
        const userAnswer = state.answers[index];
        const isCorrect = userAnswer === question.correct;

        // Update progress
        document.getElementById('review-progress').textContent = `${index + 1}/${total}`;
        document.getElementById('review-question-number').textContent = `Question ${index + 1}`;

        // Update status
        const statusEl = document.getElementById('review-status');
        statusEl.className = `question-status ${isCorrect ? 'correct' : 'incorrect'}`;
        statusEl.textContent = isCorrect ? 'Correct' : 'Incorrect';

        // Update question text
        document.getElementById('review-question-text').textContent = question.question;

        // Render choices
        const choicesContainer = document.getElementById('review-choices');
        choicesContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];

        question.choices.forEach((choice, i) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn disabled';

            let extraClass = '';
            let isYourAnswer = i === userAnswer;

            if (i === question.correct) {
                extraClass = 'correct';
            } else if (i === userAnswer) {
                extraClass = 'incorrect';
            }

            btn.classList.add(extraClass);
            if (isYourAnswer) {
                btn.classList.add('your-answer');
            }

            btn.innerHTML = `
                <span class="choice-letter">${letters[i]}</span>
                <span class="choice-text">${choice}${isYourAnswer ? '' : ''}</span>
            `;

            choicesContainer.appendChild(btn);
        });

        // Show explanation
        const explanationEl = document.getElementById('review-explanation');
        explanationEl.innerHTML = `
            <div class="explanation-title">Explanation</div>
            <div>${question.explanation}</div>
        `;

        // Update navigation
        document.getElementById('review-prev-btn').disabled = index === 0;
        document.getElementById('review-next-btn').disabled = index === total - 1;
    }

    // Local storage for stats
    function saveStats(testType, score, passed) {
        const stats = JSON.parse(localStorage.getItem('cdl-stats') || '{}');
        if (!stats[testType]) {
            stats[testType] = {
                attempts: 0,
                highScore: 0,
                lastScore: 0,
                passed: 0
            };
        }
        stats[testType].attempts++;
        stats[testType].lastScore = score;
        if (score > stats[testType].highScore) {
            stats[testType].highScore = score;
        }
        if (passed) {
            stats[testType].passed++;
        }
        localStorage.setItem('cdl-stats', JSON.stringify(stats));
        loadStats();
    }

    function loadStats() {
        const stats = JSON.parse(localStorage.getItem('cdl-stats') || '{}');
        const summaryEl = document.getElementById('stats-summary');

        if (Object.keys(stats).length === 0) {
            summaryEl.innerHTML = '';
            return;
        }

        let html = '<h3>Your Progress</h3>';
        const testNames = {
            generalKnowledge: 'General Knowledge',
            airBrakes: 'Air Brakes',
            passenger: 'Passenger',
            schoolBus: 'School Bus',
            vehicleInspection: 'Pre-Trip Inspection',
            combinationVehicles: 'Combination Vehicles',
            doublesTriples: 'Doubles/Triples',
            tankVehicles: 'Tank Vehicles',
            hazardousMaterials: 'Hazardous Materials'
        };

        for (const [key, data] of Object.entries(stats)) {
            html += `
                <div class="stat-row">
                    <span>${testNames[key] || key}</span>
                    <span>Best: ${data.highScore}% | Last: ${data.lastScore}%</span>
                </div>
            `;
        }

        summaryEl.innerHTML = html;
    }

    // Retake the same test
    function retakeTest() {
        startTest(state.currentTest);
    }

    // Go back to home
    function goHome() {
        showScreen('home');
        loadStats();
    }

    // Event listeners
    function initEventListeners() {
        // Test selection buttons
        document.querySelectorAll('.test-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const testType = btn.dataset.test;
                startTest(testType);
            });
        });

        // Navigation
        document.getElementById('back-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
                goHome();
            }
        });

        document.getElementById('prev-btn').addEventListener('click', prevQuestion);
        document.getElementById('next-btn').addEventListener('click', nextQuestion);

        // Results actions
        document.getElementById('review-btn').addEventListener('click', reviewAnswers);
        document.getElementById('retake-btn').addEventListener('click', retakeTest);
        document.getElementById('home-btn').addEventListener('click', goHome);

        // Review navigation
        document.getElementById('review-back-btn').addEventListener('click', () => {
            showScreen('results');
        });

        document.getElementById('review-prev-btn').addEventListener('click', () => {
            if (state.currentQuestionIndex > 0) {
                state.currentQuestionIndex--;
                renderReviewQuestion();
            }
        });

        document.getElementById('review-next-btn').addEventListener('click', () => {
            if (state.currentQuestionIndex < state.questions.length - 1) {
                state.currentQuestionIndex++;
                renderReviewQuestion();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (screens.test.classList.contains('active')) {
                if (e.key === 'ArrowRight' || e.key === ' ') {
                    e.preventDefault();
                    nextQuestion();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    prevQuestion();
                } else if (['1', '2', '3', '4', 'a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'].includes(e.key)) {
                    e.preventDefault();
                    let index;
                    if (['1', 'a', 'A'].includes(e.key)) index = 0;
                    else if (['2', 'b', 'B'].includes(e.key)) index = 1;
                    else if (['3', 'c', 'C'].includes(e.key)) index = 2;
                    else if (['4', 'd', 'D'].includes(e.key)) index = 3;
                    selectAnswer(index);
                }
            }
        });
    }

    // Initialize
    async function init() {
        await loadQuestions();
        initEventListeners();
    }

    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

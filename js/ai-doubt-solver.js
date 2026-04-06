// js/ai-doubt-solver.js - AI Doubt Solver Chat Interface (No API needed)

let currentUser = null;
let doubtHistory = [];

export function initDoubtSolver(user) {
    currentUser = user;
}

export async function askDoubt(question) {
    if (!question.trim()) {
        showDoubtError("❌ Please enter a question");
        return;
    }

    // Clear previous errors
    const chatBox = document.getElementById('doubtChatBox');
    if (chatBox) {
        const errors = chatBox.querySelectorAll('.doubt-error');
        errors.forEach(err => err.remove());
    }

    // Add user message to UI immediately
    const userMsg = { role: 'user', content: question, createdAt: new Date(), timestamp: Date.now() };
    addMessageToUI(userMsg);
    doubtHistory.push(userMsg);

    try {
        showDoubtLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const answer = generateSmartResponse(question);
        const aiMsg = { role: 'assistant', content: answer, createdAt: new Date(), timestamp: Date.now() };
        addMessageToUI(aiMsg);
        doubtHistory.push(aiMsg);
        showDoubtLoading(false);
    } catch (error) {
        console.error("AI Error:", error);
        showDoubtError("❌ Error: " + (error.message || "Failed to get response"));
        showDoubtLoading(false);
    }
}

function generateSmartResponse(question) {
    const q = question.toLowerCase().trim();

    // Database & DBMS questions
    if (q.includes('dbms') || q.includes('database management')) {
        return "DBMS (Database Management System) is software that manages databases. It handles data storage, retrieval, security, and integrity. Examples: MySQL, PostgreSQL, Oracle, MongoDB. It provides tools for creating, updating, and querying data efficiently.";
    }
    if (q.includes('database') && (q.includes('what') || q.includes('define'))) {
        return "A database is an organized collection of structured data stored electronically in a computer system. It allows efficient storage, retrieval, and management of large amounts of information. Databases use tables with rows and columns to organize data.";
    }

    // SQL questions
    if (q.includes('sql') || q.includes('query')) {
        return "SQL (Structured Query Language) is used to manage and query databases. Common commands: SELECT (retrieve data), INSERT (add data), UPDATE (modify data), DELETE (remove data). Example: SELECT * FROM students WHERE age > 18;";
    }

    // Programming concepts
    if (q.includes('variable') || q.includes('data type')) {
        return "A variable is a named container that stores a value in memory. Data types define what kind of data can be stored: integers, strings, booleans, etc. Variables help organize and manipulate data in programs.";
    }
    if (q.includes('loop') || q.includes('iteration')) {
        return "A loop repeats a block of code multiple times. Types: FOR loop (fixed iterations), WHILE loop (condition-based), DO-WHILE loop (runs at least once). Loops help automate repetitive tasks efficiently.";
    }
    if (q.includes('function') || q.includes('method')) {
        return "A function is a reusable block of code that performs a specific task. It takes inputs (parameters), processes them, and returns an output. Functions help organize code and reduce repetition.";
    }

    // Math questions
    if (q.includes('algebra') || q.includes('equation')) {
        return "Algebra uses variables and mathematical operations to solve problems. Steps: 1) Identify the unknown, 2) Set up the equation, 3) Isolate the variable, 4) Solve and verify. Example: 2x + 5 = 13 → x = 4.";
    }
    if (q.includes('geometry') || q.includes('triangle') || q.includes('circle')) {
        return "Geometry studies shapes and their properties. Key concepts: angles, area, perimeter, volume. For triangles: area = (base × height)/2. For circles: area = πr², circumference = 2πr.";
    }
    if (q.includes('calculus') || q.includes('derivative') || q.includes('integral')) {
        return "Calculus studies change and motion. Derivatives measure rate of change (slope), integrals measure accumulation (area). These are fundamental in physics, engineering, and economics.";
    }

    // Science questions
    if (q.includes('physics') || q.includes('force') || q.includes('energy')) {
        return "Physics studies matter and energy. Key laws: Newton's laws of motion, conservation of energy, conservation of momentum. Force = mass × acceleration (F=ma). Energy can be kinetic or potential.";
    }
    if (q.includes('chemistry') || q.includes('atom') || q.includes('molecule')) {
        return "Chemistry studies substances and reactions. Atoms are basic units of matter. Molecules form when atoms bond. Chemical reactions rearrange atoms to create new substances. pH measures acidity/basicity.";
    }
    if (q.includes('biology') || q.includes('cell') || q.includes('dna')) {
        return "Biology studies living organisms. Cells are the basic unit of life. DNA carries genetic information. Photosynthesis converts light to energy. Evolution explains diversity through natural selection.";
    }

    // History & Social Studies
    if (q.includes('history') || q.includes('war') || q.includes('revolution')) {
        return "History studies past events and their impact. Key periods: Ancient, Medieval, Renaissance, Industrial Revolution, Modern era. Understanding history helps us learn from past mistakes and achievements.";
    }

    // General learning tips
    if (q.includes('how to study') || q.includes('study tips') || q.includes('learn')) {
        return "Effective study tips: 1) Break topics into smaller chunks, 2) Use active recall (test yourself), 3) Teach others to reinforce learning, 4) Take regular breaks, 5) Practice problems repeatedly, 6) Connect new info to existing knowledge.";
    }
    if (q.includes('exam') || q.includes('test') || q.includes('prepare')) {
        return "Exam preparation: 1) Start early, 2) Review notes regularly, 3) Practice past papers, 4) Identify weak areas, 5) Get enough sleep before exam, 6) Manage time during exam, 7) Read questions carefully.";
    }

    // Greeting
    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
        return "Hello! 👋 I'm your AI study assistant. Ask me any academic questions about math, science, programming, databases, or any subject you're studying. I'm here to help you understand concepts better!";
    }

    // Default response
    return "That's a great question! While I don't have specific information about that topic, here's my advice: 1) Break the topic into smaller parts, 2) Look for examples, 3) Practice with problems, 4) Connect it to what you already know. What specific aspect would you like to explore?";
}

function addMessageToUI(msg) {
    const chatBox = document.getElementById('doubtChatBox');
    if (!chatBox) return;

    const msgEl = document.createElement('div');
    msgEl.className = `doubt-message ${msg.role}`;
    msgEl.innerHTML = `
    <div class="doubt-msg-content">
      ${msg.role === 'assistant' ? '<span class="doubt-ai-badge">🤖 AI</span>' : ''}
      <p>${escapeHtml(msg.content)}</p>
    </div>
  `;

    chatBox.appendChild(msgEl);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showDoubtLoading(show) {
    const loader = document.getElementById('doubtLoader');
    if (loader) loader.style.display = show ? 'block' : 'none';
}

function showDoubtError(msg) {
    const chatBox = document.getElementById('doubtChatBox');
    if (!chatBox) return;

    const errEl = document.createElement('div');
    errEl.className = 'doubt-error';
    errEl.innerHTML = msg;
    chatBox.appendChild(errEl);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.askDoubt = askDoubt;

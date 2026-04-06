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

    // Data & Data Science
    if (q.includes('what is data') || q.includes('define data')) {
        return "Data is a collection of facts, figures, or information in raw form. It can be numbers, text, images, or any other form of information. Data becomes useful when processed and analyzed to extract meaningful insights. Examples: student grades, sales numbers, weather readings, social media posts.";
    }
    if (q.includes('data') && (q.includes('type') || q.includes('types'))) {
        return "Data types categorize information: Quantitative (numerical: age, salary), Qualitative (descriptive: color, name), Structured (organized in tables), Unstructured (images, videos, text). Choosing the right data type is important for storage and analysis.";
    }
    if (q.includes('big data')) {
        return "Big Data refers to extremely large datasets that are difficult to process with traditional tools. Characteristics: Volume (large amount), Velocity (fast generation), Variety (different types). Used in analytics, machine learning, and business intelligence.";
    }
    if (q.includes('data science')) {
        return "Data Science combines statistics, programming, and domain knowledge to extract insights from data. Process: Collect data → Clean data → Analyze → Visualize → Draw conclusions. Tools: Python, R, SQL, Tableau. Used in business, healthcare, finance.";
    }
    if (q.includes('data mining')) {
        return "Data Mining extracts patterns and knowledge from large datasets. Techniques: Classification (categorize), Clustering (group similar), Regression (predict), Association (find relationships). Used in marketing, fraud detection, recommendation systems.";
    }
    if (q.includes('data visualization')) {
        return "Data Visualization represents data graphically using charts, graphs, and maps. Types: Bar charts (compare), Line graphs (trends), Pie charts (proportions), Scatter plots (relationships). Makes data easier to understand and communicate.";
    }

    // Data Structures & Algorithms
    if (q.includes('dsa') || q.includes('data structure') || q.includes('algorithm')) {
        return "DSA (Data Structures & Algorithms) is fundamental to computer science. Data Structures organize data (Arrays, Linked Lists, Trees, Graphs, Hash Tables). Algorithms solve problems efficiently (Sorting, Searching, Dynamic Programming). Good DSA knowledge improves code efficiency and interview performance.";
    }
    if (q.includes('array') || q.includes('list')) {
        return "An Array is a collection of elements stored in contiguous memory locations. Access: O(1), Insert/Delete: O(n). Linked List uses nodes with pointers. Access: O(n), Insert/Delete: O(1). Choose based on your use case.";
    }
    if (q.includes('tree') || q.includes('binary tree')) {
        return "A Tree is a hierarchical data structure with a root node and child nodes. Binary Tree: each node has max 2 children. BST (Binary Search Tree): left < parent < right. Used in databases, file systems, and search algorithms.";
    }
    if (q.includes('graph') || q.includes('node') || q.includes('edge')) {
        return "A Graph consists of nodes (vertices) connected by edges. Types: Directed (one-way), Undirected (two-way), Weighted (edges have values). Used in social networks, maps, and recommendation systems. Traversal: BFS (breadth-first), DFS (depth-first).";
    }
    if (q.includes('sorting') || q.includes('bubble sort') || q.includes('merge sort') || q.includes('quick sort')) {
        return "Sorting algorithms arrange data in order. Bubble Sort: O(n²), simple. Merge Sort: O(n log n), stable. Quick Sort: O(n log n) average, fast. Choose based on data size and stability requirements.";
    }
    if (q.includes('searching') || q.includes('binary search') || q.includes('linear search')) {
        return "Searching finds elements in data. Linear Search: O(n), works on unsorted data. Binary Search: O(log n), requires sorted data. Hash Table: O(1) average, uses hashing for fast lookup.";
    }
    if (q.includes('hash') || q.includes('hash table') || q.includes('hash map')) {
        return "Hash Table uses a hash function to map keys to values. Average time: O(1) for insert/delete/search. Collision handling: chaining or open addressing. Used in dictionaries, caches, and databases.";
    }
    if (q.includes('dynamic programming') || q.includes('recursion')) {
        return "Dynamic Programming solves problems by breaking them into subproblems and storing results. Recursion calls a function within itself. Memoization stores computed results to avoid recalculation. Used in optimization problems like Fibonacci, knapsack, longest subsequence.";
    }

    // Database & DBMS questions
    if (q.includes('dbms') || q.includes('database management')) {
        return "DBMS (Database Management System) is software that manages databases. It handles data storage, retrieval, security, and integrity. Examples: MySQL, PostgreSQL, Oracle, MongoDB. It provides tools for creating, updating, and querying data efficiently.";
    }
    if (q.includes('normalization') || q.includes('1nf') || q.includes('2nf') || q.includes('3nf')) {
        return "Normalization organizes database tables to reduce redundancy. 1NF: atomic values only. 2NF: no partial dependencies. 3NF: no transitive dependencies. BCNF: stricter than 3NF. Proper normalization improves data integrity and query performance.";
    }
    if (q.includes('join') || q.includes('inner join') || q.includes('left join')) {
        return "SQL JOINs combine data from multiple tables. INNER JOIN: matching rows only. LEFT JOIN: all left table rows + matching right. RIGHT JOIN: all right table rows + matching left. FULL JOIN: all rows from both tables.";
    }
    if (q.includes('index') || q.includes('primary key') || q.includes('foreign key')) {
        return "Primary Key uniquely identifies each row. Foreign Key links to another table's primary key. Index speeds up queries by creating a sorted structure. Composite Key uses multiple columns. Proper indexing improves database performance.";
    }
    if (q.includes('transaction') || q.includes('acid')) {
        return "ACID properties ensure database reliability. Atomicity: all-or-nothing. Consistency: valid state. Isolation: concurrent independence. Durability: permanent after commit. Transactions prevent data corruption and ensure data integrity.";
    }
    if (q.includes('database') && (q.includes('what') || q.includes('define'))) {
        return "A database is an organized collection of structured data stored electronically. It allows efficient storage, retrieval, and management of large amounts of information. Databases use tables with rows and columns to organize data.";
    }

    // SQL questions
    if (q.includes('sql') || q.includes('query')) {
        return "SQL (Structured Query Language) manages and queries databases. Commands: SELECT (retrieve), INSERT (add), UPDATE (modify), DELETE (remove), CREATE (table), DROP (delete table). Example: SELECT * FROM students WHERE age > 18;";
    }
    if (q.includes('where') || q.includes('filter')) {
        return "WHERE clause filters records based on conditions. Operators: = (equal), != (not equal), > (greater), < (less), >= (greater/equal), <= (less/equal), LIKE (pattern), IN (multiple values). Example: WHERE age > 18 AND city = 'NYC'";
    }
    if (q.includes('group by') || q.includes('aggregate')) {
        return "GROUP BY groups rows with same values. Aggregate functions: COUNT (count rows), SUM (total), AVG (average), MAX (maximum), MIN (minimum). HAVING filters groups. Example: SELECT city, COUNT(*) FROM users GROUP BY city HAVING COUNT(*) > 5";
    }

    // Programming concepts
    if (q.includes('oops') || q.includes('object oriented') || q.includes('class') || q.includes('inheritance')) {
        return "OOP (Object-Oriented Programming) uses objects and classes. Encapsulation: hide internal details. Inheritance: reuse code from parent class. Polymorphism: same method, different behavior. Abstraction: show only essential features. Makes code modular and reusable.";
    }
    if (q.includes('variable') || q.includes('data type')) {
        return "A variable is a named container storing a value in memory. Data types: int (integers), float (decimals), string (text), boolean (true/false), array (collection). Variables help organize and manipulate data in programs.";
    }
    if (q.includes('loop') || q.includes('iteration')) {
        return "A loop repeats code multiple times. FOR loop: fixed iterations. WHILE loop: condition-based. DO-WHILE: runs at least once. FOREACH: iterates through collections. Loops automate repetitive tasks efficiently.";
    }
    if (q.includes('function') || q.includes('method')) {
        return "A function is a reusable code block performing a specific task. Takes inputs (parameters), processes them, returns output. Benefits: code reuse, organization, easier debugging. Example: function add(a, b) { return a + b; }";
    }
    if (q.includes('pointer') || q.includes('reference')) {
        return "A pointer stores a memory address of another variable. Dereferencing accesses the value at that address. References are safer pointers. Used in dynamic memory allocation, linked lists, and trees.";
    }
    if (q.includes('exception') || q.includes('error handling')) {
        return "Exception handling manages errors gracefully. Try-catch blocks: try executes code, catch handles errors. Finally: runs regardless of exception. Throw: creates custom exceptions. Prevents program crashes.";
    }

    // Programming Languages
    if (q.includes('python')) {
        return "Python is a high-level, interpreted language known for simplicity and readability. Uses indentation for code blocks. Popular for: web development (Django, Flask), data science (NumPy, Pandas), machine learning (TensorFlow, scikit-learn), automation. Syntax: print('Hello'), x = 5, for i in range(10):";
    }
    if (q.includes('java')) {
        return "Java is an object-oriented, compiled language with 'write once, run anywhere' philosophy. Uses JVM (Java Virtual Machine). Popular for: enterprise applications, Android development, backend systems. Features: strong typing, garbage collection, multithreading. Syntax: public class Main { public static void main(String[] args) }";
    }
    if (q.includes('javascript') || q.includes('js')) {
        return "JavaScript is a scripting language for web development. Runs in browsers and Node.js. Used for: frontend (React, Vue, Angular), backend (Node.js), full-stack development. Features: dynamic typing, event-driven, asynchronous. Syntax: const x = 5; function add(a, b) { return a + b; }";
    }
    if (q.includes('c++') || q.includes('cpp')) {
        return "C++ is a compiled language combining low-level and high-level features. Used for: system software, game engines, competitive programming, performance-critical applications. Features: pointers, manual memory management, templates. Syntax: #include <iostream>, int main() { std::cout << 'Hello'; }";
    }
    if (q.includes('c#') || q.includes('csharp')) {
        return "C# is a modern, object-oriented language by Microsoft. Used for: Windows applications, game development (Unity), web development (ASP.NET). Features: garbage collection, LINQ, async/await. Syntax: similar to Java, public class Program { static void Main() }";
    }
    if (q.includes('sql') && !q.includes('nosql')) {
        return "SQL (Structured Query Language) manages and queries databases. Commands: SELECT (retrieve), INSERT (add), UPDATE (modify), DELETE (remove), CREATE (table), DROP (delete table). Example: SELECT * FROM students WHERE age > 18;";
    }

    // Math questions
    if (q.includes('algebra') || q.includes('equation')) {
        return "Algebra uses variables and operations to solve problems. Steps: 1) Identify unknown, 2) Set up equation, 3) Isolate variable, 4) Solve and verify. Example: 2x + 5 = 13 → 2x = 8 → x = 4.";
    }
    if (q.includes('geometry') || q.includes('triangle') || q.includes('circle')) {
        return "Geometry studies shapes and properties. Triangle area = (base × height)/2. Circle area = πr², circumference = 2πr. Pythagorean theorem: a² + b² = c². Used in architecture, engineering, and graphics.";
    }
    if (q.includes('calculus') || q.includes('derivative') || q.includes('integral')) {
        return "Calculus studies change and motion. Derivative: rate of change (slope). Integral: accumulation (area under curve). Fundamental theorem: derivatives and integrals are inverses. Used in physics, engineering, economics.";
    }
    if (q.includes('probability') || q.includes('statistics')) {
        return "Probability measures likelihood of events (0 to 1). Statistics analyzes data: mean (average), median (middle), mode (most frequent), standard deviation (spread). Used in data science, machine learning, and research.";
    }

    // Science questions
    if (q.includes('physics') || q.includes('force') || q.includes('energy')) {
        return "Physics studies matter and energy. Newton's laws: F=ma (force), conservation of energy, conservation of momentum. Kinetic energy = ½mv². Potential energy = mgh. Used in engineering and technology.";
    }
    if (q.includes('chemistry') || q.includes('atom') || q.includes('molecule')) {
        return "Chemistry studies substances and reactions. Atoms: basic units of matter. Molecules: bonded atoms. Chemical reactions rearrange atoms. pH: 0-7 acidic, 7 neutral, 7-14 basic. Used in medicine, materials, and industry.";
    }
    if (q.includes('biology') || q.includes('cell') || q.includes('dna')) {
        return "Biology studies living organisms. Cells: basic life unit. DNA: genetic information (4 bases: A, T, G, C). Photosynthesis: light → energy. Mitochondria: cell powerhouse. Evolution: natural selection drives diversity.";
    }

    // History & Social Studies
    if (q.includes('history') || q.includes('war') || q.includes('revolution')) {
        return "History studies past events and their impact. Key periods: Ancient, Medieval, Renaissance, Industrial Revolution, Modern era. Understanding history helps learn from past mistakes and achievements.";
    }

    // General learning tips
    if (q.includes('how to study') || q.includes('study tips') || q.includes('learn')) {
        return "Effective study tips: 1) Break topics into chunks, 2) Use active recall (test yourself), 3) Teach others, 4) Take breaks, 5) Practice problems, 6) Connect to existing knowledge, 7) Use multiple resources.";
    }
    if (q.includes('exam') || q.includes('test') || q.includes('prepare')) {
        return "Exam preparation: 1) Start early, 2) Review notes regularly, 3) Practice past papers, 4) Identify weak areas, 5) Get sleep before exam, 6) Manage time during exam, 7) Read questions carefully.";
    }

    // Greeting
    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
        return "Hello! 👋 I'm your AI study assistant. Ask me about DSA, databases, SQL, programming, math, science, or any academic topic. I'm here to help you understand concepts better!";
    }

    // Default response
    return "That's a great question! I don't have specific information about that topic yet. Try: 1) Use the Learn tab to search Wikipedia and YouTube, 2) Ask a more specific question, 3) Break it into smaller parts. What specific aspect would you like to explore?";
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

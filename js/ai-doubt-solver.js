// js/ai-doubt-solver.js - AI Doubt Solver Chat Interface

import { db } from './firebase-init.js';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { AI_CONFIG } from './ai-config.js';

let currentUser = null;
let doubtHistory = [];

export function initDoubtSolver(user) {
    currentUser = user;
    loadDoubtHistory();
}

function loadDoubtHistory() {
    if (!currentUser) return;
    const q = query(
        collection(db, "users", currentUser.uid, "doubts"),
        orderBy("createdAt", "asc")
    );
    onSnapshot(q, (snap) => {
        doubtHistory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDoubtChat();
    });
}

export async function askDoubt(question) {
    if (!question.trim()) {
        showDoubtError("❌ Please enter a question");
        return;
    }

    const apiKey = AI_CONFIG.OPENROUTER_API_KEY;
    if (!apiKey) {
        showDoubtError("❌ API key not configured");
        return;
    }

    // Add user message to UI immediately
    const userMsg = { role: 'user', content: question, createdAt: new Date(), timestamp: Date.now() };
    addMessageToUI(userMsg);

    try {
        showDoubtLoading(true);
        const answer = await callOpenRouterAPI(question, apiKey);
        const aiMsg = { role: 'assistant', content: answer, createdAt: new Date(), timestamp: Date.now() };
        addMessageToUI(aiMsg);

        // Try to save to Firebase, but don't fail if it doesn't work
        if (currentUser && currentUser.uid) {
            try {
                await addDoc(collection(db, "users", currentUser.uid, "doubts"), {
                    question, answer, createdAt: serverTimestamp(), helpful: null
                });
            } catch (firebaseError) {
                console.warn("Could not save to Firebase:", firebaseError);
                // Continue anyway - chat still works
            }
        }

        showDoubtLoading(false);
    } catch (error) {
        console.error("AI Error:", error);
        showDoubtError("❌ Error: " + error.message);
        showDoubtLoading(false);
    }
}

async function callOpenRouterAPI(question, apiKey) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.href,
            'X-Title': 'StudySync'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful academic tutor. Answer questions clearly and concisely in 2-3 sentences. If it\'s a math problem, show the steps.'
                },
                {
                    role: 'user',
                    content: question
                }
            ],
            temperature: 0.7,
            max_tokens: 200
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim();
    }

    throw new Error("No response from AI");
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

function renderDoubtChat() {
    const chatBox = document.getElementById('doubtChatBox');
    if (!chatBox) return;

    chatBox.innerHTML = '';
    doubtHistory.forEach(msg => {
        addMessageToUI({
            role: msg.question ? 'user' : 'assistant',
            content: msg.question || msg.answer,
            createdAt: msg.createdAt
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.askDoubt = askDoubt;


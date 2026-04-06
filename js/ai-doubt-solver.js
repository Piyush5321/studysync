// js/ai-doubt-solver.js - AI Doubt Solver Chat Interface

import { AI_CONFIG } from './ai-config.js';

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

    const apiKey = AI_CONFIG.OPENROUTER_API_KEY;
    if (!apiKey) {
        showDoubtError("❌ API key not configured");
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
        const answer = await callOpenRouterAPI(question, apiKey);
        const aiMsg = { role: 'assistant', content: answer, createdAt: new Date(), timestamp: Date.now() };
        addMessageToUI(aiMsg);
        doubtHistory.push(aiMsg);
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.askDoubt = askDoubt;


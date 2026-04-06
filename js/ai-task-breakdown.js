// js/ai-task-breakdown.js - AI Task Breakdown Generator

import { getAIApiKey, AI_CONFIG } from './ai-config.js';

// Generate subtasks from a large task
export async function generateTaskBreakdown(taskTitle) {
    if (!taskTitle.trim()) return [];
    if (!getAIApiKey()) {
        showBreakdownError("API key not configured");
        return [];
    }

    try {
        showBreakdownLoading(true);

        const subtasks = await callBreakdownAPI(taskTitle);

        showBreakdownLoading(false);
        return subtasks;
    } catch (error) {
        console.error("Breakdown Error:", error);
        showBreakdownError("Failed to generate breakdown");
        showBreakdownLoading(false);
        return [];
    }
}

// Call AI API to break down task
async function callBreakdownAPI(taskTitle) {
    const apiKey = getAIApiKey();
    const model = AI_CONFIG.MODELS.TEXT_GENERATION;

    const prompt = `Break down this task into 3-5 specific, actionable subtasks. Return ONLY a numbered list, one per line.

Task: ${taskTitle}

Subtasks:`;

    try {
        const response = await fetch(`${AI_CONFIG.HUGGING_FACE_API_URL}/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: 150,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();

        if (Array.isArray(data) && data[0]?.generated_text) {
            const fullText = data[0].generated_text;
            const subtasksStart = fullText.indexOf('Subtasks:') + 9;
            const subtasksText = fullText.substring(subtasksStart).trim();

            // Parse numbered list
            const subtasks = subtasksText
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^\d+\.\s*/, '').trim())
                .filter(line => line.length > 0);

            return subtasks;
        }

        return [];
    } catch (error) {
        console.error("API Call Error:", error);
        throw error;
    }
}

// Display breakdown results
export function displayBreakdown(subtasks) {
    const container = document.getElementById('breakdownResults');
    if (!container) return;

    if (!subtasks.length) {
        container.innerHTML = '<p class="text-muted">No subtasks generated</p>';
        return;
    }

    container.innerHTML = `
    <div class="breakdown-list">
      ${subtasks.map((task, i) => `
        <div class="breakdown-item">
          <input type="checkbox" id="subtask-${i}" class="subtask-check">
          <label for="subtask-${i}">${escapeHtml(task)}</label>
          <button class="btn-small" onclick="addSubtaskAsTask('${escapeHtml(task)}')">
            <i class="fa-solid fa-plus"></i> Add as Task
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

// Add subtask as actual task
export async function addSubtaskAsTask(subtaskTitle) {
    // This will be called from app.js with proper task creation
    window.dispatchEvent(new CustomEvent('addSubtask', { detail: { title: subtaskTitle } }));
}

function showBreakdownLoading(show) {
    const loader = document.getElementById('breakdownLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showBreakdownError(msg) {
    const container = document.getElementById('breakdownResults');
    if (container) {
        container.innerHTML = `<div class="error-msg"><i class="fa-solid fa-exclamation"></i> ${msg}</div>`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export for window access
window.generateTaskBreakdown = generateTaskBreakdown;
window.displayBreakdown = displayBreakdown;
window.addSubtaskAsTask = addSubtaskAsTask;

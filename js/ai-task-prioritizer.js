// js/ai-task-prioritizer.js - Task Prioritizer (JavaScript-based)

export function prioritizeTasks(tasks) {
    if (!tasks || tasks.length === 0) {
        return { error: "No tasks to prioritize" };
    }

    try {
        showPrioritizerLoading(true);

        // Filter out completed tasks
        const pendingTasks = tasks.filter(t => t.column !== 'completed');

        if (pendingTasks.length === 0) {
            showPrioritizerLoading(false);
            return { error: "All tasks are completed! 🎉" };
        }

        // Score each task based on priority, deadline, and time
        const scoredTasks = pendingTasks.map(task => {
            let score = 0;
            const now = new Date();
            const deadline = task.deadline ? new Date(task.deadline) : null;

            // Priority scoring (high = 30, medium = 20, low = 10)
            const priorityScore = {
                'high': 30,
                'medium': 20,
                'low': 10
            }[task.priority] || 15;
            score += priorityScore;

            // Deadline urgency scoring
            if (deadline) {
                const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

                if (daysUntil < 0) {
                    // Overdue - highest priority
                    score += 50;
                } else if (daysUntil === 0) {
                    // Due today
                    score += 40;
                } else if (daysUntil === 1) {
                    // Due tomorrow
                    score += 35;
                } else if (daysUntil <= 3) {
                    // Due within 3 days
                    score += 25;
                } else if (daysUntil <= 7) {
                    // Due within a week
                    score += 15;
                } else {
                    // Due later
                    score += 5;
                }
            }

            // Time slot scoring (if specified)
            if (task.startTime) {
                const [hours, mins] = task.startTime.split(':').map(Number);
                const taskTime = hours * 60 + mins;
                const currentTime = now.getHours() * 60 + now.getMinutes();

                // Tasks starting soon get higher priority
                if (taskTime >= currentTime && taskTime <= currentTime + 120) {
                    score += 20; // Task starting within 2 hours
                }
            }

            return {
                ...task,
                score,
                daysUntil: deadline ? Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)) : 999
            };
        });

        // Sort by score (highest first)
        const prioritized = scoredTasks.sort((a, b) => b.score - a.score);

        // Generate prioritization text
        const prioritizationText = prioritized.map((task, index) => {
            const reasons = [];

            if (task.priority === 'high') reasons.push('High priority');
            if (task.daysUntil < 0) reasons.push('Overdue');
            else if (task.daysUntil === 0) reasons.push('Due today');
            else if (task.daysUntil === 1) reasons.push('Due tomorrow');
            else if (task.daysUntil <= 3) reasons.push(`Due in ${task.daysUntil} days`);

            const reasonText = reasons.length > 0 ? reasons.join(', ') : 'Regular task';

            return `${index + 1}${['st', 'nd', 'rd'][index] || 'th'}: ${task.title} - ${reasonText}`;
        }).join('\n');

        showPrioritizerLoading(false);
        return { success: true, prioritization: prioritizationText };
    } catch (error) {
        console.error("Prioritizer Error:", error);
        showPrioritizerLoading(false);
        return { error: error.message };
    }
}

export function displayPrioritization(result) {
    const container = document.getElementById('prioritizerResults');
    if (!container) return;

    if (result.error) {
        container.innerHTML = `<div class="error-msg"><i class="fa-solid fa-exclamation"></i> ${result.error}</div>`;
        return;
    }

    if (result.success) {
        const lines = result.prioritization.split('\n').filter(l => l.trim());
        let html = '<div class="prioritizer-list">';

        lines.forEach((line, i) => {
            if (line.trim()) {
                html += `<div class="prioritizer-item">
          <div class="priority-number">${i + 1}</div>
          <div class="priority-text">${escapeHtml(line)}</div>
        </div>`;
            }
        });

        html += '</div>';
        container.innerHTML = html;
    }
}

function showPrioritizerLoading(show) {
    const loader = document.getElementById('prioritizerLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.prioritizeTasks = prioritizeTasks;
window.displayPrioritization = displayPrioritization;

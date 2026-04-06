// js/ai-predictions.js - Predictive Performance Analysis

export function analyzePredictivePerformance(tasks, userDoc, groupMembers) {
    const predictions = {
        riskLevel: 'low',
        insights: [],
        warnings: [],
        recommendations: []
    };

    if (!tasks || !userDoc) return predictions;

    // Analyze task completion rate
    const completionRate = userDoc.tasksCompleted > 0
        ? (userDoc.tasksCompleted / (userDoc.tasksCompleted + tasks.filter(t => t.column !== 'completed').length)) * 100
        : 0;

    // Analyze upcoming deadlines
    const now = new Date();
    const upcomingTasks = tasks.filter(t =>
        t.deadline &&
        new Date(t.deadline) > now &&
        t.column !== 'completed'
    );

    const urgentTasks = upcomingTasks.filter(t => {
        const daysUntil = (new Date(t.deadline) - now) / (1000 * 60 * 60 * 24);
        return daysUntil <= 2;
    });

    const overdueTasks = tasks.filter(t =>
        t.deadline &&
        new Date(t.deadline) < now &&
        t.column !== 'completed'
    );

    // Risk assessment
    if (overdueTasks.length > 0) {
        predictions.riskLevel = 'critical';
        predictions.warnings.push(`⚠️ ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`);
    } else if (urgentTasks.length > 2) {
        predictions.riskLevel = 'high';
        predictions.warnings.push(`⚠️ ${urgentTasks.length} tasks due within 2 days`);
    } else if (completionRate < 30) {
        predictions.riskLevel = 'medium';
        predictions.warnings.push('📉 Low completion rate detected');
    }

    // Generate insights
    if (completionRate > 80) {
        predictions.insights.push('✅ Excellent task completion rate!');
    } else if (completionRate > 50) {
        predictions.insights.push('📊 Good progress, keep it up!');
    } else if (completionRate > 0) {
        predictions.insights.push('📈 You can improve your completion rate');
    }

    if (userDoc.streak > 5) {
        predictions.insights.push(`🔥 Amazing ${userDoc.streak}-day streak!`);
    }

    // Workload analysis
    const pendingTasks = tasks.filter(t => t.column !== 'completed').length;
    if (pendingTasks > 10) {
        predictions.warnings.push('📚 Heavy workload detected');
        predictions.recommendations.push('Consider breaking down large tasks into smaller steps');
    }

    // Deadline clustering
    const tasksThisWeek = upcomingTasks.filter(t => {
        const daysUntil = (new Date(t.deadline) - now) / (1000 * 60 * 60 * 24);
        return daysUntil <= 7;
    });

    if (tasksThisWeek.length > 5) {
        predictions.recommendations.push('Multiple deadlines this week - prioritize high-priority tasks');
    }

    // Performance trend
    if (userDoc.tasksCompleted > 0 && userDoc.tasksOnTime > 0) {
        const onTimeRate = (userDoc.tasksOnTime / userDoc.tasksCompleted) * 100;
        if (onTimeRate > 80) {
            predictions.insights.push('⏰ Excellent on-time submission rate!');
        } else if (onTimeRate < 50) {
            predictions.recommendations.push('Try to submit tasks earlier to avoid last-minute rush');
        }
    }

    // Burnout detection
    if (pendingTasks > 15 && completionRate < 40) {
        predictions.warnings.push('⚠️ Potential burnout risk - take breaks!');
        predictions.recommendations.push('Focus on completing 2-3 high-priority tasks first');
    }

    return predictions;
}

// Get risk level color
export function getRiskColor(riskLevel) {
    const colors = {
        low: '#4ecdc4',
        medium: '#ffd60a',
        high: '#ff6b35',
        critical: '#f87171'
    };
    return colors[riskLevel] || '#7a7f9a';
}

// Get risk level icon
export function getRiskIcon(riskLevel) {
    const icons = {
        low: '✅',
        medium: '⚠️',
        high: '🔴',
        critical: '🚨'
    };
    return icons[riskLevel] || '❓';
}

// Render predictions dashboard
export function renderPredictions(predictions) {
    const container = document.getElementById('predictionsContainer');
    if (!container) return;

    const riskColor = getRiskColor(predictions.riskLevel);
    const riskIcon = getRiskIcon(predictions.riskLevel);

    let html = `
    <div class="predictions-card">
      <div class="predictions-header">
        <h3>📊 Performance Insights</h3>
        <div class="risk-badge" style="background: ${riskColor}">
          ${riskIcon} ${predictions.riskLevel.toUpperCase()}
        </div>
      </div>
  `;

    if (predictions.warnings.length > 0) {
        html += `
      <div class="predictions-section warnings">
        <h4>⚠️ Warnings</h4>
        ${predictions.warnings.map(w => `<p>${w}</p>`).join('')}
      </div>
    `;
    }

    if (predictions.insights.length > 0) {
        html += `
      <div class="predictions-section insights">
        <h4>💡 Insights</h4>
        ${predictions.insights.map(i => `<p>${i}</p>`).join('')}
      </div>
    `;
    }

    if (predictions.recommendations.length > 0) {
        html += `
      <div class="predictions-section recommendations">
        <h4>🎯 Recommendations</h4>
        ${predictions.recommendations.map(r => `<p>• ${r}</p>`).join('')}
      </div>
    `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Export for window access
window.analyzePredictivePerformance = analyzePredictivePerformance;
window.renderPredictions = renderPredictions;

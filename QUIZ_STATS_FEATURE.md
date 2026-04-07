# Quiz Performance Stats Feature

## Overview
A new "Quiz Performance Stats" visualization has been added to the Performance tab that displays individual quiz performance as a line graph.

## Features

### 1. Line Graph Visualization
- Shows quiz scores over time as a line chart
- Each point represents one quiz attempt
- Points are color-coded by performance:
  - 🟢 Green (80%+): Excellent
  - 🔵 Blue (60-79%): Good
  - 🟠 Orange (40-59%): Fair
  - 🔴 Red (<40%): Poor

### 2. Interactive Tooltips
Hover over any point to see:
- Quiz topic
- Difficulty level
- Score (correct answers / total questions)

### 3. Performance Summary Cards
Below the graph, displays:
- **Total Quizzes**: Number of quizzes taken
- **Average Score**: Mean percentage across all quizzes
- **Best Score**: Highest score achieved
- **Lowest Score**: Lowest score achieved

### 4. Topic & Difficulty Breakdown
Shows:
- Count of quizzes by topic (e.g., "Science (3), History (2)")
- Count of quizzes by difficulty (e.g., "Easy (2), Medium (4), Hard (1)")

## How to Use

1. Go to the **Performance** tab in the sidebar
2. Scroll down to see the **"Quiz Performance Stats"** card
3. The line graph shows your quiz performance over time
4. Hover over points to see detailed information
5. Review the summary cards for overall statistics

## Technical Details

### Files Modified
- `dashboard.html` - Added Quiz Performance Stats card to Progress page
- `js/app.js` - Added call to `loadQuizStats()` in `renderProgressCharts()`

### Files Created
- `js/quiz-stats.js` - Quiz stats visualization and data loading

### Data Source
- Fetches quiz results from Firestore `quiz_results` collection
- Filters by current user's UID
- Sorts chronologically for line graph display

### Chart Library
- Uses Chart.js for visualization
- Responsive design that adapts to screen size
- Dark theme compatible

## Features

✅ Line graph showing quiz performance over time
✅ Color-coded points based on score performance
✅ Interactive tooltips with detailed quiz info
✅ Summary statistics (total, average, best, worst)
✅ Topic and difficulty breakdown
✅ Real-time updates when new quizzes are taken
✅ Empty state message when no quizzes exist
✅ Responsive design

## Future Enhancements

Possible additions:
- Filter by topic or difficulty
- Compare performance across different topics
- Trend analysis and improvement suggestions
- Export stats as PDF/CSV
- Weekly/monthly performance summaries
- Goal setting and progress tracking

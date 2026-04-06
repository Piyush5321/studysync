# StudySync — Collaborative Study Planner

## Quick Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password + Google) and Firestore
3. Replace the config values in:
   - `js/firebase-init.js`
   - `js/app.js` (search for YOUR_FIREBASE_API_KEY)
   - `js/auth.js` (same)
4. Open `index.html` in a browser or serve with `npx serve .`

## Features
- Login / Signup with Email + Google
- Group workspace with invite codes
- Kanban board with drag & drop
- Monthly/Weekly calendar
- Progress charts (pie + bar)
- Gamified leaderboard with podium
- Smart Study Planner (AI recommendations)
- Burnout detection
- Resource sharing
- Real-time updates via Firebase

## Points System
- Complete task: +10 pts
- Leaderboard ranks by points (gold/silver/bronze podium)

# StudySync — Complete Setup & Firebase Integration Guide

---

## 📁 Project File Structure

```
studysync/
├── index.html            ← Login/Register page
├── dashboard.html        ← Main app (all pages)
├── css/
│   ├── app.css           ← Main app styles
│   └── auth.css          ← Auth page styles
├── js/
│   ├── app.js            ← Main app logic (ALL pages)
│   ├── auth.js           ← Auth logic
│   ├── auth-ui.js        ← Auth UI
│   └── firebase-init.js  ← Firebase config (legacy, unused)
└── SETUP_GUIDE.md        ← This file
```

---

## 🔥 Step 1: Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Enter project name: `studysync` → Click Continue
4. Disable Google Analytics (optional) → Click **Create Project**
5. Wait for project creation → Click **Continue**

---

## 🔑 Step 2: Get Your Firebase Config

1. In Firebase console → Click the **Web icon** `</>`
2. App nickname: `StudySync Web` → Click **Register app**
3. **Copy the firebaseConfig object** — it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "studysync-xxxxx.firebaseapp.com",
  projectId: "studysync-xxxxx",
  storageBucket: "studysync-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

4. **Open `js/app.js`** — find the firebaseConfig block near the top (around line 12)
5. **Replace** the placeholder values with your actual values
6. Do the same in **`js/auth.js`** (same config block)

---

## 🔐 Step 3: Enable Authentication

1. Firebase Console → **Build → Authentication**
2. Click **"Get Started"**
3. Click **"Email/Password"** under Sign-in providers
4. Enable **Email/Password** → Click **Save**

---

## 🗄️ Step 4: Set Up Firestore Database

1. Firebase Console → **Build → Firestore Database**
2. Click **"Create database"**
3. Select **"Start in test mode"** (for development)
4. Choose your region (e.g., `us-central`) → Click **Enable**

### Firestore Security Rules (paste this in Rules tab):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    // Group members can read/write group data
    match /groups/{groupId} {
      allow read, write: if request.auth != null;
      
      match /tasks/{taskId} {
        allow read, write: if request.auth != null;
      }
      match /events/{eventId} {
        allow read, write: if request.auth != null;
      }
      match /resources/{resourceId} {
        allow read, write: if request.auth != null;
      }
      match /activity/{actId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

---

## 📦 Step 5: Set Up Firebase Storage (for file uploads)

1. Firebase Console → **Build → Storage**
2. Click **"Get Started"**
3. Select **"Start in test mode"** → Click **Next**
4. Choose region → Click **Done**

### Storage Security Rules (paste in Storage → Rules tab):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /groups/{groupId}/resources/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 25 * 1024 * 1024;  // 25MB max
    }
  }
}
```

---

## 🧩 Step 6: Create Firestore Indexes

Go to **Firestore → Indexes → Composite** and add:

| Collection | Fields | Order |
|---|---|---|
| `groups/{id}/tasks` | `createdAt` | Descending |
| `groups/{id}/events` | `date` | Ascending |
| `groups/{id}/resources` | `createdAt` | Descending |
| `groups/{id}/activity` | `createdAt` | Descending |
| `users` | `groupId` | Ascending |

> Firebase will also prompt you to create indexes automatically when queries fail — just click the link in the console error.

---

## 🚀 Step 7: Run the Project

### Option A — VS Code Live Server (Recommended)
1. Install VS Code extension: **"Live Server"**
2. Right-click `index.html` → **"Open with Live Server"**
3. Opens at `http://127.0.0.1:5500`

### Option B — Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Set public directory to: . (current folder)
# Configure as SPA: No
firebase deploy
```

### Option C — Any Static Host
Upload the entire `studysync/` folder to:
- **Netlify** (drag-and-drop at netlify.com)
- **Vercel** (connect GitHub repo)
- **GitHub Pages**

---

## 📋 Firestore Data Structure

```
/users/{uid}
  name, email, points, tasksCompleted, groupId, streak, lastLoginDate, lastActive

/groups/{groupId}
  name, subject, code, createdBy, members[]
  
  /tasks/{taskId}
    title, deadline, startTime, endTime, priority, column,
    assignedTo, assignedName, points, createdBy, createdAt
    
  /events/{eventId}
    title, date, startTime, endTime, color, notes, createdBy, createdAt
    
  /resources/{resourceId}
    title, url, type, subject, desc, addedBy, addedByAvatar,
    uid, fileName, fileSize, storagePath, createdAt
    
  /activity/{actId}
    text, type, uid, createdAt
```

---

## ⚡ Points System

| Action | Points |
|---|---|
| Add a Task | +5 |
| Complete a Task (Low priority) | +10 |
| Complete a Task (Medium priority) | +15 |
| Complete a Task (High priority) | +25 |
| Early Completion Bonus | +10 |
| Add an Event | +5 |
| Share a Resource/Link | +15 |
| Upload a File | +20 |
| Daily Login Streak (7-day bonus) | +20 |

Points are stored per-user in Firestore and reflected in real-time on the Leaderboard.

---

## 🌐 Free APIs Used

| API | Purpose | How to Use |
|---|---|---|
| **Firebase Auth** | Login/Register | Built-in, no extra key needed |
| **Firestore** | Real-time database | Built-in |
| **Firebase Storage** | File uploads | Built-in |
| **Chart.js (CDN)** | Progress charts | Already loaded via CDN — no key needed |
| **Font Awesome (CDN)** | Icons | Already loaded — no key needed |
| **Google Fonts (CDN)** | Typography | Already loaded — no key needed |

**No paid APIs are used.** Everything runs on Firebase's free Spark plan which includes:
- 1GB Firestore storage
- 10GB/month Storage transfer
- 100K auth operations/day
- Sufficient for a study group of 10-50 users

---

## 🔒 Production Security Checklist

Before going live, update Firestore rules to be more restrictive:

```
// Only group members can write to a group
allow write: if request.auth != null 
             && request.auth.uid in resource.data.members;
```

Also set environment-specific rules for Storage.

---

## ❓ Troubleshooting

**"Missing or insufficient permissions"** → Update Firestore security rules to test mode

**"Firebase: Error (auth/configuration-not-found)"** → Check firebaseConfig values are correct

**"Failed to get document because the client is offline"** → Check internet connection; Firebase requires network access

**Calendar not showing events** → Make sure Firestore index for `events` ordered by `date` is created

**File upload fails** → Check Storage rules allow writes; verify storageBucket in config

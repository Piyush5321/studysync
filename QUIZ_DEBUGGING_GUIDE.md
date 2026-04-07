# Quiz Results Debugging Guide

## Quick Test Steps

1. **Open your app and go to Quiz section**
2. **Open browser console (F12)**
3. **Run this test command:**
   ```javascript
   window.testQuizResultsSetup()
   ```

This will show you if all components are ready. You should see:
- ✓ window.currentUser: Available
- ✓ window.db: Available
- ✓ window.firebaseModules: Available
- All functions showing as "function"

## If Setup Test Passes

4. **Run the manual save test:**
   ```javascript
   window.testSaveQuizResult()
   ```

Watch the console for:
- "=== SAVING QUIZ RESULT ===" 
- "✅ Document added successfully" with a Document ID
- "✅ Results refreshed and displayed"

If you see these messages, the system is working!

## If Setup Test Fails

Check which component is NOT available:

### If window.currentUser is NOT AVAILABLE:
- User is not logged in
- Solution: Log in first

### If window.db is NOT AVAILABLE:
- Firebase Firestore is not initialized
- Check if app.js is loading properly
- Check browser console for Firebase errors

### If window.firebaseModules is NOT AVAILABLE:
- Firebase modules are not exported from app.js
- Check if app.js is loading as a module
- Check if the export statement exists in app.js

## When Taking a Real Quiz

1. Take a quiz and submit it
2. Watch the console for these logs:
   - "=== QUIZ COMPLETED ===" (from quiz-generator.js)
   - "Calling saveQuizResult asynchronously..." (from quiz-generator.js)
   - "=== SAVING QUIZ RESULT ===" (from quiz-results-tracker.js)
   - "✅ Document added successfully" (from quiz-results-tracker.js)

## Common Issues

### Issue: "User not authenticated"
- Solution: Make sure you're logged in
- Check: `window.currentUser.uid` in console

### Issue: "Firestore not initialized"
- Solution: Wait for app.js to fully load
- Check: `window.db` in console

### Issue: "Firebase modules not available"
- Solution: Check if app.js loaded properly
- Check: `window.firebaseModules` in console

### Issue: "Error saving result: Permission denied"
- Solution: Check Firestore rules
- The rules should allow authenticated users to create quiz_results
- Current rule: `allow create: if request.auth != null;`

### Issue: "Error saving result: Missing or insufficient permissions"
- Solution: Same as above - check Firestore rules
- Make sure userId field is being saved correctly

## Firestore Rules Check

The quiz_results collection should have these rules:
```
match /quiz_results/{document=**} {
  allow create: if request.auth != null;
  allow read: if request.auth.uid == resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}
```

## Data Being Saved

Each quiz result should have:
- userId: User's UID
- userName: User's display name
- topic: Quiz topic
- difficulty: easy/medium/hard
- totalQuestions: Number of questions
- correctAnswers: Number correct
- percentage: Score percentage
- timestamp: ISO date string
- createdAt: JavaScript Date object

## If Still Not Working

1. Check browser console for any error messages
2. Run: `window.testQuizResultsSetup()` and share the output
3. Run: `window.testSaveQuizResult()` and share any errors
4. Check Firestore console to see if any documents are being created
5. Check if there are any permission errors in Firestore logs

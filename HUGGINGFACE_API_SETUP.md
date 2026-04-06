# HuggingFace API Key Setup Guide

## 🎯 Where to Enter Your API Key

You have **3 options** to enter your HuggingFace API key:

---

## Option 1: Settings Page (Recommended - Easiest)

### Steps:

1. **Open Dashboard** - Log in to your StudySync app
2. **Click Settings Icon** - Top right corner (⚙️ icon)
3. **Click "AI Settings"** button
4. **Scroll down** to "HuggingFace API Key" section
5. **Paste your token** in the input field
6. **Click "Save Token"** button
7. **Click "Test Connection"** to verify it works

### Location in Code:
- **File**: `dashboard.html`
- **Line**: ~1090 (in AI Settings Modal)
- **Input ID**: `hfTokenInput`

---

## Option 2: Browser Console (Quick Test)

### Steps:

1. **Open Developer Tools** - Press `F12` on your keyboard
2. **Go to Console tab**
3. **Paste this command**:
```javascript
window.setHuggingFaceToken('hf_YOUR_API_KEY_HERE')
```
4. **Replace** `hf_YOUR_API_KEY_HERE` with your actual token
5. **Press Enter**

### Example:
```javascript
window.setHuggingFaceToken('hf_abcdefghijklmnopqrstuvwxyz123456')
```

### Location in Code:
- **File**: `js/task-proof-verification.js`
- **Line**: ~280 (getHuggingFaceToken function)
- **Function**: `setHuggingFaceToken(token)`

---

## Option 3: Direct Code Edit (Permanent)

### Steps:

1. **Open** `js/task-proof-verification.js`
2. **Find line ~280** - Look for `getHuggingFaceToken()` function
3. **Modify the function**:

```javascript
// BEFORE:
function getHuggingFaceToken() {
    return localStorage.getItem('hf_token') || '';
}

// AFTER:
function getHuggingFaceToken() {
    return localStorage.getItem('hf_token') || 'hf_YOUR_API_KEY_HERE';
}
```

4. **Replace** `hf_YOUR_API_KEY_HERE` with your actual token
5. **Save the file**

### ⚠️ Warning:
- This method stores the key in code (not recommended for production)
- Better to use Option 1 or 2

---

## 🔑 How to Get Your HuggingFace API Key

### Step 1: Create Account
- Go to https://huggingface.co
- Click "Sign Up"
- Create your account

### Step 2: Get API Token
- Go to https://huggingface.co/settings/tokens
- Click "New token"
- Give it a name (e.g., "StudySync")
- Select "Read" access
- Click "Create token"
- **Copy the token** (starts with `hf_`)

### Step 3: Save Somewhere Safe
- Copy the token to a text file
- Keep it private (don't share!)
- You'll need it for the app

---

## ✅ Verification

### How to Know It's Working:

1. **Go to AI Settings** (⚙️ icon)
2. **Click "Test Connection"** button
3. **Wait 2-3 seconds**
4. **You should see**: ✓ Token is valid and working!

### If It Fails:
- Check token is correct (copy-paste carefully)
- Verify token starts with `hf_`
- Make sure you have internet connection
- Try creating a new token on HuggingFace

---

## 📍 File Locations Reference

| Option | File | Line | Function |
|--------|------|------|----------|
| Settings UI | `dashboard.html` | ~1090 | AI Settings Modal |
| Save Function | `js/app.js` | ~990 | `saveHFToken()` |
| Test Function | `js/app.js` | ~1020 | `testHFToken()` |
| Get Token | `js/task-proof-verification.js` | ~280 | `getHuggingFaceToken()` |
| Set Token | `js/task-proof-verification.js` | ~285 | `setHuggingFaceToken()` |

---

## 🔒 Security Notes

- Token is stored in **browser localStorage** (local only)
- Never sent to our servers
- Only used for HuggingFace API calls
- Clear browser data to remove token

---

## 🆘 Troubleshooting

### "Invalid token format"
- Make sure token starts with `hf_`
- Copy entire token (don't cut off the end)

### "Connection failed"
- Check internet connection
- Verify HuggingFace website is accessible
- Try creating a new token

### "Token not saving"
- Check browser allows localStorage
- Try clearing browser cache
- Use incognito/private window to test

### "Still not working?"
- Use Option 2 (Console) to test
- Check browser console for errors (F12)
- Verify token has "Read" access on HuggingFace

---

## 📝 Quick Reference

**Recommended Flow:**
1. Get token from HuggingFace
2. Open AI Settings in app
3. Paste token in input field
4. Click "Save Token"
5. Click "Test Connection"
6. Done! ✓

**Token Format:**
```
hf_abcdefghijklmnopqrstuvwxyz1234567890
```

**Storage Location:**
```
Browser localStorage → 'hf_token' key
```

---

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready to Use

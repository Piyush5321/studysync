# 🔑 API Key Setup - Step by Step

## Where to Paste Your API Key

### File: `js/task-proof-verification.js`
### Line: 6

---

## Step 1: Get Your Free HuggingFace API Key

1. Go to: https://huggingface.co/settings/tokens
2. Click **"New token"** button
3. Enter a name: `StudySync` (or any name)
4. Select **"Read"** access
5. Click **"Create token"**
6. **Copy the token** (it starts with `hf_`)

Example token:
```
hf_abcdefghijklmnopqrstuvwxyz1234567890
```

---

## Step 2: Open the File

1. Open your code editor
2. Navigate to: `js/task-proof-verification.js`
3. Go to **Line 6**

---

## Step 3: Find This Line

You'll see:
```javascript
const HUGGINGFACE_API_KEY = 'hf_YOUR_API_KEY_HERE';
```

---

## Step 4: Replace the Placeholder

### BEFORE:
```javascript
const HUGGINGFACE_API_KEY = 'hf_YOUR_API_KEY_HERE';
```

### AFTER (Example):
```javascript
const HUGGINGFACE_API_KEY = 'hf_abcdefghijklmnopqrstuvwxyz1234567890';
```

### AFTER (Your actual key):
```javascript
const HUGGINGFACE_API_KEY = 'hf_YOUR_ACTUAL_TOKEN_HERE';
```

---

## Step 5: Save the File

1. **Save** the file (Ctrl+S or Cmd+S)
2. **Hard refresh** your browser (Ctrl+Shift+R)
3. Done! ✅

---

## ✅ How to Verify It Works

1. Open your StudySync app
2. Go to **⚙️ AI Settings**
3. Scroll to **"HuggingFace API Key"** section
4. Click **"Test Connection"** button
5. You should see: **✓ Token is valid and working!**

---

## 📍 Exact Location in Code

```
File: js/task-proof-verification.js
Line: 6
Variable: HUGGINGFACE_API_KEY
```

Visual guide:
```javascript
1  // Task Proof Verification System - AI-powered task completion validation
2  console.log("Loading task-proof-verification.js...");
3  
4  // ⚠️ PASTE YOUR HUGGINGFACE API KEY HERE ⚠️
5  // Get your free API key from: https://huggingface.co/settings/tokens
6  const HUGGINGFACE_API_KEY = 'hf_YOUR_API_KEY_HERE';  ← PASTE HERE
7  
8  var verificationDB = null;
```

---

## 🔄 How It Works Now

Once you paste your API key, the system will:

1. **Check localStorage first** (if you saved via Settings)
2. **Use code constant** (your pasted key)
3. **Fallback to local validation** (if no key available)

This means it works in **multiple ways**:
- ✅ Via Settings page
- ✅ Via browser console
- ✅ Via code constant (what you're doing now)
- ✅ Fallback validation (always works)

---

## 🆘 Troubleshooting

### "Still not working?"

1. **Check the token format**
   - Must start with `hf_`
   - Should be 40+ characters long
   - No spaces or extra characters

2. **Verify you saved the file**
   - Look for the dot/asterisk next to filename (unsaved indicator)
   - Press Ctrl+S to save

3. **Hard refresh the browser**
   - Press Ctrl+Shift+R (Windows/Linux)
   - Press Cmd+Shift+R (Mac)
   - Or clear browser cache

4. **Check browser console for errors**
   - Press F12
   - Go to Console tab
   - Look for red error messages

5. **Test the token on HuggingFace**
   - Go to https://huggingface.co/settings/tokens
   - Verify token is still active
   - Create a new token if needed

---

## 📝 Example Complete Setup

### Your API Key (from HuggingFace):
```
hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789
```

### What to paste in Line 6:
```javascript
const HUGGINGFACE_API_KEY = 'hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789';
```

### Full context (Lines 1-10):
```javascript
// Task Proof Verification System - AI-powered task completion validation
console.log("Loading task-proof-verification.js...");

// ⚠️ PASTE YOUR HUGGINGFACE API KEY HERE ⚠️
// Get your free API key from: https://huggingface.co/settings/tokens
const HUGGINGFACE_API_KEY = 'hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789';

var verificationDB = null;
var verificationUser = null;
var verificationGroupId = null;
```

---

## ✨ Features Now Enabled

Once API key is set, you can:

✅ **Submit task proofs** with screenshots  
✅ **AI validates** proof relevance  
✅ **OCR extracts** text from images  
✅ **Confidence scoring** (0-100%)  
✅ **Auto-complete** verified tasks  
✅ **Trust score** tracking  

---

## 🔒 Security Note

- Your API key is stored in the code
- It's only used for HuggingFace API calls
- Never shared with external servers
- Keep it private (don't commit to public repos)

---

## 📞 Quick Reference

| Step | Action |
|------|--------|
| 1 | Get token from https://huggingface.co/settings/tokens |
| 2 | Open `js/task-proof-verification.js` |
| 3 | Go to Line 6 |
| 4 | Replace `'hf_YOUR_API_KEY_HERE'` with your token |
| 5 | Save file (Ctrl+S) |
| 6 | Hard refresh browser (Ctrl+Shift+R) |
| 7 | Test in AI Settings |

---

**Status**: Ready to Use  
**Last Updated**: 2024  
**Version**: 1.0

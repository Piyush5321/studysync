# 🔧 Troubleshooting: "Invalid token or connection failed"

## Problem
You're seeing this error when testing your HuggingFace API key:
```
✗ Invalid token or connection failed
```

## Solutions

### Solution 1: Verify Token Format

Your token **MUST** start with `hf_`

**Check:**
1. Go to https://huggingface.co/settings/tokens
2. Look at your token
3. It should look like: `hf_abcdefghijklmnopqrstuvwxyz1234567890`

**If it doesn't start with `hf_`:**
- Delete the token
- Create a new one
- Copy the entire token (don't cut it off)

---

### Solution 2: Check Token is Active

1. Go to https://huggingface.co/settings/tokens
2. Look for your token in the list
3. Make sure it's **not disabled** or **expired**
4. If it's disabled, delete it and create a new one

---

### Solution 3: Paste Token Correctly

**In Settings Page:**
1. Open AI Settings (⚙️ icon)
2. Scroll to "HuggingFace API Key" section
3. **Clear the input field** completely
4. **Paste your token** (Ctrl+V)
5. Make sure there are **no extra spaces** before or after
6. Click **"Save Token"**
7. Click **"Test Connection"**

**In Code (js/task-proof-verification.js, Line 7):**
```javascript
// WRONG - has placeholder
const HUGGINGFACE_API_KEY = 'hf_YOUR_API_KEY_HERE';

// CORRECT - has actual token
const HUGGINGFACE_API_KEY = 'hf_abcdefghijklmnopqrstuvwxyz1234567890';
```

---

### Solution 4: Check Browser Console for Details

1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Look for error messages
4. Common errors:
   - `401 Unauthorized` → Token is invalid
   - `403 Forbidden` → Token doesn't have read access
   - `Network error` → Internet connection issue

---

### Solution 5: Create a New Token

If your token keeps failing:

1. Go to https://huggingface.co/settings/tokens
2. **Delete** the old token (click trash icon)
3. Click **"New token"**
4. Enter name: `StudySync`
5. Select **"Read"** access (important!)
6. Click **"Create token"**
7. **Copy immediately** (you won't see it again)
8. Paste in Settings page
9. Click **"Test Connection"**

---

### Solution 6: Check Internet Connection

1. Make sure you have **internet connection**
2. Try visiting https://huggingface.co in your browser
3. If it loads, your connection is fine
4. If not, fix your internet first

---

### Solution 7: Try Different Browser

Sometimes browser cache causes issues:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. Or use **Incognito/Private window**
3. Try testing again

---

### Solution 8: Check Token Permissions

Your token needs **"Read"** access:

1. Go to https://huggingface.co/settings/tokens
2. Click on your token
3. Check it has **"Read"** permission
4. If not, delete and create new one with Read access

---

## Step-by-Step Verification

### Step 1: Verify Token Format
```
Token should look like:
hf_abcdefghijklmnopqrstuvwxyz1234567890

NOT like:
hf_YOUR_API_KEY_HERE
YOUR_API_KEY_HERE
abcdefghijklmnopqrstuvwxyz1234567890
```

### Step 2: Verify Token is Active
- Go to https://huggingface.co/settings/tokens
- Your token should be in the list
- It should NOT be disabled

### Step 3: Verify Paste is Correct
- No extra spaces
- No line breaks
- Starts with `hf_`
- At least 40 characters long

### Step 4: Check Console for Errors
- Press F12
- Go to Console tab
- Look for red error messages
- Screenshot the error if needed

---

## Quick Checklist

- [ ] Token starts with `hf_`
- [ ] Token is at least 40 characters
- [ ] Token is active (not disabled)
- [ ] Token has "Read" access
- [ ] No extra spaces in token
- [ ] Pasted in correct location
- [ ] Browser cache cleared
- [ ] Internet connection working
- [ ] Hard refresh done (Ctrl+Shift+R)

---

## If Still Not Working

### Option A: Use Fallback Validation
The system has a **fallback validator** that works without API key:
- Keyword matching
- Explanation analysis
- No internet required
- Less accurate but still works

### Option B: Contact HuggingFace Support
- Go to https://huggingface.co/support
- Describe your issue
- They can help with token problems

### Option C: Use Console Method
```javascript
// Open browser console (F12)
// Paste this:
window.setHuggingFaceToken('hf_YOUR_TOKEN_HERE')
```

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid format! Token must start with "hf_"` | Wrong token format | Get new token from HF |
| `Unauthorized - Token is invalid or expired` | Token is wrong/expired | Create new token |
| `HTTP 401` | Authentication failed | Check token is correct |
| `HTTP 403` | No read permission | Create token with Read access |
| `Network error` | No internet | Check connection |
| `HTTP 503` | HF server busy | Wait and try again |

---

## Debug Mode

To see detailed logs:

1. Open browser console (F12)
2. Look for messages like:
   - `✅ HuggingFace API Key configured in code`
   - `⚠️ HuggingFace API Key NOT configured`
   - `HF API Response Status: 200`
   - `HF Token Test Error: ...`

These tell you exactly what's happening.

---

## Still Stuck?

Try this order:

1. **Create new token** on HuggingFace
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Hard refresh** (Ctrl+Shift+R)
4. **Paste token** in Settings
5. **Test Connection**
6. **Check console** (F12) for errors
7. **Try incognito window**
8. **Try different browser**

---

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Troubleshooting Guide

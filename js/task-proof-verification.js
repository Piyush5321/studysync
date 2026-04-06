// Task Proof Verification System - AI-powered task completion validation
console.log("Loading task-proof-verification.js...");

// ⚠️ PASTE YOUR HUGGINGFACE API KEY HERE ⚠️
// Get your free API key from: https://huggingface.co/settings/tokens
// Example: const HUGGINGFACE_API_KEY = 'hf_abcdefghijklmnopqrstuvwxyz1234567890';
const HUGGINGFACE_API_KEY = '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';

// Debug: Log if API key is configured
if (HUGGINGFACE_API_KEY && HUGGINGFACE_API_KEY !== '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') {
    console.log("✅ HuggingFace API Key configured in code");
} else {
    console.warn("⚠️ HuggingFace API Key NOT configured. Please add your token to line 7 of task-proof-verification.js");
}

var verificationDB = null;
var verificationUser = null;
var verificationGroupId = null;
var currentVerificationTask = null;
var ocrWorker = null;

// Initialize Tesseract OCR Worker
function initOCRWorker() {
    if (typeof Tesseract !== 'undefined') {
        Tesseract.createWorker().then(function (worker) {
            ocrWorker = worker;
            console.log("✅ OCR Worker initialized");
        }).catch(function (e) {
            console.warn("OCR Worker initialization failed:", e);
        });
    }
}

function initTaskProofVerification(db, user, gid) {
    verificationDB = db;
    verificationUser = user;
    verificationGroupId = gid;
    initOCRWorker();
    console.log("Task Proof Verification initialized");
}

function openProofModal(taskId, taskTitle, taskDescription) {
    var modal = document.getElementById('proofVerificationModal');
    if (!modal) return;

    currentVerificationTask = {
        id: taskId,
        title: taskTitle,
        description: taskDescription
    };

    modal.classList.remove('hidden');
    document.getElementById('proofTaskTitle').textContent = taskTitle;
    document.getElementById('proofImagePreview').innerHTML = '';
    document.getElementById('proofExplanation').value = '';
    document.getElementById('proofUploadStatus').innerHTML = '';
}

function closeProofModal() {
    var modal = document.getElementById('proofVerificationModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentVerificationTask = null;
}

function handleProofImageUpload(event) {
    var file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
        var preview = document.getElementById('proofImagePreview');
        preview.innerHTML = '<img src="' + e.target.result + '" alt="Proof" class="proof-preview-img" />';
        preview.dataset.imageData = e.target.result;
    };
    reader.readAsDataURL(file);
}

function submitProof() {
    var explanation = document.getElementById('proofExplanation').value.trim();
    var preview = document.getElementById('proofImagePreview');
    var imageData = preview.dataset.imageData;

    if (!imageData) {
        alert('Please upload an image');
        return;
    }

    if (!explanation || explanation.length < 10) {
        alert('Please provide a meaningful explanation (at least 10 characters)');
        return;
    }

    if (!currentVerificationTask) {
        alert('Task not selected');
        return;
    }

    // Show loading
    var submitBtn = document.getElementById('proofSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
    }

    // Extract text from image
    extractTextFromImage(imageData, function (extractedText) {
        // Validate with AI
        validateWithAI(
            currentVerificationTask.title,
            currentVerificationTask.description,
            extractedText,
            explanation,
            function (result) {
                // Save proof to Firebase
                saveProofToFirebase(
                    currentVerificationTask.id,
                    imageData,
                    explanation,
                    extractedText,
                    result
                );

                // Reset button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Proof';
                }

                // Show result
                showVerificationResult(result);
            }
        );
    });
}

function extractTextFromImage(imageData, callback) {
    var statusDiv = document.getElementById('proofUploadStatus');
    if (statusDiv) {
        statusDiv.innerHTML = '<div class="proof-status-loading"><i class="fa-solid fa-spinner"></i> Extracting text from image...</div>';
    }

    if (!ocrWorker) {
        console.warn("OCR Worker not available, using fallback");
        callback("Image uploaded successfully");
        return;
    }

    ocrWorker.recognize(imageData).then(function (result) {
        var extractedText = result.data.text || '';
        console.log("Extracted text:", extractedText.substring(0, 100));
        callback(extractedText);
    }).catch(function (e) {
        console.warn("OCR extraction failed:", e);
        callback("Image uploaded successfully");
    });
}

function validateWithAI(taskTitle, taskDescription, ocrText, userExplanation, callback) {
    var statusDiv = document.getElementById('proofUploadStatus');
    if (statusDiv) {
        statusDiv.innerHTML = '<div class="proof-status-loading"><i class="fa-solid fa-spinner"></i> Validating with AI...</div>';
    }

    var hfToken = getHuggingFaceToken();

    // If no token, use local validation
    if (!hfToken || hfToken === 'hf_YOUR_API_KEY_HERE') {
        console.warn("No valid HuggingFace token, using local validation");
        var localResult = performLocalValidation(taskTitle, taskDescription, ocrText, userExplanation);
        callback(localResult);
        return;
    }

    // Try multiple API endpoints to avoid CORS issues
    var endpoints = [
        {
            url: "https://api-inference.huggingface.co/models/gpt2",
            method: "POST"
        },
        {
            url: "https://api-inference.huggingface.co/models/distilbert-base-uncased",
            method: "POST"
        }
    ];

    var validationPrompt = "Task: " + taskTitle + "\n" +
        "Description: " + taskDescription + "\n" +
        "Extracted from proof: " + ocrText + "\n" +
        "User explanation: " + userExplanation + "\n\n" +
        "Evaluate if the proof is valid for this task. Respond in JSON: {\"valid\": true/false, \"confidence\": 0-100, \"reason\": \"brief explanation\"}";

    // Try first endpoint
    tryAPIEndpoint(endpoints[0], hfToken, validationPrompt, function (result) {
        if (result) {
            callback(result);
        } else {
            // Fallback to local validation
            console.warn("API validation failed, using local validation");
            var localResult = performLocalValidation(taskTitle, taskDescription, ocrText, userExplanation);
            callback(localResult);
        }
    });
}

function tryAPIEndpoint(endpoint, token, prompt, callback) {
    fetch(endpoint.url, {
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        },
        method: endpoint.method,
        body: JSON.stringify({ inputs: prompt })
    })
        .then(function (response) {
            console.log("API Response Status:", response.status);
            if (!response.ok) throw new Error("API error: " + response.status);
            return response.json();
        })
        .then(function (data) {
            console.log("API Response:", data);
            var responseText = data[0]?.generated_text || data[0] || "";
            var result = parseAIResponse(responseText);
            callback(result);
        })
        .catch(function (error) {
            console.warn("API call failed:", error.message);
            callback(null);
        });
}

function performLocalValidation(taskTitle, taskDescription, ocrText, userExplanation) {
    var combinedText = (ocrText + " " + userExplanation).toLowerCase();
    var taskKeywords = extractKeywords(taskTitle + " " + taskDescription);

    var matchedKeywords = 0;
    for (var i = 0; i < taskKeywords.length; i++) {
        if (combinedText.includes(taskKeywords[i].toLowerCase())) {
            matchedKeywords++;
        }
    }

    var keywordMatchPercentage = taskKeywords.length > 0 ? (matchedKeywords / taskKeywords.length) * 100 : 50;
    var explanationLength = userExplanation.length;
    var explanationScore = Math.min(100, (explanationLength / 50) * 100);

    var confidence = Math.round((keywordMatchPercentage * 0.6 + explanationScore * 0.4));
    var isValid = confidence > 50 && explanationLength > 10;

    return {
        valid: isValid,
        confidence: confidence,
        reason: isValid ? "Proof matches task requirements" : "Proof does not sufficiently match task requirements"
    };
}

function extractKeywords(text) {
    var words = text.toLowerCase().split(/\s+/);
    var stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'was', 'are', 'be', 'been', 'being'];
    var keywords = [];

    for (var i = 0; i < words.length; i++) {
        var word = words[i].replace(/[^a-z0-9]/g, '');
        if (word.length > 3 && stopWords.indexOf(word) === -1) {
            keywords.push(word);
        }
    }

    return keywords.slice(0, 10);
}

function parseAIResponse(responseText) {
    try {
        var jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            var result = JSON.parse(jsonMatch[0]);
            return {
                valid: result.valid === true,
                confidence: Math.min(100, Math.max(0, result.confidence || 0)),
                reason: result.reason || "Validation complete"
            };
        }
    } catch (e) {
        console.warn("Failed to parse AI response:", e);
    }

    return performLocalValidation("", "", responseText, "");
}

function showVerificationResult(result) {
    var statusDiv = document.getElementById('proofUploadStatus');
    if (!statusDiv) return;

    var statusClass = result.valid && result.confidence > 70 ? 'success' : result.confidence > 50 ? 'warning' : 'error';
    var statusIcon = result.valid && result.confidence > 70 ? '✓' : result.confidence > 50 ? '⚠' : '✗';

    var html = '<div class="proof-status ' + statusClass + '">';
    html += '<div class="proof-status-icon">' + statusIcon + '</div>';
    html += '<div class="proof-status-content">';
    html += '<div class="proof-status-title">' + (result.valid && result.confidence > 70 ? 'Verified' : result.confidence > 50 ? 'Needs Review' : 'Rejected') + '</div>';
    html += '<div class="proof-status-confidence">Confidence: ' + result.confidence + '%</div>';
    html += '<div class="proof-status-reason">' + escapeHtml(result.reason) + '</div>';
    html += '</div>';
    html += '</div>';

    statusDiv.innerHTML = html;

    // Auto-close modal if verified
    if (result.valid && result.confidence > 70) {
        setTimeout(function () {
            closeProofModal();
        }, 2000);
    }
}

function saveProofToFirebase(taskId, imageData, explanation, extractedText, validationResult) {
    if (!verificationDB || !verificationGroupId) {
        console.error("Firebase not configured");
        return;
    }

    try {
        var modules = window.firebaseModules;
        if (!modules) {
            console.warn("Firebase modules not available");
            return;
        }

        var collection = modules.collection;
        var addDoc = modules.addDoc;
        var serverTimestamp = modules.serverTimestamp;

        var proofsRef = collection(verificationDB, "groups", verificationGroupId, "task_proofs");

        var proofData = {
            taskId: taskId,
            userId: verificationUser.uid,
            userName: verificationUser.displayName || 'Anonymous',
            explanation: explanation,
            extractedText: extractedText,
            validationResult: validationResult,
            status: validationResult.valid && validationResult.confidence > 70 ? 'verified_completed' : validationResult.confidence > 50 ? 'needs_review' : 'rejected',
            confidence: validationResult.confidence,
            createdAt: serverTimestamp()
        };

        addDoc(proofsRef, proofData).then(function (docRef) {
            console.log("Proof saved:", docRef.id);

            // Update task status if verified
            if (validationResult.valid && validationResult.confidence > 70) {
                updateTaskStatus(taskId, 'completed');
                updateUserTrustScore(verificationUser.uid, 5);
            } else if (validationResult.confidence <= 50) {
                updateUserTrustScore(verificationUser.uid, -2);
            }
        }).catch(function (e) {
            console.error("Error saving proof:", e);
            alert('Error saving proof: ' + e.message);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

function updateTaskStatus(taskId, newStatus) {
    if (!verificationDB || !verificationGroupId) return;

    try {
        var modules = window.firebaseModules;
        var doc = modules.doc;
        var updateDoc = modules.updateDoc;

        var taskRef = doc(verificationDB, "groups", verificationGroupId, "tasks", taskId);
        updateDoc(taskRef, { column: newStatus }).catch(function (e) {
            console.warn("Could not update task:", e);
        });
    } catch (e) {
        console.warn("Error updating task:", e);
    }
}

function updateUserTrustScore(userId, points) {
    if (!verificationDB) return;

    try {
        var modules = window.firebaseModules;
        var doc = modules.doc;
        var updateDoc = modules.updateDoc;
        var increment = modules.increment;

        var userRef = doc(verificationDB, "users", userId);
        updateDoc(userRef, {
            trustScore: increment ? increment(points) : 0
        }).catch(function (e) {
            console.warn("Could not update trust score:", e);
        });
    } catch (e) {
        console.warn("Error updating trust score:", e);
    }
}

function getHuggingFaceToken() {
    // Try in this order: localStorage → code constant → empty
    var fromStorage = localStorage.getItem('hf_token');
    if (fromStorage) return fromStorage;

    if (HUGGINGFACE_API_KEY && HUGGINGFACE_API_KEY !== 'hf_YOUR_API_KEY_HERE') {
        return HUGGINGFACE_API_KEY;
    }

    return '';
}

function setHuggingFaceToken(token) {
    localStorage.setItem('hf_token', token);
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export to window
window.initTaskProofVerification = initTaskProofVerification;
window.openProofModal = openProofModal;
window.closeProofModal = closeProofModal;
window.handleProofImageUpload = handleProofImageUpload;
window.submitProof = submitProof;
window.setHuggingFaceToken = setHuggingFaceToken;

console.log("✅ task-proof-verification.js loaded successfully");

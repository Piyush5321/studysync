// js/ai-config.js - AI API Configuration
// Using Free Inference API (No API key needed - completely free)

export const AI_CONFIG = {
    // Using Hugging Face Free Inference API - No authentication needed
    API_URL: 'https://api-inference.huggingface.co/models/gpt2',

    // Model
    MODELS: {
        TEXT_GENERATION: 'gpt2',
        CHAT: 'gpt2'
    }
};

export function initializeAIConfig() {
    console.log('AI Config initialized - using free inference API');
    return true;
}

export function setAIApiKey(apiKey) {
    if (apiKey && apiKey.trim()) {
        localStorage.setItem('ai_api_key', apiKey.trim());
        return true;
    }
    return false;
}

export function getAIApiKey() {
    return localStorage.getItem('ai_api_key') || '';
}

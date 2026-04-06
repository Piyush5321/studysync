// js/ai-config.js - AI API Configuration
// Using OpenRouter API (Free tier available)

export const AI_CONFIG = {
    // OpenRouter API Key - Replace with your own from https://openrouter.ai
    OPENROUTER_API_KEY: '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',
    OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',

    // Free models available on OpenRouter
    MODELS: {
        TEXT_GENERATION: 'gpt-3.5-turbo',
        CHAT: 'gpt-3.5-turbo'
    }
};

export function initializeAIConfig() {
    const savedKey = localStorage.getItem('openrouter_api_key');
    if (!savedKey || savedKey === 'YOUR_OPENROUTER_API_KEY') {
        console.warn('OpenRouter API key not configured. AI features will be limited.');
        return false;
    }
    return true;
}

export function setAIApiKey(apiKey) {
    if (apiKey && apiKey.trim()) {
        localStorage.setItem('openrouter_api_key', apiKey.trim());
        AI_CONFIG.OPENROUTER_API_KEY = apiKey.trim();
        return true;
    }
    return false;
}

export function getAIApiKey() {
    return AI_CONFIG.OPENROUTER_API_KEY;
}

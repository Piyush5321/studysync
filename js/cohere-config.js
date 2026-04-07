// Cohere API Configuration
// PASTE YOUR API KEY HERE:
const COHERE_API_KEY = "CUTY6wD2NhDTaIJW36Sl9oXgU6LFnrUcs0QArYp4";

// Function to generate quiz questions using Cohere API
async function generateQuizWithCohere(topic, difficulty, numQuestions) {
    try {
        console.log("🎯 QUIZ GENERATION START");
        console.log("   Topic:", topic);
        console.log("   Difficulty:", difficulty);
        console.log("   Questions:", numQuestions);
        console.log("   API Key exists:", !!COHERE_API_KEY && COHERE_API_KEY !== "PASTE_YOUR_API_KEY_HERE");

        // First, try Cohere API
        if (COHERE_API_KEY && COHERE_API_KEY !== "PASTE_YOUR_API_KEY_HERE") {
            try {
                console.log("📡 Calling Cohere API with topic:", topic);
                const prompt = `Generate exactly ${numQuestions} multiple choice questions on the topic "${topic}". 
Difficulty level: ${difficulty}.

Each question must have:
- A clear question
- Exactly 4 options labeled A, B, C, D
- The correct answer (A, B, C, or D)

Return ONLY valid JSON in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "A"
  }
]

Do not include any text before or after the JSON. Only return the JSON array.`;

                console.log("📝 Prompt being sent:", prompt.substring(0, 100) + "...");

                const response = await fetch("https://api.cohere.ai/v1/generate", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${COHERE_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "command",
                        prompt: prompt,
                        max_tokens: 2000,
                        temperature: 0.8,
                        return_likelihoods: "NONE"
                    })
                });

                console.log("📊 Cohere API response status:", response.status);

                if (response.ok) {
                    const data = await response.json();
                    const generatedText = data.generations[0].text.trim();
                    console.log("✅ Cohere API response received");
                    console.log("📄 Generated text (first 200 chars):", generatedText.substring(0, 200));

                    // Parse JSON response
                    let questions;
                    try {
                        questions = JSON.parse(generatedText);
                        console.log("✅ JSON parsed successfully. Questions count:", questions.length);
                        console.log("📋 First question:", questions[0]);
                    } catch (parseError) {
                        console.warn("⚠️ JSON parse error, trying to extract JSON...");
                        // Try to extract JSON from response
                        const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
                        if (jsonMatch) {
                            questions = JSON.parse(jsonMatch[0]);
                            console.log("✅ JSON extracted and parsed. Questions:", questions.length);
                        } else {
                            throw new Error("Invalid JSON response from Cohere API");
                        }
                    }

                    // Validate and process questions
                    const validatedQuestions = questions.map((q, index) => {
                        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.answer) {
                            throw new Error(`Question ${index + 1} has invalid format`);
                        }

                        const answerIndex = q.answer.charCodeAt(0) - 65; // Convert A/B/C/D to 0/1/2/3
                        const correctAnswer = q.options[answerIndex];

                        return {
                            question: String(q.question).trim(),
                            options: q.options.map(opt => String(opt).trim()),
                            correctAnswer: correctAnswer || String(q.options[0]).trim()
                        };
                    });

                    console.log("✅ Questions validated and processed. Returning", validatedQuestions.length, "questions");
                    console.log("🎯 QUIZ GENERATION SUCCESS - Using Cohere API");
                    return validatedQuestions;
                } else {
                    const errorText = await response.text();
                    console.warn("❌ Cohere API failed with status:", response.status);
                    console.warn("❌ Error response:", errorText);
                    console.warn("Falling back to Open Trivia Database");
                    return generateQuizWithOpenTrivia(topic, difficulty, numQuestions);
                }
            } catch (error) {
                console.warn("❌ Cohere API error:", error.message);
                console.warn("Falling back to Open Trivia Database");
                return generateQuizWithOpenTrivia(topic, difficulty, numQuestions);
            }
        } else {
            console.warn("⚠️ No API key found, using Open Trivia Database");
            return generateQuizWithOpenTrivia(topic, difficulty, numQuestions);
        }

    } catch (error) {
        console.error("❌ Error generating quiz:", error);
        throw error;
    }
}

// Fallback: Generate quiz using Open Trivia Database
async function generateQuizWithOpenTrivia(topic, difficulty, numQuestions) {
    console.log("📚 OPEN TRIVIA FALLBACK - Topic:", topic);

    const categoryMap = {
        'science': 17, 'history': 23, 'geography': 22, 'sports': 21, 'entertainment': 11,
        'general': 9, 'math': 19, 'technology': 18, 'literature': 26, 'music': 12,
        'biology': 17, 'chemistry': 17, 'physics': 17, 'nature': 17, 'art': 25,
        'mythology': 20, 'tv': 14, 'video games': 15, 'books': 26, 'animals': 27,
        'computer': 18, 'programming': 18, 'coding': 18, 'web': 18, 'database': 18,
        'english': 26, 'language': 26, 'grammar': 26, 'writing': 26,
        'economics': 9, 'business': 9, 'finance': 9, 'accounting': 9,
        'psychology': 9, 'sociology': 9, 'philosophy': 9,
        'medicine': 9, 'health': 9, 'anatomy': 9, 'physiology': 9,
        'chemistry': 17, 'physics': 17, 'astronomy': 17, 'geology': 17,
        'botany': 27, 'zoology': 27, 'ecology': 27, 'environment': 27,
        'art': 25, 'painting': 25, 'sculpture': 25, 'design': 25,
        'music': 12, 'song': 12, 'artist': 12, 'band': 12,
        'movie': 11, 'film': 11, 'cinema': 11, 'actor': 11, 'actress': 11,
        'sports': 21, 'football': 21, 'basketball': 21, 'soccer': 21, 'cricket': 21,
        'history': 23, 'ancient': 23, 'medieval': 23, 'modern': 23, 'war': 23,
        'geography': 22, 'country': 22, 'city': 22, 'continent': 22, 'map': 22,
        'mythology': 20, 'greek': 20, 'roman': 20, 'norse': 20, 'legend': 20,
        'tv': 14, 'television': 14, 'series': 14, 'show': 14, 'episode': 14,
        'video games': 15, 'gaming': 15, 'game': 15, 'console': 15, 'playstation': 15, 'xbox': 15
    };

    const difficultyMap = { 'easy': 'easy', 'medium': 'medium', 'hard': 'hard' };
    const topicLower = topic.toLowerCase().trim();

    // Try exact match first
    let categoryId = categoryMap[topicLower];

    // If no exact match, try to find a partial match
    if (!categoryId) {
        const words = topicLower.split(/\s+/);
        for (const word of words) {
            if (categoryMap[word]) {
                categoryId = categoryMap[word];
                console.log("   ℹ️ Partial match found: '" + word + "' → category", categoryId);
                break;
            }
        }
    }

    // Default to General Knowledge if still no match
    if (!categoryId) {
        categoryId = 9;
        console.log("   ⚠️ No category match found for '" + topic + "', using General Knowledge (category 9)");
    } else {
        console.log("   ✅ Topic matched to category ID:", categoryId);
    }

    const diffParam = difficultyMap[difficulty] || 'medium';

    console.log("🔍 Topic mapping:");
    console.log("   Input topic:", topic);
    console.log("   Lowercase:", topicLower);
    console.log("   Final category ID:", categoryId);
    console.log("   Difficulty:", diffParam);

    const url = `https://opentdb.com/api.php?amount=${numQuestions}&type=multiple&category=${categoryId}&difficulty=${diffParam}`;
    console.log("📡 Fetching from Open Trivia:", url);

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch from Open Trivia Database');

    const data = await response.json();
    console.log("📊 Open Trivia response code:", data.response_code);

    if (data.response_code !== 0) {
        console.error("❌ Open Trivia error code:", data.response_code);
        console.error("   Code meanings: 0=success, 1=no results, 2=invalid parameter, 3=token not returned, 4=token empty, 5=too many requests");

        // If no results for this difficulty, try medium difficulty
        if (data.response_code === 1 && difficulty !== 'medium') {
            console.log("   🔄 Retrying with medium difficulty...");
            return generateQuizWithOpenTrivia(topic, 'medium', numQuestions);
        }

        throw new Error('No questions found for this topic');
    }

    console.log("✅ Received", data.results.length, "questions from Open Trivia");
    console.log("🎯 QUIZ GENERATION SUCCESS - Using Open Trivia Database");

    return data.results.map(q => {
        const allAnswers = [q.correct_answer, ...q.incorrect_answers];
        const shuffled = allAnswers.sort(() => Math.random() - 0.5);

        const decodeHtml = (html) => {
            const txt = document.createElement('textarea');
            txt.innerHTML = html;
            return txt.value;
        };

        return {
            question: decodeHtml(q.question),
            options: shuffled.map(a => decodeHtml(a)),
            correctAnswer: decodeHtml(q.correct_answer)
        };
    });
}

// Export function
window.generateQuizWithCohere = generateQuizWithCohere;

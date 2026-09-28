const QUESTIONS_PER_QUIZ = 5;
const MODEL = "gemini-3.6-flash";
const MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.8-flash"
];

const PG_BLOCKED_TERMS = [
  "thirst trap", "thirst traps", "thirsty", "seductive", "sexy", "hot pic",
  "hookup", "hook up", "make out", "making out", "flirt", "flirting",
  "rizz", "simp", "stan", "slay", "bae", "boo", "crush pic",
  "nude", "naked", "strip", "provocative", "suggestive", "inappropriate",
  "drunk", "alcohol", "beer", "wine", "vodka", "weed", "marijuana",
  "vape", "vaping", "cigarette", "smoking", "drug", "cocaine",
    "damn", "hell", "crap", "shit", "fuck", "bitch", "ass",
    "kill yourself", "suicide", "self-harm", "cutting",
    "post my fits", "fits check", "body count", "ghosting",
    "dm slide", "slide into", "netflix and chill"
];

function isTextPG(text) {
  if (!text || typeof text !== "string") return false;
  const normalized = text.toLowerCase();
  return !PG_BLOCKED_TERMS.some((term) => {
    const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i");
    return pattern.test(normalized);
  });
}

function isQuestionPG(question) {
  if (!question || !question.text || !Array.isArray(question.answers)) return false;
  if (question.answers.length !== 5) return false;
  const textsToCheck = [
    question.category,
    question.text,
    ...question.answers.map((answer) => answer.text)
  ];
  return textsToCheck.every(isTextPG);
}

function isQuestionSetPG(questionSet) {
  return (
    Array.isArray(questionSet) &&
    questionSet.length === QUESTIONS_PER_QUIZ &&
    questionSet.every(isQuestionPG)
  );
}

function normalizeQuestionSet(rawQuestions) {
  return rawQuestions.map((q) => ({
    category: q.category || "Wellness Vibe",
    text: q.text,
    answers: q.answers.map((ans) => {
      const baseScores = ans.scores || {};
      return {
        text: ans.text,
        code: ans.code || "A",
        scores: {
          mystic: baseScores.mystic || 0,
          spark: baseScores.spark || 0,
          creator: baseScores.creator || 0,
          anchor: baseScores.anchor || 0
        }
      };
    })
  }));
}

function buildPrompt(randomSeed) {
  return `Generate exactly 5 fun, engaging personality quiz questions for a Teen Wellness Vibe Check used in a Kaiser Permanente school and healthcare setting.

AUDIENCE & CONTENT RULES (CRITICAL — MUST FOLLOW):
- Audience is school-aged students, including younger kids (approximately ages 10–17).
- ALL content MUST be PG-rated, family-friendly, school-appropriate, and comfortable for every user.
- NEVER include sexual, romantic, suggestive, provocative, or attention-seeking social media behavior.
- NEVER use slang like "thirst trap", "rizz", "post my fits", or any edgy/internet slang that could feel inappropriate.
- NEVER include profanity, crude humor, alcohol, drugs, violence, self-harm, or mature themes.
- Social media questions must focus on positive uses: learning, creativity, staying connected with friends, hobbies, and wellness — never posting for attraction or suggestive content.
- Use warm, inclusive, respectful language that would be approved for a classroom or pediatric waiting room.

Each question should have a category, a question text, and exactly 5 distinct answer choices. Each answer choice must have a code (A, B, C, D, or E) and point weights (scores) for the four wellness vibes: mystic, spark, creator, anchor.

Here are the details of the wellness vibes for scoring guidance:
- mystic: Thrives on quiet reflection, self-awareness, and mental clarity. (e.g., options involving solo relaxation, introspection, quiet, nature, meditation)
- spark: Thrives on energy, staying active, and connecting with others. (e.g., options involving active socializing, sports, high energy, movement)
- creator: Processes the world through art, projects, and self-expression. (e.g., options involving hobbies, design, drawing, writing, building, original ideas)
- anchor: Organized, dependable, balanced, and a reliable friend. (e.g., options involving organization, planners, helping others, stability, routines)

Make sure the questions are fresh, diverse, creative, relatable for students, and completely different from the standard ones. Each question option should assign points (integers, typically 1 to 3) to one or more vibes depending on how it aligns with that personality type.
Ensure that the generation is highly unique and creative (Random Seed: ${randomSeed}).`;
}

function buildGeminiRequestBody(randomSeed) {
  return {
    contents: [
      {
        parts: [{ text: buildPrompt(randomSeed) }]
      }
    ],
    safetySettings: [
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" }
    ],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING" },
            text: { type: "STRING" },
            answers: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  text: { type: "STRING" },
                  code: { type: "STRING" },
                  scores: {
                    type: "OBJECT",
                    properties: {
                      mystic: { type: "INTEGER" },
                      spark: { type: "INTEGER" },
                      creator: { type: "INTEGER" },
                      anchor: { type: "INTEGER" }
                    }
                  }
                },
                required: ["text", "code", "scores"]
              }
            }
          },
          required: ["category", "text", "answers"]
        }
      }
    }
  };
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    sendJson(res, 500, {
      error: "Server is missing GEMINI_API_KEY. Add it in Vercel Environment Variables."
    });
    return;
  }

  let lastError = "Failed to generate questions";

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const randomSeed = Math.random().toString(36).substring(7);

      for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const geminiResponse = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildGeminiRequestBody(randomSeed))
        });

        const geminiPayload = await geminiResponse.json().catch(() => ({}));

        if (!geminiResponse.ok) {
          lastError =
            (geminiPayload.error && geminiPayload.error.message) ||
            `Gemini request failed (${geminiResponse.status})`;
          continue;
        }

        const rawText =
          geminiPayload.candidates &&
          geminiPayload.candidates[0] &&
          geminiPayload.candidates[0].content &&
          geminiPayload.candidates[0].content.parts &&
          geminiPayload.candidates[0].content.parts[0] &&
          geminiPayload.candidates[0].content.parts[0].text;

        if (!rawText) {
          lastError = "Gemini returned an empty response";
          continue;
        }

        let normalizedQuestions;
        try {
          normalizedQuestions = normalizeQuestionSet(JSON.parse(rawText));
        } catch (parseError) {
          lastError = "Gemini returned an empty or invalid response";
          continue;
        }

        if (!isQuestionSetPG(normalizedQuestions)) {
          lastError = "AI-generated questions failed PG content validation";
          break;
        }

        sendJson(res, 200, { questions: normalizedQuestions, model });
        return;
      }
    }

    sendJson(res, 502, { error: lastError });
  } catch (error) {
    sendJson(res, 502, {
      error: error.message || "Failed to generate questions"
    });
  }
};

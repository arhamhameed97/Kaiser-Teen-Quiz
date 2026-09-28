// PG content safety — block inappropriate terms in AI-generated quiz content
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
        ...question.answers.map(answer => answer.text)
    ];

    return textsToCheck.every(isTextPG);
}

function isQuestionSetPG(questionSet) {
    return Array.isArray(questionSet)
        && questionSet.length === QUESTIONS_PER_QUIZ
        && questionSet.every(isQuestionPG);
}

function normalizeQuestionSet(rawQuestions) {
    return rawQuestions.map(q => ({
        category: q.category || "Wellness Vibe",
        text: q.text,
        answers: q.answers.map(ans => {
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

function getRecentFallbackKeys() {
    try {
        const raw = sessionStorage.getItem("recentFallbackKeys");
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function rememberFallbackKeys(selected) {
    const keys = selected.map((q) => q.category + "::" + q.text);
    const merged = [...keys, ...getRecentFallbackKeys()].slice(0, 15);
    try {
        sessionStorage.setItem("recentFallbackKeys", JSON.stringify(merged));
    } catch (e) {
        // Ignore storage failures (private mode, quota, etc.)
    }
}

function getFallbackQuestions() {
    const recent = new Set(getRecentFallbackKeys());
    const fresh = questions.filter((q) => !recent.has(q.category + "::" + q.text));
    const pool = fresh.length >= QUESTIONS_PER_QUIZ ? fresh : questions;
    const selected = shuffleArray(pool).slice(0, QUESTIONS_PER_QUIZ);
    rememberFallbackKeys(selected);
    return selected;
}

// Quiz questions data (10 exact questions with weighted scores)
const questions = [
    {
        category: "Morning Routine",
        text: "You wake up and discover today is completely free.\n\nWhat is your first move?",
        answers: [
            { text: "Go back to sleep", code: "A", scores: { mystic: 3, anchor: 1 } },
            { text: "Check notifications", code: "B", scores: { spark: 1, creator: 1, anchor: 1 } },
            { text: "Find food immediately", code: "C", scores: { anchor: 3 } },
            { text: "Start a project or hobby", code: "D", scores: { creator: 3 } },
            { text: "Go outside", code: "E", scores: { spark: 3, mystic: 1 } }
        ]
    },
    {
        category: "Extra Time",
        text: "You suddenly gain an extra hour every day.\n\nHow are you spending it?",
        answers: [
            { text: "Sleeping", code: "A", scores: { mystic: 3, anchor: 1 } },
            { text: "Hanging out with friends", code: "B", scores: { spark: 2, anchor: 2 } },
            { text: "Gaming or entertainment", code: "C", scores: { creator: 2, mystic: 1 } },
            { text: "Learning something new", code: "D", scores: { creator: 2, anchor: 2 } },
            { text: "Working on a passion project", code: "E", scores: { creator: 3, spark: 1 } }
        ]
    },
    {
        category: "Energy Drain",
        text: "Your phone battery represents your energy this week.\n\nWhat drained it the most?",
        answers: [
            { text: "School", code: "A", scores: { anchor: 3 } },
            { text: "Activities and sports", code: "B", scores: { spark: 3 } },
            { text: "Social media", code: "C", scores: { creator: 2, mystic: 1 } },
            { text: "Family responsibilities", code: "D", scores: { anchor: 3 } },
            { text: "Everything at once", code: "E", scores: { mystic: 2, spark: 2 } }
        ]
    },
    {
        category: "Free Saturday",
        text: "You have a completely open Saturday.\n\nWhich sounds most appealing?",
        answers: [
            { text: "Cozy day indoors", code: "A", scores: { mystic: 3, creator: 1 } },
            { text: "Adventure with friends", code: "B", scores: { spark: 3 } },
            { text: "Creating something cool", code: "C", scores: { creator: 3 } },
            { text: "Exploring somewhere new", code: "D", scores: { spark: 2, creator: 1 } },
            { text: "Catching up on rest", code: "E", scores: { mystic: 3, anchor: 2 } }
        ]
    },
    {
        category: "Character Build",
        text: "You are building your dream character.\n\nWhere do you invest most of your skill points?",
        answers: [
            { text: "Creativity", code: "A", scores: { creator: 3 } },
            { text: "Intelligence", code: "B", scores: { anchor: 2, creator: 1 } },
            { text: "Energy", code: "C", scores: { spark: 3 } },
            { text: "Social connection", code: "D", scores: { spark: 1, anchor: 3 } },
            { text: "Balance", code: "E", scores: { mystic: 3, anchor: 1 } }
        ]
    },
    {
        category: "Stress Survival",
        text: "A stressful week is coming.\n\nWhat is your survival strategy?",
        answers: [
            { text: "Make a detailed plan", code: "A", scores: { anchor: 3 } },
            { text: "Push through it", code: "B", scores: { spark: 3 } },
            { text: "Ask friends for support", code: "C", scores: { anchor: 2, mystic: 1 } },
            { text: "Take breaks when needed", code: "D", scores: { mystic: 3 } },
            { text: "Hope for the best", code: "E", scores: { creator: 2, mystic: 1 } }
        ]
    },
    {
        category: "Post-Goal Reward",
        text: "Which reward sounds best after finishing a huge goal?",
        answers: [
            { text: "Sleep", code: "A", scores: { mystic: 3 } },
            { text: "Food", code: "B", scores: { anchor: 3 } },
            { text: "Time with friends", code: "C", scores: { spark: 2, anchor: 1 } },
            { text: "Starting another challenge", code: "D", scores: { spark: 3 } },
            { text: "Relaxing with entertainment", code: "E", scores: { creator: 2, mystic: 1 } }
        ]
    },
    {
        category: "Superpower Choose",
        text: "Choose a superpower.",
        answers: [
            { text: "Unlimited energy", code: "A", scores: { spark: 3 } },
            { text: "Perfect focus", code: "B", scores: { anchor: 3 } },
            { text: "Instant creativity", code: "C", scores: { creator: 3 } },
            { text: "Teleportation", code: "D", scores: { spark: 2, creator: 1 } },
            { text: "Reading emotions", code: "E", scores: { mystic: 3, anchor: 1 } }
        ]
    },
    {
        category: "Sidekick Pick",
        text: "Pick your ideal sidekick.",
        answers: [
            { text: "Best friend", code: "A", scores: { anchor: 3, spark: 1 } },
            { text: "Coach", code: "B", scores: { spark: 3 } },
            { text: "AI assistant", code: "C", scores: { creator: 2, anchor: 1 } },
            { text: "Pet", code: "D", scores: { mystic: 3 } },
            { text: "Creative partner", code: "E", scores: { creator: 3 } }
        ]
    },
    {
        category: "Relatable Challenge",
        text: "Which challenge feels most relatable?",
        answers: [
            { text: "Overthinking", code: "A", scores: { mystic: 3 } },
            { text: "Procrastination", code: "B", scores: { creator: 2, mystic: 1 } },
            { text: "Doing too much", code: "C", scores: { spark: 2, anchor: 2 } },
            { text: "Running out of energy", code: "D", scores: { spark: 1, mystic: 2, anchor: 1 } },
            { text: "Getting distracted", code: "E", scores: { creator: 3 } }
        ]
    },
    {
        category: "Study Space",
        text: "How does your dream study or chill setup look?",
        answers: [
            { text: "Low lighting, plants, crystals, and quiet", code: "A", scores: { mystic: 3 } },
            { text: "Mood board, art, and color-changing LED lights", code: "B", scores: { creator: 3 } },
            { text: "Super organized desk with a calendar/planner open", code: "C", scores: { anchor: 3 } },
            { text: "A cozy beanbag, music playing, and open door for guests", code: "D", scores: { spark: 3 } },
            { text: "A minimal desk with just a laptop and headphones", code: "E", scores: { anchor: 2, mystic: 1 } }
        ]
    },
    {
        category: "Social Scenario",
        text: "At a party or large gathering, where can you be found?",
        answers: [
            { text: "Deep conversation in a quiet corner with one person", code: "A", scores: { mystic: 3 } },
            { text: "Taking photos, DJing, or discussing fashion/art", code: "B", scores: { creator: 3 } },
            { text: "Helping the host coordinate, organize food, or clean up", code: "C", scores: { anchor: 3 } },
            { text: "In the middle of the crowd, dancing and socializing", code: "D", scores: { spark: 3 } },
            { text: "Hanging out near the pets or food table", code: "E", scores: { mystic: 2, creator: 1 } }
        ]
    },
    {
        category: "Wellness Practice",
        text: "What is your go-to mental health reset?",
        answers: [
            { text: "Meditation, deep breathing, or guided visualization", code: "A", scores: { mystic: 3 } },
            { text: "Playing music, sketching, painting, or journaling", code: "B", scores: { creator: 3 } },
            { text: "Organizing files, planning the week, or making a list", code: "C", scores: { anchor: 3 } },
            { text: "Going for a run, playing sports, or a workout session", code: "D", scores: { spark: 3 } },
            { text: "Venting to a trusted friend or family member", code: "E", scores: { spark: 1, anchor: 2 } }
        ]
    },
    {
        category: "Media Consumption",
        text: "What is your current streaming or podcast vibe?",
        answers: [
            { text: "True crime, psychological mysteries, or philosophy", code: "A", scores: { mystic: 3 } },
            { text: "Independent films, design channels, or video essay analysis", code: "B", scores: { creator: 3 } },
            { text: "Documentaries, self-improvement tips, or news recaps", code: "C", scores: { anchor: 3 } },
            { text: "Action-packed anime, comedy shows, or fast-paced gaming", code: "D", scores: { spark: 3 } },
            { text: "Comfort shows that you've watched 100 times before", code: "E", scores: { mystic: 2, anchor: 1 } }
        ]
    },
    {
        category: "Ideal Gift",
        text: "If someone wanted to give you a thoughtful gift, what would you choose?",
        answers: [
            { text: "A beautiful journal, standard cards, or a luxury candle", code: "A", scores: { mystic: 3 } },
            { text: "Art supplies, customizable keyboard keys, or vinyl records", code: "B", scores: { creator: 3 } },
            { text: "A sleek desk planner, smart water bottle, or productivity app subscription", code: "C", scores: { anchor: 3 } },
            { text: "Concert tickets, outdoor gear, or a multiplayer party game", code: "D", scores: { spark: 3 } },
            { text: "A cozy hoodie, blanket, or comfortable slippers", code: "E", scores: { mystic: 2, anchor: 1 } }
        ]
    },
    {
        category: "Decision Making",
        text: "How do you make important life decisions?",
        answers: [
            { text: "Trusting your gut feeling and inner intuition completely", code: "A", scores: { mystic: 3 } },
            { text: "Brainstorming possibilities and looking for the most authentic path", code: "B", scores: { creator: 3 } },
            { text: "Making a pros/cons list, checking the facts, and planning ahead", code: "C", scores: { anchor: 3 } },
            { text: "Deciding quickly and adapting easily as things unfold", code: "D", scores: { spark: 3 } },
            { text: "Discussing it with every single person you trust", code: "E", scores: { anchor: 1, spark: 2 } }
        ]
    },
    {
        category: "Nature Vibe",
        text: "Which outdoor setting matches your current mood?",
        answers: [
            { text: "A misty, quiet forest trail or a lake at dusk", code: "A", scores: { mystic: 3 } },
            { text: "A vibrant sunset viewpoint looking over a busy city skyline", code: "B", scores: { creator: 3 } },
            { text: "A botanical garden greenhouse or clean mountain peak", code: "C", scores: { anchor: 3 } },
            { text: "A high-energy, sunny beach or amusement park boardwalk", code: "D", scores: { spark: 3 } },
            { text: "A rainy day in a coffee shop looking out the window", code: "E", scores: { mystic: 2, creator: 1 } }
        ]
    },
    {
        category: "Rainy Day",
        text: "It is pouring rain outside. What are you doing inside?",
        answers: [
            { text: "Listening to lo-fi beats, staring at the window, and reflecting", code: "A", scores: { mystic: 3 } },
            { text: "Starting a craft project, drawing, or cooking a new recipe", code: "B", scores: { creator: 3 } },
            { text: "Tidying your room, organizing clothes, or getting ahead on assignments", code: "C", scores: { anchor: 3 } },
            { text: "Voice chatting with friends and playing cooperative games", code: "D", scores: { spark: 3 } },
            { text: "Taking a long nap or binge-watching a movie trilogy", code: "E", scores: { mystic: 2, anchor: 1 } }
        ]
    },
    {
        category: "Conflict Style",
        text: "When a minor disagreement happens in your friend group, what's your style?",
        answers: [
            { text: "Observing quietly and understanding the deeper emotional context", code: "A", scores: { mystic: 3 } },
            { text: "Proposing creative compromises or using humor to lighten the mood", code: "B", scores: { creator: 3 } },
            { text: "Acting as the mediator, reviewing the facts, and restoring peace", code: "C", scores: { anchor: 3 } },
            { text: "Speaking up directly and honestly to clear the air quickly", code: "D", scores: { spark: 3 } },
            { text: "Giving everyone space and waiting for them to cool down", code: "E", scores: { anchor: 2, mystic: 1 } }
        ]
    },
    {
        category: "Future Goals",
        text: "What does success look like for your future?",
        answers: [
            { text: "Feeling at peace, self-aware, and emotionally balanced", code: "A", scores: { mystic: 3 } },
            { text: "Creating a job from your art, design, or original concepts", code: "B", scores: { creator: 3 } },
            { text: "Having a stable career, an organized home, and helping friends", code: "C", scores: { anchor: 3 } },
            { text: "Leading interesting projects and building a large, active network", code: "D", scores: { spark: 3 } },
            { text: "Focusing on simple happiness and enjoying day-to-day moments", code: "E", scores: { anchor: 1, mystic: 2 } }
        ]
    }
];

// Vibe outcomes data
const vibes = {
    mystic: {
        title: "🌙 Mystic",
        name: "Mystic",
        badge: "🌙",
        shortDescription: "Thrives on quiet reflection, self-awareness, and mental clarity.",
        iconClass: "fa-solid fa-moon",
        themeClass: "mystic",
        description: "You thrive on quiet reflection, self-awareness, and mental clarity. You know when to step away from the noise to protect your peace. You recharge best in calming, introspective spaces.",
        strengths: [
            "Deep self-awareness",
            "Emotional intelligence & empathy",
            "Recharging effectively when drained"
        ],
        blindSpots: [
            "Overthinking key decisions",
            "Isolating yourself under stress",
            "Forgetting to ask for external support"
        ],
        tips: [
            "Solo nature walks",
            "Journaling or reading",
            "Listening to lo-fi beats",
            "Sleep and screen-free time"
        ],
        kaiserTip: "Kaiser Permanente offers free access to the Calm mindfulness app for members. You can find guided meditations specifically designed for school stress and sleep."
    },
    spark: {
        title: "⚡ Spark",
        name: "Spark",
        badge: "⚡",
        shortDescription: "Thrives on energy, staying active, and connecting with others.",
        iconClass: "fa-solid fa-bolt",
        themeClass: "spark",
        description: "You thrive on momentum and enjoy staying engaged with people, goals, and experiences. You release stress and charge your battery by moving your body, staying active, and connecting with others.",
        strengths: [
            "High motivation",
            "Strong drive",
            "Quick problem solving"
        ],
        blindSpots: [
            "Burnout",
            "Overcommitting",
            "Forgetting recovery time"
        ],
        tips: [
            "Outdoor movement",
            "Music",
            "Quick mental breaks",
            "Consistent sleep routine"
        ],
        kaiserTip: "Check out Kaiser Permanente's active lifestyle programs and teen health resources for advice on sports nutrition and injury prevention."
    },
    creator: {
        title: "🎨 Creator",
        name: "Creator",
        badge: "🎨",
        shortDescription: "Processes the world through art, projects, and self-expression.",
        iconClass: "fa-solid fa-palette",
        themeClass: "creator",
        description: "You process the world through art, music, projects, and self-expression. You find your calm flow zone by building, designing, or styling. You recharge by letting your imagination wander.",
        strengths: [
            "Creative problem solving",
            "Fresh, unique perspectives",
            "Imaginative exploration"
        ],
        blindSpots: [
            "Procrastination on routine tasks",
            "Getting easily distracted",
            "Neglecting physical self-care routines"
        ],
        tips: [
            "Drawing or crafting",
            "Brainstorming walks",
            "Setting a mood with lighting/music",
            "Sharing ideas with friends"
        ],
        kaiserTip: "Kaiser's teen health hub has incredible resources on mental health and stress relief techniques, validating that creative self-care is vital health care."
    },
    anchor: {
        title: "🧭 Anchor",
        name: "Anchor",
        badge: "🧭",
        shortDescription: "Organized, dependable, balanced, and a reliable friend.",
        iconClass: "fa-solid fa-compass",
        themeClass: "anchor",
        description: "You are organized, balanced, dependable, and grounded. You handle life by preparing, creating structure, and keeping things in order. You are the reliable anchor friend who supports everyone.",
        strengths: [
            "Dependability and loyalty",
            "Grounded calm under pressure",
            "Strong planning and structure"
        ],
        blindSpots: [
            "Carrying others' stress",
            "Putting your own needs last",
            "Resisting change or sudden updates"
        ],
        tips: [
            "Dedicated 'do nothing' times",
            "Quality time with close friends",
            "Organizing a cozy space",
            "Consistent routines and sleep"
        ],
        kaiserTip: "Kaiser Permanente provides online health management tools and private teen chat options for personalized wellness guidance."
    }
};

// Quiz state
const QUESTIONS_PER_QUIZ = 5;
let activeQuestions = [];
let currentQuestionIndex = 0;
let userScores = {
    mystic: 0,
    spark: 0,
    creator: 0,
    anchor: 0
};
let isTransitioning = false;
let vibeChartInstance = null;
let vibePieChartInstance = null;
let userAnswers = [];
let primaryVibeKey = "mystic";

// Helper to shuffle array (Fisher-Yates Shuffle)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// DOM Elements
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const revealScreen = document.getElementById("reveal-screen");
const resultsScreen = document.getElementById("results-screen");
const reviewScreen = document.getElementById("review-screen");
const vibeDetailScreen = document.getElementById("vibe-detail-screen");

const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const reviewBtn = document.getElementById("review-btn");
const reviewBackBtn = document.getElementById("review-back-btn");
const shareBtn = document.getElementById("share-btn");
const vibeBackBtn = document.getElementById("vibe-back-btn");
const vibeStartBtn = document.getElementById("vibe-start-btn");

const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const questionCategory = document.getElementById("question-category");
const questionText = document.getElementById("question-text");
const answersContainer = document.getElementById("answers-container");
const questionCard = document.getElementById("question-card");

const resultIconContainer = document.getElementById("result-icon-container");
const resultTitle = document.getElementById("result-title");
const resultDescription = document.getElementById("result-description");

const resultStrengths = document.getElementById("result-strengths");
const resultBlindSpots = document.getElementById("result-blind-spots");
const resultTips = document.getElementById("result-tips");
const resultKaiserDesc = document.getElementById("result-kaiser-desc");

const vibeDetailIconContainer = document.getElementById("vibe-detail-icon-container");
const vibeDetailTitle = document.getElementById("vibe-detail-title");
const vibeDetailDescription = document.getElementById("vibe-detail-description");
const vibeDetailStrengths = document.getElementById("vibe-detail-strengths");
const vibeDetailBlindSpots = document.getElementById("vibe-detail-blind-spots");
const vibeDetailTips = document.getElementById("vibe-detail-tips");
const vibeDetailKaiserDesc = document.getElementById("vibe-detail-kaiser-desc");
const reviewSummary = document.getElementById("review-summary");
const reviewAlternates = document.getElementById("review-alternates");

// Init application
function init() {
    startBtn.addEventListener("click", startQuiz);
    restartBtn.addEventListener("click", restartQuiz);
    reviewBtn.addEventListener("click", showReviewPage);
    reviewBackBtn.addEventListener("click", showResultsFromReview);
    shareBtn.addEventListener("click", shareResult);

    // Setup review tab switcher listeners
    const tabBtns = document.querySelectorAll(".review-tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const summaryContent = document.getElementById("review-tab-summary-content");
            const alternatesContent = document.getElementById("review-tab-alternates-content");
            
            if (targetTab === "summary") {
                summaryContent.style.display = "block";
                alternatesContent.style.display = "none";
            } else if (targetTab === "alternates") {
                summaryContent.style.display = "none";
                alternatesContent.style.display = "block";
            }
        });
    });

    // Setup vibe tags click interactions
    const vibeTags = document.querySelectorAll(".vibe-tag");

    vibeTags.forEach(tag => {
        const vibeKey = tag.getAttribute("data-vibe");
        const vibeInfo = vibes[vibeKey];

        if (vibeInfo) {
            // Click to view details
            tag.addEventListener("click", () => {
                showVibeDetail(vibeKey);
            });
        }
    });

    // Vibe detail actions
    vibeBackBtn.addEventListener("click", () => {
        vibeDetailScreen.classList.remove("active");
        setTimeout(() => {
            startScreen.classList.add("active");
        }, 400);
    });

    vibeStartBtn.addEventListener("click", () => {
        vibeDetailScreen.classList.remove("active");
        setTimeout(() => {
            startQuiz();
        }, 400);
    });

    init3dTilt();
}

function showVibeDetail(vibeKey) {
    const vibeDetails = vibes[vibeKey];
    if (!vibeDetails) return;

    // Populate detail elements
    vibeDetailTitle.innerText = vibeDetails.name; // Keep name simple
    vibeDetailDescription.innerText = vibeDetails.description;
    
    // Clear and populate strengths
    vibeDetailStrengths.innerHTML = "";
    vibeDetails.strengths.forEach(strength => {
        const li = document.createElement("li");
        li.innerText = strength;
        vibeDetailStrengths.appendChild(li);
    });

    // Clear and populate blind spots
    vibeDetailBlindSpots.innerHTML = "";
    vibeDetails.blindSpots.forEach(bs => {
        const li = document.createElement("li");
        li.innerText = bs;
        vibeDetailBlindSpots.appendChild(li);
    });

    // Clear and populate tips
    vibeDetailTips.innerHTML = "";
    vibeDetails.tips.forEach(tip => {
        const li = document.createElement("li");
        li.innerText = tip;
        vibeDetailTips.appendChild(li);
    });

    // Kaiser Tip
    vibeDetailKaiserDesc.innerText = vibeDetails.kaiserTip;

    // Theme backgrounds/colors
    vibeDetailIconContainer.className = "vibe-illustration";
    vibeDetailIconContainer.classList.add(`theme-${vibeDetails.themeClass}-bg`);
    vibeDetailIconContainer.innerHTML = `<i class="${vibeDetails.iconClass}"></i>`;

    vibeDetailTitle.className = "vibe-title";
    vibeDetailTitle.classList.add(`theme-${vibeDetails.themeClass}`);

    // Switch screen visibility
    startScreen.classList.remove("active");
    setTimeout(() => {
        vibeDetailScreen.classList.add("active");
    }, 400);
}

async function fetchAIQuestions() {
    // Key stays on the server (Vercel env / local .env). Browser never sees it.
    // One retry only for transient errors — quota/rate-limit must not spin more calls.
    const maxAttempts = 2;
    let lastError = "Failed to generate AI questions";

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetch("/api/generate-questions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: "{}"
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                lastError = data.error || `HTTP error! status: ${response.status}`;
                const quotaHit =
                    response.status === 429 ||
                    /quota|rate limit|too many requests/i.test(lastError);
                if (quotaHit || attempt >= maxAttempts) {
                    throw new Error(lastError);
                }
                await new Promise((resolve) => setTimeout(resolve, 1500));
                continue;
            }

            const normalizedQuestions = normalizeQuestionSet(data.questions || []);

            if (!isQuestionSetPG(normalizedQuestions)) {
                lastError = "AI-generated questions failed PG content validation";
                if (attempt >= maxAttempts) {
                    throw new Error(lastError);
                }
                await new Promise((resolve) => setTimeout(resolve, 800));
                continue;
            }

            return normalizedQuestions;
        } catch (error) {
            lastError = error.message || String(error);
            if (
                attempt >= maxAttempts ||
                /quota|rate limit|too many requests/i.test(lastError)
            ) {
                throw new Error(lastError);
            }
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
    }

    throw new Error(lastError);
}

async function startQuiz() {
    activeQuestions = null;

    startScreen.classList.remove("active");
    
    // Repurpose revealScreen as loading overlay
    const revealTextEl = document.getElementById("reveal-message");
    revealScreen.classList.add("active");
    
    // Cycle messages while loading
    const messages = [
        "Connecting to Gemini AI...",
        "Crafting fresh vibes...",
        "Personalizing wellness check...",
        "Still working — Gemini can be busy..."
    ];
    let msgIndex = 0;
    revealTextEl.innerText = messages[0];
    
    const interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        revealTextEl.innerText = messages[msgIndex];
    }, 1200);

    let usedAI = false;
    try {
        const aiQuestions = await fetchAIQuestions();
        if (aiQuestions && aiQuestions.length === QUESTIONS_PER_QUIZ) {
            activeQuestions = aiQuestions;
            usedAI = true;
        }
    } catch (e) {
        console.warn("Using curated PG fallback questions:", e.message || e);
        activeQuestions = getFallbackQuestions();
        revealTextEl.innerText = "AI unavailable — using curated questions";
    } finally {
        clearInterval(interval);
    }

    if (!activeQuestions || activeQuestions.length !== QUESTIONS_PER_QUIZ) {
        activeQuestions = getFallbackQuestions();
    }

    if (usedAI) {
        revealTextEl.innerText = "Fresh AI questions ready";
    }

    setTimeout(() => {
        revealScreen.classList.remove("active");
        setTimeout(() => {
            quizScreen.classList.add("active");
            currentQuestionIndex = 0;
            userScores = { mystic: 0, spark: 0, creator: 0, anchor: 0 };
            userAnswers = [];
            loadQuestion();
        }, 400);
    }, 300);
}

function loadQuestion() {
    const question = activeQuestions[currentQuestionIndex];
    
    // Update progress
    const progressPercent = (currentQuestionIndex / activeQuestions.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
    progressText.innerText = `Question ${currentQuestionIndex + 1} of ${activeQuestions.length}`;
    
    // Set text
    questionCategory.innerText = question.category;
    questionText.innerText = question.text;
    
    // Clear previous options
    answersContainer.innerHTML = "";
    
    // Add options
    question.answers.forEach((answer) => {
        const optionBtn = document.createElement("button");
        optionBtn.classList.add("answer-option");
        
        optionBtn.innerHTML = `
            <span class="answer-badge">${answer.code}</span>
            <span class="answer-text-content">${answer.text}</span>
        `;
        
        optionBtn.addEventListener("click", () => {
            if (isTransitioning) return;
            handleAnswerSelect(answer.scores, optionBtn, answer);
        });
        answersContainer.appendChild(optionBtn);
    });
}

function handleAnswerSelect(scores, selectedBtn, answer) {
    isTransitioning = true;
    
    const question = activeQuestions[currentQuestionIndex];
    
    // Visual feedback
    const options = answersContainer.querySelectorAll(".answer-option");
    options.forEach(opt => {
        if (opt === selectedBtn) {
            opt.classList.add("selected");
        } else {
            opt.classList.add("not-selected");
        }
    });
    
    // Store answer for review page
    userAnswers.push({
        questionIndex: currentQuestionIndex,
        category: question.category,
        text: question.text,
        selected: {
            code: answer.code,
            text: answer.text,
            scores: { ...answer.scores }
        }
    });
    
    // Update scores behind the scenes
    if (scores) {
        Object.keys(scores).forEach(vibe => {
            if (userScores[vibe] !== undefined) {
                userScores[vibe] += scores[vibe];
            }
        });
    }
    
    // Move to next question after small delay for slide transition
    setTimeout(() => {
        currentQuestionIndex++;
        
        if (currentQuestionIndex < activeQuestions.length) {
            // Apply exit animation to the question card
            questionCard.classList.add("exit");
            
            setTimeout(() => {
                loadQuestion();
                questionCard.classList.remove("exit");
                questionCard.classList.add("enter");
                
                setTimeout(() => {
                    questionCard.classList.remove("enter");
                    isTransitioning = false;
                }, 350);
            }, 300);
            
        } else {
            // End quiz - show dramatic reveal sequence
            progressBar.style.width = "100%";
            triggerDramaticReveal();
        }
    }, 450);
}

function triggerDramaticReveal() {
    quizScreen.classList.remove("active");
    
    // Active checking messages sequence
    const revealSteps = [
        "Reading the vibes...",
        "Analyzing your vibe check...",
        "Glow-up calculations in progress...",
        "Finding aesthetic compatibility..."
    ];
    
    const revealTextEl = document.getElementById("reveal-message");
    revealScreen.classList.add("active");
    
    let stepIndex = 0;
    revealTextEl.innerText = revealSteps[0];
    
    const interval = setInterval(() => {
        stepIndex++;
        if (stepIndex < revealSteps.length) {
            revealTextEl.innerText = revealSteps[stepIndex];
        }
    }, 600);
    
    setTimeout(() => {
        clearInterval(interval);
        revealScreen.classList.remove("active");
        showResults();
    }, 2400);
}

function showResults() {
    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
        appContainer.classList.add("wide-layout");
    }

    // Determine highest vibe
    let highestVibe = "mystic";
    let maxScore = -1;
    
    Object.keys(userScores).forEach(vibe => {
        if (userScores[vibe] > maxScore) {
            maxScore = userScores[vibe];
            highestVibe = vibe;
        }
    });
    
    primaryVibeKey = highestVibe;
    
    const vibeDetails = vibes[highestVibe];
    
    // Update UI elements
    resultTitle.innerText = vibeDetails.title;
    resultDescription.innerText = vibeDetails.description;
    resultKaiserDesc.innerText = vibeDetails.kaiserTip;
    
    // Update theme classes on icon container and title
    resultIconContainer.className = "vibe-illustration"; // reset
    resultIconContainer.classList.add(`theme-${vibeDetails.themeClass}-bg`);
    resultIconContainer.innerHTML = `<i class="${vibeDetails.iconClass}"></i>`;
    
    resultTitle.className = "vibe-title"; // reset
    resultTitle.classList.add(`theme-${vibeDetails.themeClass}`);

    // Update 3D card specific styling class
    const vibeCard = document.getElementById("vibe-card-3d");
    if (vibeCard) {
        vibeCard.className = "vibe-card-3d";
        vibeCard.classList.add(`${vibeDetails.themeClass}-card`);
    }
    
    // Populate strengths as chips
    resultStrengths.innerHTML = "";
    vibeDetails.strengths.forEach(strength => {
        const chip = document.createElement("div");
        chip.className = "strength-chip";
        chip.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${strength}`;
        resultStrengths.appendChild(chip);
    });
    
    // Populate blind spots (Watch out for) as chips
    resultBlindSpots.innerHTML = "";
    vibeDetails.blindSpots.forEach(bs => {
        const chip = document.createElement("div");
        chip.className = "blind-spot-chip";
        chip.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${bs}`;
        resultBlindSpots.appendChild(chip);
    });
    
    // Populate tips (Suggested recharge activities) as visual activity cards
    resultTips.innerHTML = "";
    const rechargeIcons = {
        mystic: ["fa-solid fa-leaf", "fa-solid fa-book-open", "fa-solid fa-headphones", "fa-solid fa-moon"],
        spark: ["fa-solid fa-running", "fa-solid fa-music", "fa-solid fa-mug-hot", "fa-solid fa-bed"],
        creator: ["fa-solid fa-paint-brush", "fa-solid fa-compass", "fa-solid fa-lightbulb", "fa-solid fa-user-friends"],
        anchor: ["fa-solid fa-calendar-alt", "fa-solid fa-users", "fa-solid fa-couch", "fa-solid fa-clock"]
    };
    
    const icons = rechargeIcons[highestVibe] || ["fa-solid fa-star"];
    vibeDetails.tips.forEach((tip, idx) => {
        const card = document.createElement("div");
        card.className = `recharge-card ${highestVibe}-recharge`;
        const iconClass = icons[idx % icons.length];
        card.innerHTML = `
            <div class="recharge-card-icon"><i class="${iconClass}"></i></div>
            <div class="recharge-card-text">${tip}</div>
        `;
        resultTips.appendChild(card);
    });
    
    // Render the Chart.js Radar Chart
    renderRadarChart(highestVibe);

    // Render the percentage breakdown chart (Pie Chart)
    renderPieChart();
    
    setTimeout(() => {
        resultsScreen.classList.add("active");
        isTransitioning = false;
    }, 300);
}

function renderRadarChart(highestVibe) {
    if (vibeChartInstance) {
        vibeChartInstance.destroy();
    }

    let vibeColor = "#a78bfa"; // Default mystic purple
    if (highestVibe === "spark") vibeColor = "#fb923c"; // Orange
    if (highestVibe === "creator") vibeColor = "#2eeb5a"; // Green
    if (highestVibe === "anchor") vibeColor = "#06b6d4"; // Cyan

    const ctx = document.getElementById("vibeRadarChart").getContext("2d");
    vibeChartInstance = new Chart(ctx, {
        type: "radar",
        data: {
            labels: ["🌙 Mystic", "⚡ Spark", "🎨 Creator", "🧭 Anchor"],
            datasets: [{
                label: "Vibe Score",
                data: [
                    userScores.mystic,
                    userScores.spark,
                    userScores.creator,
                    userScores.anchor
                ],
                backgroundColor: `${vibeColor}33`,
                borderColor: vibeColor,
                borderWidth: 3,
                pointBackgroundColor: vibeColor,
                pointBorderColor: "#fff",
                pointHoverBackgroundColor: "#fff",
                pointHoverBorderColor: vibeColor,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 24,
                    right: 24,
                    top: 15,
                    bottom: 15
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Score: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    angleLines: {
                        color: "rgba(255, 255, 255, 0.08)"
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.08)"
                    },
                    pointLabels: {
                        color: "#e2e8f0",
                        font: {
                            family: "Outfit",
                            size: 12,
                            weight: "600"
                        }
                    },
                    ticks: {
                        display: false,
                        count: 4
                    },
                    suggestedMin: 0
                }
            }
        }
    });
}

function init3dTilt() {
    const card = document.getElementById("vibe-card-3d");
    if (!card) return;
    const container = card.parentElement;
    const shine = card.querySelector(".vibe-card-shine");

    container.addEventListener("mousemove", (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((centerY - y) / centerY) * 15;
        const rotateY = ((x - centerX) / centerX) * 15;
        
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        if (shine) {
            const shineX = (x / rect.width) * 100;
            const shineY = (y / rect.height) * 100;
            shine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)`;
        }
    });

    container.addEventListener("mouseleave", () => {
        card.style.transform = "rotateX(0deg) rotateY(0deg)";
        if (shine) {
            shine.style.background = `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 60%)`;
        }
    });
}

function renderPieChart() {
    if (vibePieChartInstance) {
        vibePieChartInstance.destroy();
    }

    const totalPoints = Object.values(userScores).reduce((a, b) => a + b, 0);
    const dataValues = [
        totalPoints > 0 ? Math.round((userScores.mystic / totalPoints) * 100) : 25,
        totalPoints > 0 ? Math.round((userScores.spark / totalPoints) * 100) : 25,
        totalPoints > 0 ? Math.round((userScores.creator / totalPoints) * 100) : 25,
        totalPoints > 0 ? Math.round((userScores.anchor / totalPoints) * 100) : 25
    ];

    const ctx = document.getElementById("vibePieChart").getContext("2d");
    vibePieChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["🌙 Mystic", "⚡ Spark", "🎨 Creator", "🧭 Anchor"],
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    "rgba(167, 139, 250, 0.8)", // Mystic (purple)
                    "rgba(251, 146, 60, 0.8)",  // Spark (orange)
                    "rgba(46, 235, 90, 0.8)",   // Creator (green)
                    "rgba(6, 182, 212, 0.8)"    // Anchor (cyan)
                ],
                borderColor: [
                    "rgba(167, 139, 250, 1)",
                    "rgba(251, 146, 60, 1)",
                    "rgba(46, 235, 90, 1)",
                    "rgba(6, 182, 212, 1)"
                ],
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: {
                        color: "#e2e8f0",
                        font: {
                            family: "Outfit",
                            size: 13,
                            weight: "600"
                        },
                        padding: 15,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            const labelColor = chart.options.plugins.legend.labels.color;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map(function(label, i) {
                                    const val = data.datasets[0].data[i];
                                    return {
                                        text: `${label}: ${val}%`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].borderColor[i],
                                        lineWidth: data.datasets[0].borderWidth,
                                        fontColor: labelColor,
                                        hidden: isNaN(data.datasets[0].data[i]) || chart.getDatasetMeta(0).data[i].hidden,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                      }
                  },
                  tooltip: {
                      callbacks: {
                          label: function(context) {
                              return ` ${context.label}: ${context.raw}%`;
                          }
                      }
                  }
              }
          }
      });
  }

function getPrimaryVibeFromScores(scores) {
    let highestVibe = "mystic";
    let maxScore = -1;

    Object.keys(scores).forEach(vibe => {
        if (scores[vibe] > maxScore) {
            maxScore = scores[vibe];
            highestVibe = vibe;
        }
    });

    return highestVibe;
}

function getDominantVibesFromAnswer(scores) {
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore <= 0) return [];

    return Object.keys(scores).filter(vibe => scores[vibe] === maxScore);
}

function getHypotheticalPrimaryVibe(questionIndex, alternateScores) {
    const hypotheticalScores = { ...userScores };
    const userAnswer = userAnswers[questionIndex];

    if (userAnswer && userAnswer.selected.scores) {
        Object.keys(userAnswer.selected.scores).forEach(vibe => {
            hypotheticalScores[vibe] -= userAnswer.selected.scores[vibe];
        });
    }

    Object.keys(alternateScores).forEach(vibe => {
        hypotheticalScores[vibe] += alternateScores[vibe];
    });

    return getPrimaryVibeFromScores(hypotheticalScores);
}

function createVibeTagElement(vibeKey, scoreValue) {
    const vibeInfo = vibes[vibeKey];
    if (!vibeInfo) return null;

    const tag = document.createElement("span");
    tag.className = `review-vibe-tag ${vibeInfo.themeClass}`;
    const scoreStr = scoreValue ? ` (+${scoreValue})` : "";
    tag.innerHTML = `<i class="${vibeInfo.iconClass}"></i> ${vibeInfo.name}${scoreStr}`;
    return tag;
}

function renderReviewPage() {
    reviewSummary.innerHTML = "";
    reviewAlternates.innerHTML = "";

    userAnswers.forEach((entry, index) => {
        const question = activeQuestions[entry.questionIndex];
        if (!question) return;

        // Render Summary Card
        const summaryCard = document.createElement("div");
        summaryCard.className = "review-question-card";

        const selectedScores = entry.selected.scores || {};
        const summaryTagsContainer = document.createElement("div");
        summaryTagsContainer.className = "review-alt-tags";

        Object.keys(selectedScores).forEach(vibeKey => {
            const scoreVal = selectedScores[vibeKey];
            if (scoreVal > 0) {
                const tag = createVibeTagElement(vibeKey, scoreVal);
                if (tag) summaryTagsContainer.appendChild(tag);
            }
        });

        summaryCard.innerHTML = `
            <div class="review-question-header">
                <span class="review-question-number">Q${index + 1}</span>
                <span class="review-question-category">${entry.category}</span>
            </div>
            <p class="review-question-text">${entry.text.replace(/\n/g, "<br>")}</p>
            <div class="review-selected-answer">
                <span class="review-answer-badge">${entry.selected.code}</span>
                <span class="review-answer-text">${entry.selected.text}</span>
                <span class="review-your-pick"><i class="fa-solid fa-check"></i> Your pick</span>
            </div>
        `;
        summaryCard.appendChild(summaryTagsContainer);
        reviewSummary.appendChild(summaryCard);

        // Render Alternate Choices Card
        const alternateCard = document.createElement("div");
        alternateCard.className = "review-alternate-card";
        alternateCard.innerHTML = `
            <div class="review-alternate-header">
                <span class="review-question-number">Q${index + 1}</span>
                <span class="review-question-category">${entry.category}</span>
            </div>
            <p class="review-question-text">${entry.text.replace(/\n/g, "<br>")}</p>
        `;

        const optionsList = document.createElement("div");
        optionsList.className = "review-alt-options";

        question.answers.forEach(answer => {
            const isSelected = answer.code === entry.selected.code;
            const optionEl = document.createElement("div");
            optionEl.className = `review-alt-option${isSelected ? " is-selected" : ""}`;

            const hypotheticalVibe = getHypotheticalPrimaryVibe(index, answer.scores);
            const wouldChangeResult = !isSelected && hypotheticalVibe !== primaryVibeKey;

            optionEl.innerHTML = `
                <div class="review-alt-option-main">
                    <span class="review-answer-badge">${answer.code}</span>
                    <span class="review-answer-text">${answer.text}</span>
                    ${isSelected ? '<span class="review-your-pick"><i class="fa-solid fa-check"></i> Your pick</span>' : ""}
                </div>
            `;

            const tagsRow = document.createElement("div");
            tagsRow.className = "review-alt-tags";

            const scoresObj = answer.scores || {};
            Object.keys(scoresObj).forEach(vibeKey => {
                const val = scoresObj[vibeKey];
                if (val > 0) {
                    const tag = createVibeTagElement(vibeKey, val);
                    if (tag) tagsRow.appendChild(tag);
                }
            });

            if (wouldChangeResult) {
                const shiftBadge = document.createElement("span");
                shiftBadge.className = `review-shift-badge ${vibes[hypotheticalVibe].themeClass}`;
                shiftBadge.innerHTML = `<i class="fa-solid fa-arrow-right-arrow-left"></i> Could shift result to ${vibes[hypotheticalVibe].title}`;
                tagsRow.appendChild(shiftBadge);
            }

            optionEl.appendChild(tagsRow);
            optionsList.appendChild(optionEl);
        });

        alternateCard.appendChild(optionsList);
        reviewAlternates.appendChild(alternateCard);
    });
}

function showReviewPage() {
    renderReviewPage();
    resultsScreen.classList.remove("active");
    setTimeout(() => {
        reviewScreen.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 400);
}

function showResultsFromReview() {
    reviewScreen.classList.remove("active");
    setTimeout(() => {
        resultsScreen.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 400);
}

function restartQuiz() {
    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
        appContainer.classList.remove("wide-layout");
    }

    resultsScreen.classList.remove("active");
    reviewScreen.classList.remove("active");
    setTimeout(() => {
        startScreen.classList.add("active");
    }, 400);
}

function shareResult() {
    const title = resultTitle.innerText;
    if (navigator.share) {
        navigator.share({
            title: 'Find Your Wellness Vibe',
            text: `I took the Wellness Vibe Check and got: ${title}! Find your wellness vibe here:`,
            url: window.location.href,
        }).catch((error) => console.log('Error sharing', error));
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(`I took the Wellness Vibe Check and got: ${title}! Find your vibe at: ${window.location.href}`)
            .then(() => alert("Result copied to clipboard! Share with your friends."));
    }
}

// Run init
window.addEventListener("DOMContentLoaded", init);

import http.server
import socketserver
import os
import json
import re
import time
import urllib.error
import urllib.request

PORT = 8000
MODEL = "gemini-3.6-flash"
MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]
QUESTIONS_PER_QUIZ = 5

PG_BLOCKED_TERMS = [
    "thirst trap", "thirst traps", "thirsty", "seductive", "sexy", "hot pic",
    "hookup", "hook up", "make out", "making out", "flirt", "flirting",
    "rizz", "simp", "stan", "slay", "bae", "boo", "crush pic",
    "nude", "naked", "strip", "provocative", "suggestive", "inappropriate",
    "drunk", "alcohol", "beer", "wine", "vodka", "weed", "marijuana",
    "vape", "vaping", "cigarette", "smoking", "drug", "cocaine",
    "damn", "hell", "crap", "shit", "fuck", "bitch", "ass",
    "kill yourself", "suicide", "self-harm", "cutting",
    "post my fits", "fits check", "body count", "ghosting",
    "dm slide", "slide into", "netflix and chill",
]


def load_dotenv():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


def is_text_pg(text):
    if not isinstance(text, str) or not text:
        return False
    normalized = text.lower()
    for term in PG_BLOCKED_TERMS:
        escaped = re.escape(term.strip())
        pattern = rf"(?:^|[^a-z0-9]){escaped}(?:[^a-z0-9]|$)"
        if re.search(pattern, normalized):
            return False
    return True


def is_question_set_pg(question_set):
    if not isinstance(question_set, list) or len(question_set) != QUESTIONS_PER_QUIZ:
        return False
    for question in question_set:
        answers = question.get("answers") if isinstance(question, dict) else None
        if not isinstance(answers, list) or len(answers) != 5:
            return False
        texts = [question.get("category"), question.get("text")] + [
            answer.get("text") for answer in answers
        ]
        if not all(is_text_pg(text) for text in texts):
            return False
    return True


def normalize_question_set(raw_questions):
    normalized = []
    for question in raw_questions:
        answers = []
        for answer in question.get("answers", []):
            scores = answer.get("scores") or {}
            answers.append(
                {
                    "text": answer.get("text"),
                    "code": answer.get("code") or "A",
                    "scores": {
                        "mystic": scores.get("mystic") or 0,
                        "spark": scores.get("spark") or 0,
                        "creator": scores.get("creator") or 0,
                        "anchor": scores.get("anchor") or 0,
                    },
                }
            )
        normalized.append(
            {
                "category": question.get("category") or "Wellness Vibe",
                "text": question.get("text"),
                "answers": answers,
            }
        )
    return normalized


def build_prompt(random_seed):
    return f"""Generate exactly 5 fun, engaging personality quiz questions for a Teen Wellness Vibe Check used in a Kaiser Permanente school and healthcare setting.

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
Ensure that the generation is highly unique and creative (Random Seed: {random_seed})."""


def build_gemini_request_body(random_seed):
    return {
        "contents": [{"parts": [{"text": build_prompt(random_seed)}]}],
        "safetySettings": [
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_LOW_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_LOW_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_LOW_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_LOW_AND_ABOVE"},
        ],
        "generationConfig": {
            "temperature": 0.7,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "category": {"type": "STRING"},
                        "text": {"type": "STRING"},
                        "answers": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "text": {"type": "STRING"},
                                    "code": {"type": "STRING"},
                                    "scores": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "mystic": {"type": "INTEGER"},
                                            "spark": {"type": "INTEGER"},
                                            "creator": {"type": "INTEGER"},
                                            "anchor": {"type": "INTEGER"},
                                        },
                                    },
                                },
                                "required": ["text", "code", "scores"],
                            },
                        },
                    },
                    "required": ["category", "text", "answers"],
                },
            },
        },
    }


def call_gemini(api_key, model, random_seed):
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    request = urllib.request.Request(
        url,
        data=json.dumps(build_gemini_request_body(random_seed)).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def generate_questions():
    api_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not api_key:
        return 500, {
            "error": "Server is missing GEMINI_API_KEY. Add it to a local .env file."
        }

    last_error = "Failed to generate questions"
    for attempt in range(2):
        random_seed = os.urandom(4).hex()
        for model in MODELS:
            try:
                payload = call_gemini(api_key, model, random_seed)
            except urllib.error.HTTPError as error:
                try:
                    details = json.loads(error.read().decode("utf-8"))
                    last_error = details.get("error", {}).get("message") or str(error)
                except Exception:
                    last_error = str(error)
                time.sleep(0.6)
                continue
            except Exception as error:
                last_error = str(error)
                time.sleep(0.6)
                continue

            try:
                raw_text = payload["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(raw_text)
                normalized = normalize_question_set(parsed)
            except Exception:
                last_error = "Gemini returned an empty or invalid response"
                continue

            if not is_question_set_pg(normalized):
                last_error = "AI-generated questions failed PG content validation"
                break  # retry with a new seed

            return 200, {"questions": normalized, "model": model}

    return 502, {"error": last_error}


class QuizRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if self.path.split("?", 1)[0] != "/api/generate-questions":
            self.send_error(404)
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/api/generate-questions":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0") or 0)
        if length:
            self.rfile.read(length)

        status, payload = generate_questions()
        self._send_json(status, payload)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv()
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), QuizRequestHandler) as httpd:
        key_status = "configured" if (os.environ.get("GEMINI_API_KEY") or "").strip() else "missing"
        print(f"Serving HTTP on port {PORT} with caching disabled...")
        print(f"Gemini API key: {key_status}")
        print("POST /api/generate-questions available for AI question generation")
        httpd.serve_forever()

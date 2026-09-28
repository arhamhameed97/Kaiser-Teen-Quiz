# Kaiser Teen Quiz — Wellness Vibe Check

A teen wellness personality quiz for Kaiser Permanente school and healthcare settings. Built as a static web app with optional AI-generated questions via Google Gemini.

The Gemini API key stays on the server. The browser calls `/api/generate-questions`; it never receives the key.

## Run locally

1. Clone this repository.
2. Copy `.env.example` to `.env` and add your [Gemini API key](https://aistudio.google.com/apikey) (usually starts with `AIza`):
   ```bash
   cp .env.example .env
   ```
3. Start the local server:
   ```bash
   python server.py
   ```
4. Open [http://localhost:8000](http://localhost:8000) in your browser.

If no API key is configured, or Gemini fails, the quiz still runs using built-in fallback questions.

## Deploy on Vercel

1. Import this GitHub repo in Vercel.
2. In **Project Settings → Environment Variables**, add:
   - Name: `GEMINI_API_KEY`
   - Value: your Google AI Studio key
3. Deploy. No build command is required for this static + `/api` setup.

## Project files

- `index.html` — app shell
- `app.js` — quiz logic
- `styles.css` — styling
- `api/generate-questions.js` — Vercel serverless proxy to Gemini
- `server.py` — local static server + same `/api/generate-questions` proxy
- `.env.example` — template for local Gemini key

## License

Created for the Kaiser Permanente Teen Advisory Board Initiative.

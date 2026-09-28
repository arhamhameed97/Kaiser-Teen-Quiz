# Kaiser Teen Quiz — Wellness Vibe Check

A teen wellness personality quiz for Kaiser Permanente school and healthcare settings. Built as a static web app with optional AI-generated questions via Google Gemini.

## Run locally

1. Clone this repository.
2. Copy `config.example.js` to `config.local.js` and add your [Gemini API key](https://aistudio.google.com/apikey):
   ```bash
   cp config.example.js config.local.js
   ```
3. Start the local server:
   ```bash
   python server.py
   ```
4. Open [http://localhost:8000](http://localhost:8000) in your browser.

If no API key is configured, the quiz still runs using built-in fallback questions.

## Project files

- `index.html` — app shell
- `app.js` — quiz logic and optional Gemini integration
- `styles.css` — styling
- `server.py` — simple static file server (port 8000)

## License

Created for the Kaiser Permanente Teen Advisory Board Initiative.

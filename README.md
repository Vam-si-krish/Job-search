# Job Application Assistant

An AI helper that answers job-application questions and replies to recruiter emails
**using your real details**, so you never have to guess what to type for things like
"Do you require sponsorship?" or "What are your salary expectations?"

You paste a question (or a whole recruiter email), and it gives you the right answer,
ready to copy back into the form.

## The pieces

| File | What it is |
|---|---|
| `system-prompt.md` | The brain. The instructions the AI follows. **This is the main file.** |
| `profile.json` | Your facts (contact info, work authorization, salary, education…). The AI is only allowed to use what's in here. |
| `.env.example` | Where you add your **API key**, pick the **AI provider/model**, and set the default **mode**. Copy it to `.env` and fill it in. |
| `server.js` | The web app — serves the browser UI and the `/api/ask` endpoint. |
| `public/index.html` | The browser UI: paste box, mode toggle, and Copy button. |
| `cli.js` | Optional command-line version of the same thing. |
| `src/` | The engine: config loader, provider adapters, and the prompt builder. |

## How it answers

- **Auto-detects** whether you pasted a *question* or an *email*.
  - A question → a short answer matched to the field type (Yes/No, a number, a dropdown option, a paragraph).
  - An email → a complete, ready-to-send reply in your voice.
- **Never makes things up.** If the answer isn't in `profile.json`, it tells you what's
  missing instead of guessing (see `needs_input` in its reply).
- **Keeps your password private** — it's only used when a form is literally asking you
  to create an account password.

Every reply comes back as a small JSON object (`answer`, `confidence`, `needs_input`,
`note`…), which is what makes it easy for a web/React front-end to show the answer in a
copy box and warn you when something needs your attention.

## Try it right now (no code needed)

1. Open `profile.json`, copy everything inside.
2. Open `system-prompt.md`, replace `{{PROFILE_JSON}}` with what you copied, and
   replace `{{OUTPUT_MODE}}` with `auto`.
3. Paste the whole thing as the *system prompt* (or just the first message) into
   ChatGPT or Claude.
4. Then paste a real application question — e.g. *"Do you require sponsorship? Yes/No"* —
   or a recruiter email, and watch it answer.

## Run the web app  (the main way to use it)

No installation needed — built-in Node.js (v18+), zero dependencies. Your API key is
already in `.env`. Then:

```bash
npm start
```

Open **http://localhost:3000**, paste a question or a recruiter email, pick a mode
(Auto / Form / Email), and click **Get Answer → Copy**.

### Deploy it (so you can use it from any device)

Push this folder to any Node host (Render, Railway, Fly.io, a small VPS). Instead of a
`.env` file, set these as **environment variables** in the host's dashboard — the app
reads env vars first, so it behaves the same once deployed:

- `AI_PROVIDER`  — e.g. `deepseek`
- `DEEPSEEK_API_KEY`  — (or the key for whichever provider you chose)
- `AI_MODEL`  — e.g. `deepseek-chat`

## Or use it from the terminal

```bash
node cli.js                                   # interactive mode
node cli.js "Do you require sponsorship?"      # one question
node cli.js --mode email "paste an email..."   # force an email reply
pbpaste | node cli.js                          # answer whatever you copied
node cli.js --json "Highest education?"         # raw JSON (for scripts)
```

## Roadmap

- [x] **Task 1 — the prompt** (`system-prompt.md`)
- [x] **Task 2 — the engine + CLI** (`src/`, `cli.js`)
- [x] **Task 3 — the web app** (`server.js`, `public/`) — browser UI with a paste box, mode toggle, and Copy button; deployable to any Node host.
- [ ] Task 4 — optional browser extension to autofill application forms directly.

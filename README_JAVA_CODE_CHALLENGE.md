# Java Code Challenge — what was added

Your Pip movement game (`interpreter.js`) runs a Java-like command
mini-language (`moveRight(1);`, `jump(1);`, `say("hello");`) — it can't
execute real Java. So instead of faking Java inside that engine, this adds a proper
**Java code-snippet quiz mode**, following the exact same pattern your
project already uses for the pre-test (`PreTestPage.jsx`), but built
around real, compilable-style Java code aligned to your syllabus
(IT 102A — Fundamentals of Programming).

**40 questions, 5 per syllabus topic, ordered Easy → Medium → Hard → Extreme**
so difficulty ramps up smoothly across the whole test. Every question is
real Java (not conceptual trivia) and tests tracing output, spotting bugs,
or reasoning about a real-world scenario — including classic Java gotchas
like `Scanner.nextInt()`/`nextLine()` buffer issues, `==` vs `.equals()`
on Strings, integer vs. double division, and `break` only exiting its own
loop.

## Files in this delivery

| File | What it does |
|---|---|
| `client/src/pages/PostTestPage.jsx` | **New page.** The Java Code Challenge itself — intro screen, 40-question quiz with per-question difficulty + topic badges and a "Why" explanation after each answer, then a results screen with score, per-difficulty breakdown, and per-topic breakdown. |
| `client/src/App.jsx` | Adds the import and a new `/posttest` route, protected the same way as your other pages. |
| `client/src/components/QuestNav.jsx` | Adds a "Code Challenge" tab to the top nav so students can find it. |
| `server/controllers/progressController.js` | Adds `savePosttest` / `getPosttestResult`, mirroring your existing `savePretest` / `getPretestResult`. Unlike the pre-test, students can retake this (no unique constraint on `user_id`), so you can track improvement over time. Awards the existing `first-clear` badge on first completion. |
| `server/routes/index.js` | Adds `POST /api/progress/posttest` and `GET /api/progress/posttest`. |
| `server/config/pretest-posttest-migration.sql` | Creates the `posttest_results` table. **Also fixes a pre-existing bug**: `pretest_results` is queried by your current `savePretest`/`getPretestResult` code but was never created in any of the migration files in your zip — so `/api/progress/pretest` would currently crash. This migration creates both tables. |

## How to apply

1. Drop these files into the matching paths in your project (they overwrite
   the originals for `App.jsx`, `QuestNav.jsx`, `progressController.js`,
   and `routes/index.js` — the rest are new files).
2. Run the migration once against your database:
   ```
   mysql -u <user> -p codequest < server/config/pretest-posttest-migration.sql
   ```
3. Restart the server and client dev servers. Log in and click
   **"Code Challenge"** in the top nav, or go to `/posttest`.

## Extending it further

All 40 questions live in one `RAW` object near the top of
`PostTestPage.jsx`, grouped by difficulty tier (`Easy`, `Medium`, `Hard`,
`Extreme`), each tagged with a `topic` (1–8, matching your syllabus
islands). To add more questions, just add another object to the right
tier's array with the same shape:

```js
{ topic: 6, question: 'What does this print?\n\n...', a: '...', b: '...', c: '...', d: '...', answer: 'b', explanation: '...' }
```

No other file needs to change — the component automatically flattens,
orders, scores, and renders whatever is in `RAW`.

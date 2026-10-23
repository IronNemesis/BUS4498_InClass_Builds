# Club Event Radar: handoff notes for Alexander

## 1. What works now

**Website:** https://ironnemesis.github.io/BUS4498_InClass_Builds/event_radar/

- A club officer pastes an announcement (and, optionally, a JPG or PNG flyer up to 5 MB). The AI agent turns it into an event card and checks it against the posting rules.
- Clean posts are **published** right away. Posts with missing details, rule problems, or a photo **wait** for a moderator. Posts that aren't events are **not posted**. A second post with the same date, start time, and place is refused as **already posted**.
- The list shows upcoming published events, soonest first, with a **🍕 Free food** filter.
- **Moderator sign-in** (bottom of the page): a moderator sees waiting posts with the reasons and the original text, and can **Approve** or **Reject** them.
- **Nightly clean-up:** every day at about 3 a.m. Pacific, a scheduled job (`archive-past-events`) archives published and waiting posts whose date has passed. See it in Supabase under **Integrations → Cron**.

## 2. Where things live

- **GitHub repository:** `IronNemesis/BUS4498_InClass_Builds`, folder `event_radar/`. GitHub Pages serves the website from the `main` branch.
- **Supabase project:** `event-radar`, Project URL `https://qmoqdmszigjlpyqplysf.supabase.co`.
- **Files that matter:**
  - `index.html`, `app.js`, `style.css`, `config.js`: the website. `config.js` holds only the Project URL and the publishable key, which are public.
  - `supabase/functions/submit-event/index.ts`: the AI agent (an Edge Function, deployed with JWT verification off).
  - `supabase/migrations/`: the database changes, one file per stage (the `events` table, flyer photos, moderator sign-in, nightly clean-up).
  - `context/posting-rules.md` and `context/campus-places.md`: the rules and place list. They are also copied into the agent's `index.ts`, so change both together.
  - `test/sample-announcements.md`: test posts and what should happen.
  - `AGENTS.md`: instructions for Claude Code or Codex. Ask your assistant to read it first.

## 3. Secrets

- `ANTHROPIC_API_KEY`: the AI key the agent uses. It's set in Supabase → **Edge Functions → Secrets**.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEYS`: Supabase gives these to the agent automatically.
- `HOLD_ALL_POSTS` (optional, not set): if set to `true`, every post waits for a moderator.

You don't need any of these values, and none of them belong in a file in the repository. To deploy or change secrets, ask to be invited to the Supabase project. To review posts, ask for your own moderator account (Authentication → Users → Add user). New sign-ups are turned off on purpose.

## 4. How to test

Paste these into the website's form (full texts are in `test/sample-announcements.md`):

- **Post A** (Board Game Guild game night, Thursday 10/29, UU Room 220): already on the website, so posting it again should answer **Already posted**.
- **Post D** (kickoff party at a house on Foothill Blvd, BYOB, Venmo handle, phone number): **Waiting for a moderator**, with off-campus, alcohol, payment, and privacy reasons. The phone number and Venmo handle stay off the card.
- **Post F** (selling an ECON 201 textbook): **Not posted**, because it's a sale, not an event.

## 5. What’s next

- Moderators can approve or reject but can't fix a typo on a card; the club has to post again.
- A rejected flyer post's photo stays in the `flyers` storage bucket.
- The agent works with Claude only; an `OPENAI_API_KEY` path isn't built.
- Vague dates like "Friday night" sometimes come back empty, so the post waits for a date.
- Supabase's security check suggests turning on **leaked-password protection** for sign-ins.

## 6. How we take turns

1. **Tell each other before you start working**, so only one of us changes things at a time.
2. **Download before you start:** in GitHub Desktop, click **Fetch origin**, then **Pull origin**.
3. **Upload when you stop:** commit your changes with a short summary, then click **Push origin**.
4. Database and agent changes also have to be applied in Supabase (the migration or a redeploy), not just pushed to GitHub. Say which ones you applied when you hand back.

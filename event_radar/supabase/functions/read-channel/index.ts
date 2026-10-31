// Club Event Radar: the chat-channel reader (Supabase Edge Function "read-channel"). Stage 14.
//
// It reads new messages from a GroupMe group and hands each one to the AI agent (submit-event),
// as if a club officer had pasted it on the website. Two things can wake it up:
//   - a scheduled job (Cron) every minute, and
//   - GroupMe's callback, the moment someone posts (optional; it makes the website update within seconds).
// Either way it does the same thing: it asks GroupMe for the messages after the last one it handled.
// It never trusts what the knock on the door says; it always goes and reads the group itself.
//
// Memory: the channel_cursor table remembers the ID of the last message read, so no message is read
// twice. If two runs overlap, the database refuses the second copy (events_one_per_message).
//
// Secrets (Edge Functions → Secrets): GROUPME_TOKEN (your GroupMe access token), GROUPME_GROUP_ID,
// and GROUPME_BOT_ID (optional: the bot answers in the group with the agent's decision).
// Deploy with JWT verification off (verify_jwt = false).

import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SOURCE = "groupme";
const API = "https://api.groupme.com/v3";
const MAX_PER_RUN = 20;      // GroupMe returns at most 100 per request; 20 keeps one run short
const MAX_REPLY = 900;       // GroupMe messages hold 1,000 characters

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Msg = { id: string; text: string | null; name: string; user_id?: string; created_at?: number; sender_type?: string; system?: boolean };
const THREAD_MINUTES = 10;   // the sender's messages from this many minutes before count as context
const THREAD_MAX = 4;
type Decision = { ok: boolean; status?: string; message?: string; reasons?: string[]; already_read?: boolean; event?: Record<string, unknown> | null };

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// The secret key for this project, which Supabase provides inside every Edge Function.
function serverKey(): string {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const k = JSON.parse(keys)["default"];
      if (k) return k;
    } catch (_) { /* fall back to the legacy key below */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}
// The key the reader sends when it calls the agent, the same way the website does: the publishable key
// (SUPABASE_PUBLISHABLE_KEYS, JSON, "default" entry), falling back to the older names.
function callerKey(): string {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keys) {
    try {
      const k = JSON.parse(keys)["default"];
      if (k) return k;
    } catch (_) { /* fall back to the older names below */ }
  }
  return Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? serverKey();
}

async function groupMeGet(path: string, token: string): Promise<{ status: number; messages: Msg[] }> {
  const res = await fetch(API + path, { headers: { "X-Access-Token": token } });
  if (res.status === 304) return { status: 304, messages: [] };
  if (!res.ok) throw new Error(`GroupMe answered ${res.status} for ${path.split("?")[0]}. Check GROUPME_TOKEN and GROUPME_GROUP_ID.`);
  const data = await res.json();
  return { status: res.status, messages: (data?.response?.messages ?? []) as Msg[] };
}

// Short-term memory: the same person's messages from the minutes before this one, oldest first.
// GroupMe returns the messages before an ID newest first.
async function threadBefore(m: Msg, group: string, token: string): Promise<string[]> {
  try {
    const earlier = await groupMeGet(`/groups/${group}/messages?before_id=${encodeURIComponent(m.id)}&limit=10`, token);
    const since = (m.created_at ?? 0) - THREAD_MINUTES * 60;
    return earlier.messages
      .filter((e) => e.user_id === m.user_id && !e.system && e.sender_type !== "bot" && (e.text ?? "").trim() && (e.created_at ?? 0) >= since)
      .slice(0, THREAD_MAX).reverse().map((e) => (e.text ?? "").trim());
  } catch (_) {
    return [];
  }
}

// The bot's answer in the group: what the agent decided, in one line.
function fmtTime(t: unknown): string {
  const m = /^(\d{2}):(\d{2})/.exec(String(t ?? ""));
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}
function fmtDate(d: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d ?? ""));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
}
function replyText(who: string, d: Decision): string {
  const ev = d.event ?? {};
  const card = [ev.title, fmtDate(ev.event_date), fmtTime(ev.start_time), ev.place_name].filter(Boolean).join(" · ");
  const reasons = (d.reasons ?? []).join(" ");
  let text: string;
  if (!d.ok) text = `⚠️ ${who}: the agent couldn't read that post. ${d.message ?? ""}`;
  else if (d.status === "published") text = `✅ ${who}: posted on the website. ${card}`;
  else if (d.status === "waiting") text = `⏳ ${who}: waiting for a moderator. ${reasons}`;
  else if (d.status === "duplicate") text = `↩️ ${who}: already posted. ${reasons}`;
  else text = `❌ ${who}: not posted. ${reasons}`;
  return text.trim().slice(0, MAX_REPLY);
}
async function say(botId: string, text: string) {
  const res = await fetch(`${API}/bots/post`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bot_id: botId, text }) });
  if (!res.ok) console.error("The bot couldn't post its reply", res.status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const token = (Deno.env.get("GROUPME_TOKEN") ?? "").trim();
  const group = (Deno.env.get("GROUPME_GROUP_ID") ?? "").trim();
  const botId = (Deno.env.get("GROUPME_BOT_ID") ?? "").trim();
  const db = createClient(Deno.env.get("SUPABASE_URL")!, serverKey(), { auth: { persistSession: false } });

  // A quick check that the reader is set up, without reading the group.
  if (req.method === "GET") {
    const { data: cur } = await db.from("channel_cursor").select("last_id, read_count, updated_at").eq("source", SOURCE).maybeSingle();
    const status: Record<string, unknown> = {
      ok: true,
      ready: Boolean(token && group),
      source: SOURCE,
      bot: Boolean(botId),
      last_message_id: cur?.last_id ?? "",
      read_count: cur?.read_count ?? 0,
      last_run: cur?.updated_at ?? "",
      message: token && group ? "The channel reader is set up." : "Add GROUPME_TOKEN and GROUPME_GROUP_ID in Edge Functions → Secrets.",
    };
    // ?check=groupme asks GroupMe whether the token and group work. It reports status codes only, never values.
    if (new URL(req.url).searchParams.get("check") === "groupme" && token) {
      const me = await fetch(`${API}/users/me`, { headers: { "X-Access-Token": token } });
      // GroupMe has accepted the token in different places over the years; report which ones work today.
      const meQuery = me.ok ? me : await fetch(`${API}/users/me?token=${encodeURIComponent(token)}`);
      const meBearer = me.ok ? me : await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      const grp = group ? await fetch(`${API}/groups/${encodeURIComponent(group)}`, { headers: { "X-Access-Token": token } }) : null;
      status.groupme = {
        token_length: token.length,
        token_works: me.ok,
        token_works_as_query: meQuery.ok,
        token_works_as_bearer: meBearer.ok,
        group_id_is_number: /^\d+$/.test(group),
        group_found: grp ? grp.ok : false,
        message: !me.ok ? `GroupMe rejected the token (${me.status}). Copy the Access Token again from dev.groupme.com into GROUPME_TOKEN.`
          : grp && !grp.ok ? `The token works, but GroupMe can't find group ${group} for this account (${grp.status}). Check GROUPME_GROUP_ID.`
          : "The token and the group ID work.",
      };
    }
    return reply(200, status);
  }
  if (req.method !== "POST") return reply(405, { ok: false, message: "Send a POST request." });

  // A POST comes from the scheduled job, from GroupMe's callback, or from a person. Its body is ignored on
  // purpose: the reader fetches the messages itself, so nobody can feed it fake posts.
  try {
    if (!token || !group) return reply(503, { ok: false, message: "Add GROUPME_TOKEN and GROUPME_GROUP_ID in Edge Functions → Secrets." });

    const { data: cur } = await db.from("channel_cursor").select("last_id, read_count").eq("source", SOURCE).maybeSingle();
    let lastId = String(cur?.last_id ?? "");
    const readCount = Number(cur?.read_count ?? 0);

    // First run: remember where the group is now, and start with the next message. Old history is never read.
    if (!lastId) {
      const newest = await groupMeGet(`/groups/${group}/messages?limit=1`, token);
      lastId = newest.messages[0]?.id ?? "0";
      await db.from("channel_cursor").upsert({ source: SOURCE, last_id: lastId, read_count: 0, updated_at: new Date().toISOString() });
      return reply(200, { ok: true, handled: 0, message: "First run: the reader will start with the next message posted in the group." });
    }

    const { messages } = await groupMeGet(`/groups/${group}/messages?after_id=${encodeURIComponent(lastId)}&limit=${MAX_PER_RUN}`, token);
    const results: Record<string, unknown>[] = [];
    for (const m of messages) {
      lastId = m.id; // move the bookmark past every message, including the ones we skip
      const text = (m.text ?? "").trim();
      if (m.system || m.sender_type === "bot" || !text) continue;
      const who = m.name || "Someone";
      const thread = await threadBefore(m, group, token);
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/submit-event`, {
        method: "POST",
        headers: { apikey: callerKey(), "Content-Type": "application/json" },
        body: JSON.stringify({ announcement: text.slice(0, 2000), source: SOURCE, source_id: m.id, source_name: who, thread }),
      });
      const decision: Decision = await res.json().catch(() => ({ ok: false, message: `The agent didn't answer (${res.status}).` }));
      results.push({ id: m.id, from: who, status: decision.ok ? decision.status : "error", message: decision.message ?? "" });
      // The agent already answered this message once (two runs overlapped), so don't answer again.
      if (botId && !decision.already_read) await say(botId, replyText(who, decision));
    }
    await db.from("channel_cursor").upsert({ source: SOURCE, last_id: lastId, read_count: readCount + results.length, updated_at: new Date().toISOString() });
    return reply(200, { ok: true, handled: results.length, skipped: messages.length - results.length, results });
  } catch (err) {
    console.error(err);
    return reply(502, { ok: false, message: err instanceof Error ? err.message : "Something went wrong in the channel reader. Check the function logs in Supabase." });
  }
});

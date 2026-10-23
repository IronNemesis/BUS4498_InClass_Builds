// Club Event Radar: the website.
// Reads published events with the publishable key, and sends new announcements to the AI agent.
// All user text is shown with textContent, never innerHTML.

(function () {
  "use strict";

  const config = window.EVENT_RADAR_CONFIG || {};
  const AGENT_URL = `${config.supabaseUrl}/functions/v1/submit-event`;
  const TIME_ZONE = "America/Los_Angeles";
  // Flyer photos are shown only when they come from this project's "flyers" bucket.
  const FLYER_PREFIX = `${config.supabaseUrl}/storage/v1/object/public/flyers/`;
  const MAX_FLYER_BYTES = 5 * 1024 * 1024;

  // Only the columns the website is allowed to read.
  const PUBLIC_COLUMNS =
    "id, created_at, status, title, club, event_date, start_time, end_time, place_name, place_detail, cost, free_food, summary, flyer_url";

  const board = document.getElementById("board");
  const form = document.getElementById("post-form");
  const textarea = document.getElementById("announcement");
  const flyerInput = document.getElementById("flyer");
  const postButton = document.getElementById("post-button");
  const resultBox = document.getElementById("result");
  const refreshButton = document.getElementById("refresh");
  const chips = document.querySelectorAll(".chip[data-filter]");

  let events = [];
  let filter = "all";

  // ---------- small helpers ----------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function showMessage(text) {
    board.replaceChildren(el("li", "empty", text));
  }

  // Dates arrive as "2026-10-29". Read them as calendar dates so time zones can't shift the day.
  function dateParts(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const fmt = (options) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(date);
    return { mon: fmt({ month: "short" }), day: String(d), weekday: fmt({ weekday: "short" }) };
  }

  // "19:00:00" -> "7:00 PM"
  function formatTime(time) {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
  }

  function todayInPacific() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  }

  // ---------- event cards ----------

  function eventCard(event) {
    const li = el("li", "event");

    // 1. The date block
    if (event.event_date) {
      const parts = dateParts(event.event_date);
      const date = el("div", "date");
      date.append(el("span", "mon", parts.mon), el("span", "day", parts.day));
      li.append(date);
    } else {
      const date = el("div", "date tba");
      date.append(el("span", "day", "TBA"));
      li.append(date);
    }

    // 2. The details
    const body = el("div", "event-body");

    const whenBits = [];
    if (event.event_date) {
      const parts = dateParts(event.event_date);
      whenBits.push(`${parts.weekday}, ${parts.mon} ${parts.day}`);
    }
    const start = formatTime(event.start_time);
    const end = formatTime(event.end_time);
    if (start && end) whenBits.push(`${start} to ${end}`);
    else if (start) whenBits.push(start);
    if (whenBits.length) body.append(el("p", "when", whenBits.join(" · ")));

    body.append(el("h3", null, event.title || "Untitled event"));

    const place = [event.place_name, event.place_detail].filter(Boolean).join(", ");
    const meta = [event.club, place].filter(Boolean).join(" · ");
    if (meta) body.append(el("p", "meta", meta));

    if (event.summary) body.append(el("p", "summary", event.summary));

    const tags = el("p", "tags");
    if (event.cost) tags.append(el("span", "tag", event.cost));
    if (event.free_food) tags.append(el("span", "tag food", "🍕 Free food"));
    if (tags.childElementCount) body.append(tags);

    li.append(body);

    // 3. The flyer photo
    if (typeof event.flyer_url === "string" && event.flyer_url.startsWith(FLYER_PREFIX)) {
      const img = el("img", "flyer");
      img.src = event.flyer_url;
      img.alt = `Flyer for ${event.title || "this event"}`;
      img.loading = "lazy";
      li.append(img);
    }

    return li;
  }

  function renderBoard() {
    const shown = filter === "food" ? events.filter((e) => e.free_food) : events;
    if (shown.length === 0) {
      showMessage(filter === "food" ? "No free-food events right now." : "No events yet. Post the first one!");
      return;
    }
    board.replaceChildren(...shown.map(eventCard));
  }

  // ---------- reading events ----------

  let db = null;
  if (window.supabase && config.supabaseUrl && config.publishableKey) {
    db = window.supabase.createClient(config.supabaseUrl, config.publishableKey, {
      auth: { persistSession: false },
    });
  }

  async function loadEvents() {
    if (!db) {
      showMessage("The website isn’t connected to Supabase yet. Check config.js.");
      return;
    }
    refreshButton.disabled = true;
    try {
      const { data, error } = await db
        .from("events")
        .select(PUBLIC_COLUMNS)
        .eq("status", "published")
        .gte("event_date", todayInPacific())
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      events = data || [];
      renderBoard();
    } catch (err) {
      console.error("Couldn't load events:", err);
      showMessage("Couldn’t load events right now. Try Refresh in a minute.");
    } finally {
      refreshButton.disabled = false;
    }
  }

  // ---------- posting an announcement ----------

  const LABELS = {
    published: "Published",
    waiting: "Waiting for a moderator",
    rejected: "Not posted",
    duplicate: "Already posted",
    error: "Something went wrong",
  };

  function showResult(kind, message, reasons) {
    const box = el("div", `result ${kind}`);
    box.append(el("p", "result-label", LABELS[kind] || LABELS.error));
    if (message) box.append(el("p", null, message));
    if (reasons && reasons.length) {
      const list = el("ul", "reasons");
      reasons.forEach((reason) => list.append(el("li", null, reason)));
      box.append(list);
    }
    resultBox.replaceChildren(box);
    resultBox.hidden = false;
  }

  form.addEventListener("submit", async (submitEvent) => {
    submitEvent.preventDefault();
    const announcement = textarea.value.trim();
    if (!announcement) {
      showResult("error", "Paste your announcement first.");
      return;
    }
    const flyer = flyerInput.files[0] || null;
    if (flyer && !["image/jpeg", "image/png"].includes(flyer.type)) {
      showResult("error", "The photo must be a JPG or PNG file.");
      return;
    }
    if (flyer && flyer.size > MAX_FLYER_BYTES) {
      showResult("error", "The photo is larger than 5 MB. Please use a smaller photo.");
      return;
    }

    postButton.disabled = true;
    postButton.textContent = "Reading your post…";
    resultBox.hidden = true;

    try {
      const body = new FormData();
      body.append("announcement", announcement);
      if (flyer) body.append("flyer", flyer);
      const response = await fetch(AGENT_URL, {
        method: "POST",
        headers: { apikey: config.publishableKey },
        body,
      });
      const answer = await response.json().catch(() => ({}));

      if (!response.ok || !answer.ok) {
        showResult("error", answer.message || "The agent didn’t answer. Please try again in a minute.");
        return;
      }

      const kind = LABELS[answer.status] ? answer.status : "error";
      showResult(kind, answer.message, answer.reasons);
      if (answer.status === "published") {
        form.reset();
        loadEvents();
      }
    } catch (err) {
      console.error("Couldn't reach the agent:", err);
      showResult("error", "Couldn’t reach the agent. Check your internet connection and try again.");
    } finally {
      postButton.disabled = false;
      postButton.textContent = "Post event";
    }
  });

  // ---------- list controls ----------

  refreshButton.addEventListener("click", loadEvents);

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filter = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      renderBoard();
    });
  });

  loadEvents();
})();

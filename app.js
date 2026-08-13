/*
 * Common Ground is intentionally framework-free. Add your public Supabase
 * values here before deploying, or leave them blank to use local mode.
 */
const SUPABASE_URL = "https://meqqfuywvkcwbzqyqcyc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_muVMCD52kKZKntsh2mwkWg_knLLqA6d";
// NYT publishes the daily Wordle solution at this date-based JSON endpoint.
// Leave it blank to use the built-in fallback list instead.
const WORD_SOURCE_URL = "https://www.nytimes.com/svc/wordle/v2/{date}.json";
const VALID_GUESSES_URL = "valid-wordle-words.txt";

const ANSWER_WORDS = [
  "angle", "arise", "badge", "beach", "blaze", "brave", "bread", "bring", "broom", "cabin",
  "candy", "carry", "charm", "chase", "chief", "claim", "class", "clean", "clear", "close",
  "cloud", "coast", "crane", "cream", "dance", "depth", "dream", "drive", "early", "earth",
  "email", "enjoy", "event", "faith", "field", "flame", "flock", "focus", "fresh", "front",
  "fruit", "given", "globe", "grace", "grain", "grape", "great", "green", "group", "guess",
  "habit", "happy", "heart", "heavy", "honey", "honor", "house", "human", "ideal", "image",
  "joint", "judge", "juice", "light", "limit", "liver", "local", "lodge", "lucky", "lunch",
  "magic", "march", "match", "maybe", "medal", "metal", "might", "model", "money", "month",
  "music", "never", "night", "noise", "north", "novel", "ocean", "order", "other", "paint",
  "panel", "party", "peace", "phase", "phone", "piece", "pilot", "place", "plain", "plant",
  "plate", "point", "pride", "prime", "print", "prize", "quiet", "radio", "raise", "range",
  "reach", "ready", "reply", "right", "river", "rough", "round", "royal", "scale", "scene",
  "score", "sense", "serve", "shape", "share", "sharp", "shine", "short", "since", "skill",
  "sleep", "smile", "solid", "sound", "space", "spare", "spark", "speak", "spice", "spirit",
  "split", "sport", "stage", "stand", "start", "state", "steam", "steel", "still", "stone",
  "store", "storm", "story", "style", "sugar", "sunny", "sweet", "table", "taste", "teach",
  "thank", "theme", "there", "thing", "think", "title", "today", "touch", "tower", "track",
  "trade", "train", "treat", "trend", "trust", "truth", "under", "union", "unity", "value",
  "visit", "voice", "watch", "water", "weary", "whole", "world", "write", "young", "youth"
];

const EXTRA_GUESSES = [
  "abide", "about", "above", "adapt", "admit", "after", "again", "agent", "ahead", "alarm", "alive", "allow",
  "alone", "along", "amaze", "among", "arena", "argue", "avoid", "aware", "award", "begin", "being", "below",
  "billy", "blame", "block", "blood", "board", "bonus", "bound", "brain", "brand", "brief", "broad", "bunch",
  "buyer", "chair", "check", "child", "chill", "choice", "civil", "count", "cover", "crazy", "cross", "crowd",
  "daily", "dated", "dealt", "debut", "delay", "doubt", "dozen", "eager", "eagle", "eight", "empty", "entry",
  "equal", "error", "exact", "extra", "false", "fancy", "favor", "fewer", "final", "floor", "force", "frame",
  "funny", "ghost", "giant", "grant", "grass", "guard", "guess", "guide", "happy", "horse", "hotel", "idiot",
  "index", "input", "issue", "jelly", "known", "label", "large", "later", "laugh", "learn", "lease", "least",
  "level", "loved", "lower", "major", "maker", "march", "maybe", "mayor", "media", "metal", "middle", "minor",
  "mouse", "movie", "needs", "nerve", "never", "occur", "offer", "often", "onion", "opera", "organ", "ought",
  "owner", "paper", "pasta", "penny", "perch", "phase", "photo", "piano", "pitch", "pizza", "power", "press",
  "prove", "queen", "quick", "quite", "quote", "ratio", "ready", "rough", "route", "rural", "safer", "sauce",
  "seven", "shirt", "silly", "sixth", "slate", "slope", "smart", "solar", "sorry", "south", "space", "spend",
  "spoon", "staff", "stair", "stamp", "steep", "stick", "study", "sweep", "swing", "teach", "teeth", "thank",
  "their", "thick", "thing", "throw", "tiger", "timer", "tired", "topic", "total", "tough", "trial", "truck",
  "twice", "uncle", "usual", "valid", "video", "waste", "wheel", "where", "which", "while", "white", "whose",
  "woman", "worry", "worth", "would", "wrong", "wrote", "yield", "zebra"
];

const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"]
];
const TODAY = new Date().toISOString().slice(0, 10);
const GAME_STORAGE_KEY = `common-ground-game-${TODAY}`;
const STATS_STORAGE_KEY = "common-ground-stats";
const GROUP_STORAGE_KEY = "common-ground-group";
const LOCAL_SCORES_KEY = "common-ground-scores";
const THEME_STORAGE_KEY = "common-ground-theme";
const RAINBOW_SPEED_STORAGE_KEY = "common-ground-rainbow-speed";
const THEME_NAMES = new Set(["classic", "ocean", "lavender", "sunset", "rainbow"]);
const db = window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const state = {
  answer: "",
  validWords: new Set(),
  guesses: [],
  statuses: [],
  current: "",
  gameOver: false,
  won: false,
  user: null,
  group: loadLocal(GROUP_STORAGE_KEY),
  authReady: false,
  pendingAction: null,
  groupModalMode: "create",
  toastTimer: null
};

const $ = (id) => document.getElementById(id);
const board = $("board");
const keyboard = $("keyboard");
const message = $("gameMessage");

function loadLocal(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function saveLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function applyTheme(theme, persist = false) {
  const selectedTheme = THEME_NAMES.has(theme) ? theme : "classic";
  if (selectedTheme === "classic") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = selectedTheme;
  if (persist) saveLocal(THEME_STORAGE_KEY, selectedTheme);
  document.querySelectorAll("[data-theme-choice]").forEach((option) => {
    option.setAttribute("aria-checked", String(option.dataset.themeChoice === selectedTheme));
  });
}

function setRainbowSpeed(value, persist = false) {
  const speed = Math.min(10, Math.max(1, Number(value) || 7));
  const duration = 15 - speed;
  document.documentElement.style.setProperty("--rainbow-speed", `${duration}s`);
  const slider = $("rainbowSpeed");
  const output = $("rainbowSpeedValue");
  if (slider) slider.value = speed;
  if (output) output.textContent = speed <= 3 ? "Slow" : speed >= 8 ? "Fast" : "Medium";
  if (persist) saveLocal(RAINBOW_SPEED_STORAGE_KEY, speed);
}

function hashString(value) {
  return [...value].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function formatDate(dateString, options = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(`${dateString}T12:00:00`));
}

async function getDailyWord() {
  if (WORD_SOURCE_URL) {
    try {
      const sourceUrl = WORD_SOURCE_URL.replace("{date}", TODAY);
      const response = await fetch(sourceUrl, { headers: { Accept: "application/json" } });
      if (response.ok) {
        const payload = await response.json();
        const candidate = String(payload.word || payload.answer || payload.solution || "").toLowerCase();
        if (/^[a-z]{5}$/.test(candidate)) return candidate;
      }
    } catch (error) { console.info("Optional word source unavailable; using the built-in list.", error); }
  }
  const index = Math.abs(hashString(TODAY)) % ANSWER_WORDS.length;
  return ANSWER_WORDS[index];
}

async function getValidGuesses() {
  const fallbackWords = new Set([...ANSWER_WORDS, ...EXTRA_GUESSES]);
  try {
    const response = await fetch(VALID_GUESSES_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Could not load valid guesses (${response.status}).`);
    const words = await response.text();
    const validWords = words
      .split(/\r?\n/)
      .map((word) => word.trim().toLowerCase())
      .filter((word) => /^[a-z]{5}$/.test(word));
    if (validWords.length) return new Set([...fallbackWords, ...validWords]);
  } catch (error) {
    console.info("Valid guess list unavailable; using the built-in fallback list.", error);
  }
  return fallbackWords;
}

function renderBoard() {
  board.innerHTML = "";
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const tile = document.createElement("div");
      const rowGuess = state.guesses[row] || (row === state.guesses.length ? state.current : "");
      tile.className = "tile";
      if (rowGuess[column]) { tile.textContent = rowGuess[column]; tile.classList.add("filled"); }
      if (state.statuses[row]) tile.classList.add(state.statuses[row][column]);
      board.appendChild(tile);
    }
  }
}

function renderKeyboard() {
  keyboard.innerHTML = "";
  const keyStatus = {};
  state.guesses.forEach((guess, row) => guess.split("").forEach((letter, index) => {
    const status = state.statuses[row][index];
    if (status === "correct" || (status === "present" && keyStatus[letter] !== "correct")) keyStatus[letter] = status;
    if (!keyStatus[letter]) keyStatus[letter] = "absent";
  }));
  KEY_ROWS.forEach((row) => {
    const rowElement = document.createElement("div"); rowElement.className = "keyboard-row";
    row.forEach((key) => {
      const button = document.createElement("button"); button.className = "key";
      button.type = "button"; button.dataset.key = key;
      button.textContent = key === "backspace" ? "⌫" : key;
      if (key === "enter" || key === "backspace") button.classList.add("wide");
      if (keyStatus[key]) button.classList.add(keyStatus[key]);
      button.addEventListener("click", () => handleKey(key));
      rowElement.appendChild(button);
    });
    keyboard.appendChild(rowElement);
  });
}

function evaluateGuess(guess) {
  const result = Array(5).fill("absent");
  const remaining = state.answer.split("");
  guess.split("").forEach((letter, index) => {
    if (letter === state.answer[index]) { result[index] = "correct"; remaining[index] = null; }
  });
  guess.split("").forEach((letter, index) => {
    if (result[index] === "correct") return;
    const match = remaining.indexOf(letter);
    if (match !== -1) { result[index] = "present"; remaining[match] = null; }
  });
  return result;
}

function handleKey(key) {
  if (state.gameOver) return;
  if (key === "enter") return submitGuess();
  if (key === "backspace") { state.current = state.current.slice(0, -1); renderBoard(); return; }
  if (/^[a-z]$/.test(key) && state.current.length < 5) { state.current += key; renderBoard(); }
}

function submitGuess() {
  if (state.current.length !== 5) return showMessage("Five letters, please.", "error");
  if (!state.validWords.has(state.current)) return showMessage("That word isn’t in the list.", "error");
  const guess = state.current;
  const statuses = evaluateGuess(guess);
  state.guesses.push(guess); state.statuses.push(statuses); state.current = "";
  state.won = guess === state.answer;
  state.gameOver = state.won || state.guesses.length === 6;
  saveGame(); renderBoard(); renderKeyboard();
  if (state.won) {
    showMessage(state.guesses.length === 1 ? "First guess. Unreasonably good." : "You found the common ground.", "win");
    updateStats(true, state.guesses.length); saveScore();
  } else if (state.gameOver) {
    showMessage(`The word was ${state.answer.toUpperCase()}.`, "error"); updateStats(false, 0); saveScore();
  } else showMessage(["Keep going.", "You’re close.", "Trust the process."][state.guesses.length - 1] || "Keep going.");
}

function saveGame() { saveLocal(GAME_STORAGE_KEY, { guesses: state.guesses, statuses: state.statuses, gameOver: state.gameOver, won: state.won }); }

function restoreGame() {
  const saved = loadLocal(GAME_STORAGE_KEY);
  if (!saved) return;
  state.guesses = Array.isArray(saved.guesses) ? saved.guesses : [];
  state.statuses = Array.isArray(saved.statuses) ? saved.statuses : [];
  state.gameOver = Boolean(saved.gameOver); state.won = Boolean(saved.won);
  if (state.gameOver) showMessage(state.won ? "You found the common ground." : `The word was ${state.answer.toUpperCase()}.`, state.won ? "win" : "error");
}

function showMessage(text, tone = "") { message.textContent = text; message.className = `message ${tone}`; }

function getStats() { return loadLocal(STATS_STORAGE_KEY, { played: 0, wins: 0, currentStreak: 0, bestStreak: 0, lastPlayed: null }); }

function updateStats(won, attempts) {
  const stats = getStats(); if (stats.lastPlayed === TODAY) return;
  stats.played += 1; stats.wins += won ? 1 : 0;
  if (won) { stats.currentStreak += 1; stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak); } else stats.currentStreak = 0;
  stats.lastPlayed = TODAY; stats.lastAttempts = attempts; saveLocal(STATS_STORAGE_KEY, stats); renderStats();
}

function renderStats() {
  const stats = getStats(); const rate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  $("streakValue").textContent = stats.currentStreak; $("statPlayed").textContent = stats.played; $("statWins").textContent = stats.wins; $("statRate").textContent = `${rate}%`; $("statBest").textContent = stats.bestStreak;
}

function initials(name) { return (name || "G").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }

function mergeGroupMembers(scoreRows) {
  if (!state.group || !Array.isArray(scoreRows)) return;
  const members = Array.isArray(state.group.members) ? [...state.group.members] : [];
  scoreRows.forEach((row) => {
    let index = members.findIndex((member) => row.userId && member.userId === row.userId);
    if (index === -1 && row.isYou) index = members.findIndex((member) => member.isYou || member.name === "You");
    if (index === -1) index = members.findIndex((member) => member.name?.toLowerCase() === row.name?.toLowerCase());
    const member = { userId: row.userId, name: row.name, isYou: row.isYou };
    if (index === -1) members.push(member); else members[index] = { ...members[index], ...member };
  });
  state.group.members = members;
  saveLocal(GROUP_STORAGE_KEY, state.group);
}

function renderGroup() {
  const group = state.group;
  const members = Array.isArray(group?.members) ? group.members : [];
  const memberCount = members.length;
  $("groupName").textContent = group ? group.name : "No group yet";
  $("groupDescription").textContent = group ? `${memberCount} ${memberCount === 1 ? "person is" : "people are"} in this circle. Share the code and compare today’s solve.` : "Create a group or join one with a code. Compare today’s solve with your people.";
  $("groupCode").hidden = !group;
  if (group) { $("groupCode").querySelector("strong").textContent = group.code; }
  $("memberStack").hidden = !group;
  $("memberStack").innerHTML = group ? [...members.slice(0, 4).map((member) => `<span class="member">${initials(member.name)}</span>`), `<span class="member-count">${memberCount} in the circle</span>`].join("") : "";
  $("modeStatus").innerHTML = group ? `<span class="status-dot"></span> ${group.name}` : '<span class="status-dot"></span> Playing solo';
  renderLeaderboard();
}

function getLocalScores() { return loadLocal(LOCAL_SCORES_KEY, {}); }

function renderLeaderboard(rows = null) {
  const leaderboard = $("leaderboard"); const empty = $("leaderboardEmpty");
  if (!state.group) { leaderboard.innerHTML = ""; empty.hidden = false; return; }
  const scores = rows || getLocalScores()[TODAY] || [];
  if (!scores.length) { leaderboard.innerHTML = ""; empty.textContent = "Solve today’s word to claim your spot."; empty.hidden = false; return; }
  empty.hidden = true;
  leaderboard.innerHTML = scores.slice().sort((a, b) => (a.won === b.won ? a.attempts - b.attempts : Number(b.won) - Number(a.won))).slice(0, 8).map((row, index) => `
    <div class="leader-row"><span class="leader-rank">${String(index + 1).padStart(2, "0")}</span><span class="leader-avatar">${initials(row.name)}</span><span class="leader-name">${row.name}${row.isYou ? ' <span class="leader-you">you</span>' : ""}</span><span class="leader-score">${row.won ? `${row.attempts}/6` : "X/6"}</span></div>`).join("");
}

async function saveScore() {
  if (!state.group) return;
  if (db && state.user) {
    const { error } = await db.from("scores").upsert({ group_id: state.group.id, user_id: state.user.id, game_date: TODAY, attempts: state.won ? state.guesses.length : 7, won: state.won }, { onConflict: "group_id,user_id,game_date" });
    if (error) console.warn("Could not save score", error);
    await loadRemoteLeaderboard(); return;
  }
  const scores = getLocalScores(); const todayScores = scores[TODAY] || []; const name = "You";
  const existing = todayScores.find((score) => score.isYou);
  if (existing) { existing.attempts = state.won ? state.guesses.length : 7; existing.won = state.won; } else todayScores.push({ name, attempts: state.won ? state.guesses.length : 7, won: state.won, isYou: true });
  scores[TODAY] = todayScores; saveLocal(LOCAL_SCORES_KEY, scores); renderLeaderboard(todayScores);
}

async function loadRemoteLeaderboard() {
  if (!db || !state.group) return;
  const { data, error } = await db.from("scores").select("user_id, attempts, won, profiles(display_name)").eq("group_id", state.group.id).eq("game_date", TODAY).order("won", { ascending: false }).order("attempts", { ascending: true });
  if (error) { console.warn("Could not load leaderboard", error); return; }
  const rows = (data || []).map((row) => ({ userId: row.user_id, name: row.profiles?.display_name || "Player", attempts: row.attempts, won: row.won, isYou: row.user_id === state.user?.id }));
  mergeGroupMembers(rows);
  renderGroup();
  renderLeaderboard(rows);
}

function makeInviteCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

async function createGroup(name) {
  if (db && !state.user) { state.pendingAction = () => createGroup(name); return showAccount("Choose a display name to create a shared group."); }
  if (db) {
    const code = makeInviteCode();
    const { data, error } = await db.from("groups").insert({ name, code, owner_id: state.user.id }).select().single();
    if (error) return showToast(error.message);
    await db.from("group_members").insert({ group_id: data.id, user_id: state.user.id });
    state.group = { ...data, members: [{ userId: state.user.id, name: state.user.user_metadata?.display_name || "You", isYou: true }] }; saveLocal(GROUP_STORAGE_KEY, state.group); renderGroup(); closeModal($("groupModal")); showToast("Group created — share the code."); return;
  }
  state.group = { id: `local-${Date.now()}`, name, code: makeInviteCode(), members: [{ name: "You" }] }; saveLocal(GROUP_STORAGE_KEY, state.group); renderGroup(); closeModal($("groupModal")); showToast("Local group created — share the code when you connect Supabase.");
}

async function joinGroup(code) {
  code = code.trim().toUpperCase();
  if (db && !state.user) { state.pendingAction = () => joinGroup(code); return showAccount("Choose a display name to join a shared group."); }
  if (db) {
    const { data, error } = await db.rpc("join_group_by_code", { input_code: code });
    if (error || !data?.length) return showToast(error?.message || "We couldn’t find that group code.");
    state.group = { ...data[0], members: [{ userId: state.user.id, name: state.user.user_metadata?.display_name || "You", isYou: true }] }; saveLocal(GROUP_STORAGE_KEY, state.group); await loadRemoteGroup(); closeModal($("groupModal")); showToast(`You joined ${data[0].name}.`); return;
  }
  state.group = { id: `local-${code}`, name: "Shared circle", code, members: [{ name: "You" }] }; saveLocal(GROUP_STORAGE_KEY, state.group); renderGroup(); closeModal($("groupModal")); showToast("Local group joined in this browser.");
}

async function loadRemoteGroup() {
  if (!db || !state.user) return;
  const { data, error } = await db.from("group_members").select("group_id, groups(id, name, code)").eq("user_id", state.user.id).limit(1).maybeSingle();
  if (error || !data?.groups) { renderGroup(); return; }
  const group = data.groups;
  const members = await db.rpc("get_group_members", { input_group_id: group.id });
  if (members.error) console.warn("Could not load circle members", members.error);
  const knownMembers = state.group?.id === group.id ? state.group.members : [];
  state.group = { ...group, members: members.error ? knownMembers : (members.data || []).map((member) => ({ userId: member.user_id, name: member.display_name || "Player", isYou: member.user_id === state.user.id })) };
  saveLocal(GROUP_STORAGE_KEY, state.group); renderGroup(); await loadRemoteLeaderboard();
}

function showAccount(copy) { $("accountCopy").textContent = copy || "No email or password needed. We’ll create a lightweight player profile for this browser."; openModal($("accountModal")); }

function openModal(dialog) {
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeModal(dialog) {
  if (!dialog?.open) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

async function handleAuthSubmit(event) {
  event.preventDefault(); const displayName = $("displayNameInput").value.trim();
  if (!db) { showToast("Supabase is not configured yet — local play is ready."); return; }
  let error = null;
  if (!state.user) {
    const result = await db.auth.signInAnonymously({ options: { data: { display_name: displayName } } });
    state.user = result.data.user || null; error = result.error;
  } else {
    const result = await db.auth.updateUser({ data: { display_name: displayName } }); error = result.error;
  }
  if (error) { $("authNote").textContent = error.message; return; }
  if (state.user) await db.from("profiles").update({ display_name: displayName }).eq("id", state.user.id);
  updateAuthUI(); closeModal($("accountModal")); showToast(`Welcome, ${displayName}.`);
  const action = state.pendingAction; state.pendingAction = null; if (action) await action();
}

function updateAuthUI() {
  const signedIn = Boolean(state.user); const name = state.user?.user_metadata?.display_name || "Player"; $("accountButton").textContent = signedIn ? initials(name) : "G"; $("signOutButton").hidden = !signedIn; $("authForm").hidden = signedIn; $("accountTitle").textContent = signedIn ? `Hi, ${name}.` : "Choose a display name."; $("accountCopy").textContent = signedIn ? "Your player profile, group membership, and scores are synced with Supabase." : "No email or password needed. We’ll create a lightweight player profile for this browser."; $("authNote").textContent = db ? "This is an anonymous player ID tied to this browser." : "Local play works without signing in.";
}

async function initAuth() {
  if (!db) { state.authReady = true; updateAuthUI(); return; }
  const session = await db.auth.getSession(); state.user = session.data.session?.user || null; state.authReady = true; updateAuthUI(); await loadRemoteGroup();
  db.auth.onAuthStateChange(async (_event, sessionChange) => { state.user = sessionChange?.user || null; updateAuthUI(); if (state.user) await loadRemoteGroup(); });
}

function showToast(text) { const toast = $("toast"); toast.textContent = text; toast.classList.add("show"); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove("show"), 3000); }

function wireUI() {
  document.addEventListener("keydown", (event) => { if (event.ctrlKey || event.metaKey || event.altKey) return; if (event.key === "Enter") handleKey("enter"); else if (event.key === "Backspace") handleKey("backspace"); else if (/^[a-zA-Z]$/.test(event.key)) handleKey(event.key.toLowerCase()); });
  $("helpButton").addEventListener("click", () => openModal($("helpModal")));
  $("statsButton").addEventListener("click", () => { renderStats(); openModal($("statsModal")); });
  $("themeButton").addEventListener("click", () => openModal($("themeModal")));
  document.querySelectorAll("[data-theme-choice]").forEach((option) => option.addEventListener("click", () => applyTheme(option.dataset.themeChoice, true)));
  $("rainbowSpeed").addEventListener("input", (event) => setRainbowSpeed(event.target.value, true));
  $("accountButton").addEventListener("click", () => openModal($("accountModal")));
  $("createGroupButton").addEventListener("click", () => { state.groupModalMode = "create"; $("groupModalEyebrow").textContent = "Start a circle"; $("groupModalTitle").textContent = "Create your group."; $("groupModalCopy").textContent = "Give your group a name, then share the invite code with your people."; $("groupInputLabel").textContent = "Group name"; $("groupInput").placeholder = "Sunday coffee club"; $("groupSubmit").textContent = "Create group"; $("groupInput").value = ""; openModal($("groupModal")); });
  $("joinGroupButton").addEventListener("click", () => { state.groupModalMode = "join"; $("groupModalEyebrow").textContent = "Join a circle"; $("groupModalTitle").textContent = "Enter the invite code."; $("groupModalCopy").textContent = "Your friend can find this six-character code in their group card."; $("groupInputLabel").textContent = "Invite code"; $("groupInput").placeholder = "ABC123"; $("groupSubmit").textContent = "Join group"; $("groupInput").value = ""; openModal($("groupModal")); });
  $("groupForm").addEventListener("submit", (event) => { event.preventDefault(); const value = $("groupInput").value.trim(); if (state.groupModalMode === "create") createGroup(value); else joinGroup(value); });
  $("authForm").addEventListener("submit", handleAuthSubmit);
  $("signOutButton").addEventListener("click", async () => { if (db) await db.auth.signOut(); state.user = null; updateAuthUI(); showToast("Signed out."); closeModal($("accountModal")); });
  $("copyCodeButton").addEventListener("click", async () => { if (!state.group) return; try { await navigator.clipboard.writeText(state.group.code); showToast("Invite code copied."); } catch { showToast(`Invite code: ${state.group.code}`); } });
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeModal(button.closest("dialog"))));
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) closeModal(dialog); }));
}

async function init() {
  applyTheme(loadLocal(THEME_STORAGE_KEY, "classic"));
  setRainbowSpeed(loadLocal(RAINBOW_SPEED_STORAGE_KEY, 7));
  wireUI();
  $("gameDate").textContent = formatDate(TODAY, { weekday: "short", month: "short", day: "numeric" });
  $("leaderboardDate").textContent = formatDate(TODAY);
  const [answer, validWords] = await Promise.all([getDailyWord(), getValidGuesses()]);
  state.answer = answer;
  state.validWords = validWords;
  state.validWords.add(state.answer);
  restoreGame(); renderBoard(); renderKeyboard(); renderStats(); renderGroup(); await initAuth();
}

init();

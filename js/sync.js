// Cloud sync via a private GitHub Gist — serverless cross-device progress.
// One-time setup: a GitHub personal access token with only the "gist" scope,
// pasted into Settings on each device. After that: automatic background sync.
//
// Model: last-writer-wins on a savedAt timestamp. Local saves stamp savedAt;
// on boot we pull and offer to load if the cloud copy is newer; local changes
// push after a quiet period and when the app goes to background.

import { state, save, exportSave, importSave, onChange } from "./state.js";

const TOKEN_KEY = "cq_gh_token";
const GIST_KEY = "cq_gist_id";
const FILENAME = "chessquest-save.json";
const API = "https://api.github.com";

let pushTimer = null;
let status = { connected: !!localStorage.getItem(TOKEN_KEY), lastSync: localStorage.getItem("cq_last_sync"), error: null, busy: false };
let statusListeners = [];

export function syncStatus() { return { ...status }; }
export function onSyncStatus(fn) { statusListeners.push(fn); }
function setStatus(patch) {
  Object.assign(status, patch);
  if (patch.lastSync) localStorage.setItem("cq_last_sync", patch.lastSync);
  statusListeners.forEach((f) => f(status));
}

const token = () => localStorage.getItem(TOKEN_KEY);

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Authorization: "Bearer " + token(),
      Accept: "application/vnd.github+json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...opts.headers,
    },
  });
  if (res.status === 401) throw new Error("Token rejected — check it has the gist scope.");
  if (!res.ok && res.status !== 404) throw new Error("GitHub API error " + res.status);
  return res;
}

async function findOrCreateGist() {
  const cached = localStorage.getItem(GIST_KEY);
  if (cached) {
    const res = await api("/gists/" + cached);
    if (res.ok) return cached;
    localStorage.removeItem(GIST_KEY); // gist deleted remotely — rediscover
  }
  const list = await (await api("/gists?per_page=100")).json();
  const hit = list.find((g) => g.files && g.files[FILENAME]);
  if (hit) {
    localStorage.setItem(GIST_KEY, hit.id);
    return hit.id;
  }
  const created = await (await api("/gists", {
    method: "POST",
    body: JSON.stringify({
      description: "ChessQuest progress sync (auto-managed)",
      public: false,
      files: { [FILENAME]: { content: payload() } },
    }),
  })).json();
  localStorage.setItem(GIST_KEY, created.id);
  return created.id;
}

function payload() {
  return JSON.stringify({ savedAt: state().savedAt || new Date().toISOString(), state: JSON.parse(exportSave()) });
}

// Connect with a token: validates it, finds/creates the sync gist, pulls if newer.
export async function connect(tok) {
  localStorage.setItem(TOKEN_KEY, tok.trim());
  setStatus({ busy: true, error: null });
  try {
    const user = await (await api("/user")).json();
    if (!user.login) throw new Error("Could not read GitHub user.");
    await findOrCreateGist();
    setStatus({ connected: true, busy: false });
    return user.login;
  } catch (e) {
    localStorage.removeItem(TOKEN_KEY);
    setStatus({ connected: false, busy: false, error: e.message });
    throw e;
  }
}

export function disconnect() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GIST_KEY);
  localStorage.removeItem(ANCHOR_KEY);
  setStatus({ connected: false, error: null });
}

// The anchor is the savedAt of the last payload this device pushed or pulled.
// Cloud content newer than the anchor means another device made progress.
const ANCHOR_KEY = "cq_sync_anchor";

export async function pushSave() {
  if (!token()) return false;
  setStatus({ busy: true });
  try {
    const id = await findOrCreateGist();
    const body = payload();
    await api("/gists/" + id, {
      method: "PATCH",
      body: JSON.stringify({ files: { [FILENAME]: { content: body } } }),
    });
    localStorage.setItem(ANCHOR_KEY, JSON.parse(body).savedAt);
    setStatus({ busy: false, lastSync: new Date().toISOString(), error: null });
    return true;
  } catch (e) {
    setStatus({ busy: false, error: e.message });
    return false;
  }
}

// Returns {savedAt, state} from the cloud, or null.
export async function pullSave() {
  if (!token()) return null;
  try {
    const id = await findOrCreateGist();
    const gist = await (await api("/gists/" + id)).json();
    const file = gist.files && gist.files[FILENAME];
    if (!file) return null;
    const content = file.truncated ? await (await fetch(file.raw_url)).text() : file.content;
    const parsed = JSON.parse(content);
    return parsed && parsed.state ? parsed : null;
  } catch {
    return null;
  }
}

// Boot/connect-time check. Returns the remote payload when the caller should
// offer to load it:
//  - this device has never synced (anchor missing) and the cloud has real
//    progress from someone — always ask, wall clocks can't be trusted here
//  - the cloud moved past our anchor — another device pushed since we synced
export async function checkRemote() {
  if (!token()) return null;
  const remote = await pullSave();
  if (!remote || !remote.savedAt) return null;
  const anchor = localStorage.getItem(ANCHOR_KEY);
  if (!anchor) {
    const r = remote.state || {};
    const local = state();
    const remoteProgress = (r.xp || 0) + (r.puzzlesSolved || 0) + (r.gamesPlayed || 0);
    const localProgress = local.xp + local.puzzlesSolved + local.gamesPlayed;
    // never-synced device: offer the cloud copy unless it's clearly emptier
    return remoteProgress > 0 && remoteProgress >= localProgress ? remote : null;
  }
  return remote.savedAt > anchor ? remote : null;
}

// Human-readable line describing a remote payload, for confirm dialogs.
export function describeRemote(remote) {
  const r = remote.state || {};
  const when = remote.savedAt ? new Date(remote.savedAt).toLocaleString() : "?";
  return `${r.profile?.name || "Player"} — level ${Math.floor(Math.sqrt((r.xp || 0) / 60)) + 1}, ` +
    `${r.puzzlesSolved || 0} puzzles, puzzle rating ${r.puzzleElo || "?"} (saved ${when})`;
}

export function applyRemote(remote) {
  importSave(JSON.stringify(remote.state));
  localStorage.setItem(ANCHOR_KEY, remote.savedAt || new Date().toISOString());
  setStatus({ lastSync: new Date().toISOString() });
}

// Automatic background sync: push after 45s of quiet, and immediately when
// the app is backgrounded (that's usually "I'm done for now" on a phone).
export function startAutoSync() {
  onChange(() => {
    if (!token()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushSave(), 45000);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && token()) {
      clearTimeout(pushTimer);
      save();
      pushSave();
    }
  });
}

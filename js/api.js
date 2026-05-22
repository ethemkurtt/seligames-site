// Shared API + auth helper for the static SeliGame site.
// Same origin (https://seligame.com/api/...) — proxied by LiteSpeed to
// the Node backend on 127.0.0.1:3000. No CORS issues.

(function (global) {
  'use strict';

  const API_BASE = '/api';
  const TOKEN_KEY = 'sg_token';
  const USER_KEY = 'sg_user';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }
  function getUser() {
    try { const r = localStorage.getItem(USER_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function setUser(u) {
    try { if (u) localStorage.setItem(USER_KEY, JSON.stringify(u)); else localStorage.removeItem(USER_KEY); } catch (e) {}
  }
  function isAuthed() { return !!getToken(); }

  async function request(path, opts = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const t = getToken();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    const res = await fetch(API_BASE + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
    });
    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) data = await res.json().catch(() => null);
    else data = await res.text().catch(() => null);
    if (!res.ok) {
      const msg = (data && data.error) || (typeof data === 'string' ? data : '') || ('HTTP ' + res.status);
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ─── Auth ─────────────────────────────────────────────────────────────
  async function register({ username, email, password, tiktokUsername }) {
    const out = await request('/auth/register', { method: 'POST', body: { username, email, password } });
    // Auto-login after register so the user lands authenticated.
    try {
      const login = await request('/auth/login', { method: 'POST', body: { email, password } });
      setToken(login.token);
      setUser(login.user);
      // Best-effort: attach TikTok username if they supplied one.
      if (tiktokUsername) {
        const clean = String(tiktokUsername).replace(/^@+/, '');
        try { await request('/auth/profile', { method: 'POST', body: { tiktokUsername: clean } }); } catch (e) {}
      }
      return login;
    } catch (e) {
      return out;
    }
  }

  async function login({ email, password }) {
    const out = await request('/auth/login', { method: 'POST', body: { email, password } });
    setToken(out.token);
    setUser(out.user);
    return out;
  }

  function logout() {
    setToken('');
    setUser(null);
  }

  async function getProfile() {
    const u = await request('/auth/profile');
    setUser(u);
    return u;
  }

  async function updateProfile(patch) {
    const u = await request('/auth/profile', { method: 'POST', body: patch });
    setUser(u);
    return u;
  }

  async function changePassword({ currentPassword, newPassword }) {
    return await request('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  }

  // ─── Mods (public) ────────────────────────────────────────────────────
  async function listMods() {
    return await request('/mods');
  }

  // Resolve a relative imageUrl ("/uploads/mod-images/<id>.png") to a full
  // path. Same origin so just prepend nothing. Adds ?t=<updatedAt> as a
  // cache buster.
  function resolveImg(url, bust) {
    if (!url) return '';
    let full = url;
    if (bust) {
      const b = typeof bust === 'string' ? new Date(bust).getTime() : bust;
      if (b) full += (full.includes('?') ? '&' : '?') + 't=' + b;
    }
    return full;
  }

  global.sgApi = {
    getToken, setToken, getUser, setUser, isAuthed,
    register, login, logout, getProfile, updateProfile, changePassword,
    listMods, resolveImg,
    request,
  };
})(window);

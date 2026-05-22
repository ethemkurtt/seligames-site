// Dynamic bits for the landing page:
//   1) Nav right cluster swaps Giriş/Üye Ol → Profilim/Çıkış when authed.
//   2) #modsGrid is hydrated from GET /api/mods (replaces the static cards).
//   3) Footer "Hesap" column same swap.
(function () {
  if (!window.sgApi) return;

  // ── Nav + footer auth state ───────────────────────────────────────────
  function paintAuthUI() {
    const authed = window.sgApi.isAuthed();
    const user = window.sgApi.getUser();
    const nav = document.getElementById('navRight');
    if (nav) {
      if (authed) {
        const name = (user && (user.username || user.email)) || 'Profilim';
        const isAdmin = user && user.role === 'admin';
        nav.innerHTML = `
          ${isAdmin ? '<a href="admin.html" class="nav-login" style="color:#ff2eb8">⚡ Admin</a>' : ''}
          <a href="profilim.html" class="nav-login" title="${escapeAttr(user?.email || '')}">${escapeHtml(name)}</a>
          <a href="#" class="nav-signup" id="navLogout">Çıkış</a>
        `;
        const out = document.getElementById('navLogout');
        if (out) out.addEventListener('click', (e) => {
          e.preventDefault();
          window.sgApi.logout();
          location.reload();
        });
      }
    }
    const footAcc = document.getElementById('footerAccount');
    if (footAcc) {
      footAcc.innerHTML = authed
        ? `<li><a href="profilim.html">Profilim</a></li>
           <li><a href="#" id="footerLogout">Çıkış Yap</a></li>`
        : `<li><a href="giris-yap.html">Giriş Yap</a></li>
           <li><a href="uye-ol.html">Üye Ol</a></li>
           <li><a href="profilim.html">Profilim</a></li>`;
      const fl = document.getElementById('footerLogout');
      if (fl) fl.addEventListener('click', (e) => {
        e.preventDefault();
        window.sgApi.logout();
        location.reload();
      });
    }
  }

  // ── Live mods grid ────────────────────────────────────────────────────
  function gameTag(category, gameTitle) {
    const c = (category || '').toLowerCase();
    const title = (gameTitle || '').toLowerCase();
    if (/gta/.test(title)) return { cls: 'gta', label: 'GTA V' };
    if (/minecraft/.test(title)) return { cls: 'mc', label: 'MINECRAFT' };
    if (/tower/.test(title)) return { cls: 'multi', label: 'UNITY' };
    if (/pizza|infinite/.test(title)) return { cls: 'multi', label: 'UNREAL' };
    if (/beyblade|harita|puzzle/.test(title)) return { cls: 'multi', label: 'NODE.JS' };
    if (c === 'open-world') return { cls: 'gta', label: 'AÇIK DÜNYA' };
    if (c === 'sandbox') return { cls: 'multi', label: 'SANDBOX' };
    if (c === 'party') return { cls: 'multi', label: 'PARTİ' };
    if (c === 'fps') return { cls: 'multi', label: 'FPS' };
    if (c === 'battle-royale') return { cls: 'multi', label: 'BATTLE ROYALE' };
    return { cls: 'multi', label: (gameTitle || category || 'MOD').toUpperCase() };
  }

  function modMetaLine(m) {
    const sizeMB = m.fileSize ? Math.round(m.fileSize / 1024 / 1024) : null;
    const bits = [];
    if (sizeMB) bits.push(`${sizeMB} MB`);
    bits.push(`v${m.version || '1.0.0'}`);
    return bits.join(' · ');
  }

  function renderCard(m, i) {
    const tag = gameTag(m.category, m.gameTitle);
    const num = String(i + 1).padStart(2, '0');
    const imgUrl = m.imageUrl ? window.sgApi.resolveImg(m.imageUrl, m.updatedAt) : '';
    const desc = (m.description || 'Bu mod için açıklama henüz eklenmedi.').trim();
    // Two layouts: with-cover (image strip on top, body padded) and
    // without-cover (legacy card padding). Avoids margin-collapse hacks.
    if (imgUrl) {
      return `
        <div class="mod-card mod-card-with-img">
          <div class="mod-card-img" style="background-image:url('${escapeAttr(imgUrl)}')"></div>
          <div class="mod-card-body">
            <div class="mod-card-head">
              <span class="feature-num">MOD.${num}</span>
              <span class="mod-game ${tag.cls}">${escapeHtml(tag.label)}</span>
            </div>
            <h3 class="mod-name">${escapeHtml(m.title || '—')}</h3>
            <p class="mod-desc">${escapeHtml(truncate(desc, 220))}</p>
            <div class="mod-meta">${escapeHtml(modMetaLine(m))} · <span class="accent">${m.fileUploadedAt ? 'HAZIR' : 'YAKINDA'}</span></div>
          </div>
        </div>
      `;
    }
    return `
      <div class="mod-card">
        <div class="mod-card-head">
          <span class="feature-num">MOD.${num}</span>
          <span class="mod-game ${tag.cls}">${escapeHtml(tag.label)}</span>
        </div>
        <h3 class="mod-name">${escapeHtml(m.title || '—')}</h3>
        <p class="mod-desc">${escapeHtml(truncate(desc, 220))}</p>
        <div class="mod-meta">${escapeHtml(modMetaLine(m))} · <span class="accent">${m.fileUploadedAt ? 'HAZIR' : 'YAKINDA'}</span></div>
      </div>
    `;
  }

  async function hydrateStats(modCount) {
    // Live counts for the stats strip. Override the data-counter the
    // ScrollTrigger animation reads + write the final text in case the
    // user has already scrolled past the section.
    const sm = document.getElementById('statMods');
    if (sm && typeof modCount === 'number') {
      sm.dataset.counter = String(modCount);
      // If the counter has already animated to its old hardcoded value,
      // overwrite it. ScrollTrigger 'once: true' means it won't replay.
      sm.textContent = String(modCount);
    }
    // Streamer count needs an admin endpoint; do a best-effort fetch and
    // silently leave the default (1) if not reachable / not allowed.
    try {
      const res = await fetch('/api/admin/users', {
        headers: window.sgApi.getToken() ? { Authorization: 'Bearer ' + window.sgApi.getToken() } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.users || data.items || []);
        const ss = document.getElementById('statStreamers');
        if (ss && list.length > 0) {
          ss.dataset.counter = String(list.length);
          ss.textContent = String(list.length);
        }
      }
    } catch (e) { /* silent */ }
  }

  async function hydrateMods() {
    const grid = document.getElementById('modsGrid');
    if (!grid) return;
    try {
      const all = await window.sgApi.listMods();
      const list = (all || []).filter((m) => m && m.isActive !== false);
      hydrateStats(list.length);
      // Best-effort sort: ones with uploaded files first, then newest.
      list.sort((a, b) => {
        const ax = a.fileUploadedAt ? 1 : 0;
        const bx = b.fileUploadedAt ? 1 : 0;
        if (ax !== bx) return bx - ax;
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      });
      if (list.length === 0) {
        grid.dataset.state = 'empty';
        grid.innerHTML = `
          <div class="mod-card" style="grid-column:1/-1;text-align:center;opacity:0.7">
            <h3 class="mod-name">Şu anda gösterilebilecek mod yok.</h3>
            <p class="mod-desc">Admin paneline yeni mod ekledikçe burada görünür.</p>
          </div>`;
        return;
      }
      grid.dataset.state = 'ready';
      grid.innerHTML = list.map(renderCard).join('');
    } catch (e) {
      grid.dataset.state = 'error';
      grid.innerHTML = `
        <div class="mod-card" style="grid-column:1/-1;text-align:center;opacity:0.7">
          <h3 class="mod-name">Modlar yüklenemedi.</h3>
          <p class="mod-desc">Birkaç saniye sonra tekrar dene. (${escapeHtml(e.message || '')})</p>
        </div>`;
    }
  }

  // ── Tiny helpers ──────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }
  function truncate(s, n) {
    s = String(s);
    if (s.length <= n) return s;
    return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
  }

  // ── Run ───────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { paintAuthUI(); hydrateMods(); });
  } else {
    paintAuthUI();
    hydrateMods();
  }
})();

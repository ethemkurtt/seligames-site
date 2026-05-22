// Admin panel — vanilla JS, no framework. Auth-gated; only role:'admin'
// users see the shell. All writes go through /api/* (same backend the
// Electron app and seligame.com itself use).
(function () {
  const $ = (id) => document.getElementById(id);
  const apiBase = '/api';

  // ────── Auth gate ──────
  async function gate() {
    if (!window.sgApi || !window.sgApi.isAuthed()) {
      location.href = 'giris-yap.html?next=admin.html';
      return;
    }
    try {
      const me = await window.sgApi.getProfile();
      if (me.role !== 'admin') {
        alert('Bu sayfa sadece admin kullanıcılar içindir.');
        location.href = 'seligame.html';
        return;
      }
      $('gate').hidden = true;
      $('shell').hidden = false;
      bindShell();
      await Promise.all([loadMods(), loadUsers()]);
      updateStats();
    } catch (err) {
      if (err.status === 401) {
        window.sgApi.logout();
        location.href = 'giris-yap.html?next=admin.html';
        return;
      }
      $('gate').innerHTML = '<div class="gate-label" style="color:#fca5a5">Yüklenemedi: ' + escapeHtml(err.message || 'hata') + '</div>';
    }
  }

  // ────── Top-level wiring ──────
  function bindShell() {
    // Tabs
    document.querySelectorAll('.admin-tab').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
        document.querySelectorAll('.admin-panel').forEach((p) => {
          p.classList.toggle('is-active', p.dataset.panel === b.dataset.tab);
        });
      });
    });
    $('adminLogout').addEventListener('click', () => {
      window.sgApi.logout();
      location.href = 'seligame.html';
    });
    $('newModBtn').addEventListener('click', () => openModEditor(null));
  }

  // ────── MODS ──────
  let modsCache = [];

  async function loadMods() {
    try {
      const list = await window.sgApi.listMods();
      modsCache = list || [];
      renderModGrid();
      updateStats();
    } catch (e) {
      $('adminModGrid').innerHTML = '<div style="grid-column:1/-1;color:#fca5a5">Modlar yüklenemedi: ' + escapeHtml(e.message) + '</div>';
    }
  }

  function renderModGrid() {
    $('modCount').textContent = modsCache.length;
    const grid = $('adminModGrid');
    if (!modsCache.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;color:rgba(255,255,255,0.5);padding:40px;text-align:center;">Henüz mod yok. <b>+ Yeni Mod</b>\'a tıklayıp ilkini oluştur.</div>';
      return;
    }
    grid.innerHTML = modsCache.map((m) => {
      const imgUrl = m.imageUrl ? window.sgApi.resolveImg(m.imageUrl, m.updatedAt) : '';
      const status = !m.isActive ? { cls: 'off', txt: 'PASİF' }
        : m.fileUploadedAt ? { cls: 'up', txt: 'HAZIR' }
        : { cls: 'warn', txt: 'ZIP YOK' };
      const sizeMB = m.fileSize ? Math.round(m.fileSize / 1024 / 1024) + ' MB' : '—';
      return `
        <div class="mod-tile" data-id="${escapeAttr(m._id)}">
          <div class="mod-tile-cover" style="${imgUrl ? `background-image:url('${escapeAttr(imgUrl)}')` : ''}">
            ${imgUrl ? '' : '<div class="mod-tile-noimg">🎮</div>'}
            <div class="mod-tile-status ${status.cls}">● ${status.txt}</div>
          </div>
          <div class="mod-tile-body">
            <div class="mod-tile-game">${escapeHtml(m.gameTitle || m.category || '—')}</div>
            <div class="mod-tile-title">${escapeHtml(m.title || '—')}</div>
            <div class="mod-tile-meta">
              <span>v${escapeHtml(m.version || '1.0.0')}</span>
              <span>${sizeMB}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    grid.querySelectorAll('.mod-tile').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const mod = modsCache.find((m) => m._id === id);
        if (mod) openModEditor(mod);
      });
    });
  }

  // ────── MOD EDITOR (modal) ──────
  let editing = null; // mod object or null (new)

  function openModEditor(mod) {
    editing = mod ? { ...mod } : { title: '', gameTitle: '', version: '1.0.0', category: 'other', description: '', imageUrl: '', isActive: true };
    $('modModalTitle').textContent = mod ? 'Mod Düzenle' : 'Yeni Mod';
    $('m-title').value = editing.title || '';
    $('m-gameTitle').value = editing.gameTitle || '';
    $('m-version').value = editing.version || '1.0.0';
    $('m-category').value = editing.category || 'other';
    $('m-description').value = editing.description || '';
    $('m-imageUrl').value = editing.imageUrl || '';
    $('m-isActive').checked = editing.isActive !== false;
    refreshImagePreview();
    refreshZipBox();
    $('modDeleteBtn').hidden = !mod;
    $('modModalAlert').hidden = true;
    $('modModal').hidden = false;
  }
  function closeModEditor() {
    editing = null;
    $('modModal').hidden = true;
    $('m-zipProg').hidden = true;
  }
  $('modModalClose').addEventListener('click', closeModEditor);
  $('modCancelBtn').addEventListener('click', closeModEditor);

  function refreshImagePreview() {
    const url = ($('m-imageUrl').value || editing?.imageUrl || '').trim();
    const prev = $('m-imagePreview');
    if (url) {
      const full = window.sgApi.resolveImg(url, editing?.updatedAt || Date.now());
      prev.style.backgroundImage = `url('${full}')`;
      prev.textContent = '';
    } else {
      prev.style.backgroundImage = '';
      prev.innerHTML = '<span>—</span>';
    }
    // Image upload button enabled only if mod has an _id
    const hasId = !!editing?._id;
    $('m-imagePick').disabled = !hasId;
    $('m-imageHint').innerHTML = hasId
      ? 'Görsel hemen yüklenir, kaydetmeye gerek yok.'
      : 'Önce <b>Kaydet</b>\'e bas, sonra yükle.';
  }
  $('m-imageUrl').addEventListener('change', refreshImagePreview);
  $('m-imagePick').addEventListener('click', () => $('m-imageFile').click());
  $('m-imageFile').addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
    if (!editing?._id) { alert('Önce modu kaydet.'); return; }
    try {
      const fd = new FormData();
      fd.append('image', f);
      const res = await fetch(`${apiBase}/mods/${editing._id}/image`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + window.sgApi.getToken() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'upload failed');
      editing = data.mod;
      $('m-imageUrl').value = data.mod.imageUrl || '';
      refreshImagePreview();
      flashAlert('Görsel yüklendi.', true);
      // refresh grid in background
      loadMods();
    } catch (err) {
      flashAlert('Görsel yüklenemedi: ' + err.message);
    }
  });

  function refreshZipBox() {
    const hasId = !!editing?._id;
    const hasFile = !!editing?.fileUploadedAt;
    const state = $('m-zipState');
    if (!hasId) {
      state.textContent = 'Önce modu kaydet, sonra ZIP yükle.';
      state.classList.remove('ok');
      $('m-zipPick').disabled = true;
      $('m-zipDelete').hidden = true;
    } else if (hasFile) {
      const size = editing.fileSize ? Math.round(editing.fileSize / 1024 / 1024) + ' MB' : '?';
      state.innerHTML = `📦 <b>${escapeHtml(editing.fileName || 'mod.zip')}</b> · ${size} · yüklendi`;
      state.classList.add('ok');
      $('m-zipPick').disabled = false;
      $('m-zipDelete').hidden = false;
    } else {
      state.textContent = 'ZIP henüz yüklenmedi. Maks. 5 GB (Cloudflare üzerinden ~95 MB sınırı).';
      state.classList.remove('ok');
      $('m-zipPick').disabled = false;
      $('m-zipDelete').hidden = true;
    }
  }
  $('m-zipPick').addEventListener('click', () => $('m-zipFile').click());
  $('m-zipFile').addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
    if (!editing?._id) { alert('Önce modu kaydet.'); return; }
    if (!/\.zip$/i.test(f.name)) { flashAlert('Sadece .zip dosyaları kabul edilir.'); return; }
    const fd = new FormData();
    fd.append('file', f);
    const prog = $('m-zipProg'); const fill = $('m-zipProgFill'); const txt = $('m-zipProgText');
    prog.hidden = false; fill.style.width = '0%'; txt.textContent = '0%';
    try {
      await xhrUpload(`${apiBase}/mods/${editing._id}/upload`, fd, (p) => {
        fill.style.width = p + '%';
        txt.textContent = p + '%';
      });
      flashAlert('ZIP yüklendi.', true);
      // refresh editing + grid
      const fresh = await fetch(`${apiBase}/mods/${editing._id}`).then((r) => r.json());
      editing = fresh;
      refreshZipBox();
      loadMods();
    } catch (err) {
      const msg = err.status === 413 ? "Dosya çok büyük — Cloudflare 100 MB'i geçti, lütfen SCP ile yükle." : err.message;
      flashAlert('ZIP yüklenemedi: ' + msg);
    } finally {
      setTimeout(() => { prog.hidden = true; }, 1200);
    }
  });
  $('m-zipDelete').addEventListener('click', async () => {
    if (!editing?._id) return;
    if (!confirm('Yüklenmiş ZIP silinsin mi? Mod metadata kalır.')) return;
    try {
      await fetch(`${apiBase}/mods/${editing._id}/file`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + window.sgApi.getToken() },
      });
      const fresh = await fetch(`${apiBase}/mods/${editing._id}`).then((r) => r.json());
      editing = fresh;
      refreshZipBox();
      loadMods();
      flashAlert('ZIP silindi.', true);
    } catch (err) {
      flashAlert('Silinemedi: ' + err.message);
    }
  });

  $('modSaveBtn').addEventListener('click', async () => {
    if (!editing) return;
    const payload = {
      title: $('m-title').value.trim(),
      gameTitle: $('m-gameTitle').value.trim(),
      version: $('m-version').value.trim() || '1.0.0',
      category: $('m-category').value,
      description: $('m-description').value.trim(),
      imageUrl: $('m-imageUrl').value.trim() || editing.imageUrl || '',
      isActive: $('m-isActive').checked,
      downloadUrl: editing.downloadUrl || 'internal',
    };
    if (!payload.title) { flashAlert('Başlık zorunlu.'); return; }
    const btn = $('modSaveBtn'); btn.disabled = true; const origLabel = btn.textContent; btn.textContent = 'Kaydediliyor…';
    try {
      let saved;
      if (editing._id) {
        const res = await fetch(`${apiBase}/mods/${editing._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.sgApi.getToken() },
          body: JSON.stringify(payload),
        });
        saved = await res.json();
        if (!res.ok) throw new Error(saved.error || 'save failed');
      } else {
        const res = await fetch(`${apiBase}/mods`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.sgApi.getToken() },
          body: JSON.stringify(payload),
        });
        saved = await res.json();
        if (!res.ok) throw new Error(saved.error || 'save failed');
      }
      editing = saved;
      $('modDeleteBtn').hidden = false;
      $('modModalTitle').textContent = 'Mod Düzenle';
      refreshImagePreview();
      refreshZipBox();
      flashAlert('Kaydedildi.', true);
      loadMods();
    } catch (err) {
      flashAlert('Kayıt başarısız: ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = origLabel;
    }
  });

  $('modDeleteBtn').addEventListener('click', async () => {
    if (!editing?._id) return;
    if (!confirm(`"${editing.title}" silinsin mi? Geri alınamaz.`)) return;
    try {
      const res = await fetch(`${apiBase}/mods/${editing._id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + window.sgApi.getToken() },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'delete failed');
      closeModEditor();
      loadMods();
    } catch (err) {
      flashAlert('Silinemedi: ' + err.message);
    }
  });

  function flashAlert(msg, ok) {
    const el = $('modModalAlert');
    el.textContent = msg;
    el.className = 'modal-alert' + (ok ? ' ok' : '');
    el.hidden = false;
    setTimeout(() => { if (el.textContent === msg) el.hidden = true; }, 3500);
  }

  // ────── USERS ──────
  async function loadUsers() {
    try {
      const res = await fetch(`${apiBase}/admin/users`, {
        headers: { Authorization: 'Bearer ' + window.sgApi.getToken() },
      });
      if (!res.ok) {
        if (res.status === 404) { renderUsersFallback(); return; }
        throw new Error('users endpoint error');
      }
      const data = await res.json();
      const users = Array.isArray(data) ? data : (data.users || data.items || []);
      renderUsers(users);
    } catch (e) {
      renderUsersFallback();
    }
  }
  function renderUsersFallback() {
    $('userCount').textContent = '—';
    document.querySelector('#userTable tbody').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.5);padding:30px;">Kullanıcı listesi backend tarafından henüz expose edilmedi.</td></tr>';
  }
  function renderUsers(users) {
    $('userCount').textContent = users.length;
    $('statUsers').textContent = users.length;
    const tbody = document.querySelector('#userTable tbody');
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.5)">Kullanıcı yok.</td></tr>'; return; }
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td><b>${escapeHtml(u.username || '—')}</b></td>
        <td>${escapeHtml(u.email || '—')}</td>
        <td>${u.tiktokUsername ? '@' + escapeHtml(u.tiktokUsername) : '—'}</td>
        <td><span class="role-pill ${u.role === 'admin' ? 'role-admin' : 'role-user'}">${escapeHtml(u.role || 'user')}</span></td>
        <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '—'}</td>
      </tr>
    `).join('');
  }

  // ────── STATS ──────
  function updateStats() {
    $('statMods').textContent = modsCache.length;
    $('statActive').textContent = modsCache.filter((m) => m.isActive !== false).length;
    $('statUploaded').textContent = modsCache.filter((m) => m.fileUploadedAt).length;
  }

  // ────── Helpers ──────
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // XHR with progress reporting (fetch doesn't expose upload progress).
  function xhrUpload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + window.sgApi.getToken());
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.onload = () => {
        let parsed = null;
        try { parsed = JSON.parse(xhr.responseText); } catch (e) {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(parsed);
        else {
          const err = new Error((parsed && parsed.error) || `HTTP ${xhr.status}`);
          err.status = xhr.status;
          reject(err);
        }
      };
      xhr.onerror = () => reject(new Error('Ağ hatası'));
      xhr.send(formData);
    });
  }

  // ────── go ──────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', gate);
  } else {
    gate();
  }
})();

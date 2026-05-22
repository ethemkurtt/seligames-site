// Profile page — fetches /api/auth/profile, fills the form, and wires the
// two save flows (profile fields + change-password) + logout.
(function () {
  if (!window.sgApi || !window.sgApi.isAuthed()) {
    location.href = 'giris-yap.html';
    return;
  }

  const profileForm = document.getElementById('profileForm');
  const passwordForm = document.getElementById('passwordForm');
  const msgEl = document.getElementById('profile-msg');
  const okEl = document.getElementById('profile-ok');
  const logoutBtn = document.getElementById('logoutBtn');

  const $ = (id) => document.getElementById(id);
  function showError(el, msg) {
    el.textContent = msg; el.style.display = 'block';
    setTimeout(() => { if (el.textContent === msg) { el.style.display = 'none'; } }, 5000);
  }

  function paintUser(u) {
    if (!u) return;
    const display = u.username || u.email || 'kullanıcı';
    document.getElementById('profile-name').textContent = display;
    document.getElementById('profile-email').textContent = u.email || '—';
    document.getElementById('profile-avatar').textContent = display.charAt(0).toUpperCase();
    $('pf-username').value = u.username || '';
    $('pf-fullname').value = u.fullName || '';
    $('pf-tiktok').value = u.tiktokUsername || '';
    $('pf-phone').value = u.phoneNumber || '';
    if (u.birthDate) {
      try { $('pf-birth').value = new Date(u.birthDate).toISOString().slice(0, 10); }
      catch (e) { $('pf-birth').value = ''; }
    }
    if (u.role === 'admin') document.getElementById('profile-role-pill').style.display = '';
  }

  // Fetch fresh profile data from backend on every load (cached `sg_user`
  // may be stale if it was last updated from a different machine).
  (async () => {
    try {
      const u = await window.sgApi.getProfile();
      paintUser(u);
    } catch (err) {
      // Stale/invalid token → boot to login.
      if (err && (err.status === 401 || err.status === 404)) {
        window.sgApi.logout();
        location.href = 'giris-yap.html';
        return;
      }
      showError(msgEl, 'Profil yüklenemedi: ' + (err.message || 'bilinmeyen hata'));
      // Fall back to whatever we have cached.
      paintUser(window.sgApi.getUser());
    }
  })();

  // Save profile fields.
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.style.display = 'none'; okEl.style.display = 'none';
    const patch = {
      username: $('pf-username').value.trim(),
      fullName: $('pf-fullname').value.trim(),
      tiktokUsername: $('pf-tiktok').value.trim().replace(/^@+/, ''),
      phoneNumber: $('pf-phone').value.trim(),
      birthDate: $('pf-birth').value || undefined,
    };
    const btn = document.getElementById('profile-submit');
    btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Kaydediliyor…';
    try {
      const u = await window.sgApi.updateProfile(patch);
      paintUser(u);
      okEl.textContent = '✓ Bilgiler güncellendi.';
      okEl.style.display = 'block';
      setTimeout(() => { okEl.style.display = 'none'; }, 4000);
    } catch (err) {
      let m = err.message || 'Güncelleme başarısız.';
      if (/Username already/i.test(m)) m = 'Bu kullanıcı adı zaten alınmış.';
      showError(msgEl, m);
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // Change password.
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.style.display = 'none'; okEl.style.display = 'none';
    const currentPassword = $('pw-current').value;
    const newPassword = $('pw-new').value;
    if (!currentPassword || !newPassword) { showError(msgEl, 'İki alan da gerekli.'); return; }
    if (newPassword.length < 6) { showError(msgEl, 'Yeni şifre en az 6 karakter olmalı.'); return; }
    const btn = document.getElementById('password-submit');
    btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Güncelleniyor…';
    try {
      await window.sgApi.changePassword({ currentPassword, newPassword });
      $('pw-current').value = ''; $('pw-new').value = '';
      okEl.textContent = '✓ Şifre güncellendi.';
      okEl.style.display = 'block';
      setTimeout(() => { okEl.style.display = 'none'; }, 4000);
    } catch (err) {
      let m = err.message || 'Şifre değiştirilemedi.';
      if (/incorrect|invalid/i.test(m)) m = 'Mevcut şifre hatalı.';
      showError(msgEl, m);
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    window.sgApi.logout();
    location.href = 'seligame.html';
  });
})();

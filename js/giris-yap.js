// Login — POST /api/auth/login → store JWT → redirect to profile.
(function () {
  if (window.sgApi && window.sgApi.isAuthed()) {
    location.href = 'profilim.html';
    return;
  }

  const form = document.getElementById('loginForm');
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-submit');

  function showError(msg) {
    if (!errEl) { alert(msg); return; }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
  function clearError() { if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; } }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showError('E-posta ve şifre gerekli.'); return; }
    btn.disabled = true;
    const origLabel = btn.textContent;
    btn.textContent = 'Giriş yapılıyor…';
    try {
      await window.sgApi.login({ email, password });
      location.href = 'profilim.html';
    } catch (err) {
      const msg = err && err.message
        ? (/User not found/i.test(err.message) ? 'Kullanıcı bulunamadı.'
           : /Invalid credentials/i.test(err.message) ? 'E-posta veya şifre hatalı.'
           : err.message)
        : 'Giriş başarısız.';
      showError(msg);
      btn.disabled = false;
      btn.textContent = origLabel;
    }
  });
})();

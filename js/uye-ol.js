// Sign-up — POST /api/auth/register → auto-login → redirect to profile.
(function () {
  if (window.sgApi && window.sgApi.isAuthed()) {
    location.href = 'profilim.html';
    return;
  }

  const form = document.getElementById('signupForm');
  const errEl = document.getElementById('signup-error');
  const btn = document.getElementById('signup-submit');

  function showError(msg) {
    if (!errEl) { alert(msg); return; }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
  function clearError() { if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; } }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const username = document.getElementById('su-username').value.trim();
    const email = document.getElementById('su-email').value.trim();
    const tiktokUsername = document.getElementById('su-tiktok').value.trim();
    const password = document.getElementById('su-password').value;
    const password2 = document.getElementById('su-password2').value;
    const terms = document.getElementById('su-terms').checked;

    if (!username || !email || !password) { showError('Tüm zorunlu alanları doldur.'); return; }
    if (username.length < 3 || username.length > 20) { showError('Kullanıcı adı 3-20 karakter olmalı.'); return; }
    if (password.length < 6) { showError('Şifre en az 6 karakter olmalı.'); return; }
    if (password !== password2) { showError('Şifreler eşleşmiyor.'); return; }
    if (!terms) { showError('Kullanım koşullarını kabul etmen gerekli.'); return; }

    btn.disabled = true;
    const origLabel = btn.textContent;
    btn.textContent = 'Hesap oluşturuluyor…';
    try {
      await window.sgApi.register({ username, email, password, tiktokUsername });
      location.href = 'profilim.html';
    } catch (err) {
      let msg = (err && err.message) || 'Kayıt başarısız.';
      if (/duplicate key|E11000/i.test(msg)) msg = 'Bu e-posta veya kullanıcı adı zaten kayıtlı.';
      else if (/already/i.test(msg)) msg = 'Bu kullanıcı adı zaten alınmış.';
      else if (/All fields/i.test(msg)) msg = 'Tüm zorunlu alanları doldur.';
      showError(msg);
      btn.disabled = false;
      btn.textContent = origLabel;
    }
  });
})();

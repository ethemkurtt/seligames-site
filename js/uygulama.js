// uygulama.html — auth-aware nav (shared pattern with landing).
(function () {
  if (!window.sgApi) return;
  function paintNav() {
    const nav = document.getElementById('navRight');
    if (!nav) return;
    if (window.sgApi.isAuthed()) {
      const u = window.sgApi.getUser();
      const name = (u && (u.username || u.email)) || 'Profilim';
      const isAdmin = u && u.role === 'admin';
      nav.innerHTML = `
        ${isAdmin ? '<a href="admin.html" class="nav-login" style="color:#ff2eb8">⚡ Admin</a>' : ''}
        <a href="profilim.html" class="nav-login">${escapeHtml(name)}</a>
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
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintNav);
  } else {
    paintNav();
  }
})();

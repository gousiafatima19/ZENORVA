
/* ============================================================
   ZENVORA — Profile
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA;
  var api = Z.api;
  var auth = Z.auth;
  var layout = Z.layout;

  function init() {
    renderUser();
    wireActions();
    wireForm();
  }

  function renderUser() {
    var user = (auth && auth.getUser) ? auth.getUser() : {};

    var name  = user.username || user.name || 'ZENVORA User';
    var email = user.email || '';
    var role  = user.role || 'user';

    /* Header */
    setText('profileName', name);
    setText('profileEmail', email);
    setText('profileJoined', user.date_joined ? ('Joined ' + user.date_joined.slice(0, 10)) : '—');
    setText('profileAvatar', initials(name));

    /* Topbar avatar */
    setText('avatarInitials', initials(name));

    /* Form fields */
    setValue('profName', name);
    setValue('profEmail', email);
    setValue('profPhone', user.phone || '');
    setValue('profLocation', user.city || '');
  }

  function initials(name) {
    var parts = String(name).trim().split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return 'ZK';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function wireActions() {
    var changeAvatarBtn = document.getElementById('changeAvatarBtn');
    if (changeAvatarBtn) changeAvatarBtn.addEventListener('click', function () {
      layout.toast('Avatar upload coming soon.', 'info');
    });

    var logoutBtn = document.getElementById('logoutBtn2');
    if (logoutBtn) logoutBtn.addEventListener('click', function () {
      if (confirm('Sign out?')) {
        if (auth && auth.logout) auth.logout();
        else window.location.href = 'login.html';
      }
    });
  }

  function wireForm() {
    var form = document.getElementById('profileForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var btn = document.getElementById('saveProfileBtn');
      setLoading(btn, true);

      var payload = {
        name:  (document.getElementById('profName') || {}).value || '',
        email: (document.getElementById('profEmail') || {}).value || '',
        phone: (document.getElementById('profPhone') || {}).value || '',
        city:  (document.getElementById('profLocation') || {}).value || ''
      };

      /* Update local user object */
      var user = auth.getUser() || {};
      user.username = payload.name;
      user.email = payload.email;
      user.phone = payload.phone;
      user.city = payload.city;

      try { localStorage.setItem('zenvora_user', JSON.stringify(user)); } catch (err) {}

      /* Try the backend if it exposes a profile endpoint */
      var promise;
      if (api && api.get && api.patch) {
        promise = api.patch('/api/users/me/', payload).catch(function () {
          return api.patch('/api/profile/', payload);
        }).catch(function () {
          return { ok: true, offline: true };
        });
      } else {
        promise = Promise.resolve({ ok: true, offline: true });
      }

      promise.then(function () {
        layout.toast('Profile saved.', 'success');
        renderUser();
      }).catch(function (err) {
        layout.toast((err && err.message) || 'Could not save profile.', 'error');
      }).then(function () {
        setLoading(btn, false);
      });
    });

    form.addEventListener('reset', function () {
      setTimeout(renderUser, 0);
    });
  }

  function setLoading(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    var l = btn.querySelector('.btn-label');
    var s = btn.querySelector('.btn-spinner');
    if (l) l.hidden = on;
    if (s) s.hidden = !on;
    if (window.lucide) lucide.createIcons();
  }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v == null ? '—' : String(v);
  }

  function setValue(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v == null ? '' : String(v);
  }

  /* Expose BOTH init() and profilePage.init() — your HTML calls profilePage */
  Z.profile = { init: init };
  Z.profilePage = { init: init };
})();
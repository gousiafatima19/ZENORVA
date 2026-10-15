/* ============================================================
   ZENVORA - Profile
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA || {};

  function init() {
    renderUser();
    wireActions();
    wireForm();
  }

  function api()  { return Z.api || null; }
  function auth() { return Z.auth || null; }
  function layout() { return Z.layout || null; }

  function getUser() {
    var a = auth();
    if (a && typeof a.getUser === 'function') {
      try { return a.getUser() || {}; } catch (e) { return {}; }
    }
    /* Fallback: read directly from localStorage */
    try {
      var raw = localStorage.getItem('zenvora_user');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function renderUser() {
    var user = getUser();

    var name  = user.username || user.name || 'ZENVORA User';
    var email = user.email || '';
    var role  = user.role || 'user';

    /* Header */
    setText('profileName', name);
    setText('profileEmail', email);
    setText('profileJoined',
      (typeof user.date_joined === 'string' && user.date_joined.length >= 10)
        ? ('Joined ' + user.date_joined.slice(0, 10))
        : '');
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
    var parts = String(name || '').trim().split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return 'ZK';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function wireActions() {
    var changeAvatarBtn = document.getElementById('changeAvatarBtn');
    if (changeAvatarBtn) {
      changeAvatarBtn.addEventListener('click', function () {
        var l = layout();
        if (l && typeof l.toast === 'function') l.toast('Avatar upload coming soon.', 'info');
      });
    }

    var logoutBtn = document.getElementById('logoutBtn2');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        if (!confirm('Sign out?')) return;
        var a = auth();
        if (a && typeof a.logout === 'function') a.logout();
        else window.location.href = 'login.html';
      });
    }
  }

  function wireForm() {
    var form = document.getElementById('profileForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var btn = document.getElementById('saveProfileBtn');
      setLoading(btn, true);

      var payload = {
        name:     (document.getElementById('profName') || {}).value || '',
        username: (document.getElementById('profName') || {}).value || '',
        email:    (document.getElementById('profEmail') || {}).value || '',
        phone:    (document.getElementById('profPhone') || {}).value || '',
        city:     (document.getElementById('profLocation') || {}).value || ''
      };

      /* Update local user object */
      var user = getUser();
      user.username = payload.name;
      user.name     = payload.name;
      user.email    = payload.email;
      user.phone    = payload.phone;
      user.city     = payload.city;

      try { localStorage.setItem('zenvora_user', JSON.stringify(user)); } catch (err) { /* ignore */ }

      /* Persist to backend if possible */
      var apiRef = api();
      var promise;

      if (apiRef && apiRef.users && typeof apiRef.users.update === 'function') {
        promise = apiRef.users.update(payload).catch(function () {
          return { ok: true, offline: true };
        });
      } else if (apiRef && typeof apiRef.patch === 'function') {
        promise = apiRef.patch('/api/users/me/', payload)
          .catch(function () { return apiRef.patch('/api/profile/', payload); })
          .catch(function () { return { ok: true, offline: true }; });
      } else {
        promise = Promise.resolve({ ok: true, offline: true });
      }

      promise.then(function (res) {
        var l = layout();
        if (l && typeof l.toast === 'function') {
          if (res && res.offline) l.toast('Profile saved locally.', 'info');
          else l.toast('Profile saved.', 'success');
        }
        renderUser();
      }).catch(function (err) {
        console.warn('[profile] save failed:', err && err.message);
        var l = layout();
        if (l && typeof l.toast === 'function') {
          l.toast((err && err.message) || 'Could not save profile.', 'error');
        }
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
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = (v == null ? '' : String(v));
  }

  function setValue(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = (v == null ? '' : String(v));
  }

  /* Expose BOTH init() and profilePage.init() - your HTML calls profilePage */
  Z.profile = { init: init };
  Z.profilePage = { init: init };
})();

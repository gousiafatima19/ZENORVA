/* ============================================================
   ZENVORA — Notifications
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA;
  var api = Z.api;
  var layout = Z.layout;

  var all = [];
  var filter = 'all';

  var DEMO = [
    { id: 1, title: 'Spinach expires tomorrow', body: 'Use it or freeze it today.',                 time: '2h ago',     type: 'expiry',    is_read: false, is_demo: true },
    { id: 2, title: 'Donation collected',        body: 'Hope Shelter collected your cooked meals.', time: 'Yesterday',  type: 'donations', is_read: false, is_demo: true },
    { id: 3, title: 'New offer at Fresh Bazaar', body: '20% off on fresh vegetables this week.',     time: '2 days ago', type: 'offers',    is_read: true,  is_demo: true },
    { id: 4, title: 'Cook timer finished',       body: 'Your step timer just completed.',            time: '3 days ago', type: 'cooking',   is_read: true,  is_demo: true }
  ];

  /* ---- Init (both names work) ---- */
  function init() {
    wireTabs();
    wireMarkAll();
    load();
  }

  function load() {
    var p = (api && api.notifications) ? api.notifications() : Promise.reject(new Error('no endpoint'));
    Promise.resolve(p).then(function (data) {
      var arr = Array.isArray(data) ? data : (data && data.results) || [];
      all = arr.length ? arr.map(normalize) : DEMO;
      render();
    }).catch(function (err) {
      console.warn('[notifications] using demo:', err && err.message);
      all = DEMO;
      render();
    });
  }

  function normalize(n) {
    return {
      id:      n.id,
      title:   n.title || n.subject || 'Notification',
      body:    n.body  || n.message || '',
      time:    n.time  || n.created_at || '',
      type:    n.type  || n.category || 'system',
      is_read: n.is_read === true || n.read === true,
      is_demo: n.is_demo === true
    };
  }

  function wireTabs() {
    var tabs = document.querySelectorAll('.notif-tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener('click', function () {
          for (var j = 0; j < tabs.length; j++) {
            tabs[j].classList.remove('active');
            tabs[j].setAttribute('aria-selected', 'false');
          }
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
          /* Your HTML uses data-cat; some versions use data-filter — support both */
          filter = tab.getAttribute('data-cat') || tab.getAttribute('data-filter') || 'all';
          render();
        });
      })(tabs[i]);
    }
  }

  function wireMarkAll() {
    var btn = document.getElementById('markAllReadBtn');
    if (btn) btn.addEventListener('click', function () {
      all = all.map(function (n) { n.is_read = true; return n; });
      render();
      layout.toast('All notifications marked as read.', 'success');
    });
  }

  function render() {
    var wrap = document.getElementById('notifList');
    if (!wrap) return;

    var list = all.filter(function (n) {
      if (filter === 'all') return true;
      if (filter === 'unread') return !n.is_read;
      return n.type === filter;
    });

    if (!list.length) {
      wrap.innerHTML = '<li class="empty-state">No notifications in this view.</li>';
      return;
    }

    var html = '';
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      var icon = n.type === 'expiry'    ? 'alarm-clock' :
                 n.type === 'cooking'   ? 'flame'       :
                 n.type === 'donations' ? 'hand-heart'  :
                 n.type === 'offers'    ? 'tag'         : 'bell';
      html += '<li class="notif-item ' + (n.is_read ? '' : 'unread') + ' ' + n.type + '">'
            +   '<span class="notif-icon"><i data-lucide="' + icon + '"></i></span>'
            +   '<div class="notif-body">'
            +     '<p class="notif-title">' + layout.escapeHtml(n.title) + '</p>'
            +     '<p class="notif-text">'  + layout.escapeHtml(n.body)  + '</p>'
            +     '<span class="notif-time">' + layout.escapeHtml(n.time) + '</span>'
            +   '</div>'
            + '</li>';
    }
    wrap.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  /* Expose BOTH init() and initPage() — your HTML calls initPage */
  Z.notifications = {
    init: init,
    initPage: init
  };
})();
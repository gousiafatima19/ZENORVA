/* ============================================================
   ZENVORA — Donations overview page
   Called from donations.html via ZENVORA.donations.initOverview()
   ShelterConnect uses shelter-connect.js (separate file).
   ============================================================ */

(function () {
  'use strict';

  const { api, layout } = window.ZENVORA;

  const STATUS_BADGE = {
    available: 'info',
    reserved:  'warn',
    collected: 'gold',
    delivered: 'success'
  };

  function statusBadge(status) {
    const cls = STATUS_BADGE[status] || 'muted';
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '-';
    return '<span class="badge badge-' + cls + '">' + layout.escapeHtml(label) + '</span>';
  }

  /* ---------------------------------------------------------
     Overview page (donations.html)
     --------------------------------------------------------- */
  async function initOverview() {
    try {
      const data = await api.donations.list();
      const arr = Array.isArray(data) ? data : (data.results || []);
      renderOverviewStats(arr);
      renderOverviewList(arr);
    } catch (err) {
      renderOverviewStats([]);
      const ul = document.getElementById('donationsList');
      if (ul) ul.innerHTML = '<li class="empty-state">Could not load donations.</li>';
      layout.toast('Donation service unavailable.', 'warn');
    }
  }

  function renderOverviewStats(arr) {
    const count = function (s) {
      return arr.filter(function (d) { return d.status === s; }).length;
    };
    setText('donStatAvailable', count('available'));
    setText('donStatReserved',  count('reserved'));
    setText('donStatCollected', count('collected'));
    setText('donStatDelivered', count('delivered'));
  }

  function renderOverviewList(arr) {
    const ul = document.getElementById('donationsList');
    if (!ul) return;

    if (!arr.length) {
      ul.innerHTML = ''
        + '<li class="empty-state">'
        +   'No donations yet. List surplus food from '
        +   '<a href="shelter-connect.html" style="text-decoration:underline">ShelterConnect</a>.'
        + '</li>';
      return;
    }

    ul.innerHTML = arr.map(function (d) {
      return ''
        + '<li>'
        +   '<span class="mini-icon"><i data-lucide="package"></i></span>'
        +   '<div class="mini-body">'
        +     '<p class="mini-title">' + layout.escapeHtml(d.foodType || 'Donation') + '</p>'
        +     '<p class="mini-sub">'
        +       layout.escapeHtml(d.quantity || '')
        +       (d.shelterName ? ' - ' + layout.escapeHtml(d.shelterName) : ' - unassigned')
        +     '</p>'
        +   '</div>'
        +   statusBadge(d.status)
        + '</li>';
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */
  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = (v == null) ? '-' : v;
  }

  /* ---------------------------------------------------------
     Export
     --------------------------------------------------------- */
  window.ZENVORA.donations = {
    initOverview: initOverview
  };
})();

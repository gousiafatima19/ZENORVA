/* ============================================================
   ZENVORA — Dashboard
   ============================================================ */

(function () {
  'use strict';

  const { api, layout, auth } = window.ZENVORA;
  let weeklyChartInstance = null;

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text == null ? '' : String(text);
  }
  function setMeta(id, text) { setText(id, text); }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr); if (isNaN(d)) return null;
    const t = new Date(); t.setHours(0,0,0,0); d.setHours(0,0,0,0);
    return Math.round((d - t) / 86400000);
  }

  function expiryBadge(dateStr) {
    const d = daysUntil(dateStr);
    if (d == null) return { cls: 'muted', label: 'No date' };
    if (d < 0)   return { cls: 'danger', label: 'Expired' };
    if (d === 0) return { cls: 'danger', label: 'Today' };
    if (d === 1) return { cls: 'warn',   label: '1 day' };
    if (d <= 3)  return { cls: 'warn',   label: d + ' days' };
    return { cls: 'success', label: d + ' days' };
  }

  function displayName() {
    const u = auth.getUser() || {};
    let n = u.username || u.name || u.email || 'there';
    if (n.includes('@')) n = n.split('@')[0];
    return n;
  }

  function initials() {
    let n = displayName();
    const parts = String(n).trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(n).substring(0, 2).toUpperCase();
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  async function loadPantryStats() {
    try {
      const items = await api.pantry.list();
      const total = items.length;

      const expiring = items.filter(function (i) {
        const d = daysUntil(i.expiry);
        return d != null && d >= 0 && d <= 3;
      }).length;

      const expired = items.filter(function (i) {
        const d = daysUntil(i.expiry);
        return d != null && d < 0;
      }).length;

      setText('statPantry', total);
      setMeta('statPantryMeta', total === 1 ? '1 item' : total + ' items');

      setText('statExpiring', expiring);
      setMeta('statExpiringMeta', expired ? expired + ' expired' : 'next 3 days');

      renderExpiringList(items);
      renderRecentList(items);
    } catch (err) {
      console.warn('[dashboard] pantry load failed:', err && err.message);
      setText('statPantry', '-');
      setMeta('statPantryMeta', 'Unavailable');
      setText('statExpiring', '-');
      setMeta('statExpiringMeta', 'Unavailable');
    }
  }

  function renderExpiringList(items) {
    const box = document.getElementById('expiringList');
    if (!box) return;

    const soon = items
      .map(function (i) { return { item: i, d: daysUntil(i.expiry) }; })
      .filter(function (x) { return x.d != null && x.d <= 3; })
      .sort(function (a, b) { return a.d - b.d; })
      .slice(0, 5);

    if (!soon.length) {
      box.innerHTML = '<li class="empty-state">Nothing expiring in the next 3 days.</li>';
      return;
    }

    box.innerHTML = soon.map(function (x) {
      const item = x.item;
      const b = expiryBadge(item.expiry);
      const demo = item.is_demo ? '<span class="badge badge-warn" style="margin-left:6px">DEMO</span>' : '';
      return '<li class="mini-item">'
        + '<div class="mini-main">'
        +   '<strong>' + layout.escapeHtml(item.name) + '</strong>' + demo
        +   '<span class="mini-sub">' + layout.escapeHtml(String(item.quantity == null ? '' : item.quantity)) + ' ' + layout.escapeHtml(item.unit || '') + '</span>'
        + '</div>'
        + '<span class="badge badge-' + b.cls + '">' + b.label + '</span>'
        + '</li>';
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  function renderRecentList(items) {
    const box = document.getElementById('recentList');
    if (!box) return;

    const recent = items.slice()
      .sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); })
      .slice(0, 5);

    if (!recent.length) {
      box.innerHTML = '<li class="empty-state">No items added yet.</li>';
      return;
    }

    box.innerHTML = recent.map(function (i) {
      const b = expiryBadge(i.expiry);
      return '<li class="mini-item">'
        + '<div class="mini-main">'
        +   '<strong>' + layout.escapeHtml(i.name) + '</strong>'
        +   '<span class="mini-sub">' + layout.escapeHtml(String(i.quantity == null ? '' : i.quantity)) + ' ' + layout.escapeHtml(i.unit || '') + ' - added ' + layout.formatDate(i.createdAt) + '</span>'
        + '</div>'
        + '<span class="badge badge-' + b.cls + '">' + b.label + '</span>'
        + '</li>';
    }).join('');
  }

  async function loadNotifications() {
    try {
      const data = await api.notifications();
      const list = Array.isArray(data) ? data : (data.results || []);
      const unread = list.filter(function (n) { return n.is_read === false || n.unread === true; }).length;

      const badge  = document.getElementById('notifBadge');
      const sidebar = document.getElementById('sidebarNotifBadge');

      if (badge) {
        badge.textContent = unread;
        badge.hidden = unread === 0;
      }
      if (sidebar) {
        sidebar.textContent = unread;
        sidebar.hidden = unread === 0;
      }
    } catch (err) {
      console.warn('[dashboard] notifications load failed:', err && err.message);
    }
  }

  async function loadImpact() {
    try {
      const data = await api.impact();
      if (!data) return;

      const verifiedCount = (data.verified && data.verified.delivered)
        ? data.verified.delivered.donations_count : 0;
      const demoCount = (data.demo && data.demo.delivered)
        ? data.demo.delivered.donations_count : 0;
      const total = (verifiedCount || 0) + (demoCount || 0);

      setText('statDonated', total);
      setMeta('statDonatedMeta', total === 1 ? 'meal donated' : 'meals donated');
    } catch (err) {
      console.warn('[dashboard] impact load failed:', err && err.message);
      setText('statDonated', 0);
      setMeta('statDonatedMeta', 'meals donated');
    }
  }

  async function loadRecipes() {
    const box = document.getElementById('suggestedRecipes');
    if (!box) return;

    try {
      const items = await api.pantry.list();
      const ids = items.map(function (i) { return i.id; });

      const data = await api.recipes.recommend(ids);
      const list = Array.isArray(data) ? data : (data.results || []);

      setText('statRecipes', list.length);
      setMeta('statRecipesMeta', list.length === 1 ? 'recipe available' : 'recipes available');

      if (!list.length) {
        box.innerHTML = '<p class="empty-state">No recipes yet. Add more to your pantry.</p>';
        return;
      }

      box.innerHTML = list.slice(0, 4).map(function (r) {
        const id = r.id;
        const have = (r.have || []).length;
        const miss = (r.missing || []).length;
        const cost = r.cost || r.estimated_cost || 0;
        const time = r.prep_time || r.cooking_time_min || 0;
        return '<a href="recipe-detail.html?id=' + id + '" class="recipe-mini">'
          + '<div class="recipe-mini-body">'
          +   '<strong>' + layout.escapeHtml(r.name) + '</strong>'
          +   '<span class="mini-sub">' + time + ' min - Rs.' + cost + '</span>'
          +   '<span class="mini-sub">'
          +     (have ? have + ' have' : '')
          +     (miss ? ' - ' + miss + ' missing' : '')
          +   '</span>'
          + '</div>'
          + '</a>';
      }).join('');
    } catch (err) {
      console.warn('[dashboard] recipes load failed:', err && err.message);
      setText('statRecipes', 0);
      setMeta('statRecipesMeta', 'recipes available');
      box.innerHTML = '<p class="empty-state">Could not load recipes.</p>';
    }
  }

  async function loadNearby() {
    const box = document.getElementById('nearbyList');
    if (!box) return;

    try {
      const data = await api.shelters();
      const list = Array.isArray(data) ? data : (data.results || []);

      if (!list.length) {
        box.innerHTML = '<li class="empty-state">No shelters nearby.</li>';
        return;
      }

      box.innerHTML = list.slice(0, 4).map(function (s) {
        const dist = s.distance_km != null ? Number(s.distance_km).toFixed(1) + ' km' : '';
        return '<li class="mini-item">'
          + '<div class="mini-main">'
          +   '<strong>' + layout.escapeHtml(s.name || 'Shelter') + '</strong>'
          +   '<span class="mini-sub">' + layout.escapeHtml(s.address || s.city || '') + '</span>'
          + '</div>'
          + (dist ? '<span class="mini-sub">' + dist + '</span>' : '')
          + '</li>';
      }).join('');
    } catch (err) {
      console.warn('[dashboard] shelters load failed:', err && err.message);
      box.innerHTML = '<li class="empty-state">Could not load nearby.</li>';
    }
  }

  async function loadDonations() {
    const box = document.getElementById('donationsPreview');
    if (!box) return;

    try {
      const data = await api.get('/api/donations/');
      const list = Array.isArray(data) ? data : (data.results || []);
      if (!list.length) {
        box.innerHTML = '<li class="empty-state">No active donations.</li>';
        return;
      }
      box.innerHTML = list.slice(0, 4).map(function (d) {
        const status = d.status || d.state || 'pending';
        return '<li class="mini-item">'
          + '<div class="mini-main">'
          +   '<strong>' + layout.escapeHtml(d.food_type || d.item_name || 'Donation') + '</strong>'
          +   '<span class="mini-sub">' + layout.escapeHtml(d.shelter_name || d.shelter || '') + '</span>'
          + '</div>'
          + '<span class="badge badge-info">' + layout.escapeHtml(status) + '</span>'
          + '</li>';
      }).join('');
    } catch (err) {
      console.warn('[dashboard] donations load failed:', err && err.message);
      box.innerHTML = '<li class="empty-state">No active donations.</li>';
    }
  }

  async function loadShoppingList() {
    const box = document.getElementById('shoppingListPreview');
    const summary = document.getElementById('shoppingSummary');
    if (!box) return;

    try {
      const items = await api.pantry.list();
      const low = items.filter(function (i) {
        if (i.lowStockThreshold == null) return false;
        return Number(i.quantity || 0) <= Number(i.lowStockThreshold);
      });

      if (summary) summary.textContent = low.length ? low.length + ' items to restock' : 'All good';

      if (!low.length) {
        box.innerHTML = '<li class="empty-state">Nothing to restock right now.</li>';
        return;
      }

      box.innerHTML = low.slice(0, 5).map(function (i) {
        return '<li class="mini-item">'
          + '<div class="mini-main">'
          +   '<strong>' + layout.escapeHtml(i.name) + '</strong>'
          +   '<span class="mini-sub">' + layout.escapeHtml(String(i.quantity == null ? '' : i.quantity)) + ' ' + layout.escapeHtml(i.unit || '') + '</span>'
          + '</div>'
          + '</li>';
      }).join('');
    } catch (err) {
      if (summary) summary.textContent = '-';
      box.innerHTML = '<li class="empty-state">Could not load shopping list.</li>';
    }
  }

  async function loadWeeklyChart() {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas || !window.Chart) return;

    try {
      const items = await api.pantry.list();
      const days = [];
      const counts = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        const label = d.toLocaleDateString(undefined, { weekday: 'short' });
        const count = items.filter(function (it) {
          const created = new Date(it.createdAt || 0);
          return created >= d && created < next;
        }).length;
        days.push(label);
        counts.push(count);
      }

      if (weeklyChartInstance) weeklyChartInstance.destroy();
      weeklyChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: days,
          datasets: [{
            label: 'Added',
            data: counts,
            backgroundColor: '#254B3B',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    } catch (err) {
      console.warn('[dashboard] chart load failed:', err && err.message);
    }
  }

  function loadWelcome() {
    const title = document.getElementById('welcomeTitle');
    const initialsEl = document.getElementById('avatarInitials');
    const name = displayName();

    if (title) title.textContent = greeting() + (name ? ', ' + name : '');
    if (initialsEl) initialsEl.textContent = initials();
  }

  function init() {
    loadWelcome();
    loadPantryStats();
    loadNotifications();
    loadImpact();
    loadRecipes();
    loadNearby();
    loadDonations();
    loadShoppingList();
    loadWeeklyChart();
  }

  window.ZENVORA.dashboard = { init };
})();

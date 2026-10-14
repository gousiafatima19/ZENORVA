/* ============================================================
   ZENVORA — Shops & Offers
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA;
  var api = Z.api;
  var layout = Z.layout;

  var DEMO_SHOPS = [
    { id: 's1', name: 'Green Grocer', category: 'vegetables', price: 40, unitPrice: '₹20/kg',
      discount: '10% off', distanceKm: 0.8, product: 'Tomatoes', demo: true },
    { id: 's2', name: 'Fresh Mart', category: 'fruits', price: 120, unitPrice: '₹60/kg',
      discount: '', distanceKm: 1.6, product: 'Apples', demo: true },
    { id: 's3', name: 'Daily Dairy', category: 'dairy', price: 32, unitPrice: '₹32/L',
      discount: '5% off', distanceKm: 2.1, product: 'Milk', demo: true }
  ];

  var allShops = [];
  var state = {
    search: '', category: '', price: '', distance: '',
    discountOnly: false, favoritesOnly: false
  };
  var viewMode = 'grid';

  /* ---------- INIT ---------- */
  function init() {
    wireFilters();
    wireViewToggle();
    load();
  }

  /* ---------- LOAD ---------- */
  function load() {
    if (!api.shops || !api.shops.list) {
      allShops = DEMO_SHOPS;
      render();
      return;
    }
    api.shops.list().then(function (data) {
      allShops = Array.isArray(data) ? data : (data.results || []);
      if (!allShops.length) allShops = DEMO_SHOPS;
      render();
    }).catch(function (err) {
      console.warn('[shops] using demo:', err && err.message);
      allShops = DEMO_SHOPS;
      render();
    });
  }

  /* ---------- RENDER ---------- */
  function render() {
    var wrap = document.getElementById('shopResults');
    if (!wrap) return;

    var list = allShops.slice();

    if (state.search) {
      var q = state.search.toLowerCase();
      list = list.filter(function (s) {
        return (s.name || '').toLowerCase().indexOf(q) !== -1
            || (s.product || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (state.category) list = list.filter(function (s) { return s.category === state.category; });
    if (state.distance) {
      var max = parseFloat(state.distance);
      list = list.filter(function (s) { return (s.distanceKm == null ? Infinity : s.distanceKm) <= max; });
    }
    if (state.discountOnly) list = list.filter(function (s) { return !!s.discount; });
    if (state.favoritesOnly) list = list.filter(function (s) { return s.favorite; });

    if (state.price) {
      var parts = state.price.split('-');
      var min = parseFloat(parts[0].replace('+', ''));
      var maxP = parts[1] ? parseFloat(parts[1]) : Infinity;
      var isPlus = state.price.indexOf('+') !== -1;
      list = list.filter(function (s) {
        var p = Number(s.price) || 0;
        if (isPlus) return p >= min;
        return p >= min && p <= maxP;
      });
    }

    wrap.className = 'shop-results ' + (viewMode === 'list' ? 'shop-list' : 'shop-grid');

    if (!list.length) {
      wrap.innerHTML = '<p class="empty-state">No shops match your filters.</p>';
      return;
    }

    var html = '';
    for (var i = 0; i < list.length; i++) html += shopCard(list[i]);
    wrap.innerHTML = html;

    if (window.lucide) lucide.createIcons();
  }

  function shopCard(s) {
    var price = s.price != null ? '₹' + s.price : '';
    var was = s.originalPrice ? '₹' + s.originalPrice : '';
    var safeName = layout.escapeHtml(s.name || 'Shop');
    var safeId = layout.escapeHtml(String(s.id));

    var meta = '';
    if (s.distanceKm != null) meta += '<span><i data-lucide="map-pin"></i> ' + s.distanceKm + ' km</span>';
    if (s.category) meta += '<span><i data-lucide="tag"></i> ' + layout.escapeHtml(s.category) + '</span>';
    if (s.demo) meta += '<span class="badge badge-muted">demo</span>';

    var product = s.product ? '<p style="margin:0 0 8px;font-weight:600;color:var(--zv-forest)">' + layout.escapeHtml(s.product) + '</p>' : '';
    var discount = s.discount ? '<span class="badge badge-gold" style="margin-bottom:10px">' + layout.escapeHtml(s.discount) + '</span>' : '';

    return ''
      + '<article class="shop-card">'
      +   '<div class="shop-card-img" style="display:grid;place-items:center;color:var(--zv-muted)">'
      +     '<i data-lucide="store" style="width:42px;height:42px"></i>'
      +   '</div>'
      +   '<div class="shop-card-body">'
      +     '<h3 class="shop-card-title">' + safeName + '</h3>'
      +     '<div class="shop-card-meta">' + meta + '</div>'
      +     product
      +     '<div class="shop-card-price">' + price
      +       (was ? '<span class="was">' + was + '</span>' : '')
      +       (s.unitPrice ? '<span class="unit">' + layout.escapeHtml(s.unitPrice) + '</span>' : '')
      +     '</div>'
      +     discount
      +     '<div style="display:flex;gap:8px">'
      +       '<button class="btn btn-primary btn-sm" data-action="add" data-id="' + safeId + '">'
      +         '<i data-lucide="plus"></i> Add to list'
      +       '</button>'
      +       '<button class="btn btn-ghost btn-sm" data-action="fav" data-id="' + safeId + '">'
      +         '<i data-lucide="heart"></i>'
      +       '</button>'
      +     '</div>'
      +   '</div>'
      + '</article>';
  }

  /* ---------- FILTERS ---------- */
  function wireFilters() {
    var s = document.getElementById('shopSearch');
    var g = document.getElementById('globalSearch');

    var onSearch = layout.debounce(function (v) { state.search = v; render(); }, 180);
    if (s) s.addEventListener('input', function (e) { onSearch(e.target.value); });
    if (g) g.addEventListener('input', function (e) { onSearch(e.target.value); });

    var el;
    el = document.getElementById('shopFilterCategory');
    if (el) el.addEventListener('change', function (e) { state.category = e.target.value; render(); });

    el = document.getElementById('shopFilterPrice');
    if (el) el.addEventListener('change', function (e) { state.price = e.target.value; render(); });

    el = document.getElementById('shopFilterDistance');
    if (el) el.addEventListener('change', function (e) { state.distance = e.target.value; render(); });

    el = document.getElementById('shopFilterDiscount');
    if (el) el.addEventListener('change', function (e) { state.discountOnly = e.target.checked; render(); });

    el = document.getElementById('shopFilterFavorites');
    if (el) el.addEventListener('change', function (e) { state.favoritesOnly = e.target.checked; render(); });

    var results = document.getElementById('shopResults');
    if (results) {
      results.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-action]') : null;
        if (!btn) return;
        var id = btn.getAttribute('data-id');
        var action = btn.getAttribute('data-action');

        if (action === 'add') {
          layout.toast('Added to shopping list.', 'success');
        }
        if (action === 'fav') {
          for (var i = 0; i < allShops.length; i++) {
            if (String(allShops[i].id) === String(id)) {
              allShops[i].favorite = !allShops[i].favorite;
              layout.toast(allShops[i].favorite ? 'Saved to favourites.' : 'Removed.', 'success');
              break;
            }
          }
          render();
        }
      });
    }
  }

  /* ---------- VIEW TOGGLE ---------- */
  function wireViewToggle() {
    var g = document.getElementById('viewGridView');
    var l = document.getElementById('viewListView');

    if (g) g.addEventListener('click', function () {
      viewMode = 'grid';
      g.classList.add('active'); if (l) l.classList.remove('active');
      g.setAttribute('aria-pressed', 'true'); if (l) l.setAttribute('aria-pressed', 'false');
      render();
    });
    if (l) l.addEventListener('click', function () {
      viewMode = 'list';
      l.classList.add('active'); if (g) g.classList.remove('active');
      l.setAttribute('aria-pressed', 'true'); if (g) g.setAttribute('aria-pressed', 'false');
      render();
    });
  }

  Z.shops = { init: init };
})();
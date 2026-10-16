/* ============================================================
   ZENVORA - Food Map (Leaflet)
   Tiles: Esri World Street Map (free, no API key)
   Fallback: OSM France -> OSM Germany
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA || {};

  function api()    { return Z.api || null; }
  function layout() { return Z.layout || null; }

  function toast(msg, type) {
    var l = layout();
    if (l && typeof l.toast === 'function') l.toast(msg, type);
  }

  function escapeHtmlSafe(s) {
    var l = layout();
    if (l && typeof l.escapeHtml === 'function') return l.escapeHtml(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounceSafe(fn, wait) {
    var l = layout();
    if (l && typeof l.debounce === 'function') return l.debounce(fn, wait);
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 150);
    };
  }

  function lucideRefresh() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  var map = null;
  var markerLayer = null;
  var userLayer = null;
  var markers = {};
  var allLocations = [];
  var userLocation = null;

  /* ---------- TILE PROVIDERS (free, no API key) ---------- */
  var TILE_PROVIDERS = [
    {
      name: 'esri',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      opts: { maxZoom: 19, attribution: '&copy; Esri &copy; OpenStreetMap contributors' }
    },
    {
      name: 'osm-fr',
      url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
      opts: { maxZoom: 19, subdomains: 'abc', attribution: '&copy; OpenStreetMap France' }
    },
    {
      name: 'osm-de',
      url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
      opts: { maxZoom: 19, subdomains: 'abc', attribution: '&copy; OpenStreetMap Germany' }
    }
  ];

  function pickProviderIndex() {
    try {
      var override = new URLSearchParams(location.search).get('tiles');
      if (override) {
        for (var i = 0; i < TILE_PROVIDERS.length; i++) {
          if (TILE_PROVIDERS[i].name === override) return i;
        }
      }
    } catch (e) { /* ignore */ }
    return 0;
  }

  function addTiles(m) {
    var idx = pickProviderIndex();
    var layer = L.tileLayer(TILE_PROVIDERS[idx].url, TILE_PROVIDERS[idx].opts).addTo(m);
    var advancing = false;

    layer.on('tileerror', function () {
      if (advancing) return;
      if (idx >= TILE_PROVIDERS.length - 1) return;
      advancing = true;
      try { m.removeLayer(layer); } catch (e) { /* ignore */ }
      idx++;
      console.warn('[food-map] tile provider failed, falling back to', TILE_PROVIDERS[idx].name);
      layer = L.tileLayer(TILE_PROVIDERS[idx].url, TILE_PROVIDERS[idx].opts).addTo(m);
      advancing = false;
    });
  }

  /* ---------- DEMO LOCATIONS ---------- */
  var DEMO_LOCATIONS = [
    { id: 'sh1', type: 'shop',    name: 'Green Grocer',       address: 'MG Road, Bengaluru',       lat: 12.9757, lng: 77.6068, hours: '9am - 9pm',  phone: '+91 90000 11111', is_demo: true },
    { id: 'sh2', type: 'shop',    name: 'Fresh Bazaar',       address: 'Indiranagar, Bengaluru',   lat: 12.9784, lng: 77.6408, hours: '8am - 10pm', phone: '+91 90000 22222', is_demo: true },
    { id: 'sh3', type: 'shop',    name: 'Daily Needs',        address: 'Koramangala, Bengaluru',   lat: 12.9352, lng: 77.6245, hours: '7am - 11pm', phone: '+91 90000 33333', is_demo: true },
    { id: 'sl1', type: 'shelter', name: 'Hope Shelter',       address: 'Shivajinagar, Bengaluru',  lat: 12.9857, lng: 77.6057, hours: 'Open 24h',   phone: '+91 90000 44444', is_demo: true, requirements: ['Cooked meals', 'Fruits'] },
    { id: 'sl2', type: 'shelter', name: 'Sunrise Foundation', address: 'Jayanagar, Bengaluru',     lat: 12.9299, lng: 77.5827, hours: '8am - 8pm',  phone: '+91 90000 55555', is_demo: true, requirements: ['Packaged food', 'Vegetables'] },
    { id: 'pk1', type: 'pickup',  name: 'Community Center',   address: 'Richmond Town, Bengaluru', lat: 12.9634, lng: 77.6042, hours: '10am - 6pm', phone: '', is_demo: true }
  ];

  function init() {
    initMap();
    wireFilters();
    wireActions();
    wireDetailPanel();
    loadLocations();
  }

  /* ---------- MAP SETUP ---------- */
  function initMap() {
    var el = document.getElementById('foodMap');
    if (!el) return;
    if (!window.L) {
      console.warn('[food-map] Leaflet not loaded');
      return;
    }

    map = L.map('foodMap').setView([12.9716, 77.5946], 12);

    /* Free tiles, no API key. Override with ?tiles=osm-fr for debugging. */
    addTiles(map);

    markerLayer = L.layerGroup().addTo(map);
    userLayer   = L.layerGroup().addTo(map);

    var status = document.getElementById('mapStatus');
    if (status) status.hidden = true;

    setTimeout(function () { if (map) map.invalidateSize(); }, 200);
  }

  /* ---------- LOAD LOCATIONS ---------- */
  function unwrap(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  function loadLocations() {
    var a = api();
    var shopsPromise    = (a && a.shops    && a.shops.list)    ? Promise.resolve(a.shops.list()).catch(function () { return []; })    : Promise.resolve([]);
    var sheltersPromise = (a && a.shelters && a.shelters.list) ? Promise.resolve(a.shelters.list()).catch(function () { return []; }) : Promise.resolve([]);

    Promise.all([shopsPromise, sheltersPromise]).then(function (results) {
      var shops = unwrap(results[0]);
      var shelters = unwrap(results[1]);

      var list = [];

      shops.forEach(function (s) {
        if (s && s.latitude != null && s.longitude != null) {
          list.push(normalizeLocation(s, 'shop'));
        }
      });
      shelters.forEach(function (s) {
        if (s && s.latitude != null && s.longitude != null) {
          list.push(normalizeLocation(s, 'shelter'));
        }
      });

      if (!list.length) list = DEMO_LOCATIONS;

      allLocations = list;
      plotMarkers(list);
      renderList(list);
    });
  }

  function normalizeLocation(item, type) {
    return {
      id:           item.id,
      type:         type,
      name:         item.name || (type === 'shop' ? 'Shop' : 'Shelter'),
      address:      item.address || item.city || '',
      lat:          item.latitude  != null ? Number(item.latitude)  : Number(item.lat),
      lng:          item.longitude != null ? Number(item.longitude) : Number(item.lng),
      hours:        item.hours || '',
      phone:        item.phone || item.contact || '',
      requirements: item.requirements || item.needs || [],
      is_demo:      item.is_demo === true
    };
  }

  /* ---------- MARKERS ---------- */
  function plotMarkers(list) {
    if (!markerLayer) return;
    markerLayer.clearLayers();
    markers = {};

    list.forEach(function (loc) {
      if (!isFinite(loc.lat) || !isFinite(loc.lng)) return;

      var color = loc.type === 'shop'
        ? '#254B3B'
        : (loc.type === 'shelter' ? '#D4AF57' : '#2E5A7D');

      var icon = L.divIcon({
        className: 'zenvora-marker',
        html: '<div style="background:' + color + ';width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      var marker = L.marker([loc.lat, loc.lng], { icon: icon }).addTo(markerLayer);
      marker.bindPopup('<strong>' + escapeHtmlSafe(loc.name) + '</strong><br>' + escapeHtmlSafe(loc.address || ''));
      marker.on('click', function () { showDetail(loc); });

      markers[loc.id] = marker;
    });
  }

  /* ---------- FILTERS ---------- */
  function wireFilters() {
    ['filterShops', 'filterShelters', 'filterPickup'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', applyFilters);
    });

    var searchEl = document.getElementById('mapSearch');
    if (searchEl) {
      searchEl.addEventListener('input', debounceSafe(function () {
        applyFilters();
      }, 180));
    }
  }

  function applyFilters() {
    var showShops    = (document.getElementById('filterShops')    || {}).checked !== false;
    var showShelters = (document.getElementById('filterShelters') || {}).checked !== false;
    var showPickup   = (document.getElementById('filterPickup')   || {}).checked !== false;
    var q = (document.getElementById('mapSearch') || {}).value || '';
    q = q.toLowerCase().trim();

    var filtered = allLocations.filter(function (loc) {
      if (loc.type === 'shop'    && !showShops)    return false;
      if (loc.type === 'shelter' && !showShelters) return false;
      if (loc.type === 'pickup'  && !showPickup)   return false;
      if (q && (loc.name + ' ' + (loc.address || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    plotMarkers(filtered);
    renderList(filtered);
  }

  /* ---------- LIST ---------- */
  function renderList(list) {
    var ul = document.getElementById('mapList');
    if (!ul) return;

    if (!list.length) {
      ul.innerHTML = '<li class="empty-state">No locations match your filters.</li>';
      return;
    }

    var html = '';
    list.forEach(function (loc) {
      html += '<li data-id="' + escapeHtmlSafe(String(loc.id)) + '">'
            +   '<div class="mini-body">'
            +     '<p class="mini-title">' + escapeHtmlSafe(loc.name) + '</p>'
            +     '<p class="mini-sub">'   + escapeHtmlSafe(loc.address || '') + '</p>'
            +   '</div>'
            +   '<span class="badge badge-info">' + escapeHtmlSafe(loc.type) + '</span>'
            + '</li>';
    });
    ul.innerHTML = html;

    ul.querySelectorAll('li[data-id]').forEach(function (li) {
      li.addEventListener('click', function () {
        var loc = allLocations.find(function (l) { return String(l.id) === String(li.getAttribute('data-id')); });
        if (loc) {
          if (map) map.setView([loc.lat, loc.lng], 15);
          showDetail(loc);
        }
      });
    });
  }

  /* ---------- DETAIL ---------- */
  function showDetail(loc) {
    var empty  = document.getElementById('mapSideEmpty');
    var detail = document.getElementById('mapSideDetail');
    if (!empty || !detail) return;

    empty.hidden = true;
    detail.hidden = false;

    setText('detailType', loc.type);
    setText('detailName', loc.name);
    setText('detailAddress', loc.address || '-');

    var distRow = document.getElementById('detailDistanceRow');
    if (distRow) {
      if (userLocation) {
        var km = haversine(userLocation.lat, userLocation.lng, loc.lat, loc.lng);
        setText('detailDistance', km.toFixed(1) + ' km away');
        distRow.hidden = false;
      } else {
        distRow.hidden = true;
      }
    }

    var hoursRow = document.getElementById('detailHoursRow');
    if (hoursRow) {
      if (loc.hours) { setText('detailHours', loc.hours); hoursRow.hidden = false; }
      else hoursRow.hidden = true;
    }

    var contactRow = document.getElementById('detailContactRow');
    if (contactRow) {
      if (loc.phone) { setText('detailContact', loc.phone); contactRow.hidden = false; }
      else contactRow.hidden = true;
    }

    var reqWrap = document.getElementById('detailRequirementsWrap');
    var reqList = document.getElementById('detailRequirements');
    if (reqWrap && reqList) {
      if (loc.requirements && loc.requirements.length) {
        reqWrap.hidden = false;
        reqList.innerHTML = loc.requirements.map(function (r) {
          return '<li>' + escapeHtmlSafe(r) + '</li>';
        }).join('');
      } else {
        reqWrap.hidden = true;
      }
    }

    lucideRefresh();
  }

  function hideDetail() {
    var empty  = document.getElementById('mapSideEmpty');
    var detail = document.getElementById('mapSideDetail');
    if (empty)  empty.hidden = false;
    if (detail) detail.hidden = true;
  }

  function wireDetailPanel() {
    var closeBtn = document.getElementById('closeDetailPanel');
    if (closeBtn) closeBtn.addEventListener('click', hideDetail);

    var dirBtn = document.getElementById('detailDirectionsBtn');
    if (dirBtn) dirBtn.addEventListener('click', function () {
      var name = (document.getElementById('detailName') || {}).textContent || '';
      var loc  = allLocations.find(function (l) { return l.name === name; });
      if (!loc) return;
      var url = 'https://www.openstreetmap.org/directions?from=&to=' + loc.lat + '%2C' + loc.lng;
      window.open(url, '_blank');
    });

    var viewBtn = document.getElementById('detailViewFullBtn');
    if (viewBtn) viewBtn.addEventListener('click', function () {
      toast('Full location page coming soon.', 'info');
    });
  }

  /* ---------- ACTIONS ---------- */
  function wireActions() {
    var locateBtn = document.getElementById('locateMeBtn');
    if (locateBtn) locateBtn.addEventListener('click', function () {
      if (!('geolocation' in navigator)) {
        toast('Location is not supported in this browser.', 'warn');
        return;
      }
      toast('Locating...', 'info');
      navigator.geolocation.getCurrentPosition(function (pos) {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        if (map) {
          map.setView([userLocation.lat, userLocation.lng], 14);
          if (userLayer) {
            userLayer.clearLayers();
            L.circleMarker([userLocation.lat, userLocation.lng], {
              radius: 8, color: '#2E5A7D', fillColor: '#2E5A7D', fillOpacity: 0.9
            }).addTo(userLayer).bindPopup('You are here');
          }
        }
        toast('Location found.', 'success');
      }, function () {
        toast('Could not access your location.', 'warn');
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
    });

    var refreshBtn = document.getElementById('refreshMapBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', function () {
      toast('Refreshing...', 'info');
      loadLocations();
    });

    var mapBtn    = document.getElementById('mapViewBtn');
    var listBtn   = document.getElementById('listViewBtn');
    var mapLayout = document.getElementById('mapLayout');
    var listView  = document.getElementById('mapListView');

    if (mapBtn && listBtn && mapLayout && listView) {
      mapBtn.addEventListener('click', function () {
        mapLayout.hidden = false; listView.hidden = true;
        mapBtn.classList.add('active'); listBtn.classList.remove('active');
        mapBtn.setAttribute('aria-pressed', 'true');
        listBtn.setAttribute('aria-pressed', 'false');
        if (map) setTimeout(function () { map.invalidateSize(); }, 100);
      });
      listBtn.addEventListener('click', function () {
        mapLayout.hidden = true; listView.hidden = false;
        listBtn.classList.add('active'); mapBtn.classList.remove('active');
        listBtn.setAttribute('aria-pressed', 'true');
        mapBtn.setAttribute('aria-pressed', 'false');
      });
    }
  }

  /* ---------- UTILS ---------- */
  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v == null ? '-' : String(v);
  }

  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2)
          + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
          * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  Z.foodMap = { init: init };
})();

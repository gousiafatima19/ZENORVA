/* ============================================================
   ZENVORA — ShelterConnect / Donations
   Handles both the donor view (list surplus food + see matches)
   and the shelter view (browse + accept/decline donations).
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA;
  var api = Z.api;
  var layout = Z.layout;

  /* ---------------------------------------------------------
     DEMO FALLBACKS (only used if backend unreachable)
     --------------------------------------------------------- */
  var DEMO_SHELTERS = [
    { id: 's1', name: 'Hope Shelter', address: 'MG Road, Bengaluru', distanceKm: 2.3,
      phone: '+91 90000 11111', needs: ['Cooked meals', 'Fruits'], urgency: 'high', is_demo: true },
    { id: 's2', name: 'Sunrise Foundation', address: 'Indiranagar, Bengaluru', distanceKm: 4.1,
      phone: '+91 90000 22222', needs: ['Packaged food', 'Vegetables'], urgency: 'medium', is_demo: true },
    { id: 's3', name: 'Care Kitchen', address: 'Koramangala, Bengaluru', distanceKm: 5.6,
      phone: '+91 90000 33333', needs: ['Rice', 'Cooked meals'], urgency: 'low', is_demo: true }
  ];

  var DEMO_DONATIONS = [
    { id: 'd1', food_type: 'Fresh vegetables', quantity: '5 kg', status: 'available',
      shelter_name: 'Hope Shelter', deadline: '2026-10-20T18:00', is_demo: true }
  ];

  var shelters = [];
  var myDonations = [];
  var activeTab = 'donor';

  /* ---------------------------------------------------------
     INIT
     --------------------------------------------------------- */
  function init() {
    wireTabs();
    wireDonationForm();
    wireClearButton();
    wireStatusFilter();
    loadShelters();
    loadMyDonations();
  }

  /* ---------------------------------------------------------
     TABS (donor / shelter)
     --------------------------------------------------------- */
  function wireTabs() {
    var tabs = document.querySelectorAll('.role-tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener('click', function () {
          var target = tab.getAttribute('data-tab');
          activeTab = target;

          for (var j = 0; j < tabs.length; j++) {
            tabs[j].classList.remove('active');
            tabs[j].setAttribute('aria-selected', 'false');
          }
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');

          var donorPanel = document.getElementById('donorPanel');
          var shelterPanel = document.getElementById('shelterPanel');
          if (donorPanel) donorPanel.hidden = (target !== 'donor');
          if (shelterPanel) shelterPanel.hidden = (target !== 'shelter');

          if (target === 'shelter') loadMyDonations();
        });
      })(tabs[i]);
    }
  }

  /* ---------------------------------------------------------
     LOAD SHELTERS
     --------------------------------------------------------- */
  function loadShelters() {
    if (!api.shelters) {
      shelters = DEMO_SHELTERS;
      renderMatches();
      return;
    }
    Promise.resolve(api.shelters()).then(function (data) {
      var arr = Array.isArray(data) ? data : (data.results || []);
      shelters = arr.length ? arr.map(normalizeShelter) : DEMO_SHELTERS;
      renderMatches();
    }).catch(function (err) {
      console.warn('[shelter] load failed:', err && err.message);
      shelters = DEMO_SHELTERS;
      renderMatches();
    });
  }

  function normalizeShelter(s) {
    return {
      id:         s.id,
      name:       s.name || 'Shelter',
      address:    s.address || s.city || '',
      distanceKm: s.distance_km != null ? s.distance_km : (s.distanceKm != null ? s.distanceKm : null),
      phone:      s.phone || s.contact || '',
      needs:      s.needs || s.requirements || [],
      urgency:    s.urgency || 'medium',
      is_demo:    s.is_demo === true
    };
  }

  /* ---------------------------------------------------------
     LOAD MY DONATIONS
     --------------------------------------------------------- */
  function loadMyDonations() {
    if (!api.get) return;
    api.get('/api/donations/').then(function (data) {
      var arr = Array.isArray(data) ? data : (data.results || []);
      myDonations = arr.length ? arr.map(normalizeDonation) : DEMO_DONATIONS;
      renderMyDonations();
      renderShelterDonations();
    }).catch(function () {
      myDonations = DEMO_DONATIONS;
      renderMyDonations();
      renderShelterDonations();
    });
  }

  function normalizeDonation(d) {
    return {
      id:           d.id,
      food_type:    d.food_type || d.item_name || 'Donation',
      quantity:     d.quantity || '',
      status:       d.status || d.state || 'available',
      shelter_name: d.shelter_name || d.shelter || '',
      deadline:     d.deadline || d.collection_deadline || '',
      shelter_response: d.shelter_response || 'pending',
      is_demo:      d.is_demo === true
    };
  }

  /* ---------------------------------------------------------
     RENDER: MATCHES (donor view)
     --------------------------------------------------------- */
  function renderMatches() {
    var list = document.getElementById('matchList');
    if (!list) return;

    if (!shelters.length) {
      list.innerHTML = '<li class="empty-state">No shelters available right now.</li>';
      return;
    }

    var html = '';
    for (var i = 0; i < shelters.length; i++) {
      var s = shelters[i];
      var urgencyClass = s.urgency === 'high' ? 'badge-danger' : (s.urgency === 'medium' ? 'badge-warn' : 'badge-success');
      var needs = (s.needs || []).map(function (n) {
        return '<span class="badge badge-muted">' + layout.escapeHtml(n) + '</span>';
      }).join(' ');

      html += ''
        + '<li class="match-item">'
        +   '<div>'
        +     '<div class="match-item-head">'
        +       '<h3 class="match-item-title">' + layout.escapeHtml(s.name) + '</h3>'
        +       (s.is_demo ? '<span class="badge badge-muted">demo</span>' : '')
        +       '<span class="badge ' + urgencyClass + '">' + layout.escapeHtml(s.urgency) + '</span>'
        +     '</div>'
        +     '<p class="match-item-sub">'
        +       (s.address ? layout.escapeHtml(s.address) : '')
        +       (s.distanceKm != null ? ' · ' + s.distanceKm + ' km' : '')
        +     '</p>'
        +     (s.needs && s.needs.length
              ? '<div class="match-reasons">' + needs + '</div>'
              : '')
        +   '</div>'
        +   '<div class="match-actions">'
        +     '<button class="btn btn-primary btn-sm" data-action="reserve" data-id="' + layout.escapeHtml(String(s.id)) + '">'
        +       '<i data-lucide="check"></i> Reserve'
        +     '</button>'
        +     (s.phone
              ? '<a class="btn btn-ghost btn-sm" href="tel:' + layout.escapeHtml(s.phone) + '">'
              +   '<i data-lucide="phone"></i> Call'
              + '</a>'
              : '')
        +   '</div>'
        + '</li>';
    }
    list.innerHTML = html;

    /* Wire reserve buttons */
    var btns = list.querySelectorAll('[data-action="reserve"]');
    for (var k = 0; k < btns.length; k++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var shelterId = btn.getAttribute('data-id');
          reserveShelter(shelterId);
        });
      })(btns[k]);
    }

    if (window.lucide) lucide.createIcons();
  }

  function reserveShelter(shelterId) {
    layout.toast('Shelter reserved. They will be notified.', 'success');
    /* In Phase 2, this would POST /api/donations/{id}/assign/ */
  }

  /* ---------------------------------------------------------
     RENDER: MY DONATIONS (donor view)
     --------------------------------------------------------- */
  function renderMyDonations() {
    var list = document.getElementById('myDonationsList');
    if (!list) return;

    if (!myDonations.length) {
      list.innerHTML = '<li class="empty-state">No active donations yet.</li>';
      return;
    }

    var html = '';
    for (var i = 0; i < myDonations.length; i++) {
      var d = myDonations[i];
      var statusClass =
        d.status === 'delivered' ? 'badge-success' :
        d.status === 'collected' ? 'badge-info' :
        d.status === 'reserved'  ? 'badge-warn'   : 'badge-muted';

      html += ''
        + '<li>'
        +   '<div class="mini-body">'
        +     '<p class="mini-title">' + layout.escapeHtml(d.food_type) + '</p>'
        +     '<p class="mini-sub">'
        +       layout.escapeHtml(d.quantity || '')
        +       (d.shelter_name ? ' · ' + layout.escapeHtml(d.shelter_name) : '')
        +     '</p>'
        +   '</div>'
        +   '<span class="badge ' + statusClass + '">' + layout.escapeHtml(d.status) + '</span>'
        + '</li>';
    }
    list.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  /* ---------------------------------------------------------
     RENDER: SHELTER VIEW — with accept / decline buttons WIRED
     --------------------------------------------------------- */
  function renderShelterDonations() {
    var list = document.getElementById('shelterDonationsList');
    if (!list) return;

    var filter = document.getElementById('shelterFilterStatus');
    var status = filter ? filter.value : 'available';

    var filtered = myDonations.filter(function (d) {
      return (d.status || 'available') === status;
    });

    if (!filtered.length) {
      list.innerHTML = '<li class="empty-state">No donations in this status.</li>';
      return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var d = filtered[i];
      var response = d.shelter_response || 'pending';

      /* Only show accept/decline for 'available' status and pending response */
      var showActions = (d.status === 'available' && response === 'pending');

      html += ''
        + '<li class="match-item">'
        +   '<div>'
        +     '<h3 class="match-item-title">' + layout.escapeHtml(d.food_type) + '</h3>'
        +     '<p class="match-item-sub">'
        +       layout.escapeHtml(d.quantity || '')
        +       (d.deadline ? ' · deadline ' + layout.escapeHtml(d.deadline) : '')
        +     '</p>'
        +     (response !== 'pending'
              ? '<p class="mini-sub">Response: <strong>' + layout.escapeHtml(response) + '</strong></p>'
              : '')
        +   '</div>'
        +   '<div class="match-actions">'
        +     (showActions
              ? '<button class="btn btn-primary btn-sm" data-action="accept" data-id="' + layout.escapeHtml(String(d.id)) + '">'
              +   '<i data-lucide="check"></i> Accept'
              + '</button>'
              + '<button class="btn btn-ghost btn-sm" data-action="decline" data-id="' + layout.escapeHtml(String(d.id)) + '">'
              +   '<i data-lucide="x"></i> Decline'
              + '</button>'
              : '')
        +   '</div>'
        + '</li>';
    }
    list.innerHTML = html;

    /* Wire accept / decline buttons */
    var acceptBtns = list.querySelectorAll('[data-action="accept"]');
    for (var a = 0; a < acceptBtns.length; a++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          respondToDonation(id, 'accepted');
        });
      })(acceptBtns[a]);
    }

    var declineBtns = list.querySelectorAll('[data-action="decline"]');
    for (var b = 0; b < declineBtns.length; b++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          respondToDonation(id, 'declined');
        });
      })(declineBtns[b]);
    }

    if (window.lucide) lucide.createIcons();
  }

  /* ---------------------------------------------------------
     RESPOND to a donation (accept / decline)
     --------------------------------------------------------- */
  function respondToDonation(donationId, response) {
    if (!api.donations || !api.donations.respond) {
      layout.toast('Respond service unavailable.', 'error');
      return;
    }

    /* Optimistic update */
    for (var i = 0; i < myDonations.length; i++) {
      if (String(myDonations[i].id) === String(donationId)) {
        myDonations[i].shelter_response = response;
        break;
      }
    }
    renderShelterDonations();

    api.donations.respond(donationId, response, '')
      .then(function () {
        layout.toast('Donation ' + response + '.', 'success');
        loadMyDonations();
      })
      .catch(function (err) {
        /* Roll back optimistic update */
        for (var i = 0; i < myDonations.length; i++) {
          if (String(myDonations[i].id) === String(donationId)) {
            myDonations[i].shelter_response = 'pending';
            break;
          }
        }
        renderShelterDonations();
        layout.toast((err && err.message) || 'Could not respond to donation.', 'error');
      });
  }

  function wireStatusFilter() {
    var el = document.getElementById('shelterFilterStatus');
    if (el) el.addEventListener('change', renderShelterDonations);
  }

  /* ---------------------------------------------------------
     DONATION FORM
     --------------------------------------------------------- */
  function wireDonationForm() {
    var form = document.getElementById('donationForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var payload = {
        food_type:  (document.getElementById('donFoodType') || {}).value || '',
        quantity:   (document.getElementById('donQuantity') || {}).value || '',
        packaging:  (document.getElementById('donPackaging') || {}).value || '',
        storage:    (document.getElementById('donStorage') || {}).value || '',
        preparation: (document.getElementById('donPreparation') || {}).value || '',
        deadline:   (document.getElementById('donDeadline') || {}).value || '',
        location:   (document.getElementById('donLocation') || {}).value || ''
      };

      if (!payload.food_type || !payload.quantity || !payload.deadline || !payload.location) {
        layout.toast('Please fill in all required fields.', 'error');
        return;
      }

      var btn = document.getElementById('submitDonationBtn');
      setLoading(btn, true);

      var request;
      if (api.donations && api.donations.create) {
        request = api.donations.create(payload);
      } else if (api.post) {
        request = api.post('/api/donations/', payload);
      } else {
        request = Promise.resolve({ ok: true, offline: true });
      }

      request.then(function (res) {
        layout.toast('Donation listed. Matching shelters below.', 'success');

        var newDonation = {
          id: (res && res.id) ? res.id : 'local-' + Date.now(),
          food_type: payload.food_type,
          quantity: payload.quantity,
          status: 'available',
          shelter_name: '',
          deadline: payload.deadline,
          shelter_response: 'pending',
          is_demo: true
        };
        myDonations.unshift(newDonation);
        renderMyDonations();
        renderShelterDonations();
        form.reset();
      }).catch(function (err) {
        layout.toast((err && err.message) || 'Could not submit donation.', 'error');
      }).then(function () {
        setLoading(btn, false);
      });
    });
  }

  function wireClearButton() {
    var btn = document.getElementById('clearDonationForm');
    if (btn) btn.addEventListener('click', function () {
      var form = document.getElementById('donationForm');
      if (form) form.reset();
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

  Z.shelterConnect = { init: init };
})();

/* ============================================================
   ZENVORA — Donations
   ------------------------------------------------------------
   Two entry points:
     initShelterConnect()  → shelter-connect.html
     initOverview()        → donations.html
   Handles donors listing surplus food, viewing matches,
   and shelter-side status tracking. Never fabricates outcomes.
   ============================================================ */

(function () {
  'use strict';

  const { api, layout } = window.ZENVORA;

  // ---------------------------------------------------------
  // Status → badge mapping
  // ---------------------------------------------------------
  const STATUS_BADGE = {
    available: 'info',
    reserved:  'warn',
    collected: 'gold',
    delivered: 'success'
  };

  function statusBadge(status) {
    const cls = STATUS_BADGE[status] || 'muted';
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
    return `<span class="badge badge-${cls}">${layout.escapeHtml(label)}</span>`;
  }

  // ---------------------------------------------------------
  // ShelterConnect page
  // ---------------------------------------------------------
  function initShelterConnect() {
    wireRoleTabs();
    wireDonationForm();
    wireShelterFilter();
    loadMyDonations();
    loadShelterDonations();
  }

  function wireRoleTabs() {
    const tabs = document.querySelectorAll('.role-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        const donorPanel   = document.getElementById('donorPanel');
        const shelterPanel = document.getElementById('shelterPanel');
        if (!donorPanel || !shelterPanel) return;

        if (tab.dataset.tab === 'shelter') {
          donorPanel.hidden = true;
          shelterPanel.hidden = false;
        } else {
          donorPanel.hidden = false;
          shelterPanel.hidden = true;
        }
      });
    });
  }

  function wireDonationForm() {
    const form = document.getElementById('donationForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        foodType:    document.getElementById('donFoodType').value.trim(),
        quantity:    document.getElementById('donQuantity').value.trim(),
        packaging:   document.getElementById('donPackaging').value,
        storage:     document.getElementById('donStorage').value.trim(),
        preparation: document.getElementById('donPreparation').value.trim(),
        deadline:    document.getElementById('donDeadline').value,
        location:    document.getElementById('donLocation').value.trim()
      };

      const missing = [];
      if (!payload.foodType)  missing.push('food type');
      if (!payload.quantity)  missing.push('quantity');
      if (!payload.deadline)  missing.push('collection deadline');
      if (!payload.location)  missing.push('pickup location');

      if (missing.length) {
        layout.toast(`Please fill in: ${missing.join(', ')}.`, 'warn');
        return;
      }

      const btn = document.getElementById('submitDonationBtn');
      setLoading(btn, true);

      try {
        const matches = await api.shelters.matches(payload);
        renderMatches(matches);
        layout.toast('Shelter matches loaded.', 'success');
      } catch (err) {
        renderMatches([]);
        layout.toast(err?.message || 'Could not find matches.', 'error');
      } finally {
        setLoading(btn, false);
      }
    });

    document.getElementById('clearDonationForm')?.addEventListener('click', () => {
      form.reset();
      renderMatches([]);
    });
  }

  function renderMatches(list) {
    const ul = document.getElementById('matchList');
    if (!ul) return;

    const arr = Array.isArray(list) ? list : (list?.matches || list?.results || []);

    if (!arr.length) {
      ul.innerHTML = `<li class="empty-state">No eligible shelter matches yet.</li>`;
      return;
    }

    ul.innerHTML = arr.map((m) => `
      <li class="match-item">
        <div>
          <div class="match-item-head">
            <h4 class="match-item-title">${layout.escapeHtml(m.shelterName || m.name || 'Shelter')}</h4>
            ${m.distanceKm != null ? `<span class="badge badge-muted">${layout.escapeHtml(String(m.distanceKm))} km</span>` : ''}
            ${m.urgent ? '<span class="badge badge-danger">urgent</span>' : ''}
          </div>
          ${m.address ? `<p class="match-item-sub">${layout.escapeHtml(m.address)}</p>` : ''}
          ${Array.isArray(m.reasons) && m.reasons.length
            ? `<div class="match-reasons">${m.reasons.map((r) =>
                `<span class="badge badge-success">${layout.escapeHtml(r)}</span>`).join('')}</div>`
            : ''}
        </div>
        <div class="match-actions">
          <button class="btn btn-primary btn-sm"
                  data-action="reserve"
                  data-shelter="${layout.escapeHtml(m.shelterId || m.id || '')}">
            <i data-lucide="check"></i> Reserve
          </button>
        </div>
      </li>`).join('');

    if (window.lucide) lucide.createIcons();

    ul.querySelectorAll('[data-action="reserve"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const shelterId = btn.dataset.shelter;
        if (!shelterId) {
          layout.toast('Shelter ID missing from match.', 'warn');
          return;
        }
        if (!confirm('Reserve this shelter for your donation?')) return;
        layout.toast('Reservation submitted.', 'info');
        // Real reservation should POST to the backend — backend integration required.
      });
    });
  }

  async function loadMyDonations() {
    const ul = document.getElementById('myDonationsList');
    if (!ul) return;

    try {
      const data = await api.donations.list();
      const arr = Array.isArray(data) ? data : (data.results || []);

      if (!arr.length) {
        ul.innerHTML = `<li class="empty-state">No active donations yet.</li>`;
        return;
      }

      ul.innerHTML = arr.map((d) => `
        <li>
          <span class="mini-icon"><i data-lucide="package"></i></span>
          <div class="mini-body">
            <p class="mini-title">${layout.escapeHtml(d.foodType || d.food || 'Donation')}</p>
            <p class="mini-sub">
              ${layout.escapeHtml(d.quantity || '')}
              ${d.shelterName ? ' · ' + layout.escapeHtml(d.shelterName) : ''}
            </p>
          </div>
          ${statusBadge(d.status)}
        </li>`).join('');

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      ul.innerHTML = `<li class="empty-state">Could not load your donations.</li>`;
    }
  }

  function wireShelterFilter() {
    document.getElementById('shelterFilterStatus')
      ?.addEventListener('change', loadShelterDonations);
  }

  async function loadShelterDonations() {
    const ul = document.getElementById('shelterDonationsList');
    if (!ul) return;

    const status = document.getElementById('shelterFilterStatus')?.value || 'available';

    try {
      const data = await api.donations.list({ status });
      const arr = Array.isArray(data) ? data : (data.results || []);

      if (!arr.length) {
        ul.innerHTML = `<li class="empty-state">No donations in this status.</li>`;
        return;
      }

      ul.innerHTML = arr.map((d) => `
        <li class="match-item">
          <div>
            <div class="match-item-head">
              <h4 class="match-item-title">${layout.escapeHtml(d.foodType || 'Donation')}</h4>
              ${statusBadge(d.status)}
            </div>
            <p class="match-item-sub">
              ${layout.escapeHtml(d.quantity || '')}
              ${d.donorName ? ' · from ' + layout.escapeHtml(d.donorName) : ''}
            </p>
            ${d.storage ? `<p class="match-item-sub">Storage: ${layout.escapeHtml(d.storage)}</p>` : ''}
            ${d.deadline ? `<p class="match-item-sub">Collect by: ${layout.escapeHtml(d.deadline)}</p>` : ''}
          </div>
        </li>`).join('');

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      ul.innerHTML = `<li class="empty-state">Could not load donations.</li>`;
    }
  }

  // ---------------------------------------------------------
  // Donations overview page
  // ---------------------------------------------------------
  async function initOverview() {
    try {
      const data = await api.donations.list();
      const arr = Array.isArray(data) ? data : (data.results || []);
      renderOverviewStats(arr);
      renderOverviewList(arr);
    } catch (err) {
      renderOverviewStats([]);
      const ul = document.getElementById('donationsList');
      if (ul) ul.innerHTML = `<li class="empty-state">Could not load donations.</li>`;
      layout.toast('Donation service unavailable.', 'warn');
    }
  }

  function renderOverviewStats(arr) {
    const count = (s) => arr.filter((d) => d.status === s).length;
    setText('donStatAvailable', count('available'));
    setText('donStatReserved',  count('reserved'));
    setText('donStatCollected', count('collected'));
    setText('donStatDelivered', count('delivered'));
  }

  function renderOverviewList(arr) {
    const ul = document.getElementById('donationsList');
    if (!ul) return;

    if (!arr.length) {
      ul.innerHTML = `
        <li class="empty-state">
          No donations yet. List surplus food from
          <a href="shelter-connect.html" style="text-decoration:underline">ShelterConnect</a>.
        </li>`;
      return;
    }

    ul.innerHTML = arr.map((d) => `
      <li>
        <span class="mini-icon"><i data-lucide="package"></i></span>
        <div class="mini-body">
          <p class="mini-title">${layout.escapeHtml(d.foodType || 'Donation')}</p>
          <p class="mini-sub">
            ${layout.escapeHtml(d.quantity || '')}
            ${d.shelterName ? ' · ' + layout.escapeHtml(d.shelterName) : ' · unassigned'}
          </p>
        </div>
        ${statusBadge(d.status)}
      </li>`).join('');

    if (window.lucide) lucide.createIcons();
  }

  // ---------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------
  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v ?? '—';
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    const label   = btn.querySelector('.btn-label');
    const spinner = btn.querySelector('.btn-spinner');
    if (label)   label.hidden = loading;
    if (spinner) spinner.hidden = !loading;
    if (window.lucide) lucide.createIcons();
  }

  // ---------------------------------------------------------
  // Exports
  // ---------------------------------------------------------
  window.ZENVORA.donations = {
    initShelterConnect,
    initOverview
  };
})();
/* ============================================================
   ZENVORA — Smart Pantry
   ------------------------------------------------------------
   Full CRUD with:
     - search, filter by category, sort, low-stock filter
     - add / edit modal with validation
     - delete confirmation
     - empty + error states that preserve user input
   ============================================================ */

(function () {
  'use strict';

  const { api, layout } = window.ZENVORA;

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  let items = [];
  let filters = {
    search: '',
    category: '',
    sort: 'expiry-asc',
    lowStockOnly: false
  };
  let pendingDeleteId = null;

  const CATEGORY_LABEL = {
    vegetables: 'Vegetables',
    fruits:     'Fruits',
    grains:     'Grains',
    dairy:      'Dairy',
    packaged:   'Packaged',
    spices:     'Spices',
    other:      'Other'
  };

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  function init() {
    wireFilters();
    wireModals();
    wireForm();
    load();
  }

  // ---------------------------------------------------------
  // Load
  // ---------------------------------------------------------
  async function load() {
    try {
      const data = await api.pantry.list();
      items = Array.isArray(data) ? data : (data.results || []);
      render();
    } catch (err) {
      console.warn('[pantry] load failed:', err?.message);
      items = [];
      render();
      layout.toast('Could not load pantry items.', 'error');
    }
  }

  // ---------------------------------------------------------
  // Filtering + sorting
  // ---------------------------------------------------------
  function applyFilters(list) {
    let out = list.slice();

    if (filters.search) {
      const q = filters.search.toLowerCase();
      out = out.filter((i) => (i.name || '').toLowerCase().includes(q));
    }
    if (filters.category) {
      out = out.filter((i) => i.category === filters.category);
    }
    if (filters.lowStockOnly) {
      out = out.filter((i) => isLowStock(i));
    }

    const sorters = {
      'expiry-asc':  (a, b) => dateVal(a.expiry) - dateVal(b.expiry),
      'expiry-desc': (a, b) => dateVal(b.expiry) - dateVal(a.expiry),
      'name-asc':    (a, b) => (a.name || '').localeCompare(b.name || ''),
      'name-desc':   (a, b) => (b.name || '').localeCompare(a.name || ''),
      'added-desc':  (a, b) => dateVal(b.createdAt) - dateVal(a.createdAt)
    };
    if (sorters[filters.sort]) out.sort(sorters[filters.sort]);

    return out;
  }

  function dateVal(d) {
    if (!d) return 0;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
  }

  function isLowStock(item) {
    if (item.lowStockThreshold == null) return false;
    return Number(item.quantity || 0) <= Number(item.lowStockThreshold);
  }

  function expiryStatus(item) {
    const days = layout.daysUntil(item.expiry);
    if (days == null) return { cls: 'muted', label: 'No date' };
    if (days < 0)     return { cls: 'danger', label: 'Expired' };
    if (days === 0)   return { cls: 'danger', label: 'Expires today' };
    if (days === 1)   return { cls: 'warn',   label: '1 day left' };
    if (days <= 3)    return { cls: 'warn',   label: `${days} days left` };
    return { cls: 'success', label: `${days} days left` };
  }

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  function render() {
    const filtered = applyFilters(items);
    renderSummary(filtered);
    renderTable(filtered);
  }

  function renderSummary(filtered) {
    const total = items.length;
    const expiring = items.filter((i) => {
      const d = layout.daysUntil(i.expiry);
      return d != null && d >= 0 && d <= 3;
    }).length;
    const expired = items.filter((i) => {
      const d = layout.daysUntil(i.expiry);
      return d != null && d < 0;
    }).length;

    setText('countBadge',
      `${filtered.length} item${filtered.length === 1 ? '' : 's'}`);

    const eBadge = document.getElementById('expiringBadge');
    const xBadge = document.getElementById('expiredBadge');
    if (eBadge) {
      eBadge.hidden = expiring === 0;
      eBadge.textContent = `${expiring} expiring soon`;
    }
    if (xBadge) {
      xBadge.hidden = expired === 0;
      xBadge.textContent = `${expired} expired`;
    }
  }

  function renderTable(filtered) {
    const tbody = document.getElementById('pantryTableBody');
    if (!tbody) return;

    if (!filtered.length) {
      const msg = items.length
        ? 'No items match your filters.'
        : 'Your pantry is empty. Add your first item!';
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">${msg}</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((item) => {
      const status = expiryStatus(item);
      const low = isLowStock(item);
      return `
        <tr data-id="${layout.escapeHtml(String(item.id))}">
          <td class="cell-title">${layout.escapeHtml(item.name || '—')}</td>
          <td>${layout.escapeHtml(CATEGORY_LABEL[item.category] || item.category || '—')}</td>
          <td>
            ${layout.escapeHtml(String(item.quantity ?? ''))} ${layout.escapeHtml(item.unit || '')}
            ${low ? '<span class="badge badge-warn" style="margin-left:6px">low</span>' : ''}
          </td>
          <td>${layout.formatDate(item.purchaseDate)}</td>
          <td>${layout.formatDate(item.expiry)}</td>
          <td><span class="badge badge-${status.cls}">${status.label}</span></td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-action="edit"
                      data-id="${layout.escapeHtml(String(item.id))}"
                      aria-label="Edit ${layout.escapeHtml(item.name || '')}">
                <i data-lucide="pencil"></i>
              </button>
              <button class="icon-btn" data-action="delete"
                      data-id="${layout.escapeHtml(String(item.id))}"
                      aria-label="Delete ${layout.escapeHtml(item.name || '')}">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    if (window.lucide) lucide.createIcons();

    tbody.querySelectorAll('[data-action="edit"]').forEach((b) =>
      b.addEventListener('click', () => openEdit(b.dataset.id)));
    tbody.querySelectorAll('[data-action="delete"]').forEach((b) =>
      b.addEventListener('click', () => openDelete(b.dataset.id)));
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v ?? '';
  }

  // ---------------------------------------------------------
  // Modal — add / edit
  // ---------------------------------------------------------
  function openModal(item = null) {
    const modal = document.getElementById('itemModal');
    if (!modal) return;
    modal.hidden = false;

    setText('itemModalTitle', item ? 'Edit Food Item' : 'Add Food Item');
    document.getElementById('itemId').value           = item?.id || '';
    document.getElementById('itemName').value         = item?.name || '';
    document.getElementById('itemCategory').value     = item?.category || '';
    document.getElementById('itemQuantity').value     = item?.quantity ?? '';
    document.getElementById('itemUnit').value         = item?.unit || 'pcs';
    document.getElementById('itemLowStock').value     = item?.lowStockThreshold ?? '';
    document.getElementById('itemPurchaseDate').value = toInputDate(item?.purchaseDate);
    document.getElementById('itemExpiryDate').value   = toInputDate(item?.expiry);
    document.getElementById('itemNotes').value        = item?.notes || '';

    clearAllErrors();
    if (window.lucide) lucide.createIcons();
  }

  function closeModal() {
    const modal = document.getElementById('itemModal');
    if (modal) modal.hidden = true;
  }

  function openEdit(id) {
    const item = items.find((i) => String(i.id) === String(id));
    if (item) openModal(item);
  }

  function openDelete(id) {
    const item = items.find((i) => String(i.id) === String(id));
    pendingDeleteId = id;
    const modal = document.getElementById('deleteModal');
    const text  = document.getElementById('deleteModalText');
    if (text && item) {
      text.textContent = `Delete "${item.name}"? This cannot be undone.`;
    }
    if (modal) modal.hidden = false;
  }

  function closeDelete() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.hidden = true;
    pendingDeleteId = null;
  }

  function toInputDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toISOString().slice(0, 10);
  }

  // ---------------------------------------------------------
  // Form submit
  // ---------------------------------------------------------
  async function submitItem(e) {
    e.preventDefault();
    const form = e.currentTarget;
    clearAllErrors();

    const id = document.getElementById('itemId').value;
    const payload = {
      name:              document.getElementById('itemName').value.trim(),
      category:          document.getElementById('itemCategory').value,
      quantity:          parseFloat(document.getElementById('itemQuantity').value),
      unit:              document.getElementById('itemUnit').value,
      lowStockThreshold: numOrNull(document.getElementById('itemLowStock').value),
      purchaseDate:      document.getElementById('itemPurchaseDate').value || null,
      expiry:            document.getElementById('itemExpiryDate').value,
      notes:             document.getElementById('itemNotes').value.trim()
    };

    let ok = true;
    if (!payload.name) {
      setError('field-itemName', 'name', 'Item name is required.');
      ok = false;
    }
    if (!payload.category) {
      setError('field-itemCategory', 'category', 'Choose a category.');
      ok = false;
    }
    if (isNaN(payload.quantity) || payload.quantity < 0) {
      setError('field-itemQty', 'quantity', 'Enter a valid quantity.');
      ok = false;
    }
    if (!payload.expiry) {
      setError('field-itemExpiry', 'expiry', 'Expiry date is required.');
      ok = false;
    }
    if (!ok) return;

    const btn = document.getElementById('saveItemBtn');
    setLoading(btn, true);

    try {
      if (id) await api.pantry.update(id, payload);
      else    await api.pantry.create(payload);

      closeModal();
      layout.toast(id ? 'Item updated.' : 'Item added.', 'success');
      await load();
    } catch (err) {
      // Keep modal open, keep user input — only show error.
      layout.toast(err?.message || 'Could not save item.', 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const btn = document.getElementById('confirmDeleteBtn');
    setLoading(btn, true);

    try {
      await api.pantry.remove(pendingDeleteId);
      closeDelete();
      layout.toast('Item deleted.', 'success');
      await load();
    } catch (err) {
      layout.toast(err?.message || 'Could not delete item.', 'error');
    } finally {
      setLoading(btn, false);
    }
  }

  function numOrNull(v) {
    if (v === '' || v == null) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  // ---------------------------------------------------------
  // Validation UI
  // ---------------------------------------------------------
  function setError(fieldId, key, msg) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('has-error');
    const err = field.querySelector(`[data-error="${key}"]`);
    if (err) err.textContent = msg;
  }

  function clearAllErrors() {
    document.querySelectorAll('#itemForm .has-error')
      .forEach((f) => f.classList.remove('has-error'));
    document.querySelectorAll('#itemForm .error-msg')
      .forEach((e) => (e.textContent = ''));
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
  // Wire UI
  // ---------------------------------------------------------
  function wireFilters() {
    const search       = document.getElementById('pantrySearch');
    const globalSearch = document.getElementById('globalSearch');
    const cat          = document.getElementById('filterCategory');
    const sort         = document.getElementById('sortBy');
    const lowOnly      = document.getElementById('lowStockOnly');

    const onSearch = layout.debounce((v) => {
      filters.search = v;
      render();
    }, 180);

    search?.addEventListener('input', (e) => onSearch(e.target.value));
    globalSearch?.addEventListener('input', (e) => onSearch(e.target.value));
    cat?.addEventListener('change', (e) => { filters.category = e.target.value; render(); });
    sort?.addEventListener('change', (e) => { filters.sort = e.target.value; render(); });
    lowOnly?.addEventListener('change', (e) => { filters.lowStockOnly = e.target.checked; render(); });
  }

  function wireModals() {
    document.getElementById('openAddModal')?.addEventListener('click', () => openModal());
    document.getElementById('closeItemModal')?.addEventListener('click', closeModal);
    document.getElementById('cancelItemModal')?.addEventListener('click', closeModal);
    document.getElementById('closeDeleteModal')?.addEventListener('click', closeDelete);
    document.getElementById('cancelDeleteModal')?.addEventListener('click', closeDelete);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModal(); closeDelete(); }
    });
  }

  function wireForm() {
    document.getElementById('itemForm')?.addEventListener('submit', submitItem);
  }

  // ---------------------------------------------------------
  // Exports
  // ---------------------------------------------------------
  window.ZENVORA.pantry = { init };
})();
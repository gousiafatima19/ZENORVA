/* ============================================================
   ZENVORA - Dietary Profile
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA || {};

  function api()    { return Z.api || null; }
  function layout() { return Z.layout || null; }

  function escapeHtml(s) {
    var l = layout();
    if (l && typeof l.escapeHtml === 'function') {
      try { return l.escapeHtml(s); } catch (e) { /* fall through */ }
    }
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(msg, kind) {
    var l = layout();
    if (l && typeof l.toast === 'function') l.toast(msg, kind || 'info');
  }

  var current = {
    allergies: [],
    diet: 'none',
    avoid: [],
    dislikes: [],
    budget: 'medium',
    mealSize: '1'
  };

  /* ---------- INIT ---------- */
  function init() {
    wireAllergyChips();
    wireDietChips();
    wireChipInput('avoidInput', 'avoidChips', 'avoid');
    wireChipInput('dislikeInput', 'dislikeChips', 'dislikes');
    wireForm();
    load();
  }

  /* ---------- LOAD ---------- */
  function load() {
    var apiRef = api();
    if (!apiRef || !apiRef.dietary || typeof apiRef.dietary.get !== 'function') return;

    apiRef.dietary.get().then(function (data) {
      if (!data) return;
      current = normalize(data);
      applyToForm();
    }).catch(function (err) {
      console.warn('[dietary] load failed:', err && err.message);
    });
  }

  function normalize(data) {
    data = data || {};
    return {
      allergies: Array.isArray(data.allergies) ? data.allergies.slice() : [],
      diet:      data.diet || 'none',
      avoid:     Array.isArray(data.avoid) ? data.avoid.slice() : [],
      dislikes:  Array.isArray(data.dislikes) ? data.dislikes.slice() : [],
      budget:    data.budget || 'medium',
      mealSize:  data.meal_size || data.mealSize || '1'
    };
  }

  function applyToForm() {
    /* Allergy chips */
    var allergyEls = document.querySelectorAll('#allergyChips .chip');
    for (var i = 0; i < allergyEls.length; i++) {
      var v = allergyEls[i].getAttribute('data-value');
      if (current.allergies.indexOf(v) !== -1) allergyEls[i].classList.add('active');
      else allergyEls[i].classList.remove('active');
    }

    /* Diet chips - highlight the one matching current.diet */
    var dietEls = document.querySelectorAll('#dietChips .chip');
    for (var j = 0; j < dietEls.length; j++) {
      var dv = dietEls[j].getAttribute('data-value');
      if (dv === current.diet) dietEls[j].classList.add('active');
      else dietEls[j].classList.remove('active');
      var radio = dietEls[j].querySelector('input[type="radio"]');
      if (radio) radio.checked = (dv === current.diet);
    }

    renderChipList('avoidChips', current.avoid);
    renderChipList('dislikeChips', current.dislikes);

    var b = document.getElementById('budgetPref');
    var m = document.getElementById('mealSizePref');
    if (b) b.value = current.budget;
    if (m) m.value = current.mealSize;
  }

  /* ---------- ALLERGY CHIPS ---------- */
  function wireAllergyChips() {
    var chips = document.querySelectorAll('#allergyChips .chip');
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          var v = chip.getAttribute('data-value');
          var idx = current.allergies.indexOf(v);
          if (idx !== -1) {
            current.allergies.splice(idx, 1);
            chip.classList.remove('active');
          } else {
            current.allergies.push(v);
            chip.classList.add('active');
          }
        });
      })(chips[i]);
    }
  }

  /* ---------- DIET CHIPS ---------- */
  function wireDietChips() {
    var chips = document.querySelectorAll('#dietChips .chip');
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        chip.addEventListener('click', function (e) {
          e.preventDefault();
          var v = chip.getAttribute('data-value');
          current.diet = v;

          var siblings = document.querySelectorAll('#dietChips .chip');
          for (var j = 0; j < siblings.length; j++) siblings[j].classList.remove('active');
          chip.classList.add('active');

          var radio = chip.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
        });
      })(chips[i]);
    }
  }

  /* ---------- CHIP INPUTS (avoid, dislikes) ---------- */
  /* key is 'avoid' or 'dislikes' - looks up current[key] on each call so
     reset() reassignments of `current` do not orphan the array. */
  function wireChipInput(inputId, listId, key) {
    var input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var v = input.value.trim();
        if (!v) return;

        var arr = current[key] || (current[key] = []);
        var lower = v.toLowerCase();
        var exists = arr.some(function (x) { return String(x).toLowerCase() === lower; });
        if (!exists) {
          arr.push(v);
          renderChipList(listId, arr);
        }
        input.value = '';
      }
    });
  }

  /* DOM-built chip list - no innerHTML with user data, fully XSS-safe. */
  function renderChipList(listId, arr) {
    var wrap = document.getElementById(listId);
    if (!wrap) return;

    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

    for (var i = 0; i < arr.length; i++) {
      var v = String(arr[i]);

      var chip = document.createElement('span');
      chip.className = 'chip active';
      chip.textContent = v;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Remove');
      btn.textContent = 'x';
      btn.setAttribute('data-remove', v);

      (function (value) {
        btn.addEventListener('click', function () {
          var list = current[keyForList(listId)] || [];
          var idx = list.indexOf(value);
          if (idx >= 0) list.splice(idx, 1);
          renderChipList(listId, list);
        });
      })(v);

      chip.appendChild(btn);
      wrap.appendChild(chip);
    }
  }

  function keyForList(listId) {
    if (listId === 'avoidChips') return 'avoid';
    if (listId === 'dislikeChips') return 'dislikes';
    return null;
  }

  /* ---------- FORM ---------- */
  function wireForm() {
    var form = document.getElementById('dietaryForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var b = document.getElementById('budgetPref');
      var m = document.getElementById('mealSizePref');
      current.budget   = (b && b.value) || 'medium';
      current.mealSize = (m && m.value) || '1';

      var btn = document.getElementById('saveDietaryBtn');
      setLoading(btn, true);

      /* Save locally as backup */
      try { localStorage.setItem('zenvora_dietary', JSON.stringify(current)); } catch (err) { /* ignore */ }

      var apiRef = api();
      if (!apiRef || !apiRef.dietary || typeof apiRef.dietary.update !== 'function') {
        toast('Preferences saved locally.', 'success');
        setLoading(btn, false);
        return;
      }

      /* Mirror mealSize <-> meal_size for backend compatibility */
      var payload = {
        allergies: current.allergies.slice(),
        diet:      current.diet,
        avoid:     current.avoid.slice(),
        dislikes:  current.dislikes.slice(),
        budget:    current.budget,
        mealSize:  current.mealSize,
        meal_size: current.mealSize
      };

      apiRef.dietary.update(payload).then(function (res) {
        if (res && res.offline) toast('Preferences saved locally.', 'info');
        else toast('Preferences saved.', 'success');
      }).catch(function (err) {
        console.warn('[dietary] save failed:', err && err.message);
        toast((err && err.message) || 'Could not save preferences.', 'error');
      }).then(function () {
        setLoading(btn, false);
      });
    });

    form.addEventListener('reset', function () {
      current = { allergies: [], diet: 'none', avoid: [], dislikes: [], budget: 'medium', mealSize: '1' };
      applyToForm();
    });
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    var l = btn.querySelector('.btn-label');
    var s = btn.querySelector('.btn-spinner');
    if (l) l.hidden = loading;
    if (s) s.hidden = !loading;
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  Z.dietaryProfile = { init: init };
  Z.dietary        = { init: init };
})();

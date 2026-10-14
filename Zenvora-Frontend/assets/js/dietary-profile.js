/* ============================================================
   ZENVORA — Dietary Profile
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA;
  var api = Z.api;
  var layout = Z.layout;

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
    wireChipInput('avoidInput', 'avoidChips', current.avoid);
    wireChipInput('dislikeInput', 'dislikeChips', current.dislikes);
    wireForm();
    load();
  }

  /* ---------- LOAD ---------- */
  function load() {
    if (!api.dietary) return;
    api.dietary.get().then(function (data) {
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
      allergies: Array.isArray(data.allergies) ? data.allergies : [],
      diet:      data.diet || 'none',
      avoid:     Array.isArray(data.avoid) ? data.avoid : [],
      dislikes:  Array.isArray(data.dislikes) ? data.dislikes : [],
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

    /* Diet chips — highlight the one matching current.diet */
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

          /* Clear all active */
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
  function wireChipInput(inputId, listId, targetArr) {
    var input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var v = input.value.trim();
        if (!v) return;
        if (targetArr.indexOf(v) === -1) {
          targetArr.push(v);
          renderChipList(listId, targetArr);
        }
        input.value = '';
      }
    });
  }

  function renderChipList(listId, arr) {
    var wrap = document.getElementById(listId);
    if (!wrap) return;
    var html = '';
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      var safe = layout.escapeHtml(v);
      html += '<span class="chip active">' + safe
            + '<button type="button" data-remove="' + safe + '" aria-label="Remove">×</button>'
            + '</span>';
    }
    wrap.innerHTML = html;
    var btns = wrap.querySelectorAll('[data-remove]');
    for (var k = 0; k < btns.length; k++) {
      (function (b) {
        b.addEventListener('click', function () {
          var v2 = b.getAttribute('data-remove');
          var i2 = arr.indexOf(v2);
          if (i2 >= 0) arr.splice(i2, 1);
          renderChipList(listId, arr);
        });
      })(btns[k]);
    }
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
      try { localStorage.setItem('zenvora_dietary', JSON.stringify(current)); } catch (err) {}

      if (!api.dietary) {
        layout.toast('Preferences saved locally.', 'success');
        setLoading(btn, false);
        return;
      }

      api.dietary.update(current).then(function () {
        layout.toast('Preferences saved.', 'success');
      }).catch(function (err) {
        layout.toast((err && err.message) || 'Could not save preferences.', 'error');
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
    if (window.lucide) lucide.createIcons();
  }

  Z.dietaryProfile = { init: init };
})();
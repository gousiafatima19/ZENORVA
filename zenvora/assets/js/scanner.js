/* ============================================================
   ZENVORA — Food Scanner
   Sends image to backend Gemini Vision endpoint.
   Falls back to manual ingredient entry if unavailable.
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA;
  var api = Z.api;
  var layout = Z.layout;

  var selectedFile = null;
  var parsedResult = null;

  /* ---------- Helper: find element by any of several IDs ---------- */
  function find() {
    var args = Array.prototype.slice.call(arguments);
    for (var i = 0; i < args.length; i++) {
      var el = document.getElementById(args[i]);
      if (el) return el;
    }
    return null;
  }

  function init() {
    wireUpload();
    wireActions();
  }

  function wireUpload() {
    var dropzone  = find('scannerDropzone', 'dropzone', 'uploadZone', 'uploadArea');
    var fileInput = find('scannerFile', 'scannerFileInput', 'fileInput', 'imageInput');

    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.id = 'scannerFile';
      document.body.appendChild(fileInput);
    }

    if (dropzone) {
      dropzone.addEventListener('click', function () { fileInput.click(); });

      dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', function () {
        dropzone.classList.remove('dragover');
      });
      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    fileInput.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });
  }

  function handleFile(file) {
    if (!file.type || file.type.indexOf('image/') !== 0) {
      layout.toast('Please upload an image file.', 'warn');
      return;
    }
    selectedFile = file;

    var reader = new FileReader();
    reader.onload = function (e) {
      var img  = find('previewImage', 'scannerPreviewImg', 'previewImg');
      var wrap = find('scannerPreview', 'scannerPreviewWrap', 'previewWrap');
      if (img)  img.src = e.target.result;
      if (wrap) wrap.hidden = false;

      var scanBtn = find('scanBtn', 'scanProductBtn', 'scanImageBtn');
      if (scanBtn) scanBtn.disabled = false;

      var emptyState = find('scanEmptyState');
      if (emptyState) emptyState.hidden = true;
    };
    reader.readAsDataURL(file);
  }

  function clearPreview() {
    selectedFile = null;
    parsedResult = null;

    var img  = find('previewImage', 'scannerPreviewImg', 'previewImg');
    if (img) img.src = '';
    var wrap = find('scannerPreview', 'scannerPreviewWrap');
    if (wrap) wrap.hidden = true;

    var fileInput = find('scannerFile', 'scannerFileInput', 'fileInput');
    if (fileInput) fileInput.value = '';

    var scanBtn = find('scanBtn', 'scanProductBtn');
    if (scanBtn) scanBtn.disabled = true;

    var emptyState = find('scanEmptyState');
    if (emptyState) emptyState.hidden = false;

    var resultForm = find('scanResultForm');
    if (resultForm) resultForm.hidden = true;

    var errorState = find('scanErrorState');
    if (errorState) errorState.hidden = true;
  }

  function wireActions() {
    /* SCAN BUTTON — triggers the actual backend call */
    var scanBtn = find('scanBtn', 'scanProductBtn', 'scanImageBtn');
    if (scanBtn) {
      scanBtn.addEventListener('click', function () {
        if (selectedFile) {
          runScan();
        } else {
          var fileInput = find('scannerFile', 'scannerFileInput', 'fileInput');
          if (fileInput) fileInput.click();
        }
      });
    }

    var clearBtn = find('clearPreview', 'clearPreviewBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearPreview);

    var retryBtn = find('retryScanBtn');
    if (retryBtn) retryBtn.addEventListener('click', runScan);
  }

  function runScan() {
    if (!selectedFile) {
      layout.toast('Please select an image first.', 'warn');
      return;
    }

    var btn = find('scanBtn', 'scanProductBtn', 'scanImageBtn');
    if (btn) btn.disabled = true;

    showLoading();

    /* ---- CALL THE REAL BACKEND ---- */
    Z.api.scan.image(selectedFile)
      .then(function (result) {
        parsedResult = {
          name: 'Scanned Product',
          category: 'packaged',
          quantity: 1,
          unit: 'pack',
          expiry: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          ingredients: result.ingredients_parsed || [],
          confidence: result.confidence || 'low',
          notes: result.notes || '',
          allergen_conflicts: result.allergen_conflicts || [],
          is_safe_guarantee: false,
          warning: result.warning || '',
          is_demo: false
        };
        renderResults(parsedResult);
        if (btn) btn.disabled = false;
      })
      .catch(function (err) {
        console.error('Scan failed:', err);
        showError(err && err.message ? err.message : 'Could not analyze image.');
        if (btn) btn.disabled = false;
      });
  }

  function showLoading() {
    var emptyState = find('scanEmptyState');
    if (emptyState) emptyState.hidden = true;

    var errorState = find('scanErrorState');
    if (errorState) errorState.hidden = true;

    var resultForm = find('scanResultForm');
    if (resultForm) resultForm.hidden = true;

    var loading = find('scanLoadingState');
    if (loading) {
      loading.hidden = false;
      if (window.lucide) lucide.createIcons();
    }
  }

  function showError(msg) {
    var loading = find('scanLoadingState');
    if (loading) loading.hidden = true;

    var errorState = find('scanErrorState');
    var errorText = find('scanErrorText');
    if (errorText) errorText.textContent = msg || 'Scan failed. Please try again.';
    if (errorState) errorState.hidden = false;
  }

  function renderResults(r) {
    var loading = find('scanLoadingState');
    if (loading) loading.hidden = true;

    var errorState = find('scanErrorState');
    if (errorState) errorState.hidden = true;

    /* Populate the form fields from scanResultForm */
    var form = find('scanResultForm');
    if (form) {
      form.hidden = false;

      var nameEl = find('scanProductName');
      if (nameEl) nameEl.value = r.name;

      var ingEl = find('scanIngredients');
      if (ingEl) ingEl.value = (r.ingredients || []).join('\n');

      var allergenEl = find('scanAllergens');
      if (allergenEl) {
        allergenEl.value = (r.allergen_conflicts || []).join(', ');
      }

      var nutritionEl = find('scanNutrition');
      if (nutritionEl) nutritionEl.value = '';
    }

    /* Show allergen warning prominently */
    if (r.allergen_conflicts && r.allergen_conflicts.length) {
      layout.toast('Allergen conflict detected: ' + r.allergen_conflicts.join(', '), 'warn');
    }

    if (window.lucide) lucide.createIcons();

    /* Wire the Add to Pantry button inside the form */
    var addBtn = find('addScannedToPantry');
    if (addBtn) {
      addBtn.onclick = addToPantry;
    }

    var discardBtn = find('discardScan');
    if (discardBtn) {
      discardBtn.onclick = clearPreview;
    }
  }

  function addToPantry() {
    if (!parsedResult) {
      layout.toast('Scan a product first.', 'warn');
      return;
    }

    var nameEl = find('scanProductName');
    var ingEl  = find('scanIngredients');

    var name = nameEl ? nameEl.value.trim() : parsedResult.name;
    var ingredients = ingEl ? ingEl.value.split('\n').filter(function(l){return l.trim();}) : parsedResult.ingredients;

    if (!name) {
      layout.toast('Please enter a product name.', 'warn');
      return;
    }

    if (!api.pantry || !api.pantry.create) {
      layout.toast('Pantry service unavailable.', 'error');
      return;
    }

    api.pantry.create({
      name: name,
      category: parsedResult.category,
      quantity: parsedResult.quantity,
      unit: parsedResult.unit,
      expiry: parsedResult.expiry
    }).then(function () {
      layout.toast('Added to pantry.', 'success');
      setTimeout(function () { location.href = 'pantry.html'; }, 800);
    }).catch(function (err) {
      layout.toast((err && err.message) || 'Could not add to pantry.', 'error');
    });
  }

  Z.scanner = { init: init };
  Z.foodScanner = { init: init };
})();

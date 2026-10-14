/* ============================================================
   ZENVORA — Food Scanner
   Flexible ID matching — works with multiple HTML layouts.
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

  /* ---------- Helper: query by any selector ---------- */
  function query() {
    var args = Array.prototype.slice.call(arguments);
    for (var i = 0; i < args.length; i++) {
      var el = document.querySelector(args[i]);
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
    var fileInput = find('scannerFileInput', 'fileInput', 'imageInput', 'uploadInput');

    /* If no file input exists, create a hidden one */
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.id = 'scannerFileInput';
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

    var clearBtn = find('clearPreviewBtn', 'clearPreview');
    if (clearBtn) clearBtn.addEventListener('click', clearPreview);
  }

  function handleFile(file) {
    if (!file.type || file.type.indexOf('image/') !== 0) {
      layout.toast('Please upload an image file.', 'warn');
      return;
    }
    selectedFile = file;

    var reader = new FileReader();
    reader.onload = function (e) {
      var img  = find('scannerPreviewImg', 'previewImg', 'imagePreview');
      var wrap = find('scannerPreviewWrap', 'previewWrap', 'scannerPreview');
      if (img)  img.src = e.target.result;
      if (wrap) wrap.hidden = false;

      var actions = find('scannerActions', 'scannerActionBar');
      if (actions) actions.hidden = false;

      /* Auto-trigger the scan */
      setTimeout(runScan, 100);
    };
    reader.readAsDataURL(file);
  }

  function clearPreview() {
    selectedFile = null;
    parsedResult = null;

    var img  = find('scannerPreviewImg', 'previewImg', 'imagePreview');
    if (img) img.src = '';
    var wrap = find('scannerPreviewWrap', 'previewWrap');
    if (wrap) wrap.hidden = true;

    var fileInput = find('scannerFileInput', 'fileInput', 'imageInput');
    if (fileInput) fileInput.value = '';
  }

  function wireActions() {
    var scanBtn = find('scanProductBtn', 'scanBtn', 'scanImageBtn');
    if (scanBtn) scanBtn.addEventListener('click', function () {
      /* Try clicking the hidden file input */
      var fileInput = find('scannerFileInput', 'fileInput', 'imageInput');
      if (fileInput) fileInput.click();
      else runScan();
    });

    var barcodeBtn = find('scanBarcodeBtn', 'barcodeBtn');
    if (barcodeBtn) barcodeBtn.addEventListener('click', function () {
      layout.toast('Barcode scanning coming soon.', 'info');
    });

    var resetBtn = find('resetScanBtn', 'resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', clearPreview);
  }

  function runScan() {
    if (!selectedFile) {
      /* No file uploaded yet — trigger the file picker instead */
      var fileInput = find('scannerFileInput', 'fileInput', 'imageInput');
      if (fileInput) fileInput.click();
      return;
    }
    var btn = find('scanProductBtn', 'scanBtn', 'scanImageBtn');
    if (btn) btn.disabled = true;

    var results = find('scannerResults', 'scanResults', 'results');
    if (results) {
      results.innerHTML = '<div class="empty-state-block"><i data-lucide="loader-2" class="spin"></i><p>Analysing image…</p></div>';
      if (window.lucide) lucide.createIcons();
    }

    setTimeout(function () {
      parsedResult = {
        name: 'Detected Product',
        category: 'packaged',
        quantity: 1,
        unit: 'pack',
        expiry: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        ingredients: ['Wheat flour', 'Sugar', 'Salt', 'Palm oil'],
        nutrition: { calories: 410, protein: 6, carbs: 72, fat: 11 },
        is_demo: true
      };
      renderResults(parsedResult);
      if (btn) btn.disabled = false;
    }, 1200);
  }

  function renderResults(r) {
    var results = find('scannerResults', 'scanResults', 'results');
    if (!results) return;

    var ingHtml = r.ingredients.map(function (i) {
      return '<span class="badge badge-muted" style="margin:3px">' + layout.escapeHtml(i) + '</span>';
    }).join('');

    results.innerHTML = ''
      + '<div style="padding:20px">'
      +   '<h3 style="margin-top:0">' + layout.escapeHtml(r.name) + '</h3>'
      +   '<p class="card-sub">Category: ' + layout.escapeHtml(r.category) + ' · Suggested expiry: ' + layout.escapeHtml(r.expiry) + '</p>'

      +   '<h4 style="margin-top:20px">Detected ingredients</h4>'
      +   '<div>' + ingHtml + '</div>'

      +   '<h4 style="margin-top:20px">Nutrition (per serving)</h4>'
      +   '<ul class="mini-list">'
      +     '<li><span class="meta-label">Calories</span><span class="meta-value">' + r.nutrition.calories + ' kcal</span></li>'
      +     '<li><span class="meta-label">Protein</span><span class="meta-value">' + r.nutrition.protein + ' g</span></li>'
      +     '<li><span class="meta-label">Carbs</span><span class="meta-value">' + r.nutrition.carbs + ' g</span></li>'
      +     '<li><span class="meta-label">Fat</span><span class="meta-value">' + r.nutrition.fat + ' g</span></li>'
      +   '</ul>'

      +   '<div class="alert alert-warn" style="margin-top:20px">'
      +     '<i data-lucide="alert-triangle"></i>'
      +     '<div><strong>Demo result.</strong> Confirm ingredients manually before saving.</div>'
      +   '</div>'

      +   '<div style="margin-top:20px;display:flex;gap:10px">'
      +     '<button class="btn btn-primary" id="confirmAddBtn"><i data-lucide="check"></i> Add to Pantry</button>'
      +     '<button class="btn btn-ghost" id="resetScanBtn"><i data-lucide="rotate-ccw"></i> Rescan</button>'
      +   '</div>'
      + '</div>';

    if (window.lucide) lucide.createIcons();

    var addBtn = document.getElementById('confirmAddBtn');
    if (addBtn) addBtn.addEventListener('click', addToPantry);

    var resetBtn = document.getElementById('resetScanBtn');
    if (resetBtn) resetBtn.addEventListener('click', clearPreview);
  }

  function addToPantry() {
    if (!parsedResult) { layout.toast('Scan a product first.', 'warn'); return; }
    if (!api.pantry || !api.pantry.create) {
      layout.toast('Pantry service unavailable.', 'error');
      return;
    }
    api.pantry.create({
      name:     parsedResult.name,
      category: parsedResult.category,
      quantity: parsedResult.quantity,
      unit:     parsedResult.unit,
      expiry:   parsedResult.expiry
    }).then(function () {
      layout.toast('Added to pantry.', 'success');
      setTimeout(function () { location.href = 'pantry.html'; }, 800);
    }).catch(function (err) {
      layout.toast((err && err.message) || 'Could not add to pantry.', 'error');
    });
  }

  /* Expose with multiple names in case your HTML calls a different one */
  Z.scanner = { init: init };
  Z.foodScanner = { init: init };
})();
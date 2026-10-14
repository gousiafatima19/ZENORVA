/* ============================================================
   ZENVORA — Settings
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA;
  var api = Z.api;
  var layout = Z.layout;

  var KEYS = {
    location: 'zenvora_set_location',
    notifExpiry: 'zenvora_notif_expiry',
    notifCooking: 'zenvora_notif_cooking',
    notifDonations: 'zenvora_notif_donations',
    notifOffers: 'zenvora_notif_offers',
    notifSystem: 'zenvora_notif_system',
    voiceSpeak: 'zenvora_voice_speak',
    voiceCommands: 'zenvora_voice_commands',
    voiceRate: 'zenvora_voice_rate',
    voiceVolume: 'zenvora_voice_volume',
    accHighContrast: 'zenvora_acc_contrast',
    accLargeText: 'zenvora_acc_text',
    accReduceMotion: 'zenvora_acc_motion'
  };

  function init() {
    loadFromStorage();
    wireForm();
    wireDangerZone();
  }

  function loadFromStorage() {
    setCheckbox('setLocationEnabled', KEYS.location, false);
    setCheckbox('notifExpiry',        KEYS.notifExpiry, true);
    setCheckbox('notifCooking',       KEYS.notifCooking, true);
    setCheckbox('notifDonations',     KEYS.notifDonations, true);
    setCheckbox('notifOffers',        KEYS.notifOffers, true);
    setCheckbox('notifSystem',        KEYS.notifSystem, true);
    setCheckbox('voiceSpeakResponses', KEYS.voiceSpeak, true);
    setCheckbox('voiceCommands',      KEYS.voiceCommands, false);
    setCheckbox('accHighContrast',    KEYS.accHighContrast, false);
    setCheckbox('accLargeText',       KEYS.accLargeText, false);
    setCheckbox('accReduceMotion',    KEYS.accReduceMotion, false);

    var rate = document.getElementById('voiceRate');
    var vol  = document.getElementById('voiceVolume');
    if (rate) rate.value = localStorage.getItem(KEYS.voiceRate) || '1';
    if (vol)  vol.value  = localStorage.getItem(KEYS.voiceVolume) || '1';
  }

  function setCheckbox(id, key, defaultValue) {
    var el = document.getElementById(id);
    if (!el) return;
    var v = localStorage.getItem(key);
    el.checked = (v === null) ? defaultValue : (v === '1');
  }

  function wireForm() {
    var form = document.getElementById('settingsForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      saveCheckbox('setLocationEnabled', KEYS.location);
      saveCheckbox('notifExpiry',        KEYS.notifExpiry);
      saveCheckbox('notifCooking',       KEYS.notifCooking);
      saveCheckbox('notifDonations',     KEYS.notifDonations);
      saveCheckbox('notifOffers',        KEYS.notifOffers);
      saveCheckbox('notifSystem',        KEYS.notifSystem);
      saveCheckbox('voiceSpeakResponses', KEYS.voiceSpeak);
      saveCheckbox('voiceCommands',      KEYS.voiceCommands);
      saveCheckbox('accHighContrast',    KEYS.accHighContrast);
      saveCheckbox('accLargeText',       KEYS.accLargeText);
      saveCheckbox('accReduceMotion',    KEYS.accReduceMotion);

      var rate = document.getElementById('voiceRate');
      var vol  = document.getElementById('voiceVolume');
      if (rate) localStorage.setItem(KEYS.voiceRate, rate.value);
      if (vol)  localStorage.setItem(KEYS.voiceVolume, vol.value);

      applyAccessibilitySettings();

      var btn = document.getElementById('saveSettingsBtn');
      setLoading(btn, true);
      setTimeout(function () {
        setLoading(btn, false);
        layout.toast('Settings saved.', 'success');
      }, 400);
    });

    form.addEventListener('reset', function () {
      setTimeout(loadFromStorage, 0);
    });
  }

  function saveCheckbox(id, key) {
    var el = document.getElementById(id);
    if (el) localStorage.setItem(key, el.checked ? '1' : '0');
  }

  function applyAccessibilitySettings() {
    var large = localStorage.getItem(KEYS.accLargeText) === '1';
    document.documentElement.style.fontSize = large ? '18px' : '';
  }

  function wireDangerZone() {
    var btn = document.getElementById('clearLocalDataBtn');
    if (btn) btn.addEventListener('click', function () {
      if (!confirm('Clear all locally cached data? This will log you out.')) return;
      localStorage.clear();
      sessionStorage.clear();
      layout.toast('Local data cleared. Logging out…', 'info');
      setTimeout(function () { window.location.href = 'login.html'; }, 800);
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

  Z.settings = { init: init };
})();
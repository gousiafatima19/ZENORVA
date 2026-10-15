/* ============================================================
   ZENVORA - Smart Cook Mode
   ------------------------------------------------------------
   Fully functional client-side cooking session:
     - Step timer (per-step duration from the recipe)
     - Separate check-in reminder (5 / 7 / 10 min)
     - Voice commands via Speech Recognition (with button fallback)
     - Spoken instructions via Speech Synthesis
     - Never auto-advances on timer completion - user confirms.
   ============================================================ */

(function () {
  'use strict';

  const Z = window.ZENVORA || {};
  const apiRef    = () => Z.api || null;
  const layoutRef = () => Z.layout || null;

  function toast(msg, type) {
    const l = layoutRef();
    if (l && typeof l.toast === 'function') l.toast(msg, type);
  }

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  let recipe = null;
  let stepIndex = 0;

  let stepTimer = null;
  let stepSecondsLeft = 0;
  let stepDeadline = 0;         // wall-clock deadline (ms)
  let stepTimerRunning = false;

  let reminderTimer = null;
  let reminderSecondsLeft = 0;
  let reminderIntervalMin = 7;

  let voiceOn = false;
  let recognition = null;
  let recognitionRestarting = false;

  // ---------------------------------------------------------
  // Demo recipe (clearly labelled)
  // ---------------------------------------------------------
  const DEMO_RECIPE = {
    id: 'veg-fried-rice',
    title: 'Vegetable Fried Rice',
    steps: [
      { text: 'Heat oil in a wok over high heat.',          seconds: 120 },
      { text: 'Add vegetables and stir-fry for 3 minutes.', seconds: 180 },
      { text: 'Add rice, soy sauce and mix well.',          seconds: 60  },
      { text: 'Cook for 5 more minutes and serve hot.',     seconds: 300 }
    ]
  };

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  async function init() {
    wireControls();

    const params = new URLSearchParams(location.search);
    const id = params.get('id');

    if (id) {
      await loadRecipe(id);
      startSession();
    } else {
      renderPicker();
    }
  }

  async function loadRecipe(id) {
    const api = apiRef();
    try {
      if (!api || !api.recipes || typeof api.recipes.get !== 'function') {
        throw new Error('api.recipes.get unavailable');
      }
      const r = await api.recipes.get(id);
      recipe = normalizeRecipe(r);
    } catch (err) {
      console.warn('[smart-cook] using demo:', err && err.message);
      recipe = DEMO_RECIPE;
      toast('Using demo recipe - API not reachable.', 'warn');
    }
  }

  function renderPicker() {
    const wrap = document.getElementById('cookRecipePicker');
    if (!wrap) return;

    const api = apiRef();
    let listPromise;

    try {
      if (api && api.recipes && typeof api.recipes.list === 'function') {
        listPromise = api.recipes.list();
      } else {
        listPromise = Promise.reject(new Error('api.recipes.list unavailable'));
      }
    } catch (e) {
      listPromise = Promise.reject(e);
    }

    listPromise
      .then((data) => {
        const arr = Array.isArray(data) ? data : ((data && data.results) || []);
        if (!arr.length) throw new Error('empty');

        wrap.innerHTML = arr.slice(0, 6).map((r) => `
          <a class="recipe-mini" href="smart-cook.html?id=${encodeURIComponent(r.id)}">
            <div class="recipe-mini-title">${escapeHtmlSafe(r.title || 'Recipe')}</div>
            <p class="recipe-mini-meta">
              ${r.total_time_min ? Number(r.total_time_min) + ' min' : ''}
            </p>
          </a>`).join('');
        if (window.lucide) window.lucide.createIcons();
      })
      .catch(() => {
        wrap.innerHTML = `
          <a class="recipe-mini" href="smart-cook.html?id=${encodeURIComponent(DEMO_RECIPE.id)}">
            <div class="recipe-mini-title">${escapeHtmlSafe(DEMO_RECIPE.title)}</div>
            <p class="recipe-mini-meta">demo recipe</p>
          </a>`;
        if (window.lucide) window.lucide.createIcons();
      });
  }

  function escapeHtmlSafe(s) {
    const l = layoutRef();
    if (l && typeof l.escapeHtml === 'function') return l.escapeHtml(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeRecipe(r) {
    if (!r) return DEMO_RECIPE;

    let rawSteps = r.instructions || r.steps || [];

    // Backend may return instructions as a single string
    if (typeof rawSteps === 'string') {
      rawSteps = rawSteps.split(/\r?\n+/).filter((s) => s.trim().length);
    }

    const steps = (rawSteps || []).map((s) => {
      if (typeof s === 'string') return { text: s, seconds: 60 };
      const secs = s.seconds || s.duration || s.time || (s.minutes ? s.minutes * 60 : 60);
      return { text: s.text || s.instruction || '', seconds: secs || 60 };
    }).filter((s) => s.text);

    return {
      id: r.id,
      title: r.title || 'Recipe',
      steps: steps.length ? steps : DEMO_RECIPE.steps
    };
  }

  // ---------------------------------------------------------
  // Session
  // ---------------------------------------------------------
  function startSession() {
    const setup   = document.getElementById('cookSetup');
    const session = document.getElementById('cookSession');
    if (setup)   setup.hidden = true;
    if (session) session.hidden = false;

    setText('cookRecipeTitle', recipe.title);
    setText('cookStepTotal', recipe.steps.length);

    stepIndex = 0;
    renderStep();
    speakCurrentStep();
    startReminders();
  }

  function renderStep() {
    const step = recipe.steps[stepIndex];
    if (!step) return;

    setText('cookStepNum', stepIndex + 1);
    setText('cookStepNow', stepIndex + 1);
    setText('cookStepText', step.text);

    const fill = document.getElementById('cookProgressFill');
    if (fill) {
      fill.style.width = `${((stepIndex + 1) / recipe.steps.length) * 100}%`;
    }

    stepSecondsLeft = step.seconds;
    stepTimerRunning = false;
    stopStepTimer();
    updateTimerDisplay();
    setText('cookTimerHint', 'Tap "I\'m Ready" to start the step timer.');
    if (window.lucide) window.lucide.createIcons();
  }

  function nextStep() {
    if (stepIndex < recipe.steps.length - 1) {
      stepIndex++;
      renderStep();
      speakCurrentStep();
    } else {
      finish();
    }
  }

  function prevStep() {
    if (stepIndex > 0) {
      stepIndex--;
      renderStep();
      speakCurrentStep();
    }
  }

  function finish() {
    stopStepTimer();
    stopReminders();
    toast('Cooking finished. Enjoy your meal!', 'success');
    speak('Cooking finished. Enjoy your meal.');
  }

  // ---------------------------------------------------------
  // Step timer (wall-clock based)
  // ---------------------------------------------------------
  function startStepTimer() {
    if (stepTimerRunning) return;
    stepTimerRunning = true;
    stepDeadline = Date.now() + (stepSecondsLeft * 1000);

    setText('cookTimerHint', 'Step timer running...');

    const readyBtn = document.getElementById('cookReadyBtn');
    const pauseBtn = document.getElementById('cookPauseBtn');
    if (readyBtn) readyBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = false;

    stepTimer = setInterval(() => {
      stepSecondsLeft = Math.max(0, Math.ceil((stepDeadline - Date.now()) / 1000));
      updateTimerDisplay();
      if (stepSecondsLeft <= 0) {
        stopStepTimer();
        onStepTimerDone();
      }
    }, 250);
  }

  function pauseStepTimer() {
    if (!stepTimerRunning) return;
    if (stepTimer) clearInterval(stepTimer);
    stepTimer = null;
    stepTimerRunning = false;

    // freeze remaining based on wall clock
    stepSecondsLeft = Math.max(0, Math.ceil((stepDeadline - Date.now()) / 1000));

    setText('cookTimerHint', 'Paused.');
    const readyBtn = document.getElementById('cookReadyBtn');
    const pauseBtn = document.getElementById('cookPauseBtn');
    if (readyBtn) readyBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
  }

  function stopStepTimer() {
    if (stepTimer) clearInterval(stepTimer);
    stepTimer = null;
    stepTimerRunning = false;

    const readyBtn = document.getElementById('cookReadyBtn');
    if (readyBtn) readyBtn.disabled = false;

    const pauseBtn = document.getElementById('cookPauseBtn');
    if (pauseBtn) pauseBtn.disabled = true;
  }

  function resetStepTimer() {
    stopStepTimer();
    stepSecondsLeft = recipe.steps[stepIndex].seconds;
    updateTimerDisplay();
    setText('cookTimerHint', 'Timer reset. Tap "I\'m Ready" to start.');
  }

  function updateTimerDisplay() {
    const total = Math.max(stepSecondsLeft, 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    setText('cookTimerDisplay',
      `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  }

  function onStepTimerDone() {
    toast('Step timer done - please check the food.', 'warn');
    speak('Step timer done. Please check the food.');
    // Do NOT auto-advance - the user must confirm.
    setText('cookTimerHint',
      'Step timer finished. Check the food, then mark this step done.');
  }

  // ---------------------------------------------------------
  // Check-in reminders (wall-clock based, independent of step timer)
  // ---------------------------------------------------------
  function startReminders() {
    stopReminders();
    reminderSecondsLeft = reminderIntervalMin * 60;
    updateReminderDisplay();

    reminderTimer = setInterval(() => {
      reminderSecondsLeft--;
      updateReminderDisplay();
      if (reminderSecondsLeft <= 0) {
        toast('Check in on your cooking.', 'info');
        speak('Check in on your cooking.');
        reminderSecondsLeft = reminderIntervalMin * 60;
        updateReminderDisplay();
      }
    }, 1000);
  }

  function stopReminders() {
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = null;
  }

  function updateReminderDisplay() {
    const total = Math.max(reminderSecondsLeft, 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    setText('cookReminderNext', `${m}:${String(s).padStart(2, '0')}`);
  }

  // ---------------------------------------------------------
  // Voice
  // ---------------------------------------------------------
  function speak(text) {
    if (!voiceOn) return;
    if (!('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(String(text));
      u.rate = 0.98;
      u.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* best effort */ }
  }

  function speakCurrentStep() {
    const step = recipe && recipe.steps[stepIndex];
    if (!step) return;
    speak(`Step ${stepIndex + 1}. ${step.text}`);
  }

  function toggleVoice() {
    voiceOn = !voiceOn;
    setText('cookVoiceLabel', voiceOn ? 'Voice commands: On' : 'Voice commands: Off');
    const btn = document.getElementById('cookVoiceToggle');
    if (btn) btn.classList.toggle('active', voiceOn);

    if (voiceOn) startRecognition();
    else stopRecognition();
  }

  function startRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setText('cookVoiceHint', 'Speech recognition is not supported in this browser.');
      voiceOn = false;
      setText('cookVoiceLabel', 'Voice commands: Off');
      return;
    }

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      const last = e.results[e.results.length - 1][0].transcript.toLowerCase();
      handleVoiceCommand(last);
    };

    recognition.onerror = (e) => {
      const err = e && e.error ? e.error : 'unknown';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        voiceOn = false;
        setText('cookVoiceLabel', 'Voice commands: Off');
        const btn = document.getElementById('cookVoiceToggle');
        if (btn) btn.classList.remove('active');
        setText('cookVoiceHint', 'Microphone access denied. Use the buttons.');
      } else {
        setText('cookVoiceHint',
          'Voice recognition error. You can still use the buttons.');
      }
    };

    recognition.onend = () => {
      // Auto-restart while the user has voice enabled
      if (voiceOn && !recognitionRestarting) {
        recognitionRestarting = true;
        setTimeout(() => {
          recognitionRestarting = false;
          if (voiceOn && recognition) {
            try { recognition.start(); } catch (e) { /* ignore */ }
          }
        }, 300);
      }
    };

    try { recognition.start(); } catch (e) { /* ignore */ }

    setText('cookVoiceHint', 'Listening for commands...');
  }

  function stopRecognition() {
    if (recognition) {
      try { recognition.stop(); } catch (e) { /* ignore */ }
      recognition = null;
    }
    setText('cookVoiceHint', 'Voice commands off. You can use buttons.');
  }

  function handleVoiceCommand(text) {
    if (!text) return;
    if (text.includes('repeat')) {
      speakCurrentStep();
      return;
    }
    if (text.includes('pause') || text.includes('stop')) {
      pauseStepTimer();
      return;
    }
    if (text.includes('resume')) {
      startStepTimer();
      return;
    }
    if (text.includes('next step')) {
      nextStep();
      return;
    }
    if (text.includes('time left') || text.includes('how much time')) {
      speak(`${Math.ceil(stepSecondsLeft)} seconds left.`);
      return;
    }
    if (text.includes('end cooking') || text.includes('finish cooking')) {
      finish();
      return;
    }
    if (text.includes("i'm done") || text.includes('done') || text.includes('finished')) {
      nextStep();
    }
  }

  // ---------------------------------------------------------
  // Wire controls
  // ---------------------------------------------------------
  function wireControls() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    on('cookReadyBtn', startStepTimer);
    on('cookPauseBtn', pauseStepTimer);
    on('cookResetTimerBtn', resetStepTimer);
    on('cookRepeatBtn', speakCurrentStep);
    on('cookSkipBtn', nextStep);
    on('cookPrevBtn', prevStep);
    on('cookCompleteStepBtn', () => { stopStepTimer(); nextStep(); });
    on('cookFinishBtn', finish);
    on('endCookBtn', () => {
      if (confirm('Finish cooking?')) {
        stopStepTimer();
        stopReminders();
        location.href = 'recipes.html';
      }
    });
    on('cookVoiceToggle', toggleVoice);

    const intervalSel = document.getElementById('cookReminderInterval');
    if (intervalSel) {
      intervalSel.addEventListener('change', (e) => {
        reminderIntervalMin = parseInt(e.target.value, 10) || 7;
        startReminders();
      });
    }

    // Re-sync both timers when the tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (stepTimerRunning) {
        stepSecondsLeft = Math.max(0, Math.ceil((stepDeadline - Date.now()) / 1000));
        updateTimerDisplay();
        if (stepSecondsLeft <= 0) {
          stopStepTimer();
          onStepTimerDone();
        }
      }
      updateReminderDisplay();
    });
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = (v == null ? '' : String(v));
  }

  // ---------------------------------------------------------
  // Exports
  // ---------------------------------------------------------
  (window.ZENVORA = window.ZENVORA || {}).smartCook = { init };
})();

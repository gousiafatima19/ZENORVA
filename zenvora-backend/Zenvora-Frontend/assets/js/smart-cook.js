/* ============================================================
   ZENVORA — Smart Cook Mode
   ------------------------------------------------------------
   Fully functional client-side cooking session:
     - Step timer (per-step duration from the recipe)
     - Separate check-in reminder (5 / 7 / 10 min)
     - Voice commands via Speech Recognition (with button fallback)
     - Spoken instructions via Speech Synthesis
     - Never auto-advances on timer completion — user confirms.
   ============================================================ */

(function () {
  'use strict';

  const { api, layout } = window.ZENVORA;

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  let recipe = null;
  let stepIndex = 0;

  let stepTimer = null;
  let stepSecondsLeft = 0;
  let stepTimerRunning = false;

  let reminderTimer = null;
  let reminderSecondsLeft = 0;
  let reminderIntervalMin = 7;

  let voiceOn = false;
  let recognition = null;

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
    try {
      const r = await api.recipes.get(id);
      recipe = normalizeRecipe(r);
    } catch (err) {
      console.warn('[smart-cook] using demo:', err?.message);
      recipe = DEMO_RECIPE;
      layout.toast('Using demo recipe — API not reachable.', 'warn');
    }
  }

  function renderPicker() {
    const wrap = document.getElementById('cookRecipePicker');
    if (!wrap) return;

    api.recipes.list()
      .then((data) => {
        const arr = Array.isArray(data) ? data : (data.results || []);
        if (!arr.length) throw new Error('empty');

        wrap.innerHTML = arr.slice(0, 6).map((r) => `
          <a class="recipe-mini" href="smart-cook.html?id=${encodeURIComponent(r.id)}">
            <div class="recipe-mini-title">${layout.escapeHtml(r.title || 'Recipe')}</div>
            <p class="recipe-mini-meta">
              ${r.total_time_min ? r.total_time_min + ' min' : ''}
            </p>
          </a>`).join('');
        if (window.lucide) lucide.createIcons();
      })
      .catch(() => {
        wrap.innerHTML = `
          <a class="recipe-mini" href="smart-cook.html?id=${DEMO_RECIPE.id}">
            <div class="recipe-mini-title">${DEMO_RECIPE.title}</div>
            <p class="recipe-mini-meta">demo recipe</p>
          </a>`;
        if (window.lucide) lucide.createIcons();
      });
  }

  function normalizeRecipe(r) {
    const steps = (r.instructions || r.steps || []).map((s) => {
      if (typeof s === 'string') return { text: s, seconds: 60 };
      return { text: s.text || '', seconds: s.seconds || 60 };
    });
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
    document.getElementById('cookSetup').hidden = true;
    document.getElementById('cookSession').hidden = false;

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
    updateTimerDisplay();
    setText('cookTimerHint', 'Tap "I\'m Ready" to start the step timer.');
    stopStepTimer();
    if (window.lucide) lucide.createIcons();
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
    layout.toast('Cooking finished. Enjoy your meal!', 'success');
    speak('Cooking finished. Enjoy your meal.');
  }

  // ---------------------------------------------------------
  // Step timer (independent from reminders)
  // ---------------------------------------------------------
  function startStepTimer() {
    if (stepTimerRunning) return;
    stepTimerRunning = true;

    setText('cookTimerHint', 'Step timer running…');
    document.getElementById('cookReadyBtn').disabled = true;
    document.getElementById('cookPauseBtn').disabled = false;

    stepTimer = setInterval(() => {
      stepSecondsLeft--;
      updateTimerDisplay();
      if (stepSecondsLeft <= 0) {
        stopStepTimer();
        onStepTimerDone();
      }
    }, 1000);
  }

  function pauseStepTimer() {
    if (!stepTimerRunning) return;
    clearInterval(stepTimer);
    stepTimer = null;
    stepTimerRunning = false;
    setText('cookTimerHint', 'Paused.');
    document.getElementById('cookReadyBtn').disabled = false;
    document.getElementById('cookPauseBtn').disabled = true;
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
    const m = Math.floor(Math.max(stepSecondsLeft, 0) / 60);
    const s = Math.max(stepSecondsLeft, 0) % 60;
    setText('cookTimerDisplay',
      `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  }

  function onStepTimerDone() {
    layout.toast('Step timer done — please check the food.', 'warn');
    speak('Step timer done. Please check the food.');
    // Do NOT auto-advance — the user must confirm.
    setText('cookTimerHint',
      'Step timer finished. Check the food, then mark this step done.');
  }

  // ---------------------------------------------------------
  // Check-in reminders (independent from step timer)
  // ---------------------------------------------------------
  function startReminders() {
    stopReminders();
    reminderSecondsLeft = reminderIntervalMin * 60;
    updateReminderDisplay();

    reminderTimer = setInterval(() => {
      reminderSecondsLeft--;
      updateReminderDisplay();
      if (reminderSecondsLeft <= 0) {
        layout.toast('Check in on your cooking.', 'info');
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
    const m = Math.floor(Math.max(reminderSecondsLeft, 0) / 60);
    const s = Math.max(reminderSecondsLeft, 0) % 60;
    setText('cookReminderNext',
      `${m}:${String(s).padStart(2, '0')}`);
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
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { /* best effort */ }
  }

  function speakCurrentStep() {
    const step = recipe.steps[stepIndex];
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

    recognition.onerror = () => {
      setText('cookVoiceHint',
        'Voice recognition error. You can still use the buttons.');
    };

    try { recognition.start(); } catch {}

    setText('cookVoiceHint', 'Listening for commands…');
  }

  function stopRecognition() {
    if (recognition) {
      try { recognition.stop(); } catch {}
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
    if (text.includes('pause')) {
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
    if (text.includes("i'm done") || text.includes('done') || text.includes('finished')) {
      nextStep();
    }
  }

  // ---------------------------------------------------------
  // Wire controls
  // ---------------------------------------------------------
  function wireControls() {
    document.getElementById('cookReadyBtn')
      ?.addEventListener('click', startStepTimer);
    document.getElementById('cookPauseBtn')
      ?.addEventListener('click', pauseStepTimer);
    document.getElementById('cookResetTimerBtn')
      ?.addEventListener('click', resetStepTimer);
    document.getElementById('cookRepeatBtn')
      ?.addEventListener('click', speakCurrentStep);
    document.getElementById('cookSkipBtn')
      ?.addEventListener('click', nextStep);
    document.getElementById('cookPrevBtn')
      ?.addEventListener('click', prevStep);
    document.getElementById('cookCompleteStepBtn')
      ?.addEventListener('click', () => { stopStepTimer(); nextStep(); });
    document.getElementById('cookFinishBtn')
      ?.addEventListener('click', finish);
    document.getElementById('endCookBtn')
      ?.addEventListener('click', () => {
        if (confirm('Finish cooking?')) {
          stopStepTimer();
          stopReminders();
          location.href = 'recipes.html';
        }
      });
    document.getElementById('cookVoiceToggle')
      ?.addEventListener('click', toggleVoice);

    document.getElementById('cookReminderInterval')
      ?.addEventListener('change', (e) => {
        reminderIntervalMin = parseInt(e.target.value, 10) || 7;
        startReminders();
      });

    // Keep the timer visually correct after tab-return
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && stepTimerRunning) updateTimerDisplay();
    });
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v ?? '';
  }

  // ---------------------------------------------------------
  // Exports
  // ---------------------------------------------------------
  window.ZENVORA.smartCook = { init };
})();
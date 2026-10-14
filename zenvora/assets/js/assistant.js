/* =========================================================
   ZENVORA — Ask ZENVORA assistant
   - Tries POST /api/assistant/ask/ first (Person 2's endpoint)
   - Falls back to a local smart responder if the API is down
   - Voice input via Speech Recognition
   - Voice output via Speech Synthesis
   ========================================================= */

(function () {
  'use strict';

  var Z = window.ZENVORA;
  var chatLog, chatForm, chatInput, micBtn, micStatus;
  var recognition = null;
  var listening = false;

  /* ---------- LOCAL FALLBACK RESPONDER ---------- */
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr), now = new Date();
    if (isNaN(d)) return null;
    d.setHours(0,0,0,0); now.setHours(0,0,0,0);
    return Math.round((d - now) / 86400000);
  }

  function localAnswer(question, pantry, recipes) {
    var q = (question || '').toLowerCase();
    pantry = pantry || [];
    recipes = recipes || [];

    /* Cook / recipe */
    if (q.indexOf('cook') !== -1 || q.indexOf('recipe') !== -1 || q.indexOf('meal') !== -1) {
      if (!pantry.length) {
        return "Your pantry looks empty. Add a few ingredients and I'll suggest recipes you can make! 🥕";
      }
      var names = pantry.map(function (p) { return (p.name || '').toLowerCase(); });
      var scored = recipes.map(function (r) {
        var ings = r.ingredients || [];
        var ingNames = ings.map(function (i) {
          return typeof i === 'string' ? i : (i.name || '');
        });
        var have = 0;
        ingNames.forEach(function (n) {
          var k = n.toLowerCase();
          if (names.some(function (p) { return p.indexOf(k) !== -1 || k.indexOf(p) !== -1; })) have++;
        });
        return {
          r: r,
          pct: ingNames.length ? Math.round((have / ingNames.length) * 100) : 0
        };
      }).sort(function (a, b) { return b.pct - a.pct; });

      var top = scored.slice(0, 3);
      var lines = top.map(function (s) {
        return "• " + (s.r.emoji || '🍲') + " " + (s.r.title || s.r.name) + " — " + s.pct + "% match";
      });
      return "Based on your pantry (" + pantry.length + " items), here are my top suggestions:\n\n"
        + lines.join("\n") + "\n\nOpen the Recipes page for full steps.";
    }

    /* Expiring */
    if (q.indexOf('expir') !== -1 || q.indexOf('going bad') !== -1 || q.indexOf('soon') !== -1) {
      if (!pantry.length) return "Your pantry is empty — nothing to check. Add ingredients to track expiry dates.";
      var soon = pantry
        .map(function (i) { return { i: i, d: daysUntil(i.expiry_date || i.expiry) }; })
        .filter(function (x) { return x.d != null && x.d <= 3; })
        .sort(function (a, b) { return a.d - b.d; });
      if (!soon.length) return "Good news — nothing in your pantry is expiring in the next 3 days. 🌿";
      var lines2 = soon.map(function (x) {
        var when = x.d < 0 ? 'already expired' : (x.d === 0 ? 'expires today' : 'expires in ' + x.d + ' day' + (x.d > 1 ? 's' : ''));
        return "• " + x.i.name + " — " + when;
      });
      return "Heads up — these need attention:\n\n" + lines2.join("\n") + "\n\nTry using them in a recipe today to avoid waste.";
    }

    /* Waste */
    if (q.indexOf('waste') !== -1 || q.indexOf('reduce') !== -1) {
      return "A few easy ways to reduce food waste:\n\n"
        + "1. Use older items first — check your \"Expiring Soon\" list.\n"
        + "2. Plan meals around what you already have.\n"
        + "3. Freeze leftovers instead of letting them spoil.\n"
        + "4. Donate surplus to a shelter through ShelterConnect.\n"
        + "5. Compost what truly can't be used.\n\nEvery small habit counts. 🌱";
    }

    /* Vegan / vegetarian */
    if (q.indexOf('vegan') !== -1 || q.indexOf('vegetarian') !== -1) {
      var diet = q.indexOf('vegan') !== -1 ? 'vegan' : 'vegetarian';
      var matches = recipes.filter(function (r) {
        var tags = r.diet_tags || r.tags || [];
        return tags.indexOf(diet) !== -1;
      });
      if (!matches.length) return "I couldn't find any " + diet + " recipes right now.";
      var lines3 = matches.slice(0, 4).map(function (r) {
        return "• " + (r.emoji || '🍲') + " " + (r.title || r.name);
      });
      return "Here are some " + diet + " recipes:\n\n" + lines3.join("\n") + "\n\nOpen the Recipes page for full steps.";
    }

    /* Quick */
    if (q.indexOf('quick') !== -1 || q.indexOf('fast') !== -1 || q.indexOf('minute') !== -1) {
      var quick = recipes.slice().sort(function (a, b) {
        return (a.prep_time || a.total_time_min || 99) - (b.prep_time || b.total_time_min || 99);
      }).slice(0, 3);
      var lines4 = quick.map(function (r) {
        var t = r.prep_time || r.total_time_min || '—';
        return "• " + (r.emoji || '🍲') + " " + (r.title || r.name) + " — " + t + " min";
      });
      return "Quickest recipes:\n\n" + lines4.join("\n");
    }

    /* Greeting */
    if (q.indexOf('hello') !== -1 || q.indexOf('hi') !== -1 || q.indexOf('hey') !== -1) {
      return "Hi! 👋 I'm ZENVORA — your food assistant. Ask me what to cook, what's expiring, or how to reduce food waste.";
    }

    return "I'm not sure about that one yet. Try asking:\n"
      + "• \"What can I cook?\"\n"
      + "• \"What's expiring soon?\"\n"
      + "• \"Show me a vegan recipe\"\n"
      + "• \"How do I reduce food waste?\"";
  }

  /* ---------- CHAT UI ---------- */
  function addMessage(text, who) {
    var wrap = document.createElement('div');
    wrap.className = 'chat-msg ' + who;
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = String(text).replace(/\n/g, '<br>');
    wrap.appendChild(bubble);
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function addTyping() {
    var wrap = document.createElement('div');
    wrap.className = 'chat-msg bot';
    wrap.id = 'typingIndicator';
    wrap.innerHTML = '<div class="bubble">…thinking</div>';
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function removeTyping() {
    var el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  /* ---------- SEND ---------- */
  async function sendQuestion(question) {
    question = (question || '').trim();
    if (!question) return;

    addMessage(question, 'user');
    addTyping();

    /* Gather pantry + recipes for fallback context */
    var pantry = [];
    var recipes = [];
    try {
      var p = await Z.api.pantry.list();
      pantry = Array.isArray(p) ? p : (p.results || []);
    } catch (e) {}

    try {
      var r = await Z.api.recipes.list();
      recipes = Array.isArray(r) ? r : (r.results || []);
    } catch (e) {}

    /* Try Person 2's assistant endpoint */
    var answer = null;
    try {
      var res = await Z.api.ask(question);
      /* Accept several possible shapes */
      answer = res && (res.answer || res.reply || res.response || res.text);
    } catch (err) {
      console.warn('[assistant] API failed, using local:', err && err.message);
    }

    /* Fallback if API didn't return anything usable */
    if (!answer) {
      answer = localAnswer(question, pantry, recipes);
    }

    removeTyping();
    addMessage(answer, 'bot');
    speak(answer);
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- VOICE INPUT ---------- */
  function setupSpeech() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (micBtn) micBtn.disabled = true;
      if (micStatus) micStatus.textContent = 'Voice input not supported in this browser.';
      return;
    }
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function (e) {
      var txt = e.results[0][0].transcript;
      if (micStatus) micStatus.textContent = 'Heard: ' + txt;
      sendQuestion(txt);
    };
    recognition.onerror = function (e) {
      if (micStatus) micStatus.textContent = 'Mic error: ' + e.error;
      listening = false;
    };
    recognition.onend = function () {
      listening = false;
      if (micStatus) micStatus.textContent = 'Mic off';
    };
  }

  function toggleMic() {
    if (!recognition) return;
    if (listening) {
      try { recognition.stop(); } catch (e) {}
      listening = false;
      if (micStatus) micStatus.textContent = 'Mic off';
    } else {
      try { recognition.start(); } catch (e) {}
      listening = true;
      if (micStatus) micStatus.textContent = 'Listening…';
    }
  }

  /* ---------- VOICE OUTPUT ---------- */
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    var short = String(text).split('\n')[0].substring(0, 180);
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(short);
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  }

  /* ---------- INIT ---------- */
  function init() {
    chatLog   = document.getElementById('chatLog');
    chatForm  = document.getElementById('chatForm');
    chatInput = document.getElementById('chatInput');
    micBtn    = document.getElementById('micBtn');
    micStatus = document.getElementById('micStatus');

    if (!chatForm) return;

    setupSpeech();

    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = chatInput.value.trim();
      if (!val) return;
      chatInput.value = '';
      sendQuestion(val);
    });

    if (micBtn) micBtn.addEventListener('click', toggleMic);

    var chips = document.querySelectorAll('.chip-btn');
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function () {
        sendQuestion(this.getAttribute('data-q'));
      });
    }

    if (window.lucide) lucide.createIcons();
  }

  Z.assistant = { init: init };
})();
/* =========================================================
   ZENVORA — Auth module
   Attaches to window.ZENVORA.auth
   Provides login, register, guards, and initLoginPage()
   ========================================================= */

(function () {
  var Z = window.ZENVORA = window.ZENVORA || {};

  var auth = {

    /* ---- Guards ---- */
    isAuthenticated: function () {
      return !!Z.api.getToken();
    },

    requireAuth: function () {
      if (!this.isAuthenticated()) {
        var here = location.pathname.split("/").pop() || "dashboard.html";
        sessionStorage.setItem(Z.config.SESSION_KEY, here);
        window.location.href = "login.html";
        return false;
      }
      return true;
    },

    /* If already signed in → send them to the app dashboard (not the landing page) */
    redirectIfAuthenticated: function () {
      if (this.isAuthenticated()) {
        window.location.href = "dashboard.html";
        return true;
      }
      return false;
    },

    logout: function () {
      Z.api.clearSession();
      window.location.href = "login.html";
    },

    /* ---- Real login ---- */
    login: function (username, password) {
      return Z.api.post("/api/auth/login/",
        { username: username, password: password },
        { auth: false }
      ).then(function (res) {
        if (res && res.token) Z.api.saveSession(res.token, res.user || {});
        return res;
      });
    },

    /* ---- Real register ---- */
    register: function (username, password, email) {
      return Z.api.post("/api/auth/register/",
        { username: username, password: password, email: email || "" },
        { auth: false }
      ).then(function (res) {
        if (res && res.token) Z.api.saveSession(res.token, res.user || {});
        return res;
      });
    },

    /* =========================================================
       Helpers used by layout.js
       ========================================================= */
    getUser: function () {
      return Z.api.getUser();
    },

    initialsFrom: function (user) {
      user = user || this.getUser();
      var name = (user && (user.username || user.email || user.name)) || "ZK";
      var parts = String(name).trim().split(/[\s._-]+/).filter(Boolean);
      if (!parts.length) return "ZK";
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    },

    escapeHtml: function (s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },

    wireLogoutButtons: function () {
      var links = document.querySelectorAll("#logoutLink, #logoutLinkTop, [data-action='logout']");
      for (var i = 0; i < links.length; i++) {
        links[i].addEventListener("click", function (e) {
          e.preventDefault();
          Z.auth.logout();
        });
      }
    },

    /* =========================================================
       initLoginPage()
       Wires up the login form on login.html
       ========================================================= */
    initLoginPage: function () {
      var form    = document.getElementById("loginForm");
      var emailIn = document.getElementById("email");
      var passIn  = document.getElementById("password");
      var btn     = document.getElementById("loginBtn");
      var alertEl = document.getElementById("authAlert");
      var toggle  = document.getElementById("togglePassword");
      var rememberEl = document.getElementById("remember");

      if (!form || !emailIn || !passIn || !btn) {
        console.warn("initLoginPage: missing elements");
        return;
      }

      /* Restore remembered email */
      try {
        var saved = localStorage.getItem("zenvora_remembered_email");
        if (saved && rememberEl) {
          emailIn.value = saved;
          rememberEl.checked = true;
        }
      } catch (e) {}

      /* Show / hide password toggle */
      if (toggle) {
        toggle.addEventListener("click", function () {
          var isPwd = passIn.type === "password";
          passIn.type = isPwd ? "text" : "password";
          toggle.textContent = isPwd ? "Hide" : "Show";
          toggle.setAttribute("aria-pressed", String(isPwd));
        });
      }

      /* Submit handler */
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submit();
      });

      function showAlert(msg, kind) {
        if (!alertEl) return;
        alertEl.textContent = msg;
        alertEl.className = "alert" + (kind === "success" ? " alert-success" : " alert-error");
        alertEl.hidden = false;
      }

      function hideAlert() {
        if (alertEl) alertEl.hidden = true;
      }

      function setLoading(on) {
        btn.disabled = on;
        var label = btn.querySelector(".btn-label");
        var spin  = btn.querySelector(".btn-spinner");
        if (label) label.textContent = on ? "Signing in…" : "Sign In";
        if (spin)  spin.hidden = !on;
      }

      function submit() {
        hideAlert();

        var username = (emailIn.value || "").trim();
        var password = passIn.value || "";

        if (!username) { showAlert("Please enter your username."); emailIn.focus(); return; }
        if (!password) { showAlert("Please enter your password."); passIn.focus(); return; }

        /* Remember username if checked */
        try {
          if (rememberEl && rememberEl.checked) {
            localStorage.setItem("zenvora_remembered_email", username);
          } else {
            localStorage.removeItem("zenvora_remembered_email");
          }
        } catch (e) {}

        setLoading(true);

        auth.login(username, password)
          .then(function () {
            /* After successful login → go to dashboard.html (not index.html) */
            var next = sessionStorage.getItem(Z.config.SESSION_KEY) || "dashboard.html";
            sessionStorage.removeItem(Z.config.SESSION_KEY);
            window.location.href = next;
          })
          .catch(function (err) {
            console.error(err);
            var msg = err.message || "Login failed.";
            if (msg.indexOf("Invalid") !== -1 || msg.indexOf("credentials") !== -1) {
              msg = "Invalid credentials. Try demo / demo1234.";
            } else if (msg.indexOf("Cannot reach") !== -1) {
              msg = err.message + " The backend may take up to 30 seconds to wake up.";
            }
            showAlert(msg, "error");
            setLoading(false);
          });
      }
    },

    /* =========================================================
       initRegisterPage()  — for register.html
       ========================================================= */
    initRegisterPage: function () {
      var form    = document.getElementById("registerForm") || document.querySelector("form");
      var userIn  = document.getElementById("username") || document.getElementById("email");
      var emailIn = document.getElementById("email");
      var passIn  = document.getElementById("password");
      var btn     = document.querySelector('button[type="submit"]');
      var alertEl = document.getElementById("authAlert");

      if (!form || !userIn || !passIn) return;

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var username = (userIn.value || "").trim();
        var email    = emailIn ? (emailIn.value || "").trim() : "";
        var password = passIn.value || "";

        if (!username || !password) return;

        if (btn) { btn.disabled = true; }
        auth.register(username, password, email)
          .then(function () {
            window.location.href = "dashboard.html";
          })
          .catch(function (err) {
            if (alertEl) {
              alertEl.textContent = err.message || "Registration failed.";
              alertEl.hidden = false;
            }
            if (btn) btn.disabled = false;
          });
      });
    }
  };

  Z.auth = auth;
})();
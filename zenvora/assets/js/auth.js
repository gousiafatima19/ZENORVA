/* =========================================================
   ZENVORA — Auth module
   Attaches to window.ZENVORA.auth
   ========================================================= */

(function () {
  var Z = window.ZENVORA = window.ZENVORA || {};

  var auth = {

    isAuthenticated: function () { return !!Z.api.getToken(); },

    requireAuth: function () {
      if (!this.isAuthenticated()) {
        var here = location.pathname.split("/").pop() || "dashboard.html";
        sessionStorage.setItem(Z.config.SESSION_KEY, here);
        window.location.href = "login.html";
        return false;
      }
      return true;
    },

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

    login: function (username, password) {
      return Z.api.post("/api/auth/login/",
        { username: username, password: password },
        { auth: false }
      ).then(function (res) {
        if (res && res.token) Z.api.saveSession(res.token, res.user || {});
        return res;
      });
    },

    register: function (username, password, email) {
      return Z.api.post("/api/auth/register/",
        { username: username, password: password, email: email || "" },
        { auth: false }
      ).then(function (res) {
        if (res && res.token) Z.api.saveSession(res.token, res.user || {});
        return res;
      });
    },

    getUser: function () { return Z.api.getUser(); },

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

    /* Shared show/hide password wiring */
    _wirePasswordToggle: function (toggle, input) {
      if (!toggle || !input) return;
      toggle.addEventListener("click", function () {
        var isPwd = input.type === "password";
        input.type = isPwd ? "text" : "password";
        toggle.textContent = isPwd ? "Hide" : "Show";
        toggle.setAttribute("aria-pressed", String(isPwd));
      });
    },

    /* =========================================================
       Login page
       ========================================================= */
    initLoginPage: function () {
      var form    = document.getElementById("loginForm");
      var userIn  = document.getElementById("username") || document.getElementById("email");
      var passIn  = document.getElementById("password");
      var btn     = document.getElementById("loginBtn");
      var alertEl = document.getElementById("authAlert");
      var toggle  = document.getElementById("togglePassword");
      var rememberEl = document.getElementById("remember");

      if (!form || !userIn || !passIn || !btn) {
        console.warn("initLoginPage: missing elements");
        return;
      }

      this._wirePasswordToggle(toggle, passIn);

      try {
        var saved = localStorage.getItem("zenvora_remembered_username");
        if (saved && rememberEl) {
          userIn.value = saved;
          rememberEl.checked = true;
        }
      } catch (e) {}

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
      function hideAlert() { if (alertEl) alertEl.hidden = true; }

      function setLoading(on) {
        btn.disabled = on;
        var label = btn.querySelector(".btn-label");
        var spin  = btn.querySelector(".btn-spinner");
        if (label) label.textContent = on ? "Signing in..." : "Sign In";
        if (spin)  spin.hidden = !on;
      }

      function submit() {
        hideAlert();
        var username = (userIn.value || "").trim();
        var password = passIn.value || "";

        if (!username) { showAlert("Please enter your username."); userIn.focus(); return; }
        if (!password) { showAlert("Please enter your password."); passIn.focus(); return; }

        try {
          if (rememberEl && rememberEl.checked) {
            localStorage.setItem("zenvora_remembered_username", username);
          } else {
            localStorage.removeItem("zenvora_remembered_username");
          }
        } catch (e) {}

        setLoading(true);

        auth.login(username, password)
          .then(function () {
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
       Register page
       ========================================================= */
    initRegisterPage: function () {
      var form      = document.getElementById("registerForm");
      var nameIn    = document.getElementById("name");
      var emailIn   = document.getElementById("email");
      var passIn    = document.getElementById("password");
      var confirmIn = document.getElementById("confirm");
      var termsIn   = document.getElementById("terms");
      var btn       = document.getElementById("registerBtn");
      var alertEl   = document.getElementById("authAlert");
      var toggle    = document.getElementById("togglePassword");

      if (!form) {
        console.warn("initRegisterPage: no registerForm");
        return;
      }

      this._wirePasswordToggle(toggle, passIn);

      form.addEventListener("submit", function (e) {
        e.preventDefault();

        if (alertEl) alertEl.hidden = true;
        document.querySelectorAll(".error-msg").forEach(function (el) { el.textContent = ""; });

        var name     = (nameIn ? nameIn.value : "").trim();
        var email    = (emailIn ? emailIn.value : "").trim();
        var password = passIn ? passIn.value : "";
        var confirm  = confirmIn ? confirmIn.value : "";

        if (!name) { return showFieldError("name", "Please enter your full name.", nameIn); }
        if (!email) { return showFieldError("email", "Please enter your email address.", emailIn); }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return showFieldError("email", "Please enter a valid email address.", emailIn);
        }
        if (!password) { return showFieldError("password", "Please choose a password.", passIn); }
        if (password.length < 8) {
          return showFieldError("password", "Password must be at least 8 characters.", passIn);
        }
        if (confirmIn && password !== confirm) {
          return showFieldError("confirm", "Passwords do not match.", confirmIn);
        }
        if (termsIn && !termsIn.checked) {
          return showAlert("Please accept the terms to continue.", "error");
        }

        setLoading(true);

        var username = email ? email.split("@")[0] : name.toLowerCase().replace(/\s+/g, "_");

        auth.register(username, password, email)
          .then(function () {
            window.location.href = "dashboard.html";
          })
          .catch(function (err) {
            console.error(err);
            showAlert(err.message || "Registration failed. Please try again.", "error");
            setLoading(false);
          });
      });

      function showAlert(msg, kind) {
        if (!alertEl) { alert(msg); return; }
        alertEl.textContent = msg;
        alertEl.className = "alert" + (kind === "success" ? " alert-success" : " alert-error");
        alertEl.hidden = false;
      }

      function showFieldError(field, msg, input) {
        var el = document.querySelector('.error-msg[data-error="' + field + '"]');
        if (el) el.textContent = msg;
        if (input) input.focus();
      }

      function setLoading(on) {
        if (!btn) return;
        btn.disabled = on;
        var label = btn.querySelector(".btn-label");
        var spin  = btn.querySelector(".btn-spinner");
        if (label) label.textContent = on ? "Creating account..." : "Create Account";
        if (spin)  spin.hidden = !on;
      }
    }
  };

  Z.auth = auth;
})();

/* =========================================================
   ZENVORA — Global config
   ========================================================= */

window.ZENVORA = window.ZENVORA || {};

window.ZENVORA.config = {
  API_BASE: "",
  TOKEN_KEY: "zenvora_token",
  USER_KEY: "zenvora_user",
  SESSION_KEY: "zenvora_after_login",

  /* Storage keys used by layout.js */
  storage: {
    sidebar: "zenvora_sidebar_collapsed"
  },

  /* Timeouts */
  timeouts: {
    toast: 3200
  },

  /* Feature flags */
  features: {
    demoFallback: {
      recipes: true,
      shelters: true,
      shops: true
    }
  }
};

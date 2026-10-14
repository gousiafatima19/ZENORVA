/* ============================================================
   ZENVORA — Shared Layout (sidebar, topbar, avatar, toasts)
   ============================================================ */

(function () {
  'use strict';

  const { api, config, auth } = window.ZENVORA;

  // ---------------------------------------------------------
  // Sidebar collapse + mobile drawer
  // ---------------------------------------------------------
  function initSidebar() {
    const app     = document.getElementById('appShell');
    const toggle  = document.getElementById('sidebarCollapse');
    const menuBtn = document.getElementById('mobileMenuBtn');
    const overlay = document.getElementById('sidebarOverlay');
    if (!app) return;

    // Desktop collapse preference
    const collapsed = localStorage.getItem(config.storage.sidebar) === '1';
    if (collapsed) app.classList.add('sidebar-collapsed');

    toggle?.addEventListener('click', () => {
      const isCollapsed = app.classList.toggle('sidebar-collapsed');
      localStorage.setItem(config.storage.sidebar, isCollapsed ? '1' : '0');
    });

    // Mobile drawer
    const openDrawer = () => {
      app.classList.add('sidebar-open');
      if (overlay) overlay.hidden = false;
    };
    const closeDrawer = () => {
      app.classList.remove('sidebar-open');
      if (overlay) overlay.hidden = true;
    };

    menuBtn?.addEventListener('click', () => {
      app.classList.contains('sidebar-open') ? closeDrawer() : openDrawer();
    });
    overlay?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });

    // Close drawer when a nav link is clicked (mobile)
    document.querySelectorAll('.sidebar .nav-item').forEach((a) => {
      a.addEventListener('click', () => {
        if (window.innerWidth <= 1024) closeDrawer();
      });
    });

    // Reopen/close logic on resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) closeDrawer();
    });
  }

  // ---------------------------------------------------------
  // Avatar dropdown
  // ---------------------------------------------------------
  function initAvatarMenu() {
    const btn      = document.getElementById('avatarBtn');
    const dropdown = document.getElementById('avatarDropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !dropdown.hidden;
      dropdown.hidden = open;
      btn.setAttribute('aria-expanded', String(!open));
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== btn) {
        dropdown.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdown.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------------------------------------------------------
  // Avatar initials
  // ---------------------------------------------------------
  function initAvatarInitials() {
    const user = auth.getUser();
    const initials = auth.initialsFrom(user);
    const el = document.getElementById('avatarInitials');
    if (el) el.textContent = initials;
  }

  // ---------------------------------------------------------
  // Notification bell → navigate to notifications page
  // ---------------------------------------------------------
  function initNotifBell() {
    const bell = document.getElementById('notifBell');
    if (!bell) return;
    bell.addEventListener('click', () => {
      location.href = 'notifications.html';
    });
  }

  // ---------------------------------------------------------
  // Connection banner
  // ---------------------------------------------------------
  async function initConnectionBanner() {
    const banner = document.getElementById('connectionBanner');
    if (!banner) return;
    const ok = await api.ping();
    if (!ok) {
      banner.hidden = false;
      if (window.lucide) lucide.createIcons();
    } else {
      banner.hidden = true;
    }
  }

  // ---------------------------------------------------------
  // Toast helper (globally available)
  // ---------------------------------------------------------
  function ensureToastStack() {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, kind = 'info', duration = config.timeouts.toast) {
    const stack = ensureToastStack();
    const icons = {
      success: 'check-circle-2',
      error:   'alert-circle',
      warn:    'alert-triangle',
      info:    'info'
    };
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.innerHTML = `<i data-lucide="${icons[kind] || 'info'}"></i><div>${auth.escapeHtml(message)}</div>`;
    stack.appendChild(el);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 220);
    }, duration);
  }

  // ---------------------------------------------------------
  // Utilities used by other modules
  // ---------------------------------------------------------
  function setActiveNav() {
    const path = location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.sidebar .nav-item').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      if (href === path) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  function formatDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return '';
    const secs = Math.floor((Date.now() - then) / 1000);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - today) / (1000 * 60 * 60 * 24));
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function debounce(fn, ms = 250) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ---------------------------------------------------------
  // Public init
  // ---------------------------------------------------------
  function init() {
    setActiveNav();
    initSidebar();
    initAvatarMenu();
    initAvatarInitials();
    initNotifBell();
    auth.wireLogoutButtons();
    initConnectionBanner();
    if (window.lucide) lucide.createIcons();
  }

  window.ZENVORA.layout = {
    init,
    toast,
    setActiveNav,
    formatDate,
    timeAgo,
    daysUntil,
    escapeHtml,
    debounce
  };
})();
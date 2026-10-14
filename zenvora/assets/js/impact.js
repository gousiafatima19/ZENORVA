/* ============================================================
   ZENVORA — Impact Dashboard (Chart.js)
   ============================================================ */

(function () {
  'use strict';

  var Z = window.ZENVORA;
  var api = Z.api;
  var layout = Z.layout;

  var trendChart, breakdownChart, pantryChart;

  var DEMO = {
    mealsSaved: 24,
    foodDelivered: 8,
    availableReserved: 3,
    estimatedSavings: '₹ 1,240',
    trend: [1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7],
    breakdown: { delivered: 8, reserved: 2, available: 1 },
    pantryUsed: [3, 5, 2, 6, 4, 7]
  };

  function init() {
    load();
  }

  function load() {
    var p = api.impact ? api.impact() : Promise.reject(new Error("no impact endpoint"));

    Promise.resolve(p).then(function (data) {
      if (!data) throw new Error("empty");
      var normalized = normalizeImpact(data);
      renderStats(normalized);
      renderCharts(normalized);
    }).catch(function (err) {
      console.warn('[impact] using demo:', err && err.message);
      renderStats(DEMO);
      renderCharts(DEMO);
      var note = document.getElementById('impactDemoNote');
      if (note) note.hidden = false;
    });
  }

    function normalizeImpact(d) {
    d = d || {};

    /* The backend returns nested: verified.delivered.{donations_count, quantity_kg, estimated_meals, estimated_savings_inr} */
    var verified = d.verified || {};
    var demo     = d.demo     || {};
    var verifiedDelivered = verified.delivered || {};
    var demoDelivered     = demo.delivered     || {};
    var inProgress        = d.in_progress || {};

    /* Prefer real verified data; fall back to demo data only if verified is empty */
    var realDonations   = Number(verifiedDelivered.donations_count || 0);
    var realMeals       = Number(verifiedDelivered.estimated_meals || 0);
    var realSavings     = Number(verifiedDelivered.estimated_savings_inr || 0);

    var demoDonations   = Number(demoDelivered.donations_count || 0);
    var demoMeals       = Number(demoDelivered.estimated_meals || 0);
    var demoSavings     = Number(demoDelivered.estimated_savings_inr || 0);

    var usingDemo = (realDonations === 0 && demoDonations > 0);

    var delivered   = usingDemo ? demoDonations : realDonations;
    var meals       = usingDemo ? demoMeals     : realMeals;
    var savings     = usingDemo ? demoSavings   : realSavings;
    var inProg      = Number(inProgress.donations_count || 0);

    return {
      mealsSaved:        meals,
      foodDelivered:     delivered,
      availableReserved: inProg,
      estimatedSavings:  savings > 0 ? ('₹ ' + savings) : '—',
      trend:             d.trend     || DEMO.trend,
      breakdown:         d.breakdown || {
                           delivered: delivered,
                           reserved:  0,
                           available: inProg
                         },
      pantryUsed:        d.pantry_used || d.pantryUsed || DEMO.pantryUsed,
      isDemo:            usingDemo,
      sheltersSupported: Number(d.shelters_supported || 0)
    };
  }

  function renderStats(d) {
    setText('impactMeals',     d.mealsSaved);
    setText('impactDelivered', d.foodDelivered);
    setText('impactAvailable', d.availableReserved);
    setText('impactSavings',   d.estimatedSavings);
  }

  function renderCharts(d) {
    if (typeof Chart === 'undefined') return;

    /* Trend line */
    var trendCanvas = document.getElementById('impactTrendChart');
    if (trendCanvas) {
      if (trendChart) trendChart.destroy();
      var labels = [];
      for (var i = 0; i < (d.trend || []).length; i++) labels.push('W' + (i + 1));

      trendChart = new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Donations',
            data: d.trend || [],
            borderColor: '#123C2F',
            backgroundColor: 'rgba(18, 60, 47, 0.12)',
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#D4AF57',
            pointBorderColor: '#123C2F',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    /* Breakdown doughnut */
    var bCanvas = document.getElementById('impactBreakdownChart');
    if (bCanvas) {
      if (breakdownChart) breakdownChart.destroy();
      var b = d.breakdown || { delivered: 0, reserved: 0, available: 0 };
      breakdownChart = new Chart(bCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Delivered', 'Reserved', 'Available'],
          datasets: [{
            data: [b.delivered || 0, b.reserved || 0, b.available || 0],
            backgroundColor: ['#2E7D5B', '#C98A2A', '#2E5A7D'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 14, boxWidth: 12 } }
          }
        }
      });
    }

    /* Pantry usage bar */
    var pCanvas = document.getElementById('impactPantryChart');
    if (pCanvas) {
      if (pantryChart) pantryChart.destroy();
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      pantryChart = new Chart(pCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: months,
          datasets: [{
            label: 'Items used before expiry',
            data: d.pantryUsed || [0, 0, 0, 0, 0, 0],
            backgroundColor: '#D4AF57',
            borderRadius: 8,
            maxBarThickness: 34
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }
  }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v == null ? '—' : String(v);
  }

  Z.impact = { init: init };
})();
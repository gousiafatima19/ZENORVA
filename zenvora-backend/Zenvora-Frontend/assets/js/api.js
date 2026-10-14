/* =========================================================
   ZENVORA — API helper
   Provides: .get .post .patch .del + resources
   ========================================================= */

(function () {
  var Z = window.ZENVORA = window.ZENVORA || {};
  var config = Z.config || {
    API_BASE: "https://zenorva.onrender.com",
    TOKEN_KEY: "zenvora_token",
    USER_KEY: "zenvora_user"
  };

  function getToken() { return localStorage.getItem(config.TOKEN_KEY) || ""; }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(config.USER_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveSession(token, user) {
    localStorage.setItem(config.TOKEN_KEY, token || "");
    localStorage.setItem(config.USER_KEY, JSON.stringify(user || {}));
  }
  function clearSession() {
    localStorage.removeItem(config.TOKEN_KEY);
    localStorage.removeItem(config.USER_KEY);
  }

  /* Core fetch wrapper */
  function request(path, opts) {
    opts = opts || {};
    var method = opts.method || "GET";
    var body   = opts.body   || null;
    var auth   = opts.auth !== false;

    var headers = { "Content-Type": "application/json" };
    if (auth && getToken()) headers["Authorization"] = "Token " + getToken();

    return fetch(config.API_BASE + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : null
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }

        if (!res.ok) {
          if (res.status === 401 && auth) {
            clearSession();
            throw new Error("Session expired — please sign in again.");
          }
          var msg = (data && (data.error || data.detail || data.message)) || res.statusText || ("HTTP " + res.status);
          console.error("API error", res.status, path, data);
          throw new Error(msg);
        }
        return data;
      });
    }).catch(function (e) {
      if (e.message && e.message.indexOf("Failed to fetch") !== -1) {
        throw new Error("Cannot reach backend — it may be waking up. Try again in 30 seconds.");
      }
      throw e;
    });
  }

  /* Field mapping: frontend → backend */
  function toBackend(item) {
    if (!item) return item;
    var out = {};
    if (item.name != null)              out.name = item.name;
    if (item.category != null)          out.category = item.category;
    if (item.quantity != null)          out.quantity = item.quantity;
    if (item.unit != null)              out.unit = item.unit;
    if (item.notes != null)             out.notes = item.notes;
    if (item.expiry != null)            out.expiry_date = item.expiry;
    if (item.purchaseDate != null)      out.purchase_date = item.purchaseDate;
    if (item.lowStockThreshold != null) out.low_stock_threshold = item.lowStockThreshold;
    return out;
  }

  function fromBackend(i) {
    if (!i) return i;
    return {
      id:                i.id,
      name:              i.name,
      category:          i.category,
      quantity:          i.quantity,
      unit:              i.unit,
      notes:             i.notes,
      lowStockThreshold: i.low_stock_threshold != null ? i.low_stock_threshold : null,
      purchaseDate:      i.purchase_date || null,
      expiry:            i.expiry_date   || null,
      createdAt:         i.created_at    || null,
      is_demo:           i.is_demo
    };
  }

  /* ---- Public API ---- */
  Z.api = {
    get:   function (p, o)    { return request(p, Object.assign({ method: "GET" },    o || {})); },
    post:  function (p, b, o) { return request(p, Object.assign({ method: "POST",   body: b }, o || {})); },
    patch: function (p, b, o) { return request(p, Object.assign({ method: "PATCH",  body: b }, o || {})); },
    del:   function (p, o)    { return request(p, Object.assign({ method: "DELETE" }, o || {})); },
    request:      request,
    getToken:     getToken,
    getUser:      getUser,
    saveSession:  saveSession,
    clearSession: clearSession
  };

  /* ---- Pantry resource ---- */
  Z.api.pantry = {
    list: function () {
      return request("/api/pantry/").then(function (data) {
        var arr = Array.isArray(data) ? data : (data.results || []);
        return arr.map(fromBackend);
      });
    },
    get: function (id) {
      return request("/api/pantry/" + id + "/").then(fromBackend);
    },
    create: function (item) {
      return request("/api/pantry/", { method: "POST", body: toBackend(item) }).then(fromBackend);
    },
    update: function (id, item) {
      return request("/api/pantry/" + id + "/", { method: "PATCH", body: toBackend(item) }).then(fromBackend);
    },
    remove: function (id) {
      return request("/api/pantry/" + id + "/", { method: "DELETE" });
    }
  };

  /* ---- Recipes resource ---- */
  Z.api.recipes = {
    list: function () {
      return request("/api/recipes/").then(function (data) {
        var arr = Array.isArray(data) ? data : (data.results || []);
        return arr.map(normalizeRecipe);
      });
    },
    recommend: function (pantryIds) {
      var q = pantryIds && pantryIds.length ? ("?pantry_ids=" + pantryIds.join(",")) : "";
      return request("/api/recipes/recommend/" + q).then(function (data) {
        var arr = Array.isArray(data) ? data : (data.results || []);
        return arr.map(normalizeRecipe);
      });
    },
    get: function (id) {
      return request("/api/recipes/" + id + "/").then(normalizeRecipe);
    },
    save: function (id) {
      return request("/api/recipes/" + id + "/save/", { method: "POST" })
        .catch(function () { return { ok: true, offline: true }; });
    },
    unsave: function (id) {
      return request("/api/recipes/" + id + "/save/", { method: "DELETE" })
        .catch(function () { return { ok: true, offline: true }; });
    }
  };

  function normalizeRecipe(r) {
    if (!r) return r;
    var ings = (r.ingredients || []).map(function (ing) {
      if (typeof ing === 'string') {
        return { name: ing, quantity: '', unit: '', have: undefined };
      }
      return {
        name:     ing.name || ing.title || '',
        quantity: ing.quantity != null ? ing.quantity : '',
        unit:     ing.unit || '',
        have:     ing.have
      };
    });
    var instructions = r.instructions || r.steps || [];
    return {
      id:              r.id,
      title:           r.title || r.name || 'Untitled',
      subtitle:        r.subtitle || r.description || '',
      image_url:       r.image_url || r.image || 'assets/images/recipe-placeholder.svg',
      difficulty:      r.difficulty || '',
      diet_tags:       r.diet_tags || r.dietary_tags || [],
      total_time_min:  r.total_time_min || r.prep_time || r.cooking_time_min || 0,
      cook_time_min:   r.cook_time_min  || r.cooking_time_min || 0,
      prep_time_min:   r.prep_time_min  || r.prep_time || 0,
      servings:        r.servings       || r.servings_count || 2,
      estimated_cost:  r.estimated_cost || (r.cost != null ? '₹' + r.cost : ''),
      cuisine:         r.cuisine || '',
      course:          r.course  || '',
      tags:            r.tags    || [],
      ingredients:     ings,
      instructions:    instructions,
      substitutions:   r.substitutions || [],
      nutrition:       r.nutrition || null,
      tips:            r.tips || [],
      dietary_warnings:  r.dietary_warnings || [],
      allergen_warnings: r.allergen_warnings || [],
      is_demo:         r.is_demo
    };
  }

  /* ---- Shops & Offers ---- */
  Z.api.shops = {
    list: function () {
      return request("/api/shops/").then(function (data) {
        var arr = Array.isArray(data) ? data : (data.results || []);
        return arr.map(normalizeShop);
      });
    },
    get: function (id) {
      return request("/api/shops/" + id + "/").then(normalizeShop);
    },
    offers: function () {
      return request("/api/offers/").then(function (data) {
        return Array.isArray(data) ? data : (data.results || []);
      }).catch(function () { return []; });
    }
  };

  function normalizeShop(s) {
    if (!s) return s;
    return {
      id:            s.id,
      name:          s.name || 'Shop',
      category:      s.category || '',
      product:       s.product || s.product_name || '',
      price:         s.price != null ? s.price : null,
      originalPrice: s.original_price || s.originalPrice || null,
      unitPrice:     s.unit_price || s.unitPrice || '',
      discount:      s.discount || '',
      distanceKm:    s.distance_km != null ? s.distance_km : (s.distanceKm != null ? s.distanceKm : null),
      favorite:      !!s.favorite,
      demo:          s.is_demo === true || s.demo === true
    };
  }

  /* ---- Shelters resource ---- */
  function sheltersList() {
    return request("/api/shelters/").then(function (data) {
      var arr = Array.isArray(data) ? data : (data.results || []);
      return arr.map(normalizeShelter);
    });
  }

  function sheltersMatches(payload) {
    var body = payload || {};
    return request("/api/shelters/match/", { method: "POST", body: body })
      .catch(function () { return request("/api/shelters/matches/", { method: "POST", body: body }); })
      .catch(function () { return []; });
  }

  function sheltersNearby(lat, lng, radius) {
    return request("/api/shelters/nearby/?lat=" + lat + "&lng=" + lng + "&radius=" + (radius || 5000));
  }

  function normalizeShelter(s) {
    if (!s) return s;
    return {
      id:         s.id,
      name:       s.name || 'Shelter',
      address:    s.address || s.city || '',
      distanceKm: s.distance_km != null ? s.distance_km : (s.distanceKm != null ? s.distanceKm : null),
      phone:      s.phone || '',
      needs:      s.needs || s.requirements || [],
      urgency:    s.urgency || 'medium',
      is_demo:    s.is_demo === true
    };
  }

  /* Expose as BOTH callable function and object with methods */
  Z.api.shelters = function () { return sheltersList(); };
  Z.api.shelters.list    = sheltersList;
  Z.api.shelters.matches = sheltersMatches;
  Z.api.shelters.nearby  = sheltersNearby;

  /* ---- Donations resource ---- */
  Z.api.donations = {
    list: function (opts) {
      var q = "";
      if (opts && opts.status) q = "?status=" + encodeURIComponent(opts.status);
      return request("/api/donations/" + q).then(function (data) {
        var arr = Array.isArray(data) ? data : (data.results || []);
        return arr.map(normalizeDonation);
      });
    },
    get: function (id) {
      return request("/api/donations/" + id + "/").then(normalizeDonation);
    },
    create: function (payload) {
      return request("/api/donations/", { method: "POST", body: toBackendDonation(payload) }).then(normalizeDonation);
    },
    update: function (id, payload) {
      return request("/api/donations/" + id + "/", { method: "PATCH", body: toBackendDonation(payload) }).then(normalizeDonation);
    },
    remove: function (id) {
      return request("/api/donations/" + id + "/", { method: "DELETE" });
    }
  };

  function toBackendDonation(d) {
    if (!d) return d;
    return {
      food_type:    d.foodType    || d.food_type    || "",
      quantity:     d.quantity    || "",
      packaging:    d.packaging   || "",
      storage:      d.storage     || "",
      preparation:  d.preparation || "",
      deadline:     d.deadline    || "",
      location:     d.location    || "",
      shelter_id:   d.shelterId   || d.shelter_id   || null,
      status:       d.status      || "available"
    };
  }

  function normalizeDonation(d) {
    if (!d) return d;
    return {
      id:          d.id,
      foodType:    d.food_type || d.foodType || d.food || 'Donation',
      quantity:    d.quantity  || '',
      packaging:   d.packaging || '',
      storage:     d.storage   || '',
      preparation: d.preparation || '',
      deadline:    d.deadline || d.collection_deadline || '',
      location:    d.location || '',
      status:      d.status || d.state || 'available',
      shelterName: d.shelter_name || d.shelterName || '',
      shelterId:   d.shelter_id || d.shelterId || null,
      donorName:   d.donor_name || d.donorName || '',
      is_demo:     d.is_demo === true
    };
  }

  /* ---- Assistant, notifications, impact ---- */
  Z.api.ask           = function (q) { return request("/api/assistant/ask/", { method: "POST", body: { question: q } }); };
  Z.api.notifications = function () { return request("/api/notifications/"); };
  Z.api.impact        = function () { return request("/api/impact/"); };

  /* ---- Dietary profile ----
     Tries multiple endpoint paths in case Person 2 used a different name. */
  var DIETARY_PATHS = ["/api/dietary-profile/", "/api/dietary/", "/api/profile/dietary/"];

  function tryPaths(paths, method, body) {
    var i = 0;
    function next() {
      if (i >= paths.length) return Promise.reject(new Error("No dietary endpoint found"));
      var p = paths[i++];
      return request(p, { method: method, body: body })
        .catch(function (e) {
          if (e.message && (e.message.indexOf("404") !== -1 || e.message.indexOf("Not Found") !== -1)) return next();
          throw e;
        });
    }
    return next();
  }

  function normalizeDietary(d) {
    if (!d) return d;
    return {
      allergies: d.allergies || [],
      diet:      d.diet || "none",
      avoid:     d.avoid || [],
      dislikes:  d.dislikes || [],
      budget:    d.budget || "medium",
      meal_size: d.mealSize || d.meal_size || "1"
    };
  }

  Z.api.dietary = {
    get:    function ()     { return tryPaths(DIETARY_PATHS, "GET").catch(function () { return null; }); },
    update: function (data) { return tryPaths(DIETARY_PATHS, "PATCH", normalizeDietary(data)); }
  };

  /* ---- ping: quick connectivity check (used by layout.js) ---- */
  Z.api.ping = function () {
    return request("/api/pantry/", { auth: true })
      .then(function () { return true; })
      .catch(function () { return false; });
  };

  Z.API_BASE = config.API_BASE;
  Z.getToken = getToken;
})();
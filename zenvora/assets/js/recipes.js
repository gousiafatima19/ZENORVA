/* ============================================================
   ZENVORA — Recipes (list + detail)
   ------------------------------------------------------------
   initListPage()   → recipes.html
   initDetailPage() → recipe-detail.html
   Cross-references the user's pantry to mark have/missing items.
   Falls back to clearly labelled demo data when the API is down.
   ============================================================ */

(function () {
  'use strict';

  const { api, layout } = window.ZENVORA;

  // ---------------------------------------------------------
  // Demo recipes — clearly labelled in list + detail
  // ---------------------------------------------------------
  const DEMO_RECIPES = [
    {
      id: 'veg-fried-rice',
      title: 'Vegetable Fried Rice',
      subtitle: 'Quick weeknight dinner from pantry staples',
      image_url: 'assets/images/recipe-placeholder.svg',
      difficulty: 'easy',
      diet_tags: ['vegetarian'],
      total_time_min: 25,
      cook_time_min: 15,
      prep_time_min: 10,
      servings: 2,
      estimated_cost: 'low',
      cuisine: 'Asian',
      course: 'Main',
      tags: ['quick', 'budget'],
      ingredients: [
        { name: 'Cooked rice',      quantity: '2', unit: 'cups', have: true },
        { name: 'Mixed vegetables', quantity: '1', unit: 'cup',  have: false },
        { name: 'Soy sauce',        quantity: '2', unit: 'tbsp', have: true }
      ],
      instructions: [
        'Heat oil in a wok over high heat.',
        'Add vegetables and stir-fry for 3 minutes.',
        'Add rice, soy sauce and mix well.',
        'Cook for 5 more minutes and serve hot.'
      ],
      substitutions: [{ for: 'Soy sauce', use: 'Tamari (gluten-free)' }],
      nutrition: { calories: 320, protein_g: 8, carbs_g: 54, fat_g: 9 },
      tips: ['Day-old rice works best.'],
      dietary_warnings: [],
      allergen_warnings: ['Contains soy']
    },
    {
      id: 'chana-masala',
      title: 'Chana Masala',
      subtitle: 'Protein-rich chickpea curry',
      image_url: 'assets/images/recipe-placeholder.svg',
      difficulty: 'easy',
      total_time_min: 35,
      cook_time_min: 25,
      prep_time_min: 10,
      servings: 3,
      estimated_cost: 'low',
      diet_tags: ['vegetarian', 'vegan'],
      cuisine: 'Indian',
      course: 'Main',
      tags: ['budget', 'high-protein'],
      ingredients: [
        { name: 'Chickpeas',    quantity: '2', unit: 'cups', have: true },
        { name: 'Onion',        quantity: '1', unit: 'pcs',  have: true },
        { name: 'Tomatoes',     quantity: '3', unit: 'pcs',  have: true },
        { name: 'Garam masala', quantity: '1', unit: 'tsp',  have: false }
      ],
      instructions: [
        'Sauté onions until golden.',
        'Add tomatoes and spices; cook until soft.',
        'Add chickpeas and simmer 15 minutes.',
        'Garnish with coriander and serve.'
      ],
      substitutions: [],
      nutrition: { calories: 280, protein_g: 12, carbs_g: 42, fat_g: 6 },
      tips: [],
      dietary_warnings: [],
      allergen_warnings: []
    },
    {
      id: 'spinach-dal',
      title: 'Spinach Dal',
      subtitle: 'Comforting lentil and spinach stew',
      image_url: 'assets/images/recipe-placeholder.svg',
      difficulty: 'easy',
      total_time_min: 30,
      cook_time_min: 20,
      prep_time_min: 10,
      servings: 2,
      estimated_cost: 'low',
      diet_tags: ['vegetarian', 'vegan', 'gluten-free'],
      cuisine: 'Indian',
      course: 'Main',
      tags: ['comfort'],
      ingredients: [
        { name: 'Toor dal',    quantity: '1', unit: 'cup',  have: true },
        { name: 'Spinach',     quantity: '2', unit: 'cups', have: true },
        { name: 'Turmeric',    quantity: '1', unit: 'tsp',  have: true },
        { name: 'Cumin seeds', quantity: '1', unit: 'tsp',  have: true }
      ],
      instructions: [
        'Cook dal with turmeric until soft.',
        'Add chopped spinach and simmer 5 minutes.',
        'Temper cumin in ghee and pour over dal.',
        'Serve with rice.'
      ],
      substitutions: [],
      nutrition: { calories: 240, protein_g: 14, carbs_g: 34, fat_g: 5 },
      tips: [],
      dietary_warnings: [],
      allergen_warnings: []
    }
  ];

  // =========================================================
  // LIST PAGE
  // =========================================================
  let listState = {
    search: '',
    diet: '',
    time: '',
    difficulty: '',
    cost: '',
    pantryOnly: false
  };
  let allRecipes = [];
  let pantryNames = new Set();

  async function initListPage() {
    wireListFilters();
    await loadPantryNames();
    await loadList();
  }

  async function loadPantryNames() {
    try {
      const data = await api.pantry.list();
      const arr = Array.isArray(data) ? data : (data.results || []);
      pantryNames = new Set(arr.map((i) => (i.name || '').toLowerCase().trim()));
    } catch {
      pantryNames = new Set();
    }
  }

  async function loadList() {
    try {
      const data = await api.recipes.list();
      allRecipes = Array.isArray(data) ? data : (data.results || []);
    } catch (err) {
      console.warn('[recipes] using demo:', err?.message);
      allRecipes = window.ZENVORA.config.features.demoFallback.recipes
        ? DEMO_RECIPES
        : [];
    }
    renderList();
  }

  function markPantryAvailability(recipe) {
    // If the backend already provided `have`, keep it.
    // Otherwise cross-reference against pantryNames.
    return (recipe.ingredients || []).map((ing) => {
      if (typeof ing.have === 'boolean') return ing;
      const key = (ing.name || '').toLowerCase().trim();
      return { ...ing, have: pantryNames.has(key) };
    });
  }

  function renderList() {
    const grid = document.getElementById('recipeGrid');
    if (!grid) return;

    let list = allRecipes.map((r) => ({
      ...r,
      ingredients: markPantryAvailability(r)
    }));

    if (listState.search) {
      const q = listState.search.toLowerCase();
      list = list.filter((r) =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.subtitle || '').toLowerCase().includes(q));
    }
    if (listState.diet) {
      list = list.filter((r) => (r.diet_tags || []).includes(listState.diet));
    }
    if (listState.time) {
      const max = parseInt(listState.time, 10);
      list = list.filter((r) => (r.total_time_min || 0) <= max);
    }
    if (listState.difficulty) {
      list = list.filter((r) => r.difficulty === listState.difficulty);
    }
    if (listState.cost) {
      list = list.filter((r) => r.estimated_cost === listState.cost);
    }
    if (listState.pantryOnly) {
      list = list.filter((r) =>
        (r.ingredients || []).every((i) => i.have !== false));
    }

    if (!list.length) {
      grid.innerHTML = `<p class="empty-state">No recipes match your filters.</p>`;
      return;
    }

    grid.innerHTML = list.map(recipeCard).join('');
    if (window.lucide) lucide.createIcons();
  }

  function recipeCard(r) {
    const ings = r.ingredients || [];
    const missing = ings.filter((i) => i.have === false).length;
    const have = ings.length - missing;

    const badge = !ings.length
      ? `<span class="badge badge-muted">No data</span>`
      : missing === 0
        ? `<span class="badge badge-success">Ready to cook</span>`
        : `<span class="badge badge-warn">${missing} missing</span>`;

    return `
      <article class="recipe-card">
        <a href="recipe-detail.html?id=${encodeURIComponent(r.id)}" class="recipe-card-img-wrap">
          <img class="recipe-card-img"
               src="${layout.escapeHtml(r.image_url || 'assets/images/recipe-placeholder.svg')}"
               alt="" loading="lazy" />
          <div class="recipe-card-badges">${badge}</div>
        </a>
        <div class="recipe-card-body">
          <a href="recipe-detail.html?id=${encodeURIComponent(r.id)}">
            <h3 class="recipe-card-title">${layout.escapeHtml(r.title || 'Untitled')}</h3>
          </a>
          ${r.subtitle ? `<p class="recipe-card-sub">${layout.escapeHtml(r.subtitle)}</p>` : ''}
          <div class="recipe-card-meta">
            ${r.total_time_min ? `<span><i data-lucide="clock"></i> ${r.total_time_min} min</span>` : ''}
            ${r.servings ? `<span><i data-lucide="users"></i> ${r.servings}</span>` : ''}
            ${r.difficulty ? `<span><i data-lucide="gauge"></i> ${layout.escapeHtml(r.difficulty)}</span>` : ''}
          </div>
          <div class="recipe-card-footer">
            <span class="recipe-card-cost">${have}/${ings.length} have</span>
            <a href="recipe-detail.html?id=${encodeURIComponent(r.id)}"
               class="btn btn-primary btn-sm">View</a>
          </div>
        </div>
      </article>`;
  }

  function wireListFilters() {
    const s       = document.getElementById('recipeSearch');
    const globalS = document.getElementById('globalSearch');

    const onSearch = layout.debounce((v) => {
      listState.search = v;
      renderList();
    }, 180);

    s?.addEventListener('input', (e) => onSearch(e.target.value));
    globalS?.addEventListener('input', (e) => onSearch(e.target.value));
    document.getElementById('recipeDiet')
      ?.addEventListener('change', (e) => { listState.diet = e.target.value; renderList(); });
    document.getElementById('recipeTime')
      ?.addEventListener('change', (e) => { listState.time = e.target.value; renderList(); });
    document.getElementById('recipeDifficulty')
      ?.addEventListener('change', (e) => { listState.difficulty = e.target.value; renderList(); });
    document.getElementById('recipeCost')
      ?.addEventListener('change', (e) => { listState.cost = e.target.value; renderList(); });
    document.getElementById('recipePantryOnly')
      ?.addEventListener('change', (e) => { listState.pantryOnly = e.target.checked; renderList(); });
  }

  // =========================================================
  // DETAIL PAGE
  // =========================================================
  async function initDetailPage() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');

    if (!id) {
      showError('No recipe specified.');
      return;
    }

    // Try the API first; fall back to demo if the flag allows.
    try {
      const recipe = await api.recipes.get(id);
      await enrichWithPantry(recipe);
      renderDetail(recipe);
    } catch (err) {
      console.warn('[recipe-detail] API failed:', err?.message);

      if (window.ZENVORA.config.features.demoFallback.recipes) {
        const demo = DEMO_RECIPES.find((r) => r.id === id) || DEMO_RECIPES[0];
        await enrichWithPantry(demo);
        renderDetail(demo);
        layout.toast('Showing demo recipe — API not reachable.', 'warn');
      } else {
        showError(err?.message || 'Recipe could not be loaded.');
      }
    }

    document.getElementById('retryRecipeBtn')
      ?.addEventListener('click', () => {
        document.getElementById('recipeDetailError').hidden = true;
        document.getElementById('recipeDetailLoading').hidden = false;
        initDetailPage();
      });
  }

  async function enrichWithPantry(recipe) {
    try {
      const data = await api.pantry.list();
      const arr = Array.isArray(data) ? data : (data.results || []);
      const pantrySet = new Set(arr.map((i) => (i.name || '').toLowerCase().trim()));

      recipe.ingredients = (recipe.ingredients || []).map((ing) => {
        if (typeof ing.have === 'boolean') return ing;
        const key = (ing.name || '').toLowerCase().trim();
        return { ...ing, have: pantrySet.has(key) };
      });
    } catch {
      // If pantry is unreachable, leave whatever the recipe already says.
      recipe.ingredients = recipe.ingredients || [];
    }
  }

  function showError(msg) {
    const loading = document.getElementById('recipeDetailLoading');
    const err = document.getElementById('recipeDetailError');
    const detail = document.getElementById('recipeDetail');
    if (loading) loading.hidden = true;
    if (detail)  detail.hidden = true;
    if (err)     err.hidden = false;
    setText('recipeErrorText', msg);
    if (window.lucide) lucide.createIcons();
  }

  function renderDetail(r) {
    const loading = document.getElementById('recipeDetailLoading');
    const err = document.getElementById('recipeDetailError');
    const detail = document.getElementById('recipeDetail');
    if (loading) loading.hidden = true;
    if (err)     err.hidden = true;
    if (detail)  detail.hidden = false;

    document.title = `${r.title || 'Recipe'} · ZENVORA`;
    setText('recipePageTitle', r.title || 'Recipe');

    setText('recipeTitle', r.title || 'Recipe');
    setText('recipeSub', r.subtitle || '');
    setText('recipeDifficulty', r.difficulty || 'recipe');
    setText('recipeTotalTime', r.total_time_min ? `${r.total_time_min} min total` : '—');
    setText('recipeCookTime', r.cook_time_min ? `${r.cook_time_min} min cook` : '—');
    setText('recipeServings', r.servings ? `${r.servings} servings` : '—');
    setText('recipeCost', r.estimated_cost ? `${r.estimated_cost} cost` : '—');

    const img = document.getElementById('recipeHeroImg');
    if (img) {
      img.src = r.image_url || 'assets/images/recipe-placeholder.svg';
      img.alt = r.title || 'Recipe';
    }

    const dietBadge = document.getElementById('recipeDietBadge');
    if (dietBadge && Array.isArray(r.diet_tags) && r.diet_tags.length) {
      dietBadge.hidden = false;
      dietBadge.textContent = r.diet_tags.join(' · ');
    } else if (dietBadge) {
      dietBadge.hidden = true;
    }

    renderIngredients(r.ingredients || []);
    renderInstructions(r.instructions || []);
    renderSubstitutions(r.substitutions || []);
    renderNutrition(r.nutrition);
    renderWarnings(r);
    renderMeta(r);
    renderTips(r.tips);
    wireDetailActions(r.id);

    if (window.lucide) lucide.createIcons();
  }

  function renderIngredients(list) {
    const ul = document.getElementById('ingredientList');
    if (!ul) return;

    if (!list.length) {
      ul.innerHTML = `<li class="empty-state">No ingredients listed.</li>`;
      return;
    }

    const have    = list.filter((i) => i.have !== false);
    const missing = list.filter((i) => i.have === false);

    setText('ingHaveBadge', `${have.length} have`);
    const mb = document.getElementById('ingMissingBadge');
    if (mb) {
      mb.hidden = missing.length === 0;
      mb.textContent = `${missing.length} missing`;
    }

    ul.innerHTML = list.map((i) => {
      const has = i.have !== false;
      return `
        <li class="ingredient-item ${has ? '' : 'missing'}">
          <span class="ing-check">
            <i data-lucide="${has ? 'check' : 'plus'}"></i>
          </span>
          <div class="ing-body">
            <p class="ing-name">${layout.escapeHtml(i.name || '')}</p>
            ${i.quantity
              ? `<p class="ing-qty">${layout.escapeHtml(String(i.quantity))} ${layout.escapeHtml(i.unit || '')}</p>`
              : ''}
          </div>
          <span class="ing-badge badge badge-${has ? 'success' : 'warn'}">
            ${has ? 'have' : 'need'}
          </span>
        </li>`;
    }).join('');

    // Missing list
    const missingList = document.getElementById('missingList');
    if (missingList) {
      if (!missing.length) {
        missingList.innerHTML = `<li class="empty-state">None — you have everything!</li>`;
      } else {
        missingList.innerHTML = missing.map((m) => `
          <li>
            <span class="mini-icon"><i data-lucide="shopping-cart"></i></span>
            <div class="mini-body">
              <p class="mini-title">${layout.escapeHtml(m.name)}</p>
            </div>
          </li>`).join('');
      }
    }

    const sub = document.getElementById('missingSub');
    if (sub) {
      sub.textContent = missing.length
        ? `${missing.length} item${missing.length > 1 ? 's' : ''} to buy`
        : 'All set';
    }

    // Available list
    const avail = document.getElementById('availableList');
    if (avail) {
      if (!have.length) {
        avail.innerHTML = `<li class="empty-state">—</li>`;
      } else {
        avail.innerHTML = have.map((m) => `
          <li>
            <span class="mini-icon"><i data-lucide="check"></i></span>
            <div class="mini-body">
              <p class="mini-title">${layout.escapeHtml(m.name)}</p>
            </div>
          </li>`).join('');
      }
    }
  }

  function renderInstructions(list) {
    const ol = document.getElementById('instructionList');
    if (!ol) return;
    if (!list.length) {
      ol.innerHTML = `<li class="empty-state">No instructions.</li>`;
      return;
    }
    ol.innerHTML = list.map((s) => `<li>${layout.escapeHtml(s)}</li>`).join('');
  }

  function renderSubstitutions(list) {
    const wrap = document.getElementById('substitutionList');
    const head = document.getElementById('substitutionsHeading');
    if (!wrap || !head) return;

    if (!list.length) {
      wrap.hidden = true;
      head.hidden = true;
      return;
    }

    wrap.hidden = false;
    head.hidden = false;
    wrap.innerHTML = list.map((s) => `
      <li>
        <span class="sub-for">${layout.escapeHtml(s.for || '')}</span>
        <span>→</span>
        <span class="sub-use">${layout.escapeHtml(s.use || '')}</span>
      </li>`).join('');
  }

  function renderNutrition(n) {
    const ul = document.getElementById('nutritionList');
    if (!ul) return;

    if (!n || typeof n !== 'object') {
      ul.innerHTML = `<li class="empty-state">Not available.</li>`;
      return;
    }

    const labels = {
      calories:  'Calories',
      protein_g: 'Protein',
      carbs_g:   'Carbs',
      fat_g:     'Fat'
    };

    const rows = Object.entries(labels)
      .filter(([k]) => n[k] != null)
      .map(([k, label]) => `
        <li>
          <span class="meta-label">${label}</span>
          <span class="meta-value">${layout.escapeHtml(String(n[k]))}${k === 'calories' ? ' kcal' : ' g'}</span>
        </li>`);

    ul.innerHTML = rows.length
      ? rows.join('')
      : `<li class="empty-state">Not available.</li>`;
  }

  function renderWarnings(r) {
    const dw = document.getElementById('dietWarning');
    const dwText = document.getElementById('dietWarningText');
    if (dw && Array.isArray(r.dietary_warnings) && r.dietary_warnings.length) {
      dw.hidden = false;
      if (dwText) {
        dwText.innerHTML = `<strong>Dietary note</strong>${layout.escapeHtml(r.dietary_warnings.join(' · '))}`;
      }
    } else if (dw) {
      dw.hidden = true;
    }

    const aw = document.getElementById('allergenWarning');
    const awText = document.getElementById('allergenWarningText');
    if (aw && Array.isArray(r.allergen_warnings) && r.allergen_warnings.length) {
      aw.hidden = false;
      if (awText) {
        awText.innerHTML = `<strong>Allergen information</strong>${layout.escapeHtml(r.allergen_warnings.join(' · '))}. Verify labels yourself before consuming.`;
      }
    } else if (aw) {
      aw.hidden = true;
    }
  }

  function renderMeta(r) {
    const rows = [
      ['metaCuisineRow', 'metaCuisine', r.cuisine],
      ['metaCourseRow',  'metaCourse',  r.course],
      ['metaPrepRow',    'metaPrep',    r.prep_time_min ? `${r.prep_time_min} min` : ''],
      ['metaTagsRow',    'metaTags',    (r.tags || []).join(', ')]
    ];

    rows.forEach(([rowId, valId, val]) => {
      const row = document.getElementById(rowId);
      const el  = document.getElementById(valId);
      if (!row || !el) return;
      if (val) {
        row.hidden = false;
        el.textContent = val;
      } else {
        row.hidden = true;
      }
    });
  }

  function renderTips(tips) {
    const wrap = document.getElementById('recipeTipsWrap');
    const ul   = document.getElementById('recipeTipsList');
    if (!wrap || !ul) return;

    if (!Array.isArray(tips) || !tips.length) {
      wrap.hidden = true;
      return;
    }

    wrap.hidden = false;
    ul.innerHTML = tips.map((t) => `<li>${layout.escapeHtml(t)}</li>`).join('');
  }

  function wireDetailActions(id) {
    document.getElementById('startCookingBtn')?.addEventListener('click', () => {
      location.href = `smart-cook.html?id=${encodeURIComponent(id)}`;
    });

    document.getElementById('saveRecipeBtn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      const label = document.getElementById('saveRecipeLabel');

      try {
        if (pressed) await api.recipes.unsave(id);
        else         await api.recipes.save(id);

        btn.setAttribute('aria-pressed', String(!pressed));
        if (label) label.textContent = !pressed ? 'Saved' : 'Save Recipe';
        layout.toast(!pressed ? 'Recipe saved.' : 'Recipe removed from saved.', 'success');
      } catch (err) {
        layout.toast(err?.message || 'Could not save recipe.', 'error');
      }
    });

    document.getElementById('addMissingBtn')?.addEventListener('click', () => {
      // Placeholder — the backend must expose a shopping-list endpoint.
      layout.toast('Opening shopping list…', 'info');
      location.href = 'shops.html';
    });

    document.getElementById('shareRecipeBtn')?.addEventListener('click', async () => {
      const url = location.href;
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url }); return; }
        catch { /* user cancelled — fall through to copy */ }
      }
      try {
        await navigator.clipboard.writeText(url);
        layout.toast('Link copied.', 'success');
      } catch {
        layout.toast('Could not copy link.', 'warn');
      }
    });
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v ?? '';
  }

  // =========================================================
  // Exports
  // =========================================================
  window.ZENVORA.recipes = {
    initListPage,
    initDetailPage
  };
})();
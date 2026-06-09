/* ============================================================
   Money Map — Application Logic
   ============================================================ */
(() => {
  'use strict';

  // ─── Constants ───────────────────────────────────────
  const CURRENCIES = [
    { code: 'PKR', symbol: 'Rs',  flag: '🇵🇰', name: 'Pakistani Rupee' },
    { code: 'USD', symbol: '$',   flag: '🇺🇸', name: 'US Dollar' },
    { code: 'EUR', symbol: '€',   flag: '🇪🇺', name: 'Euro' },
    { code: 'GBP', symbol: '£',   flag: '🇬🇧', name: 'British Pound' },
    { code: 'SAR', symbol: '﷼',  flag: '🇸🇦', name: 'Saudi Riyal' },
  ];

  const INCOME_CATEGORIES = [
    { value: 'Pocket Money',  emoji: '💰', label: 'Pocket Money' },
    { value: 'Freelancing',   emoji: '💻', label: 'Freelancing' },
    { value: 'Scholarship',   emoji: '🎓', label: 'Scholarship' },
    { value: 'Part-time Job', emoji: '💼', label: 'Part-time Job' },
    { value: 'Other Income',  emoji: '📥', label: 'Other Income' },
  ];

  const EXPENSE_CATEGORIES = [
    { value: 'Food',          emoji: '🍔', label: 'Food' },
    { value: 'Rent',          emoji: '🏠', label: 'Rent' },
    { value: 'Books',         emoji: '📚', label: 'Books' },
    { value: 'Entertainment', emoji: '🎮', label: 'Entertainment' },
    { value: 'Transport',     emoji: '🚌', label: 'Transport' },
    { value: 'Utilities',     emoji: '⚡', label: 'Utilities' },
    { value: 'Savings',       emoji: '🏦', label: 'Savings' },
    { value: 'Other',         emoji: '📦', label: 'Other' },
  ];

  let ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
  let CATEGORY_EMOJI = {};
  
  function refreshCategories() {
    const custom = state.customCategories || [];
    ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...custom];
    CATEGORY_EMOJI = {};
    ALL_CATEGORIES.forEach(c => { CATEGORY_EMOJI[c.value] = c.emoji; });
  }

  // ─── Sample Data (first-run only) ───────────────────
  const SAMPLE_TRANSACTIONS = [
    { id: 't1', type: 'income',  amount: 25000, category: 'Pocket Money',  description: 'Monthly allowance',       date: '2026-05-01' },
    { id: 't2', type: 'income',  amount: 15000, category: 'Freelancing',   description: 'Logo design project',     date: '2026-05-05' },
    { id: 't3', type: 'income',  amount: 5200,  category: 'Part-time Job', description: 'Tutoring sessions',       date: '2026-05-12' },
    { id: 't4', type: 'expense', amount: 8500,  category: 'Food',          description: 'Monthly groceries',       date: '2026-05-03' },
    { id: 't5', type: 'expense', amount: 12000, category: 'Rent',          description: 'Room rent',               date: '2026-05-01' },
    { id: 't6', type: 'expense', amount: 2400,  category: 'Books',         description: 'Data Structures textbook',date: '2026-05-08' },
    { id: 't7', type: 'expense', amount: 1500,  category: 'Entertainment', description: 'Netflix + Spotify',       date: '2026-05-10' },
    { id: 't8', type: 'expense', amount: 3000,  category: 'Transport',     description: 'Monthly bus pass',        date: '2026-05-01' },
    { id: 't9', type: 'expense', amount: 1350,  category: 'Food',          description: 'University café lunches', date: '2026-05-15' },
  ];

  const SAMPLE_BUDGETS = {
    'Food': 10000,
    'Rent': 15000,
    'Books': 5000,
    'Entertainment': 3000,
    'Transport': 4000,
  };

  // ─── Application State ──────────────────────────────
  const state = {
    theme: 'dark',
    currency: 'PKR',
    sidebarOpen: false,
    currencyDropdownOpen: false,
    transactions: [],
    budgets: {},
    filters: { type: 'all', category: 'all' },
    charts: { bar: null, doughnut: null },
    activePage: 'dashboard',
    activeTxTab: 'income',
    goals: [],
    user: {
      name: 'Demo Student',
      email: 'student@university.edu',
      isLoggedIn: true
    },
    preferences: { resetDate: 1, alertThreshold: 80 },
    customCategories: []
  };

  // ─── DOM Helpers ────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─── Utility ────────────────────────────────────────
  function generateId() {
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function formatNumber(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function getCurrencySymbol() {
    const c = CURRENCIES.find(c => c.code === state.currency);
    return c ? c.symbol : 'Rs';
  }

  function formatCurrency(amount) {
    return getCurrencySymbol() + ' ' + formatNumber(amount);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }
  
  function handleCurrencyChange() {
    const val = $('#settingsCurrency').value;
    if (val !== state.currency) {
      setCurrency(val);
    }
  }

  function handlePreferencesChange() {
    const rd = $('#settingsResetDate').value;
    const at = parseInt($('#settingsAlertThreshold').value, 10);
    state.preferences.resetDate = rd;
    if (!isNaN(at) && at >= 10 && at <= 100) {
      state.preferences.alertThreshold = at;
    }
    saveState();
    updateSummaryCards();
    updateCharts();
    renderTransactionTable();
    generateReport(); // Refresh report if date logic changes
  }

  function renderCategorySettings() {
    const container = $('#categoryChips');
    if (!container) return;
    container.innerHTML = ALL_CATEGORIES.map(c => `
      <div class="type-toggle__option active" style="display: flex; align-items: center; gap: 4px; padding: 4px 10px;" data-type="${c.type || 'expense'}">
        <span>${c.emoji}</span>
        <span>${c.label}</span>
        ${(state.customCategories || []).find(custom => custom.value === c.value) ? 
          `<button type="button" onclick="window.deleteCategory('${c.value}')" style="background:none;border:none;color:inherit;opacity:0.7;cursor:pointer;margin-left:4px;">×</button>` : ''}
      </div>
    `).join('');
  }

  window.deleteCategory = function(val) {
    if (!state.customCategories) return;
    state.customCategories = state.customCategories.filter(c => c.value !== val);
    saveState();
    refreshCategories();
    renderCategorySettings();
  };

  function handleAddCategory(e) {
    e.preventDefault();
    const nameInput = $('#newCategoryName');
    const typeInput = $('#newCategoryType');
    const name = nameInput.value.trim();
    const type = typeInput.value;
    if (!name) return;
    
    if (!state.customCategories) state.customCategories = [];
    state.customCategories.push({
      value: name,
      label: name,
      emoji: '🏷️',
      type: type
    });
    
    nameInput.value = '';
    saveState();
    refreshCategories();
    renderCategorySettings();
  }

  function exportBackup() {
    try {
      // Exclude charts (circular references) and user session details to prevent auth hijacking on restore
      const dataToExport = {
        transactions: state.transactions,
        budgets: state.budgets,
        goals: state.goals,
        theme: state.theme,
        currency: state.currency,
        preferences: state.preferences,
        customCategories: state.customCategories
      };
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const userName = (state.user.name || 'User').replace(/\s+/g, '_');
      link.download = `Money_Map_Backup_${userName}_${todayISO()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export backup failed:', err);
      alert('Failed to export backup: ' + err.message);
    }
  }

  function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed && (parsed.transactions !== undefined || parsed.budgets !== undefined)) {
          // Keep current logged-in user profile if available
          const raw = localStorage.getItem('mm-state');
          const current = raw ? JSON.parse(raw) : {};
          
          // Rebuild mm-state with imported data and current user profile to prevent hijacking
          const newState = {
            transactions: parsed.transactions || [],
            budgets: parsed.budgets || {},
            goals: parsed.goals || [],
            theme: parsed.theme || current.theme || 'dark',
            currency: parsed.currency || current.currency || 'PKR',
            preferences: parsed.preferences || current.preferences || { resetDate: 1, alertThreshold: 80 },
            customCategories: parsed.customCategories || [],
            user: current.user || state.user // Keep the current user identity
          };
          
          localStorage.setItem('mm-state', JSON.stringify(newState));
          window.location.reload(); // Quickest way to fully rehydrate all UI reliably
        } else {
          alert('Invalid backup file format. The file must contain transactions or budgets.');
        }
      } catch (err) {
        alert('Failed to parse backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  }
  
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Persistence ────────────────────────────────────
  function saveState() {
    localStorage.setItem('mm-state', JSON.stringify({
      transactions: state.transactions,
      budgets: state.budgets,
      goals: state.goals,
      user: state.user,
      theme: state.theme,
      currency: state.currency,
      preferences: state.preferences,
      customCategories: state.customCategories
    }));
  }

  function loadState() {
    const raw = localStorage.getItem('mm-state');
    if (!raw) {
      state.transactions = [...SAMPLE_TRANSACTIONS];
      state.budgets = { ...SAMPLE_BUDGETS };
      state.theme = localStorage.getItem('mm-theme') || 'dark';
      state.currency = localStorage.getItem('mm-currency') || 'PKR';
      refreshCategories();
      return;
    }
    const saved = JSON.parse(raw);
    if (saved.transactions) state.transactions = saved.transactions;
    if (saved.budgets) state.budgets = saved.budgets;
    if (saved.goals) state.goals = saved.goals;
    if (saved.user) state.user = { ...state.user, ...saved.user };
    if (saved.currency) state.currency = saved.currency;
    if (saved.theme) state.theme = saved.theme;
    if (saved.preferences) state.preferences = { ...state.preferences, ...saved.preferences };
    if (saved.customCategories) state.customCategories = saved.customCategories;
    refreshCategories();
  }

  // ─── Sidebar Management ────────────────────────────
  function openSidebar() {
    state.sidebarOpen = true;
    const sidebar = $('#sidebar');
    const overlay = $('#sidebarOverlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) {
      overlay.style.display = 'block';
      requestAnimationFrame(() => overlay.classList.add('visible'));
    }
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    state.sidebarOpen = false;
    const sidebar = $('#sidebar');
    const overlay = $('#sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => { overlay.style.display = 'none'; }, 250);
    }
    document.body.style.overflow = '';
  }

  function setActiveNavItem(clickedItem) {
    $$('.nav-item').forEach(item => item.classList.remove('active'));
    clickedItem.classList.add('active');
    
    // Switch view
    const viewId = clickedItem.dataset.view;
    if (viewId) {
      navigateTo(viewId);
    }

    if (window.innerWidth <= 768) closeSidebar();
  }

  function navigateTo(viewId) {
    state.activePage = viewId;
    saveState();
    
    // Hide all views
    $$('.view').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    const target = $('#view-' + viewId);
    if (target) {
      target.classList.add('active');
    }

    // Switch block to render specific components
    switch (viewId) {
      case 'dashboard':
        updateSummaryCards();
        renderTransactionTable();
        updateCharts();
        break;
      case 'transactions':
        renderTransactionTable();
        break;
      case 'budgets':
        renderBudgetList();
        break;
      case 'goals':
        renderGoals();
        break;
      case 'reports':
        generateReport();
        break;
      case 'insights':
        analyzeFinances();
        break;
      case 'settings':
        renderCategorySettings();
        break;
      default:
        break;
    }
  }

  // ─── Theme ──────────────────────────────────────────
  function setTheme(theme) {
    state.theme = theme;
    document.body.setAttribute('data-theme', theme);
    const toggleIcon = $('#themeToggleIcon');
    if (toggleIcon) {
      if (theme === 'dark') {
        toggleIcon.classList.remove('theme-toggle__icon--sun');
        toggleIcon.classList.add('theme-toggle__icon--moon');
        toggleIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
      } else {
        toggleIcon.classList.remove('theme-toggle__icon--moon');
        toggleIcon.classList.add('theme-toggle__icon--sun');
        toggleIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
      }
    }
    
    // Update Settings UI theme buttons
    $$('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.setTheme === theme);
    });

    saveState();
    updateCharts();
  }

  function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  // ─── Currency ───────────────────────────────────────
  function setCurrency(code) {
    state.currency = code;
    
    const config = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
    
    // Sync Topbar selector
    const toggleCode = $('#currencySelectorLabel');
    if (toggleCode) toggleCode.textContent = `${config.flag} ${config.code}`;
    
    $$('.currency-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.currency === code);
    });
    
    // Sync Settings selector
    const settingsCurrency = $('#settingsCurrency');
    if (settingsCurrency) settingsCurrency.value = code;

    saveState();
    updateSummaryCards();
    renderTransactionTable();
    renderBudgetList();
    renderGoals();
    generateReport();
    updateCharts();
  }

  function toggleCurrencyDropdown(e) {
    e.stopPropagation();
    state.currencyDropdownOpen = !state.currencyDropdownOpen;
    const sel = $('#currencySelector');
    if (sel) sel.classList.toggle('open', state.currencyDropdownOpen);
  }

  function closeCurrencyDropdown() {
    state.currencyDropdownOpen = false;
    const sel = $('#currencySelector');
    if (sel) sel.classList.remove('open');
  }

  function renderCurrencyOptions() {
    const dropdown = $('#currencyDropdown');
    if (!dropdown) return;
    dropdown.innerHTML = CURRENCIES.map(c => `
      <button class="currency-option ${c.code === state.currency ? 'active' : ''}"
              data-currency="${c.code}">
        <span class="currency-option__flag">${c.flag}</span>
        <span class="currency-option__code">${c.code}</span>
        <span class="currency-option__symbol">${c.symbol}</span>
      </button>
    `).join('');
    dropdown.querySelectorAll('.currency-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        setCurrency(opt.dataset.currency);
        closeCurrencyDropdown();
      });
    });
  }

  // ─── Greeting ──────────────────────────────────────
  function updateGreeting() {
    const hour = new Date().getHours();
    const greetingEl = $('#greeting');
    if (!greetingEl) return;

    let text = 'Good Evening,';
    if (hour < 12) text = 'Good Morning,';
    else if (hour < 18) text = 'Good Afternoon,';

    greetingEl.innerHTML = `
      <h1>${text}</h1>
      <p>${state.user.name}</p>
    `;
    
    // Update sidebar username
    const sidebarName = $('.sidebar__user-name');
    if (sidebarName) sidebarName.textContent = state.user.name;
  }

  // ─── Summary Calculations ──────────────────────────
  function calculateSummary() {
    let totalIncome = 0;
    let totalExpense = 0;
    state.transactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    let totalBudget = 0;
    Object.values(state.budgets).forEach(v => { totalBudget += v; });

    const budgetPercent = totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      totalBudget,
      budgetPercent,
    };
  }

  function updateSummaryCards() {
    const s = calculateSummary();
    const sym = getCurrencySymbol();

    const incEl = $('#summaryIncomeValue');
    if (incEl) incEl.innerHTML = `<span class="currency-symbol">${sym}</span> ${formatNumber(s.totalIncome)}`;

    const expEl = $('#summaryExpenseValue');
    if (expEl) expEl.innerHTML = `<span class="currency-symbol">${sym}</span> ${formatNumber(s.totalExpense)}`;

    const balEl = $('#summaryBalanceValue');
    if (balEl) balEl.innerHTML = `<span class="currency-symbol">${sym}</span> ${formatNumber(s.balance)}`;

    const budEl = $('#summaryBudgetValue');
    if (budEl) budEl.textContent = s.totalBudget > 0 ? `${Math.round(s.budgetPercent)}%` : '—';

    // Budget warning on balance card
    const balCard = $('#cardBalance');
    if (balCard) {
      balCard.classList.remove('summary-card--warning', 'summary-card--danger');
      if (s.totalBudget > 0) {
        if (s.budgetPercent >= 100) {
          balCard.classList.add('summary-card--danger');
        } else if (s.budgetPercent >= (state.preferences.alertThreshold || 80)) {
          balCard.classList.add('summary-card--warning');
        }
      }
    }

    // Budget card warning too
    const budCard = $('#cardBudget');
    if (budCard) {
      budCard.classList.remove('summary-card--warning', 'summary-card--danger');
      if (s.totalBudget > 0) {
        if (s.budgetPercent >= 100) {
          budCard.classList.add('summary-card--danger');
        } else if (s.budgetPercent >= (state.preferences.alertThreshold || 80)) {
          budCard.classList.add('summary-card--warning');
        }
      }
    }

    // Update sidebar badge
    const badge = $('#navTransactionsBadge');
    if (badge) badge.textContent = state.transactions.length;
  }

  // ─── Transaction Management ────────────────────────
  function addTransaction(data) {
    const tx = {
      id: generateId(),
      type: data.type,
      amount: parseFloat(data.amount),
      category: data.category,
      description: data.description || '',
      date: data.date,
    };
    state.transactions.unshift(tx);
    saveState();
    updateSummaryCards();
    renderTransactionTable();
    renderBudgetList();
    updateCharts();
    populateFilterCategories();
  }

  function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    updateSummaryCards();
    renderTransactionTable();
    renderBudgetList();
    updateCharts();
    populateFilterCategories();
  }

  function getFilteredTransactions() {
    let list = [...state.transactions];
    if (state.activePage === 'transactions') {
      list = list.filter(t => t.type === state.activeTxTab);
    } else {
      if (state.filters.type !== 'all') {
        list = list.filter(t => t.type === state.filters.type);
      }
    }
    
    if (state.filters.category !== 'all') {
      list = list.filter(t => t.category === state.filters.category);
    }
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return list;
  }

  function renderTransactionTable() {
    const tbody = $('#transactionTableBody');
    const table = $('#transactionTable');
    const emptyState = $('#emptyState');
    const countEl = $('#filterCount');
    
    if (!tbody) return;

    const filtered = getFilteredTransactions();

    if (countEl) {
      countEl.textContent = `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (table) table.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (table) table.style.display = '';
    if (emptyState) emptyState.style.display = 'none';

    const sym = getCurrencySymbol();

    tbody.innerHTML = filtered.map(t => {
      const emoji = CATEGORY_EMOJI[t.category] || '📋';
      const sign = t.type === 'expense' ? '−' : '+';
      const amountClass = t.type === 'income' ? 'table-amount--income' : 'table-amount--expense';
      const badgeClass = t.type === 'income' ? 'badge--income' : 'badge--expense';
      const typeLabel = t.type === 'income' ? '↑ Income' : '↓ Expense';

      return `
        <tr>
          <td class="table-date">${formatDate(t.date)}</td>
          <td class="table-description">${escapeHtml(t.description) || '—'}</td>
          <td><span class="badge badge--category">${emoji} ${t.category}</span></td>
          <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
          <td class="table-amount ${amountClass}">${sign}${sym} ${formatNumber(t.amount)}</td>
          <td>
            <button class="btn-icon-delete" data-id="${t.id}" title="Delete transaction" aria-label="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-icon-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteTransaction(btn.dataset.id));
    });
  }

  function populateFilterCategories() {
    const sel = $('#filterCategory');
    if (!sel) return;

    const cats = new Set();
    state.transactions.forEach(t => cats.add(t.category));

    let html = '<option value="all">All Categories</option>';
    ALL_CATEGORIES.forEach(c => {
      if (cats.has(c.value)) {
        html += `<option value="${c.value}">${c.emoji} ${c.label}</option>`;
      }
    });
    sel.innerHTML = html;
    sel.value = state.filters.category;
  }

  // ─── Budget Management ─────────────────────────────
  function setBudget(category, amount) {
    state.budgets[category] = parseFloat(amount);
    saveState();
    updateSummaryCards();
    renderBudgetList();
  }

  function deleteBudget(category) {
    delete state.budgets[category];
    saveState();
    updateSummaryCards();
    renderBudgetList();
  }

  function getCategorySpent(category) {
    return state.transactions
      .filter(t => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function renderBudgetList() {
    const container = $('#budgetList');
    if (!container) return;

    const entries = Object.entries(state.budgets);

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="budget-empty">
          <div class="budget-empty__text">No budgets set yet. Use the form to create one.</div>
        </div>`;
      return;
    }

    const sym = getCurrencySymbol();
    container.innerHTML = entries.map(([category, limit]) => {
      const spent = getCategorySpent(category);
      const pct = Math.min((spent / limit) * 100, 100);
      const pctDisplay = Math.round((spent / limit) * 100);
      const emoji = CATEGORY_EMOJI[category] || '📋';

      let level = 'safe';
      if (pctDisplay >= 100) level = 'danger';
      else if (pctDisplay >= 60) level = 'warn';

      return `
        <div class="budget-item">
          <div class="budget-item__header">
            <span class="budget-item__category">
              <span class="budget-item__category-emoji">${emoji}</span>
              ${category}
            </span>
            <button class="budget-item__delete" data-category="${category}" title="Remove budget" aria-label="Remove">✕</button>
          </div>
          <div class="budget-item__values">
            <span class="budget-item__spent">${sym} ${formatNumber(spent)} / ${sym} ${formatNumber(limit)}</span>
            <span class="budget-item__percent budget-item__percent--${level}">${pctDisplay}%</span>
          </div>
          <div class="budget-progress">
            <div class="budget-progress__bar budget-progress__bar--${level}" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.budget-item__delete').forEach(btn => {
      btn.addEventListener('click', () => deleteBudget(btn.dataset.category));
    });
  }

  // ─── Modal Management ──────────────────────────────
  function openTransactionModal(presetType) {
    const modal = $('#transactionModal');
    if (!modal) return;

    const form = $('#transactionForm');
    if (form) form.reset();

    const type = presetType || 'income';
    $('#transactionType').value = type;
    
    $$('#typeToggle .type-toggle__option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    const freqGroup = $('#frequencyGroup');
    if (freqGroup) {
      freqGroup.style.display = type === 'income' ? 'block' : 'none';
    }

    $('#transactionDate').value = todayISO();
    populateModalCategories(type);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#transactionAmount')?.focus(), 200);
  }

  function closeTransactionModal() {
    const modal = $('#transactionModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function populateModalCategories(type) {
    const sel = $('#transactionCategory');
    if (!sel) return;

    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    sel.innerHTML = '<option value="">Select category…</option>' +
      cats.map(c => `<option value="${c.value}">${c.emoji} ${c.label}</option>`).join('');
  }

  function handleTransactionSubmit(e) {
    e.preventDefault();

    const type = $('#transactionType').value;
    const amount = $('#transactionAmount').value;
    const category = $('#transactionCategory').value;
    const date = $('#transactionDate').value;
    const description = $('#transactionDescription').value.trim();
    let frequency = null;
    if (type === 'income') {
      frequency = $('#transactionFrequency')?.value || 'One-time';
    }

    if (!amount || !category || !date) return;

    addTransaction({ type, amount, category, date, description, frequency });
    closeTransactionModal();
  }

  function handleBudgetSubmit(e) {
    e.preventDefault();
    const category = $('#budgetCategory').value;
    const amount = $('#budgetAmount').value;
    if (!category || !amount) return;

    setBudget(category, amount);

    $('#budgetCategory').value = '';
    $('#budgetAmount').value = '';
  }

  // ─── Chart.js Integration ──────────────────────────
  const CHART_COLORS = {
    income:       'rgba(16, 185, 129, 0.85)',
    expense:      'rgba(244, 63, 94, 0.85)',
    doughnut: [
      'rgba(244, 63, 94, 0.85)',
      'rgba(99, 102, 241, 0.85)',
      'rgba(245, 158, 11, 0.85)',
      'rgba(168, 85, 247, 0.85)',
      'rgba(14, 165, 233, 0.85)',
      'rgba(20, 184, 166, 0.85)',
      'rgba(107, 114, 128, 0.85)',
    ],
    doughnutBorder: [
      'rgba(244, 63, 94, 1)',
      'rgba(99, 102, 241, 1)',
      'rgba(245, 158, 11, 1)',
      'rgba(168, 85, 247, 1)',
      'rgba(14, 165, 233, 1)',
      'rgba(20, 184, 166, 1)',
      'rgba(107, 114, 128, 1)',
    ],
  };

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function getChartThemeColors() {
    const isDark = state.theme === 'dark';
    return {
      gridColor:  isDark ? 'rgba(148,163,184,0.1)' : 'rgba(15,23,42,0.06)',
      tickColor:  isDark ? '#94a3b8' : '#64748b',
      tooltipBg:  isDark ? '#1e293b' : '#ffffff',
      tooltipText: isDark ? '#f1f5f9' : '#0f172a',
      tooltipBorder: isDark ? '#334155' : '#e2e8f0',
      legendColor: isDark ? '#94a3b8' : '#64748b',
    };
  }

  function getMonthlyData() {
    const monthMap = {};

    state.transactions.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      if (!monthMap[key]) {
        monthMap[key] = { income: 0, expense: 0, year: d.getFullYear(), month: d.getMonth() };
      }
      if (t.type === 'income') monthMap[key].income += t.amount;
      else monthMap[key].expense += t.amount;
    });

    const sorted = Object.values(monthMap)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .slice(-6);

    if (sorted.length === 0) {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        sorted.push({ income: 0, expense: 0, year: m.getFullYear(), month: m.getMonth() });
      }
    } else if (sorted.length === 1) {
      const only = sorted[0];
      for (let i = 2; i >= 1; i--) {
        const m = new Date(only.year, only.month - i, 1);
        sorted.unshift({ income: 0, expense: 0, year: m.getFullYear(), month: m.getMonth() });
      }
      for (let i = 1; i <= 3; i++) {
        const m = new Date(only.year, only.month + i, 1);
        sorted.push({ income: 0, expense: 0, year: m.getFullYear(), month: m.getMonth() });
      }
    }

    return {
      labels: sorted.map(d => `${MONTH_NAMES[d.month]} ${d.year}`),
      income: sorted.map(d => d.income),
      expense: sorted.map(d => d.expense),
    };
  }

  function getExpenseByCategory() {
    const catMap = {};
    state.transactions.forEach(t => {
      if (t.type !== 'expense') return;
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([cat]) => `${CATEGORY_EMOJI[cat] || ''} ${cat}`),
      data: entries.map(([, val]) => val),
    };
  }

  function initCharts() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    updateCharts();
  }

  function createBarChart() {
    const ctx = $('#barChart');
    if (!ctx) return;

    if (state.charts.bar) { state.charts.bar.destroy(); state.charts.bar = null; }

    const monthData = getMonthlyData();
    const theme = getChartThemeColors();
    const sym = getCurrencySymbol();

    state.charts.bar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthData.labels,
        datasets: [
          {
            label: 'Income',
            data: monthData.income,
            backgroundColor: CHART_COLORS.income,
            hoverBackgroundColor: 'rgba(16, 185, 129, 1)',
            borderRadius: 6,
          },
          {
            label: 'Expenses',
            data: monthData.expense,
            backgroundColor: CHART_COLORS.expense,
            hoverBackgroundColor: 'rgba(244, 63, 94, 1)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        animation: { duration: 600 },
        plugins: {
          legend: { labels: { color: theme.legendColor } },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.tooltipBorder,
            callbacks: {
              label: function(ctx) {
                return ` ${ctx.dataset.label}: ${sym} ${formatNumber(ctx.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: theme.tickColor }, grid: { display: false } },
          y: { 
            ticks: { 
              color: theme.tickColor,
              callback: function(value) { return sym + ' ' + formatNumber(value); }
            }, 
            grid: { color: theme.gridColor } 
          },
        },
      },
    });
  }

  function createDoughnutChart() {
    const ctx = $('#doughnutChart');
    if (!ctx) return;

    if (state.charts.doughnut) { state.charts.doughnut.destroy(); state.charts.doughnut = null; }

    const catData = getExpenseByCategory();
    const theme = getChartThemeColors();
    const sym = getCurrencySymbol();

    if (catData.data.length === 0) {
      catData.labels = ['No expenses yet'];
      catData.data = [1];
    }

    const total = catData.data.reduce((s, v) => s + v, 0);

    state.charts.doughnut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: catData.labels,
        datasets: [{
          data: catData.data,
          backgroundColor: CHART_COLORS.doughnut,
          borderColor: CHART_COLORS.doughnutBorder,
          borderWidth: 2,
        }],
      },
      options: {
        cutout: '62%',
        plugins: {
          legend: { position: 'right', labels: { color: theme.legendColor } },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.tooltipBorder,
            callbacks: {
              label: function(ctx) {
                const value = ctx.parsed;
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return ` ${sym} ${formatNumber(value)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  function updateCharts() {
    if (typeof Chart === 'undefined') return;
    createBarChart();
    createDoughnutChart();
  }

  // ─── Savings Goals ──────────────────────────────────
  function addGoal(e) {
    e.preventDefault();
    const name = $('#goalName').value.trim();
    const amount = parseFloat($('#goalAmount').value);
    const date = $('#goalDate').value;

    if (!name || !amount || !date) return;

    state.goals.push({
      id: Date.now().toString(),
      name,
      targetAmount: amount,
      savedAmount: 0,
      targetDate: date
    });

    saveState();
    $('#goalForm').reset();
    renderGoals();
  }

  function allocateFunds(goalId, amountToAdd) {
    if (amountToAdd <= 0 || isNaN(amountToAdd)) return;

    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    goal.savedAmount += amountToAdd;
    if (goal.savedAmount > goal.targetAmount) {
      goal.savedAmount = goal.targetAmount;
    }
    
    addTransaction({
      type: 'expense',
      amount: amountToAdd.toString(),
      category: 'Savings',
      date: todayISO(),
      description: `Allocation to goal: ${goal.name}`
    });

    saveState();
    renderGoals();
  }

  function renderGoals() {
    const list = $('#goalsList');
    if (!list) return;

    if (state.goals.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
          </svg>
          <div class="empty-state__title">No goals yet</div>
          <div class="empty-state__text">Create a savings goal to start tracking</div>
        </div>
      `;
      return;
    }

    list.innerHTML = state.goals.map(goal => {
      const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
      const remaining = goal.targetAmount - goal.savedAmount;
      const isComplete = progress >= 100;

      return `
        <div class="goal-card">
          <div class="goal-card__header">
            <div>
              <div class="goal-card__title">${goal.name}</div>
              <div class="goal-card__date">Target: ${formatDate(goal.targetDate)}</div>
            </div>
            <div class="goal-card__amount">${formatCurrency(goal.targetAmount)}</div>
          </div>
          
          <div class="goal-card__progress-wrapper">
            <div class="goal-card__progress-text">
              <span>Saved: ${formatCurrency(goal.savedAmount)}</span>
              <span>${isComplete ? 'Goal Reached!' : `${formatCurrency(remaining)} left`}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>

          ${!isComplete ? `
            <div class="goal-card__actions">
              <input type="number" id="allocInput-${goal.id}" class="goal-card__input" placeholder="Amount" min="1" step="0.01">
              <button class="btn btn--primary" onclick="window.appAllocFunds('${goal.id}')">Add Funds</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }
  
  window.appAllocFunds = function(id) {
    const input = document.getElementById(`allocInput-${id}`);
    if (input) {
      allocateFunds(id, parseFloat(input.value));
    }
  };

  // ─── Reports Module ──────────────────────────────────
  function getResetDate(now, resetDayStr) {
    const day = parseInt(resetDayStr, 10) || 1;
    let month = now.getMonth();
    let year = now.getFullYear();
    
    if (now.getDate() < day) {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    }
    const maxDays = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, maxDays));
  }

  function filterTransactionsByDate(transactions, rangeStr) {
    if (rangeStr === 'all-time') return transactions;
    const now = new Date();
    let startDate = new Date();
    
    if (rangeStr === 'this-week') {
      const day = now.getDay() || 7;
      startDate.setDate(now.getDate() - day + 1);
    } else if (rangeStr === 'this-month') {
      const resetStr = (state.preferences && state.preferences.resetDate) ? state.preferences.resetDate : 1;
      if (resetStr === 'last' || parseInt(resetStr, 10) === 1) {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = getResetDate(now, resetStr);
      }
    } else if (rangeStr === 'last-3-months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    }
    
    startDate.setHours(0, 0, 0, 0);
    return transactions.filter(t => new Date(t.date) >= startDate);
  }

  function generateReport() {
    const rangeSelect = $('#reportDateRange');
    const container = $('#reportSummaryCards');
    if (!rangeSelect || !container) return;

    const filtered = filterTransactionsByDate(state.transactions, rangeSelect.value);
    
    let inc = 0, exp = 0;
    filtered.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });
    
    const net = inc - exp;

    container.innerHTML = `
      <div class="summary-card summary-card--income">
        <div class="summary-card__header">
          <div class="summary-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
        </div>
        <div class="summary-card__label">Period Income</div>
        <div class="summary-card__value">${formatCurrency(inc)}</div>
      </div>
      
      <div class="summary-card summary-card--expense">
        <div class="summary-card__header">
          <div class="summary-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
          </div>
        </div>
        <div class="summary-card__label">Period Expenses</div>
        <div class="summary-card__value">${formatCurrency(exp)}</div>
      </div>
      
      <div class="summary-card summary-card--balance">
        <div class="summary-card__header">
          <div class="summary-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
            </svg>
          </div>
        </div>
        <div class="summary-card__label">Net Savings</div>
        <div class="summary-card__value">${formatCurrency(net)}</div>
      </div>
    `;
  }

  function exportToCSV() {
    const rangeSelect = $('#reportDateRange');
    const rangeStr = rangeSelect ? rangeSelect.value : 'all-time';
    const filtered = filterTransactionsByDate(state.transactions, rangeStr);

    const headers = ["Date", "Type", "Category", "Amount", "Currency", "Description"];
    const rows = [headers.join(',')];

    filtered.forEach(t => {
      let dateStr = formatDate(t.date);
      if (dateStr.includes(',')) dateStr = `"${dateStr}"`;

      let desc = t.description || '';
      if (desc.includes(',') || desc.includes('"')) {
        desc = `"${desc.replace(/"/g, '""')}"`;
      }

      const row = [
        dateStr,
        t.type,
        t.category,
        t.amount,
        state.currency,
        desc
      ];
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const userName = (state.user.name || 'User').replace(/\s+/g, '_');
    link.setAttribute('download', `Money_Map_Report_${userName}.csv`);

    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ─── Insights Module ─────────────────────────────────
  function analyzeFinances() {
    const list = $('#insightsList');
    if (!list) return;

    let cardsHTML = '';
    const thisMonth = filterTransactionsByDate(state.transactions, 'this-month');
    let inc = 0, exp = 0;
    const expenseByCategory = {};

    thisMonth.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else {
        exp += t.amount;
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      }
    });

    // 1. Deficit Check
    if (exp > inc && inc > 0) {
      cardsHTML += `
        <div class="insight-card insight-card--warning">
          <div class="insight-card__title">
            <svg class="insight-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Budget Deficit
          </div>
          <div class="insight-card__text">
            Your spending (${formatCurrency(exp)}) exceeds your income (${formatCurrency(inc)}) this month. Consider cutting down on non-essential categories.
          </div>
        </div>
      `;
    }

    // 2. High Spending Category Check
    if (exp > 0) {
      const targetCategories = ['Food', 'Entertainment'];
      targetCategories.forEach(cat => {
        if (expenseByCategory[cat]) {
          const percent = (expenseByCategory[cat] / exp) * 100;
          if (percent > 50) {
            cardsHTML += `
              <div class="insight-card insight-card--tip">
                <div class="insight-card__title">
                  <svg class="insight-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  High Spending Alert: ${cat}
                </div>
                <div class="insight-card__text">
                  You are spending ${percent.toFixed(0)}% of your money on ${cat}. Try setting a strict budget limit for this category next month.
                </div>
              </div>
            `;
          }
        }
      });
    }

    // 3. Savings Goal Motivation Check
    const hasProgressingGoals = state.goals.some(g => g.savedAmount > 0);
    if (hasProgressingGoals) {
      cardsHTML += `
        <div class="insight-card insight-card--success">
          <div class="insight-card__title">
            <svg class="insight-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Savings on Track
          </div>
          <div class="insight-card__text">
            Great job, ${state.user.name}! You are actively allocating funds and on track to hit your savings goals. Keep up the momentum!
          </div>
        </div>
      `;
    }

    if (!cardsHTML) {
      cardsHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <div class="empty-state__title">All Good!</div>
          <div class="empty-state__text">Add more transactions or goals to generate AI insights.</div>
        </div>
      `;
    }

    list.innerHTML = cardsHTML;
  }

  // ─── Initialize Application ────────────────────────
  function init() {
    loadState();
    setTheme(state.theme);
    setCurrency(state.currency);
    updateGreeting();

    renderCurrencyOptions();
    populateFilterCategories();
    
    // Topbar Theme
    const themeBtn = $('#themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Settings Theme Buttons
    $$('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        setTheme(btn.dataset.setTheme);
      });
    });

    // Topbar Currency
    const currBtn = $('#currencyBtn');
    if (currBtn) currBtn.addEventListener('click', toggleCurrencyDropdown);

    document.addEventListener('click', (e) => {
      const sel = $('#currencySelector');
      if (sel && !sel.contains(e.target)) closeCurrencyDropdown();
    });
    
    // Settings Currency Dropdown
    const currencySelect = $('#settingsCurrency');
    if (currencySelect) {
      currencySelect.value = state.currency;
      currencySelect.addEventListener('change', handleCurrencyChange);
    }
    
    // Preferences Forms
    const resetDateSel = $('#settingsResetDate');
    const alertThreshInput = $('#settingsAlertThreshold');
    if (resetDateSel) {
      resetDateSel.value = state.preferences.resetDate || 1;
      resetDateSel.addEventListener('change', handlePreferencesChange);
    }
    if (alertThreshInput) {
      alertThreshInput.value = state.preferences.alertThreshold || 80;
      alertThreshInput.addEventListener('change', handlePreferencesChange);
    }
    
    // Categories
    renderCategorySettings();
    const catForm = $('#addCategoryForm');
    if (catForm) catForm.addEventListener('submit', handleAddCategory);

    // Backup
    const exportBtn = $('#exportBackupBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportBackup);
    const importInput = $('#importBackupFile');
    if (importInput) importInput.addEventListener('change', importBackup);

    // Sidebar
    const menuBtn = $('#menuBtn');
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    const overlay = $('#sidebarOverlay');
    if (overlay) overlay.addEventListener('click', closeSidebar);

    $$('.nav-item').forEach(item => {
      item.addEventListener('click', () => setActiveNavItem(item));
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && state.sidebarOpen) closeSidebar();
    });

    // Modal
    const addBtn = $('#addTransactionBtn');
    if (addBtn) addBtn.addEventListener('click', () => openTransactionModal('expense'));

    const closeBtn = $('#modalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeTransactionModal);
    const cancelBtn = $('#modalCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeTransactionModal);

    const modalOverlay = $('#transactionModal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeTransactionModal();
      });
    }

    // Modal Type Toggle
    $$('#typeToggle .type-toggle__option').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#typeToggle .type-toggle__option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.type;
        $('#transactionType').value = type;
        populateModalCategories(type);
        
        const freqGroup = $('#frequencyGroup');
        if (freqGroup) {
          freqGroup.style.display = type === 'income' ? 'block' : 'none';
        }
      });
    });

    // Forms
    $('#transactionForm')?.addEventListener('submit', handleTransactionSubmit);
    $('#budgetForm')?.addEventListener('submit', handleBudgetSubmit);
    $('#goalForm')?.addEventListener('submit', addGoal);
    
    // Profile Form
    const profileForm = $('#profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#profileName').value.trim();
        const email = $('#profileEmail').value.trim();
        if (name && email) {
          state.user.name = name;
          state.user.email = email;
          saveState();
          updateGreeting();
          alert('Profile updated successfully!');
        }
      });
    }

    // Filters
    const filterType = $('#filterType');
    if (filterType) {
      filterType.addEventListener('change', () => {
        state.filters.type = filterType.value;
        renderTransactionTable();
      });
    }

    const filterCat = $('#filterCategory');
    if (filterCat) {
      filterCat.addEventListener('change', () => {
        state.filters.category = filterCat.value;
        renderTransactionTable();
      });
    }

    // Reports Range Filter
    const reportRange = $('#reportDateRange');
    if (reportRange) {
      reportRange.addEventListener('change', generateReport);
    }
    
    // Export Report
    const exportReportBtn = $('#exportReportBtn');
    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', exportToCSV);
    }

    // Tabs
    $$('.history-card__tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.history-card__tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeTxTab = tab.dataset.txTab;
        
        const tAddBtn = $('#addTransactionBtn');
        if (tAddBtn) {
          tAddBtn.innerHTML = `
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add ${state.activeTxTab === 'income' ? 'Income' : 'Expense'}
          `;
          
          const newAddBtn = tAddBtn.cloneNode(true);
          tAddBtn.parentNode.replaceChild(newAddBtn, tAddBtn);
          newAddBtn.addEventListener('click', () => openTransactionModal(state.activeTxTab));
        }

        renderTransactionTable();
      });
    });
    
    // Clear Data Functionality
    window.appOpenClearDataModal = function() {
      const modal = $('#clearDataModal');
      if (modal) modal.classList.add('open');
    };

    const confirmClearBtn = $('#confirmClearDataBtn');
    if (confirmClearBtn) {
      confirmClearBtn.addEventListener('click', () => {
        state.transactions = [];
        state.budgets = {};
        state.goals = [];
        saveState();
        
        updateSummaryCards();
        renderTransactionTable();
        renderBudgetList();
        renderGoals();
        updateCharts();
        generateReport();
        analyzeFinances();
        
        $('#clearDataModal').classList.remove('open');
        alert('All data has been cleared.');
      });
    }

    // Auth flows
    const loginForm = $('#loginForm');
    const loginError = $('#loginError');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const inEmail = $('#loginEmail').value.trim();
        const inPass = $('#loginPassword').value.trim();
        
        if (inEmail === 'student@university.edu' && inPass === 'password123') {
          if (loginError) loginError.style.display = 'none';
          state.user.isLoggedIn = true;
          state.user.email = inEmail;
          state.user.name = 'Student';

          saveState();
          transitionToApp();
        } else {
          if (loginError) loginError.style.display = 'block';
        }
      });
    }

    const demoLoginBtn = $('#demoLoginBtn');
    if (demoLoginBtn) {
      demoLoginBtn.addEventListener('click', () => {
        if (loginError) loginError.style.display = 'none';
        state.user.isLoggedIn = true;
        state.user.email = 'guest@demo.com';
        state.user.name = 'Guest';
        state.user.isGuest = true;    // Marks this as a guest session for auth.js
        state.user.photoURL = null;

        saveState();
        transitionToApp();
      });
    }

    function transitionToApp() {
      const authOverlay = $('#auth-overlay');
      const appLayout = $('#appLayout');
      
      authOverlay.style.transition = 'opacity 0.3s ease';
      authOverlay.style.opacity = '0';
      
      setTimeout(() => {
        authOverlay.style.display = 'none';
        authOverlay.style.opacity = '1'; 
        
        appLayout.style.opacity = '0';
        appLayout.style.display = 'flex';
        appLayout.style.transition = 'opacity 0.3s ease';
        
        requestAnimationFrame(() => {
          appLayout.style.opacity = '1';
        });
        
        $('#profileName').value = state.user.name;
        $('#profileEmail').value = state.user.email;
        updateGreeting();

        // Update sidebar avatar letter from user name (photo handled by auth.js if available)
        const avatar = $('#sidebarAvatar');
        if (avatar && !state.user.photoURL) {
          avatar.textContent = (state.user.name || 'U').charAt(0).toUpperCase();
        }
        const sidebarRole = $('#sidebarUserRole');
        if (sidebarRole) {
          sidebarRole.textContent = state.user.isGuest ? 'Guest Mode' : 'Free Plan';
        }
      }, 300);
    }

    const logoutBtn = $('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        state.user.isLoggedIn = false;
        state.user.isGuest = false;
        saveState();
        $('#auth-overlay').style.display = 'flex';
        $('#appLayout').style.display = 'none';
        
        $('#loginEmail').value = '';
        $('#loginPassword').value = '';
        
        navigateTo('dashboard'); // reset view
        // Note: Firebase sign-out is handled by auth.js which replaces this button's listener
      });
    }

    window.appSetUserState = function(userData) {
      state.user = { ...state.user, ...userData };
      saveState();
    };

    // Initialize UI Auth State
    if (state.user.isLoggedIn) {
      $('#auth-overlay').style.display = 'none';
      $('#appLayout').style.display = 'flex';
      
      const pName = $('#profileName');
      const pEmail = $('#profileEmail');
      if (pName) pName.value = state.user.name;
      if (pEmail) pEmail.value = state.user.email;
    } else {
      $('#auth-overlay').style.display = 'flex';
      $('#appLayout').style.display = 'none';
    }

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeTransactionModal();
        closeCurrencyDropdown();
        if (state.sidebarOpen) closeSidebar();
      }
    });

    console.log('💰 Money Map initialized successfully');
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

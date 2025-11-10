// All modules are now inline - no imports needed

// ============================================================================
// ABP Parser - Converts Adblock Plus syntax to Chrome Declarative Net Request
// ============================================================================
class ABPParser {
  constructor() {
    this.ruleIdCounter = 1000;
    this.scriptlets = [];
    this.cosmeticRules = [];
  }

  parseFilterList(rawText, listId) {
    const lines = rawText.split('\n');
    const dnrRules = [];
    const scriptlets = [];
    const cosmeticRules = [];
    let stats = {
      total: 0,
      networkRules: 0,
      cosmeticRules: 0,
      scriptlets: 0,
      exceptions: 0,
      comments: 0,
      invalid: 0
    };

    for (let line of lines) {
      line = line.trim();
      
      if (!line || line.startsWith('!') || line.startsWith('[')) {
        stats.comments++;
        continue;
      }

      stats.total++;

      if (line.includes('#@#') || line.includes('##') || line.includes('#?#')) {
        const cosmeticRule = this.parseCosmeticRule(line, listId);
        if (cosmeticRule) {
          cosmeticRules.push(cosmeticRule);
          stats.cosmeticRules++;
        }
      }
      else if (line.includes('##+js(') || line.includes('#+js(')) {
        const scriptlet = this.parseScriptlet(line, listId);
        if (scriptlet) {
          scriptlets.push(scriptlet);
          stats.scriptlets++;
        }
      }
      else if (line.includes('@@')) {
        const exceptionRule = this.parseExceptionRule(line, listId);
        if (exceptionRule) {
          dnrRules.push(exceptionRule);
          stats.exceptions++;
        }
      }
      else {
        const networkRule = this.parseNetworkRule(line, listId);
        if (networkRule) {
          dnrRules.push(networkRule);
          stats.networkRules++;
        } else {
          stats.invalid++;
        }
      }
    }

    return { dnrRules, scriptlets, cosmeticRules, stats };
  }

  parseNetworkRule(rule, listId) {
    try {
      let filter = rule;
      let options = {};
      
      if (rule.includes('$')) {
        const parts = rule.split('$');
        filter = parts[0];
        const optionsStr = parts.slice(1).join('$');
        options = this.parseOptions(optionsStr);
      }

      if (filter.startsWith('||')) {
        filter = filter.substring(2);
      } else if (filter.startsWith('|')) {
        filter = filter.substring(1);
      }

      if (filter.endsWith('^')) {
        filter = filter.slice(0, -1);
      }

      if (filter.length < 3) {
        return null;
      }

      const resourceTypes = options.types && options.types.length > 0
        ? options.types
        : ['script', 'image', 'xmlhttprequest', 'sub_frame'];

      const dnrRule = {
        id: this.ruleIdCounter++,
        priority: options.important ? 100 : 1,
        action: { type: 'block' },
        condition: {
          urlFilter: filter,
          resourceTypes: resourceTypes
        }
      };

      return dnrRule;
    } catch (error) {
      return null;
    }
  }

  parseExceptionRule(rule, listId) {
    try {
      let filter = rule.replace(/^@@/, '');
      if (filter.startsWith('||')) {
        filter = filter.substring(2);
      }
      if (filter.endsWith('^')) {
        filter = filter.slice(0, -1);
      }
      if (filter.length < 3) {
        return null;
      }

      return {
        id: this.ruleIdCounter++,
        priority: 2,
        action: { type: 'allow' },
        condition: {
          urlFilter: filter,
          resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame']
        }
      };
    } catch (error) {
      return null;
    }
  }

  parseCosmeticRule(rule, listId) {
    try {
      let selector = '';
      if (rule.includes('##')) {
        selector = rule.split('##')[1];
      } else if (rule.includes('#?#')) {
        selector = rule.split('#?#')[1];
      }
      if (!selector) return null;
      return {
        id: `cosmetic_${this.ruleIdCounter++}`,
        listId,
        selector
      };
    } catch (error) {
      return null;
    }
  }

  parseScriptlet(rule, listId) {
    try {
      const match = rule.match(/#\+js\(([^)]+)\)/);
      if (!match) return null;
      return {
        id: `scriptlet_${this.ruleIdCounter++}`,
        listId,
        scriptletName: match[1]
      };
    } catch (error) {
      return null;
    }
  }

  parseOptions(optionsStr) {
    const options = { types: [], important: false };
    const optionsList = optionsStr.split(',').map(o => o.trim());

    for (const option of optionsList) {
      if (option === 'important') {
        options.important = true;
      } else if (this.isValidResourceType(option)) {
        options.types.push(this.mapResourceType(option));
      }
    }
    return options;
  }

  isValidResourceType(type) {
    const validTypes = ['script', 'image', 'stylesheet', 'xmlhttprequest', 'subdocument', 'font', 'media'];
    return validTypes.includes(type);
  }

  mapResourceType(abpType) {
    const typeMap = {
      'subdocument': 'sub_frame',
      'xmlhttprequest': 'xmlhttprequest'
    };
    return typeMap[abpType] || abpType;
  }

  resetCounter(startId = 1000) {
    this.ruleIdCounter = startId;
  }
}

// ============================================================================
// Filter List Manager - Manages filter lists, fetching, caching, and updates
// ============================================================================
class FilterListManager {
  constructor() {
    this.lists = [];
    this.categories = {};
    this.parser = new ABPParser();
    this.maxDynamicRules = 30000;
    this.compiledRules = new Map();
    this.cosmeticRulesCache = new Map();
    this.scriptletsCache = new Map();
  }

  async initialize() {
    console.log('[FilterListManager] Inicializando sistema de listas...');
    
    try {
      const response = await fetch(chrome.runtime.getURL('filterLists.json'));
      const filterData = await response.json();
      
      this.lists = filterData.lists;
      this.categories = filterData.categories;

      await this.loadCachedData();
      
      console.log(`[FilterListManager] ${this.lists.length} listas configuradas`);
      console.log(`[FilterListManager] ${this.getEnabledLists().length} listas activadas`);
    } catch (error) {
      console.error('[FilterListManager] Error durante inicialización:', error);
    }
  }

  async loadCachedData() {
    try {
      const stored = await chrome.storage.local.get(['filterListsCache', 'compiledRulesCache']);
      
      if (stored.filterListsCache) {
        const cache = stored.filterListsCache;
        for (const list of this.lists) {
          if (cache[list.id]) {
            list.ruleCount = cache[list.id].ruleCount || 0;
            list.lastFetch = cache[list.id].lastFetch;
            list.etag = cache[list.id].etag;
            list.enabled = cache[list.id].enabled !== undefined ? cache[list.id].enabled : list.enabled;
          }
        }
      }

      if (stored.compiledRulesCache) {
        this.compiledRules = new Map(Object.entries(stored.compiledRulesCache));
      }
    } catch (error) {
      console.error('[FilterListManager] Error cargando caché:', error);
    }
  }

  async saveCachedData() {
    try {
      const cache = {};
      for (const list of this.lists) {
        cache[list.id] = {
          ruleCount: list.ruleCount,
          lastFetch: list.lastFetch,
          etag: list.etag,
          enabled: list.enabled
        };
      }

      const compiledRulesObj = Object.fromEntries(this.compiledRules);

      await chrome.storage.local.set({
        filterListsCache: cache,
        compiledRulesCache: compiledRulesObj
      });
    } catch (error) {
      console.error('[FilterListManager] Error guardando caché:', error);
    }
  }

  async refreshAllLists(force = false) {
    console.log('[FilterListManager] Actualizando listas de filtros...');
    const enabledLists = this.getEnabledLists();
    
    const promises = enabledLists.map(list => this.refreshList(list.id, force));
    await Promise.allSettled(promises);

    await this.applyDynamicRules();
    await this.saveCachedData();
  }

  async refreshList(listId, force = false) {
    const list = this.lists.find(l => l.id === listId);
    if (!list) return;

    console.log(`[FilterListManager] Actualizando: ${list.title}`);

    try {
      const allRules = [];

      for (const source of list.sources) {
        try {
          const response = await fetch(source.url);
          if (!response.ok) continue;

          const rawText = await response.text();
          const parsed = this.parser.parseFilterList(rawText, list.id);
          
          allRules.push(...parsed.dnrRules);

        } catch (sourceError) {
          console.error(`[FilterListManager] Error: ${source.title}`, sourceError);
        }
      }

      this.compiledRules.set(listId, allRules);
      list.ruleCount = allRules.length;
      list.lastFetch = Date.now();

      console.log(`[FilterListManager] ${list.title}: ${allRules.length} reglas`);

    } catch (error) {
      console.error(`[FilterListManager] Error: ${list.title}`, error);
    }
  }

  async applyDynamicRules() {
    console.log('[FilterListManager] Aplicando reglas dinámicas...');

    try {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const removeRuleIds = existingRules.map(r => r.id);

      const enabledLists = this.getEnabledLists();
      const allRules = [];

      for (const list of enabledLists) {
        const rules = this.compiledRules.get(list.id) || [];
        allRules.push(...rules);
      }

      const prioritizedRules = this.prioritizeRules(allRules, this.maxDynamicRules);

      console.log(`[FilterListManager] Aplicando ${prioritizedRules.length} reglas`);

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules: prioritizedRules
      });

      console.log('[FilterListManager] Reglas aplicadas exitosamente');
    } catch (error) {
      console.error('[FilterListManager] Error aplicando reglas:', error);
    }
  }

  prioritizeRules(rules, maxRules) {
    const prioritized = [...rules].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.id - b.id;
    });
    return prioritized.slice(0, maxRules);
  }

  async toggleList(listId, enabled) {
    const list = this.lists.find(l => l.id === listId);
    if (!list) return false;

    list.enabled = enabled;
    await this.applyDynamicRules();
    await this.saveCachedData();
    return true;
  }

  getEnabledLists() {
    return this.lists.filter(l => l.enabled);
  }

  getStatus() {
    const totalRules = this.getEnabledLists().reduce((sum, list) => sum + (list.ruleCount || 0), 0);
    
    return {
      lists: this.lists.map(list => ({
        id: list.id,
        title: list.title,
        category: list.category,
        enabled: list.enabled,
        ruleCount: list.ruleCount || 0,
        lastFetch: list.lastFetch,
        priority: list.priority
      })),
      categories: this.categories,
      summary: {
        totalLists: this.lists.length,
        enabledLists: this.getEnabledLists().length,
        totalRules: totalRules,
        maxRules: this.maxDynamicRules,
        utilizationPercent: Math.round((totalRules / this.maxDynamicRules) * 100)
      }
    };
  }
}

// ============================================================================
// AdBlock Pro Background - Main extension logic
// ============================================================================
class AdBlockProBackground {
  constructor() {
    this.stats = {
      total: 0,
      ads: 0,
      trackers: 0,
      miners: 0,
      malware: 0,
      fingerprint: 0,
      social: 0,
      cookies: 0,
      mlDetections: 0,
      popups: 0,
      clickjacking: 0,
      videoAds: 0,
      sites: new Set(),
      byDomain: {},
      history: []
    };

    // Per-tab statistics tracking
    this.tabStats = new Map();
    this.maxDomainsPerTab = 50;
    
    // Site-specific rules and breakage detection
    this.siteRules = {};
    this.breakageCandidates = new Map();
    this.breakageThreshold = 5;
    
    // SponsorBlock cache
    this.sponsorBlockCache = new Map();
    this.sponsorBlockCacheTimeout = 3600000; // 1 hour

    this.isEnabled = true;
    this.whitelist = new Set();
    this.settings = {
      blockLevel: 'basic',
      enableML: false,
      antiFingerprint: false,
      showNotifications: false,
      autoWhitelist: true,
      sponsorBlock: false,
      staticRulesEnabled: false
    };

    // Filter List Manager - Sistema de listas estilo Brave Shield
    this.filterListManager = new FilterListManager();
  }

  async initialize() {
    console.log('[AdBlock Pro] Inicializando v6.0.0 - Sistema de listas Brave Shield...');

    await this.loadSettings();
    
    // Initialize Filter List Manager
    await this.filterListManager.initialize();
    
    this.setupListeners();
    this.setupAlarms();
    await this.updateBadge();
    
    console.log('[AdBlock Pro] Inicialización completa - Protección avanzada activa');
    console.log('[AdBlock Pro] Listas de filtros cargadas:', this.filterListManager.getEnabledLists().length);
  }

  async loadSettings() {
    const stored = await chrome.storage.local.get([
      'stats', 'isEnabled', 'whitelist', 'settings', 'siteRules'
    ]);

    if (stored.stats) {
      this.stats = { ...this.stats, ...stored.stats };
      if (this.stats.sites && Array.isArray(this.stats.sites)) {
        this.stats.sites = new Set(this.stats.sites);
      }
    }

    this.isEnabled = stored.isEnabled !== false;
    this.whitelist = new Set(stored.whitelist || []);
    
    // Merge stored settings with defaults to preserve new features
    const defaultSettings = {
      blockLevel: 'basic',
      enableML: false,
      antiFingerprint: false,
      showNotifications: false,
      autoWhitelist: true,
      sponsorBlock: false,
      staticRulesEnabled: false
    };
    this.settings = { ...defaultSettings, ...stored.settings };
    
    // Load site-specific rules
    this.siteRules = stored.siteRules || {};

    // Apply static ruleset state on startup
    await this.applyStaticRulesetState();
  }

  async saveStats() {
    const statsToSave = {
      ...this.stats,
      sites: Array.from(this.stats.sites)
    };
    
    await chrome.storage.local.set({ stats: statsToSave });
    await this.updateBadge();
  }

  setupListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.updateBadge(activeInfo.tabId);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.injectContentScripts(tabId, tab.url);
      }
    });

    // Tab lifecycle: cleanup stats when tabs close
    chrome.tabs.onRemoved.addListener((tabId) => {
      if (this.tabStats.has(tabId)) {
        this.tabStats.delete(tabId);
        console.log(`[Background] Cleaned up stats for closed tab ${tabId}`);
      }
      if (this.breakageCandidates.has(tabId)) {
        this.breakageCandidates.delete(tabId);
      }
    });

    chrome.webNavigation.onCommitted.addListener((details) => {
      if (details.frameId === 0) {
        // Reset tab stats on navigation
        if (this.tabStats.has(details.tabId)) {
          this.tabStats.delete(details.tabId);
        }
        if (this.breakageCandidates.has(details.tabId)) {
          this.breakageCandidates.delete(details.tabId);
        }
        this.checkMaliciousSite(details.url, details.tabId);
        this.updateBadge(details.tabId);
      }
    });

    chrome.webRequest.onCompleted.addListener(
      (details) => this.analyzeRequest(details),
      { urls: ['<all_urls>'] }
    );

    // Listen for storage changes to sync state across tabs
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        if (changes.isEnabled) {
          this.isEnabled = changes.isEnabled.newValue;
          this.updateBadge();
          console.log('[Background] Extension state synced across tabs:', this.isEnabled);
        }
        if (changes.stats) {
          this.stats = { ...this.stats, ...changes.stats.newValue };
          if (this.stats.sites && Array.isArray(this.stats.sites)) {
            this.stats.sites = new Set(this.stats.sites);
          }
          this.updateBadge();
        }
      }
    });
  }

  setupAlarms() {
    chrome.alarms.create('resetDailyStats', {
      when: this.getNextMidnight(),
      periodInMinutes: 1440
    });

    chrome.alarms.create('updateBadge', {
      periodInMinutes: 1
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'resetDailyStats') {
        this.resetDailyStats();
      } else if (alarm.name === 'updateBadge') {
        this.updateBadge();
      }
    });
  }

  getNextMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
  }

  async resetDailyStats() {
    const today = new Date().toDateString();
    
    if (this.stats.history.length > 30) {
      this.stats.history = this.stats.history.slice(-30);
    }
    
    this.stats.history.push({
      date: today,
      blocked: this.stats.total
    });

    await this.saveStats();
  }

  async handleMessage(request, sender, sendResponse) {
    const { type } = request;

    try {
      switch (type) {
        case 'GET_STATS':
          sendResponse(await this.getStats());
          break;

        case 'GET_SETTINGS':
          sendResponse({
            isEnabled: this.isEnabled,
            settings: this.settings
          });
          break;

        case 'TOGGLE_ENABLED':
          this.isEnabled = request.enabled;
          await chrome.storage.local.set({ isEnabled: this.isEnabled });
          // Update badge on all tabs
          const tabs = await chrome.tabs.query({});
          for (const tab of tabs) {
            await this.updateBadge(tab.id);
          }
          await this.updateBadge();
          console.log('[Background] Protection toggled:', this.isEnabled ? 'ON' : 'OFF');
          sendResponse({ success: true, enabled: this.isEnabled });
          break;

        case 'ADD_WHITELIST':
          this.whitelist.add(request.domain);
          await chrome.storage.local.set({ whitelist: Array.from(this.whitelist) });
          sendResponse({ success: true });
          break;

        case 'REMOVE_WHITELIST':
          this.whitelist.delete(request.domain);
          await chrome.storage.local.set({ whitelist: Array.from(this.whitelist) });
          sendResponse({ success: true });
          break;

        case 'GET_WHITELIST':
          sendResponse({ whitelist: Array.from(this.whitelist) });
          break;

        case 'BLOCK_DETECTED':
          await this.recordBlock(request.data, sender.tab);
          sendResponse({ success: true });
          break;

        case 'FINGERPRINT_BLOCKED':
          this.stats.fingerprint++;
          await this.saveStats();
          sendResponse({ success: true });
          break;

        case 'ML_DETECTION':
          this.stats.mlDetections++;
          this.stats.ads++;
          this.stats.total++;
          await this.saveStats();
          sendResponse({ success: true });
          break;

        case 'POPUP_BLOCKED':
          this.stats.popups++;
          this.stats.total++;
          await this.saveStats();
          sendResponse({ success: true });
          break;

        case 'CLICKJACKING_BLOCKED':
          this.stats.clickjacking++;
          this.stats.total++;
          await this.saveStats();
          sendResponse({ success: true });
          break;

        case 'VIDEO_AD_BLOCKED':
          this.stats.videoAds++;
          this.stats.ads++;
          this.stats.total++;
          await this.saveStats();
          sendResponse({ success: true });
          break;

        case 'CUSTOM_RULE_ADDED':
          console.log('[Background] Nueva regla personalizada:', request.rule);
          sendResponse({ success: true });
          break;

        case 'UPDATE_FILTER_LISTS':
          await this.filterListManager.refreshAllLists(true);
          const status = this.filterListManager.getStatus();
          sendResponse({ success: true, rulesCount: status.summary.totalRules });
          break;

        case 'TOGGLE_FILTER_LIST':
          const toggleResult = await this.filterListManager.toggleList(request.listId, request.enabled);
          sendResponse({ success: toggleResult });
          break;

        case 'GET_FILTER_LISTS':
          sendResponse(this.filterListManager.getStatus());
          break;

        case 'REFRESH_FILTER_LISTS':
          this.filterListManager.refreshAllLists(false).then(() => {
            console.log('[Background] Listas actualizadas');
          });
          sendResponse({ success: true, message: 'Actualización iniciada' });
          break;

        case 'TOGGLE_STATIC_RULESET':
          const staticToggleResult = await this.toggleStaticRuleset(request.enabled);
          sendResponse({ 
            success: staticToggleResult, 
            enabled: this.settings.staticRulesEnabled 
          });
          break;

        case 'GET_STATIC_RULESET_STATUS':
          sendResponse({ 
            enabled: this.settings.staticRulesEnabled,
            ruleCount: 240
          });
          break;

        case 'EXPORT_DATA':
          const exportData = await this.exportData();
          sendResponse(exportData);
          break;

        case 'IMPORT_DATA':
          await this.importData(request.data);
          sendResponse({ success: true });
          break;

        case 'GET_COSMETIC_RULES':
          sendResponse({ rules: [] });
          break;

        case 'GET_TAB_STATS':
          if (request.tabId && this.tabStats.has(request.tabId)) {
            const tabData = this.tabStats.get(request.tabId);
            sendResponse({
              ...tabData,
              domains: Array.from(tabData.domains)
            });
          } else {
            sendResponse({ total: 0, ads: 0, trackers: 0, miners: 0, malware: 0, social: 0, domains: [] });
          }
          break;

        case 'PAGE_BREAKAGE':
          // User reported page breakage - suggest whitelisting
          const breakageDomain = new URL(request.url).hostname;
          this.breakageCandidates.set(request.tabId, {
            url: request.url,
            domain: breakageDomain,
            timestamp: Date.now(),
            userReported: true
          });
          sendResponse({ success: true, suggestWhitelist: breakageDomain });
          break;

        case 'GET_SPONSORBLOCK':
          if (request.videoId && this.sponsorBlockCache.has(request.videoId)) {
            const cached = this.sponsorBlockCache.get(request.videoId);
            if (Date.now() - cached.timestamp < this.sponsorBlockCacheTimeout) {
              sendResponse({ segments: cached.segments, cached: true });
              break;
            }
          }
          sendResponse({ segments: [], cached: false });
          break;

        case 'SET_SITE_RULE':
          const domain = request.domain;
          if (!this.siteRules[domain]) {
            this.siteRules[domain] = { allow: [], block: [] };
          }
          if (request.rule.type === 'allow') {
            this.siteRules[domain].allow.push(request.rule.pattern);
          } else if (request.rule.type === 'block') {
            this.siteRules[domain].block.push(request.rule.pattern);
          }
          await chrome.storage.local.set({ siteRules: this.siteRules });
          sendResponse({ success: true });
          break;

        case 'GET_SITE_RULES':
          sendResponse({ rules: this.siteRules[request.domain] || { allow: [], block: [] } });
          break;

        case 'URL_PARAMS_CLEANED':
          this.stats.trackers += request.count || 0;
          this.stats.total += request.count || 0;
          // Update per-tab stats
          if (sender.tab && sender.tab.id) {
            const tabData = this.getOrCreateTabStats(sender.tab.id);
            tabData.trackers += request.count || 0;
            tabData.total += request.count || 0;
            await this.updateBadge(sender.tab.id);
          }
          await this.saveStats();
          sendResponse({ success: true });
          break;

        case 'COOKIE_BANNERS_BLOCKED':
          this.stats.cookies = (this.stats.cookies || 0) + (request.count || 0);
          this.stats.total += request.count || 0;
          // Update per-tab stats
          if (sender.tab && sender.tab.id) {
            const tabData = this.getOrCreateTabStats(sender.tab.id);
            tabData.total += request.count || 0;
            await this.updateBadge(sender.tab.id);
          }
          await this.saveStats();
          sendResponse({ success: true });
          break;

        case 'SOCIAL_WIDGETS_BLOCKED':
          this.stats.social += request.count || 0;
          this.stats.total += request.count || 0;
          // Update per-tab stats
          if (sender.tab && sender.tab.id) {
            const tabData = this.getOrCreateTabStats(sender.tab.id);
            tabData.social += request.count || 0;
            tabData.total += request.count || 0;
            await this.updateBadge(sender.tab.id);
          }
          await this.saveStats();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[Background] Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async analyzeRequest(details) {
    if (!this.isEnabled) {
      console.log('[Background] Protection is OFF - skipping request analysis');
      return;
    }

    try {
      const url = new URL(details.url);
      const domain = url.hostname;

      if (this.whitelist.has(domain)) {
        return;
      }

      // ML analysis handled by content scripts
    } catch (error) {
      console.error('[Background] Error analyzing request:', error);
    }
  }

  async recordBlock(data, tab) {
    const { type, url, category } = data;
    const domain = url ? new URL(url).hostname : (tab ? new URL(tab.url).hostname : 'unknown');
    const tabId = tab ? tab.id : null;

    // Update global stats
    this.stats.total++;
    this.stats.sites.add(domain);

    if (!this.stats.byDomain[domain]) {
      this.stats.byDomain[domain] = {
        total: 0,
        ads: 0,
        trackers: 0,
        miners: 0,
        malware: 0,
        social: 0
      };
    }

    this.stats.byDomain[domain].total++;

    // Update per-tab stats
    if (tabId !== null) {
      const tabData = this.getOrCreateTabStats(tabId);
      tabData.total++;
      tabData.domains.add(domain);

      // Enforce max domains limit per tab
      if (tabData.domains.size > this.maxDomainsPerTab) {
        const domainsArray = Array.from(tabData.domains);
        tabData.domains = new Set(domainsArray.slice(-this.maxDomainsPerTab));
      }
    }

    switch (category) {
      case 'ads':
        this.stats.ads++;
        this.stats.byDomain[domain].ads++;
        if (tabId !== null) this.tabStats.get(tabId).ads++;
        break;
      case 'privacy':
      case 'tracking':
        this.stats.trackers++;
        this.stats.byDomain[domain].trackers++;
        if (tabId !== null) this.tabStats.get(tabId).trackers++;
        break;
      case 'miners':
        this.stats.miners++;
        this.stats.byDomain[domain].miners++;
        if (tabId !== null) this.tabStats.get(tabId).miners++;
        break;
      case 'security':
        this.stats.malware++;
        this.stats.byDomain[domain].malware++;
        if (tabId !== null) this.tabStats.get(tabId).malware++;
        break;
      case 'social':
        this.stats.social++;
        this.stats.byDomain[domain].social++;
        if (tabId !== null) this.tabStats.get(tabId).social++;
        break;
    }

    // Update badge for specific tab
    if (tabId !== null) {
      await this.updateBadge(tabId);
      
      // Check for potential breakage (too many blocks might indicate problems)
      const tabData = this.tabStats.get(tabId);
      if (tabData.total > this.breakageThreshold && this.settings.autoWhitelist) {
        this.checkForBreakage(tabId, tab.url, tabData.total);
      }
    }

    await this.saveStats();
  }

  async checkMaliciousSite(url, tabId) {
    try {
      // Malicious site checking handled by declarativeNetRequest rules
      // This keeps the background lightweight and efficient
    } catch (error) {
      console.error('[Background] Error checking malicious site:', error);
    }
  }

  async injectContentScripts(tabId, url) {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-script.js']
      });
    } catch (error) {
      console.error('[Background] Error injecting content script:', error);
    }
  }

  getOrCreateTabStats(tabId) {
    if (!this.tabStats.has(tabId)) {
      this.tabStats.set(tabId, {
        total: 0,
        ads: 0,
        trackers: 0,
        miners: 0,
        malware: 0,
        social: 0,
        domains: new Set()
      });
    }
    return this.tabStats.get(tabId);
  }

  async applyStaticRulesetState() {
    try {
      const rulesetIds = ['ruleset_main'];
      
      if (this.settings.staticRulesEnabled) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: rulesetIds
        });
        console.log('[AdBlock Pro] Ruleset estático activado (240 reglas)');
      } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: rulesetIds
        });
        console.log('[AdBlock Pro] Ruleset estático desactivado');
      }
    } catch (error) {
      console.error('[AdBlock Pro] Error aplicando estado del ruleset estático:', error);
    }
  }

  async toggleStaticRuleset(enabled) {
    this.settings.staticRulesEnabled = enabled;
    await chrome.storage.local.set({ settings: this.settings });
    await this.applyStaticRulesetState();
    console.log(`[AdBlock Pro] Ruleset estático ${enabled ? 'activado' : 'desactivado'}`);
    return true;
  }

  async updateBadge(tabId) {
    if (!this.isEnabled) {
      // When disabled, show OFF on all tabs
      const text = 'OFF';
      const color = '#ef4444';
      
      if (tabId) {
        await chrome.action.setBadgeText({ text, tabId });
        await chrome.action.setBadgeBackgroundColor({ color, tabId });
      } else {
        await chrome.action.setBadgeText({ text });
        await chrome.action.setBadgeBackgroundColor({ color });
      }
      return;
    }

    // When enabled, show per-tab counter or global total
    let count = 0;
    
    if (tabId) {
      // Always use tab-specific count (initialize if needed)
      count = this.getOrCreateTabStats(tabId).total;
    } else {
      // Use global count for default badge
      count = this.stats.total;
    }

    const text = count > 0 ? count.toString() : '0';
    const color = '#00d4ff';

    if (tabId) {
      await chrome.action.setBadgeText({ text, tabId });
      await chrome.action.setBadgeBackgroundColor({ color, tabId });
    } else {
      await chrome.action.setBadgeText({ text });
      await chrome.action.setBadgeBackgroundColor({ color });
    }
  }

  checkForBreakage(tabId, url, blockCount) {
    // Debounce breakage detection
    if (!this.breakageCandidates.has(tabId)) {
      this.breakageCandidates.set(tabId, { url, blockCount, timestamp: Date.now() });
      
      // Auto-clear after 10 seconds if user doesn't report
      setTimeout(() => {
        if (this.breakageCandidates.has(tabId)) {
          this.breakageCandidates.delete(tabId);
        }
      }, 10000);
      
      console.log(`[Background] Potential breakage detected on ${url}: ${blockCount} blocks`);
    }
  }

  async getStats() {
    const last7Days = this.stats.history.slice(-7).map(h => ({
      date: h.date,
      count: h.blocked
    }));

    return {
      total: this.stats.total,
      ads: this.stats.ads,
      trackers: this.stats.trackers,
      miners: this.stats.miners,
      malware: this.stats.malware,
      fingerprint: this.stats.fingerprint,
      social: this.stats.social,
      sites: this.stats.sites.size,
      byDomain: this.stats.byDomain,
      history: last7Days,
      isEnabled: this.isEnabled,
      mlDetections: this.stats.mlDetections,
      popups: this.stats.popups,
      clickjacking: this.stats.clickjacking,
      videoAds: this.stats.videoAds
    };
  }

  async exportData() {
    return {
      version: '3.0.0',
      timestamp: Date.now(),
      stats: {
        ...this.stats,
        sites: Array.from(this.stats.sites)
      },
      whitelist: Array.from(this.whitelist),
      settings: this.settings
    };
  }

  async importData(data) {
    if (data.stats) {
      this.stats = {
        ...data.stats,
        sites: new Set(data.stats.sites || [])
      };
    }
    
    if (data.whitelist) {
      this.whitelist = new Set(data.whitelist);
    }

    if (data.settings) {
      this.settings = data.settings;
    }

    await chrome.storage.local.set({
      stats: { ...this.stats, sites: Array.from(this.stats.sites) },
      whitelist: Array.from(this.whitelist),
      settings: this.settings
    });

    await this.saveStats();
  }
}

const adBlockPro = new AdBlockProBackground();
adBlockPro.initialize().catch(error => {
  console.error('[AdBlock Pro] Initialization error:', error);
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[AdBlock Pro] Primera instalación - Bienvenido!');
  } else if (details.reason === 'update') {
    console.log(`[AdBlock Pro] Actualizado a v3.0.0 desde ${details.previousVersion}`);
  }
});

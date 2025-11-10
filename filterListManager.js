class FilterListManager {
  constructor() {
    this.lists = [];
    this.categories = {};
    this.parser = new ABPParser();
    this.maxDynamicRules = 30000;
    this.maxRulesetsEnabled = 5;
    this.updateInterval = 4 * 60 * 60 * 1000;
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
      
      await this.refreshAllLists();

      this.scheduleUpdates();
      
      console.log('[FilterListManager] Inicialización completa.');
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

      console.log('[FilterListManager] Datos en caché cargados');
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

      console.log('[FilterListManager] Datos guardados en caché');
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
    
    console.log('[FilterListManager] Todas las listas actualizadas');
  }

  async refreshList(listId, force = false) {
    const list = this.lists.find(l => l.id === listId);
    if (!list) {
      console.error(`[FilterListManager] Lista ${listId} no encontrada`);
      return;
    }

    console.log(`[FilterListManager] Actualizando lista: ${list.title}`);

    try {
      const allRules = [];
      const allScriptlets = [];
      const allCosmeticRules = [];
      let totalStats = {
        total: 0,
        networkRules: 0,
        cosmeticRules: 0,
        scriptlets: 0,
        exceptions: 0,
        comments: 0,
        invalid: 0
      };

      for (const source of list.sources) {
        try {
          const fetchOptions = {
            headers: {}
          };

          if (!force && list.etag) {
            fetchOptions.headers['If-None-Match'] = list.etag;
          }

          const response = await fetch(source.url, fetchOptions);

          if (response.status === 304) {
            console.log(`[FilterListManager] ${source.title} sin cambios (304)`);
            continue;
          }

          if (!response.ok) {
            console.warn(`[FilterListManager] Error HTTP ${response.status} en ${source.title}`);
            continue;
          }

          const rawText = await response.text();
          
          if (response.headers.has('ETag')) {
            list.etag = response.headers.get('ETag');
          }

          const parsed = this.parser.parseFilterList(rawText, list.id);
          
          allRules.push(...parsed.dnrRules);
          allScriptlets.push(...parsed.scriptlets);
          allCosmeticRules.push(...parsed.cosmeticRules);

          totalStats.total += parsed.stats.total;
          totalStats.networkRules += parsed.stats.networkRules;
          totalStats.cosmeticRules += parsed.stats.cosmeticRules;
          totalStats.scriptlets += parsed.stats.scriptlets;
          totalStats.exceptions += parsed.stats.exceptions;
          totalStats.comments += parsed.stats.comments;
          totalStats.invalid += parsed.stats.invalid;

          console.log(`[FilterListManager] ${source.title}: ${parsed.dnrRules.length} reglas de red, ${parsed.cosmeticRules.length} cosméticas, ${parsed.scriptlets.length} scriptlets`);
        } catch (sourceError) {
          console.error(`[FilterListManager] Error descargando ${source.title}:`, sourceError);
        }
      }

      this.compiledRules.set(listId, allRules);
      this.cosmeticRulesCache.set(listId, allCosmeticRules);
      this.scriptletsCache.set(listId, allScriptlets);

      list.ruleCount = allRules.length;
      list.lastFetch = Date.now();

      console.log(`[FilterListManager] Lista ${list.title} actualizada: ${allRules.length} reglas DNR compiladas`);
      console.log(`[FilterListManager] Stats:`, totalStats);

    } catch (error) {
      console.error(`[FilterListManager] Error actualizando lista ${list.title}:`, error);
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

      console.log(`[FilterListManager] Aplicando ${prioritizedRules.length} reglas de ${allRules.length} disponibles`);

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules: prioritizedRules
      });

      console.log('[FilterListManager] Reglas dinámicas aplicadas exitosamente');
    } catch (error) {
      console.error('[FilterListManager] Error aplicando reglas dinámicas:', error);
    }
  }

  prioritizeRules(rules, maxRules) {
    const prioritizedRules = [...rules].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.id - b.id;
    });

    return prioritizedRules.slice(0, maxRules);
  }

  async toggleList(listId, enabled) {
    const list = this.lists.find(l => l.id === listId);
    if (!list) {
      console.error(`[FilterListManager] Lista ${listId} no encontrada`);
      return false;
    }

    console.log(`[FilterListManager] ${enabled ? 'Activando' : 'Desactivando'} lista: ${list.title}`);
    list.enabled = enabled;

    await this.applyDynamicRules();
    await this.saveCachedData();

    return true;
  }

  async toggleCategory(category, enabled) {
    const listsInCategory = this.lists.filter(l => l.category === category);
    
    for (const list of listsInCategory) {
      list.enabled = enabled;
    }

    await this.applyDynamicRules();
    await this.saveCachedData();

    console.log(`[FilterListManager] Categoría ${category}: ${enabled ? 'activada' : 'desactivada'} (${listsInCategory.length} listas)`);
  }

  getEnabledLists() {
    return this.lists.filter(l => l.enabled);
  }

  getListsByCategory(category) {
    return this.lists.filter(l => l.category === category);
  }

  getStatus() {
    const totalRules = this.getEnabledLists().reduce((sum, list) => sum + (list.ruleCount || 0), 0);
    const enabledCount = this.getEnabledLists().length;

    return {
      lists: this.lists.map(list => ({
        id: list.id,
        title: list.title,
        category: list.category,
        enabled: list.enabled,
        ruleCount: list.ruleCount || 0,
        lastFetch: list.lastFetch,
        priority: list.priority,
        requiresScriptlets: list.requiresScriptlets || false
      })),
      categories: this.categories,
      summary: {
        totalLists: this.lists.length,
        enabledLists: enabledCount,
        totalRules: totalRules,
        maxRules: this.maxDynamicRules,
        utilizationPercent: Math.round((totalRules / this.maxDynamicRules) * 100)
      }
    };
  }

  getCosmeticRules(domain) {
    const rules = [];
    const enabledLists = this.getEnabledLists();

    for (const list of enabledLists) {
      const cosmeticRules = this.cosmeticRulesCache.get(list.id) || [];
      
      for (const rule of cosmeticRules) {
        if (rule.exception) continue;
        
        if (rule.domains.length === 0) {
          rules.push(rule);
        } else if (rule.domains.includes(domain)) {
          rules.push(rule);
        }
      }
    }

    return rules;
  }

  getScriptlets(domain) {
    const scriptlets = [];
    const enabledLists = this.getEnabledLists();

    for (const list of enabledLists) {
      const listScriptlets = this.scriptletsCache.get(list.id) || [];
      
      for (const scriptlet of listScriptlets) {
        if (scriptlet.domains.length === 0) {
          scriptlets.push(scriptlet);
        } else if (scriptlet.domains.some(d => domain.includes(d))) {
          scriptlets.push(scriptlet);
        }
      }
    }

    return scriptlets;
  }

  scheduleUpdates() {
    chrome.alarms.create('updateFilterLists', {
      periodInMinutes: 240,
      delayInMinutes: 240
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'updateFilterLists') {
        console.log('[FilterListManager] Actualización automática programada activada');
        this.refreshAllLists(false);
      }
    });

    console.log('[FilterListManager] Actualizaciones automáticas programadas cada 4 horas');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FilterListManager;
}

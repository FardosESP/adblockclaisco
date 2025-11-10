class PopupUI {
  constructor() {
    this.stats = null;
    this.currentTab = 'overview';
    this.filterLists = [];
  }

  async initialize() {
    console.log('[Popup] Inicializando UI...');
    
    this.setupEventListeners();
    await this.loadCurrentTab();
    await this.loadStats();
    await this.startAutoRefresh();
  }

  setupEventListeners() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.switchTab(tabName);
      });
    });

    const toggleProtection = document.getElementById('toggleProtection');
    if (toggleProtection) {
      toggleProtection.addEventListener('change', (e) => {
        this.toggleProtection(e.target.checked);
      });
    }

    const elementPickerBtn = document.getElementById('elementPickerBtn');
    if (elementPickerBtn) {
      elementPickerBtn.addEventListener('click', () => {
        this.activateElementPicker();
      });
    }

    const addWhitelistBtn = document.getElementById('addWhitelistBtn');
    if (addWhitelistBtn) {
      addWhitelistBtn.addEventListener('click', () => {
        this.addCurrentSiteToWhitelist();
      });
    }

    const updateListsBtn = document.getElementById('updateListsBtn');
    if (updateListsBtn) {
      updateListsBtn.addEventListener('click', () => {
        this.updateFilterLists();
      });
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportData();
      });
    }

    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const fileInput = document.getElementById('importFile');
        if (fileInput) fileInput.click();
      });
    }

    const importFile = document.getElementById('importFile');
    if (importFile) {
      importFile.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.importData(e.target.files[0]);
        }
      });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetStats();
      });
    }

    const toggleML = document.getElementById('toggleML');
    if (toggleML) {
      toggleML.addEventListener('change', (e) => {
        this.toggleSetting('enableML', e.target.checked);
      });
    }

    const toggleNotifications = document.getElementById('toggleNotifications');
    if (toggleNotifications) {
      toggleNotifications.addEventListener('change', (e) => {
        this.toggleSetting('showNotifications', e.target.checked);
      });
    }
  }

  switchTab(tabName) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(tabName);

    if (activeBtn) activeBtn.classList.add('active');
    if (activeContent) activeContent.classList.add('active');

    this.currentTab = tabName;
    this.loadTabContent(tabName);
  }

  async loadTabContent(tabName) {
    switch (tabName) {
      case 'overview':
        await this.loadOverview();
        break;
      case 'stats':
        await this.loadStatistics();
        break;
      case 'lists':
        await this.loadFilterLists();
        break;
      case 'privacy':
        await this.loadPrivacySettings();
        break;
      case 'settings':
        await this.loadSettings();
        break;
    }
  }

  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        const url = new URL(tab.url);
        const domain = url.hostname;
        
        const currentDomainEl = document.getElementById('currentDomain');
        if (currentDomainEl) {
          currentDomainEl.textContent = domain;
        }
        
        if (this.stats && this.stats.byDomain && this.stats.byDomain[domain]) {
          const currentSiteBlockedEl = document.getElementById('currentSiteBlocked');
          if (currentSiteBlockedEl) {
            currentSiteBlockedEl.textContent = this.stats.byDomain[domain].total || 0;
          }
        }
      }
    } catch (error) {
      console.error('[Popup] Error loading current tab:', error);
    }
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (!response) return;
      
      this.stats = response;

      this.updateElement('quickAds', response.ads || 0);
      this.updateElement('quickTrackers', response.trackers || 0);
      this.updateElement('quickMalware', response.malware || 0);
      this.updateElement('quickSites', response.sites || 0);

      this.updateElement('totalBlocked', response.total || 0);
      this.updateElement('adsBlocked', response.ads || 0);
      this.updateElement('trackersBlocked', response.trackers || 0);
      this.updateElement('minersBlocked', response.miners || 0);
      this.updateElement('fingerprintBlocked', response.fingerprint || 0);
      this.updateElement('mlDetectionsBlocked', response.mlDetections || 0);
      this.updateElement('popupsBlocked', response.popups || 0);
      this.updateElement('clickjackingBlocked', response.clickjacking || 0);
      this.updateElement('videoAdsBlocked', response.videoAds || 0);

      const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (settingsResponse) {
        const toggleProtection = document.getElementById('toggleProtection');
        if (toggleProtection) {
          toggleProtection.checked = settingsResponse.isEnabled;
        }

        if (settingsResponse.settings) {
          this.updateToggle('toggleML', settingsResponse.settings.enableML);
          this.updateToggle('toggleNotifications', settingsResponse.settings.showNotifications);
        }
      }

    } catch (error) {
      console.error('[Popup] Error loading stats:', error);
    }
  }

  updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }

  updateToggle(id, checked) {
    const el = document.getElementById(id);
    if (el) {
      el.checked = checked;
    }
  }

  async loadOverview() {
    await this.loadCurrentTab();
  }

  async loadStatistics() {
    if (!this.stats || !this.stats.history) return;

    const chartBars = document.getElementById('chartBars');
    if (!chartBars) return;
    
    chartBars.innerHTML = '';

    const history = this.stats.history || [];
    const last7Days = history.slice(-7);

    if (last7Days.length === 0) {
      chartBars.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No hay datos históricos aún</div></div>';
      return;
    }

    const maxValue = Math.max(...last7Days.map(d => d.count || 0), 1);

    last7Days.forEach(day => {
      const wrapper = document.createElement('div');
      wrapper.className = 'chart-bar-wrapper';

      const value = document.createElement('div');
      value.className = 'chart-bar-value';
      value.textContent = day.count || 0;

      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const height = ((day.count || 0) / maxValue) * 100;
      bar.style.height = `${height}%`;

      const label = document.createElement('div');
      label.className = 'chart-bar-label';
      const date = new Date(day.date);
      label.textContent = date.toLocaleDateString('es-ES', { weekday: 'short' });

      wrapper.appendChild(value);
      wrapper.appendChild(bar);
      wrapper.appendChild(label);
      chartBars.appendChild(wrapper);
    });

    const topSitesList = document.getElementById('topSitesList');
    if (!topSitesList) return;
    
    topSitesList.innerHTML = '';

    if (this.stats.byDomain) {
      const sortedDomains = Object.entries(this.stats.byDomain)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);

      if (sortedDomains.length === 0) {
        topSitesList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🌐</div><div class="empty-state-text">Navega por la web y verás estadísticas aquí</div></div>';
        return;
      }

      sortedDomains.forEach(([domain, stats]) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        const badges = [];
        if (stats.ads > 0) badges.push(`<span class="badge">Ads: ${stats.ads}</span>`);
        if (stats.trackers > 0) badges.push(`<span class="badge badge-warning">Track: ${stats.trackers}</span>`);
        if (stats.malware > 0) badges.push(`<span class="badge badge-danger">Malware: ${stats.malware}</span>`);
        
        item.innerHTML = `
          <div style="flex: 1;">
            <div class="list-item-text" style="font-weight: 600; margin-bottom: 4px;">${domain}</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${badges.join('')}
            </div>
          </div>
          <div class="stat-row-value">${stats.total}</div>
        `;
        topSitesList.appendChild(item);
      });
    }
  }

  async loadFilterLists() {
    try {
      const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      const container = document.getElementById('filterListsContainer');
      if (!container) return;
      
      container.innerHTML = '';

      if (!settingsResponse || !settingsResponse.filterLists) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No hay listas de filtros disponibles</div></div>';
        return;
      }

      const filterInfo = [
        { key: 'easylist', name: 'EasyList', desc: 'Lista principal de anuncios' },
        { key: 'easyprivacy', name: 'EasyPrivacy', desc: 'Rastreadores y analytics' },
        { key: 'antiadblock', name: 'Anti-Adblock Killer', desc: 'Bypass detección adblock' },
        { key: 'fanboy_annoyance', name: 'Fanboy Annoyances', desc: 'Popups y elementos molestos' },
        { key: 'fanboy_social', name: 'Fanboy Social', desc: 'Widgets de redes sociales' },
        { key: 'malware_domains', name: 'Malware Domains', desc: 'Sitios maliciosos' },
        { key: 'urlhaus', name: 'URLhaus', desc: 'URLs de malware' },
        { key: 'adguard_base', name: 'AdGuard Base', desc: 'Filtros AdGuard' }
      ];

      filterInfo.forEach(info => {
        const toggle = document.createElement('div');
        toggle.className = 'feature-toggle';
        toggle.innerHTML = `
          <div class="feature-info">
            <h3>${info.name}</h3>
            <p>${info.desc}</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" data-list="${info.key}" checked>
            <span class="toggle-slider"></span>
          </label>
        `;

        const checkbox = toggle.querySelector('input');
        if (checkbox) {
          checkbox.addEventListener('change', (e) => {
            this.toggleFilterList(info.key, e.target.checked);
          });
        }

        container.appendChild(toggle);
      });

    } catch (error) {
      console.error('[Popup] Error loading filter lists:', error);
    }
  }

  async loadPrivacySettings() {
    try {
      const container = document.getElementById('privacyToggles');
      if (!container) return;
      
      container.innerHTML = '';

      const privacyFeatures = [
        { key: 'canvas', name: 'Canvas Fingerprinting', desc: 'Bloquear rastreo por Canvas' },
        { key: 'webgl', name: 'WebGL Fingerprinting', desc: 'Bloquear rastreo por WebGL' },
        { key: 'audio', name: 'Audio Fingerprinting', desc: 'Bloquear rastreo por Audio Context' },
        { key: 'fonts', name: 'Font Enumeration', desc: 'Bloquear detección de fuentes' },
        { key: 'battery', name: 'Battery API', desc: 'Bloquear Battery Status API' },
        { key: 'webrtc', name: 'WebRTC Leaks', desc: 'Prevenir fugas de IP WebRTC' },
        { key: 'hardware', name: 'Hardware Info', desc: 'Ocultar información de hardware' }
      ];

      privacyFeatures.forEach(feature => {
        const toggle = document.createElement('div');
        toggle.className = 'feature-toggle';
        toggle.innerHTML = `
          <div class="feature-info">
            <h3>${feature.name}</h3>
            <p>${feature.desc}</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" data-privacy="${feature.key}" checked>
            <span class="toggle-slider"></span>
          </label>
        `;
        container.appendChild(toggle);
      });

      const whitelistResponse = await chrome.runtime.sendMessage({ type: 'GET_WHITELIST' });
      const whitelistContainer = document.getElementById('whitelistContainer');
      if (!whitelistContainer) return;
      
      whitelistContainer.innerHTML = '';

      if (whitelistResponse && whitelistResponse.whitelist && whitelistResponse.whitelist.length > 0) {
        whitelistResponse.whitelist.forEach(domain => {
          const item = document.createElement('div');
          item.className = 'list-item';
          item.innerHTML = `
            <div class="list-item-text">${domain}</div>
            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 10px;">Eliminar</button>
          `;
          
          const removeBtn = item.querySelector('button');
          if (removeBtn) {
            removeBtn.addEventListener('click', () => {
              this.removeFromWhitelist(domain);
            });
          }

          whitelistContainer.appendChild(item);
        });
      } else {
        whitelistContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">No hay sitios en la whitelist</div></div>';
      }

    } catch (error) {
      console.error('[Popup] Error loading privacy settings:', error);
    }
  }

  async loadSettings() {
  }

  async toggleProtection(enabled) {
    try {
      await chrome.runtime.sendMessage({
        type: 'TOGGLE_ENABLED',
        enabled
      });
      
      this.showStatusMessage(
        enabled ? 'Protección activada' : 'Protección desactivada',
        enabled ? 'success' : 'error'
      );
      
      await this.loadStats();
      console.log(`[Popup] Protección ${enabled ? 'activada' : 'desactivada'}`);
    } catch (error) {
      console.error('[Popup] Error toggling protection:', error);
    }
  }

  async toggleSetting(key, value) {
    console.log(`[Popup] Setting ${key} = ${value}`);
  }

  async toggleFilterList(listKey, enabled) {
    try {
      await chrome.runtime.sendMessage({
        type: 'TOGGLE_FILTER_LIST',
        listKey,
        enabled
      });
      console.log(`[Popup] Filter list ${listKey} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('[Popup] Error toggling filter list:', error);
    }
  }

  async activateElementPicker() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_ELEMENT_PICKER' });
        window.close();
      }
    } catch (error) {
      console.error('[Popup] Error activating element picker:', error);
    }
  }

  async addCurrentSiteToWhitelist() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        const url = new URL(tab.url);
        const domain = url.hostname;
        
        await chrome.runtime.sendMessage({
          type: 'ADD_WHITELIST',
          domain
        });

        await this.loadStats();
        console.log(`[Popup] ${domain} añadido a whitelist`);
      }
    } catch (error) {
      console.error('[Popup] Error adding to whitelist:', error);
    }
  }

  async removeFromWhitelist(domain) {
    try {
      await chrome.runtime.sendMessage({
        type: 'REMOVE_WHITELIST',
        domain
      });
      await this.loadPrivacySettings();
      console.log(`[Popup] ${domain} eliminado de whitelist`);
    } catch (error) {
      console.error('[Popup] Error removing from whitelist:', error);
    }
  }

  async updateFilterLists() {
    try {
      const btn = document.getElementById('updateListsBtn');
      const statusEl = document.getElementById('updateStatus');
      if (!btn) return;
      
      const originalText = btn.textContent;
      btn.innerHTML = '<span class="loading"></span> Actualizando...';
      btn.disabled = true;

      const response = await chrome.runtime.sendMessage({ type: 'UPDATE_FILTER_LISTS' });
      const rulesCount = response?.rulesCount || 240;
      
      setTimeout(() => {
        btn.textContent = '✓ Actualizado';
        if (statusEl) {
          statusEl.textContent = `Lista actualizada: ${rulesCount} reglas activas`;
          statusEl.classList.add('show');
          statusEl.classList.remove('error');
        }
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
          if (statusEl) {
            statusEl.classList.remove('show');
          }
        }, 3000);
      }, 1000);

    } catch (error) {
      console.error('[Popup] Error updating filter lists:', error);
      const btn = document.getElementById('updateListsBtn');
      const statusEl = document.getElementById('updateStatus');
      if (btn) {
        btn.textContent = '✗ Error';
        if (statusEl) {
          statusEl.textContent = 'Error al actualizar las listas';
          statusEl.classList.add('show', 'error');
        }
        setTimeout(() => {
          btn.textContent = 'Actualizar Listas';
          btn.disabled = false;
          if (statusEl) {
            statusEl.classList.remove('show');
          }
        }, 2000);
      }
    }
  }

  showStatusMessage(message, type = 'success') {
    const statusEl = document.getElementById('updateStatus');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.add('show');
      if (type === 'error') {
        statusEl.classList.add('error');
      } else {
        statusEl.classList.remove('error');
      }
      setTimeout(() => {
        statusEl.classList.remove('show');
      }, 3000);
    }
  }

  async exportData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
      const dataStr = JSON.stringify(response, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `adblock-pro-backup-${Date.now()}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      console.log('[Popup] Datos exportados exitosamente');
    } catch (error) {
      console.error('[Popup] Error exporting data:', error);
    }
  }

  async importData(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      await chrome.runtime.sendMessage({
        type: 'IMPORT_DATA',
        data
      });

      await this.loadStats();
      console.log('[Popup] Datos importados exitosamente');
    } catch (error) {
      console.error('[Popup] Error importing data:', error);
    }
  }

  async resetStats() {
    if (!confirm('¿Estás seguro de que quieres reiniciar todas las estadísticas?')) {
      return;
    }

    try {
      await chrome.storage.local.set({
        stats: {
          total: 0,
          ads: 0,
          trackers: 0,
          miners: 0,
          malware: 0,
          fingerprint: 0,
          social: 0,
          sites: [],
          byDomain: {},
          history: []
        }
      });

      await this.loadStats();
      console.log('[Popup] Estadísticas reiniciadas');
    } catch (error) {
      console.error('[Popup] Error resetting stats:', error);
    }
  }

  async startAutoRefresh() {
    setInterval(() => {
      this.loadStats();
    }, 3000);
  }
}

const popupUI = new PopupUI();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    popupUI.initialize().catch(error => {
      console.error('[Popup] Initialization error:', error);
    });
  });
} else {
  popupUI.initialize().catch(error => {
    console.error('[Popup] Initialization error:', error);
  });
}

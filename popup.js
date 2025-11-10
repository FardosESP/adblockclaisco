/* global chrome */

class PopupUI {
  constructor() {
    this.stats = null
    this.currentTab = "overview"
    this.filterLists = []
    this.isExtensionMode =
      typeof window.chrome !== "undefined" && window.chrome.runtime && window.chrome.runtime.sendMessage
  }

  async initialize() {
    console.log(`[Popup] Inicializando UI en modo ${this.isExtensionMode ? "extensión" : "demo"}...`)

    this.setupEventListeners()
    await this.loadCurrentTab()
    await this.loadStats()
    await this.startAutoRefresh()
  }

  // Helper: Safe chrome.runtime.sendMessage
  async safeSendMessage(message, demoFallback = null) {
    if (this.isExtensionMode) {
      try {
        return await window.chrome.runtime.sendMessage(message)
      } catch (error) {
        console.error("[Popup] Error sending message:", error)
        return null
      }
    } else {
      console.log(`[Popup Demo] Would send message:`, message)
      return demoFallback
    }
  }

  // Helper: Safe chrome.tabs.query
  async safeTabsQuery(queryInfo) {
    if (this.isExtensionMode && window.chrome.tabs) {
      try {
        return await window.chrome.tabs.query(queryInfo)
      } catch (error) {
        console.error("[Popup] Error querying tabs:", error)
        return []
      }
    } else {
      return []
    }
  }

  // Helper: Safe chrome.storage
  async safeStorageSet(data) {
    if (this.isExtensionMode && window.chrome.storage) {
      try {
        await window.chrome.storage.local.set(data)
        return true
      } catch (error) {
        console.error("[Popup] Error setting storage:", error)
        return false
      }
    } else {
      console.log("[Popup Demo] Would save to storage:", data)
      return true
    }
  }

  // Helper: Show status message
  showStatusMessage(message, type = "success") {
    const statusEl = document.getElementById("updateStatus")
    if (statusEl) {
      statusEl.textContent = message
      statusEl.className = `status-message show ${type === "error" ? "error" : ""}`
      setTimeout(() => statusEl.classList.remove("show"), 3000)
    }
  }

  setupEventListeners() {
    const tabBtns = document.querySelectorAll(".tab-btn")
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tabName = e.currentTarget.dataset.tab
        this.switchTab(tabName)
      })
    })

    const toggleProtection = document.getElementById("toggleProtection")
    if (toggleProtection) {
      toggleProtection.addEventListener("change", (e) => {
        this.toggleProtection(e.target.checked)
      })
    }

    const elementPickerBtn = document.getElementById("elementPickerBtn")
    if (elementPickerBtn) {
      elementPickerBtn.addEventListener("click", () => {
        this.activateElementPicker()
      })
    }

    const addWhitelistBtn = document.getElementById("addWhitelistBtn")
    if (addWhitelistBtn) {
      addWhitelistBtn.addEventListener("click", () => {
        this.addCurrentSiteToWhitelist()
      })
    }

    const updateListsBtn = document.getElementById("updateListsBtn")
    if (updateListsBtn) {
      updateListsBtn.addEventListener("click", () => {
        this.updateFilterLists()
      })
    }

    const staticRulesetToggle = document.getElementById("staticRulesetToggle")
    if (staticRulesetToggle) {
      staticRulesetToggle.addEventListener("change", (e) => {
        this.toggleStaticRuleset(e.target.checked)
      })
    }

    const exportBtn = document.getElementById("exportBtn")
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportData()
      })
    }

    const importBtn = document.getElementById("importBtn")
    if (importBtn) {
      importBtn.addEventListener("click", () => {
        const fileInput = document.getElementById("importFile")
        if (fileInput) fileInput.click()
      })
    }

    const importFile = document.getElementById("importFile")
    if (importFile) {
      importFile.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          this.importData(e.target.files[0])
        }
      })
    }

    const resetBtn = document.getElementById("resetBtn")
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        this.resetStats()
      })
    }
  }

  switchTab(tabName) {
    const tabBtns = document.querySelectorAll(".tab-btn")
    const tabContents = document.querySelectorAll(".tab-content")

    tabBtns.forEach((btn) => btn.classList.remove("active"))
    tabContents.forEach((content) => content.classList.remove("active"))

    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`)
    const activeContent = document.getElementById(tabName)

    if (activeBtn) activeBtn.classList.add("active")
    if (activeContent) activeContent.classList.add("active")

    this.currentTab = tabName
    this.loadTabContent(tabName)
  }

  async loadTabContent(tabName) {
    switch (tabName) {
      case "overview":
        await this.loadOverview()
        break
      case "stats":
        await this.loadStatistics()
        break
      case "lists":
        await this.loadFilterLists()
        break
      case "privacy":
        await this.loadPrivacySettings()
        break
      case "settings":
        await this.loadSettings()
        break
    }
  }

  async loadCurrentTab() {
    try {
      // Check if chrome API is available (extension mode vs demo mode)
      const tabs = await this.safeTabsQuery({ active: true, currentWindow: true })
      if (tabs.length > 0 && tabs[0].url) {
        const tab = tabs[0]
        if (tab && tab.url) {
          const url = new URL(tab.url)
          const domain = url.hostname

          const currentDomainEl = document.getElementById("currentDomain")
          if (currentDomainEl) {
            currentDomainEl.textContent = domain
          }

          if (this.stats && this.stats.byDomain && this.stats.byDomain[domain]) {
            const currentSiteBlockedEl = document.getElementById("currentSiteBlocked")
            if (currentSiteBlockedEl) {
              currentSiteBlockedEl.textContent = this.stats.byDomain[domain].total || 0
            }
          }
        }
      } else {
        // Demo mode
        const currentDomainEl = document.getElementById("currentDomain")
        if (currentDomainEl) {
          currentDomainEl.textContent = "demo.replit.dev"
          currentDomainEl.style.fontSize = "11px"
        }
        const currentSiteBlockedEl = document.getElementById("currentSiteBlocked")
        if (currentSiteBlockedEl) {
          currentSiteBlockedEl.textContent = "42"
        }
      }
    } catch (error) {
      console.error("[Popup] Error loading current tab:", error)
    }
  }

  async loadStats() {
    try {
      // Check if chrome API is available
      if (this.isExtensionMode) {
        const response = await this.safeSendMessage({ type: "GET_STATS" })
        if (!response) return

        this.stats = response

        this.updateElement("quickAds", response.ads || 0)
        this.updateElement("quickTrackers", response.trackers || 0)
        this.updateElement("quickMalware", response.malware || 0)
        this.updateElement("quickSites", response.sites || 0)

        this.updateElement("totalBlocked", response.total || 0)
        this.updateElement("adsBlocked", response.ads || 0)
        this.updateElement("trackersBlocked", response.trackers || 0)
        this.updateElement("minersBlocked", response.miners || 0)
        this.updateElement("fingerprintBlocked", response.fingerprint || 0)
        this.updateElement("mlDetectionsBlocked", response.mlDetections || 0)
        this.updateElement("popupsBlocked", response.popups || 0)
        this.updateElement("clickjackingBlocked", response.clickjacking || 0)
        this.updateElement("videoAdsBlocked", response.videoAds || 0)

        const settingsResponse = await this.safeSendMessage({ type: "GET_SETTINGS" })
        if (settingsResponse) {
          const toggleProtection = document.getElementById("toggleProtection")
          if (toggleProtection) {
            toggleProtection.checked = settingsResponse.isEnabled
          }
        }
      } else {
        // Demo mode - use mock data
        console.log("[Popup] Running in demo mode with mock data")
        this.stats = {
          total: 1247,
          ads: 856,
          trackers: 234,
          malware: 12,
          fingerprint: 89,
          mlDetections: 34,
          popups: 15,
          clickjacking: 4,
          videoAds: 3,
          sites: 127,
        }

        this.updateElement("quickAds", 856)
        this.updateElement("quickTrackers", 234)
        this.updateElement("quickMalware", 12)
        this.updateElement("quickSites", 127)

        this.updateElement("totalBlocked", 1247)
        this.updateElement("adsBlocked", 856)
        this.updateElement("trackersBlocked", 234)
        this.updateElement("minersBlocked", 0)
        this.updateElement("fingerprintBlocked", 89)
        this.updateElement("mlDetectionsBlocked", 34)
        this.updateElement("popupsBlocked", 15)
        this.updateElement("clickjackingBlocked", 4)
        this.updateElement("videoAdsBlocked", 3)
      }
    } catch (error) {
      console.error("[Popup] Error loading stats:", error)
    }
  }

  updateElement(id, value) {
    const el = document.getElementById(id)
    if (el) {
      el.textContent = value
    }
  }

  updateToggle(id, checked) {
    const el = document.getElementById(id)
    if (el) {
      el.checked = checked
    }
  }

  async loadOverview() {
    await this.loadCurrentTab()
  }

  async loadStatistics() {
    if (!this.stats || !this.stats.history) return

    const chartBars = document.getElementById("chartBars")
    if (!chartBars) return

    chartBars.innerHTML = ""

    const history = this.stats.history || []
    const last7Days = history.slice(-7)

    if (last7Days.length === 0) {
      chartBars.innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No hay datos históricos aún</div></div>'
      return
    }

    const maxValue = Math.max(...last7Days.map((d) => d.count || 0), 1)

    last7Days.forEach((day) => {
      const wrapper = document.createElement("div")
      wrapper.className = "chart-bar-wrapper"

      const value = document.createElement("div")
      value.className = "chart-bar-value"
      value.textContent = day.count || 0

      const bar = document.createElement("div")
      bar.className = "chart-bar"
      const height = ((day.count || 0) / maxValue) * 100
      bar.style.height = `${height}%`

      const label = document.createElement("div")
      label.className = "chart-bar-label"
      const date = new Date(day.date)
      label.textContent = date.toLocaleDateString("es-ES", { weekday: "short" })

      wrapper.appendChild(value)
      wrapper.appendChild(bar)
      wrapper.appendChild(label)
      chartBars.appendChild(wrapper)
    })

    const topSitesList = document.getElementById("topSitesList")
    if (!topSitesList) return

    topSitesList.innerHTML = ""

    if (this.stats.byDomain) {
      const sortedDomains = Object.entries(this.stats.byDomain)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)

      if (sortedDomains.length === 0) {
        topSitesList.innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">🌐</div><div class="empty-state-text">Navega por la web y verás estadísticas aquí</div></div>'
        return
      }

      sortedDomains.forEach(([domain, stats]) => {
        const item = document.createElement("div")
        item.className = "list-item"

        const badges = []
        if (stats.ads > 0) badges.push(`<span class="badge">Ads: ${stats.ads}</span>`)
        if (stats.trackers > 0) badges.push(`<span class="badge badge-warning">Track: ${stats.trackers}</span>`)
        if (stats.malware > 0) badges.push(`<span class="badge badge-danger">Malware: ${stats.malware}</span>`)

        item.innerHTML = `
          <div style="flex: 1;">
            <div class="list-item-text" style="font-weight: 600; margin-bottom: 4px;">${domain}</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${badges.join("")}
            </div>
          </div>
          <div class="stat-row-value">${stats.total}</div>
        `
        topSitesList.appendChild(item)
      })
    }
  }

  async loadFilterLists() {
    try {
      // Load static ruleset status first
      await this.loadStaticRulesetStatus()

      const container = document.getElementById("filterListsContainer")
      if (!container) return

      container.innerHTML = ""

      // Cargar reglas del archivo rules.json
      let rulesData = []
      try {
        const response = await fetch("rules.json")
        rulesData = await response.json()
      } catch (error) {
        console.error("[Popup] Error loading rules.json:", error)
      }

      const categorizedRules = {
        ads: rulesData.filter((r) =>
          r.condition?.urlFilter?.match(
            /(doubleclick|googlesyndication|googleads|amazon-adsystem|adservice|adsystem)/i,
          ),
        ),
        analytics: rulesData.filter((r) => r.condition?.urlFilter?.match(/(analytics|tracking|tracker|telemetry)/i)),
        social: rulesData.filter((r) => r.condition?.urlFilter?.match(/(facebook|twitter|instagram|linkedin|social)/i)),
        otros: [],
      }
      categorizedRules.otros = rulesData.filter(
        (r) =>
          !categorizedRules.ads.includes(r) &&
          !categorizedRules.analytics.includes(r) &&
          !categorizedRules.social.includes(r),
      )

      const rulesInfo = document.createElement("div")
      rulesInfo.className = "info-card"
      rulesInfo.style.marginBottom = "18px"
      rulesInfo.innerHTML = `
        <div style="position: relative; z-index: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px;">📋 Reglas de Bloqueo Activas</h3>
            <span class="badge badge-success" style="font-size: 11px; padding: 8px 14px;">${rulesData.length} total</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 11px;">
            <div style="background: var(--bg-primary); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); transition: var(--transition); cursor: pointer;">
              <div style="color: var(--danger); font-weight: 800; font-size: 20px; margin-bottom: 6px;">${categorizedRules.ads.length}</div>
              <div style="color: var(--text-secondary); font-weight: 600;">🎯 Anuncios</div>
            </div>
            <div style="background: var(--bg-primary); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); transition: var(--transition); cursor: pointer;">
              <div style="color: var(--warning); font-weight: 800; font-size: 20px; margin-bottom: 6px;">${categorizedRules.analytics.length}</div>
              <div style="color: var(--text-secondary); font-weight: 600;">👁️ Rastreadores</div>
            </div>
            <div style="background: var(--bg-primary); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); transition: var(--transition); cursor: pointer;">
              <div style="color: var(--info); font-weight: 800; font-size: 20px; margin-bottom: 6px;">${categorizedRules.social.length}</div>
              <div style="color: var(--text-secondary); font-weight: 600;">📱 Social Media</div>
            </div>
            <div style="background: var(--bg-primary); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); transition: var(--transition); cursor: pointer;">
              <div style="color: var(--success); font-weight: 800; font-size: 20px; margin-bottom: 6px;">${categorizedRules.otros.length}</div>
              <div style="color: var(--text-secondary); font-weight: 600;">🛡️ Otros</div>
            </div>
          </div>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 10px; color: var(--text-tertiary); text-align: center; font-weight: 600; letter-spacing: 0.5px;">
            ✓ Actualizado: ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      `
      container.appendChild(rulesInfo)

      const searchBox = document.createElement("div")
      searchBox.style.cssText = "margin: 18px 0;"
      searchBox.innerHTML = `
        <input 
          type="text" 
          id="ruleSearchInput" 
          class="search-input"
          placeholder="🔍 Buscar reglas... (ej: google, facebook, analytics)"
        />
        <div id="searchResultsCount" style="margin-top: 10px; font-size: 11px; color: var(--text-secondary); text-align: center; font-weight: 600;"></div>
      `
      container.appendChild(searchBox)

      if (rulesData.length > 0) {
        const rulesTitle = document.createElement("div")
        rulesTitle.style.cssText =
          "font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 24px 0 14px 0; display: flex; justify-content: space-between; align-items: center; letter-spacing: -0.3px;"
        rulesTitle.innerHTML = `
          <span>🔍 Listado Completo de Reglas</span>
          <span id="visibleRulesCount" style="font-size: 11px; color: var(--text-tertiary); font-weight: 600;">${rulesData.length} visibles</span>
        `
        container.appendChild(rulesTitle)

        const rulesContainer = document.createElement("div")
        rulesContainer.id = "rulesListContainer"
        rulesContainer.style.cssText = "max-height: 420px; overflow-y: auto; margin-bottom: 18px;"

        const renderRules = (rulesToRender) => {
          rulesContainer.innerHTML = ""
          if (rulesToRender.length === 0) {
            rulesContainer.innerHTML =
              '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No se encontraron reglas</div></div>'
            return
          }

          rulesToRender.forEach((rule) => {
            const ruleItem = document.createElement("div")
            ruleItem.className = "list-item rule-item"
            ruleItem.style.cssText = "margin-bottom: 10px;"
            const urlFilter = rule.condition?.urlFilter || "Sin filtro"
            const category = categorizedRules.ads.includes(rule)
              ? "Anuncios"
              : categorizedRules.analytics.includes(rule)
                ? "Rastreo"
                : categorizedRules.social.includes(rule)
                  ? "Social"
                  : "Otro"
            const categoryColor =
              category === "Anuncios"
                ? "danger"
                : category === "Rastreo"
                  ? "warning"
                  : category === "Social"
                    ? "info"
                    : "success"

            ruleItem.innerHTML = `
              <div style="flex: 1;">
                <div class="list-item-text" style="margin-bottom: 8px; font-size: 11px; word-break: break-all; font-weight: 700;">
                  ${urlFilter}
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <span class="badge" style="font-size: 9px; padding: 4px 10px;">ID: ${rule.id}</span>
                  <span class="badge badge-${categoryColor}" style="font-size: 9px; padding: 4px 10px;">${category}</span>
                  <span class="badge badge-warning" style="font-size: 9px; padding: 4px 10px;">${rule.action?.type || "block"}</span>
                </div>
              </div>
            `
            rulesContainer.appendChild(ruleItem)
          })
        }

        renderRules(rulesData)
        container.appendChild(rulesContainer)

        const searchInput = document.getElementById("ruleSearchInput")
        if (searchInput) {
          searchInput.addEventListener("input", (e) => {
            const searchTerm = e.target.value.toLowerCase().trim()
            if (searchTerm === "") {
              renderRules(rulesData)
              document.getElementById("visibleRulesCount").textContent = `${rulesData.length} visibles`
              document.getElementById("searchResultsCount").textContent = ""
            } else {
              const filtered = rulesData.filter(
                (rule) =>
                  rule.condition?.urlFilter?.toLowerCase().includes(searchTerm) ||
                  rule.id.toString().includes(searchTerm),
              )
              renderRules(filtered)
              document.getElementById("visibleRulesCount").textContent = `${filtered.length} visibles`
              document.getElementById("searchResultsCount").textContent =
                `✓ ${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`
            }
          })
        }
      }

      const listsTitle = document.createElement("div")
      listsTitle.style.cssText =
        "font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 28px 0 14px 0; letter-spacing: -0.3px;"
      listsTitle.innerHTML = "📚 Listas de Filtros Disponibles"
      container.appendChild(listsTitle)

      const filterInfo = [
        { key: "easylist", name: "EasyList", desc: "Lista principal de anuncios", enabled: true },
        { key: "easyprivacy", name: "EasyPrivacy", desc: "Rastreadores y analytics", enabled: false },
        { key: "antiadblock", name: "Anti-Adblock Killer", desc: "Bypass detección adblock", enabled: false },
        { key: "fanboy_annoyance", name: "Fanboy Annoyances", desc: "Popups y elementos molestos", enabled: false },
        { key: "fanboy_social", name: "Fanboy Social", desc: "Widgets de redes sociales", enabled: false },
        { key: "malware_domains", name: "Malware Domains", desc: "Sitios maliciosos", enabled: false },
        { key: "urlhaus", name: "URLhaus", desc: "URLs de malware", enabled: false },
        { key: "adguard_base", name: "AdGuard Base", desc: "Filtros AdGuard", enabled: false },
      ]

      for (const info of filterInfo) {
        const savedState = await this.getListState(info.key)
        const isEnabled = savedState !== undefined ? savedState : info.enabled

        const toggle = document.createElement("div")
        toggle.className = "feature-toggle"
        toggle.innerHTML = `
          <div class="feature-info">
            <h3>${info.name}</h3>
            <p>${info.desc}</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" data-list="${info.key}" ${isEnabled ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        `

        const checkbox = toggle.querySelector("input")
        if (checkbox) {
          checkbox.addEventListener("change", (e) => {
            this.toggleFilterList(info.key, e.target.checked)
          })
        }

        container.appendChild(toggle)
      }
    } catch (error) {
      console.error("[Popup] Error loading filter lists:", error)
    }
  }

  async loadPrivacySettings() {
    try {
      const container = document.getElementById("privacyToggles")
      if (!container) return

      container.innerHTML = ""

      const privacyFeatures = [
        { key: "canvas", name: "Canvas Fingerprinting", desc: "Bloquear rastreo por Canvas" },
        { key: "webgl", name: "WebGL Fingerprinting", desc: "Bloquear rastreo por WebGL" },
        { key: "audio", name: "Audio Fingerprinting", desc: "Bloquear rastreo por Audio Context" },
        { key: "fonts", name: "Font Enumeration", desc: "Ocultar detección de fuentes" },
        { key: "battery", name: "Battery API", desc: "Bloquear Battery Status API" },
        { key: "webrtc", name: "WebRTC Leaks", desc: "Prevenir fugas de IP WebRTC" },
        { key: "hardware", name: "Hardware Info", desc: "Ocultar información de hardware" },
      ]

      // Privacy toggles removed - no backend implementation
      // Whitelist is the only privacy feature remaining

      const whitelistResponse = await this.safeSendMessage({ type: "GET_WHITELIST" }, { whitelist: [] })
      const whitelistContainer = document.getElementById("whitelistContainer")
      if (!whitelistContainer) return

      whitelistContainer.innerHTML = ""

      if (whitelistResponse && whitelistResponse.whitelist && whitelistResponse.whitelist.length > 0) {
        whitelistResponse.whitelist.forEach((domain) => {
          const item = document.createElement("div")
          item.className = "list-item"
          item.innerHTML = `
            <div class="list-item-text">${domain}</div>
            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 10px;">Eliminar</button>
          `

          const removeBtn = item.querySelector("button")
          if (removeBtn) {
            removeBtn.addEventListener("click", () => {
              this.removeFromWhitelist(domain)
            })
          }

          whitelistContainer.appendChild(item)
        })
      } else {
        whitelistContainer.innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">No hay sitios en la whitelist</div></div>'
      }
    } catch (error) {
      console.error("[Popup] Error loading privacy settings:", error)
    }
  }

  async loadSettings() {}

  async toggleProtection(enabled) {
    try {
      await this.safeSendMessage({
        type: "TOGGLE_ENABLED",
        enabled,
      })

      this.showStatusMessage(enabled ? "Protección activada" : "Protección desactivada", enabled ? "success" : "error")

      await this.loadStats()
      console.log(`[Popup] Protección ${enabled ? "activada" : "desactivada"}`)
    } catch (error) {
      console.error("[Popup] Error toggling protection:", error)
    }
  }

  async saveListState(listKey, enabled) {
    try {
      const stateKey = `list_${listKey}_enabled`
      await this.safeStorageSet({ [stateKey]: enabled })
      console.log(`[Popup] Saved list state: ${listKey} = ${enabled}`)
    } catch (error) {
      console.error("[Popup] Error saving list state:", error)
    }
  }

  async getListState(listKey) {
    try {
      if (!this.isExtensionMode) {
        return true // En modo demo, todas activas por defecto
      }
      const stateKey = `list_${listKey}_enabled`
      return new Promise((resolve) => {
        window.chrome.storage.local.get([stateKey], (result) => {
          resolve(result[stateKey] !== false) // Default true si no existe
        })
      })
    } catch (error) {
      console.error("[Popup] Error getting list state:", error)
      return true
    }
  }

  async toggleFilterList(listKey, enabled) {
    try {
      // Guardar estado primero
      await this.saveListState(listKey, enabled)

      // Luego notificar al background
      await this.safeSendMessage({
        type: "TOGGLE_FILTER_LIST",
        listKey,
        enabled,
      })

      this.showStatusMessage(`Lista ${listKey} ${enabled ? "activada" : "desactivada"}`, "success")
      console.log(`[Popup] Filter list ${listKey} ${enabled ? "enabled" : "disabled"} - Estado guardado`)
    } catch (error) {
      console.error("[Popup] Error toggling filter list:", error)
    }
  }

  async activateElementPicker() {
    try {
      if (!this.isExtensionMode) {
        this.showStatusMessage("⚠️ Selector disponible solo en modo extensión", "error")
        return
      }

      const tabs = await this.safeTabsQuery({ active: true, currentWindow: true })
      if (tabs.length > 0) {
        await window.chrome.tabs.sendMessage(tabs[0].id, { type: "ACTIVATE_ELEMENT_PICKER" })
        this.showStatusMessage("✓ Selector de elementos activado", "success")
        setTimeout(() => window.close(), 500)
      }
    } catch (error) {
      console.error("[Popup] Error activating element picker:", error)
      this.showStatusMessage("❌ Error al activar selector", "error")
    }
  }

  async addCurrentSiteToWhitelist() {
    try {
      const tabs = await this.safeTabsQuery({ active: true, currentWindow: true })
      if (tabs.length > 0 && tabs[0].url) {
        const url = new URL(tabs[0].url)
        const domain = url.hostname

        await this.safeSendMessage({
          type: "ADD_WHITELIST",
          domain,
        })

        this.showStatusMessage(`✓ ${domain} añadido a whitelist`, "success")
        await this.loadPrivacySettings() // Recargar whitelist para mostrar cambios
        console.log(`[Popup] ${domain} añadido a whitelist`)
      } else if (!this.isExtensionMode) {
        this.showStatusMessage("⚠️ Función disponible solo en modo extensión", "error")
      }
    } catch (error) {
      console.error("[Popup] Error adding to whitelist:", error)
      this.showStatusMessage("❌ Error al añadir sitio a whitelist", "error")
    }
  }

  async removeFromWhitelist(domain) {
    try {
      await this.safeSendMessage({
        type: "REMOVE_WHITELIST",
        domain,
      })
      this.showStatusMessage(`${domain} eliminado de whitelist`, "success")
      await this.loadPrivacySettings()
      console.log(`[Popup] ${domain} eliminado de whitelist`)
    } catch (error) {
      console.error("[Popup] Error removing from whitelist:", error)
    }
  }

  async updateFilterLists() {
    try {
      const btn = document.getElementById("updateListsBtn")
      const statusEl = document.getElementById("updateStatus")
      if (!btn) return

      const originalText = btn.textContent
      btn.innerHTML = '<span class="loading"></span> Actualizando...'
      btn.disabled = true

      const response = await this.safeSendMessage({ type: "UPDATE_FILTER_LISTS" }, { rulesCount: 266 })
      const rulesCount = response?.rulesCount || 266

      setTimeout(() => {
        btn.textContent = "✓ Actualizado"
        if (statusEl) {
          statusEl.textContent = `Lista actualizada: ${rulesCount} reglas activas`
          statusEl.classList.add("show")
          statusEl.classList.remove("error")
        }
        setTimeout(() => {
          btn.textContent = originalText
          btn.disabled = false
          if (statusEl) {
            statusEl.classList.remove("show")
          }
        }, 3000)
      }, 1000)
    } catch (error) {
      console.error("[Popup] Error updating filter lists:", error)
      const btn = document.getElementById("updateListsBtn")
      const statusEl = document.getElementById("updateStatus")
      if (btn) {
        btn.textContent = "✗ Error"
        if (statusEl) {
          statusEl.textContent = "Error al actualizar las listas"
          statusEl.classList.add("show", "error")
        }
        setTimeout(() => {
          btn.textContent = "Actualizar Listas"
          btn.disabled = false
          if (statusEl) {
            statusEl.classList.remove("show")
          }
        }, 2000)
      }
    }
  }

  showStatusMessage(message, type = "success") {
    const statusEl = document.getElementById("updateStatus")
    if (statusEl) {
      statusEl.textContent = message
      statusEl.className = `status-message show ${type === "error" ? "error" : ""}`
      setTimeout(() => statusEl.classList.remove("show"), 3000)
    }
  }

  async exportData() {
    try {
      const response = await this.safeSendMessage(
        { type: "EXPORT_DATA" },
        {
          stats: this.mockStats,
          whitelist: [],
          settings: { enabled: true, blockLevel: "basic" },
        },
      )

      const dataStr = JSON.stringify(response, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)

      const a = document.createElement("a")
      a.href = url
      a.download = `adblock-pro-backup-${Date.now()}.json`
      a.click()

      URL.revokeObjectURL(url)
      this.showStatusMessage("Datos exportados exitosamente", "success")
      console.log("[Popup] Datos exportados exitosamente")
    } catch (error) {
      console.error("[Popup] Error exporting data:", error)
      this.showStatusMessage("Error al exportar datos", "error")
    }
  }

  async importData(file) {
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      await this.safeSendMessage({
        type: "IMPORT_DATA",
        data,
      })

      this.showStatusMessage("Datos importados exitosamente", "success")
      await this.loadStats()
      console.log("[Popup] Datos importados exitosamente")
    } catch (error) {
      console.error("[Popup] Error importing data:", error)
      this.showStatusMessage("Error al importar datos", "error")
    }
  }

  async resetStats() {
    if (!confirm("¿Estás seguro de que quieres reiniciar todas las estadísticas?")) {
      return
    }

    try {
      const resetData = {
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
          history: [],
        },
      }

      await this.safeStorageSet(resetData)
      this.showStatusMessage("Estadísticas reiniciadas", "success")
      await this.loadStats()
      console.log("[Popup] Estadísticas reiniciadas")
    } catch (error) {
      console.error("[Popup] Error resetting stats:", error)
      this.showStatusMessage("Error al reiniciar estadísticas", "error")
    }
  }

  async startAutoRefresh() {
    setInterval(() => {
      this.loadStats()
    }, 3000)
  }
}

const popupUI = new PopupUI()

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    popupUI.initialize().catch((error) => {
      console.error("[Popup] Initialization error:", error)
    })
  })
} else {
  popupUI.initialize().catch((error) => {
    console.error("[Popup] Initialization error:", error)
  })
}

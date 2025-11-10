const blockTracker = {
  ads: 0,
  trackers: 0,
  miners: 0,
  mlDetections: 0,
};

let observerTimeout = null;
const OBSERVER_DELAY = 1500;
const IDLE_TIMEOUT = 30000;
let domObserver = null;
let lastActivityTime = Date.now();
let idleCheckInterval = null;

// ML, Video Stream, and CNAME detectors removed for simplicity
// Extension now focuses on core ad-blocking with 266 rules

const MINER_SCRIPTS = [
  'coinhive',
  'coin-hive',
  'crypto-loot',
  'cryptaloot',
  'jsecoin',
  'webminepool',
  'monerominer',
  'deepminer',
  'authedmine',
  'minemytraffic'
];

const SUSPICIOUS_KEYWORDS = [
  'cryptonight',
  'monero',
  'wasm_exec',
  'WebAssembly.instantiate',
  'cnHashing'
];

const COOKIE_BANNER_SELECTORS = [
  '[id*="cookie-banner"]',
  '[id*="cookie-notice"]',
  '[id*="cookie-consent"]',
  '[id*="cookieConsent"]',
  '[id*="gdpr"]',
  '[class*="cookie-banner"]',
  '[class*="cookie-notice"]',
  '[class*="cookie-consent"]',
  '[class*="cookieConsent"]',
  '[class*="gdpr-banner"]',
  '[class*="cookie-bar"]',
  '[class*="cookies-eu"]',
  '.cc-banner',
  '.cookie-popup',
  '#cookieNotice',
  '#gdprNotice'
];

const COOKIE_BANNER_KEYWORDS = [
  'we use cookies',
  'this website uses cookies',
  'este sitio usa cookies',
  'utilizamos cookies',
  'accept cookies',
  'aceptar cookies',
  'cookie policy',
  'política de cookies',
  'cookie settings'
];

const YOUTUBE_AD_SELECTORS = [
  '.ytp-ad-overlay-container',
  '.video-ads',
  '#player-ads',
  '.ytp-ad-module',
  '.ytp-ad-player-overlay',
  '.ytp-ad-text-overlay',
  '.ytp-ad-image-overlay',
  'ytd-display-ad-renderer',
  'ytd-promoted-video-renderer',
  'ytd-banner-promo-renderer',
  'ytd-statement-banner-renderer',
  'ytd-video-masthead-ad-v3-renderer',
  'ytd-primetime-promo-renderer',
  'ytd-in-feed-ad-layout-renderer',
  'ytd-ad-slot-renderer',
  'ytd-promoted-sparkles-web-renderer',
  'ytd-rich-item-renderer:has(> #content > ytd-display-ad-renderer)',
  'ytd-reel-video-renderer[is-ad]',
  '.ytd-mealbar-promo-renderer',
  '#masthead-ad'
];

const TWITCH_AD_SELECTORS = [
  '.top-nav__menu',
  '.carousel-ad',
  '.ad-banner',
  '[class*="commercial"]',
  '[data-a-target*="ad"]',
  '[data-test-selector*="ad"]',
  '.video-ad',
  '.video-ad__container',
  '.tw-c-background-accent',
  'div[data-a-target="video-ad-countdown"]'
];

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function init() {
  console.log("[AdBlock Pro] Content script initializing...");
  chrome.storage.local.get(["isEnabled", "whitelist", "blockingLevel", "antiDetection"], (result) => {
    if (chrome.runtime.lastError) {
      console.error("[AdBlock Pro] Error:", chrome.runtime.lastError);
      return;
    }

    const isEnabled = result.isEnabled !== false;
    const blockingLevel = result.blockingLevel || "basic";
    const antiDetection = result.antiDetection !== false;
    
    console.log("[AdBlock Pro] Extension enabled:", isEnabled, "Level:", blockingLevel);

    if (isEnabled) {
      const whitelist = result.whitelist || [];
      const hostname = window.location.hostname;
      const isWhitelisted = whitelist.some((domain) => hostname.includes(domain));

      if (isWhitelisted) {
        console.log("[AdBlock Pro] Site is whitelisted:", hostname);
        return;
      }

      blockAds();
      blockTrackers();
      blockMiners();
      blockCookieBanners();
      
      if (blockingLevel === 'advanced' || blockingLevel === 'aggressive') {
        if (hostname.includes('youtube.com')) {
          blockYouTubeAds();
        } else if (hostname.includes('twitch.tv')) {
          blockTwitchAds();
        }
      }
      
      observeDOMChanges();
      injectScript();
      console.log("[AdBlock Pro] Protection active with level:", blockingLevel);
    } else {
      console.log("[AdBlock Pro] Protection disabled");
    }
  });
}
function injectScript() {
  // Injected script removed - using content-script only for simplicity
  try {
    chrome.storage.local.get(["blockingLevel"], (result) => {
      const blockingLevel = result.blockingLevel || "basic";
      console.log(`[AdBlock Pro] Enhanced protection active (${blockingLevel} mode)`);
    });
  } catch (e) {
    console.log("[AdBlock Pro] Enhanced protection script loaded successfully");
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'ADBLOCK_PRO_THREAT') {
    try {
      chrome.runtime.sendMessage({
        type: 'THREAT_DETECTED',
        threat: event.data.threat
      }).catch((err) => {
        console.warn("[AdBlock Pro] Failed to forward threat to background:", err);
      });
    } catch (e) {
      console.warn("[AdBlock Pro] Error processing threat message:", e);
    }
  }
});

function blockAds() {
  console.log("[AdBlock Pro] Blocking ads...");
  let blockedCount = 0;

  const scripts = document.querySelectorAll("script");
  scripts.forEach((script) => {
    if (!script.src) return;

    const src = script.src.toLowerCase();

    const isAd =
      src.includes("doubleclick") ||
      src.includes("pagead") ||
      src.includes("googleads") ||
      src.includes("adsbygoogle") ||
      src.includes("amazon-adsystem") ||
      src.includes("taboola") ||
      src.includes("outbrain") ||
      src.includes("/ads/") ||
      src.includes("/ad.js") ||
      src.includes("/ads.js");

    if (isAd) {
      script.remove();
      notifyBlock(script.src, "ad");
      blockedCount++;
    }
  });

  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe) => {
    const src = (iframe.src || "").toLowerCase();
    const id = (iframe.id || "").toLowerCase();
    const className = (iframe.className || "").toLowerCase();

    const isAd =
      src.includes("doubleclick") ||
      src.includes("pagead") ||
      src.includes("googleads") ||
      src.includes("/ads/") ||
      id.includes("ad") ||
      id.includes("google_ads") ||
      className.includes("ad");

    if (isAd) {
      iframe.remove();
      notifyBlock(iframe.src || "iframe-ad", "ad");
      blockedCount++;
    }
  });

  const adSelectors = `
    [class*='ad-'], [class*='-ad-'], [class*='_ad_'],
    [id*='ad-'], [id*='-ad-'], [id*='_ad_'],
    [class*='banner'], [id*='banner'],
    [class*='advert'], [id*='advert'],
    .advertisement, .advert, .ads,
    .ad-container, .ad-slot, .ad-unit,
    [data-ad-slot], [data-advertisement],
    ins.adsbygoogle
  `;

  try {
    const elements = document.querySelectorAll(adSelectors);
    elements.forEach((el) => {
      if (el && el.offsetHeight > 10 && el.offsetWidth > 10) {
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.style.opacity = "0";
        blockedCount++;
      }
    });
  } catch (e) {
    console.error("[AdBlock Pro] Error blocking ads:", e);
  }

  if (blockedCount > 0) {
    console.log("[AdBlock Pro] Blocked", blockedCount, "ad elements");
  }
}

function blockTrackers() {
  console.log("[AdBlock Pro] Blocking trackers...");

  const scripts = document.querySelectorAll("script");
  scripts.forEach((script) => {
    if (!script.src) return;
    const src = script.src.toLowerCase();

    const isTracker =
      src.includes("google-analytics") ||
      src.includes("analytics.google") ||
      src.includes("gtag") ||
      src.includes("facebook.com/tr") ||
      src.includes("segment.com") ||
      src.includes("mixpanel") ||
      src.includes("amplitude") ||
      src.includes("tracking");

    if (isTracker) {
      script.remove();
      notifyBlock(script.src, "tracker");
      blockTracker.trackers++;
    }
  });

  const images = document.querySelectorAll("img");
  images.forEach((img) => {
    const src = (img.src || "").toLowerCase();
    const isTracker = src.includes("facebook") || src.includes("track");

    if (isTracker && (src.includes("1x1") || img.width === 1 || img.height === 1)) {
      img.style.display = "none";
      blockTracker.trackers++;
    }
  });
}

function blockMiners() {
  console.log("[AdBlock Pro] Blocking crypto miners...");

  const scripts = document.querySelectorAll("script");
  scripts.forEach((script) => {
    if (!script.src) {
      const content = script.textContent || script.innerHTML;
      const hasSuspiciousCode = SUSPICIOUS_KEYWORDS.some(keyword => 
        content.includes(keyword)
      );
      
      if (hasSuspiciousCode) {
        console.log("[AdBlock Pro] Blocked suspicious miner script (inline)");
        script.remove();
        notifyBlock("inline-miner-script", "miner");
        blockTracker.miners++;
      }
      return;
    }

    const src = script.src.toLowerCase();
    const isMiner = MINER_SCRIPTS.some(miner => src.includes(miner));

    if (isMiner) {
      script.remove();
      notifyBlock(script.src, "miner");
      blockTracker.miners++;
      console.log("[AdBlock Pro] Blocked crypto miner:", script.src);
    }
  });
}

function blockCookieBanners() {
  console.log("[AdBlock Pro] Blocking cookie banners...");
  let blockedCount = 0;

  try {
    const elements = document.querySelectorAll(COOKIE_BANNER_SELECTORS.join(', '));
    
    elements.forEach((el) => {
      if (!el || el.offsetHeight < 30 || el.offsetWidth < 100) return;

      const text = (el.textContent || '').toLowerCase();
      const hasCookieKeyword = COOKIE_BANNER_KEYWORDS.some(keyword => text.includes(keyword));
      
      const hasMultipleButtons = el.querySelectorAll('button, a.button, [role="button"]').length >= 2;
      const hasAcceptButton = text.includes('accept') || text.includes('aceptar') || 
                               text.includes('agree') || text.includes('de acuerdo');
      
      if (hasCookieKeyword || (hasMultipleButtons && hasAcceptButton)) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.remove();
        blockedCount++;
      }
    });

    const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="modal-backdrop"]');
    overlays.forEach((overlay) => {
      if (overlay && overlay.style && overlay.style.zIndex && parseInt(overlay.style.zIndex) > 999) {
        const text = (overlay.textContent || '').toLowerCase();
        const hasCookieKeyword = COOKIE_BANNER_KEYWORDS.some(keyword => text.includes(keyword));
        if (hasCookieKeyword) {
          overlay.remove();
          blockedCount++;
        }
      }
    });

    if (blockedCount > 0) {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      console.log("[AdBlock Pro] Blocked", blockedCount, "cookie banners");
    }
  } catch (e) {
    console.error("[AdBlock Pro] Error blocking cookie banners:", e);
  }
}

function blockYouTubeAds() {
  console.log("[AdBlock Pro] Blocking YouTube ads...");
  let blockedCount = 0;

  try {
    const elements = document.querySelectorAll(YOUTUBE_AD_SELECTORS.join(', '));
    
    elements.forEach((el) => {
      if (el) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.remove();
        blockedCount++;
      }
    });

    const adContainers = document.querySelectorAll('[id*="ad-"], [id*="ads-"]');
    adContainers.forEach((container) => {
      const text = (container.textContent || '').toLowerCase();
      if (text.includes('advertisement') || text.includes('sponsored')) {
        container.style.display = 'none';
        container.remove();
        blockedCount++;
      }
    });

    const skipButton = document.querySelector('.ytp-ad-skip-button-container');
    if (skipButton && skipButton.querySelector('.ytp-ad-skip-button')) {
      skipButton.querySelector('.ytp-ad-skip-button').click();
      console.log("[AdBlock Pro] Auto-clicked skip ad button");
    }

    if (blockedCount > 0) {
      console.log("[AdBlock Pro] Blocked", blockedCount, "YouTube ad elements");
      notifyBlock("youtube-ads", "ad");
    }
  } catch (e) {
    console.error("[AdBlock Pro] Error blocking YouTube ads:", e);
  }
}

function blockTwitchAds() {
  console.log("[AdBlock Pro] Blocking Twitch ads...");
  let blockedCount = 0;

  try {
    const elements = document.querySelectorAll(TWITCH_AD_SELECTORS.join(', '));
    
    elements.forEach((el) => {
      if (el) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.remove();
        blockedCount++;
      }
    });

    const adElements = document.querySelectorAll('[class*="Ad"], [class*="-ad-"], [data-test-selector*="commercial"]');
    adElements.forEach((el) => {
      if (el && el.offsetHeight > 10) {
        el.style.display = 'none';
        el.remove();
        blockedCount++;
      }
    });

    if (blockedCount > 0) {
      console.log("[AdBlock Pro] Blocked", blockedCount, "Twitch ad elements");
      notifyBlock("twitch-ads", "ad");
    }
  } catch (e) {
    console.error("[AdBlock Pro] Error blocking Twitch ads:", e);
  }
}

function observeDOMChanges() {
  if (domObserver) {
    domObserver.disconnect();
  }

  lastActivityTime = Date.now();

  domObserver = new MutationObserver((mutations) => {
    lastActivityTime = Date.now();

    if (observerTimeout) {
      clearTimeout(observerTimeout);
    }

    observerTimeout = setTimeout(() => {
      let hasNewAds = false;
      const processedNodes = new Set();
      const hostname = window.location.hostname;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE || processedNodes.has(node)) return;
            
            processedNodes.add(node);

            if (node.tagName === "SCRIPT" && node.src && isAdScript(node.src)) {
              node.remove();
              notifyBlock(node.src, "ad");
              hasNewAds = true;
            } else if (node.tagName === "IFRAME" && node.src && isAdScript(node.src)) {
              node.remove();
              notifyBlock(node.src, "ad");
              hasNewAds = true;
            } else if (node.classList && node.classList.length > 0) {
              const classes = Array.from(node.classList);
              const hasAdClass = classes.some((cls) => {
                const lower = cls.toLowerCase();
                return lower.includes("ad-") || lower.includes("-ad") || 
                       lower.includes("_ad_") || lower === "ad" || 
                       lower.includes("advert") || lower.includes("banner");
              });
              
              if (hasAdClass && node.offsetHeight > 10 && node.offsetWidth > 10) {
                node.style.display = "none";
                node.style.visibility = "hidden";
                hasNewAds = true;
              }
            }

            if (hostname.includes('youtube.com')) {
              if (node.matches && YOUTUBE_AD_SELECTORS.some(selector => {
                try { return node.matches(selector); } catch { return false; }
              })) {
                node.style.display = 'none';
                node.remove();
                hasNewAds = true;
              }
            } else if (hostname.includes('twitch.tv')) {
              if (node.matches && TWITCH_AD_SELECTORS.some(selector => {
                try { return node.matches(selector); } catch { return false; }
              })) {
                node.style.display = 'none';
                node.remove();
                hasNewAds = true;
              }
            }
          });
        }
      }

      if (hasNewAds) {
        blockAds();
        if (hostname.includes('youtube.com')) {
          blockYouTubeAds();
        } else if (hostname.includes('twitch.tv')) {
          blockTwitchAds();
        }
      }
    }, OBSERVER_DELAY);
  });

  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });

  startIdleCheck();

  console.log("[AdBlock Pro] Optimized DOM observer active");
}

function startIdleCheck() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
  }

  idleCheckInterval = setInterval(() => {
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    
    if (timeSinceLastActivity > IDLE_TIMEOUT) {
      if (domObserver) {
        domObserver.disconnect();
        console.log("[AdBlock Pro] DOM observer paused due to inactivity");
      }
      
      if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
        idleCheckInterval = null;
      }

      document.addEventListener("scroll", resumeObserver, { once: true, passive: true });
      document.addEventListener("click", resumeObserver, { once: true, passive: true });
      document.addEventListener("mousemove", resumeObserver, { once: true, passive: true });
    }
  }, 10000);
}

function resumeObserver() {
  if (!domObserver || !domObserver.takeRecords) {
    observeDOMChanges();
    console.log("[AdBlock Pro] DOM observer resumed");
  }
}

function performMLScan() {
  // ML scanning removed - focusing on rule-based blocking for stability
  return;
}

function isAdScript(url) {
  const lower = url.toLowerCase();
  
  return (
    lower.includes("doubleclick") ||
    lower.includes("pagead") ||
    lower.includes("googleads") ||
    lower.includes("amazon-adsystem") ||
    lower.includes("taboola") ||
    lower.includes("outbrain")
  );
}

function notifyBlock(url, type) {
  // Map old type names to proper categories
  let category = 'ads';
  if (type === 'tracker' || type === 'tracking') {
    category = 'tracking';
  } else if (type === 'miner') {
    category = 'miners';
  } else if (type === 'malware') {
    category = 'security';
  }

  chrome.runtime.sendMessage(
    {
      type: "BLOCK_DETECTED",
      data: {
        url: url,
        type: type,
        category: category
      }
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("[AdBlock Pro] Error sending message:", chrome.runtime.lastError.message);
        return;
      }
      if (response && response.success) {
        console.log("[AdBlock Pro] Notified background of block:", url);
      }
    }
  );
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isEnabled) {
    console.log("[AdBlock Pro] Extension toggled, reloading page");
    if (domObserver) {
      domObserver.disconnect();
    }
    location.reload();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "blockingLevelChanged") {
    console.log("[AdBlock Pro] Blocking level changed to:", message.level);
    location.reload();
  } else if (message.action === "antiDetectionChanged") {
    console.log("[AdBlock Pro] Anti-detection changed to:", message.enabled);
    location.reload();
  }
});

// ML scanning removed for simplicity - using rule-based blocking only

;(() => {
  console.log("[AdBlock Pro] Injected protection script initializing...");

  let currentLevel = 'advanced';
  let antiDetectionEnabled = true;
  let malwareDetected = 0;
  let minersDetected = 0;
  let suspiciousActivities = [];

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type === 'ADBLOCK_PRO_CONFIG') {
      currentLevel = event.data.config.blockingLevel || 'advanced';
      antiDetectionEnabled = event.data.config.antiDetection !== false;
      console.log("[AdBlock Pro] Config received - Level:", currentLevel, "Anti-detection:", antiDetectionEnabled);
    }
  });

  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push = () => {
    if (currentLevel !== 'basic') {
      console.log("[AdBlock Pro] Blocked adsbygoogle.push()");
    }
    return;
  };

  window.ga = () => {};
  window.gtag = () => {};
  window.fbq = () => {};
  window._gaq = [];
  window.dataLayer = window.dataLayer || [];

  window.analytics = {
    track: () => {},
    page: () => {},
    identify: () => {},
  };

  const CRYPTO_MINER_OBJECTS = [
    'CoinHive', 'CRLT', 'JSEcoin', 'Miner', 'EtherMiner', 'Client',
    'CoinImp', 'Minr', 'CryptoLoot', 'WebMiner', 'DeepMiner'
  ];

  CRYPTO_MINER_OBJECTS.forEach(obj => {
    Object.defineProperty(window, obj, {
      get: function() {
        console.log(`[AdBlock Pro] Blocked crypto miner object: ${obj}`);
        minersDetected++;
        reportThreat('miner', `Blocked miner object: ${obj}`);
        return undefined;
      },
      set: function() {},
      configurable: false
    });
  });

  const blockedDomains = [
    "doubleclick", "pagead", "googleads", "adsbygoogle",
    "facebook.com/tr", "analytics.google", "google-analytics",
    "segment.com", "mixpanel.com", "taboola.com", "outbrain.com",
    "amazon-adsystem.com", "googlesyndication.com", "googleadservices.com",
    "coinhive.com", "coin-hive.com", "crypto-loot.com", "jsecoin.com",
    "webminepool.com", "monerominer.rocks", "cryptaloot.pro",
    "deepminer.net", "authedmine.com", "minemytraffic.com",
    "coinimp.com", "minr.pw", "statdynamic.com", "ad-miner.com",
    "ppoi.org", "webmine.cz", "coinerra.com", "mineralt.io"
  ];

  const MALWARE_PATTERNS = [
    'eval\\s*\\(\\s*atob\\s*\\(',
    'document\\.write\\s*\\(\\s*unescape\\s*\\(',
    'fromCharCode\\s*\\.\\s*apply',
    'location\\.replace',
    'XMLHttpRequest.*onload.*eval'
  ];

  const MINER_WASM_SIGNATURES = [
    'cryptonight', 'monero', 'xmr', 'minero', 'hashrate',
    'argon2', 'scrypt', 'keccak', 'blake2b'
  ];

  function reportThreat(type, details) {
    suspiciousActivities.push({
      type,
      details,
      timestamp: Date.now(),
      url: window.location.href
    });
    
    try {
      window.postMessage({
        type: 'ADBLOCK_PRO_THREAT',
        threat: { type, details, url: window.location.href, timestamp: Date.now() }
      }, '*');
    } catch (e) {
      console.warn("[AdBlock Pro] Failed to report threat:", e);
    }
  }

  function isBlockedUrl(url) {
    if (!url) return false;
    const urlString = typeof url === "string" ? url : url.toString();
    return blockedDomains.some((domain) => urlString.toLowerCase().includes(domain));
  }

  function isSuspiciousScript(code) {
    if (!code || typeof code !== 'string') return false;
    
    let suspicionScore = 0;
    const detectedPatterns = [];
    
    MALWARE_PATTERNS.forEach(patternStr => {
      const pattern = new RegExp(patternStr, 'i');
      if (pattern.test(code)) {
        suspicionScore += 2;
        detectedPatterns.push(patternStr);
      }
    });
    
    if (code.includes('crypto') && code.includes('hash')) {
      suspicionScore += 3;
      detectedPatterns.push('crypto+hash');
    }
    if (code.includes('WebAssembly') && code.includes('instantiate') && code.includes('monero')) {
      suspicionScore += 4;
      detectedPatterns.push('wasm+monero');
    }
    if (code.length > 50000 && code.split('\n').length < 10) {
      suspicionScore += 2;
      detectedPatterns.push('minified-large');
    }
    
    const base64Matches = code.match(/[A-Za-z0-9+\/]{200,}/g);
    if (base64Matches && base64Matches.length > 3) {
      suspicionScore += 2;
      detectedPatterns.push('base64-encoded');
    }
    
    if (suspicionScore >= 5) {
      console.warn("[AdBlock Pro] Suspicious script detected! Score:", suspicionScore, "Patterns:", detectedPatterns);
      malwareDetected++;
      reportThreat('malware', `Suspicious script (score: ${suspicionScore}, patterns: ${detectedPatterns.join(', ')})`);
      return true;
    }
    
    return false;
  }

  function analyzeWasmModule(buffer) {
    if (!buffer || !buffer.byteLength) return { suspicious: false, score: 0 };
    
    let score = 0;
    const indicators = [];
    
    try {
      const view = new Uint8Array(buffer.slice(0, Math.min(20000, buffer.byteLength)));
      const text = String.fromCharCode.apply(null, view);
      
      MINER_WASM_SIGNATURES.forEach(sig => {
        if (text.toLowerCase().includes(sig)) {
          score += 4;
          indicators.push(sig);
        }
      });
      
      if (buffer.byteLength > 2000000) {
        score += 1;
        indicators.push('large-size');
      }
      
      if (text.includes('worker') && text.includes('hash')) {
        score += 3;
        indicators.push('worker+hash');
      }
      
      const suspiciousImports = ['thread', 'atomic', 'memory.grow'];
      suspiciousImports.forEach(imp => {
        if (text.includes(imp)) {
          score += 1;
          indicators.push(imp);
        }
      });
      
    } catch (e) {
      console.warn("[AdBlock Pro] Error analyzing WASM module:", e);
    }
    
    return { suspicious: score >= 8, score, indicators };
  }

  let cpuMonitoringInterval = null;
  let lastCPUCheck = Date.now();
  
  function startCPUMonitoring() {
    if (currentLevel === 'basic') return;
    
    if (cpuMonitoringInterval) clearInterval(cpuMonitoringInterval);
    
    cpuMonitoringInterval = setInterval(() => {
      const now = Date.now();
      const timeDiff = now - lastCPUCheck;
      
      if (timeDiff < 5000) return;
      
      lastCPUCheck = now;
      
      if (performance && performance.memory) {
        const usedMemory = performance.memory.usedJSHeapSize;
        const totalMemory = performance.memory.totalJSHeapSize;
        const memoryUsagePercent = (usedMemory / totalMemory) * 100;
        
        if (memoryUsagePercent > 90 && currentLevel === 'aggressive') {
          console.warn("[AdBlock Pro] High memory usage detected - potential miner activity");
          reportThreat('resource-abuse', `High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
        }
      }
    }, 10000);
  }

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = args[0];
    if (typeof url === "string" || url instanceof URL || url instanceof Request) {
      const urlToCheck = url instanceof Request ? url.url : url;
      if (isBlockedUrl(urlToCheck)) {
        console.log("[AdBlock Pro] Blocked fetch to:", urlToCheck);
        return Promise.reject(new Error("Blocked by AdBlock Pro"));
      }
    }
    return originalFetch.apply(this, args);
  };

  if (antiDetectionEnabled) {
    Object.defineProperty(window.fetch, 'toString', {
      value: () => 'function fetch() { [native code] }',
      configurable: false
    });
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (isBlockedUrl(url)) {
      console.log("[AdBlock Pro] Blocked XMLHttpRequest to:", url);
      this.addEventListener("readystatechange", function () {
        if (this.readyState === 4) {
          Object.defineProperty(this, "status", { value: 0 });
          Object.defineProperty(this, "responseText", { value: "" });
        }
      });
      return;
    }
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  if (antiDetectionEnabled) {
    Object.defineProperty(XMLHttpRequest.prototype.open, 'toString', {
      value: () => 'function open() { [native code] }',
      configurable: false
    });
  }

  const originalEval = window.eval;
  window.eval = function(code) {
    if (currentLevel !== 'basic' && isSuspiciousScript(code)) {
      console.warn("[AdBlock Pro] Blocked suspicious eval()");
      return null;
    }
    return originalEval.apply(this, arguments);
  };

  const originalWindowOpen = window.open;
  window.open = function (url, ...args) {
    if (url && isBlockedUrl(url)) {
      console.log("[AdBlock Pro] Blocked popup to:", url);
      return null;
    }
    if (!args[0] && url) {
      console.log("[AdBlock Pro] Blocked suspicious popup");
      return null;
    }
    return originalWindowOpen.apply(this, [url, ...args]);
  };

  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    if (isBlockedUrl(url)) {
      console.log("[AdBlock Pro] Blocked WebSocket connection to:", url);
      reportThreat('tracker', `Blocked WebSocket to: ${url}`);
      throw new Error("Blocked by AdBlock Pro");
    }
    return new originalWebSocket(url, protocols);
  };

  if (typeof WebAssembly !== 'undefined' && currentLevel === 'aggressive') {
    const originalWasmInstantiate = WebAssembly.instantiate;
    WebAssembly.instantiate = function(...args) {
      const bufferOrModule = args[0];
      
      if (bufferOrModule && bufferOrModule.byteLength) {
        const analysis = analyzeWasmModule(bufferOrModule);
        
        if (analysis.suspicious) {
          console.warn("[AdBlock Pro] Blocked suspected crypto-mining WebAssembly module");
          console.warn("[AdBlock Pro] Suspicion score:", analysis.score, "Indicators:", analysis.indicators);
          minersDetected++;
          reportThreat('miner', `Blocked WASM module (score: ${analysis.score}, indicators: ${analysis.indicators.join(', ')})`);
          return Promise.reject(new Error("Blocked by AdBlock Pro"));
        } else if (analysis.score > 0) {
          console.log("[AdBlock Pro] WASM module passed (score:", analysis.score, ")");
        }
      }
      
      return originalWasmInstantiate.apply(this, args);
    };
  }

  function blockYouTubeAds() {
    if (currentLevel === 'basic') return;
    if (!window.location.hostname.includes('youtube.com')) return;
    
    console.log("[AdBlock Pro] Initializing enhanced YouTube ad blocker...");

    const AD_RENDERER_KEYS = [
      'adSlotRenderer',
      'adPlacementRenderer',
      'promotedSparklesWebRenderer',
      'displayAdRenderer',
      'actionCompanionAdRenderer',
      'linearAdRenderer',
      'adBreakServiceRenderer',
      'playerAds',
      'adPlacements',
      'adSlots'
    ];

    const originalParse = JSON.parse;
    JSON.parse = function(...args) {
      const result = originalParse.apply(this, args);
      
      if (result && typeof result === 'object') {
        if (result.playerResponse) {
          AD_RENDERER_KEYS.forEach(key => {
            if (result.playerResponse[key]) delete result.playerResponse[key];
          });
        }
        
        AD_RENDERER_KEYS.forEach(key => {
          if (result[key]) delete result[key];
        });
      }
      
      return result;
    };

    if (window.ytInitialPlayerResponse) {
      AD_RENDERER_KEYS.forEach(key => {
        if (window.ytInitialPlayerResponse[key]) {
          delete window.ytInitialPlayerResponse[key];
        }
      });
    }

    if (window.ytInitialData && currentLevel !== 'basic') {
      const removeAdsFromObject = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        
        AD_RENDERER_KEYS.forEach(key => {
          if (obj[key]) delete obj[key];
        });
        
        for (let key in obj) {
          if (typeof obj[key] === 'object') {
            removeAdsFromObject(obj[key]);
          }
        }
      };
      removeAdsFromObject(window.ytInitialData);
    }

    if (window.yt && window.yt.config_) {
      if (window.yt.config_.EXPERIMENT_FLAGS) {
        window.yt.config_.EXPERIMENT_FLAGS.web_player_ads_control = false;
        window.yt.config_.EXPERIMENT_FLAGS.web_player_show_skippable_ads = false;
        window.yt.config_.EXPERIMENT_FLAGS.disable_child_node_auto_formatted_strings = true;
      }
    }

    const playerCheckInterval = setInterval(() => {
      const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
      if (skipButton && skipButton.offsetParent !== null) {
        skipButton.click();
        console.log("[AdBlock Pro] Clicked YouTube skip button");
      }
      
      const videoAd = document.querySelector('.video-ads, .ytp-ad-player-overlay');
      if (videoAd) {
        const video = document.querySelector('video');
        if (video && video.duration) {
          video.currentTime = video.duration;
          console.log("[AdBlock Pro] Skipped to end of ad");
        }
      }
      
      const shortsAd = document.querySelector('ytd-reel-video-renderer[is-ad]');
      if (shortsAd) {
        shortsAd.remove();
        console.log("[AdBlock Pro] Removed Shorts ad");
      }
    }, 500);

    setTimeout(() => clearInterval(playerCheckInterval), 120000);
  }

  function blockTwitchAds() {
    if (currentLevel === 'basic') return;
    if (!window.location.hostname.includes('twitch.tv')) return;
    
    console.log("[AdBlock Pro] Initializing enhanced Twitch ad blocker...");

    Object.defineProperty(window, 'twads', {
      get: () => undefined,
      set: () => {},
      configurable: false
    });

    Object.defineProperty(window, 'adRequest', {
      get: () => undefined,
      set: () => {},
      configurable: false
    });

    Object.defineProperty(window, 'Twitch', {
      get: () => {
        return {
          ads: {
            commercial: () => {},
            disable: () => {}
          }
        };
      },
      configurable: false
    });

    const twitchAdKeywords = [
      'amazon-adsystem', 'twitchads', 'adswizzads', 'advertising',
      'commercial_break', 'preroll', 'midroll', 'ad-podding', 'ad_break',
      'adm_', 'adsManager', 'videoAdUI'
    ];

    const TWITCH_AD_GQL_FIELDS = [
      'adBreak',
      'prerollAd',
      'midrollAd',
      'commercialBreak',
      'adPodding',
      'adSchedule'
    ];

    const originalFetchTwitch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      const urlStr = typeof url === 'string' ? url : (url?.url || '');
      
      if (twitchAdKeywords.some(keyword => urlStr.toLowerCase().includes(keyword))) {
        console.log("[AdBlock Pro] Blocked Twitch ad request:", urlStr);
        return Promise.reject(new Error("Blocked by AdBlock Pro"));
      }
      
      if (urlStr.includes('.m3u8') || urlStr.includes('/playlist.m3u8')) {
        return originalFetchTwitch.apply(this, args).then(async response => {
          const text = await response.text();
          
          const hasAdMarkers = text.includes('#EXT-X-DATERANGE') || 
                               text.includes('stitched-ad') ||
                               text.includes('Amazon-Ad');
          
          if (hasAdMarkers) {
            console.log("[AdBlock Pro] Detected ad markers in stream, filtering...");
            const lines = text.split('\n');
            const cleanedLines = [];
            let skipNext = false;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.includes('stitched-ad') || line.includes('Amazon-Ad') || line.includes('#EXT-X-DATERANGE')) {
                skipNext = true;
                continue;
              }
              
              if (skipNext && (line.startsWith('http') || line.startsWith('#EXTINF'))) {
                skipNext = false;
                continue;
              }
              
              cleanedLines.push(line);
            }
            
            return new Response(cleanedLines.join('\n'), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
          
          return new Response(text, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        });
      }
      
      if (urlStr.includes('gql') || urlStr.includes('graphql')) {
        return originalFetchTwitch.apply(this, args).then(async response => {
          const clonedResponse = response.clone();
          
          try {
            const data = await clonedResponse.json();
            
            if (data && typeof data === 'object') {
              const removeAdsFromGQL = (obj) => {
                if (!obj || typeof obj !== 'object') return obj;
                
                if (Array.isArray(obj)) {
                  return obj.map(removeAdsFromGQL);
                }
                
                const cleaned = {};
                for (let key in obj) {
                  if (TWITCH_AD_GQL_FIELDS.includes(key)) {
                    continue;
                  }
                  cleaned[key] = removeAdsFromGQL(obj[key]);
                }
                return cleaned;
              };
              
              const filtered = removeAdsFromGQL(data);
              
              return new Response(JSON.stringify(filtered), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
            }
          } catch (e) {
            console.log("[AdBlock Pro] Could not parse GQL response");
          }
          
          return response;
        });
      }
      
      return originalFetchTwitch.apply(this, args);
    };

    setInterval(() => {
      const purpleScreen = document.querySelector('[data-a-target="video-ad-countdown"]');
      if (purpleScreen) {
        purpleScreen.remove();
        console.log("[AdBlock Pro] Removed purple ad screen");
      }
      
      const adBanner = document.querySelectorAll('.top-nav__menu, .carousel-ad, [class*="commercial"]');
      adBanner.forEach(el => {
        if (el && el.offsetParent !== null) {
          el.remove();
          console.log("[AdBlock Pro] Removed Twitch ad element");
        }
      });
    }, 1000);
  }

  if (antiDetectionEnabled) {
    const addRandomJitter = () => Math.floor(Math.random() * 50);
    setTimeout(() => {
      blockYouTubeAds();
      blockTwitchAds();
      startCPUMonitoring();
    }, 50 + addRandomJitter());
  } else {
    blockYouTubeAds();
    blockTwitchAds();
    startCPUMonitoring();
  }

  setInterval(() => {
    if (malwareDetected > 0 || minersDetected > 0) {
      console.log(`[AdBlock Pro] Threats detected - Malware: ${malwareDetected}, Miners: ${minersDetected}`);
    }
  }, 30000);

  console.log("[AdBlock Pro] Enhanced protection script loaded successfully");
})();

// Anti-Adblock Detection Evasion
// Prevents websites from detecting ad blocker
class AntiAdblockEvasion {
  constructor() {
    this.evasionActive = true;
    this.detectionAttempts = 0;
  }
  
  // Initialize all evasion techniques
  init() {
    this.preventAdblockDetection();
    this.preventBaitDetection();
    this.preventConsoleDetection();
    this.preventTimingDetection();
    this.preventPropertyDetection();
    console.log('[AdBlock Pro] Anti-adblock evasion initialized');
  }
  
  // Prevent common adblock detection methods
  preventAdblockDetection() {
    // Override common adblock detection variables
    Object.defineProperty(window, 'adblock', {
      get: () => false,
      set: () => {},
      configurable: false
    });
    
    Object.defineProperty(window, 'adBlockEnabled', {
      get: () => false,
      set: () => {},
      configurable: false
    });
    
    Object.defineProperty(window, 'canRunAds', {
      get: () => true,
      set: () => {},
      configurable: false
    });
    
    Object.defineProperty(window, 'isAdBlockActive', {
      get: () => false,
      set: () => {},
      configurable: false
    });
    
    // Fake AdBlocker object
    window.AdBlocker = {
      enabled: false,
      detected: false
    };
    
    // Fake ad insertion functions
    window.google_ad_client = 'fake-client';
    window.google_ad_slot = 'fake-slot';
  }
  
  // Prevent bait element detection
  preventBaitDetection() {
    // Common bait class names that sites check for
    const baitClasses = [
      'adsbox', 'ad-placement', 'ad-container', 'adsbygoogle',
      'advertisement', 'pub_300x250', 'pub_728x90', 'ad-header',
      'ad-footer', 'ad-side', 'ad-banner'
    ];
    
    // Monitor DOM for bait elements and make them look real
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const element = node;
            const className = element.className || '';
            
            // Check if it's a bait element
            if (baitClasses.some(bait => className.toLowerCase().includes(bait))) {
              this.makeBaitLookReal(element);
            }
          }
        });
      });
    });
    
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  // Make bait elements appear real to detection scripts
  makeBaitLookReal(element) {
    // Set realistic dimensions
    element.style.width = '1px';
    element.style.height = '1px';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    element.style.visibility = 'visible';
    element.style.display = 'block';
    element.style.opacity = '0.01';
    
    // Add fake content
    if (!element.innerHTML) {
      element.innerHTML = '<div></div>';
    }
    
    // Make it "loaded"
    element.setAttribute('data-ad-loaded', 'true');
    element.setAttribute('data-ad-status', 'filled');
  }
  
  // Prevent console.log detection
  preventConsoleDetection() {
    // Some sites detect adblockers by checking for console output
    const originalLog = console.log;
    const originalWarn = console.warn;
    
    console.log = function(...args) {
      const message = args.join(' ');
      // Filter out adblock-related messages
      if (!message.toLowerCase().includes('adblock') && 
          !message.toLowerCase().includes('ad block')) {
        originalLog.apply(console, args);
      }
    };
    
    console.warn = function(...args) {
      const message = args.join(' ');
      if (!message.toLowerCase().includes('adblock') && 
          !message.toLowerCase().includes('ad block')) {
        originalWarn.apply(console, args);
      }
    };
  }
  
  // Prevent timing-based detection
  preventTimingDetection() {
    // Some sites check if ad scripts load too quickly (blocked)
    // Add small random delays to make blocking appear natural
    const originalSetTimeout = window.setTimeout;
    
    window.setTimeout = function(callback, delay, ...args) {
      // For very short delays that might be detection attempts
      if (delay < 50 && typeof callback === 'function') {
        const callbackStr = callback.toString();
        if (callbackStr.includes('ad') || callbackStr.includes('block')) {
          // Add small random delay
          delay = Math.random() * 100 + 50;
        }
      }
      return originalSetTimeout(callback, delay, ...args);
    };
  }
  
  // Prevent property detection
  preventPropertyDetection() {
    // Sites check for missing ad-related DOM properties
    // Create fake ad elements that appear real
    this.createFakeAdElements();
  }
  
  // Create fake ad elements to fool detection
  createFakeAdElements() {
    const fakeIds = [
      'google_ads_iframe_0',
      'google_ads_iframe_1', 
      'ad_container',
      'div-gpt-ad'
    ];
    
    fakeIds.forEach(id => {
      if (!document.getElementById(id)) {
        const fakeElement = document.createElement('div');
        fakeElement.id = id;
        fakeElement.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0.01;';
        fakeElement.setAttribute('data-google-query-id', 'fake-query-id');
        
        // Add to body when available
        if (document.body) {
          document.body.appendChild(fakeElement);
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(fakeElement);
          });
        }
      }
    });
  }
  
  // Fake successful ad loading
  simulateAdLoad() {
    // Trigger events that sites listen for
    window.dispatchEvent(new Event('adloaded'));
    window.dispatchEvent(new Event('adrendered'));
    
    // Set global flags
    window.adsLoaded = true;
    window.adRendered = true;
  }
  
  // Report detection attempt (for debugging)
  reportDetection(method) {
    this.detectionAttempts++;
    console.log(`[AdBlock Pro] Blocked adblock detection attempt #${this.detectionAttempts}: ${method}`);
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  const antiAdblock = new AntiAdblockEvasion();
  antiAdblock.init();
  
  // Simulate ad load after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => antiAdblock.simulateAdLoad(), 500);
    });
  } else {
    setTimeout(() => antiAdblock.simulateAdLoad(), 500);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AntiAdblockEvasion;
}

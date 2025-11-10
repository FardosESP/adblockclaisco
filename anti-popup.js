// Advanced Anti-Popup and Click-Jacking Protection Module

class AntiPopupProtector {
  constructor() {
    this.blockedPopups = 0;
    this.blockedClickjacking = 0;
    this.suspiciousElements = new WeakSet();
  }

  // Block aggressive popups and popunders
  blockPopups() {
    // Override window.open
    const originalOpen = window.open;
    const self = this;
    
    window.open = function(...args) {
      const url = args[0];
      
      // Check if popup is suspicious
      if (self.isSuspiciousPopup(url)) {
        console.log('[AdBlock Pro] Blocked suspicious popup:', url);
        self.blockedPopups++;
        
        // Report to background
        chrome.runtime.sendMessage({
          type: 'POPUP_BLOCKED',
          url: url
        });
        
        return null;
      }
      
      // Allow legitimate popups (user-initiated)
      const isUserInitiated = self.isUserInitiated();
      if (!isUserInitiated) {
        console.log('[AdBlock Pro] Blocked automatic popup:', url);
        self.blockedPopups++;
        return null;
      }
      
      return originalOpen.apply(this, args);
    };

    // Block popunders (new window that goes behind)
    window.addEventListener('blur', (e) => {
      if (document.hasFocus()) {
        const openedWindows = window.length;
        if (openedWindows > 1) {
          console.log('[AdBlock Pro] Potential popunder detected and blocked');
          self.blockedPopups++;
        }
      }
    }, { passive: true });
  }

  // Check if popup URL is suspicious
  isSuspiciousPopup(url) {
    if (!url || typeof url !== 'string') return false;
    
    const suspiciousPatterns = [
      /casino/i,
      /poker/i,
      /viagra/i,
      /cialis/i,
      /porn/i,
      /xxx/i,
      /dating/i,
      /singles/i,
      /pills/i,
      /pharmacy/i,
      /weight-?loss/i,
      /click-?here/i,
      /download-?now/i,
      /free-?money/i,
      /prize/i,
      /winner/i,
      /congratulations/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  // Check if action is user-initiated (within 1 second of user interaction)
  isUserInitiated() {
    const timeSinceInteraction = Date.now() - (this.lastUserInteraction || 0);
    return timeSinceInteraction < 1000;
  }

  // Track user interactions
  trackUserInteractions() {
    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.lastUserInteraction = Date.now();
      }, { passive: true, capture: true });
    });
  }

  // Block click-jacking attempts
  blockClickjacking() {
    // Prevent page from being loaded in iframe
    if (window.self !== window.top) {
      try {
        // Check if parent is same origin
        const parentUrl = window.parent.location.href;
      } catch (e) {
        // Cross-origin iframe detected - potential clickjacking
        console.warn('[AdBlock Pro] Potential clickjacking detected - page loaded in cross-origin iframe');
        this.blockedClickjacking++;
        
        // Break out of iframe
        if (window.top.location !== window.self.location) {
          window.top.location = window.self.location;
        }
      }
    }

    // Add X-Frame-Options equivalent via script
    const meta = document.createElement('meta');
    meta.httpEquiv = 'X-Frame-Options';
    meta.content = 'SAMEORIGIN';
    document.head.appendChild(meta);
  }

  // Detect and block overlay click-jacking
  detectOverlayClickjacking() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            this.checkForClickjackingOverlay(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Check if element is a clickjacking overlay
  checkForClickjackingOverlay(element) {
    try {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      // Suspicious characteristics
      const isFullScreen = rect.width >= window.innerWidth * 0.9 && rect.height >= window.innerHeight * 0.9;
      const isFixed = style.position === 'fixed';
      const isAbsolute = style.position === 'absolute';
      const highZIndex = parseInt(style.zIndex) > 9999;
      const isTransparent = parseFloat(style.opacity) < 0.1;
      const isInvisible = style.visibility === 'hidden' || style.display === 'none';
      
      // Clickjacking overlay pattern
      if ((isFixed || isAbsolute) && highZIndex && isFullScreen && (isTransparent || isInvisible)) {
        if (!this.suspiciousElements.has(element)) {
          console.warn('[AdBlock Pro] Clickjacking overlay detected and removed');
          element.remove();
          this.blockedClickjacking++;
          this.suspiciousElements.add(element);
          
          // Report to background
          chrome.runtime.sendMessage({
            type: 'CLICKJACKING_BLOCKED',
            url: window.location.href
          });
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Block redirect chains
  blockRedirectChains() {
    let redirectCount = 0;
    const maxRedirects = 2;
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const self = this;

    history.pushState = function(...args) {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        console.warn('[AdBlock Pro] Excessive redirect chain blocked');
        self.blockedPopups++;
        return;
      }
      return originalPushState.apply(this, args);
    };

    history.replaceState = function(...args) {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        console.warn('[AdBlock Pro] Excessive redirect chain blocked');
        self.blockedPopups++;
        return;
      }
      return originalReplaceState.apply(this, args);
    };

    // Reset counter after navigation completes
    setTimeout(() => {
      redirectCount = 0;
    }, 3000);
  }

  // Block aggressive notifications
  blockNotificationSpam() {
    const originalRequestPermission = Notification.requestPermission;
    const self = this;

    Notification.requestPermission = function() {
      console.log('[AdBlock Pro] Notification permission request blocked');
      self.blockedPopups++;
      return Promise.resolve('denied');
    };
  }

  // Get statistics
  getStats() {
    return {
      blockedPopups: this.blockedPopups,
      blockedClickjacking: this.blockedClickjacking,
      total: this.blockedPopups + this.blockedClickjacking
    };
  }

  // Initialize all protections
  initialize() {
    this.blockPopups();
    this.trackUserInteractions();
    this.blockClickjacking();
    this.detectOverlayClickjacking();
    this.blockRedirectChains();
    
    // Only block notification spam in aggressive mode
    chrome.storage.sync.get(['blockingLevel'], (result) => {
      if (result.blockingLevel === 'aggressive') {
        this.blockNotificationSpam();
      }
    });
    
    console.log('[AdBlock Pro] Anti-popup protection initialized');
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.antiPopupProtector = new AntiPopupProtector();
    window.antiPopupProtector.initialize();
  });
} else {
  window.antiPopupProtector = new AntiPopupProtector();
  window.antiPopupProtector.initialize();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AntiPopupProtector;
}

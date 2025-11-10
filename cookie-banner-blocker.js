// Cookie Banner Auto-Dismissal
// Automatically hide cookie consent banners
class CookieBannerBlocker {
  constructor() {
    this.reportTimeout = null;
    
    // Common cookie banner selectors
    this.bannerSelectors = [
      // Generic
      '[class*="cookie"][class*="banner"]',
      '[class*="cookie"][class*="notice"]',
      '[class*="cookie"][class*="consent"]',
      '[id*="cookie"][id*="banner"]',
      '[id*="cookie"][id*="notice"]',
      '[id*="cookie"][id*="consent"]',
      
      // Common frameworks
      '.cookie-policy', '.cookie-bar', '.cookie-notice', '.cookie-alert',
      '#cookie-law', '#cookie-notice', '#cookie-bar', '#cookie-consent',
      '.gdpr-banner', '.gdpr-notice', '.gdpr-consent',
      '#gdpr-banner', '#gdpr-notice', '#gdpr-consent',
      
      // Specific services
      '.cc-window', '.cc-banner', // CookieConsent
      '#onetrust-banner-sdk', '#onetrust-consent-sdk', // OneTrust
      '.cky-consent-container', // CookieYes
      '#cookiescript_injected', // CookieScript
      '.termly-styles-module', // Termly
      '#cmpbox', '#cmpbox2', // Various CMPs
      '.qc-cmp-ui-container', // Quantcast
      
      // Cookie walls
      '[class*="cookie-wall"]',
      '[id*="cookie-wall"]',
      
      // Privacy notices
      '[class*="privacy"][class*="notice"]',
      '[class*="privacy"][class*="banner"]'
    ];
    
    // Text patterns that indicate cookie banners
    this.textPatterns = [
      /we use cookies/i,
      /this (site|website) uses cookies/i,
      /accept (all )?cookies/i,
      /cookie (policy|preferences|settings|consent)/i,
      /gdpr/i,
      /privacy policy/i,
      /we and our partners/i,
      /by continuing to use/i
    ];
    
    // Accept button selectors
    this.acceptButtonSelectors = [
      '[class*="accept"][class*="cookie"]',
      '[class*="accept"][class*="all"]',
      '[id*="accept"][id*="cookie"]',
      'button[class*="accept"]',
      'a[class*="accept"]',
      '.cc-allow', '.cc-dismiss', '.cc-btn',
      '#onetrust-accept-btn-handler',
      '.cky-btn-accept'
    ];
    
    this.hiddenBanners = new Set();
    this.observer = null;
  }
  
  // Initialize banner blocking
  init() {
    this.scanAndHideBanners();
    this.observeDOM();
    
    // Re-scan periodically
    setInterval(() => {
      this.scanAndHideBanners();
    }, 2000);
  }
  
  // Scan page for cookie banners and hide them
  scanAndHideBanners() {
    let bannersFound = 0;
    
    // Try each selector
    this.bannerSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (this.isCookieBanner(element) && !this.hiddenBanners.has(element)) {
            this.hideBanner(element);
            bannersFound++;
          }
        });
      } catch (e) {
        // Invalid selector, skip
      }
    });
    
    // Also check for elements with cookie-related text
    this.scanByText();
    
    if (bannersFound > 0) {
      console.log(`[AdBlock Pro] Hid ${bannersFound} cookie banners`);
      
      // Notify background (debounced)
      this.reportBannersBlocked(bannersFound);
    }
    
    return bannersFound;
  }
  
  // Report blocked banners to background (debounced)
  reportBannersBlocked(count) {
    clearTimeout(this.reportTimeout);
    this.reportTimeout = setTimeout(() => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'COOKIE_BANNERS_BLOCKED',
          count: count
        }).catch(() => {});
      }
    }, 1000);
  }
  
  // Scan for banners by text content
  scanByText() {
    const candidates = document.querySelectorAll('div, aside, section, footer');
    
    candidates.forEach(element => {
      if (this.hiddenBanners.has(element)) return;
      
      const text = element.textContent || '';
      const matchesPattern = this.textPatterns.some(pattern => 
        pattern.test(text)
      );
      
      if (matchesPattern && this.looksLikeBanner(element)) {
        // Try to find and click accept button first
        const clicked = this.clickAcceptButton(element);
        
        // If no button found, just hide it
        if (!clicked) {
          this.hideBanner(element);
        }
      }
    });
  }
  
  // Check if element looks like a cookie banner
  isCookieBanner(element) {
    const className = element.className || '';
    const id = element.id || '';
    const text = (element.textContent || '').toLowerCase();
    
    // Check class/id for cookie/gdpr/consent keywords
    const hasKeyword = className.toLowerCase().match(/(cookie|gdpr|consent|privacy)/i) ||
                       id.toLowerCase().match(/(cookie|gdpr|consent|privacy)/i);
    
    // Check if text mentions cookies
    const mentionsCookies = this.textPatterns.some(pattern => pattern.test(text));
    
    return hasKeyword || mentionsCookies;
  }
  
  // Check if element looks like a banner (position, size, etc)
  looksLikeBanner(element) {
    const style = window.getComputedStyle(element);
    const position = style.position;
    
    // Fixed or absolute positioning suggests overlay
    if (position === 'fixed' || position === 'absolute') {
      return true;
    }
    
    // Large width suggests banner
    const width = element.offsetWidth;
    if (width > window.innerWidth * 0.7) {
      return true;
    }
    
    return false;
  }
  
  // Try to click accept button in banner
  clickAcceptButton(banner) {
    for (const selector of this.acceptButtonSelectors) {
      const button = banner.querySelector(selector);
      if (button && button.offsetParent !== null) {
        try {
          button.click();
          console.log('[AdBlock Pro] Auto-clicked cookie accept button');
          this.hiddenBanners.add(banner);
          return true;
        } catch (e) {
          // Click failed, continue
        }
      }
    }
    return false;
  }
  
  // Hide a banner element
  hideBanner(element) {
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('opacity', '0', 'important');
    element.style.setProperty('pointer-events', 'none', 'important');
    
    this.hiddenBanners.add(element);
    
    // Also remove backdrop/overlay if exists
    this.removeBackdrop();
  }
  
  // Remove page backdrop overlay
  removeBackdrop() {
    const backdrops = document.querySelectorAll(
      '[class*="backdrop"], [class*="overlay"], [class*="modal-backdrop"]'
    );
    
    backdrops.forEach(backdrop => {
      const style = window.getComputedStyle(backdrop);
      if (style.position === 'fixed' && style.zIndex > 1000) {
        backdrop.remove();
      }
    });
    
    // Re-enable scrolling if body was locked
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
  
  // Observe DOM for dynamically added banners
  observeDOM() {
    if (this.observer) return;
    
    this.observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      
      if (shouldScan) {
        this.scanAndHideBanners();
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Stop observing
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  const cookieBannerBlocker = new CookieBannerBlocker();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      cookieBannerBlocker.init();
    });
  } else {
    cookieBannerBlocker.init();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CookieBannerBlocker;
}

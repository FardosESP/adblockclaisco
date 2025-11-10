// Enhanced Social Media Widget Blocker
// Removes social media widgets and share buttons
class SocialWidgetBlocker {
  constructor() {
    this.reportTimeout = null;
    this.batchedCount = 0;
    
    // Social widget selectors
    this.selectors = [
      // Facebook
      '.fb-like', '.fb-share-button', '.fb-comments', '.fb-page',
      '#fb-root', '.fb_iframe_widget', '[class*="facebook"]',
      'iframe[src*="facebook.com/plugins"]',
      
      // Twitter/X
      '.twitter-share-button', '.twitter-follow-button', '.twitter-timeline',
      'iframe[src*="twitter.com/widgets"]', 'iframe[src*="platform.twitter.com"]',
      '[class*="twitter-"]', '#twitter-widget',
      
      // LinkedIn
      '.linkedin-share-button', '.IN-widget',
      'iframe[src*="linkedin.com"]', '[class*="linkedin"]',
      
      // Pinterest
      '[data-pin-do]', '.pinterest-share-button',
      'iframe[src*="pinterest.com"]', '[class*="pinterest"]',
      
      // Instagram
      '.instagram-media', 'iframe[src*="instagram.com"]',
      'blockquote[class*="instagram"]',
      
      // YouTube (embeds only, not main content)
      // This is handled separately to not break YouTube pages
      
      // Generic social
      '.social-share', '.share-buttons', '.social-buttons',
      '.addthis_toolbox', '.addthis_inline_share_toolbox',
      '.shareaholic-canvas', '.sharethis-inline-share-buttons',
      '.a2a_kit', // AddToAny
      
      // Comments systems
      '#disqus_thread', '.disqus-thread',
      '#discourse-comments',
      '.commento',
      
      // Social login buttons
      '.social-login', '[class*="social-login"]',
      '.auth-provider-facebook', '.auth-provider-google',
      
      // Floating share bars
      '.floating-share', '.sticky-share', '.share-sidebar',
      
      // "Follow us" widgets
      '[class*="follow-us"]', '[class*="social-follow"]'
    ];
    
    // Blocked widget count
    this.blockedCount = 0;
    this.observer = null;
  }
  
  // Initialize blocker
  init() {
    this.blockSocialWidgets();
    this.observeDOM();
    this.preventSocialScripts();
    
    // Re-scan periodically
    setInterval(() => this.blockSocialWidgets(), 1000);
  }
  
  // Block social widgets
  blockSocialWidgets() {
    let blocked = 0;
    
    this.selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element && element.offsetParent !== null) {
            this.hideElement(element);
            blocked++;
          }
        });
      } catch (e) {
        // Invalid selector
      }
    });
    
    // Also block by src/href patterns
    this.blockByURL();
    
    if (blocked > 0) {
      this.blockedCount += blocked;
      console.log(`[AdBlock Pro] Blocked ${blocked} social widgets (total: ${this.blockedCount})`);
      
      // Report to background (batched)
      this.reportBlockedWidgets(blocked);
    }
  }
  
  // Report blocked widgets to background (batched)
  reportBlockedWidgets(count) {
    clearTimeout(this.reportTimeout);
    this.batchedCount = (this.batchedCount || 0) + count;
    
    this.reportTimeout = setTimeout(() => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'SOCIAL_WIDGETS_BLOCKED',
          count: this.batchedCount
        }).catch(() => {});
      }
      this.batchedCount = 0;
    }, 2000);
  }
  
  // Block elements by URL patterns
  blockByURL() {
    const socialDomains = [
      'facebook.com/plugins',
      'platform.twitter.com',
      'linkedin.com/embed',
      'pinterest.com/pin',
      'instagram.com/embed',
      'reddit.com/embed',
      'platform.linkedin.com',
      'assets.pinterest.com',
      'connect.facebook.net',
      'platform.facebook.com'
    ];
    
    // Check iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const src = iframe.src || '';
      if (socialDomains.some(domain => src.includes(domain))) {
        this.hideElement(iframe);
      }
    });
    
    // Check scripts
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.src || '';
      if (socialDomains.some(domain => src.includes(domain))) {
        script.remove();
      }
    });
  }
  
  // Hide element
  hideElement(element) {
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('opacity', '0', 'important');
    element.setAttribute('data-social-blocked', 'true');
  }
  
  // Prevent social tracking scripts
  preventSocialScripts() {
    // Block Facebook SDK
    window.fbAsyncInit = function() {};
    if (window.FB) {
      window.FB = {
        init: () => {},
        ui: () => {},
        getLoginStatus: () => {},
        login: () => {}
      };
    }
    
    // Block Twitter widgets
    if (window.twttr) {
      window.twttr = {
        widgets: {
          load: () => {},
          createTimeline: () => {}
        }
      };
    }
    
    // Block LinkedIn
    if (window.IN) {
      window.IN = {
        parse: () => {},
        init: () => {}
      };
    }
    
    // Block Pinterest
    if (window.PinUtils) {
      window.PinUtils = {
        build: () => {}
      };
    }
    
    // Block AddThis
    if (window.addthis) {
      window.addthis = {
        init: () => {},
        toolbox: () => {},
        update: () => {}
      };
    }
  }
  
  // Observe DOM for new widgets
  observeDOM() {
    if (this.observer) return;
    
    this.observer = new MutationObserver((mutations) => {
      let shouldBlock = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              // Check if added node matches selectors
              this.selectors.forEach(selector => {
                try {
                  if (node.matches && node.matches(selector)) {
                    shouldBlock = true;
                  }
                } catch (e) {}
              });
            }
          });
        }
      }
      
      if (shouldBlock) {
        this.blockSocialWidgets();
      }
    });
    
    if (document.body) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  // Stop observing
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
  
  // Get stats
  getStats() {
    return {
      blockedCount: this.blockedCount
    };
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  const socialBlocker = new SocialWidgetBlocker();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      socialBlocker.init();
    });
  } else {
    socialBlocker.init();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SocialWidgetBlocker;
}

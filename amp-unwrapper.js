// AMP Page Unwrapper
// Redirects from AMP pages to canonical pages for better privacy
class AMPUnwrapper {
  constructor() {
    this.ampPatterns = [
      /\.amp\./,
      /\/amp\//,
      /\.amp$/,
      /\/amp$/,
      /\?amp$/,
      /&amp$/,
      /\.amp\.html$/,
      /\/amp\.html$/,
      /cdn\.ampproject\.org/,
      /amp\.dev/,
      /www\.google\..+\/amp\//
    ];
  }
  
  // Check if current page is AMP
  isAMPPage() {
    const url = window.location.href;
    const html = document.documentElement;
    
    // Check URL patterns
    if (this.ampPatterns.some(pattern => pattern.test(url))) {
      return true;
    }
    
    // Check HTML attributes
    if (html.hasAttribute('amp') || html.hasAttribute('⚡')) {
      return true;
    }
    
    // Check for AMP runtime script
    const ampScript = document.querySelector('script[src*="ampproject.org"]');
    if (ampScript) {
      return true;
    }
    
    return false;
  }
  
  // Get canonical URL from AMP page
  getCanonicalURL() {
    // Check canonical link tag
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) {
      return canonical.href;
    }
    
    // Try to construct non-AMP URL
    let url = window.location.href;
    
    // Remove AMP from Google cache URLs
    if (url.includes('google') && url.includes('/amp/')) {
      const match = url.match(/\/amp\/(s\/)?(.+)/);
      if (match) {
        const protocol = match[1] ? 'https://' : 'http://';
        return protocol + match[2];
      }
    }
    
    // Remove .amp or /amp from URL
    url = url.replace(/\.amp(\.html)?$/i, '');
    url = url.replace(/\/amp\/?$/i, '');
    url = url.replace(/\?amp$/i, '');
    url = url.replace(/&amp$/i, '');
    
    return url;
  }
  
  // Redirect to canonical page
  unwrapAMP() {
    if (!this.isAMPPage()) {
      return false;
    }
    
    const canonicalURL = this.getCanonicalURL();
    
    if (canonicalURL && canonicalURL !== window.location.href) {
      console.log('[AdBlock Pro] Unwrapping AMP page:', canonicalURL);
      
      // Add to history to prevent back button issues
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', canonicalURL);
      }
      
      // Redirect
      window.location.replace(canonicalURL);
      return true;
    }
    
    return false;
  }
  
  // Initialize unwrapper
  init() {
    // Only run in top-level frame, not in iframes
    if (window.top !== window) {
      return; // Skip execution in iframes
    }
    
    // Try to unwrap immediately
    const unwrapped = this.unwrapAMP();
    
    if (unwrapped) {
      console.log('[AdBlock Pro] AMP unwrapper: redirecting to canonical page');
    } else if (this.isAMPPage()) {
      console.log('[AdBlock Pro] AMP page detected but no canonical URL found');
    }
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  // Run immediately to unwrap before page loads
  const ampUnwrapper = new AMPUnwrapper();
  ampUnwrapper.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AMPUnwrapper;
}

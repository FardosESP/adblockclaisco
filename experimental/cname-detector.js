// CNAME Cloaking Detection Module
// Based on AdGuard CNAME Trackers List
class CNAMEDetector {
  constructor() {
    // Known CNAME cloaked tracker domains (subset from AdGuard list)
    this.cloakedDomains = [
      // Session recording & heatmaps
      'cdn.luckyorange.com',
      'cdn.mouseflow.com',
      'cdn.sessioncam.com',
      'cdn.inspectlet.com',
      
      // Analytics & tracking
      'data.abtasty.com',
      'tag.aticdn.net',
      'cdn.attn.tv',
      'cdn.segment.com',
      'cdn.mxpnl.com',
      'api.mixpanel.com',
      
      // Marketing & attribution
      'cdn.branch.io',
      'cdn.appsflyer.com',
      'cdn.adjust.com',
      'cdn.kochava.com',
      
      // RTB & programmatic
      'rtb.adentifi.com',
      'sync.search.spotxchange.com',
      'ssum-sec.casalemedia.com',
      
      // Fingerprinting
      'fp-cdn.azureedge.net',
      'api.fingerprintjs.com',
      'cdn.privacy-mgmt.com'
    ];
    
    // Patterns for detecting random CNAME subdomains (VERY STRICT to avoid false positives)
    this.suspiciousPatterns = [
      /^[a-f0-9]{16,32}\./i   // Long hex-only subdomains (likely tracking)
    ];
    
    this.detectionCache = new Map();
    this.cacheTTL = 3600000; // 1 hour
  }
  
  // Check if hostname is likely CNAME cloaked
  isCloaked(hostname) {
    if (!hostname) return false;
    
    // Check cache first
    const cached = this.detectionCache.get(hostname);
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      return cached.isCloaked;
    }
    
    // ONLY check against known cloaked domains (no heuristics to avoid false positives)
    const isKnownCloaked = this.cloakedDomains.some(domain => 
      hostname.includes(domain)
    );
    
    this.cacheResult(hostname, isKnownCloaked);
    return isKnownCloaked;
    
    // Heuristic patterns DISABLED to prevent false positives with legitimate CDNs
    // Future enhancement: enable heuristics only with webRequest confirmation
  }
  
  cacheResult(hostname, isCloaked) {
    this.detectionCache.set(hostname, {
      isCloaked,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.detectionCache.size > 1000) {
      const oldestKey = this.detectionCache.keys().next().value;
      this.detectionCache.delete(oldestKey);
    }
  }
  
  // Extract domain from URL
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return null;
    }
  }
  
  // Analyze network request for CNAME cloaking
  analyzeRequest(url) {
    const hostname = this.extractDomain(url);
    if (!hostname) return { isCloaked: false };
    
    const isCloaked = this.isCloaked(hostname);
    
    return {
      isCloaked,
      hostname,
      reason: isCloaked ? 'CNAME cloaking detected' : null
    };
  }
}

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CNAMEDetector;
}

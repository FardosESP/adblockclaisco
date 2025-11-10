// URL Tracking Parameter Removal
// Based on uBlock Origin and AdGuard URL Tracking Protection
class URLCleaner {
  constructor() {
    // Common tracking parameters to remove
    this.trackingParams = [
      // Google Analytics & UTM
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'utm_name', 'utm_cid', 'utm_reader', 'utm_viz_id', 'utm_pubreferrer',
      'utm_swu',
      
      // Facebook
      'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
      'action_object_map', 'action_type_map', 'action_ref_map',
      
      // Google
      'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
      
      // Microsoft/Bing
      'msclkid', 'ms_clkid',
      
      // Twitter
      'twclid', 'mkt_tok',
      
      // Mailchimp
      'mc_cid', 'mc_eid',
      
      // HubSpot
      '_hsenc', '_hsmi', '__hssc', '__hstc', '__hsfp',
      
      // Adobe/Marketo
      'mkt_tok', '_mkto_trk',
      
      // LinkedIn
      'li_fat_id', 'vero_id', 'vero_conv',
      
      // Reddit
      '_rdt_uuid', 'rdt_cid',
      
      // TikTok
      'ttclid',
      
      // Yandex
      'yclid', '_openstat', 'ymclid',
      
      // Generic tracking
      'ref', 'referrer', 'source', 'campaign', 'affiliate_id',
      'click_id', 'clickid', 'sid', 'cid', 'aid', 'tid',
      
      // Email tracking
      '_ke', 'trk_contact', 'trk_msg', 'trk_module', 'trk_sid',
      
      // Social media
      'igshid', 'igsh', 'share_id', 'share',
      
      // E-commerce
      'spm', 'scm', 'fromModule', 'pdp_npi',
      
      // Mobile app tracking
      'app_tracking', 'af_dp', 'af_channel', 'af_adset',
      'deep_link_value', 'deep_link_sub1',
      
      // Other
      'ncid', 'nr_email_referer', 'vgo_ee', 'wickedid',
      'oly_anon_id', 'oly_enc_id', '_branch_match_id',
      'rb_clickid', 's_cid', 'ml_subscriber', 'ml_subscriber_hash'
    ];
    
    // Regex patterns for dynamic tracking params
    this.trackingPatterns = [
      /^utm_/i,
      /^ga_/i,
      /^fb_/i,
      /^mc_/i,
      /^_hs/i,
      /^pk_/i,  // Piwik/Matomo
      /^mtm_/i,  // Matomo
      /^matomo_/i
    ];
  }
  
  // Remove tracking parameters from URL
  cleanURL(urlString) {
    try {
      const url = new URL(urlString);
      let paramsRemoved = 0;
      
      // Check each parameter
      const paramsToRemove = [];
      for (const [key, value] of url.searchParams.entries()) {
        if (this.isTrackingParam(key)) {
          paramsToRemove.push(key);
          paramsRemoved++;
        }
      }
      
      // Remove identified tracking params
      paramsToRemove.forEach(param => {
        url.searchParams.delete(param);
      });
      
      return {
        cleanURL: url.toString(),
        paramsRemoved,
        wasModified: paramsRemoved > 0
      };
    } catch (e) {
      return {
        cleanURL: urlString,
        paramsRemoved: 0,
        wasModified: false,
        error: e.message
      };
    }
  }
  
  // Check if parameter is a tracking parameter
  isTrackingParam(param) {
    const lowerParam = param.toLowerCase();
    
    // Direct match
    if (this.trackingParams.includes(lowerParam)) {
      return true;
    }
    
    // Pattern match
    return this.trackingPatterns.some(pattern => pattern.test(lowerParam));
  }
  
  // Get clean version of current page URL
  getCurrentCleanURL() {
    return this.cleanURL(window.location.href);
  }
  
  // Replace current URL with clean version (without page reload)
  replaceCurrentURL() {
    const result = this.getCurrentCleanURL();
    if (result.wasModified && window.history && window.history.replaceState) {
      window.history.replaceState({}, '', result.cleanURL);
      
      // Notify background of cleaned parameters
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'URL_PARAMS_CLEANED',
          count: result.paramsRemoved,
          url: window.location.href
        }).catch(() => {}); // Ignore if background not available
      }
      
      return result.paramsRemoved;
    }
    return 0;
  }
}

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  const urlCleaner = new URLCleaner();
  
  // Clean URL on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const removed = urlCleaner.replaceCurrentURL();
      if (removed > 0) {
        console.log(`[AdBlock Pro] Removed ${removed} tracking parameters from URL`);
      }
    });
  } else {
    const removed = urlCleaner.replaceCurrentURL();
    if (removed > 0) {
      console.log(`[AdBlock Pro] Removed ${removed} tracking parameters from URL`);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLCleaner;
}

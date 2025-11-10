// ML-Based Ad Detection Module
// Advanced heuristics and pattern recognition

class MLAdDetector {
  constructor() {
    this.features = [];
    this.adPatterns = [];
    this.learningEnabled = true;
    this.detectionStats = {
      visual: 0,
      behavioral: 0,
      nlp: 0,
      network: 0
    };
  }

  // NLP-based detection for persuasive language
  analyzeText(text) {
    if (!text || typeof text !== 'string') return { isAd: false, confidence: 0 };
    
    const persuasiveKeywords = [
      // Spanish
      'compra ahora', 'oferta limitada', 'descuento', 'promoción', 'solo hoy',
      'últimas unidades', 'no te lo pierdas', 'precio especial', 'gratis',
      'haz clic aquí', 'suscríbete', 'regístrate gratis', 'prueba gratis',
      // English
      'buy now', 'limited offer', 'discount', 'promotion', 'today only',
      'last units', 'don\'t miss', 'special price', 'free', 'click here',
      'subscribe', 'sign up free', 'free trial', 'act now', 'limited time',
      // Action words
      'shop', 'order', 'reserve', 'claim', 'get yours', 'download now'
    ];
    
    const urgencyWords = [
      'hurry', 'fast', 'quick', 'now', 'today', 'urgent', 'immediately',
      'rápido', 'ahora', 'hoy', 'urgente', 'inmediato', 'ya'
    ];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    persuasiveKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        score += 3;
      }
    });
    
    urgencyWords.forEach(word => {
      if (lowerText.includes(word)) {
        score += 2;
      }
    });
    
    // Check for excessive capitalization (SHOUTING)
    const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (upperCaseRatio > 0.5 && text.length > 10) {
      score += 4;
    }
    
    // Check for excessive punctuation (!!!, ???)
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount >= 2) {
      score += 3;
    }
    
    // Check for currency symbols + numbers
    if (/[\$€£¥][\d,]+/.test(text) || /[\d,]+\s*(USD|EUR|GBP|dollars|euros)/.test(lowerText)) {
      score += 2;
    }
    
    const isAd = score >= 8;
    const confidence = Math.min(score / 15, 1);
    
    if (isAd) {
      this.detectionStats.nlp++;
    }
    
    return { isAd, confidence, score };
  }

  // Perceptual detection - analyze visual characteristics
  analyzeElement(element) {
    if (!element) return { isAd: false, confidence: 0 };
    
    let score = 0;
    const features = [];
    
    try {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      // Common ad dimensions
      const commonAdSizes = [
        { w: 300, h: 250 }, { w: 728, h: 90 }, { w: 160, h: 600 },
        { w: 336, h: 280 }, { w: 300, h: 600 }, { w: 970, h: 250 },
        { w: 300, h: 50 }, { w: 320, h: 100 }, { w: 468, h: 60 }
      ];
      
      const matchesAdSize = commonAdSizes.some(size => 
        Math.abs(rect.width - size.w) < 10 && Math.abs(rect.height - size.h) < 10
      );
      
      if (matchesAdSize) {
        score += 5;
        features.push('standard-ad-size');
      }
      
      // Check z-index (ads often on top)
      const zIndex = parseInt(computedStyle.zIndex) || 0;
      if (zIndex > 1000) {
        score += 3;
        features.push('high-z-index');
      }
      
      // Check for fixed/sticky positioning (overlay ads)
      if (computedStyle.position === 'fixed' || computedStyle.position === 'sticky') {
        score += 2;
        features.push('fixed-position');
      }
      
      // Check for iframe
      if (element.tagName === 'IFRAME') {
        const src = element.src || '';
        if (src.includes('doubleclick') || src.includes('googlesyndication') || 
            src.includes('ad') || src.includes('banner')) {
          score += 6;
          features.push('ad-iframe');
        }
      }
      
      // Check text content for ad indicators
      const textContent = element.textContent || '';
      const nlpResult = this.analyzeText(textContent);
      if (nlpResult.isAd) {
        score += nlpResult.score;
        features.push('persuasive-text');
      }
      
      // Check for "Ad" or "Sponsored" disclosure
      const hasDisclosure = /\b(ad|ads|anuncio|publicidad|sponsored|patrocinado)\b/i.test(textContent);
      if (hasDisclosure) {
        score += 7;
        features.push('ad-disclosure');
      }
      
      // Check classes and IDs
      const className = element.className || '';
      const id = element.id || '';
      const classIdText = `${className} ${id}`.toLowerCase();
      
      const adIdentifiers = [
        'ad', 'ads', 'banner', 'sponsor', 'promo', 'advertisement',
        'advert', 'commercial', 'publicity', 'publicidad'
      ];
      
      if (adIdentifiers.some(identifier => classIdText.includes(identifier))) {
        score += 4;
        features.push('ad-class-id');
      }
      
      // Check for background images (common in banner ads)
      const bgImage = computedStyle.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        if (bgImage.includes('ad') || bgImage.includes('banner')) {
          score += 3;
          features.push('ad-bg-image');
        }
      }
      
      const isAd = score >= 10;
      const confidence = Math.min(score / 20, 1);
      
      if (isAd) {
        this.detectionStats.visual++;
      }
      
      return { isAd, confidence, score, features };
      
    } catch (e) {
      return { isAd: false, confidence: 0, error: e.message };
    }
  }

  // Behavioral detection - analyze user interaction patterns
  analyzeBehavior(element) {
    if (!element) return { isSuspicious: false };
    
    let suspicionScore = 0;
    
    // Check if element opens new windows on click
    const hasTargetBlank = element.getAttribute('target') === '_blank';
    if (hasTargetBlank) suspicionScore += 2;
    
    // Check for redirect chains
    const href = element.href || element.getAttribute('href') || '';
    if (href && href.includes('redirect') || href.includes('click') || href.includes('track')) {
      suspicionScore += 3;
    }
    
    // Check for multiple nested iframes (ad networks)
    if (element.tagName === 'IFRAME') {
      let parent = element.parentElement;
      let iframeDepth = 0;
      while (parent && iframeDepth < 5) {
        if (parent.tagName === 'IFRAME') iframeDepth++;
        parent = parent.parentElement;
      }
      if (iframeDepth >= 2) {
        suspicionScore += 4;
      }
    }
    
    const isSuspicious = suspicionScore >= 5;
    
    if (isSuspicious) {
      this.detectionStats.behavioral++;
    }
    
    return { isSuspicious, suspicionScore };
  }

  // Network pattern analysis - detect CNAME cloaking
  analyzeNetworkRequest(url) {
    if (!url) return { isCloaked: false };
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const path = urlObj.pathname;
      
      // Check for CNAME cloaking patterns
      const cloakingIndicators = [
        hostname.includes('ads.'),
        hostname.includes('track.'),
        hostname.includes('analytics.'),
        hostname.includes('cdn.') && path.includes('/ad'),
        hostname.includes('static.') && path.includes('/banner'),
        path.includes('/track/'),
        path.includes('/pixel/'),
        path.includes('/beacon/')
      ];
      
      const isCloaked = cloakingIndicators.filter(Boolean).length >= 2;
      
      if (isCloaked) {
        this.detectionStats.network++;
      }
      
      return { isCloaked, hostname, indicators: cloakingIndicators.filter(Boolean) };
      
    } catch (e) {
      return { isCloaked: false, error: e.message };
    }
  }

  // Comprehensive scan of entire page
  scanPage() {
    const detections = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      const visual = this.analyzeElement(element);
      const behavioral = this.analyzeBehavior(element);
      
      if (visual.isAd || behavioral.isSuspicious) {
        detections.push({
          element,
          visual,
          behavioral,
          timestamp: Date.now()
        });
      }
    });
    
    return detections;
  }

  // Get detection statistics
  getStats() {
    return {
      ...this.detectionStats,
      total: Object.values(this.detectionStats).reduce((a, b) => a + b, 0)
    };
  }

  // Reset statistics
  resetStats() {
    this.detectionStats = {
      visual: 0,
      behavioral: 0,
      nlp: 0,
      network: 0
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLAdDetector;
}

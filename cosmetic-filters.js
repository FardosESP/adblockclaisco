// Advanced Cosmetic Filtering Engine
// Implements procedural filters like uBlock Origin

class CosmeticFilterEngine {
  constructor() {
    this.filters = [];
    this.hiddenElements = new WeakSet();
    this.stats = {
      elementsHidden: 0,
      elementsRemoved: 0,
      stylesApplied: 0
    };
  }

  // Parse filter syntax: domain##selector:operator(arg)
  parseFilter(filterString) {
    const match = filterString.match(/^([^#]+)?##(.+)$/);
    if (!match) return null;

    const [, domain, selector] = match;
    
    return {
      domain: domain || '*',
      selector: selector,
      procedural: this.isProcedural(selector)
    };
  }

  isProcedural(selector) {
    const proceduralOperators = [
      ':has(', ':has-text(', ':upward(', ':remove(', ':style(',
      ':matches-css(', ':matches-attr(', ':xpath(', ':min-text-length('
    ];
    
    return proceduralOperators.some(op => selector.includes(op));
  }

  // Apply procedural cosmetic filters
  applyCosmetic(selector) {
    try {
      // Check for procedural operators
      if (selector.includes(':has(')) {
        return this.applyHasFilter(selector);
      }
      
      if (selector.includes(':has-text(')) {
        return this.applyHasTextFilter(selector);
      }
      
      if (selector.includes(':upward(')) {
        return this.applyUpwardFilter(selector);
      }
      
      if (selector.includes(':remove()')) {
        return this.applyRemoveFilter(selector);
      }
      
      if (selector.includes(':style(')) {
        return this.applyStyleFilter(selector);
      }

      if (selector.includes(':matches-attr(')) {
        return this.applyMatchesAttrFilter(selector);
      }

      if (selector.includes(':min-text-length(')) {
        return this.applyMinTextLengthFilter(selector);
      }
      
      // Standard CSS selector
      return this.applyStandardFilter(selector);
      
    } catch (e) {
      console.warn('[Cosmetic Filter] Error applying filter:', selector, e);
      return [];
    }
  }

  // :has(selector) - Match elements containing specific descendants
  applyHasFilter(selector) {
    const match = selector.match(/^(.+):has\((.+)\)$/);
    if (!match) return [];

    const [, baseSelector, hasSelector] = match;
    const baseElements = document.querySelectorAll(baseSelector);
    const filtered = [];

    baseElements.forEach(el => {
      if (el.querySelector(hasSelector)) {
        this.hideElement(el);
        filtered.push(el);
      }
    });

    return filtered;
  }

  // :has-text(text or /regex/) - Match by text content
  applyHasTextFilter(selector) {
    const match = selector.match(/^(.+):has-text\((.+)\)$/);
    if (!match) return [];

    const [, baseSelector, textPattern] = match;
    const baseElements = document.querySelectorAll(baseSelector);
    const filtered = [];

    // Check if pattern is regex
    const regexMatch = textPattern.match(/^\/(.+)\/([igm]*)$/);
    const regex = regexMatch ? new RegExp(regexMatch[1], regexMatch[2]) : null;

    baseElements.forEach(el => {
      const text = el.textContent;
      const matches = regex ? regex.test(text) : text.includes(textPattern);

      if (matches) {
        this.hideElement(el);
        filtered.push(el);
      }
    });

    return filtered;
  }

  // :upward(n or selector) - Select ancestor element
  applyUpwardFilter(selector) {
    const match = selector.match(/^(.+):upward\((.+)\)$/);
    if (!match) return [];

    const [, baseSelector, upwardArg] = match;
    const baseElements = document.querySelectorAll(baseSelector);
    const filtered = [];

    baseElements.forEach(el => {
      let target = el;
      
      // If number, go up N levels
      if (/^\d+$/.test(upwardArg)) {
        const levels = parseInt(upwardArg);
        for (let i = 0; i < levels && target.parentElement; i++) {
          target = target.parentElement;
        }
      } else {
        // If selector, find closest matching ancestor
        target = el.closest(upwardArg);
      }

      if (target && target !== el) {
        this.hideElement(target);
        filtered.push(target);
      }
    });

    return filtered;
  }

  // :remove() - Remove element from DOM
  applyRemoveFilter(selector) {
    const baseSelector = selector.replace(':remove()', '');
    const elements = document.querySelectorAll(baseSelector);
    const filtered = [];

    elements.forEach(el => {
      el.remove();
      this.stats.elementsRemoved++;
      filtered.push(el);
      console.log('[Cosmetic Filter] Removed element:', baseSelector);
    });

    return filtered;
  }

  // :style(property: value) - Apply CSS styles
  applyStyleFilter(selector) {
    const match = selector.match(/^(.+):style\((.+)\)$/);
    if (!match) return [];

    const [, baseSelector, styleString] = match;
    const elements = document.querySelectorAll(baseSelector);
    const filtered = [];

    elements.forEach(el => {
      // Parse style string: "property: value; property2: value2"
      const styles = styleString.split(';').map(s => s.trim()).filter(Boolean);
      
      styles.forEach(style => {
        const [property, value] = style.split(':').map(s => s.trim());
        if (property && value) {
          el.style.setProperty(property, value, 'important');
        }
      });

      this.stats.stylesApplied++;
      filtered.push(el);
    });

    return filtered;
  }

  // :matches-attr(pattern) - Match by attribute patterns
  applyMatchesAttrFilter(selector) {
    const match = selector.match(/^(.+):matches-attr\((.+)\)$/);
    if (!match) return [];

    const [, baseSelector, attrPattern] = match;
    const baseElements = document.querySelectorAll(baseSelector);
    const filtered = [];

    // Parse pattern: /attr|attr2/=/pattern/
    const patternMatch = attrPattern.match(/\/(.+?)\/=\/(.+)\//);
    if (!patternMatch) return [];

    const [, attrs, pattern] = patternMatch;
    const attrList = attrs.split('|');
    const regex = new RegExp(pattern);

    baseElements.forEach(el => {
      const matched = attrList.some(attr => {
        const value = el.getAttribute(attr);
        return value && regex.test(value);
      });

      if (matched) {
        this.hideElement(el);
        filtered.push(el);
      }
    });

    return filtered;
  }

  // :min-text-length(n) - Match elements with minimum text length
  applyMinTextLengthFilter(selector) {
    const match = selector.match(/^(.+):min-text-length\((\d+)\)$/);
    if (!match) return [];

    const [, baseSelector, minLength] = match;
    const minLen = parseInt(minLength);
    const baseElements = document.querySelectorAll(baseSelector);
    const filtered = [];

    baseElements.forEach(el => {
      if (el.textContent.length >= minLen) {
        this.hideElement(el);
        filtered.push(el);
      }
    });

    return filtered;
  }

  // Standard CSS selector
  applyStandardFilter(selector) {
    const elements = document.querySelectorAll(selector);
    const filtered = [];

    elements.forEach(el => {
      this.hideElement(el);
      filtered.push(el);
    });

    return filtered;
  }

  // Hide element with CSS
  hideElement(element) {
    if (this.hiddenElements.has(element)) return;

    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    this.hiddenElements.add(element);
    this.stats.elementsHidden++;
  }

  // Apply predefined filters
  applyPredefinedFilters() {
    const filters = [
      // Hide elements with "ad" or "advertisement" in class/id
      '##div[class*="advertisement"]',
      '##div[id*="advertisement"]',
      '##div[class*="_ad_"]',
      '##div[class*="-ad-"]',
      
      // Common ad containers
      '##.ad-container',
      '##.ads-container',
      '##.ad-wrapper',
      '##.advertisement-wrapper',
      
      // Sponsored content
      '##div:has-text(/^Sponsored$/i)',
      '##div:has-text(/^Publicidad$/i)',
      '##article:has(span:has-text(/Sponsored/))',
      
      // Social media widgets
      '##.fb-like-box',
      '##.twitter-timeline',
      '##iframe[src*="facebook.com/plugins"]',
      
      // Common banner sizes
      '##div[style*="width: 728px"][style*="height: 90px"]',
      '##div[style*="width: 300px"][style*="height: 250px"]',
      '##div[style*="width: 160px"][style*="height: 600px"]'
    ];

    filters.forEach(filter => {
      const parsed = this.parseFilter(filter);
      if (parsed) {
        this.applyCosmetic(parsed.selector);
      }
    });
  }

  // Get statistics
  getStats() {
    return this.stats;
  }

  // Initialize continuous monitoring
  initialize() {
    // Apply filters on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.applyPredefinedFilters();
      });
    } else {
      this.applyPredefinedFilters();
    }

    // Monitor DOM changes
    const observer = new MutationObserver(() => {
      this.applyPredefinedFilters();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[AdBlock Pro] Cosmetic filter engine initialized');
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  window.cosmeticFilterEngine = new CosmeticFilterEngine();
  window.cosmeticFilterEngine.initialize();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CosmeticFilterEngine;
}

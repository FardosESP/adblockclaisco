class ABPParser {
  constructor() {
    this.ruleIdCounter = 1000;
    this.scriptlets = [];
    this.cosmeticRules = [];
  }

  parseFilterList(rawText, listId) {
    const lines = rawText.split('\n');
    const dnrRules = [];
    const scriptlets = [];
    const cosmeticRules = [];
    let stats = {
      total: 0,
      networkRules: 0,
      cosmeticRules: 0,
      scriptlets: 0,
      exceptions: 0,
      comments: 0,
      invalid: 0
    };

    for (let line of lines) {
      line = line.trim();
      
      if (!line || line.startsWith('!') || line.startsWith('[')) {
        stats.comments++;
        continue;
      }

      stats.total++;

      if (line.includes('#@#') || line.includes('##') || line.includes('#?#')) {
        const cosmeticRule = this.parseCosmeticRule(line, listId);
        if (cosmeticRule) {
          cosmeticRules.push(cosmeticRule);
          stats.cosmeticRules++;
        }
      }
      else if (line.includes('##+js(') || line.includes('#+js(')) {
        const scriptlet = this.parseScriptlet(line, listId);
        if (scriptlet) {
          scriptlets.push(scriptlet);
          stats.scriptlets++;
        }
      }
      else if (line.includes('@@')) {
        const exceptionRule = this.parseExceptionRule(line, listId);
        if (exceptionRule) {
          dnrRules.push(exceptionRule);
          stats.exceptions++;
        }
      }
      else {
        const networkRule = this.parseNetworkRule(line, listId);
        if (networkRule) {
          dnrRules.push(networkRule);
          stats.networkRules++;
        } else {
          stats.invalid++;
        }
      }
    }

    return {
      dnrRules,
      scriptlets,
      cosmeticRules,
      stats
    };
  }

  parseNetworkRule(rule, listId) {
    try {
      let filter = rule;
      let options = {};
      
      if (rule.includes('$')) {
        const parts = rule.split('$');
        filter = parts[0];
        const optionsStr = parts.slice(1).join('$');
        options = this.parseOptions(optionsStr);
      }

      if (filter.startsWith('||')) {
        filter = filter.substring(2);
      } else if (filter.startsWith('|')) {
        filter = filter.substring(1);
      }

      if (filter.endsWith('^')) {
        filter = filter.slice(0, -1);
      }

      if (filter.endsWith('*')) {
        filter = filter.slice(0, -1);
      }

      if (filter.includes('*') || filter.includes('^')) {
        filter = filter.replace(/\*/g, '.*').replace(/\^/g, '[^\\w\\d._%-]');
      }

      const resourceTypes = options.types && options.types.length > 0
        ? options.types
        : ['script', 'image', 'xmlhttprequest', 'sub_frame', 'stylesheet', 'font', 'media'];

      if (filter.length < 3) {
        return null;
      }

      const dnrRule = {
        id: this.ruleIdCounter++,
        priority: options.important ? 100 : 1,
        action: { type: 'block' },
        condition: {
          urlFilter: filter,
          resourceTypes: resourceTypes
        }
      };

      if (options.domains) {
        if (options.domains.include && options.domains.include.length > 0) {
          dnrRule.condition.initiatorDomains = options.domains.include;
        }
        if (options.domains.exclude && options.domains.exclude.length > 0) {
          dnrRule.condition.excludedInitiatorDomains = options.domains.exclude;
        }
      }

      if (options.thirdParty !== undefined) {
        dnrRule.condition.domainType = options.thirdParty ? 'thirdParty' : 'firstParty';
      }

      return dnrRule;
    } catch (error) {
      console.warn('[ABP Parser] Error parsing network rule:', rule, error);
      return null;
    }
  }

  parseExceptionRule(rule, listId) {
    try {
      let filter = rule.replace(/^@@/, '');
      let options = {};

      if (filter.includes('$')) {
        const parts = filter.split('$');
        filter = parts[0];
        options = this.parseOptions(parts.slice(1).join('$'));
      }

      if (filter.startsWith('||')) {
        filter = filter.substring(2);
      } else if (filter.startsWith('|')) {
        filter = filter.substring(1);
      }

      if (filter.endsWith('^')) {
        filter = filter.slice(0, -1);
      }

      if (filter.length < 3) {
        return null;
      }

      const resourceTypes = options.types && options.types.length > 0
        ? options.types
        : ['script', 'image', 'xmlhttprequest', 'sub_frame', 'stylesheet', 'font', 'media'];

      return {
        id: this.ruleIdCounter++,
        priority: 2,
        action: { type: 'allow' },
        condition: {
          urlFilter: filter,
          resourceTypes: resourceTypes
        }
      };
    } catch (error) {
      console.warn('[ABP Parser] Error parsing exception rule:', rule, error);
      return null;
    }
  }

  parseCosmeticRule(rule, listId) {
    try {
      let domains = [];
      let selector = '';
      let exception = false;

      if (rule.includes('#@#')) {
        exception = true;
        const parts = rule.split('#@#');
        if (parts[0]) domains = parts[0].split(',');
        selector = parts[1];
      } else if (rule.includes('##')) {
        const parts = rule.split('##');
        if (parts[0]) domains = parts[0].split(',');
        selector = parts[1];
      } else if (rule.includes('#?#')) {
        const parts = rule.split('#?#');
        if (parts[0]) domains = parts[0].split(',');
        selector = parts[1];
      }

      if (!selector) return null;

      return {
        id: `cosmetic_${this.ruleIdCounter++}`,
        listId,
        domains: domains.filter(d => d && !d.startsWith('~')),
        excludeDomains: domains.filter(d => d.startsWith('~')).map(d => d.substring(1)),
        selector,
        exception
      };
    } catch (error) {
      console.warn('[ABP Parser] Error parsing cosmetic rule:', rule, error);
      return null;
    }
  }

  parseScriptlet(rule, listId) {
    try {
      let domains = [];
      let scriptletName = '';
      let scriptletArgs = [];

      const match = rule.match(/(.*)#\+js\(([^)]+)\)/);
      if (!match) return null;

      if (match[1]) {
        domains = match[1].split(',').filter(d => d.trim());
      }

      const scriptletContent = match[2];
      const parts = scriptletContent.split(',').map(s => s.trim());
      scriptletName = parts[0];
      scriptletArgs = parts.slice(1);

      return {
        id: `scriptlet_${this.ruleIdCounter++}`,
        listId,
        domains: domains.filter(d => d && !d.startsWith('~')),
        excludeDomains: domains.filter(d => d.startsWith('~')).map(d => d.substring(1)),
        scriptletName,
        scriptletArgs
      };
    } catch (error) {
      console.warn('[ABP Parser] Error parsing scriptlet:', rule, error);
      return null;
    }
  }

  parseOptions(optionsStr) {
    const options = {
      types: [],
      domains: { include: [], exclude: [] },
      thirdParty: undefined,
      important: false
    };

    const optionsList = optionsStr.split(',').map(o => o.trim());

    for (const option of optionsList) {
      if (option.startsWith('~')) {
        const type = option.substring(1);
        continue;
      }

      if (option.startsWith('domain=')) {
        const domainList = option.substring(7).split('|');
        for (const domain of domainList) {
          if (domain.startsWith('~')) {
            options.domains.exclude.push(domain.substring(1));
          } else {
            options.domains.include.push(domain);
          }
        }
      }
      else if (option === 'third-party') {
        options.thirdParty = true;
      }
      else if (option === '~third-party' || option === 'first-party') {
        options.thirdParty = false;
      }
      else if (option === 'important') {
        options.important = true;
      }
      else if (this.isValidResourceType(option)) {
        options.types.push(this.mapResourceType(option));
      }
    }

    return options;
  }

  isValidResourceType(type) {
    const validTypes = [
      'script', 'image', 'stylesheet', 'object', 'xmlhttprequest',
      'subdocument', 'ping', 'websocket', 'webrtc', 'document',
      'font', 'media', 'other'
    ];
    return validTypes.includes(type);
  }

  mapResourceType(abpType) {
    const typeMap = {
      'script': 'script',
      'image': 'image',
      'stylesheet': 'stylesheet',
      'object': 'object',
      'xmlhttprequest': 'xmlhttprequest',
      'subdocument': 'sub_frame',
      'ping': 'ping',
      'websocket': 'websocket',
      'webrtc': 'webtransport',
      'document': 'main_frame',
      'font': 'font',
      'media': 'media',
      'other': 'other'
    };
    return typeMap[abpType] || abpType;
  }

  resetCounter(startId = 1000) {
    this.ruleIdCounter = startId;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ABPParser;
}

const BLOCKING_LEVELS = {
  BASIC: 'basic',
  ADVANCED: 'advanced',
  AGGRESSIVE: 'aggressive'
};

const DEFAULT_CONFIG = {
  blockingLevel: BLOCKING_LEVELS.BASIC,
  antiDetection: false,
  blockYouTube: false,
  blockTwitch: false,
  blockTrackers: false,
  blockMiners: false,
  blockCookieBanners: false,
  enableLogging: false
};

const LEVEL_FEATURES = {
  [BLOCKING_LEVELS.BASIC]: {
    networkRules: true,
    basicDomCleanup: true,
    youtubeBasic: false,
    twitchBasic: false,
    antiDetection: false,
    aggressiveMutation: false,
    cosmeticFiltering: false
  },
  [BLOCKING_LEVELS.ADVANCED]: {
    networkRules: true,
    basicDomCleanup: true,
    youtubeBasic: true,
    twitchBasic: true,
    antiDetection: true,
    aggressiveMutation: false,
    cosmeticFiltering: true
  },
  [BLOCKING_LEVELS.AGGRESSIVE]: {
    networkRules: true,
    basicDomCleanup: true,
    youtubeBasic: true,
    twitchBasic: true,
    antiDetection: true,
    aggressiveMutation: true,
    cosmeticFiltering: true
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BLOCKING_LEVELS, DEFAULT_CONFIG, LEVEL_FEATURES };
}

# AdBlock Pro Browser Extension

## Overview

AdBlock Pro is a comprehensive browser extension (Manifest V3) that provides multi-layer ad blocking, privacy protection, and anti-tracking capabilities. The extension implements 270+ blocking rules using the declarativeNetRequest API, along with advanced machine learning-based ad detection, fingerprint protection, and specialized blocking for platforms like YouTube and Twitch.

The extension operates entirely client-side as a browser extension with no backend server requirements. It uses Chrome's service worker architecture for background processing and content scripts for page-level blocking and protection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Extension Architecture (Manifest V3)
- **Service Worker Background Script** (`background.js`): Handles declarative network request rules, manages per-tab statistics, maintains whitelist/blacklist, and coordinates between content scripts
- **Content Scripts**: Injected into all web pages to perform DOM-based ad blocking, ML detection, and privacy protection
- **Popup UI** (`popup.html`, `popup.js`): User interface for viewing statistics, managing settings, and controlling protection levels
- **Injected Scripts**: Deep page-level protection that runs in the page context to block tracking APIs and crypto miners

### Multi-Layer Blocking Strategy
1. **Network-Level Blocking**: 270+ declarative rules (`rules.json`) that block ad/tracker domains at the network layer using Chrome's declarativeNetRequest API
2. **DOM-Level Blocking**: Content scripts remove ad elements from the page after load using CSS selectors and heuristics
3. **ML-Based Detection** (`ml-detector.js`): Machine learning heuristics analyze visual features, text patterns (NLP), and behavioral signals to identify disguised ads
4. **Specialized Platform Blocking**: YouTube and Twitch have dedicated detection modules for platform-specific ad formats

### Privacy Protection Modules ⭐ ENHANCED
- **Anti-Fingerprinting** (`anti-fingerprint.js`): Adds noise to canvas/WebGL/audio fingerprinting APIs to prevent tracking
- **URL Tracking Removal** (`url-cleaner.js`): Strips 60+ tracking parameters (utm_*, fbclid, gclid, etc.) from URLs using History API without page reload. Sends URL_PARAMS_CLEANED messages to background for per-tab statistics.
- **Cookie Banner Dismissal** (`cookie-banner-blocker.js`): Auto-dismisses 40+ common cookie consent banners. Sends COOKIE_BANNERS_BLOCKED messages with debounced reporting.
- **Anti-Adblock Evasion** (`anti-adblock-evasion.js`): Prevents websites from detecting the ad blocker by spoofing window properties and simulating bait elements.
- **Social Widget Blocking** (`social-widget-blocker.js`): Removes embedded social media widgets (Facebook, Twitter, LinkedIn) and tracking pixels. Sends SOCIAL_WIDGETS_BLOCKED messages with batched reporting.
- **AMP Unwrapper** (`amp-unwrapper.js`): Automatically redirects Google AMP pages to their canonical URLs. Top-frame only execution prevents iframe conflicts.

### Per-Tab Statistics System ⭐ ENHANCED
- Each browser tab maintains isolated statistics (ads blocked, trackers blocked, etc.)
- Statistics stored in `Map<tabId, stats>` with automatic cleanup on tab close and navigation
- Real-time badge counter updates show blocks per tab using `getOrCreateTabStats()` helper
- Memory-bounded with max 50 domains tracked per tab
- **Enhanced Integration**: All privacy modules (URL cleaner, cookie banner blocker, social widget blocker) update both global stats and per-tab stats
- **Consistent Initialization**: `getOrCreateTabStats(tabId)` helper ensures uniform structure across all code paths
- Badge displays per-tab counter when enabled, "OFF" when disabled, automatically syncs across tabs

### Configuration System
Three blocking levels defined in `config.js`:
- **Basic**: Network rules only, minimal DOM intervention
- **Advanced**: Includes YouTube/Twitch blocking, anti-detection, ML features
- **Aggressive**: Maximum blocking with cosmetic filtering and mutation observers

Settings persist using Chrome Storage API with whitelist support for user-excluded domains.

### Video Stream Ad Detection
- **HLS/DASH Stream Analysis** (`video-stream-detector.js`): Monitors video elements for suspicious bitrate changes, quality switches, and playback manipulation
- Detects ads embedded directly in video streams by analyzing playback rate resets and volume changes
- Platform-specific detection for YouTube's adPlacements API and Twitch's GQL payload ads

## External Dependencies

### Browser APIs (Chrome Extension APIs)
- **declarativeNetRequest**: Manifest V3 network blocking (primary ad blocking mechanism)
- **storage**: Settings and statistics persistence
- **tabs**: Per-tab tracking and badge updates
- **scripting**: Dynamic content script injection
- **webNavigation**: Page load event tracking
- **notifications**: User alerts for malware/miner detection
- **alarms**: Periodic tasks (cache cleanup, list updates)
- **cookies**: Cookie banner detection support
- **webRequest**: Headers inspection (limited in MV3)

### Third-Party Filter Lists (References Only)
- **EasyList/EasyPrivacy Compatible**: Uses compatible filter syntax but rules are hardcoded in `rules.json`
- **AdGuard CNAME Blocklist**: CNAME cloaking detection module (`cname-detector.js`) includes subset of known cloaked domains
- **Note**: No external API calls - all filter lists are embedded in the extension

### Runtime Dependencies
- No external npm packages required for extension runtime
- Development dependencies in `package.json` are for a separate Next.js demo site (not part of extension)
- Extension is pure JavaScript with no build step required

## Recent Changes (November 2025)

### Features Added
1. **Enhanced Per-Tab Statistics** with `getOrCreateTabStats()` helper for consistency
2. **30 New Filter Rules** (IDs 241-270): fingerprinting (FingerprintJS, ClientJS), session recording (Heap, Smartlook), RTB (Criteo, Quantcast), crypto miners (Coinhive patterns)
3. **5 New Privacy Modules** fully integrated with background message handlers:
   - URL Tracking Parameter Removal (60+ params)
   - Cookie Banner Auto-Dismissal (40+ selectors)
   - Anti-Adblock Evasion
   - Social Widget Blocker
   - AMP Unwrapper (with iframe protection)
4. **Message Handler System**: URL_PARAMS_CLEANED, COOKIE_BANNERS_BLOCKED, SOCIAL_WIDGETS_BLOCKED update both global and per-tab stats

### Bugs Fixed
1. Badge counter now updates correctly using per-tab statistics
2. Cross-tab sync working properly with storage.onChanged listener
3. AMP unwrapper only runs in top-level frame (prevents iframe conflicts)
4. Removed overly aggressive Google Tag Manager/Analytics filters

### Experimental/Disabled Features
- **CNAME Cloaking Detection** (`experimental/cname-detector.js`): Disabled due to lack of DNS resolution API in Manifest V3. Requires future Chrome API support or background.js webRequest integration for proper first-party tracker alias detection.
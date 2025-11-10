// Advanced Video Stream Ad Detection Module
// Detects ads embedded directly in video streams (YouTube, Twitch, etc.)

class VideoStreamDetector {
  constructor() {
    this.monitoredVideos = new WeakSet();
    this.adDetections = 0;
    this.streamAnalysis = {
      bitrateChanges: [],
      qualitySwitches: [],
      streamInterruptions: []
    };
  }

  // Monitor all video elements on the page
  monitorVideos() {
    const videos = document.querySelectorAll('video');
    
    videos.forEach(video => {
      if (!this.monitoredVideos.has(video)) {
        this.monitoredVideos.add(video);
        this.attachVideoListeners(video);
      }
    });
  }

  // Attach listeners to video element
  attachVideoListeners(video) {
    // Monitor playback rate changes (ads often force 1x speed)
    let lastPlaybackRate = video.playbackRate;
    
    const checkPlaybackRate = () => {
      if (video.playbackRate !== lastPlaybackRate) {
        if (video.playbackRate === 1 && lastPlaybackRate !== 1) {
          console.log('[AdBlock Pro] Suspicious playback rate reset detected');
        }
        lastPlaybackRate = video.playbackRate;
      }
    };

    // Monitor volume changes (ads sometimes boost volume)
    let lastVolume = video.volume;
    
    const checkVolume = () => {
      if (video.volume !== lastVolume) {
        const volumeChange = Math.abs(video.volume - lastVolume);
        if (volumeChange > 0.3) {
          console.log('[AdBlock Pro] Suspicious volume change detected:', volumeChange);
        }
        lastVolume = video.volume;
      }
    };

    // Monitor for ad markers in video timeline
    video.addEventListener('timeupdate', () => {
      checkPlaybackRate();
      checkVolume();
      
      // Check if we're in an ad segment (YouTube specific)
      if (window.location.hostname.includes('youtube.com')) {
        this.detectYouTubeAdSegment(video);
      }
      
      // Check for Twitch ad segments
      if (window.location.hostname.includes('twitch.tv')) {
        this.detectTwitchAdSegment(video);
      }
    });

    // Monitor stream quality changes
    video.addEventListener('loadedmetadata', () => {
      this.analyzeStreamQuality(video);
    });

    // Monitor for waiting events (buffering during ads)
    video.addEventListener('waiting', () => {
      this.streamAnalysis.streamInterruptions.push({
        time: video.currentTime,
        timestamp: Date.now()
      });
    });
  }

  // Detect YouTube ad segments
  detectYouTubeAdSegment(video) {
    try {
      // Check if player is showing ad UI
      const adContainer = document.querySelector('.ytp-ad-player-overlay');
      const adBadge = document.querySelector('.ytp-ad-simple-ad-badge');
      const skipButton = document.querySelector('.ytp-ad-skip-button');
      
      if (adContainer || adBadge) {
        console.log('[AdBlock Pro] YouTube ad UI detected, attempting skip');
        this.adDetections++;
        
        // Report to background
        chrome.runtime.sendMessage({
          type: 'VIDEO_AD_BLOCKED',
          platform: 'youtube',
          url: window.location.href
        });
        
        // Try to skip
        if (skipButton && !skipButton.disabled) {
          skipButton.click();
          console.log('[AdBlock Pro] Ad skip button clicked');
        }
        
        // Try to seek past ad
        const adDuration = this.estimateAdDuration(video);
        if (adDuration && adDuration < 30) {
          video.currentTime = video.currentTime + adDuration + 0.5;
        }
        
        return true;
      }
      
      // Check for ad module in player
      const playerModule = document.querySelector('.ytp-ad-module');
      if (playerModule && playerModule.style.display !== 'none') {
        console.log('[AdBlock Pro] YouTube ad module active');
        this.adDetections++;
        return true;
      }
      
    } catch (e) {
      console.warn('[AdBlock Pro] Error detecting YouTube ad segment:', e);
    }
    
    return false;
  }

  // Detect Twitch ad segments
  detectTwitchAdSegment(video) {
    try {
      // Check for purple screen (Twitch ad placeholder)
      const purpleScreen = document.querySelector('[data-a-target="video-ad-label"]');
      const adCountdown = document.querySelector('.tw-ad-countdown');
      
      if (purpleScreen || adCountdown) {
        console.log('[AdBlock Pro] Twitch ad detected');
        this.adDetections++;
        
        // Mute during ad
        if (!video.muted) {
          video.muted = true;
          video.volume = 0;
          
          // Unmute after ad
          setTimeout(() => {
            video.muted = false;
            video.volume = 1;
          }, 5000);
        }
        
        return true;
      }
      
    } catch (e) {
      console.warn('[AdBlock Pro] Error detecting Twitch ad segment:', e);
    }
    
    return false;
  }

  // Estimate ad duration based on common lengths
  estimateAdDuration(video) {
    const commonAdDurations = [5, 6, 15, 20, 30];
    
    // Check video element properties
    if (video.duration && video.duration < 35) {
      // Likely a short ad
      return Math.ceil(video.duration);
    }
    
    return null;
  }

  // Analyze stream quality for suspicious patterns
  analyzeStreamQuality(video) {
    try {
      const videoTracks = video.videoTracks;
      
      if (videoTracks && videoTracks.length > 0) {
        const activeTrack = Array.from(videoTracks).find(track => track.selected);
        
        if (activeTrack) {
          this.streamAnalysis.qualitySwitches.push({
            label: activeTrack.label,
            timestamp: Date.now()
          });
          
          // Detect suspicious quality drops (common during ad insertion)
          if (this.streamAnalysis.qualitySwitches.length > 1) {
            const lastTwo = this.streamAnalysis.qualitySwitches.slice(-2);
            
            if (this.isQualityDowngrade(lastTwo[0].label, lastTwo[1].label)) {
              console.log('[AdBlock Pro] Suspicious quality downgrade detected');
            }
          }
        }
      }
      
    } catch (e) {
      console.warn('[AdBlock Pro] Error analyzing stream quality:', e);
    }
  }

  // Check if quality was downgraded
  isQualityDowngrade(oldQuality, newQuality) {
    const qualities = ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'];
    const oldIndex = qualities.findIndex(q => oldQuality.includes(q));
    const newIndex = qualities.findIndex(q => newQuality.includes(q));
    
    return oldIndex > newIndex && oldIndex !== -1 && newIndex !== -1;
  }

  // Monitor HLS/DASH manifests for ad segments
  monitorManifests() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const url = args[0];
      
      if (typeof url === 'string') {
        // Monitor m3u8 (HLS) requests
        if (url.includes('.m3u8')) {
          return originalFetch.apply(this, args).then(response => {
            return response.clone().text().then(text => {
              // Check for ad markers in manifest
              if (text.includes('#EXT-X-CUE-OUT') || 
                  text.includes('#EXT-X-DISCONTINUITY') ||
                  text.includes('ad-') ||
                  text.includes('adsystem')) {
                console.log('[AdBlock Pro] Ad markers detected in HLS manifest');
              }
              
              return response;
            });
          });
        }
        
        // Monitor DASH (MPD) requests
        if (url.includes('.mpd')) {
          return originalFetch.apply(this, args).then(response => {
            return response.clone().text().then(text => {
              if (text.includes('AdaptationSet') && text.includes('ad')) {
                console.log('[AdBlock Pro] Ad segments detected in DASH manifest');
              }
              
              return response;
            });
          });
        }
      }
      
      return originalFetch.apply(this, args);
    };
  }

  // Get detection statistics
  getStats() {
    return {
      adDetections: this.adDetections,
      streamInterruptions: this.streamAnalysis.streamInterruptions.length,
      qualitySwitches: this.streamAnalysis.qualitySwitches.length
    };
  }

  // Initialize monitoring
  initialize() {
    this.monitorManifests();
    
    // Monitor videos every 2 seconds
    setInterval(() => {
      this.monitorVideos();
    }, 2000);
    
    // Initial scan
    this.monitorVideos();
    
    console.log('[AdBlock Pro] Video stream detector initialized');
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoStreamDetector;
}

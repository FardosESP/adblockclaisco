// Advanced Anti-Fingerprinting Module
// Protects against browser fingerprinting and tracking

;(() => {
  'use strict';

  // Canvas Fingerprint Protection
  function protectCanvas() {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    // Add noise to canvas data
    function addCanvasNoise(imageData) {
      const data = imageData.data;
      const noise = Math.floor(Math.random() * 10) - 5;
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      
      return imageData;
    }

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        addCanvasNoise(imageData);
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, args);
    };

    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const imageData = originalGetImageData.apply(this, args);
      return addCanvasNoise(imageData);
    };

    Object.defineProperty(HTMLCanvasElement.prototype.toDataURL, 'toString', {
      value: () => 'function toDataURL() { [native code] }'
    });
  }

  // WebGL Fingerprint Protection
  function protectWebGL() {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    const getSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;

    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // Randomize vendor and renderer
      if (parameter === 0x1F00) { // VENDOR
        return 'Google Inc.';
      }
      if (parameter === 0x1F01) { // RENDERER
        const renderers = [
          'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0)',
          'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
          'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)'
        ];
        return renderers[Math.floor(Math.random() * renderers.length)];
      }
      return getParameter.apply(this, arguments);
    };

    WebGLRenderingContext.prototype.getSupportedExtensions = function() {
      const extensions = getSupportedExtensions.apply(this, arguments);
      // Randomize extension list
      if (Math.random() > 0.5 && extensions) {
        return extensions.filter(() => Math.random() > 0.1);
      }
      return extensions;
    };
  }

  // Audio Context Fingerprint Protection
  function protectAudioContext() {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      return;
    }

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    
    const originalCreateOscillator = AudioContextConstructor.prototype.createOscillator;
    const originalCreateDynamicsCompressor = AudioContextConstructor.prototype.createDynamicsCompressor;

    AudioContextConstructor.prototype.createOscillator = function() {
      const oscillator = originalCreateOscillator.apply(this, arguments);
      const originalStart = oscillator.start;
      
      oscillator.start = function(...args) {
        // Add slight randomization to frequency
        if (oscillator.frequency) {
          const noise = (Math.random() - 0.5) * 0.0001;
          oscillator.frequency.value += noise;
        }
        return originalStart.apply(this, args);
      };
      
      return oscillator;
    };

    AudioContextConstructor.prototype.createDynamicsCompressor = function() {
      const compressor = originalCreateDynamicsCompressor.apply(this, arguments);
      
      // Randomize compressor parameters slightly
      if (compressor.threshold) {
        compressor.threshold.value += (Math.random() - 0.5) * 0.1;
      }
      if (compressor.knee) {
        compressor.knee.value += (Math.random() - 0.5) * 0.1;
      }
      
      return compressor;
    };
  }

  // Screen Resolution Spoofing
  function protectScreen() {
    const originalScreen = {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth
    };

    // Add random variation
    const widthVariation = Math.floor(Math.random() * 20) - 10;
    const heightVariation = Math.floor(Math.random() * 20) - 10;

    Object.defineProperties(screen, {
      width: { get: () => originalScreen.width + widthVariation },
      height: { get: () => originalScreen.height + heightVariation },
      availWidth: { get: () => originalScreen.availWidth + widthVariation },
      availHeight: { get: () => originalScreen.availHeight + heightVariation }
    });
  }

  // Battery API Protection
  function protectBattery() {
    if (navigator.getBattery) {
      const originalGetBattery = navigator.getBattery;
      navigator.getBattery = function() {
        return originalGetBattery.apply(this, arguments).then(battery => {
          Object.defineProperties(battery, {
            level: { get: () => 0.8 + Math.random() * 0.2 },
            charging: { get: () => Math.random() > 0.5 }
          });
          return battery;
        });
      };
    }
  }

  // Hardware Concurrency Protection
  function protectHardware() {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => {
        const cores = [2, 4, 6, 8];
        return cores[Math.floor(Math.random() * cores.length)];
      }
    });

    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => {
        const memory = [2, 4, 8, 16];
        return memory[Math.floor(Math.random() * memory.length)];
      }
    });
  }

  // Font Fingerprint Protection
  function protectFonts() {
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      get: function() {
        const value = originalOffsetWidth.get.call(this);
        return value + (Math.random() - 0.5) * 0.1;
      }
    });

    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      get: function() {
        const value = originalOffsetHeight.get.call(this);
        return value + (Math.random() - 0.5) * 0.1;
      }
    });
  }

  // Media Devices Protection
  function protectMediaDevices() {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
      
      navigator.mediaDevices.enumerateDevices = function() {
        return originalEnumerateDevices.apply(this, arguments).then(devices => {
          // Randomize device IDs
          return devices.map(device => {
            return {
              ...device,
              deviceId: device.deviceId ? 'default' : '',
              groupId: device.groupId ? 'default' : ''
            };
          });
        });
      };
    }
  }

  // Client Rects Protection
  function protectClientRects() {
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    
    Element.prototype.getBoundingClientRect = function() {
      const rect = originalGetBoundingClientRect.apply(this, arguments);
      const noise = (Math.random() - 0.5) * 0.0001;
      
      return {
        ...rect,
        x: rect.x + noise,
        y: rect.y + noise,
        width: rect.width + noise,
        height: rect.height + noise,
        top: rect.top + noise,
        right: rect.right + noise,
        bottom: rect.bottom + noise,
        left: rect.left + noise
      };
    };
  }

  // Timezone Protection
  function protectTimezone() {
    const originalDate = Date;
    
    window.Date = function(...args) {
      const date = new originalDate(...args);
      const originalGetTimezoneOffset = date.getTimezoneOffset;
      
      date.getTimezoneOffset = function() {
        // Add random minutes to offset
        const offset = originalGetTimezoneOffset.apply(this, arguments);
        return offset + (Math.floor(Math.random() * 30) - 15);
      };
      
      return date;
    };
    
    window.Date.prototype = originalDate.prototype;
    window.Date.now = originalDate.now;
    window.Date.parse = originalDate.parse;
    window.Date.UTC = originalDate.UTC;
  }

  // Plugin Array Protection
  function protectPlugins() {
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        // Return empty or minimal plugin array
        return [];
      }
    });

    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        return [];
      }
    });
  }

  // Initialize all protections
  function initializeProtections() {
    try {
      protectCanvas();
      protectWebGL();
      protectAudioContext();
      protectScreen();
      protectBattery();
      protectHardware();
      protectFonts();
      protectMediaDevices();
      protectClientRects();
      protectTimezone();
      protectPlugins();
      
      console.log('[AdBlock Pro] Advanced anti-fingerprinting enabled');
    } catch (e) {
      console.warn('[AdBlock Pro] Anti-fingerprinting partial failure:', e);
    }
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProtections);
  } else {
    initializeProtections();
  }
})();

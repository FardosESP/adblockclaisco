# AdBlock Pro v5.0 - Diseño Minimalista 🛡️

El AdBlock más avanzado del mercado con Machine Learning, detección perceptual, NLP, anti-fingerprinting avanzado, análisis de video streams y protección integral contra amenazas. Ahora con interfaz completamente rediseñada con diseño minimalista moderno.

## 🎨 Nuevo en v5.0 - Rediseño Completo

### ✨ Interfaz Minimalista Moderna
- **Diseño Limpio**: Paleta de colores suaves con alto contraste para mejor legibilidad
- **Espaciado Generoso**: Diseño más amplio y respirable para mejor UX
- **Toggles Modernos**: Switches estilo iOS en todos los controles
- **Animaciones Suaves**: Transiciones elegantes y feedback visual inmediato
- **Tipografía Clara**: Fuentes del sistema optimizadas para legibilidad
- **Modo Claro/Oscuro**: Soporte completo para preferencias del usuario
- **Tarjetas Elegantes**: Diseño de cards con sombras sutiles y bordes redondeados

### 🔧 Mejoras Funcionales v5.0
- **Toggle ON/OFF Corregido**: El botón de activación/desactivación ahora detiene completamente el bloqueo
- **Configuración Optimizada**: YouTube y Twitch bloqueados desactivados por defecto para evitar romper sitios
- **Contador de Reglas**: Muestra "Lista actualizada: 240 reglas activas" al actualizar las listas de filtros
- **Confirmaciones Visuales**: Mensajes de estado con animaciones al cambiar configuración
- **Mejor Feedback**: Indicadores visuales claros del estado de protección

## 🚀 Características de Vanguardia

### 🤖 Tecnologías de Machine Learning y AI
- **Detección Perceptual Visual**: Análisis de características visuales de elementos
  - Detección de tamaños estándar de anuncios (IAB)
  - Análisis de z-index, posicionamiento y comportamiento
  - Identificación de disclosure labels ("Ad", "Sponsored", "Patrocinado")
  - Detección de background images sospechosos
  
- **NLP (Procesamiento de Lenguaje Natural)**: 
  - Análisis de lenguaje persuasivo ("Compra ahora", "Oferta limitada")
  - Detección de urgency words ("Rápido", "Ya", "Hoy")
  - Identificación de exceso de capitalización (SHOUTING)
  - Análisis de símbolos de moneda y precios
  
- **Análisis Comportamental**:
  - Detección de redirects en cadena
  - Identificación de nested iframes (ad networks)
  - Análisis de patrones de interacción sospechosos
  - Detección de target="_blank" masivo

- **CNAME Cloaking Detection**:
  - Identificación de subdominios proxy (ads.ejemplo.com)
  - Detección de tracking paths (/track/, /pixel/, /beacon/)
  - Análisis de patrones de evasión de bloqueadores

### 🎬 Detección Avanzada de Ads en Video Streams
- **Análisis de Streams HLS/DASH**:
  - Monitoreo de manifests .m3u8 (HLS)
  - Detección de markers #EXT-X-CUE-OUT y #EXT-X-DISCONTINUITY
  - Análisis de manifests .mpd (DASH)
  
- **Monitoreo de Video Elements**:
  - Detección de cambios sospechosos en playback rate
  - Identificación de volume boosting (ads)
  - Análisis de quality switches durante ad insertion
  - Tracking de stream interruptions

### 🔒 Anti-Fingerprinting Avanzado
- **Canvas Fingerprint Protection**: Randomización de canvas data
- **WebGL Spoofing**: Vendor y renderer aleatorios
- **Audio Context Protection**: Randomización de oscillator frequency
- **Screen Resolution Spoofing**: Variación aleatoria de dimensiones
- **Battery API Protection**: Niveles de batería aleatorios
- **Hardware Concurrency Randomization**: CPU cores variables
- **Font Fingerprint Protection**: offsetWidth/offsetHeight noise
- **Media Devices Protection**: deviceID randomization
- **Client Rects Noise**: Pequeñas variaciones en getBoundingClientRect
- **Timezone Randomization**: Offset aleatorio
- **Plugin Array Protection**: Lista vacía para evitar detección

### Protección Multicapa
- **🛡️ 240+ Reglas de Bloqueo**: Expandida desde 65 a 240+ reglas optimizadas
  - Dominios de publicidad principales (Google Ads, DoubleClick, Amazon Ads)
  - Redes móviles (AppLovin, Vungle, Unity Ads, Chartboost, Tapjoy)
  - Redes programáticas (The Trade Desk, Criteo, AppNexus, Rubicon)
  - Publisher networks (Ezoic, Mediavine, Raptive)
  - Analytics avanzados (Mixpanel, Segment, Quantcast)
  - Tracking prevalente (orbsrv.com, meta.me, scorecardresearch)
  - 30+ dominios de minería de criptomonedas
  - Redes emergentes 2024-2025 (Bigo Ads: acobt.tech, etc.)

### Detección Inteligente de Amenazas
- **🦠 Anti-Malware Heurístico**: 
  - Análisis de patrones de código sospechoso
  - Detección de eval() maliciosos
  - Identificación de código obfuscado
  - Sistema de scoring inteligente (threshold: 5 puntos)
  - Bloqueo de scripts con comportamiento anómalo

- **⛏️ Anti-Minería de Criptomonedas**:
  - Detección de WebAssembly sospechoso (solo modo agresivo)
  - Análisis heurístico multi-señal (threshold: 8 puntos)
  - Identificación de signatures de minería (CryptoNight, Monero, XMR, etc.)
  - Bloqueo de objetos de minería (CoinHive, CryptoLoot, JSEcoin, etc.)
  - Monitoreo de uso de CPU/memoria

- **👁️ Anti-Tracking Avanzado**:
  - Bloqueo de analytics (Google Analytics, Mixpanel, Segment, etc.)
  - Protección anti-fingerprinting
  - Bloqueo de rastreadores de sesión
  - Prevención de WebSocket sospechosos

### Bloqueo Especializado

#### 🎬 YouTube Ads
- Interceptación de ytInitialPlayerResponse
- Eliminación de adPlacements, playerAds y adSlots
- Auto-skip instantáneo de anuncios
- Bloqueo de anuncios en Shorts
- Filtrado de overlay ads
- Manipulación de experiment flags
- Chequeo cada 500ms para máxima efectividad

#### 🎮 Twitch Ads
- Interceptación de GraphQL con filtrado específico
- Filtrado de streams m3u8 (elimina marcadores de ads)
- Eliminación de purple screen ads
- Bloqueo de preroll y midroll
- Hooks de Twitch.ads API
- Bloqueo de keywords específicos de Twitch

### Módulos de Protección Toggleables
- ✅ Anti-Malware (activable/desactivable)
- ✅ Anti-Minería (activable/desactivable)
- ✅ Anti-Tracking (activable/desactivable)
- ✅ YouTube Ads (activable/desactivable)
- ✅ Twitch Ads (activable/desactivable)

### Sistema de Reportes
- Tracking de amenazas detectadas en tiempo real
- Categorización de bloqueos (ads, trackers, malware, mineros)
- Historial de actividad sospechosa
- Notificaciones de amenazas (configurables)

### 🚫 Protección Anti-Popup y Clickjacking
- **Bloqueo Inteligente de Popups**:
  - Detección de popups sospechosos por patrón de URL
  - Bloqueo de popups automáticos (no iniciados por usuario)
  - Detección y bloqueo de popunders
  - Tracking de interacciones de usuario para permitir ventanas legítimas

- **Protección contra Clickjacking**:
  - Detección de iframes cross-origin sospechosos
  - Identificación de overlays transparentes
  - Bloqueo de elementos con z-index alto + fullscreen + transparentes
  - Prevención de redirecciones en cadena
  - Bloqueo de notification spam

## 📦 Instalación

### En Brave o Chrome

1. Abre `brave://extensions` o `chrome://extensions`
2. Activa el "Modo de desarrollador" (esquina superior derecha)
3. Haz clic en "Cargar extensión sin empaquetar"
4. Selecciona la carpeta de este proyecto
5. ¡Listo! La extensión estará activa

### Vista Previa del Diseño

Para ver una demostración de la interfaz antes de instalar:

1. Clona o descarga este repositorio
2. Abre una terminal en la carpeta del proyecto
3. Ejecuta: `python server.py`
4. Abre tu navegador en `http://localhost:5000/demo.html`
5. Verás una vista previa del popup de la extensión

### Verificación

Ejecuta en la terminal:
```bash
node validate-extension.js
```

Esto verificará que todos los archivos necesarios estén presentes y la extensión esté lista para usar.

## 🎯 Uso

### Configurar Nivel de Bloqueo

La extensión tiene 3 niveles de bloqueo:

- **Básico** 🟢: Bloqueo de red estándar con reglas declarativas
- **Avanzado** 🟡 (Recomendado): Incluye bloqueo especializado para YouTube y Twitch + Anti-detección
- **Agresivo** 🔴: Máximo bloqueo con filtrado cosmético avanzado + detección de WebAssembly

### Módulos de Protección

Accede a la pestaña "Privacidad" para activar/desactivar cada módulo:

1. **Anti-Malware** 🦠: Detecta scripts maliciosos y código sospechoso
2. **Anti-Minería** ⛏️: Bloquea mineros de criptomonedas
3. **Anti-Tracking** 👁️: Protege contra rastreadores
4. **YouTube Ads** 🎬: Bloqueo específico para YouTube
5. **Twitch Ads** 🎮: Bloqueo específico para Twitch

### Agregar Sitios a Whitelist

1. Navega al sitio que quieres permitir
2. Abre la extensión
3. Ve a la pestaña "Privacidad"
4. En la sección "Whitelist", haz clic en el botón de añadir
5. El sitio actual se agregará a la lista

### Ver Estadísticas

La extensión rastrea:
- **Anuncios**: Total de anuncios bloqueados
- **Rastreadores**: Scripts de analytics y tracking bloqueados
- **Malware**: Scripts maliciosos detectados y bloqueados
- **Mineros**: Intentos de minería de criptomonedas bloqueados
- **Sitios**: Dominios únicos donde se bloquearon amenazas

## 🎯 Tecnologías Implementadas

### Machine Learning y AI
- **MLAdDetector**: Módulo de detección con análisis visual, NLP y comportamental
- **Detección Perceptual**: Análisis de 10+ características visuales de elementos
- **NLP Engine**: Procesamiento de lenguaje natural para identificar persuasive language
- **CNAME Cloaking Detection**: Identificación de proxies y subdominios de tracking

### Video Streaming
- **VideoStreamDetector**: Análisis en tiempo real de streams HLS/DASH
- **Manifest Monitoring**: Detección de marcadores de ads en .m3u8 y .mpd
- **Video Element Analysis**: Monitoreo de playback rate, volumen, quality switches
- **Platform-Specific**: Optimizaciones para YouTube y Twitch

### Anti-Fingerprinting
- **10+ APIs Protegidas**: Canvas, WebGL, Audio Context, Screen, Battery, Hardware, Fonts, Media Devices, Client Rects, Timezone, Plugins
- **Randomization Inteligente**: Noise aleatorio sin romper funcionalidad
- **Native Code Spoofing**: toString() methods mantenidos

### Anti-Popup y Anti-Clickjacking
- **User Interaction Tracking**: Diferencia entre popups legítimos vs automáticos
- **Overlay Detection**: Análisis de posición, z-index, opacidad, tamaño
- **Redirect Chain Protection**: Límite de redirects para prevenir abuso

### Network Analysis
- **240+ Reglas Optimizadas**: Incluye últimas redes de 2024-2025
- **Programmatic Ad Networks**: The Trade Desk, Criteo, AppNexus, Rubicon, etc.
- **Mobile Networks**: AppLovin, Vungle, Unity Ads, Chartboost
- **Publisher Networks**: Ezoic, Mediavine, Raptive
- **Emerging Networks**: Bigo Ads (acobt.tech, orbsrv.com, meta.me)

## 📊 Estadísticas Tracked

La extensión rastrea y reporta:
- **Bloqueos Tradicionales**: Ads, Trackers, Miners, Malware
- **Fingerprinting**: Intentos de fingerprinting bloqueados
- **Detecciones ML**: Ads detectados por machine learning
- **Popups**: Ventanas emergentes bloqueadas
- **Clickjacking**: Overlays maliciosos bloqueados
- **Video Ads**: Ads en streams de video bloqueados

## 🔧 Estructura del Proyecto

```
.
├── manifest.json              # Configuración Manifest V3
├── background.js              # Service worker de fondo
├── content-script.js          # Script inyectado en páginas
├── injected-script.js         # Script con hooks avanzados y detección de amenazas
├── ml-detector.js             # ✨ Módulo ML: NLP, análisis visual, comportamental
├── video-stream-detector.js   # ✨ Detector de ads en streams HLS/DASH
├── anti-fingerprint.js        # ✨ Protección anti-fingerprinting avanzada
├── anti-popup.js              # ✨ Protección anti-popup y clickjacking
├── config.js                  # Configuración de niveles de bloqueo
├── popup.html                 # Interfaz del popup (diseño cybersecurity)
├── popup.js                   # Lógica del popup
├── rules.json                 # 210+ reglas de bloqueo de red
├── validate-extension.js      # Script de validación
├── icon16.png                 # Icono 16x16
├── icon48.png                 # Icono 48x48
└── icon128.png                # Icono 128x128
```

## 🛠️ Tecnologías

- **Manifest V3**: Última versión de la API de extensiones de Chrome
- **Declarative Net Request**: Bloqueo eficiente de red (210 reglas)
- **Content Scripts**: Modificación del DOM
- **Injected Scripts**: Hooks a nivel de página con detección heurística
- **Chrome Storage API**: Persistencia de configuración
- **Service Workers**: Background processing eficiente

## 🔒 Privacidad y Seguridad

Esta extensión:
- ✅ NO recopila datos personales
- ✅ NO envía información a servidores externos
- ✅ Toda la configuración se almacena localmente
- ✅ Código abierto y auditable
- ✅ Sin telemetría ni tracking
- ✅ Cumple con las políticas de privacidad de Brave/Chrome

## 🎨 Interfaz Minimalista

Diseño moderno y limpio con:
- **Paleta de Colores Suaves**: Blancos, grises claros y azul como color de acento
- **Espaciado Amplio**: Márgenes generosos para mejor legibilidad
- **Animaciones Sutiles**: Transiciones suaves y elegantes
- **Toggles Estilo iOS**: Switches modernos para cada módulo
- **Dashboard Limpio**: Estadísticas en tiempo real con diseño de tarjetas
- **Gráficos Minimalistas**: Visualización de últimos 7 días con barras degradadas
- **Badges Informativos**: Indicadores de estado con colores significativos
- **Modo Claro/Oscuro**: Adaptación automática a preferencias del sistema

## 📊 Estadísticas de Protección

La extensión incluye:
- Panel de resumen con stats rápidas
- Gráficos de bloqueos por día
- Top sitios bloqueados
- Estadísticas por categoría (ads, trackers, malware, mineros)
- Exportación/importación de datos

## ⚙️ Configuración Avanzada

### Detección ML (Experimental)
Usa inteligencia artificial para detectar anuncios no catalogados

### Notificaciones
Recibe alertas cuando se detecta y bloquea malware o mineros

### Anti-Detección
Sistema avanzado para evitar que los sitios detecten el adblocker

## 🆕 Novedades en v5.0 (Diseño Minimalista)

- 🎨 **Rediseño Completo**: Interfaz minimalista moderna con colores suaves
- 🔘 **Toggles iOS**: Switches modernos estilo iOS en todos los controles
- ✅ **Toggle ON/OFF Corregido**: Ahora desactiva completamente el bloqueo
- 📊 **Contador de Reglas**: Muestra cantidad exacta de reglas activas (240)
- 🎯 **Configuración Optimizada**: YouTube/Twitch OFF por defecto para evitar romper sitios
- 💬 **Feedback Visual**: Mensajes de estado con animaciones al cambiar configuración
- 🌓 **Modo Oscuro Mejorado**: Paleta de colores optimizada para ambos modos
- ✨ **Animaciones Suaves**: Transiciones elegantes en todos los elementos
- 📐 **Espaciado Generoso**: Diseño más amplio y cómodo de usar

## 🆕 Novedades en v4.0.0

- ✨ Expandidas las reglas de bloqueo de 65 a 240+
- 🦠 Sistema de detección heurística de malware
- ⛏️ Detección inteligente de mineros con análisis de WebAssembly
- 🎬 Bloqueo mejorado de YouTube con soporte para Shorts
- 🎮 Bloqueo mejorado de Twitch con filtrado de m3u8
- 🛡️ Módulos de protección toggleables
- 📊 Sistema de reportes de amenazas
- 💾 Monitoreo de CPU/memoria para detectar minería
- 🔍 Análisis de código obfuscado

## 🚦 Compatibilidad

- ✅ Brave Browser
- ✅ Google Chrome
- ✅ Microsoft Edge (basado en Chromium)
- ✅ Opera
- ✅ Otros navegadores basados en Chromium

## 📝 Notas Técnicas

### Sistema Anti-Detección

El sistema anti-detección incluye:
- Descriptores de propiedades nativos para APIs sobrescritas
- Jitter aleatorio en la inyección de scripts (50-100ms)
- toString() que devuelve código nativo
- Randomización de fingerprints

### Detección Heurística de Malware

Patterns detectados:
- eval(atob(...)) - Decodificación base64 + ejecución
- document.write(unescape(...)) - Escritura de código ofuscado
- fromCharCode.apply - Generación de strings desde códigos
- XMLHttpRequest + eval - Descarga y ejecución remota
- Base64 encoding extensivo (>200 chars, 3+ veces)

Scoring:
- Cada pattern detectado: +2 puntos
- Crypto + hash keywords: +3 puntos
- WebAssembly + monero: +4 puntos
- Código minificado grande: +2 puntos
- **Threshold de bloqueo: 5 puntos**

### Detección de Minería WebAssembly (Solo Modo Agresivo)

Signatures buscadas:
- cryptonight, monero, xmr, minero, hashrate
- argon2, scrypt, keccak, blake2b
- worker + hash combinados
- Imports sospechosos (thread, atomic, memory.grow)

Scoring:
- Cada signature: +4 puntos
- Tamaño >2MB: +1 punto
- Worker + hash: +3 puntos
- Imports sospechosos: +1 punto cada uno
- **Threshold de bloqueo: 8 puntos**

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal y educativo.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

**Desarrollado con ❤️ para una web sin anuncios y sin amenazas**

*v5.0 - Diseño Minimalista con Protección Inteligente*

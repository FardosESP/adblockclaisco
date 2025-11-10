# AdBlock Pro - Extensión de Navegador

## Descripción
AdBlock Pro es una extensión avanzada de navegador para bloqueo de anuncios y protección de privacidad con interfaz minimalista en tema oscuro.

## Características Principales

### 🛡️ Protección Completa
- **266 reglas de bloqueo activas** organizadas por categorías
- Bloqueo de anuncios (Google Ads, Amazon, etc.)
- Bloqueo de rastreadores y analytics
- Bloqueo de widgets de redes sociales
- Protección contra malware y minería de criptomonedas

### 🎨 Interfaz Usuario
- **Tema oscuro por defecto** para mejor experiencia visual
- Diseño minimalista y moderno
- 5 pestañas organizadas: Resumen, Estadísticas, Listas, Privacidad, Ajustes
- Buscador en tiempo real de reglas
- Estadísticas visuales con gráficos

### ⚙️ Configuración por Defecto
- Solo el adblock básico está activado por defecto
- Todas las características avanzadas desactivadas (usuario decide qué activar)
- Nivel de bloqueo: BASIC
- Configuración minimalista para mejor rendimiento

## Estructura del Proyecto

### Archivos Principales
- `popup.html` - Interfaz del popup de la extensión (tema oscuro)
- `popup.js` - Lógica de la interfaz (con modo demo)
- `background.js` - Servicio en segundo plano
- `config.js` - Configuración por defecto
- `rules.json` - 266 reglas de bloqueo categorizadas
- `manifest.json` - Configuración de la extensión

### Scripts de Protección
- `anti-fingerprint.js` - Anti-fingerprinting
- `anti-popup.js` - Bloqueador de popups
- `anti-adblock-evasion.js` - Anti-detección de adblock
- `cookie-banner-blocker.js` - Bloqueador de banners de cookies
- `social-widget-blocker.js` - Bloqueador de widgets sociales
- `url-cleaner.js` - Limpiador de parámetros de rastreo
- `cosmetic-filters.js` - Filtros cosméticos
- `ml-detector.js` - Detector de anuncios con IA

## Características Recientes

### ✅ Correcciones Implementadas
- [x] Tema oscuro aplicado por defecto
- [x] Todos los toggles desactivados excepto el principal
- [x] Visualización completa de las 266 reglas (no solo 10)
- [x] Buscador de reglas con filtrado en tiempo real
- [x] Categorización de reglas (Anuncios, Rastreadores, Social, Otros)
- [x] Manejo de errores robusto (funciona en modo demo)
- [x] Estadísticas con datos mock en modo demo
- [x] Contadores mejorados con categorización visual
- [x] Configuración coherente en todos los archivos

### 🎯 Estadísticas de Reglas
- 🎯 Anuncios: Reglas específicas de publicidad
- 👁️ Rastreadores: Analytics y tracking
- 📱 Social Media: Facebook, Twitter, Instagram, LinkedIn
- 🛡️ Otros: Reglas adicionales de protección

## Modo de Uso

### Como Extensión de Chrome
1. Abrir Chrome y navegar a `chrome://extensions/`
2. Activar "Modo de desarrollador"
3. Hacer clic en "Cargar extensión sin empaquetar"
4. Seleccionar la carpeta del proyecto
5. La extensión aparecerá en la barra de herramientas

### Modo Demo (Servidor Web)
```bash
python server.py
```
Abrir navegador en `http://localhost:5000/popup.html`

## Configuración Técnica

### Configuración Por Defecto
```javascript
{
  blockLevel: 'basic',
  enableML: false,
  antiFingerprint: false,
  showNotifications: false,
  autoWhitelist: true,
  sponsorBlock: false
}
```

### Listas de Filtros Disponibles
1. **EasyList** ✓ (Activada por defecto)
2. EasyPrivacy
3. Anti-Adblock Killer
4. Fanboy Annoyances
5. Fanboy Social
6. Malware Domains
7. URLhaus
8. AdGuard Base

## Funcionalidades de Búsqueda

El buscador de reglas permite:
- Búsqueda por URL/dominio
- Búsqueda por ID de regla
- Filtrado en tiempo real
- Contador de resultados
- Categorización visual de resultados

## Estadísticas

### Datos Rastreados
- Total de elementos bloqueados
- Anuncios bloqueados
- Rastreadores bloqueados
- Mineros de crypto bloqueados
- Intentos de fingerprinting bloqueados
- Detecciones por IA
- Popups bloqueados
- Intentos de clickjacking
- Anuncios en videos bloqueados

### Visualización
- Estadísticas por día (últimos 7 días)
- Top 5 sitios con más bloqueos
- Estadísticas por dominio
- Contadores en tiempo real

## Temas y Diseño

### Variables CSS del Tema Oscuro
```css
--bg-primary: #1a1a1a
--bg-secondary: #242424
--bg-tertiary: #2a2a2a
--text-primary: #f1f3f5
--accent: #3b82f6
```

## Desarrollo

### Servidor de Desarrollo
El proyecto incluye un servidor Python simple para desarrollo:
- Puerto: 5000
- Cache desactivado para desarrollo
- Sirve todos los archivos estáticos

### Próximas Mejoras
- [ ] Sincronización entre pestañas
- [ ] Exportación/importación de configuración
- [ ] Whitelist mejorada con patrones
- [ ] Estadísticas históricas extendidas
- [ ] Perfiles de bloqueo personalizados

## Actualizaciones Recientes

**Noviembre 10, 2025**
- ✓ Implementado tema oscuro completo
- ✓ Configuración por defecto optimizada (solo basic activo)
- ✓ Añadido buscador de reglas con 266 reglas visibles
- ✓ Categorización automática de reglas
- ✓ Mejoras visuales y UX
- ✓ Manejo robusto de errores para modo demo
- ✓ Estadísticas con datos mock en demo

## Autor
Desarrollado con ❤️ usando Chrome Extension APIs y Vanilla JavaScript

## Versión
v5.0.0 - Minimalista Edition

# AdBlock Pro - Protección Total 🛡️

Bloqueador profesional de anuncios multi-nivel con bloqueo especializado para YouTube y Twitch.

## Características Principales

### Niveles de Bloqueo Configurables
- **🛡️ Básico**: Bloqueo de red estándar con reglas declarativas
- **⚡ Avanzado**: Incluye bloqueo especializado para YouTube y Twitch + Anti-detección
- **🔥 Agresivo**: Máximo bloqueo con filtrado cosmético avanzado

### Bloqueo Especializado
- **YouTube**: Interceptación de API del player, eliminación de adPlacements, auto-skip de anuncios
- **Twitch**: Bloqueo de stream ads, filtrado de payloads GQL, eliminación de purple screen ads
- **Universal**: Bloqueo de anuncios genéricos, rastreadores, mineros de criptomonedas y banners de cookies

### Características Avanzadas
- ✅ Sistema anti-detección para evitar que sitios detecten el adblocker
- ✅ Estadísticas en tiempo real con gráficos de últimos 7 días
- ✅ Whitelist personalizable por dominio
- ✅ Exportar/importar configuración
- ✅ Tema claro/oscuro
- ✅ Panel de control profesional con estadísticas detalladas

## Instalación

### En Brave o Chrome

1. Abre `brave://extensions` o `chrome://extensions`
2. Activa el "Modo de desarrollador" (esquina superior derecha)
3. Haz clic en "Cargar extensión sin empaquetar"
4. Selecciona la carpeta de este proyecto
5. ¡Listo! La extensión estará activa

### Verificación

Ejecuta en la terminal:
```bash
node validate-extension.js
```

Esto verificará que todos los archivos necesarios estén presentes.

## Uso

### Configurar Nivel de Bloqueo

1. Haz clic en el ícono de la extensión
2. Ve a la pestaña "Ajustes"
3. Selecciona tu nivel de bloqueo preferido:
   - **Básico** para navegación rápida con bloqueo mínimo
   - **Avanzado** (recomendado) para balance entre rendimiento y bloqueo
   - **Agresivo** para máxima protección

### Agregar Sitios a Whitelist

1. Navega al sitio que quieres agregar
2. Abre la extensión
3. Ve a la pestaña "Whitelist"
4. Haz clic en "+ Agregar"

### Ver Estadísticas

- **Anuncios**: Total de anuncios bloqueados
- **Rastreadores**: Scripts de analytics y tracking bloqueados
- **Mineros**: Intentos de minería de criptomonedas bloqueados
- **Sitios**: Dominios únicos donde se bloquearon anuncios

El gráfico muestra los bloqueos de los últimos 7 días.

## Estructura del Proyecto

```
.
├── manifest.json              # Configuración de la extensión
├── background.js              # Service worker de fondo
├── content-script.js          # Script inyectado en páginas
├── injected-script.js         # Script de página con hooks avanzados
├── config.js                  # Configuración de niveles de bloqueo
├── popup.html                 # Interfaz del popup
├── popup.js                   # Lógica del popup
├── rules.json                 # Reglas de bloqueo de red (65 reglas)
└── validate-extension.js      # Script de validación
```

## Tecnologías

- **Manifest V3**: Última versión de la API de extensiones de Chrome
- **Declarative Net Request**: Bloqueo eficiente de red
- **Content Scripts**: Modificación del DOM
- **Injected Scripts**: Hooks a nivel de página
- **Chrome Storage API**: Persistencia de configuración

## Privacidad

Esta extensión:
- ✅ NO recopila datos personales
- ✅ NO envía información a servidores externos
- ✅ Toda la configuración se almacena localmente
- ✅ Código abierto y auditable

## Compatibilidad

- ✅ Brave Browser
- ✅ Google Chrome
- ✅ Microsoft Edge (basado en Chromium)
- ✅ Opera
- ✅ Otros navegadores basados en Chromium

## Notas Técnicas

### Anti-Detección

El sistema anti-detección incluye:
- Descriptores de propiedades nativos para APIs sobrescritas
- Jitter aleatorio en la inyección de scripts
- toString() que devuelve código nativo
- Randomización de fingerprints

### YouTube

El bloqueo de YouTube funciona mediante:
- Interceptación de `ytInitialPlayerResponse`
- Eliminación de `adPlacements` y `playerAds`
- Manipulación de `JSON.parse` para filtrar anuncios
- Auto-click de botones de skip

### Twitch

El bloqueo de Twitch incluye:
- Hooks de `window.twads` y `window.adRequest`
- Filtrado de payloads GraphQL
- Interceptación de fetch para peticiones de anuncios
- MutationObserver para eliminar elementos de anuncios

## Versión

**v2.3.0** - Sistema multi-nivel con bloqueo especializado

## Licencia

Este proyecto es de código abierto y está disponible para uso personal.

---

**Desarrollado con ❤️ para una web sin anuncios**

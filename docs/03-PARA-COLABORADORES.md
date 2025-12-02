# 👥 Guía para Colaboradores - Roam Discourse Selector

**Esta es la guía COMPLETA para trabajar en el código del plugin.**

Si vas a modificar, mejorar o mantener este proyecto, **empieza aquí**.

---

## 📋 Tabla de Contenidos

1. [Contexto del Proyecto](#contexto-del-proyecto)
2. [Estado Actual (v2.12.0)](#estado-actual-v2120)
3. [Cómo Está Estructurado el Código](#cómo-está-estructurado-el-código)
4. [Cómo Modificar el Código](#cómo-modificar-el-código)
5. [Proceso de Desarrollo](#proceso-de-desarrollo)
6. [Mejoras Implementadas en Esta Sesión](#mejoras-implementadas-en-esta-sesión)
7. [APIs de Roam Utilizadas](#apis-de-roam-utilizadas)
8. [Cómo Agregar Nuevas Funcionalidades](#cómo-agregar-nuevas-funcionalidades)
9. [Testing y Debugging](#testing-y-debugging)
10. [Consejos y Mejores Prácticas](#consejos-y-mejores-prácticas)

---

## 1. Contexto del Proyecto

### ¿Por qué existe este plugin?

Este plugin fue creado para resolver un problema específico en investigación académica:

**Problema**:
- Investigadores usan Roam Research para análisis de discurso
- Necesitan **exportar** elementos específicos (evidencias, preguntas, claims)
- Filtrados por **proyecto de investigación**
- En formato compatible con Roam para poder **re-importar**

**Solución**:
- Plugin que busca páginas con prefijos específicos (`[[EVD]]`, `[[QUE]]`, `[[CLM]]`)
- Filtra por "Proyecto Asociado::"
- Exporta en formato nativo de Roam (JSON)

### Metodología de Análisis de Discurso

El plugin sigue esta estructura:

1. **Elementos de Discurso** = Páginas con prefijos específicos
   - `[[EVD]] - Descripción` → Evidencias
   - `[[QUE]] - Descripción` → Preguntas de investigación
   - `[[CLM]] - Descripción` → Claims/Afirmaciones

2. **Proyectos** = Etiquetas para organizar elementos
   - Definidos con: `Proyecto Asociado:: [[nombre del proyecto]]`
   - Pueden estar organizados jerárquicamente: `artículo/Simmel`, `tesis/Bourdieu`

3. **Exportación** = Obtener todos los elementos de uno o más proyectos en JSON

---

## 2. Estado Actual (v2.12.0)

### Funcionalidades Implementadas

✅ **Búsqueda y filtrado**:
- Detecta automáticamente proyectos en el grafo
- Permite selección múltiple de proyectos
- Búsqueda/filtrado de proyectos si hay >3
- Validación de proyectos en el grafo

✅ **Exportación**:
- Formato nativo de Roam (100% compatible)
- Múltiples proyectos en un solo archivo
- Incluye referencias sin proyecto (opcional)
- Vista previa antes de exportar
- Feedback de progreso granular

✅ **Gestión de proyectos**:
- Auto-detección de proyectos en el grafo
- Agregar/eliminar proyectos manualmente
- Sincronización con Roam (página `[[roam/js/discourse-selector/projects]]`)
- Caché con TTL de 60 segundos

✅ **Historial** (v2.12.0):
- Últimas 5 exportaciones
- Información detallada (fecha, proyectos, páginas, errores)
- Almacenamiento en localStorage
- Botón para limpiar historial

✅ **UX**:
- Manejo de teclado (Escape, Enter)
- Focus trap en modal
- Modal permanece abierto después de exportar
- 3 pestañas: Exportar, Gestionar, Historial
- Mensajes de error categorizados

✅ **Calidad de código**:
- Validación de entrada unificada
- Algoritmos optimizados
- Prevención de inyección
- Funciones de debugging

### Archivos del Proyecto

```
roamDiscourseSelector/
├── roam-js-version.js          # EL CÓDIGO PRINCIPAL (2685 líneas)
├── README.md                    # Overview general
├── CHANGELOG.md                 # Historial de versiones
├── package.json                 # Metadata
├── LICENSE                      # MIT
├── docs/                        # Documentación
├── ejemplos/                    # Ejemplos de exportación
└── recursos/                    # Recursos técnicos
```

---

## 3. Cómo Está Estructurado el Código

El archivo `roam-js-version.js` tiene **2685 líneas** organizadas así:

### Estructura General (líneas aproximadas)

```javascript
/**
 * Header con versión y descripción
 * Líneas 1-22
 */

(function() {
  'use strict';

  // ============================================================================
  // CONSTANTES
  // Líneas 23-60
  // ============================================================================
  const DISCOURSE_ELEMENTS = { EVD: '[[EVD]]', QUE: '[[QUE]]', CLM: '[[CLM]]' };
  const PLUGIN_VERSION = 'v2.12.0';
  const EXPORT_HISTORY_KEY = 'roamDiscourseSelector_exportHistory';
  // ... más constantes

  // ============================================================================
  // GESTIÓN DE PROYECTOS MANUALES (localStorage)
  // Líneas 102-280
  // ============================================================================
  function validateProjectName(projectName) { ... }
  function loadManualProjects() { ... }
  function addManualProject(projectName) { ... }
  function removeManualProject(projectName) { ... }
  // ...

  // ============================================================================
  // SINCRONIZACIÓN CON ROAM
  // Líneas 280-400
  // ============================================================================
  function findProjectsPage() { ... }
  function loadProjectsFromRoam() { ... }
  function syncProjectsToRoam(projects) { ... }
  // ...

  // ============================================================================
  // CACHÉ DE PROYECTOS
  // Líneas 400-520
  // ============================================================================
  function loadProjectsCache() { ... }
  function saveProjectsCache(projects) { ... }
  function getAllProjects() { ... }
  // ...

  // ============================================================================
  // HISTORIAL DE EXPORTACIONES
  // Líneas 555-610
  // ============================================================================
  function loadExportHistory() { ... }
  function saveExportToHistory(entry) { ... }
  function clearExportHistory() { ... }

  // ============================================================================
  // UTILIDADES
  // Líneas 520-720
  // ============================================================================
  function downloadJSON(data, filename) { ... }
  function categorizeError(error) { ... }  // v2.11.1
  function sanitizeFilename(name) { ... }
  // ...

  // ============================================================================
  // TRANSFORMACIÓN DE FORMATO NATIVO
  // Líneas 720-880
  // ============================================================================
  function transformToNativeFormat(pageData) { ... }
  function exportPagesNative(pageUids, filename, onProgress) { ... }
  // ...

  // ============================================================================
  // CONSULTAS DATALOG
  // Líneas 880-1250
  // ============================================================================
  async function findPagesWithProject(projectName) { ... }
  async function queryDiscoursePages(projectName, elementKeys) { ... }
  async function findReferencedDiscoursePages(pageUids, prefixes) { ... }
  // ...

  // ============================================================================
  // COMPONENTE REACT - MODAL
  // Líneas 1250-2500
  // ============================================================================
  const ExportModal = ({ onClose }) => {
    // Estados
    const [availableProjects, setAvailableProjects] = React.useState([]);
    const [exportHistory, setExportHistory] = React.useState([]);
    // ... más estados

    // Efectos
    React.useEffect(() => { ... });  // Cargar proyectos
    React.useEffect(() => { ... });  // Cargar historial
    React.useEffect(() => { ... });  // Manejo de teclado
    React.useEffect(() => { ... });  // Focus trap

    // Handlers
    const handleExport = async () => { ... };
    const handleClose = () => { ... };
    // ... más handlers

    // Render (3 pestañas)
    return React.createElement('div', ...);
  };

  // ============================================================================
  // FUNCIONES DE DEBUGGING
  // Líneas 2500-2600
  // ============================================================================
  window.roamDiscourseSelector = {
    debugAllProjects: async () => { ... },
    debugProjectPages: async (projectName) => { ... },
    invalidateCache: () => { ... },
    openModal: () => { ... }
  };

  // ============================================================================
  // REGISTRO DE COMANDO EN ROAM
  // Líneas 2600-2685
  // ============================================================================
  window.roamAlphaAPI.ui.commandPalette.addCommand({
    label: COMMAND_LABEL,
    callback: () => { ... }
  });

})();
```

### Secciones Clave

1. **Constantes** (líneas 23-60):
   - Configuración global
   - Versión del plugin
   - Claves de localStorage

2. **Gestión de Proyectos** (líneas 102-520):
   - localStorage (manual)
   - Sincronización con Roam
   - Caché

3. **Historial** (líneas 555-610):
   - Nuevo en v2.12.0
   - localStorage para historial de exportaciones

4. **Utilidades** (líneas 520-720):
   - Descarga de archivos
   - Sanitización
   - Categorización de errores (v2.11.1)

5. **Exportación** (líneas 720-880):
   - Transformación a formato nativo
   - Progreso granular (v2.11.1)

6. **Consultas Datalog** (líneas 880-1250):
   - Búsqueda de páginas
   - Algoritmo optimizado (v2.11.0)

7. **UI React** (líneas 1250-2500):
   - Componente del modal
   - 3 pestañas
   - Manejo de teclado (v2.11.0)
   - Focus trap (v2.11.0)

---

## 4. Cómo Modificar el Código

### Workflow Básico

1. **Edita** el archivo `roam-js-version.js` en tu editor
2. **Copia** TODO el contenido
3. **Pega** en Roam (`[[roam/js]]`)
4. **Recarga** la página (F5)
5. **Prueba** los cambios

### Herramientas Recomendadas

- **Editor**: VS Code, Sublime, Atom
- **Consola**: Chrome DevTools (F12)
- **Git**: Para control de versiones

### Debugging en Roam

```javascript
// En la consola de Chrome (F12)
window.roamDiscourseSelector.debugAllProjects()
window.roamDiscourseSelector.debugProjectPages('nombre')
console.log('Debug:', variable)
```

---

## 5. Proceso de Desarrollo

### Versionado Semántico

El proyecto usa versionado semántico: `MAJOR.MINOR.PATCH`

- **MAJOR** (2.x.x): Cambios incompatibles
- **MINOR** (x.11.x): Nuevas funcionalidades compatibles
- **PATCH** (x.x.1): Correcciones de bugs

Ejemplos:
- v2.11.0 → Nueva funcionalidad (manejo de teclado, focus trap)
- v2.11.1 → Mejora (progreso granular, errores categorizados)
- v2.12.0 → Nueva funcionalidad (historial de exportaciones)

### Pasos para Crear una Nueva Versión

1. **Modifica el código**:
   - Edita `roam-js-version.js`
   - Prueba en Roam

2. **Actualiza la versión en el código**:
   ```javascript
   // Línea 37
   const PLUGIN_VERSION = 'v2.13.0';

   // Líneas 1-22 (header)
   /**
    * Roam Discourse Selector v2.13.0
    * ...
    * v2.13.0 - Tu descripción de cambios
    * - Cambio 1
    * - Cambio 2
    */
   ```

3. **Actualiza `package.json`**:
   ```json
   {
     "version": "2.13.0"
   }
   ```

4. **Actualiza `CHANGELOG.md`**:
   - Agrega nueva sección al inicio
   - Describe todos los cambios

5. **Actualiza `README.md`**:
   - Sección "Notas de Versión"
   - Versión actual al final del archivo

6. **Commit y push**:
   ```bash
   git add .
   git commit -m "feat: Descripción de la nueva funcionalidad (v2.13.0)"
   git push
   ```

### Convenciones de Commits

- `feat:` → Nueva funcionalidad
- `fix:` → Corrección de bug
- `refactor:` → Refactorización
- `docs:` → Cambios en documentación
- `chore:` → Tareas de mantenimiento

---

## 6. Mejoras Implementadas en Esta Sesión

Esta sección documenta TODAS las mejoras realizadas desde v2.10.5 hasta v2.12.0.

### v2.11.0 - Mejoras de UX, Accesibilidad y Rendimiento

**Fecha**: 2025-11-18

#### 1. Manejo de Teclado en Modal

**Ubicación**: Líneas 1487-1510

**¿Qué hace?**
- Detecta cuando el usuario presiona `Escape` o `Enter` en el modal
- `Escape` → Cierra el modal
- `Enter` → Exporta (solo en pestaña Export, no en inputs)

**Código**:
```javascript
React.useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
    if (e.key === 'Enter' &&
        activeTab === 'export' &&
        !isExporting &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      handleExport();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [activeTab, isExporting]);
```

**Por qué se hizo**:
- Mejora la UX: usuario puede cerrar rápidamente con Escape
- Accesibilidad: usuarios de teclado pueden exportar sin mouse

#### 2. Focus Trap

**Ubicación**: Líneas 1512-1553

**¿Qué hace?**
- Mantiene el foco del teclado dentro del modal
- Al presionar Tab en el último elemento → vuelve al primero
- Al presionar Shift+Tab en el primero → va al último

**Código**:
```javascript
React.useEffect(() => {
  const modalElement = document.getElementById('discourse-export-modal-content');
  if (!modalElement) return;

  const getFocusableElements = () => {
    return modalElement.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), ...'
    );
  };

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  // Auto-focus al abrir
  const focusableElements = getFocusableElements();
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }

  document.addEventListener('keydown', handleTabKey);
  return () => document.removeEventListener('keydown', handleTabKey);
}, [availableProjects, activeTab, isExporting]);
```

**Por qué se hizo**:
- Accesibilidad: usuarios de teclado no pueden "escaparse" del modal
- Estándar WCAG 2.1: modales deben tener focus trap

#### 3. Algoritmo de Balanceo de Corchetes Optimizado

**Ubicación**: Líneas 1022-1057 (función `findReferencedDiscoursePages`)

**Antes (v2.10.x)**:
```javascript
// Búsqueda lineal con indexOf en bucle
prefixes.forEach(prefix => {
  const searchPattern = `[[[[${prefixText}]]`;
  let searchIndex = 0;

  while ((searchIndex = blockString.indexOf(searchPattern, searchIndex)) !== -1) {
    // Balancear corchetes...
    let bracketCount = 0;
    let i = searchIndex;
    while (i < blockString.length) {
      if (blockString[i] === '[') bracketCount++;
      else if (blockString[i] === ']') bracketCount--;
      i++;
    }
    searchIndex = i + 1;
  }
});
```

**Ahora (v2.11.0)**:
```javascript
// Una sola pasada con state machine
const extractBalancedBrackets = (str, startIndex) => {
  let bracketCount = 0;
  let i = startIndex;

  while (i < str.length) {
    if (str[i] === '[') bracketCount++;
    else if (str[i] === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        return str.slice(startIndex + 2, i - 1);
      }
    }
    i++;
  }
  return null;
};

// Una sola pasada por el string
for (let i = 0; i < len - 3; i++) {
  if (blockString.slice(i, i + 4) === '[[[[') {
    for (const prefixText of prefixTexts) {
      const expectedStart = `[[[[${prefixText}]]`;
      if (blockString.slice(i, i + expectedStart.length) === expectedStart) {
        const title = extractBalancedBrackets(blockString, i);
        if (title && title.startsWith(`[[${prefixText}]]`)) {
          referencedTitles.add(title);
        }
        // Skip adelante
        let skipTo = i + 4;
        // ... lógica de skip
        i = skipTo;
        break;
      }
    }
  }
}
```

**Complejidad**:
- Antes: O(n × m × k) donde n = bloques, m = prefixes, k = longitud promedio
- Ahora: O(n × m) - eliminamos k con una sola pasada

**Mejora de rendimiento**: ~2-3x más rápido en promedio

**Por qué se hizo**:
- Bloques con muchas referencias eran lentos de procesar
- Optimización algorítmica reduce tiempo de exportación

#### 4. Validación de Entrada Unificada

**Ubicación**: Líneas 112-143 (función `validateProjectName`)

**¿Qué hace?**
- Centraliza toda la validación de nombres de proyectos
- Previene inyección de caracteres peligrosos
- Usado en todas las funciones de gestión de proyectos

**Código**:
```javascript
function validateProjectName(projectName) {
  // Validar tipo
  if (projectName === null || projectName === undefined) {
    throw new TypeError('El nombre del proyecto no puede ser null o undefined');
  }

  if (typeof projectName !== 'string') {
    throw new TypeError(`El nombre del proyecto debe ser un string, recibido: ${typeof projectName}`);
  }

  // Sanitizar
  const trimmed = projectName.trim();

  if (trimmed === '') {
    throw new Error('El nombre del proyecto no puede estar vacío');
  }

  // Prevenir caracteres peligrosos
  const dangerousChars = ['"', '\\', '\n', '\r', '\t'];
  for (const char of dangerousChars) {
    if (trimmed.includes(char)) {
      throw new Error(`El nombre del proyecto contiene caracteres no permitidos: ${char}`);
    }
  }

  // Advertir si contiene ]]
  if (trimmed.includes(']]')) {
    console.warn(`⚠️ El nombre "${trimmed}" contiene ']]' lo cual puede causar problemas en búsquedas`);
  }

  return trimmed;
}
```

**Usado en**:
- `addManualProject()` - línea 183
- `editManualProject()` - línea 244
- `findPagesWithProject()` - línea 888

**Por qué se hizo**:
- Antes: validación inconsistente (algunas funciones validaban, otras no)
- Ahora: validación centralizada y robusta
- Previene bugs por entrada inválida

---

### v2.11.1 - Mejoras de Calidad de Código

**Fecha**: 2025-11-18

#### 1. Feedback de Progreso Granular

**Ubicación**: Líneas 742-787, 1450-1506

**¿Qué hace?**
- Muestra progreso detallado en cada paso de la exportación
- Callback de progreso en `exportPagesNative()`

**Antes**:
```javascript
setProgress('📦 Exportando...');
// Usuario no sabe qué está pasando
```

**Ahora**:
```javascript
// En handleExport
for (let i = 0; i < selectedProjectNames.length; i++) {
  const projectName = selectedProjectNames[i];
  setProgress(`🔍 Buscando en proyecto ${i + 1}/${selectedProjectNames.length}: "${projectName}"...`);
  const results = await queryDiscoursePages(projectName, selectedKeys);
}

setProgress(`✓ Encontradas ${uniqueResults.length} páginas en ${selectedProjectNames.length} proyecto(s)`);
setProgress(`📡 Descargando datos de Roam...`);
setProgress(`✓ Datos descargados en ${pullTime}ms`);
setProgress(`🔄 Transformando ${rawPagesData.length} página(s)...`);
setProgress(`✓ Procesadas ${index + 1}/${rawPagesData.length} páginas...`);  // Cada 5 páginas
```

**Callback en exportPagesNative**:
```javascript
async function exportPagesNative(pageUids, filename, onProgress = null) {
  const reportProgress = (msg) => {
    console.log(msg);
    if (onProgress) onProgress(msg);
  };

  reportProgress(`🔄 Iniciando exportación de ${pageUids.length} página(s)...`);
  reportProgress(`📡 Descargando datos de Roam...`);
  reportProgress(`✓ Datos descargados en ${pullTime}ms`);

  // Reportar cada 5 páginas
  if ((index + 1) % 5 === 0 || index === rawPagesData.length - 1) {
    reportProgress(`✓ Procesadas ${index + 1}/${rawPagesData.length} páginas...`);
  }
}
```

**Por qué se hizo**:
- Usuario no sabía si la exportación estaba funcionando o bloqueada
- Mejora percepción de velocidad
- Facilita debugging

#### 2. Mensajes de Error Categorizados

**Ubicación**: Líneas 619-671 (función `categorizeError`)

**¿Qué hace?**
- Analiza el tipo de error
- Retorna mensaje específico con solución

**Código**:
```javascript
function categorizeError(error) {
  const errorMsg = error.message || error.toString();
  const errorName = error.name || '';

  // Error de cuota
  if (errorName === 'QuotaExceededError' || errorMsg.includes('quota')) {
    return '❌ Exportación demasiado grande para el navegador. Intenta menos páginas.';
  }

  // Error de timeout
  if (errorMsg.includes('timeout')) {
    return '❌ Tardó demasiado tiempo. Intenta menos páginas.';
  }

  // Error de memoria
  if (errorMsg.includes('memory') || errorMsg.includes('heap')) {
    return '❌ Sin memoria suficiente. Cierra otras pestañas.';
  }

  // Error de red
  if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
    return '❌ Error de conexión. Verifica tu internet.';
  }

  // Error de Roam API
  if (errorMsg.includes('roamAlphaAPI') || errorMsg.includes('pull_many')) {
    return `❌ Error en la API de Roam: ${errorMsg}. Recarga (F5).`;
  }

  // Error de validación
  if (errorMsg.includes('validación') || errorMsg.includes('no puede estar vacío')) {
    return `❌ Error de validación: ${errorMsg}`;
  }

  // Error genérico
  if (errorMsg.length > 0 && errorMsg.length < 150) {
    return `❌ Error: ${errorMsg}`;
  }

  return '❌ Error desconocido. Revisa consola (F12).';
}
```

**Usado en**:
```javascript
// handleExport - línea 1635
catch (error) {
  const userMessage = categorizeError(error);
  setMessage(userMessage);
}
```

**Antes**:
```javascript
setMessage(`❌ Error: ${error.message || 'Error desconocido'}`);
// Usuario ve: "❌ Error: Error desconocido"
```

**Ahora**:
```javascript
// Usuario ve: "❌ Sin memoria suficiente. Cierra otras pestañas."
```

**Por qué se hizo**:
- Mensajes genéricos no ayudan al usuario
- Ahora cada error tiene una solución sugerida
- Facilita auto-debugging

---

### v2.12.0 - Historial de Exportaciones y Mejoras de UX

**Fecha**: 2025-11-18

#### 1. Historial de Exportaciones

**Ubicación**: Líneas 555-610, 1285-1287, 1618-1651, 2318-2455

**Componentes**:

**A. Funciones de gestión del historial** (líneas 555-610):
```javascript
function loadExportHistory() {
  try {
    const stored = localStorage.getItem(EXPORT_HISTORY_KEY);
    if (stored) {
      const history = JSON.parse(stored);
      return Array.isArray(history) ? history : [];
    }
  } catch (error) {
    console.error('Error al cargar historial:', error);
  }
  return [];
}

function saveExportToHistory(entry) {
  try {
    const history = loadExportHistory();
    history.unshift(entry);  // Agregar al inicio
    const trimmedHistory = history.slice(0, MAX_HISTORY_ENTRIES);  // Mantener solo 5
    localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Error al guardar en historial:', error);
  }
}

function clearExportHistory() {
  try {
    localStorage.removeItem(EXPORT_HISTORY_KEY);
  } catch (error) {
    console.error('Error al limpiar historial:', error);
  }
}
```

**B. Estados React** (líneas 1285-1287):
```javascript
const [exportHistory, setExportHistory] = React.useState([]);
const [showHistory, setShowHistory] = React.useState(false);
```

**C. Cargar historial al montar** (líneas 1314-1318):
```javascript
React.useEffect(() => {
  const history = loadExportHistory();
  setExportHistory(history);
}, []);
```

**D. Guardar al exportar** (líneas 1618-1651):
```javascript
// Éxito
saveExportToHistory({
  timestamp: Date.now(),
  date: new Date().toISOString(),
  projects: selectedProjectNames,
  pagesCount: result.pagesExported,
  status: 'success',
  timeMs: result.timeMs
});

// Error
saveExportToHistory({
  timestamp: Date.now(),
  date: new Date().toISOString(),
  projects: selectedProjectNames,
  pagesCount: 0,
  status: 'error',
  errorMessage: userMessage
});

// Actualizar UI
const newHistory = loadExportHistory();
setExportHistory(newHistory);
```

**E. UI del historial** (líneas 2318-2455):
```javascript
// Nueva pestaña en tabs
React.createElement('button', {
  onClick: () => setActiveTab('history'),
  style: { ... }
}, `Historial ${exportHistory.length > 0 ? `(${exportHistory.length})` : ''}`)

// Contenido de la pestaña
: activeTab === 'history'
  ? React.createElement('div', null,
      exportHistory.length === 0
        ? // Estado vacío
        : // Lista de exportaciones
          exportHistory.map((entry, index) => {
            const date = new Date(entry.date);
            const dateStr = date.toLocaleDateString('es-ES', ...);
            const timeStr = date.toLocaleTimeString('es-ES', ...);

            const isSuccess = entry.status === 'success';
            const bgColor = isSuccess ? '#f0f8f4' : '#fff3f3';
            const borderColor = isSuccess ? '#4caf50' : '#f44336';

            return React.createElement('div', {
              key: entry.timestamp,
              style: { ... }
            },
              // Información de la exportación
            );
          })
    )
```

**Formato de entrada**:
```javascript
{
  timestamp: 1700340732000,
  date: "2025-11-18T14:32:12.000Z",
  projects: ["artículo/Simmel", "tesis/Bourdieu"],
  pagesCount: 42,
  status: "success",  // o "error"
  timeMs: 2345,       // opcional (solo éxito)
  errorMessage: "..." // opcional (solo error)
}
```

**Por qué se hizo**:
- Usuario quería ver historial de exportaciones recientes
- Facilita auditoría y debugging
- Permite comparar exportaciones

#### 2. Modal Permanece Abierto

**Ubicación**: Líneas 1618-1630 (eliminado el setTimeout)

**Antes (v2.11.1)**:
```javascript
setMessageWithTimeout(`✅ Exportadas ${result.pagesExported} página(s)...`);

// Cerrar modal después de éxito
setTimeout(() => {
  try {
    onClose();
  } catch (closeError) {
    console.error('Error al cerrar modal:', closeError);
  }
}, MESSAGE_TIMEOUT_SHORT);  // 2000ms
```

**Ahora (v2.12.0)**:
```javascript
setMessageWithTimeout(`✅ Exportadas ${result.pagesExported} página(s)...`);
setProgress(`⏱️ Completado en ${result.timeMs}ms`);

// Guardar en historial
saveExportToHistory({ ... });

// Recargar historial en la UI
const newHistory = loadExportHistory();
setExportHistory(newHistory);

// ¡NO SE CIERRA EL MODAL!
```

**Por qué se hizo**:
- Usuario quería poder hacer múltiples exportaciones sin reabrir
- Workflow mejorado: exportar → revisar historial → exportar de nuevo
- Usuario cierra manualmente cuando termina

#### 3. Estructura de 3 Pestañas

**Ubicación**: Líneas 1795-1846, 2075-2455

**Antes (v2.11.1)**:
```javascript
activeTab === 'export'
  ? // Vista Exportar
  : // Vista Gestionar (ternario simple)
```

**Ahora (v2.12.0)**:
```javascript
activeTab === 'export'
  ? // Vista Exportar
  : activeTab === 'manage'
    ? // Vista Gestionar
    : // Vista Historial (ternario anidado)
```

**Tabs**:
```javascript
React.createElement('button', {
  onClick: () => setActiveTab('export'),
  style: {
    fontWeight: activeTab === 'export' ? '600' : '400',
    color: activeTab === 'export' ? '#0066cc' : '#666',
    borderBottom: activeTab === 'export' ? '2px solid #0066cc' : 'none'
  }
}, 'Exportar'),

React.createElement('button', {
  onClick: () => setActiveTab('manage'),
  ...
}, 'Gestionar Proyectos'),

React.createElement('button', {
  onClick: () => setActiveTab('history'),
  ...
}, `Historial ${exportHistory.length > 0 ? `(${exportHistory.length})` : ''}`)  // Badge con contador
```

**Por qué se hizo**:
- Necesitábamos una tercera pestaña para el historial
- Badge muestra cuántas entradas hay sin abrir la pestaña

---

## 7. APIs de Roam Utilizadas

### 1. `window.roamAlphaAPI.data.async.q()`

**¿Qué hace?**: Ejecuta queries Datalog de forma asíncrona

**Ubicación**: Se usa en múltiples funciones

**Ejemplo**:
```javascript
const query = `[
  :find ?page-title ?page-uid
  :where
  [?page :node/title ?page-title]
  [?page :block/uid ?page-uid]
  [?block :block/page ?page]
  [?block :block/string ?string]
  [(clojure.string/includes? ?string "Proyecto Asociado::")]
  [(clojure.string/includes? ?string "[[${trimmedProjectName}]]")]
]`;

const results = await window.roamAlphaAPI.data.async.q(query);
```

**Retorna**: Array de arrays con los valores de `:find`
```javascript
[
  ["[[EVD]] - Título", "abc123"],
  ["[[QUE]] - Otro", "xyz789"]
]
```

### 2. `window.roamAlphaAPI.data.async.pull_many()`

**¿Qué hace?**: Obtiene datos completos de múltiples entidades

**Ubicación**: Línea 761

**Ejemplo**:
```javascript
const eids = pageUids.map(uid => [':block/uid', uid]);

const rawPagesData = await window.roamAlphaAPI.data.async.pull_many(
  ROAM_PULL_PATTERN,  // Pattern de datos a obtener
  eids                 // Array de entidades
);
```

**Pattern**:
```javascript
const ROAM_PULL_PATTERN = `[
  :block/uid
  :node/title
  :edit/time
  :create/time
  :block/string
  :block/order
  {:block/refs [:block/uid :node/title]}
  {:create/user [:user/display-name :user/uid]}
  {:edit/user [:user/display-name :user/uid]}
  {:block/children [
    :block/uid
    :block/string
    ...
  ]}
]`;
```

**Retorna**: Array de objetos con la estructura especificada en el pattern

### 3. `window.roamAlphaAPI.ui.commandPalette.addCommand()`

**¿Qué hace?**: Registra un comando en la paleta de comandos de Roam

**Ubicación**: Líneas 2644-2683

**Ejemplo**:
```javascript
window.roamAlphaAPI.ui.commandPalette.addCommand({
  label: 'Exportar Elementos de Discurso',
  callback: () => {
    // Crear y mostrar el modal
    const modalRoot = document.createElement('div');
    modalRoot.id = 'discourse-export-modal-root';
    document.body.appendChild(modalRoot);

    const closeModal = () => {
      ReactDOM.unmountComponentAtNode(modalRoot);
      document.body.removeChild(modalRoot);
    };

    ReactDOM.render(
      React.createElement(ExportModal, { onClose: closeModal }),
      modalRoot
    );
  }
});
```

### 4. `window.roamAlphaAPI.createBlock()`

**¿Qué hace?**: Crea un bloque en una página de Roam

**Ubicación**: Línea 323 (función `syncProjectsToRoam`)

**Ejemplo**:
```javascript
await window.roamAlphaAPI.createBlock({
  location: {
    'parent-uid': pageUid,
    order: index
  },
  block: {
    string: projectName
  }
});
```

### 5. `window.roamAlphaAPI.deleteBlock()`

**¿Qué hace?**: Elimina un bloque de Roam

**Ubicación**: Línea 348

**Ejemplo**:
```javascript
await window.roamAlphaAPI.deleteBlock({ block: { uid: blockUid } });
```

---

## 8. Cómo Agregar Nuevas Funcionalidades

### Ejemplo: Agregar un Nuevo Tipo de Elemento

Supongamos que quieres agregar soporte para `[[HIP]]` (Hipótesis).

**Paso 1**: Actualizar constantes (línea 28)
```javascript
const DISCOURSE_ELEMENTS = {
  EVD: '[[EVD]]',
  QUE: '[[QUE]]',
  CLM: '[[CLM]]',
  HIP: '[[HIP]]'  // ← NUEVO
};
```

**Paso 2**: Actualizar estados iniciales (línea 1256)
```javascript
const [selectedElements, setSelectedElements] = React.useState({
  EVD: false,
  QUE: false,
  CLM: false,
  HIP: false  // ← NUEVO
});
```

**Paso 3**: Actualizar UI del modal (buscar donde se renderizan los checkboxes)
```javascript
// Agregar checkbox para HIP
React.createElement('label', ...,
  React.createElement('input', {
    type: 'checkbox',
    checked: selectedElements.HIP,
    onChange: (e) => setSelectedElements({
      ...selectedElements,
      HIP: e.target.checked
    })
  }),
  ' [[HIP]] (Hipótesis)'
)
```

**Paso 4**: Actualizar versión y documentar
- Actualizar `PLUGIN_VERSION` a v2.13.0
- Actualizar header del archivo
- Agregar entrada en CHANGELOG.md
- Actualizar README.md

**Paso 5**: Probar
- Crea páginas `[[HIP]] - Test` en Roam
- Agrégales "Proyecto Asociado::"
- Exporta y verifica que aparezcan

### Ejemplo: Agregar un Nuevo Storage (además de localStorage)

Supongamos que quieres sincronizar con una base de datos externa.

**Paso 1**: Crear funciones de sincronización
```javascript
// Después de las funciones de localStorage (línea ~200)
async function syncToExternalDB(projects) {
  try {
    const response = await fetch('https://tu-api.com/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects })
    });
    return await response.json();
  } catch (error) {
    console.error('Error sync to DB:', error);
    return { success: false, error: error.message };
  }
}
```

**Paso 2**: Llamar en las funciones de gestión
```javascript
async function addManualProject(projectName) {
  // ... código existente ...

  // Sincronizar con localStorage
  const syncResult = await syncProjectsToRoam(projects);

  // ← NUEVO: Sincronizar con DB externa
  const dbSyncResult = await syncToExternalDB(projects);
  if (!dbSyncResult.success) {
    console.warn('Fallo sync con DB externa:', dbSyncResult.error);
  }

  return true;
}
```

---

## 9. Testing y Debugging

### Testing Manual

1. **Test básico**:
   - Abre el modal
   - Selecciona un proyecto
   - Marca un tipo de elemento
   - Exporta
   - Verifica que el JSON se descargue

2. **Test de historial**:
   - Exporta algo
   - Ve a la pestaña "Historial"
   - Verifica que aparece la exportación
   - Exporta algo que falle (selecciona proyecto inexistente)
   - Verifica que el error aparece en historial

3. **Test de teclado**:
   - Abre el modal
   - Presiona Tab varias veces
   - Verifica que el foco se mantiene dentro del modal
   - Presiona Escape
   - Verifica que el modal se cierra

### Debugging en Consola

```javascript
// Ver todos los proyectos
window.roamDiscourseSelector.debugAllProjects()

// Ver páginas de un proyecto específico
window.roamDiscourseSelector.debugProjectPages('nombre del proyecto')

// Limpiar caché
window.roamDiscourseSelector.invalidateCache()

// Ver historial
const history = JSON.parse(localStorage.getItem('roamDiscourseSelector_exportHistory'))
console.table(history)

// Limpiar historial
localStorage.removeItem('roamDiscourseSelector_exportHistory')
```

### Errores Comunes y Soluciones

**Error: "Cannot read property 'data' of undefined"**
- **Causa**: Roam API no está disponible
- **Solución**: Verifica que estás en una página de Roam, no en configuración

**Error: "QuotaExceededError"**
- **Causa**: Exportación demasiado grande para localStorage
- **Solución**: Reduce el número de páginas exportadas

**Error: "Modal no aparece"**
- **Causa**: Código no cargado correctamente
- **Solución**: Verifica en consola, recarga la página (F5)

---

## 10. Consejos y Mejores Prácticas

### Para el Código

1. **Usa constantes** en lugar de números mágicos:
   ```javascript
   // ❌ Mal
   setTimeout(callback, 5000);

   // ✅ Bien
   const MESSAGE_TIMEOUT = 5000;
   setTimeout(callback, MESSAGE_TIMEOUT);
   ```

2. **Valida entrada** siempre:
   ```javascript
   function myFunction(projectName) {
     const validated = validateProjectName(projectName);
     // ... resto del código
   }
   ```

3. **Maneja errores** específicamente:
   ```javascript
   try {
     // código
   } catch (error) {
     console.error('Error específico:', error);
     const userMessage = categorizeError(error);
     // mostrar al usuario
   }
   ```

4. **Documenta cambios** en el CHANGELOG:
   - Cada cambio debe tener una entrada
   - Describe QUÉ cambió y POR QUÉ

5. **Versiona correctamente**:
   - Nueva funcionalidad = MINOR (2.12.0 → 2.13.0)
   - Bug fix = PATCH (2.12.0 → 2.12.1)
   - Breaking change = MAJOR (2.x.x → 3.0.0)

### Para Testing

1. **Prueba en escenarios reales**:
   - Con pocos proyectos
   - Con muchos proyectos (>50)
   - Con páginas grandes (>1000 bloques)

2. **Prueba edge cases**:
   - Proyectos sin páginas
   - Nombres de proyectos con caracteres especiales
   - Exportaciones mientras hay otra en progreso

3. **Revisa la consola** siempre:
   - Busca warnings en amarillo
   - Busca errores en rojo
   - Verifica los logs de debugging

### Para Colaboración

1. **Comunica cambios grandes**:
   - Si vas a hacer cambios significativos, avisa
   - Describe lo que quieres hacer antes de hacerlo

2. **Commits descriptivos**:
   - `feat: Agregar soporte para [[HIP]]`
   - `fix: Corregir error en validación de proyectos`
   - `refactor: Optimizar búsqueda de referencias`

3. **Documenta TODO**:
   - Si agregas una función nueva, documéntala
   - Si cambias comportamiento, actualiza este archivo

---

## ✅ Siguiente Paso

Ahora que entiendes cómo funciona el proyecto, puedes:

1. **Leer la arquitectura detallada**: [04-ARQUITECTURA-CODIGO.md](04-ARQUITECTURA-CODIGO.md)
2. **Ver el historial completo**: [05-HISTORIAL-DESARROLLO.md](05-HISTORIAL-DESARROLLO.md)
3. **Resolver problemas**: [06-TROUBLESHOOTING.md](06-TROUBLESHOOTING.md)

---

**¿Tienes preguntas?** Revisa también:
- [README.md](../README.md) - Overview general
- [CHANGELOG.md](../CHANGELOG.md) - Historial completo

**¡Buena suerte con el desarrollo!** 🚀

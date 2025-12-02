# 🏗️ Arquitectura del Código - Roam Discourse Selector v2.12.0

Documentación técnica detallada de la arquitectura interna del plugin.

---

## 📋 Contenidos

1. [Visión General](#visión-general)
2. [Estructura del Archivo](#estructura-del-archivo)
3. [Arquitectura de Componentes](#arquitectura-de-componentes)
4. [Flujo de Datos](#flujo-de-datos)
5. [Gestión de Estado](#gestión-de-estado)
6. [Integración con Roam API](#integración-con-roam-api)
7. [Referencia de Funciones](#referencia-de-funciones)
8. [Patrones de Diseño](#patrones-de-diseño)

---

## 1. Visión General

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────┐
│                    Roam Research                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              [[roam/js]] Page                     │  │
│  │    (Usuario pega el código del plugin aquí)      │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Plugin: roam-js-version.js                │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │   Inicialización (IIFE)                     │ │  │
│  │  │   - Registrar comando en paleta             │ │  │
│  │  │   - Exponer API global                      │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │   Capa de Datos                             │ │  │
│  │  │   - Datalog queries                         │ │  │
│  │  │   - pull_many para datos completos          │ │  │
│  │  │   - localStorage para persistencia          │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │   Lógica de Negocio                         │ │  │
│  │  │   - Búsqueda de proyectos                   │ │  │
│  │  │   - Validación                              │ │  │
│  │  │   - Transformación de datos                 │ │  │
│  │  │   - Gestión de historial                    │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │   Capa de UI (React)                        │ │  │
│  │  │   - Componente Modal                        │ │  │
│  │  │   - 3 pestañas                              │ │  │
│  │  │   - Gestión de eventos                      │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │        roamAlphaAPI (Roam Native API)             │  │
│  │   - data.async.q() - Datalog queries             │  │
│  │   - data.async.pull_many() - Bulk data           │  │
│  │   - ui.commandPalette.addCommand()               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Tecnologías y APIs Utilizadas

- **React 18.2.0**: UI components (cargado desde unpkg CDN)
- **Roam Alpha API**: Acceso a datos del grafo
- **localStorage**: Persistencia de proyectos manuales e historial
- **Datalog**: Lenguaje de consulta de Roam
- **JavaScript ES6+**: Async/await, arrow functions, destructuring

---

## 2. Estructura del Archivo

### Organización de roam-js-version.js (2685 líneas)

```
roam-js-version.js
├── [Líneas 1-22] Header y Metadata
│   ├── Descripción del plugin
│   ├── Versión actual (v2.12.0)
│   └── Autor y fecha
│
├── [Líneas 24-36] IIFE Wrapper
│   └── (function() { ... })();
│
├── [Líneas 37-42] Constantes Globales
│   ├── PLUGIN_VERSION
│   ├── LOCALSTORAGE_KEY
│   ├── EXPORT_HISTORY_KEY
│   └── MAX_HISTORY_ENTRIES
│
├── [Líneas 44-110] Funciones de Utilidad - localStorage
│   ├── loadProjects()
│   ├── saveProjects()
│   ├── mergeProjects()
│   └── ensureProjectsPageInRoam()
│
├── [Líneas 112-143] Función de Validación
│   └── validateProjectName()
│
├── [Líneas 145-300] Capa de Acceso a Datos - Roam API
│   ├── findAllProjectsInGraph()
│   ├── findPagesForProject()
│   ├── findReferencedPages()
│   └── ensureProjectsPageExists()
│
├── [Líneas 302-554] Funciones de Búsqueda Combinadas
│   ├── findAllPagesForProjects()
│   └── collectReferencedPages()
│
├── [Líneas 555-610] Gestión de Historial de Exportaciones
│   ├── loadExportHistory()
│   ├── saveExportToHistory()
│   └── clearExportHistory()
│
├── [Líneas 612-671] Categorización de Errores
│   └── categorizeError()
│
├── [Líneas 673-740] Verificación de Proyectos
│   └── verifyProjectsExist()
│
├── [Líneas 742-1020] Exportación de Datos
│   ├── exportPagesNative()
│   └── downloadFile()
│
├── [Líneas 1022-1110] Transformación de Datos
│   ├── transformToNativeFormat()
│   ├── ensureBalancedBrackets()
│   └── sanitizeForFilename()
│
├── [Líneas 1112-1280] Funciones de Debugging
│   ├── debugAllProjects()
│   ├── debugProjectPages()
│   └── invalidateCache()
│
├── [Líneas 1282-2653] Componente React Principal
│   ├── DiscourseExportModal (líneas 1282-2590)
│   │   ├── Estado (useState hooks)
│   │   ├── Efectos (useEffect hooks)
│   │   ├── Manejadores de eventos
│   │   ├── UI - Estructura del modal
│   │   │   ├── Pestaña: Exportar
│   │   │   ├── Pestaña: Gestionar Proyectos
│   │   │   └── Pestaña: Historial
│   │   └── Estilos inline
│   │
│   ├── openModal() (líneas 2592-2619)
│   └── closeModal() (líneas 2621-2631)
│
└── [Líneas 2633-2685] Inicialización del Plugin
    ├── Registro del comando en paleta
    ├── Exposición de API global
    └── Mensaje de confirmación en consola
```

---

## 3. Arquitectura de Componentes

### 3.1. Componente Principal: DiscourseExportModal

**Ubicación**: Líneas 1282-2590

**Tipo**: React Functional Component

**Responsabilidades**:
- Renderizar la UI del modal
- Gestionar el estado local de la aplicación
- Orquestar las operaciones de exportación
- Manejar interacciones del usuario

### 3.2. Jerarquía de Componentes

```
DiscourseExportModal (líneas 1282-2590)
│
├── Modal Container (líneas 1754-1790)
│   ├── Overlay (dismiss on click)
│   └── Content Box
│
├── Header (líneas 1792-1812)
│   ├── Título
│   └── Botón de cerrar (X)
│
├── Tab Navigation (líneas 1814-1870)
│   ├── Tab: Exportar
│   ├── Tab: Gestionar Proyectos
│   └── Tab: Historial
│
├── Tab Content (líneas 1872-2545)
│   │
│   ├── [PESTAÑA: EXPORTAR] (líneas 1876-2080)
│   │   ├── Sección: Seleccionar Proyectos (1904-2000)
│   │   │   ├── Cuadro de búsqueda (si >3 proyectos)
│   │   │   └── Lista de checkboxes
│   │   │
│   │   ├── Sección: Tipos de Elementos (2002-2044)
│   │   │   ├── Checkbox EVD
│   │   │   ├── Checkbox QUE
│   │   │   └── Checkbox CLM
│   │   │
│   │   ├── Sección: Referencias (2046-2072)
│   │   │   ├── Checkbox incluir EVD referenciadas
│   │   │   ├── Checkbox incluir QUE referenciadas
│   │   │   └── Checkbox incluir CLM referenciadas
│   │   │
│   │   └── Sección: Acciones (2074-2078)
│   │       ├── Botón: Vista Previa
│   │       └── Botón: Exportar JSON
│   │
│   ├── [PESTAÑA: GESTIONAR PROYECTOS] (líneas 2082-2316)
│   │   ├── Sección: Agregar Proyecto (2110-2146)
│   │   │   ├── Input de texto
│   │   │   └── Botón: Agregar Proyecto
│   │   │
│   │   ├── Sección: Lista de Proyectos (2148-2292)
│   │   │   └── Para cada proyecto:
│   │   │       ├── Nombre del proyecto
│   │   │       ├── Badge: "manual" o "del grafo"
│   │   │       ├── Botón: Eliminar (solo manuales)
│   │   │       └── Estado de verificación (✓/✗)
│   │   │
│   │   └── Sección: Acciones (2294-2314)
│   │       └── Botón: Verificar Proyectos en Grafo
│   │
│   └── [PESTAÑA: HISTORIAL] (líneas 2318-2543)
│       ├── Caso: Sin historial (2324-2334)
│       │   └── Mensaje vacío con emoji
│       │
│       ├── Caso: Con historial (2336-2524)
│       │   └── Para cada entrada:
│       │       ├── Card de éxito (verde) o error (rojo)
│       │       ├── Timestamp formateado
│       │       ├── Lista de proyectos
│       │       ├── Páginas exportadas (o mensaje de error)
│       │       └── Tiempo de procesamiento
│       │
│       └── Sección: Acciones (2526-2541)
│           └── Botón: Limpiar Historial
│
└── Estado de Carga (líneas 2547-2568)
    └── Modal de progreso durante exportación
```

### 3.3. Hooks Utilizados

```javascript
// Estado de UI
const [isOpen, setIsOpen] = React.useState(true);
const [isExporting, setIsExporting] = React.useState(false);
const [activeTab, setActiveTab] = React.useState('export');
const [statusMessage, setStatusMessage] = React.useState('');

// Estado de proyectos
const [availableProjects, setAvailableProjects] = React.useState([]);
const [selectedProjects, setSelectedProjects] = React.useState(new Set());
const [projectSearchQuery, setProjectSearchQuery] = React.useState('');
const [projectVerification, setProjectVerification] = React.useState({});

// Estado de tipos de elementos
const [includeEVD, setIncludeEVD] = React.useState(true);
const [includeQUE, setIncludeQUE] = React.useState(true);
const [includeCLM, setIncludeCLM] = React.useState(true);

// Estado de referencias
const [includeReferencedEVD, setIncludeReferencedEVD] = React.useState(false);
const [includeReferencedQUE, setIncludeReferencedQUE] = React.useState(false);
const [includeReferencedCLM, setIncludeReferencedCLM] = React.useState(false);

// Estado de gestión de proyectos
const [newProjectName, setNewProjectName] = React.useState('');

// Estado de historial
const [exportHistory, setExportHistory] = React.useState([]);
const [showHistory, setShowHistory] = React.useState(false);

// Refs para timeouts
const exportTimeoutRef = React.useRef(null);
```

---

## 4. Flujo de Datos

### 4.1. Flujo de Exportación Principal

```
[Usuario hace clic en "Exportar JSON"]
         │
         ▼
[handleExport() - línea 1618]
         │
         ├─► Validar selección (proyectos y tipos)
         │
         ├─► setIsExporting(true)
         │
         ├─► setStatusMessage("🔍 Buscando...")
         │
         ▼
[findAllPagesForProjects() - línea 302]
         │
         ├─► Para cada proyecto seleccionado:
         │   │
         │   ├─► findPagesForProject() - línea 189
         │   │   │
         │   │   └─► window.roamAlphaAPI.data.async.q()
         │   │       │
         │   │       └─► Datalog query: [:find ?uid ?title ...]
         │   │
         │   └─► Agregar páginas a Set (evita duplicados)
         │
         ├─► Si incluir referencias:
         │   │
         │   └─► collectReferencedPages() - línea 479
         │       │
         │       ├─► findReferencedPages() - línea 245
         │       │   │
         │       │   └─► Buscar [[EVD]], [[QUE]], [[CLM]] en páginas principales
         │       │
         │       └─► Filtrar las que NO tienen "Proyecto Asociado::"
         │
         └─► Retornar Array de objetos {uid, title}
         │
         ▼
[setStatusMessage("✓ Encontradas X páginas")]
         │
         ▼
[exportPagesNative() - línea 742]
         │
         ├─► setStatusMessage("📡 Descargando datos de Roam...")
         │
         ├─► window.roamAlphaAPI.data.async.pull_many()
         │   │
         │   └─► Descarga datos completos de todas las páginas
         │       Patrón: '[*]' (todos los atributos)
         │
         ├─► setStatusMessage("🔄 Transformando páginas...")
         │
         ├─► Para cada página:
         │   │
         │   └─► transformToNativeFormat() - línea 923
         │       │
         │       ├─► Convertir de formato Roam a formato nativo
         │       ├─► Procesar :block/children recursivamente
         │       ├─► ensureBalancedBrackets() - línea 1022
         │       └─► Retornar objeto con estructura nativa
         │
         ├─► Generar JSON completo
         │
         ├─► sanitizeForFilename() - línea 1095
         │   │
         │   └─► Crear nombre de archivo limpio
         │
         ├─► downloadFile() - línea 887
         │   │
         │   ├─► Crear Blob con JSON
         │   ├─► Crear link de descarga temporal
         │   ├─► Simular click
         │   └─► Limpiar
         │
         └─► Retornar {success, pagesExported, timeMs}
         │
         ▼
[saveExportToHistory() - línea 574]
         │
         ├─► Crear objeto entry con timestamp, proyectos, páginas, etc.
         │
         ├─► loadExportHistory()
         │
         ├─► history.unshift(entry)
         │
         ├─► Limitar a MAX_HISTORY_ENTRIES (5)
         │
         └─► localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(...))
         │
         ▼
[setExportHistory(newHistory)]
         │
         ▼
[setStatusMessage("✅ Exportadas X páginas")]
         │
         ▼
[setIsExporting(false)]
         │
         ▼
[Modal permanece abierto] ← CAMBIO EN v2.12.0
```

### 4.2. Flujo de Carga Inicial

```
[Usuario abre el modal]
         │
         ▼
[openModal() - línea 2592]
         │
         ├─► Crear container en DOM
         │
         ├─► ReactDOM.render(<DiscourseExportModal />)
         │
         └─► Componente se monta
         │
         ▼
[React.useEffect(() => {...}, []) - línea 1300]
         │
         ├─► loadProjects() - línea 44
         │   │
         │   ├─► localStorage.getItem(LOCALSTORAGE_KEY)
         │   │
         │   └─► Retornar array de proyectos manuales
         │
         ├─► findAllProjectsInGraph() - línea 145
         │   │
         │   ├─► window.roamAlphaAPI.data.async.q()
         │   │
         │   ├─► Datalog query: buscar "Proyecto Asociado::"
         │   │
         │   └─► Retornar Set de nombres de proyectos
         │
         ├─► mergeProjects(manuales, del grafo) - línea 72
         │   │
         │   └─► Combinar y etiquetar {name, source: 'manual'|'graph'}
         │
         ├─► setAvailableProjects(merged)
         │
         └─► setStatusMessage("") ← Limpiar mensaje
         │
         ▼
[React.useEffect(() => {...}, []) - línea 1314]
         │
         ├─► loadExportHistory() - línea 555
         │   │
         │   ├─► localStorage.getItem(EXPORT_HISTORY_KEY)
         │   │
         │   └─► Retornar array de últimas 5 exportaciones
         │
         └─► setExportHistory(history)
```

### 4.3. Flujo de Agregar Proyecto Manual

```
[Usuario escribe nombre y hace clic en "Agregar Proyecto"]
         │
         ▼
[handleAddProject() - línea 1397]
         │
         ├─► validateProjectName(newProjectName) - línea 112
         │   │
         │   ├─► Verificar no null/undefined
         │   ├─► Verificar es string
         │   ├─► Verificar no vacío después de trim
         │   ├─► Verificar no contiene caracteres peligrosos
         │   └─► Retornar nombre limpio
         │
         ├─► loadProjects()
         │
         ├─► Verificar si ya existe
         │
         ├─► projects.push(validatedName)
         │
         ├─► saveProjects(projects) - línea 58
         │   │
         │   └─► localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(...))
         │
         ├─► ensureProjectsPageInRoam(projects) - línea 86
         │   │
         │   ├─► Verificar si existe página [[roam/js/discourse-selector/projects]]
         │   │
         │   ├─► Si no existe, crearla
         │   │
         │   ├─► Para cada proyecto:
         │   │   │
         │   │   └─► window.roamAlphaAPI.data.block.create()
         │   │       │
         │   │       └─► Crear bloque hijo con "- [[nombre del proyecto]]"
         │   │
         │   └─► Sincronizar localStorage con Roam
         │
         ├─► findAllProjectsInGraph() ← Recargar proyectos del grafo
         │
         ├─► mergeProjects(...)
         │
         ├─► setAvailableProjects(merged)
         │
         ├─► setNewProjectName('') ← Limpiar input
         │
         └─► setStatusMessage("✓ Proyecto agregado")
```

---

## 5. Gestión de Estado

### 5.1. Estado Local (React)

**Tipo**: useState hooks dentro del componente funcional

**Características**:
- Estado efímero (se pierde al cerrar el modal)
- Reactivo (cambios disparan re-renders)
- No persiste entre sesiones

**Estados principales**:
```javascript
// UI state
isOpen, isExporting, activeTab, statusMessage

// Data state
availableProjects, selectedProjects, exportHistory

// Form state
projectSearchQuery, newProjectName

// Feature flags
includeEVD, includeQUE, includeCLM
includeReferencedEVD, includeReferencedQUE, includeReferencedCLM
```

### 5.2. Estado Persistente (localStorage)

**Tipo**: Browser localStorage API

**Características**:
- Persiste entre sesiones del navegador
- Sincronizado con Roam (proyectos manuales)
- Límite de 5MB por origen

**Claves utilizadas**:
```javascript
// Clave: 'roamDiscourseSelector_projects'
// Valor: ["proyecto1", "proyecto2", ...]
// Propósito: Proyectos agregados manualmente

// Clave: 'roamDiscourseSelector_exportHistory'
// Valor: [{timestamp, date, projects, pagesCount, status, ...}, ...]
// Propósito: Últimas 5 exportaciones
```

### 5.3. Estado en Roam (Graph Database)

**Tipo**: Roam Research native graph

**Características**:
- Fuente de verdad para datos del grafo
- No modificado por el plugin (solo lectura, excepto página de proyectos)
- Accedido mediante Datalog queries

**Datos leídos**:
- Páginas con prefijos [[EVD]], [[QUE]], [[CLM]]
- Bloques con "Proyecto Asociado:: [[...]]"
- Referencias entre páginas
- Contenido completo de páginas

**Datos escritos**:
- Página [[roam/js/discourse-selector/projects]] (sincronización)

### 5.4. Flujo de Sincronización

```
[localStorage]  ←→  [Plugin State]  ←→  [Roam Graph]
                         ↑
                         │
                    [React State]
                         ↓
                       [UI]
```

**Sincronización bidireccional**:
- **localStorage → React State**: En mount del componente (useEffect)
- **React State → localStorage**: Al agregar/eliminar proyectos
- **localStorage → Roam**: Función ensureProjectsPageInRoam()
- **Roam → React State**: findAllProjectsInGraph() periódicamente

---

## 6. Integración con Roam API

### 6.1. API: window.roamAlphaAPI.data.async.q()

**Propósito**: Ejecutar consultas Datalog

**Sintaxis**:
```javascript
const results = await window.roamAlphaAPI.data.async.q(datalogQuery);
```

**Retorno**: Array de arrays `[[valor1_fila1, valor2_fila1], [valor1_fila2, ...]]`

**Ejemplos de uso en el plugin**:

```javascript
// Línea 159 - Buscar todos los proyectos en el grafo
const query = `
  [:find ?project-name
   :where
     [?b :block/string ?s]
     [(clojure.string/includes? ?s "Proyecto Asociado::")]
     [(re-find #"\\[\\[([^\\]]+)\\]\\]" ?s) ?match]
     [(nth ?match 1) ?project-name]
  ]
`;

// Línea 208 - Buscar páginas de un proyecto específico
const query = `
  [:find ?uid ?title
   :where
     [?p :node/title ?title]
     [?p :block/uid ?uid]
     [(re-find #"^\\[\\[(EVD|QUE|CLM)\\]\\]" ?title)]
     [?b :block/page ?p]
     [?b :block/string ?s]
     [(clojure.string/includes? ?s "Proyecto Asociado:: [[${projectName}]]")]
  ]
`;
```

### 6.2. API: window.roamAlphaAPI.data.async.pull_many()

**Propósito**: Obtener datos completos de múltiples entidades

**Sintaxis**:
```javascript
const data = await window.roamAlphaAPI.data.async.pull_many(
  pattern,  // '[*]' para todos los atributos
  uids      // ['uid1', 'uid2', ...]
);
```

**Retorno**: Array de objetos con atributos de cada entidad

**Ejemplo de uso en el plugin**:

```javascript
// Línea 761 - Descargar datos completos de páginas
const rawPagesData = await window.roamAlphaAPI.data.async.pull_many(
  '[*]',
  pageUids
);

// Estructura del objeto retornado:
{
  ':block/uid': 'abc123',
  ':node/title': '[[EVD]] - Descripción...',
  ':block/children': [
    {
      ':block/string': 'Proyecto Asociado:: [[nombre]]',
      ':block/uid': 'xyz789',
      ':block/children': [...]
    }
  ],
  ':edit/time': 1234567890,
  ':create/time': 1234567890
}
```

### 6.3. API: window.roamAlphaAPI.ui.commandPalette.addCommand()

**Propósito**: Registrar comando en la paleta de comandos (Ctrl+P)

**Sintaxis**:
```javascript
window.roamAlphaAPI.ui.commandPalette.addCommand({
  label: 'Nombre del Comando',
  callback: () => { /* función a ejecutar */ }
});
```

**Ejemplo de uso en el plugin**:

```javascript
// Línea 2648
window.roamAlphaAPI.ui.commandPalette.addCommand({
  label: 'Exportar Elementos de Discurso',
  callback: openModal
});
```

### 6.4. API: window.roamAlphaAPI.data.block.create()

**Propósito**: Crear un nuevo bloque en Roam

**Sintaxis**:
```javascript
await window.roamAlphaAPI.data.block.create({
  location: {
    'parent-uid': 'uid-del-bloque-padre',
    order: 0  // posición entre hermanos
  },
  block: {
    string: 'Contenido del bloque'
  }
});
```

**Ejemplo de uso en el plugin**:

```javascript
// Línea 103 - Sincronizar proyectos con página de Roam
await window.roamAlphaAPI.data.block.create({
  location: {
    'parent-uid': projectsPageUid,
    order: index
  },
  block: {
    string: `- [[${project}]]`
  }
});
```

### 6.5. API: window.roamAlphaAPI.data.q()

**Propósito**: Versión síncrona de q() (usada para verificaciones rápidas)

**Sintaxis**:
```javascript
const results = window.roamAlphaAPI.data.q(datalogQuery);
```

**Ejemplo de uso en el plugin**:

```javascript
// Línea 92 - Verificar si existe página de proyectos
const checkPageExists = `
  [:find ?uid
   :where
     [?p :node/title "roam/js/discourse-selector/projects"]
     [?p :block/uid ?uid]
  ]
`;
const existingPage = window.roamAlphaAPI.data.q(checkPageExists);
```

---

## 7. Referencia de Funciones

### 7.1. Funciones de Acceso a Datos

#### findAllProjectsInGraph()
**Ubicación**: Línea 145
**Propósito**: Encontrar todos los proyectos mencionados en el grafo
**Entrada**: Ninguna
**Salida**: `Set<string>` de nombres de proyectos
**Lógica**:
1. Query Datalog para buscar "Proyecto Asociado::"
2. Extraer nombres con regex `\[\[([^\]]+)\]\]`
3. Retornar como Set (sin duplicados)

#### findPagesForProject(projectName, prefixes)
**Ubicación**: Línea 189
**Propósito**: Encontrar páginas de un proyecto específico
**Entrada**:
- `projectName` (string): Nombre del proyecto
- `prefixes` (array): ['EVD', 'QUE', 'CLM']
**Salida**: Array de objetos `{uid, title}`
**Lógica**:
1. Validar projectName con validateProjectName()
2. Query Datalog: páginas con prefijo Y bloque con "Proyecto Asociado:: [[projectName]]"
3. Retornar array de resultados

#### findReferencedPages(mainPageUids, referencedPrefixes)
**Ubicación**: Línea 245
**Propósito**: Encontrar páginas referenciadas en otras páginas
**Entrada**:
- `mainPageUids` (array): UIDs de páginas principales
- `referencedPrefixes` (array): Prefijos a buscar (['EVD'], etc.)
**Salida**: Array de objetos `{uid, title}`
**Lógica**:
1. Para cada UID principal
2. Query: buscar referencias `[[PREFIX]] - ...` en bloques de esa página
3. Verificar que páginas referenciadas NO tengan "Proyecto Asociado::"
4. Retornar páginas encontradas

### 7.2. Funciones de Transformación

#### transformToNativeFormat(rawPageData)
**Ubicación**: Línea 923
**Propósito**: Convertir formato interno de Roam a formato de exportación nativo
**Entrada**: Objeto con estructura Roam (`:block/uid`, `:node/title`, etc.)
**Salida**: Objeto con formato nativo (`title`, `children`, `string`, etc.)
**Lógica**:
1. Extraer :node/title → title
2. Convertir :block/children recursivamente → children (array)
3. Para cada hijo: transformar :block/string → string
4. Aplicar ensureBalancedBrackets() a cada string
5. Preservar timestamps (:edit/time, :create/time)

#### ensureBalancedBrackets(text)
**Ubicación**: Línea 1022
**Propósito**: Balancear corchetes en strings (evita malformación de referencias)
**Entrada**: String con posibles corchetes desbalanceados
**Salida**: String con corchetes balanceados
**Algoritmo**: Single-pass state machine (O(n))
1. Recorrer texto carácter por carácter
2. Contar niveles de anidación: `[[` incrementa, `]]` decrementa
3. Si nivel < 0: agregar `[[` al inicio
4. Si nivel > 0 al final: agregar `]]` × nivel

#### sanitizeForFilename(text)
**Ubicación**: Línea 1095
**Propósito**: Limpiar texto para nombre de archivo
**Entrada**: String con posibles caracteres no válidos
**Salida**: String seguro para nombre de archivo
**Lógica**:
1. Eliminar caracteres no válidos: `/ \ : * ? " < > |`
2. Reemplazar espacios con guiones bajos
3. Truncar a 50 caracteres máximo
4. Normalizar Unicode (NFD)

### 7.3. Funciones de Exportación

#### exportPagesNative(pageUids, filename, onProgress)
**Ubicación**: Línea 742
**Propósito**: Exportar páginas al formato nativo de Roam
**Entrada**:
- `pageUids` (array): UIDs de páginas a exportar
- `filename` (string): Nombre del archivo de salida
- `onProgress` (function, opcional): Callback para reportar progreso
**Salida**: Promise<object> `{success: bool, pagesExported: number, timeMs: number}`
**Flujo**:
1. Reportar progreso: "📡 Descargando datos de Roam..."
2. `pull_many('[*]', pageUids)` → obtener datos completos
3. Reportar progreso: "🔄 Transformando páginas..."
4. Para cada página: transformToNativeFormat()
5. Reportar progreso cada 5 páginas
6. Generar JSON completo con formato:
   ```json
   [
     {
       "title": "[[EVD]] - ...",
       "children": [...],
       "edit-time": 123456,
       "create-time": 123456
     }
   ]
   ```
7. downloadFile(json, filename)
8. Retornar resultado con métricas

#### downloadFile(content, filename)
**Ubicación**: Línea 887
**Propósito**: Descargar contenido como archivo
**Entrada**:
- `content` (string): Contenido del archivo
- `filename` (string): Nombre del archivo
**Salida**: void (descarga automática en navegador)
**Lógica**:
1. Crear Blob con content (tipo: application/json)
2. Crear URL temporal con URL.createObjectURL()
3. Crear elemento `<a>` con href=url y download=filename
4. Simular click() en elemento
5. Limpiar: removeChild() y URL.revokeObjectURL()

### 7.4. Funciones de Validación

#### validateProjectName(projectName)
**Ubicación**: Línea 112
**Propósito**: Validar y sanitizar nombres de proyectos
**Entrada**: string (nombre del proyecto)
**Salida**: string (nombre validado y limpio)
**Excepciones**:
- `TypeError`: Si input no es string o es null/undefined
- `Error`: Si está vacío o contiene caracteres peligrosos
**Validaciones**:
1. Tipo: debe ser string no null/undefined
2. Vacío: después de trim() no puede estar vacío
3. Caracteres peligrosos: `"`, `\`, `\n`, `\r`, `\t` → Error
4. Warning: si contiene `]]` (puede causar problemas en búsquedas)

#### categorizeError(error)
**Ubicación**: Línea 619
**Propósito**: Convertir errores técnicos en mensajes user-friendly
**Entrada**: Error object
**Salida**: string (mensaje de error categorizado)
**Categorías detectadas**:
- QuotaExceededError → "Exportación demasiado grande..."
- Timeout → "Tardó demasiado tiempo..."
- Memory/Heap → "Sin memoria suficiente..."
- Network/Fetch → "Error de conexión..."
- roamAlphaAPI → "Error en la API de Roam..."
- Validation → "Error de validación..."
- Permission → "Sin permisos suficientes..."
- Unknown → "Error desconocido..."

### 7.5. Funciones de Gestión de Historial

#### loadExportHistory()
**Ubicación**: Línea 555
**Propósito**: Cargar historial de exportaciones desde localStorage
**Salida**: Array de objetos de historial
**Formato de entrada**:
```json
[
  {
    "timestamp": 1234567890,
    "date": "2025-11-18T14:32:00.000Z",
    "projects": ["proyecto1", "proyecto2"],
    "pagesCount": 42,
    "status": "success",
    "timeMs": 2345
  }
]
```

#### saveExportToHistory(entry)
**Ubicación**: Línea 574
**Propósito**: Guardar nueva exportación en historial
**Entrada**: Objeto con información de exportación
**Lógica**:
1. loadExportHistory()
2. history.unshift(entry) → agregar al inicio
3. history.slice(0, MAX_HISTORY_ENTRIES) → limitar a 5
4. localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(...))

#### clearExportHistory()
**Ubicación**: Línea 596
**Propósito**: Limpiar todo el historial
**Lógica**:
1. localStorage.removeItem(EXPORT_HISTORY_KEY)
2. console.log('🗑️ Historial limpiado')

### 7.6. Funciones de Debugging

#### debugAllProjects()
**Ubicación**: Línea 1112
**Propósito**: Listar todos los proyectos en consola
**Uso**: `window.roamDiscourseSelector.debugAllProjects()`
**Output**:
```
📊 TODOS LOS PROYECTOS DETECTADOS EN EL GRAFO (3)
  - proyecto1
  - proyecto2
  - proyecto3
```

#### debugProjectPages(projectName)
**Ubicación**: Línea 1141
**Propósito**: Mostrar páginas de un proyecto en consola con tabla
**Uso**: `window.roamDiscourseSelector.debugProjectPages('nombre')`
**Output**:
```
📊 PÁGINAS DEL PROYECTO: nombre
┌─────────────────────────────────────────┬──────────┐
│ Título                                  │ UID      │
├─────────────────────────────────────────┼──────────┤
│ [[EVD]] - Descripción...               │ abc123   │
└─────────────────────────────────────────┴──────────┘
```

#### invalidateCache()
**Ubicación**: Línea 1254
**Propósito**: Forzar recarga de proyectos
**Uso**: `window.roamDiscourseSelector.invalidateCache()`
**Nota**: No hay caché real, pero útil como hook para recargar

---

## 8. Patrones de Diseño

### 8.1. IIFE (Immediately Invoked Function Expression)

**Ubicación**: Líneas 24-2685

**Propósito**: Encapsular todo el código del plugin

**Ventajas**:
- Evita contaminación del scope global
- Protege variables internas
- Solo expone API pública necesaria

**Estructura**:
```javascript
(function() {
  'use strict';

  // Todas las funciones y variables privadas

  // Exposición selectiva de API pública
  window.roamDiscourseSelector = {
    openModal,
    debugAllProjects,
    debugProjectPages,
    invalidateCache
  };

})();
```

### 8.2. Callback Pattern

**Uso**: Función exportPagesNative() con parámetro onProgress

**Ventaja**: Permite reportar progreso sin bloquear

**Implementación**:
```javascript
async function exportPagesNative(pageUids, filename, onProgress = null) {
  const reportProgress = (msg) => {
    console.log(msg);
    if (onProgress) onProgress(msg);  // ← Callback opcional
  };

  reportProgress('Paso 1...');
  // ... lógica ...
  reportProgress('Paso 2...');
}

// Uso:
exportPagesNative(uids, 'file.json', (msg) => {
  setStatusMessage(msg);  // ← Actualizar UI
});
```

### 8.3. Single Responsibility Principle

**Aplicación**: Cada función tiene una responsabilidad clara

**Ejemplos**:
- `validateProjectName()`: SOLO validar nombres
- `findPagesForProject()`: SOLO buscar páginas
- `transformToNativeFormat()`: SOLO transformar formato
- `downloadFile()`: SOLO descargar archivos

**Ventaja**: Fácil de probar, debuggear y mantener

### 8.4. Error Handling con Try-Catch

**Patrón consistente en todas las funciones async**:

```javascript
async function someFunction() {
  try {
    // Lógica principal
    const result = await apiCall();
    return result;
  } catch (error) {
    console.error('❌ Error en someFunction:', error);
    const userMessage = categorizeError(error);
    setStatusMessage(userMessage);
    return null;  // o throw según el caso
  }
}
```

### 8.5. React Hooks Pattern

**useState para estado local**:
```javascript
const [value, setValue] = React.useState(initialValue);
```

**useEffect para efectos secundarios**:
```javascript
React.useEffect(() => {
  // Código que se ejecuta al montar/actualizar

  return () => {
    // Cleanup al desmontar
  };
}, [dependencies]);
```

**useRef para valores persistentes sin re-render**:
```javascript
const timeoutRef = React.useRef(null);
```

### 8.6. Event Delegation

**Implementación de keyboard handling**:

```javascript
React.useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [dependencies]);
```

**Ventaja**: Un solo listener en document, no en cada elemento

### 8.7. Focus Trap Pattern (WCAG 2.1)

**Propósito**: Mantener foco dentro del modal para accesibilidad

**Implementación** (líneas 1512-1553):
```javascript
const handleTabKey = (e) => {
  if (e.key !== 'Tab') return;

  const focusableElements = getFocusableElements();
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Si Tab en último elemento → ir a primero
  if (!e.shiftKey && document.activeElement === lastElement) {
    e.preventDefault();
    firstElement.focus();
  }

  // Si Shift+Tab en primer elemento → ir a último
  if (e.shiftKey && document.activeElement === firstElement) {
    e.preventDefault();
    lastElement.focus();
  }
};
```

### 8.8. State Machine (Bracket Balancing)

**Algoritmo en ensureBalancedBrackets()** (líneas 1022-1093):

```javascript
let level = 0;  // Estado: nivel de anidación
let needsOpeningBrackets = false;

for (let i = 0; i < text.length - 1; i++) {
  if (text[i] === '[' && text[i+1] === '[') {
    level++;  // Transición: abrir nivel
  } else if (text[i] === ']' && text[i+1] === ']') {
    level--;  // Transición: cerrar nivel
    if (level < 0) {
      needsOpeningBrackets = true;
      level = 0;  // Resetear estado
    }
  }
}

// Estado final: ajustar según level
```

**Ventaja**: O(n) en vez de O(n²) de algoritmo anterior

---

## 🔚 Conclusión

Esta arquitectura ha sido diseñada con los siguientes principios:

1. **Modularidad**: Funciones pequeñas y especializadas
2. **Responsabilidad única**: Cada función hace una cosa bien
3. **Error handling robusto**: Try-catch y categorización de errores
4. **Performance**: Algoritmos optimizados (single-pass cuando es posible)
5. **Accesibilidad**: Keyboard navigation y focus trap (WCAG 2.1)
6. **User experience**: Feedback granular de progreso
7. **Persistencia**: localStorage para datos críticos
8. **Debugging**: Funciones de debugging expuestas globalmente

Para entender el flujo completo de una exportación, sigue el diagrama en la sección 4.1.

Para modificar el código, consulta [03-PARA-COLABORADORES.md](03-PARA-COLABORADORES.md).

---

**Última actualización**: Noviembre 2025
**Versión**: 2.12.0

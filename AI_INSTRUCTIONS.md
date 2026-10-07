# AI Instructions — Discourse Graph Toolkit

**Lee este documento completo antes de hacer cualquier modificación.**

> [!IMPORTANT]
> **Antes de modificar lógica de relaciones, exportación o templates**, lee también
> `DISCOURSE_GRAPH_SYNTAX.md` que documenta la gramática completa del grafo de discurso
> (tipos de nodos, tags estructurales, reglas de coherencia de proyectos).

## Documentos del Proyecto

| Documento | Propósito | Cuándo leerlo |
|-----------|-----------|---------------|
| `AI_INSTRUCTIONS.md` | Reglas de codificación y arquitectura | **Siempre**, antes de cualquier cambio |
| `DISCOURSE_GRAPH_SYNTAX.md` | Gramática del dominio (nodos, tags, relaciones) | Antes de tocar `core/`, `api/`, o exportadores |
| `STATUS.md` | Estado actual y changelog reciente | Para contexto de versiones y bugs conocidos |
| `README.md` | Documentación de usuario final | Solo si se necesita actualizar la documentación pública |

## Descripción del Proyecto

Plugin para Roam Research que facilita la creación y exportación de grafos de discurso académico. Permite estructurar investigaciones usando nodos **QUE** (preguntas), **CLM** (afirmaciones) y **EVD** (evidencias), organizarlos en proyectos, verificar coherencia y exportar a JSON/HTML/Markdown.

## Fuente de Verdad

> [!CAUTION]
> **La carpeta `src/` es la ÚNICA fuente de verdad. NUNCA edites `discourse-graph-toolkit.js` directamente —es un archivo generado que se sobrescribirá.**

### Flujo de trabajo obligatorio:

1. **Identificar** el módulo correcto en `src/`
2. **Editar** solo archivos dentro de `src/`
3. **Ejecutar** `./build.ps1` para generar el bundle
4. **Verificar sintaxis:** `node -c discourse-graph-toolkit.js`
5. **Verificar pruebas unitarias:** `node --test` (sin argumentos; encuentra todos los `tests/*.test.js`)
6. **Si hay error de sintaxis o pruebas fallidas, NO entregar nada al usuario** hasta corregirlo

### Estructura de archivos:

```
src/
├── config.js          # Constantes, tipos de nodos y configuración por defecto
├── styles.js          # Sistema de diseño (CSS), tokens y clases de utilidad
├── state.js           # Gestión de localStorage (multi-grafo, cache panorámico)
├── index.js           # Inicialización y registro de comandos
├── api/               # Módulos de acceso a Roam API (por dominio)
│   ├── roamProjects.js           # Proyectos en Roam
│   ├── roamSearch.js             # Búsquedas y queries
│   ├── roamBranchVerification.js # Verificación de ramas (jerárquica padre-hijo)
│   └── roamStructureVerification.js # Verificación de estructura
├── core/              # Lógica de negocio
│   ├── nodes.js       # Creación de nodos QUE/CLM/EVD
│   ├── projects.js    # Gestión de proyectos
│   ├── export.js      # Exportación JSON
│   ├── import.js      # Importación
│   ├── contentProcessor.js    # Procesamiento de contenido
│   ├── relationshipMapper.js  # Mapeo de relaciones entre nodos
│   ├── markdownCore.js        # Core de generación Markdown (standalone)
│   ├── markdownGenerator.js   # Wrapper de MarkdownCore para el plugin
│   ├── htmlGenerator.js       # Generador HTML (usa htmlEmbeddedScript.js)
│   ├── htmlEmbeddedScript.js  # JavaScript inyectado en HTML exportado
│   ├── epubGenerator.js       # Generador EPUB
│   └── html/                  # Generadores auxiliares HTML
│       ├── htmlStyles.js      # Estilos embebidos en el HTML exportado
│       ├── htmlHelpers.js     # Helpers específicos de renderizado HTML
│       └── htmlNodeRenderers.js # Renderizadores de nodos individuales en HTML
├── ui/                # Componentes React de interfaz
│   ├── modal.js       # Modal principal (compositor de Providers)
│   ├── ToolkitContext.js  # React Context y hook useToolkit (legacy/wrapper)
│   ├── contexts/      # Contextos de dominio
│   │   ├── NavContext.js        # Contexto de navegación de pestañas
│   │   ├── ProjectsContext.js   # Contexto para gestión de proyectos
│   │   ├── BranchesContext.js   # Contexto para validación de ramas
│   │   ├── ExportContext.js     # Contexto para exportación de datos
│   │   └── PanoramicContext.js  # Contexto para la vista panorámica
│   ├── components/    # Componentes reutilizables
│   │   └── ProjectTreeView.js  # Árbol jerárquico con expand/collapse
│   └── tabs/          # Componentes de pestañas individuales
│       ├── ProjectsTab.js   # Gestión de proyectos
│       ├── BranchesTab.js   # Verificación de ramas
│       ├── NodesTab.js      # Gestión de nodos huérfanos
│       ├── PanoramicTab.js  # Vista panorámica
│       ├── ExportTab.js     # Exportación
│       └── ImportTab.js     # Importación
└── utils/             # Helpers y toast notifications
    ├── helpers.js           # Helpers generales
    ├── mutationThrottle.js  # Limitador de escrituras (MutationThrottle) y roamWrite
    ├── projectTreeUtils.js  # Utilidades de árbol de proyectos
    └── toast.js             # Notificaciones de toast
```

### Arquitectura UI:

El componente `modal.js` actúa como **compositor de Providers**:
- Ya no define todo el estado compartido en un solo lugar.
- Envuelve las pestañas con 5 contextos independientes ubicados en `src/ui/contexts/`:
  - `NavContext` (para navegar entre pestañas)
  - `ProjectsContext` (para gestión de proyectos y su lista)
  - `BranchesContext` (para la pestaña de verificación de coherencia)
  - `ExportContext` (para las opciones y estado de exportación)
  - `PanoramicContext` (para la ordenación y carga en la vista panorámica)
- Cada Tab consume solo los hooks específicos del dominio que necesita (ej. `useNav()`, `useProjects()`, `useBranches()`, `useExport()`, `usePanoramic()`).
- `ToolkitContext.js` se mantiene como un wrapper legacy/compartido, pero el flujo preferido son los contextos distribuidos de dominio.
- Las pestañas `NodesTab.js` e `ImportTab.js` utilizan principalmente `useState` de React local, sin depender de un contexto global.

## Arquitectura Conceptual

### Capas del sistema:

```
┌─────────────────────────────────────────────┐
│  ui/modal.js (Componente React Blueprint)  │
├─────────────────────────────────────────────┤
│  core/* (Lógica de negocio)                 │
├─────────────────────────────────────────────┤
│  api/* (Módulos de Roam API por dominio)    │
├─────────────────────────────────────────────┤
│  window.roamAlphaAPI (API de Roam)          │
└─────────────────────────────────────────────┘
```

### Patrón de ejecución:
- IIFE (Immediately Invoked Function Expression)
- Todo se registra en `window.DiscourseGraphToolkit`
- USA React y Blueprint disponibles globalmente en Roam

### Acceso a Roam API:
Las llamadas a `window.roamAlphaAPI` están permitidas en:
- **`src/api/*`**: Módulos especializados por dominio (proyectos, búsquedas, verificación)
- **`src/index.js`**: Registro de comandos y verificación inicial
- **`src/config.js`**: Detección del nombre del grafo

Los módulos en `core/` y `ui/` deben preferir usar funciones de `api/*` cuando existan, pero pueden acceder a `roamAlphaAPI` directamente si no hay wrapper disponible.

## Decisiones de Diseño

### ¿Por qué concatenación en lugar de bundler?

Roam Research ejecuta JavaScript en un sandbox sin soporte nativo de módulos ES6. El build concatena archivos en orden de dependencias para crear una IIFE que funciona en este entorno.

### ¿Por qué código duplicado en HTML exportado?

El HTML generado por `htmlGenerator.js` incluye JavaScript embebido que no puede importar módulos. Es **aceptable** duplicar funciones auxiliares (como `extractBlockContent`) dentro del JS embebido. **Sin embargo**, la lógica de generación de Markdown debe ser **idéntica** entre el plugin y el HTML.

### Almacenamiento multi-grafo:

Las claves de localStorage incluyen el nombre del grafo como sufijo para aislar configuraciones entre grafos diferentes.

## Principios Operativos

### Versionado

- **La versión maestra está en `$version` de `build.ps1` (línea 3)**
- Al finalizar una tarea que modifique código funcional, incrementar la versión
- NO editar manualmente el header de version en `discourse-graph-toolkit.js`

### Manejo de errores

- Toda operación async debe tener `try/catch`
- Éxito → feedback visual con `DiscourseGraphToolkit.showToast()`
- Error → mensaje legible al usuario, nunca fallar silenciosamente

### Inmutabilidad de datos

Los objetos retornados por `roamAlphaAPI` (resultados de `pull` o `q`) deben tratarse como **solo lectura**. Si necesitas modificar datos, crea una copia.

### Consistencia de exportación

Existen 3 formas de generar Markdown:
1. `MarkdownGenerator.generateMarkdown()` — desde el plugin
2. `exportToMarkdown()` — en HTML embebido (global)
3. `exportQuestionMarkdown()` — en HTML embebido (por pregunta)

**TODAS deben usar exactamente la misma estructura.** Antes de modificar exportación, verificar que los outputs sean idénticos.

### Planificación de Tareas Complejas

Para cambios que afecten **más de 2 archivos** o impliquen **refactorizaciones arquitectónicas**:

1. **NO empieces a editar código directamente**
2. Primero, redacta un plan breve describiendo:
   - Qué archivos vas a modificar y por qué
   - Posibles riesgos o efectos secundarios
3. Pide confirmación al usuario antes de proceder
4. Ejecuta el plan paso a paso, verificando el build después de cada módulo

## Fragilidad Crítica

> [!WARNING]
> **Un solo error de sintaxis rompe TODO el plugin silenciosamente.**
> - **Síntoma:** Los comandos no aparecen en la Command Palette de Roam
> - **Causa común:** Paréntesis faltantes en `modal.js`, objetos mal cerrados
> - **Prevención:** SIEMPRE ejecutar `node -c discourse-graph-toolkit.js` después del build

## Restricción de Roam: Triple Backticks

> [!CAUTION]
> **El código JavaScript NO puede contener la secuencia literal de triple backticks.**
>
> Roam ejecuta el plugin dentro de un bloque de código delimitado por ` ``` `. Si el código JavaScript contiene esa misma secuencia (incluso en comentarios), **rompe el bloque de Roam** y el plugin no carga.

**Solución:** Usar concatenación de strings:
```javascript
// ❌ INCORRECTO - rompe Roam:
blockString.includes('```')

// ✅ CORRECTO - seguro para Roam:
blockString.includes('`' + '``')
```

**Aplica también a comentarios:**
```javascript
// ❌ INCORRECTO:
// Detecta backticks simples (`) y triples (```)

// ✅ CORRECTO:
// Detecta backticks simples y triples (bloques de código)
```

## Sistema de Diseño (UI/UX)

> [!IMPORTANT]
> **No uses estilos en línea (`style={{...}}`) en componentes de React en `tabs/*` o `components/*`.**
> 
> El plugin utiliza un sistema de diseño basado en utilidades unificado en `src/ui/styles.js`.
>
> 1. **Clases de Utilidad:** Usa clases como `.dgt-flex-row`, `.dgt-card`, `.dgt-mb-sm`.
> 2. **Variables CSS:** Usa variables nativas para colores (ej. `var(--dgt-bg-primary)`, `var(--dgt-accent-green)`).
> 3. **Nomenclatura:** Todas las clases propias deben llevar el prefijo `.dgt-`.
> 4. **Excepción Explícita:** El contenedor principal y el overlay en `src/ui/modal.js` son la única excepción permitida para estilos inline. En cualquier otra parte (pestañas, subcomponentes) están estrictamente prohibidos.
> 5. **Referencia de Implementación:** Consulta `BranchesTab.js` y `PanoramicTab.js` para ver ejemplos de cómo representar jerarquías complejas usando el design system en lugar de estilos inline.
>
> Si necesitas un estilo nuevo, agrégalo a `src/ui/styles.js` y úsalo mediante `className`.

## Pruebas Unitarias

Las pruebas usan el runner nativo de Node (`node:test`) y no requieren dependencias. Las funciones que hablan con Roam se prueban con una `window.roamAlphaAPI` simulada dentro de cada test.

- **Comando para ejecutar pruebas:** `node --test` (sin argumentos, en la raíz del proyecto). No usar `node --test tests/`: en Node 22 trata la carpeta como un módulo y falla.
- **Archivos de pruebas:**
  - `tests/pureFunctions.test.js`: helpers puros (`computeFavoriteName`, `sanitizeFilename`, `escapeDatalogString`, `cleanText`, `getNodeType`, `formatExportProjectName`), `MarkdownCore` y `EpubGenerator`.
  - `tests/wildcardGris.test.js`: mapeo de relaciones de nodos GRI.
  - `tests/branchPropagation.test.js`: verificación y propagación de proyectos en ramas (`planBranchPropagation`, `applyProjectChanges`, `_replaceProjectInString`, `_pickProjectBlocks`, `getBranchStatus`, `fixContainerAlignment`).
  - `tests/mutationThrottle.test.js`: limitador de escrituras compartido (`MutationThrottle`, `roamWrite`), con reloj simulado.
- **Regla:** Cada vez que se modifiquen esos módulos, ejecutar y validar las pruebas antes de dar por terminado el trabajo. Al corregir un error, escribir primero la prueba que lo reproduce.

## Escrituras en Roam

- **Toda escritura** (crear, actualizar o borrar bloques y páginas) debe pasar por `DiscourseGraphToolkit.roamWrite` o `MutationThrottle.execute`. Roam comparte entre todas las escrituras un presupuesto de 1500 llamadas por 60 s y lanza un error al superarlo.
- **Leer el proyecto de una página** siempre con `getProjectsForPages` / `_findProjectBlock`, que aplican un criterio único (primer bloque válido según su orden, ignorando los escapados) y detectan bloques duplicados. No escribir consultas propias de `Proyecto Asociado::` para eso.
- **Cambiar el proyecto de un bloque** con `_replaceProjectInString`, que conserva el resto del texto del bloque.

## Errores Comunes de IA

1. **Editar el bundle en lugar de `src/`** — Todo cambio se perderá
2. **Olvidar el build** — Los cambios en `src/` no se reflejan hasta correr `./build.ps1`
3. **No verificar sintaxis** — Un error minúsculo rompe todo el plugin
4. **Inconsistencia en exportadores Markdown** — Verificar que todos generen la misma estructura
5. **Usar triple backticks literales** — Rompe el bloque de código de Roam (ver sección anterior)
6. **Olvidar ejecutar las pruebas unitarias** — Romper comportamientos existentes de funciones puras al modificarlas



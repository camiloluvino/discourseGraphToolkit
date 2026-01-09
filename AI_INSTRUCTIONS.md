# AI Instructions — Discourse Graph Toolkit

**Lee este documento completo antes de hacer cualquier modificación.**

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
5. **Si hay error de sintaxis, NO entregar nada al usuario** hasta corregirlo

### Estructura de archivos:

```
src/
├── config.js          # Constantes, tipos de nodos, configuración por defecto
├── state.js           # Gestión de localStorage (multi-grafo)
├── index.js           # Inicialización y registro de comandos
├── api/               # Módulos de acceso a Roam API (por dominio)
│   ├── roamProjects.js           # Proyectos en Roam
│   ├── roamSearch.js             # Búsquedas y queries
│   ├── roamBranchVerification.js # Verificación de ramas
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
│   └── epubGenerator.js       # Generador EPUB
├── ui/modal.js        # Componente React (monolítico)
└── utils/             # Helpers y toast notifications
```

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

## Errores Comunes de IA

1. **Editar el bundle en lugar de `src/`** — Todo cambio se perderá
2. **Olvidar el build** — Los cambios en `src/` no se reflejan hasta correr `./build.ps1`
3. **No verificar sintaxis** — Un error minúsculo rompe todo el plugin
4. **Inconsistencia en exportadores Markdown** — Verificar que todos generen la misma estructura
5. **Usar triple backticks literales** — Rompe el bloque de código de Roam (ver sección anterior)


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
├── api/roam.js        # Abstracción de window.roamAlphaAPI
├── core/              # Lógica de negocio
│   ├── nodes.js       # Creación de nodos QUE/CLM/EVD
│   ├── projects.js    # Gestión de proyectos
│   ├── export.js      # Exportación JSON
│   ├── import.js      # Importación
│   ├── contentProcessor.js    # Procesamiento de contenido
│   ├── relationshipMapper.js  # Mapeo de relaciones entre nodos
│   ├── htmlGenerator.js       # Generador HTML
│   └── markdownGenerator.js   # Generador Markdown
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
│  api/roam.js (Abstracción de Roam API)      │
├─────────────────────────────────────────────┤
│  window.roamAlphaAPI (API de Roam)          │
└─────────────────────────────────────────────┘
```

### Patrón de ejecución:
- IIFE (Immediately Invoked Function Expression)
- Todo se registra en `window.DiscourseGraphToolkit`
- USA React y Blueprint disponibles globalmente en Roam

### Regla de abstracción de API:
**Ningún componente de UI o core debe invocar `window.roamAlphaAPI` directamente.** Todas las interacciones con Roam deben pasar por `src/api/roam.js`.

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

## Errores Comunes de IA

1. **Editar el bundle en lugar de `src/`** — Todo cambio se perderá
2. **Olvidar el build** — Los cambios en `src/` no se reflejan hasta correr `./build.ps1`
3. **No verificar sintaxis** — Un error minúsculo rompe todo el plugin
4. **Llamar a `roamAlphaAPI` directamente** — Debe pasar por `api/roam.js`
5. **Inconsistencia en exportadores Markdown** — Verificar que todos generen la misma estructura

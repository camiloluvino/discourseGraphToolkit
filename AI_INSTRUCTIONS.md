# AI Instructions ÔÇö Discourse Graph Toolkit

**Lee este documento completo antes de hacer cualquier modificaci├│n.**

> [!IMPORTANT]
> **Antes de modificar l├│gica de relaciones, exportaci├│n o templates**, lee tambi├®n
> `DISCOURSE_GRAPH_SYNTAX.md` que documenta la gram├ítica completa del grafo de discurso
> (tipos de nodos, tags estructurales, reglas de coherencia de proyectos).

## Documentos del Proyecto

| Documento | Prop├│sito | Cu├índo leerlo |
|-----------|-----------|---------------|
| `AI_INSTRUCTIONS.md` | Reglas de codificaci├│n y arquitectura | **Siempre**, antes de cualquier cambio |
| `DISCOURSE_GRAPH_SYNTAX.md` | Gram├ítica del dominio (nodos, tags, relaciones) | Antes de tocar `core/`, `api/`, o exportadores |
| `STATUS.md` | Estado actual y changelog reciente | Para contexto de versiones y bugs conocidos |
| `README.md` | Documentaci├│n de usuario final | Solo si se necesita actualizar la documentaci├│n p├║blica |

## Descripci├│n del Proyecto

Plugin para Roam Research que facilita la creaci├│n y exportaci├│n de grafos de discurso acad├®mico. Permite estructurar investigaciones usando nodos **QUE** (preguntas), **CLM** (afirmaciones) y **EVD** (evidencias), organizarlos en proyectos, verificar coherencia y exportar a JSON/HTML/Markdown.

## Fuente de Verdad

> [!CAUTION]
> **La carpeta `src/` es la ├ÜNICA fuente de verdad. NUNCA edites `discourse-graph-toolkit.js` directamente ÔÇöes un archivo generado que se sobrescribir├í.**

### Flujo de trabajo obligatorio:

1. **Identificar** el m├│dulo correcto en `src/`
2. **Editar** solo archivos dentro de `src/`
3. **Ejecutar** `./build.ps1` para generar el bundle
4. **Verificar sintaxis:** `node -c discourse-graph-toolkit.js`
5. **Verificar pruebas unitarias:** `node --test tests/`
6. **Si hay error de sintaxis o pruebas fallidas, NO entregar nada al usuario** hasta corregirlo

### Estructura de archivos:

```
src/
Ôö£ÔöÇÔöÇ config.js          # Constantes, tipos de nodos y configuraci├│n por defecto
Ôö£ÔöÇÔöÇ styles.js          # Sistema de dise├▒o (CSS), tokens y clases de utilidad
Ôö£ÔöÇÔöÇ state.js           # Gesti├│n de localStorage (multi-grafo, cache panor├ímico)
Ôö£ÔöÇÔöÇ index.js           # Inicializaci├│n y registro de comandos
Ôö£ÔöÇÔöÇ api/               # M├│dulos de acceso a Roam API (por dominio)
Ôöé   Ôö£ÔöÇÔöÇ roamProjects.js           # Proyectos en Roam
Ôöé   Ôö£ÔöÇÔöÇ roamSearch.js             # B├║squedas y queries
Ôöé   Ôö£ÔöÇÔöÇ roamBranchVerification.js # Verificaci├│n de ramas (jer├írquica padre-hijo)
Ôöé   ÔööÔöÇÔöÇ roamStructureVerification.js # Verificaci├│n de estructura
Ôö£ÔöÇÔöÇ core/              # L├│gica de negocio
Ôöé   Ôö£ÔöÇÔöÇ nodes.js       # Creaci├│n de nodos QUE/CLM/EVD
Ôöé   Ôö£ÔöÇÔöÇ projects.js    # Gesti├│n de proyectos
Ôöé   Ôö£ÔöÇÔöÇ export.js      # Exportaci├│n JSON
Ôöé   Ôö£ÔöÇÔöÇ import.js      # Importaci├│n
Ôöé   Ôö£ÔöÇÔöÇ contentProcessor.js    # Procesamiento de contenido
Ôöé   Ôö£ÔöÇÔöÇ relationshipMapper.js  # Mapeo de relaciones entre nodos
Ôöé   Ôö£ÔöÇÔöÇ markdownCore.js        # Core de generaci├│n Markdown (standalone)
Ôöé   Ôö£ÔöÇÔöÇ markdownGenerator.js   # Wrapper de MarkdownCore para el plugin
Ôöé   Ôö£ÔöÇÔöÇ htmlGenerator.js       # Generador HTML (usa htmlEmbeddedScript.js)
Ôöé   Ôö£ÔöÇÔöÇ htmlEmbeddedScript.js  # JavaScript inyectado en HTML exportado
Ôöé   Ôö£ÔöÇÔöÇ epubGenerator.js       # Generador EPUB
Ôöé   ÔööÔöÇÔöÇ html/                  # Generadores auxiliares HTML
Ôöé       Ôö£ÔöÇÔöÇ htmlStyles.js      # Estilos embebidos en el HTML exportado
Ôöé       Ôö£ÔöÇÔöÇ htmlHelpers.js     # Helpers espec├¡ficos de renderizado HTML
Ôöé       ÔööÔöÇÔöÇ htmlNodeRenderers.js # Renderizadores de nodos individuales en HTML
Ôö£ÔöÇÔöÇ ui/                # Componentes React de interfaz
Ôöé   Ôö£ÔöÇÔöÇ modal.js       # Modal principal (compositor de Providers)
Ôöé   Ôö£ÔöÇÔöÇ ToolkitContext.js  # React Context y hook useToolkit (legacy/wrapper)
Ôöé   Ôö£ÔöÇÔöÇ contexts/      # Contextos de dominio
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ NavContext.js        # Contexto de navegaci├│n de pesta├▒as
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ ProjectsContext.js   # Contexto para gesti├│n de proyectos
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ BranchesContext.js   # Contexto para validaci├│n de ramas
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ ExportContext.js     # Contexto para exportaci├│n de datos
Ôöé   Ôöé   ÔööÔöÇÔöÇ PanoramicContext.js  # Contexto para la vista panor├ímica
Ôöé   Ôö£ÔöÇÔöÇ components/    # Componentes reutilizables
Ôöé   Ôöé   ÔööÔöÇÔöÇ ProjectTreeView.js  # ├ürbol jer├írquico con expand/collapse
Ôöé   ÔööÔöÇÔöÇ tabs/          # Componentes de pesta├▒as individuales
Ôöé       Ôö£ÔöÇÔöÇ ProjectsTab.js   # Gesti├│n de proyectos
Ôöé       Ôö£ÔöÇÔöÇ BranchesTab.js   # Verificaci├│n de ramas
Ôöé       Ôö£ÔöÇÔöÇ NodesTab.js      # Gesti├│n de nodos hu├®rfanos
Ôöé       Ôö£ÔöÇÔöÇ PanoramicTab.js  # Vista panor├ímica
Ôöé       Ôö£ÔöÇÔöÇ ExportTab.js     # Exportaci├│n
Ôöé       ÔööÔöÇÔöÇ ImportTab.js     # Importaci├│n
ÔööÔöÇÔöÇ utils/             # Helpers y toast notifications
    Ôö£ÔöÇÔöÇ helpers.js           # Helpers generales
    Ôö£ÔöÇÔöÇ projectTreeUtils.js  # Utilidades de ├írbol de proyectos
    ÔööÔöÇÔöÇ toast.js             # Notificaciones de toast
```

### Arquitectura UI:

El componente `modal.js` act├║a como **compositor de Providers**:
- Ya no define todo el estado compartido en un solo lugar.
- Envuelve las pesta├▒as con 5 contextos independientes ubicados en `src/ui/contexts/`:
  - `NavContext` (para navegar entre pesta├▒as)
  - `ProjectsContext` (para gesti├│n de proyectos y su lista)
  - `BranchesContext` (para la pesta├▒a de verificaci├│n de coherencia)
  - `ExportContext` (para las opciones y estado de exportaci├│n)
  - `PanoramicContext` (para la ordenaci├│n y carga en la vista panor├ímica)
- Cada Tab consume solo los hooks espec├¡ficos del dominio que necesita (ej. `useNav()`, `useProjects()`, `useBranches()`, `useExport()`, `usePanoramic()`).
- `ToolkitContext.js` se mantiene como un wrapper legacy/compartido, pero el flujo preferido son los contextos distribuidos de dominio.
- Las pesta├▒as `NodesTab.js` e `ImportTab.js` utilizan principalmente `useState` de React local, sin depender de un contexto global.

## Arquitectura Conceptual

### Capas del sistema:

```
ÔöîÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÉ
Ôöé  ui/modal.js (Componente React Blueprint)  Ôöé
Ôö£ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöñ
Ôöé  core/* (L├│gica de negocio)                 Ôöé
Ôö£ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöñ
Ôöé  api/* (M├│dulos de Roam API por dominio)    Ôöé
Ôö£ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöñ
Ôöé  window.roamAlphaAPI (API de Roam)          Ôöé
ÔööÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÿ
```

### Patr├│n de ejecuci├│n:
- IIFE (Immediately Invoked Function Expression)
- Todo se registra en `window.DiscourseGraphToolkit`
- USA React y Blueprint disponibles globalmente en Roam

### Acceso a Roam API:
Las llamadas a `window.roamAlphaAPI` est├ín permitidas en:
- **`src/api/*`**: M├│dulos especializados por dominio (proyectos, b├║squedas, verificaci├│n)
- **`src/index.js`**: Registro de comandos y verificaci├│n inicial
- **`src/config.js`**: Detecci├│n del nombre del grafo

Los m├│dulos en `core/` y `ui/` deben preferir usar funciones de `api/*` cuando existan, pero pueden acceder a `roamAlphaAPI` directamente si no hay wrapper disponible.

## Decisiones de Dise├▒o

### ┬┐Por qu├® concatenaci├│n en lugar de bundler?

Roam Research ejecuta JavaScript en un sandbox sin soporte nativo de m├│dulos ES6. El build concatena archivos en orden de dependencias para crear una IIFE que funciona en este entorno.

### ┬┐Por qu├® c├│digo duplicado en HTML exportado?

El HTML generado por `htmlGenerator.js` incluye JavaScript embebido que no puede importar m├│dulos. Es **aceptable** duplicar funciones auxiliares (como `extractBlockContent`) dentro del JS embebido. **Sin embargo**, la l├│gica de generaci├│n de Markdown debe ser **id├®ntica** entre el plugin y el HTML.

### Almacenamiento multi-grafo:

Las claves de localStorage incluyen el nombre del grafo como sufijo para aislar configuraciones entre grafos diferentes.

## Principios Operativos

### Versionado

- **La versi├│n maestra est├í en `$version` de `build.ps1` (l├¡nea 3)**
- Al finalizar una tarea que modifique c├│digo funcional, incrementar la versi├│n
- NO editar manualmente el header de version en `discourse-graph-toolkit.js`

### Manejo de errores

- Toda operaci├│n async debe tener `try/catch`
- ├ëxito ÔåÆ feedback visual con `DiscourseGraphToolkit.showToast()`
- Error ÔåÆ mensaje legible al usuario, nunca fallar silenciosamente

### Inmutabilidad de datos

Los objetos retornados por `roamAlphaAPI` (resultados de `pull` o `q`) deben tratarse como **solo lectura**. Si necesitas modificar datos, crea una copia.

### Consistencia de exportaci├│n

Existen 3 formas de generar Markdown:
1. `MarkdownGenerator.generateMarkdown()` ÔÇö desde el plugin
2. `exportToMarkdown()` ÔÇö en HTML embebido (global)
3. `exportQuestionMarkdown()` ÔÇö en HTML embebido (por pregunta)

**TODAS deben usar exactamente la misma estructura.** Antes de modificar exportaci├│n, verificar que los outputs sean id├®nticos.

### Planificaci├│n de Tareas Complejas

Para cambios que afecten **m├ís de 2 archivos** o impliquen **refactorizaciones arquitect├│nicas**:

1. **NO empieces a editar c├│digo directamente**
2. Primero, redacta un plan breve describiendo:
   - Qu├® archivos vas a modificar y por qu├®
   - Posibles riesgos o efectos secundarios
3. Pide confirmaci├│n al usuario antes de proceder
4. Ejecuta el plan paso a paso, verificando el build despu├®s de cada m├│dulo

## Fragilidad Cr├¡tica

> [!WARNING]
> **Un solo error de sintaxis rompe TODO el plugin silenciosamente.**
> - **S├¡ntoma:** Los comandos no aparecen en la Command Palette de Roam
> - **Causa com├║n:** Par├®ntesis faltantes en `modal.js`, objetos mal cerrados
> - **Prevenci├│n:** SIEMPRE ejecutar `node -c discourse-graph-toolkit.js` despu├®s del build

## Restricci├│n de Roam: Triple Backticks

> [!CAUTION]
> **El c├│digo JavaScript NO puede contener la secuencia literal de triple backticks.**
>
> Roam ejecuta el plugin dentro de un bloque de c├│digo delimitado por ` ``` `. Si el c├│digo JavaScript contiene esa misma secuencia (incluso en comentarios), **rompe el bloque de Roam** y el plugin no carga.

**Soluci├│n:** Usar concatenaci├│n de strings:
```javascript
// ÔØî INCORRECTO - rompe Roam:
blockString.includes('```')

// Ô£à CORRECTO - seguro para Roam:
blockString.includes('`' + '``')
```

**Aplica tambi├®n a comentarios:**
```javascript
// ÔØî INCORRECTO:
// Detecta backticks simples (`) y triples (```)

// Ô£à CORRECTO:
// Detecta backticks simples y triples (bloques de c├│digo)
```

## Sistema de Dise├▒o (UI/UX)

> [!IMPORTANT]
> **No uses estilos en l├¡nea (`style={{...}}`) en componentes de React en `tabs/*` o `components/*`.**
> 
> El plugin utiliza un sistema de dise├▒o basado en utilidades unificado en `src/ui/styles.js`.
>
> 1. **Clases de Utilidad:** Usa clases como `.dgt-flex-row`, `.dgt-card`, `.dgt-mb-sm`.
> 2. **Variables CSS:** Usa variables nativas para colores (ej. `var(--dgt-bg-primary)`, `var(--dgt-accent-green)`).
> 3. **Nomenclatura:** Todas las clases propias deben llevar el prefijo `.dgt-`.
> 4. **Excepci├│n Expl├¡cita:** El contenedor principal y el overlay en `src/ui/modal.js` son la ├║nica excepci├│n permitida para estilos inline. En cualquier otra parte (pesta├▒as, subcomponentes) est├ín estrictamente prohibidos.
> 5. **Referencia de Implementaci├│n:** Consulta `BranchesTab.js` y `PanoramicTab.js` para ver ejemplos de c├│mo representar jerarqu├¡as complejas usando el design system en lugar de estilos inline.
>
> Si necesitas un estilo nuevo, agr├®galo a `src/ui/styles.js` y ├║salo mediante `className`.

## Pruebas Unitarias

El proyecto cuenta con pruebas unitarias para validar las funciones auxiliares puras (que no tienen dependencias directas del entorno del navegador ni de la API de Roam Research).

- **Archivo de pruebas:** [pureFunctions.test.js](file:///c:/Users/User/Documents/proyectosVibeCoding/proyectosRoamEnhance/discourseGraphToolkit/tests/pureFunctions.test.js)
- **Comando para ejecutar pruebas:** `node --test tests/` (ejecutado en la ra├¡z del proyecto).
- **M├│dulos bajo prueba:**
  - `src/config.js` (`computeFavoriteName`)
  - `src/utils/helpers.js` (`sanitizeFilename`, `escapeDatalogString`, `cleanText`, `getNodeType`, `formatExportProjectName`)
  - `src/core/markdownCore.js` (`MarkdownCore.cleanText`)
- **Regla:** Cada vez que se realicen modificaciones en los archivos de origen anteriores, se deben ejecutar y validar las pruebas antes de dar por terminado el trabajo.

## Errores Comunes de IA

1. **Editar el bundle en lugar de `src/`** ÔÇö Todo cambio se perder├í
2. **Olvidar el build** ÔÇö Los cambios en `src/` no se reflejan hasta correr `./build.ps1`
3. **No verificar sintaxis** ÔÇö Un error min├║sculo rompe todo el plugin
4. **Inconsistencia en exportadores Markdown** ÔÇö Verificar que todos generen la misma estructura
5. **Usar triple backticks literales** ÔÇö Rompe el bloque de c├│digo de Roam (ver secci├│n anterior)
6. **Olvidar ejecutar las pruebas unitarias** ÔÇö Romper comportamientos existentes de funciones puras al modificarlas



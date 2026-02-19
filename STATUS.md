# Estado del Proyecto — Discourse Graph Toolkit

**Última actualización:** 2026-02-16

## Versión Actual

**v1.5.11**

## Estado de Funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Creación de nodos (QUE/CLM/EVD) | ✅ Estable | Atajos Ctrl+Shift+Q/C/E |
| Gestión de proyectos | ✅ Estable | Crear, asignar, sincronizar con Roam |
| Auto-descubrimiento de proyectos | ✅ Estable | Alerta al abrir Toolkit si hay proyectos no registrados |
| Match jerárquico de proyectos | ✅ Estable | Al exportar, proyecto padre incluye sub-proyectos |
| Verificación de coherencia (Ramas) | ✅ Mejorado | Vista de árbol jerárquico + detección de huérfanos |
| Detección de nodos huérfanos | ✅ Mejorado | Identifica nodos sin proyecto ni relaciones, se actualiza al verificar |
| **Vista Panorámica** | ✅ Estable | Layout compacto + textos completos |
| Exportación JSON | ✅ Estable | Formato nativo de Roam |
| Exportación HTML | ✅ Estable | Documento interactivo |
| Exportación Markdown | ✅ Estable | Incluye EVDs de CLMs de soporte |
| Exportación EPUB | ✅ Mejorado | Bloques estructurales con espaciado visual |
| Reordenamiento de preguntas | ✅ Mejorado | Orden persistente entre sesiones por proyecto |
| Importación JSON | ✅ Estable | Sin sobrescritura de existentes |
| Selector de proyectos (Exportar) | ✅ Estable | Vista de árbol con selección en cascada |

## Historial Reciente

### v1.5.11 (Febrero 2026)
- **Fix:** Corregida la indentación visual en el dropdown de proyectos de la Vista Panorámica (ahora usa espacios de no-quiebre para respetar la jerarquía).

### v1.5.10 (Febrero 2026)
- **Fix:** Corregido bug visual en la pestaña Ramas donde los sub-proyectos con una sola pregunta no mostraban su encabezado de carpeta, causando que sus preguntas parecieran pertenecer a la rama anterior.

### v1.5.9 (Enero 2026)
- **Fix:** Exportación EPUB ya no retiene datos "stale" (rama anterior) al cambiar de proyecto sin actualizar la vista previa.

### v1.5.8 (Enero 2026)
- **Fix:** Corregido bug donde el orden de preguntas de Panorámica no se aplicaba en Export al seleccionar proyectos hijos
- **Tech:** `getProjectKey()` ahora calcula el ancestro común real de proyectos hermanos (no solo verifica si uno es prefijo de otro)

### v1.5.7 (Enero 2026)
- **Feature:** Detección de nodos huérfanos — nuevo botón "👻 Huérfanos" en pestaña Ramas
- **Feature:** Actualización automática de huérfanos — al presionar "Verificar", la lista de huérfanos se refresca si ya se había buscado
- **UI:** Rediseño de pestaña Ramas — header compacto con badges en esquina superior derecha
- **UI:** Eliminada descripción redundante, más espacio vertical para árbol de nodos (28rem)
- **Tech:** Nueva función `findOrphanNodes()` para detectar páginas QUE/CLM/EVD sin proyecto ni referencias

### v1.5.6 (Enero 2026)
- **UI:** Mejoras en pestaña Exportar — botones "Seleccionar todos" reubicados junto a los títulos y estilizados como enlaces.
- **UX:** Selección por defecto — al abrir la pestaña Exportar, todos los tipos (QUE, CLM, EVD) vienen seleccionados.

### v1.5.5 (Enero 2026)
- **UI:** Eliminada opción "Vista Previa" en pestaña Exportar (redundante con Panorámica)
- **Flow:** Flujo de exportación simplificado — selección directa de proyecto/tipo y descarga
- **Docs:** Actualizada referencia de reordenamiento (se realiza exclusivamente en Panorámica)

### v1.5.4 (Enero 2026)
- **Refactor:** Implementado React Context (`ToolkitContext.js`) para compartir estado entre pestañas
- **Tech:** Eliminado prop drilling — ~54 props removidos de `modal.js`
- **Tech:** Todos los tabs ahora usan `useToolkit()` hook para acceder al estado
- **Arquitectura:** modal.js ahora actúa solo como Provider, lógica de estado descentralizada

### v1.5.3 (Enero 2026)
- **Refactor:** Nuevo componente `ProjectTreeView.js` — extrae lógica duplicada de árboles jerárquicos
- **Tech:** Eliminadas ~90 líneas de código duplicado entre `BranchesTab.js` y `ExportTab.js`
- **Tech:** Lógica de expand/collapse ahora centralizada en componente reutilizable
- **Docs:** Actualizado `AI_INSTRUCTIONS.md` con nueva estructura de carpeta `ui/components/`

### v1.5.2 (Enero 2026)
- **UI:** Pestaña Ramas — simplificados indicadores del árbol a solo conteo de preguntas
- **UI:** Pestaña Ramas — textos de discordancia más claros: "Debería heredar:" / "Tiene:"
- **Fix:** Corregido bug en Exportar donde el orden personalizado de Panorámica no se aplicaba al seleccionar todo el proyecto (ahora usa prefijo común como clave)

### v1.5.1 (Enero 2026)
- **Feature:** Selección jerárquica de ramas en Panorámica — el dropdown ahora incluye grupos de prefijos (📁) además de ramas individuales (📄)
- **Feature:** Cache persistente para pestaña Panorámica — datos se restauran automáticamente al reabrir modal
- **UI:** Banner con antigüedad del cache y botón "Refrescar"
- **Fix:** Corregido bug de referencias circulares (`node.data = node`) que impedía serializar cache
- **Tech:** Funciones `savePanoramicCache` y `loadPanoramicCache` con limpieza/restauración de refs circulares
- **UI:** Nuevo layout de dos columnas — controles en esquina superior derecha
- **UI:** Textos de nodos ahora se muestran completos (sin truncar a 50 chars)
- **UI:** Controles más compactos para dar protagonismo a la lista de nodos

### v1.5.0 (Enero 2026)
- **Feature:** Nueva pestaña "Panorámica" — vista sintética de todas las ramas del grafo
- **UI:** Visualización compacta horizontal: QUE → CLM → EVD
- **UI:** Filtrado por proyecto
- **UI:** Estadísticas de nodos (preguntas, afirmaciones, evidencias)
- **UI:** Click en cualquier nodo navega a Roam
- **Fix:** Corregida lógica de botones "Expandir Todo" / "Colapsar Todo"

### v1.4.2 (Enero 2026)
- **Feature:** Vista de árbol jerárquico en pestaña Proyectos — organiza proyectos por namespace
- **UI:** Selección en cascada para eliminar múltiples proyectos
- **UI:** Validación de existencia mostrada en árbol con indicadores ✅/⚠️

### v1.4.1 (Enero 2026)
- **Feature:** Vista de árbol jerárquico en selector de proyectos de pestaña Exportar
- **UI:** Selección en cascada — marcar padre selecciona todos los hijos
- **UI:** Checkbox indeterminado cuando solo algunos hijos están seleccionados
- **UI:** Badge con conteo de proyectos seleccionados por carpeta

### v1.4.0 (Enero 2026)
- **Feature:** Vista de árbol jerárquico en pestaña Ramas — agrupa preguntas por namespace de proyecto
- **UI:** Proyectos colapsables con indicador de estado agregado (✅/🔀/⚠️/❌)
- **UI:** Muestra conteo de preguntas y problemas por proyecto
- **Tech:** Nuevo módulo `projectTreeUtils.js` con lógica de construcción de árbol

### v1.3.2 (Enero 2026)
- **UI:** Botones de propagación separados:
  - `🔄 Propagar raíz` — para nodos sin proyecto o con proyecto diferente
  - `⬆️ Heredar de padres` — para corregir generalizaciones

### v1.3.1 (Enero 2026)
- **Feature:** Verificación jerárquica padre-hijo — cada nodo debe tener proyecto igual o más específico que su padre directo
- **Feature:** Detección de generalización — cuando un hijo tiene proyecto menos específico que su padre
- **UI:** Muestra contexto del padre en errores: `⬆️ Generaliza: proyecto ← padre: proyecto/sub`

### v1.3.0 (Enero 2026)
- **Feature:** Namespaces jerárquicos en verificación de ramas — sub-proyectos como `proyecto/sub/detalle` son coherentes con `proyecto/sub`
- **Feature:** Propagación inteligente — respeta especializaciones existentes al propagar proyectos
- **UI:** Nueva categoría "🔀 Especializados" en pestaña Ramas para distinguir nodos con sub-namespaces

### v1.2.8 (Enero 2026)
- **Feature:** Filtrado de atributos `Proyecto Asociado::` escapados con backticks — evita que ejemplos en conversaciones de chatbot aparezcan como proyectos reales en "Buscar Sugerencias"
- **Docs:** Documentada restricción de Roam sobre triple backticks en `AI_INSTRUCTIONS.md`

### v1.2.7 (Enero 2026)
- **Feature:** Persistencia del orden de preguntas — el orden personalizado de QUEs se guarda por proyecto y se restaura automáticamente al reabrir

### v1.2.6 (Enero 2026)
- **Feature:** Espaciado visual en bloques estructurales EPUB — los bloques `*— texto —*` ahora tienen márgenes adicionales (1.2em) para mejor legibilidad

### v1.2.5 (Enero 2026)
- **Feature:** Prefijos de tipo de nodo en EPUB — los encabezados ahora muestran `[H2][QUE]`, `[H3][CLM]`, `[H4][EVD]` para indicar tanto el nivel jerárquico como el tipo de elemento del discurso

### v1.2.4 (Enero 2026)
- **Feature:** Reordenamiento de preguntas (QUE) en la pestaña Exportar con botones ↑↓
- **Feature:** Match jerárquico de proyectos — seleccionar `proyecto/sub` incluye `proyecto/sub/hijo`
- **Feature:** Auto-descubrimiento de proyectos al abrir el Toolkit con alerta "Agregar todos"
- **Refactoring:** Unificado código de generación Markdown en `markdownCore.js`
- **Mejora:** Eliminadas ~400 líneas de código duplicado entre plugin y HTML
- **Mejora:** `markdownGenerator.js` reducido de 212 a 16 líneas
- **Mejora:** `htmlEmbeddedScript.js` reducido de 628 a 180 líneas

### v1.2.3 (Enero 2026)
- **Feature:** Exportación a EPUB completa directamente desde el navegador (usando JSZip)
- **Feature:** Nueva opción de exportación Markdown Plano (sin bullets)
- **Mejora:** Prefijos de encabezado explícitos ([H2]-[H5]) en EPUB para mejor legibilidad en dispositivos e-ink
- **UI:** Nuevos botones "MD Plano" y "EPUB" en la pestaña Exportar
- **Tech:** Nuevo módulo `epubGenerator.js`

### v1.2.1 (Diciembre 2025)
- **Fix:** Exportación Markdown ahora incluye EVDs de CLMs de soporte (estructura QUE→CLM→CLM(soporte)→EVD)
- Sincronización de lógica entre `markdownGenerator.js` y JS embebido en `htmlGenerator.js`
- Reorganización de estructura del proyecto (carpetas `docs/`, `tests/`, `reference/`)
- Consolidación de documentación

### v1.2.0
- Verificación de coherencia de proyectos en ramas
- Propagación de `Proyecto Asociado::` a nodos descendientes
- Mejoras en UI de la pestaña "Ramas"

### v1.1.x
- Correcciones de formateo de code blocks
- Filtro de MCP tool calls de Claude
- Mejoras en manejo de errores de exportación

## Problemas Conocidos

*Actualmente no hay bugs documentados.*

Si encuentras un problema:
1. Documéntalo aquí con descripción y pasos para reproducir
2. Marca con `⚠️ PENDIENTE` hasta que se resuelva

## Próximos Pasos

*No hay tareas pendientes definidas actualmente.*

---

## Notas para la IA

Al finalizar cada sesión de trabajo:
1. Actualizar la versión si hubo cambios funcionales
2. Agregar entrada al historial reciente
3. Documentar cualquier bug descubierto en "Problemas Conocidos"
4. Actualizar estado de funcionalidades si cambió algo

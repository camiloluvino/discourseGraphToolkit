# Estado del Proyecto — Discourse Graph Toolkit

**Última actualización:** 2026-01-06

## Versión Actual

**v1.2.4**

## Estado de Funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Creación de nodos (QUE/CLM/EVD) | ✅ Estable | Atajos Ctrl+Shift+Q/C/E |
| Gestión de proyectos | ✅ Estable | Crear, asignar, sincronizar con Roam |
| Auto-descubrimiento de proyectos | ✅ Nuevo | Alerta al abrir Toolkit si hay proyectos no registrados |
| Match jerárquico de proyectos | ✅ Nuevo | Al exportar, proyecto padre incluye sub-proyectos |
| Verificación de coherencia (Ramas) | ✅ Estable | Detecta y propaga `Proyecto Asociado::` |
| Exportación JSON | ✅ Estable | Formato nativo de Roam |
| Exportación HTML | ✅ Estable | Documento interactivo |
| Exportación Markdown | ✅ Estable | Incluye EVDs de CLMs de soporte |
| Exportación EPUB | ✅ Estable | Generación completa con tabla de contenidos y estilos |
| Reordenamiento de preguntas | ✅ Nuevo | Buttons ↑↓ para reordenar QUEs antes de exportar |
| Importación JSON | ✅ Estable | Sin sobrescritura de existentes |

## Historial Reciente

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

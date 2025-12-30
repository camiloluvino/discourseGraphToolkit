# Estado del Proyecto — Discourse Graph Toolkit

**Última actualización:** 2025-12-29

## Versión Actual

**v1.2.1**

## Estado de Funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Creación de nodos (QUE/CLM/EVD) | ✅ Estable | Atajos Ctrl+Shift+Q/C/E |
| Gestión de proyectos | ✅ Estable | Crear, asignar, sincronizar con Roam |
| Verificación de coherencia (Ramas) | ✅ Estable | Detecta y propaga `Proyecto Asociado::` |
| Exportación JSON | ✅ Estable | Formato nativo de Roam |
| Exportación HTML | ✅ Estable | Documento interactivo |
| Exportación Markdown | ✅ Estable | — |
| Importación JSON | ✅ Estable | Sin sobrescritura de existentes |

## Historial Reciente

### v1.2.1 (Diciembre 2025)
- Reorganización de estructura del proyecto (carpetas `docs/`, `tests/`, `reference/`)
- Consolidación de documentación
- Limpieza de archivos obsoletos

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

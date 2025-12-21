---
description: Guías de desarrollo para mantener consistencia en el código del Discourse Graph Toolkit
---

# Principios de Desarrollo

## 1. Consistencia de Formatos de Exportación

**REGLA CRÍTICA:** Cuando existen múltiples formas de exportar el mismo formato (ej: Markdown), **DEBEN generar exactamente la misma estructura**.

### Ejemplo actual
El plugin tiene 3 formas de generar Markdown:
1. `MarkdownGenerator.generateMarkdown()` - Exportación completa desde el plugin
2. `exportToMarkdown()` en HTML embebido - Exportación global desde el HTML
3. `exportQuestionMarkdown()` en HTML embebido - Exportación por pregunta desde el HTML

**Todas deben usar la misma estructura:**
- Mismos niveles de encabezados (##, ###, ####)
- Mismo formato de metadata
- Misma lógica de extracción de contenido

### Práctica recomendada
Cuando añadas una nueva forma de exportar:
1. Revisa las funciones de exportación existentes
2. Copia la lógica exacta, no la reimplementes diferente
3. Verifica que el output sea idéntico comparando archivos generados

## 2. Código Duplicado vs Reutilización

Debido a que el JS embebido en el HTML no puede importar módulos externos, es **aceptable** duplicar funciones auxiliares (como `extractBlockContent`, `cleanText`) dentro del JS embebido.

**Sin embargo:** La lógica de generación de Markdown debe ser **idéntica** entre todas las copias.

## 3. Verificación de Consistencia

Antes de hacer commit de cambios en exportación:
1. Exporta el grafo completo a Markdown desde el plugin
2. Exporta una pregunta individual desde el HTML
3. Compara que la estructura de la pregunta sea idéntica en ambos outputs

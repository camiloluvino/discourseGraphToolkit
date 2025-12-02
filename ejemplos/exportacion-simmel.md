# Ejemplo: ejemploJSONSimmel.json

Este archivo contiene un **export NATIVO de Roam Research** (NO generado por el plugin) del proyecto de investigación "artículo/sociabilidad en Simmel".

**⚠️ IMPORTANTE**: Este es un export usando la funcionalidad nativa de exportación de Roam, que sirve como **referencia** del formato que el plugin Discourse Selector intenta replicar.

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Páginas exportadas | 5 |
| Bloques totales | 476 |
| Tamaño del archivo | 216 KB (0.21 MB) |
| Formato | Array JSON (minificado) |

## 📑 Composición por tipo de elemento

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| `[[EVD]]` | 2 | Evidencias (referencias bibliográficas, citas) |
| `[[QUE]]` | 2 | Preguntas de investigación |
| `[[CLM]]` | 1 | Claims (afirmaciones argumentativas) |

## 📝 Páginas incluidas

### 1. [[QUE]] - Marcos de relevancia
**Título completo**: "¿Bajo qué marcos de relevancia y a través de qué estrategias de posicionamiento se puede justificar una deconstrucción crítica del concepto de sociabilidad en el debate sociológico contemporáneo?"

**Características**:
- Pregunta metodológica sobre posicionamiento teórico
- Contiene bloques `#RespondedBy` con evidencias de Anderson e Ivana
- Referencias a: Sally Anderson, Greti-Iulia Ivana

---

### 2. [[CLM]] - Deconstrucción crítica
**Título completo**: "[[Camilo Luvino]] La relevancia de una deconstrucción crítica del concepto de sociabilidad de Simmel se fundamenta en tres ejes: primero, en la necesidad de abordar una 'dimensión descuidada'..."

**Características**:
- Claim argumentativo con tres ejes de fundamentación
- Contiene bloques `#SupportedBy` con evidencias
- Referencias a: Degenne, García, Martuccelli, Araujo, Casciaro

---

### 3. [[EVD]] - Relevancia de Simmel (Frisby)
**Título completo**: "La relevancia de Georg Simmel, según [[David Frisby]], reside en entender la sociología en base a la 'interacción' (Wechselwirkung)..."

**Características**:
- Evidencia sobre el "impresionismo sociológico" de Simmel
- Sección narrativa extensa
- Referencia bibliográfica: @frisbySociologicalImpressionismReassessment1992

---

### 4. [[QUE]] - Críticas a Simmel
**Título completo**: "¿cómo se ha **criticado** la teoría general de Simmel y su concepto de sociabilidad?"

**Características**:
- Pregunta de revisión crítica de literatura
- Contiene bloques `#RespondedBy` con múltiples claims
- Referencias a: Sally Anderson, Thomas Malaby, Pierre Bourdieu
- Estructura jerárquica compleja con embeds

---

### 5. [[EVD]] - Sociabilidad en América Latina (Araujo)
**Título completo**: "Kathya Araujo posiciona la sociabilidad como un concepto de primer orden para el análisis de la sociedad latinoamericana..."

**Características**:
- Evidencia sobre sociabilidad y desigualdades interaccionales
- Enfoque regional (América Latina)
- Referencias: @araujoIgualdadLazoSocial2013, @araujoCalleDesigualdadesInteraccionales2016

## 🔍 Estructura del JSON

El archivo es un **array** de páginas en formato nativo de Roam:

```json
[
  {
    "edit-time": 1755433568011,
    "title": "[[QUE]] - ¿Bajo qué marcos...",
    ":node/title": "[[QUE]] - ¿Bajo qué marcos...",
    "uid": "tGVBtgvfN",
    ":block/uid": "tGVBtgvfN",
    "create-time": 1755433568009,
    ":create/time": 1755433568009,
    "children": [
      {
        "string": "Proyecto Asociado:: [[artículo/sociabilidad en Simmel]]",
        "uid": "Zamq4GaWP",
        "refs": [
          {"uid": "m57GtKmKU"},
          {"uid": "GlR_bUruc"}
        ]
      },
      // ... más bloques hijos
    ]
  },
  // ... más páginas
]
```

## 🎯 Características Técnicas Notables

### 1. Campos Duplicados (Keyword + String)
Cada campo aparece en dos formatos:
- **Keyword**: `:node/title`, `:block/uid`, `:create/time`
- **String**: `"title"`, `"uid"`, `"create-time"`

Esto maximiza la compatibilidad con herramientas de importación de Roam.

### 2. Referencias
Las referencias a otras páginas aparecen como:
```json
"refs": [
  {"uid": "m57GtKmKU"},  // Solo UID
  {"uid": "GlR_bUruc"}   // No trae contenido completo de la página referenciada
]
```

Esto evita explosión de tamaño del archivo.

### 3. Estructura Jerárquica
Los bloques hijos están anidados recursivamente:
- Hasta **10 niveles de profundidad** (límite del plugin v2.1.1)
- Bloques truncados muestran: `"_truncated": true`

### 4. Metadata de Usuario
Cada bloque incluye información del creador/editor:
```json
":create/user": {
  ":user/uid": "OWvhPDheCLO2uHfdJAuk6s2A1Bj1"
}
```

## 💡 Uso de este Ejemplo

### Como Referencia del Formato Nativo
Este archivo es **crítico** para el desarrollo del plugin porque:
- ✅ Muestra el **formato REAL** que usa Roam internamente
- ✅ Sirve para **comparar** el output del plugin vs el nativo
- ✅ Ayuda a **validar** que el plugin replica correctamente la estructura
- ✅ Documenta **diferencias** entre export nativo y export del plugin

### Para Testing
Este archivo es útil para probar:
- ✅ Parsing de estructura jerárquica compleja
- ✅ Manejo de referencias entre páginas
- ✅ Importación de formato nativo de Roam
- ✅ Comparación de formatos (nativo vs plugin)

### Para Desarrollo
Sirve como referencia de:
- ✅ Estructura real de páginas de análisis de discurso
- ✅ Uso de tags especiales (`#RespondedBy`, `#SupportedBy`)
- ✅ Organización de evidencias, preguntas y claims
- ✅ Formato de referencias bibliográficas en Roam
- ✅ **GOLD STANDARD**: Cómo debe verse un export correcto

### Para Documentación
Ilustra:
- ✅ Caso de uso real del sistema de análisis de discurso
- ✅ Complejidad típica de un proyecto de investigación
- ✅ Tamaño esperado de exports nativos (5 páginas = 216 KB)

## ⚠️ Notas Importantes

### Tamaño del Archivo
- 216 KB para 5 páginas es **razonable**
- El tamaño escala según:
  - Número de bloques por página
  - Profundidad de anidación
  - Cantidad de referencias

### ⚠️ Diferencia con Exports del Plugin
Este es un **export NATIVO de Roam**, lo que significa:
- ✅ Fue generado por la función oficial de exportación de Roam Research
- ⚠️ **NO** fue generado por el plugin Discourse Selector
- 🎯 Sirve como **referencia** de cómo debe verse el formato correcto
- 📊 El plugin **intenta replicar** este formato usando `roamAlphaAPI.pull()`

### Comparación con Exports del Plugin
**Formato Nativo (este archivo)**:
- Generado por Roam directamente
- Garantía de estructura correcta
- Puede incluir campos que el plugin no replica

**Formato del Plugin v2.1.1**:
- Intenta replicar el formato nativo
- Usa `window.roamAlphaAPI.pull()` con pattern manual
- Limita profundidad a 10 niveles para evitar archivos gigantes
- Referencias solo incluyen UID (no contenido completo)

### Proyecto Asociado
Todas las páginas tienen el bloque:
```
Proyecto Asociado:: [[artículo/sociabilidad en Simmel]]
```

Aunque este es un export nativo de Roam, las páginas fueron seleccionadas porque pertenecen a este proyecto (criterio que usaría el plugin para filtrarlas).

## 🔗 Archivos Relacionados

- **README general de examples**: [README.md](./README.md) - **⚠️ LEER PRIMERO**
- **Otro ejemplo más extenso**: [criticasDefensaTesis.json](./criticasDefensaTesis.json) - 40 páginas (379KB)
- **Plugin principal**: [roam-js-version.js](../roam-js-version.js)
- **Documentación del formato**: [docs/export-format-native.md](../docs/export-format-native.md) _(pendiente)_
- **Pull patterns**: [examples/pull-patterns/](./pull-patterns/)

---

**Tipo de export**: Nativo de Roam Research (NO del plugin)
**Fecha de análisis**: 2025-11-17
**Proyecto**: artículo/sociabilidad en Simmel
**Investigador**: Camilo Luvino
**Propósito**: Servir como referencia del formato nativo que el plugin intenta replicar

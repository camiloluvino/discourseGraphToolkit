# Discourse Graph Syntax — Referencia para IA

> ⚠️ **DIRECTIVA**: Consulta este documento antes de modificar lógica de relaciones, exportación o templates.

---

## Tipos de Nodos

El sistema usa tres tipos de nodos con prefijos obligatorios:

| Tipo | Título en Roam | Propósito |
|------|----------------|-----------|
| **QUE** | `[[QUE]] - ¿Pregunta de investigación?` | Pregunta que organiza la indagación |
| **CLM** | `[[CLM]] - Afirmación argumentativa` | Claim que responde a una pregunta |
| **EVD** | `[[EVD]] - Evidencia o cita textual` | Soporte empírico/bibliográfico |

---

## Estructura de Página por Tipo

### Pregunta (QUE)

```
[[QUE]] - ¿Cuál es la pregunta?
    - Proyecto Asociado:: [[nombre-proyecto]]
    - #RespondedBy
        - [[CLM]] - Afirmación que responde
        - [[EVD]] - Evidencia directa (opcional)
```

### Afirmación (CLM)

```
[[CLM]] - La afirmación central
    - Proyecto Asociado:: [[nombre-proyecto]]
    - #SupportedBy
        - [[EVD]] - Evidencia que soporta
        - [[CLM]] - Otra afirmación de soporte (Recursivo: puede contener más CLMs/EVDs)
    - #RelatedTo (opcional)
        - [[CLM]] - Afirmación relacionada
```

### Evidencia (EVD)

```
[[EVD]] - Resumen de la evidencia
    - Proyecto Asociado:: [[nombre-proyecto]]
    - (contenido narrativo, citas, etc.)
```

---

## Tags Estructurales (Críticos)

Estos tags definen las relaciones que el plugin mapea automáticamente:

| Tag | Usado en | Detecta |
|-----|----------|---------|
| `#RespondedBy` | QUE | CLMs y EVDs que responden la pregunta |
| `#SupportedBy` | CLM | EVDs y CLMs que soportan la afirmación |
| `#RelatedTo` | CLM | CLMs/EVDs relacionados lateralmente |

### Reglas de Detección

El mapper busca estos tags en los hijos directos de cada nodo:

1. **Bloque con tag**: Si el bloque contiene `#SupportedBy` + una referencia, ambos se procesan
2. **Contenedor**: Si el bloque es solo `#SupportedBy`, sus hijos son las referencias

```
✅ Ambos formatos son válidos:

Formato A (inline):
- [[CLM]] - Título #SupportedBy

Formato B (contenedor):
- #SupportedBy
    - [[EVD]] - Evidencia 1
    - [[EVD]] - Evidencia 2
```

---

## Atributo Obligatorio

### `Proyecto Asociado::`

Cada nodo debe tener este atributo en su primer nivel:

```
Proyecto Asociado:: [[artículo/sociabilidad en Simmel]]
```

**Uso**:
- Permite filtrar nodos por proyecto en la exportación
- La pestaña "Ramas" verifica que todos los nodos de una rama tengan proyectos coherentes

### Namespaces Jerárquicos

Los proyectos pueden usar `/` para crear jerarquías:

```
Proyecto Asociado:: [[tesis/marco/metodología]]
```

| Proyecto Raíz | Proyecto Nodo | Resultado |
|---------------|---------------|-----------|
| `tesis` | `tesis` | ✅ Coherente |
| `tesis` | `tesis/marco` | 🔀 Especializado |
| `tesis/marco` | `tesis` | ⚠️ Generalización (error) |

**Regla jerárquica:** Un nodo debe tener un proyecto **igual o más específico** que su **padre directo** en la rama, no solo que el QUE raíz.

Ejemplo:
```
QUE: tesis/metodología
  └── CLM-A: tesis/metodología/muestra     ← 🔀 OK (especializa)
      └── CLM-B: tesis/metodología         ← ⚠️ ERROR (generaliza al padre CLM-A)
```

---

## Relaciones Mapeadas

El `RelationshipMapper` genera estas propiedades en cada nodo:

### Para QUE

| Propiedad | Contiene |
|-----------|----------|
| `related_clms` | UIDs de CLMs bajo `#RespondedBy` |
| `direct_evds` | UIDs de EVDs bajo `#RespondedBy` |

### Para CLM

| Propiedad | Contiene |
|-----------|----------|
| `related_evds` | UIDs de EVDs bajo `#SupportedBy` |
| `supporting_clms` | UIDs de CLMs bajo `#SupportedBy` |
| `connected_clms` | UIDs de CLMs bajo `#RelatedTo` |

---

## Formato de Exportación

### Título Limpio

El exportador genera un `clean_title` removiendo el prefijo:

```
Original:  [[CLM]] - La afirmación central
Limpio:    La afirmación central
```

### JSON Exportado

```json
{
  "uid": "Ab1Cd2Ef3",
  "type": "CLM",
  "title": "[[CLM]] - La afirmación central",
  "clean_title": "La afirmación central",
  "project": "artículo/sociabilidad en Simmel",
  "related_evds": ["Xy9Zw8Vq1"],
  "supporting_clms": [],
  "connected_clms": [],
  "data": { /* estructura completa de Roam */ }
}
```

---

## Sintaxis de Roam Relevante

### Referencias

| Uso | Sintaxis | Descripción |
|-----|----------|-------------|
| Página | `[[Título]]` | Referencia/crea página |
| Bloque | `((uid))` | Referencia inline a bloque |
| Embed | `{{[[embed]]: ((uid))}}` | Embed completo con hijos |

### Atributos vs Formato

| ✅ Usar Atributo | ❌ No usar Atributo |
|-----------------|-------------------|
| `Proyecto Asociado:: [[X]]` | `**Paso 1:** Hacer algo` |
| `Author:: [[Nombre]]` | `Nota: Observación` |
| `Source:: URL` | `Resumen: El texto` |

**Regla**: Usa `::` solo para metadatos **consultables a nivel de grafo**.

---

## Anti-Patrones Comunes

| ❌ Error | ✅ Correcto |
|----------|------------|
| `#supportedby` (minúsculas) | `#SupportedBy` (CamelCase) |
| `Proyecto:: [[X]]` | `Proyecto Asociado:: [[X]]` |
| EVD sin proyecto | Siempre incluir `Proyecto Asociado::` |
| Nodo sin prefijo | Títulos siempre con `[[QUE]]`, `[[CLM]]`, `[[EVD]]` |

---

*Documento específico para Discourse Graph Toolkit — No aplica a MCP ni API de escritura.*

# Discourse Graph Syntax — Referencia para IA

> ⚠️ **DIRECTIVA**: Consulta este documento antes de modificar lógica de relaciones, exportación o templates.

---

## Tipos de Nodos

El sistema usa cuatro tipos de nodos con prefijos obligatorios:

| Tipo | Título en Roam | Propósito |
|------|----------------|-----------|
| **GRI** | `[[GRI]] - Grupo de investigación` | Contenedor organizativo (opcional) |
| **QUE** | `[[QUE]] - ¿Pregunta de investigación?` | Pregunta que organiza la indagación |
| **CLM** | `[[CLM]] - Afirmación argumentativa` | Claim que responde a una pregunta |
| **EVD** | `[[EVD]] - Evidencia o cita textual` | Soporte empírico/bibliográfico |

---

## Estructura de Página por Tipo

### Grupo de Investigación (GRI) — Opcional

Los nodos de tipo **GRI** actúan como **comodines o contenedores universales**. Tienen flexibilidad total para organizarse y estructurarse: pueden ser padres o hijos usando cualquiera de los tags estructurales (`#Contains`, `#RespondedBy`, `#SupportedBy`, `#RelatedTo`), y contener cualquier combinación de QUEs, CLMs, EVDs o sub-GRIs.

```
[[GRI]] - Título del grupo organizador
    - Proyecto Asociado:: [[nombre-proyecto]]
    - #Contains
        - [[QUE]] - Pregunta contenida
        - [[CLM]] - Afirmación contenida
        - [[GRI]] - Sub-grupo (recursivo)
    - #RespondedBy (comodín)
        - [[CLM]] - Respuesta al grupo
    - #SupportedBy (comodín)
        - [[CLM]] - Soportes del grupo
```

> ⚠️ GRI es **opcional**. Los grafos sin GRI funcionan exactamente igual.

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
| `#Contains` | GRI | QUEs, CLMs, GRIs y EVDs en el grupo |
| `#RespondedBy` | QUE, GRI (comodín) | CLMs, EVDs y GRIs de respuesta |
| `#SupportedBy` | CLM, GRI (comodín) | EVDs, CLMs y GRIs de soporte |
| `#RelatedTo` | CLM, GRI (comodín) | CLMs, EVDs y GRIs relacionados lateralmente |

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

**Regla jerárquica:** Un nodo debe tener un proyecto **igual o más específico** que su **padre directo** en la rama. 

- Si el proyecto es **completamente diferente**, se considera una **incoherencia** (puesto que los nodos vinculados jerárquicamente vía `#SupportedBy`, `#RespondedBy` o `#Contains` se asumen como parte del mismo flujo argumentativo).
- Para incluir nodos de otros proyectos sin generar errores, se deben colocar bajo el marcador **`#RelatedTo`**, el cual se ignora durante la verificación de ramas por ser una relación lateral/no-jerárquica.

Ejemplo:
```
QUE: tesis/metodología
  └── CLM-A: tesis/metodología/muestra     ← 🔀 OK (especializa)
  └── CLM-B: tesis/teoría/dialéctica       ← ⚠️ ERROR (incoherencia: proyecto distinto)
  └── CLM-C: tesis/metodología             ← ⚠️ ERROR (generaliza al padre CLM-A)
```

---

## Páginas Contenedoras (`/grafoDeDiscurso`)

El sistema identifica páginas que agrupan nodos de discurso (QUE y GRI) mediante el sufijo `/grafoDeDiscurso`. Estas páginas actúan como "contenedores maestros" para organizar la investigación por temas o capítulos.

### Estructura del Contenedor

```
título del tema/grafoDeDiscurso
    - Proyecto Asociado:: [[nombre-proyecto]]
    - [[QUE]] - Primera pregunta del tema
    - [[GRI]] - Grupo organizador
        - #Contains
            - [[QUE]] - Pregunta anidada (también detectada)
            - [[GRI]] - Sub-grupo (también detectado)
```

### Regla de Coherencia de Contenedor

Para garantizar la integridad del grafo, todos los nodos referenciados en una página contenedora (a cualquier nivel) deben ser coherentes con el proyecto definido en dicha página:

1. **Jerarquía obligatoria:** El proyecto de cada `[[QUE]]` o `[[GRI]]` debe ser igual o un sub-namespace del proyecto definido en la página `/grafoDeDiscurso`.
2. **Navegación:** La pestaña de Ramas agrupa automáticamente los nodos bajo sus contenedores y señala mediante un icono de **templo (🏛️)** si existen desalineamientos de proyecto entre el contenedor y sus preguntas o grupos.


---

## Relaciones Mapeadas

El `RelationshipMapper` genera estas propiedades en cada nodo:

### Para QUE

| Propiedad | Contiene |
|-----------|----------|
| `related_clms` | UIDs de CLMs bajo `#RespondedBy` |
| `direct_evds` | UIDs de EVDs bajo `#RespondedBy` |
| `related_gris` | UIDs de GRIs bajo `#RespondedBy` (Novedad) |

### Para CLM

| Propiedad | Contiene |
|-----------|----------|
| `related_evds` | UIDs de EVDs bajo `#SupportedBy` |
| `supporting_clms` | UIDs de CLMs bajo `#SupportedBy` |
| `supporting_gris` | UIDs de GRIs bajo `#SupportedBy` (Novedad) |
| `connected_clms` | UIDs de CLMs bajo `#RelatedTo` |
| `connected_gris` | UIDs de GRIs bajo `#RelatedTo` (Novedad) |

### Para GRI

| Propiedad | Contiene |
|-----------|----------|
| `contained_nodes` | UIDs de QUEs, CLMs, GRIs o EVDs bajo `#Contains` |
| `related_clms` | UIDs de CLMs bajo `#RespondedBy` (Como comodín) |
| `direct_evds` | UIDs de EVDs bajo `#RespondedBy` (Como comodín) |
| `related_gris` | UIDs de GRIs bajo `#RespondedBy` (Como comodín) |
| `supporting_clms` | UIDs de CLMs bajo `#SupportedBy` (Como comodín) |
| `related_evds` | UIDs de EVDs bajo `#SupportedBy` (Como comodín) |
| `supporting_gris` | UIDs de GRIs bajo `#SupportedBy` (Como comodín) |
| `connected_clms` | UIDs de CLMs bajo `#RelatedTo` (Como comodín) |
| `connected_gris` | UIDs de GRIs bajo `#RelatedTo` (Como comodín) |

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

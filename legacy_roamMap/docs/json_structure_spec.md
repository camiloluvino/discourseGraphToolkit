# Especificación de Estructura JSON: Discourse Graph

Este documento define el "contrato de datos" entre **DiscourseGraphToolkit** (Exportador) y **RoamMap** (Consumidor). Cualquier cambio en estos campos puede romper la integración.

## 1. Estructura Base (Oficial de Roam Research)

Antes de la capa del Toolkit, el archivo debe cumplir con el formato nativo de exportación de Roam Research. Esta estructura está documentada en `roamMap/docs/01_INTRO_ROAM_RESEARCH.md`.

### Esquema Nativo (JSON Schema)

Para máxima precisión, aquí está la definición formal del formato base que valida `fixRoam` (ver `src/fixroam/processor.py` clase `DataValidator`):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "description": "Exportación raíz de Roam Research (Lista de Páginas)",
  "items": {
    "type": "object",
    "required": ["uid", "title"],
    "properties": {
      "uid": {
        "type": "string",
        "pattern": "^[a-zA-Z0-9\\-_]{9}$",
        "description": "Identificador único de 9 caracteres"
      },
      "title": {
        "type": "string",
        "description": "Título de la página"
      },
      "children": {
        "type": "array",
        "items": { "$ref": "#/definitions/block" }
      },
      "edit-time": { "type": "integer" },
      "create-time": { "type": "integer" }
    }
  },
  "definitions": {
    "block": {
      "type": "object",
      "required": ["uid"],
      "properties": {
        "uid": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9\\-_]{9}$"
        },
        "string": {
          "type": "string",
          "description": "Contenido de texto del bloque"
        },
        "children": {
          "type": "array",
          "items": { "$ref": "#/definitions/block" },
          "description": "Bloques anidados (Recursivo)"
        },
        "refs": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["uid"],
            "properties": {
              "uid": { "type": "string" }
            }
          },
          "description": "Referencias explícitas a otros bloques"
        }
      }
    }
  }
}
```

> **Validación en Código:** La clase `DataValidator` en `fixRoam` impone estrictamente que `uid` y `title` existan en las páginas, y que `uid` exista en todos los bloques hijos.

### Campos Adicionales (Discourse Graph Toolkit)
El plugin exporta un *superset* del esquema nativo, incluyendo metadatos extra que `RoamMap` ignora pero que son útiles para depuración:
- `order`: Posición del bloque.
- `:block/refs`: Copia de `refs` con claves estilo Datomic.
- `:create/user`, `:edit/user`: UIDs de usuarios.

## 2. Estructura Semántica (Capa Discourse Graph)

El Toolkit añade una capa de significado sobre la estructura base mediante convenciones de texto.

### Estructura General del Grafo

```json
[
  {
    "uid": "UID_DE_PAGINA",
    "title": "[[QUE]] Título de la Pregunta",
    "children": [ ... ],
    "edit-time": 123456789,
    "create-time": 123456789
  },
  ...
]
```

## 3. Definición de Nodos (Páginas)

### Campos Críticos
| Campo | Origen (Toolkit) | Uso en RoamMap | Importancia |
|-------|------------------|----------------|-------------|
| `uid` | `:block/uid` | Identificador único para deduplicación y relaciones. | **CRÍTICO** |
| `title` | `:node/title` | Determina el tipo de nodo (`QUE`, `CLM`, `EVD`) mediante prefijos. | **CRÍTICO** |
| `children` | `:block/children` | Contiene el contenido, metadatos y relaciones del nodo. | **CRÍTICO** |

### Prefijos de Título (Case-Sensitive)
RoamMap detecta el tipo de nodo basándose estrictamente en el inicio del string `title`:
- `[[QUE]]` -> Pregunta
- `[[CLM]]` -> Afirmación
- `[[EVD]]` -> Evidencia

## 4. Estructura de Bloques (Children)

Los `children` son bloques anidados recursivamente.

```json
{
  "string": "Contenido del bloque",
  "uid": "UID_DEL_BLOQUE",
  "children": [ ... ],
  "refs": [ { "uid": "UID_REFERENCIADO" } ]
}
```

### Metadatos de Proyecto
Se buscan en el primer nivel de `children` o en el `string` del nodo.
- **Formato:** `Proyecto Asociado:: [[Nombre del Proyecto]]`
- **Uso:** RoamMap filtra y agrupa nodos por este campo.

## 5. Definición de Relaciones

Las relaciones se definen mediante **Bloques Marcadores** dentro de los `children`.

### A. Pregunta -> Afirmación (`QUE` -> `CLM`)
- **Marcador:** Un bloque hijo con el texto exacto `#RespondedBy`.
- **Contenido:** Los hijos de este marcador deben ser referencias a nodos `CLM`.
- **Mecanismo de Enlace:**
    1. **Referencia Fuerte:** Objeto `refs` con `uid`.
    2. **Referencia de Texto:** String conteniendo `[[[[CLM]] Título...]]`.

```json
{
  "string": "#RespondedBy",
  "children": [
    {
      "string": "[[[[CLM]] La afirmación que responde]]",
      "refs": [ { "uid": "UID_DE_CLM" } ]
    }
  ]
}
```

### B. Afirmación -> Evidencia (`CLM` -> `EVD`)
- **Marcador:** Un bloque hijo con el texto exacto `#SupportedBy`.
- **Contenido:** Referencias a nodos `EVD` (o `CLM` anidados).

```json
{
  "string": "#SupportedBy",
  "children": [
    {
      "string": "[[[[EVD]] La evidencia que soporta]]",
      "refs": [ { "uid": "UID_DE_EVD" } ]
    }
  ]
}
```

### C. Relaciones Laterales (`CLM` <-> `CLM`)
- **Marcador:** `#RelatedTo`.
- **Uso:** Conecta afirmaciones relacionadas o evidencias adicionales.

## 6. Manejo de Referencias Circulares

El Toolkit trunca la recursividad para evitar JSONs infinitos:
- **Límite de Profundidad:** 10 niveles (`MAX_DEPTH`).
- **Marcador de Corte:** Si un nodo ya fue visitado en la rama actual, se exporta solo su `uid` con `_circular_ref: true`.

```json
{
  "uid": "UID_REPETIDO",
  "_circular_ref": true
}
```

## 7. Puntos de Fragilidad (¡Cuidado!)

1.  **Cambio de Prefijos:** Si cambias `[[QUE]]` por `[QUE]`, RoamMap dejará de reconocer los nodos.
2.  **Marcadores de Relación:** `#RespondedBy` es *case-sensitive*. `#respondedby` no funcionará.
3.  **Estructura de Refs:** RoamMap espera que `refs` sea un array de objetos con `uid`. Si el formato de exportación de Roam cambia (ej. a solo array de strings), RoamMap fallará.

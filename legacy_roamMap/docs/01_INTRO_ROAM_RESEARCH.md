# Introducción a Roam Research y RoamMap

## ¿Qué es Roam Research?

[Roam Research](https://roamresearch.com/) es una herramienta de **toma de notas bidireccional** diseñada para el pensamiento en red. A diferencia de editores lineales (como Word), Roam permite crear conexiones entre ideas de manera fluida mediante:

- **Enlaces bidireccionales** - `[[Concepto]]` crea un enlace automático
- **Estructura de bloques** - Cada párrafo es un bloque que puede ser referenciado
- **Jerarquías anidadas** - Permite estructuras de árbol ilimitadas
- **Referencias de página** - Cada `[[página]]` es una entidad conectada

### ¿Por qué usar Roam para tesis académicas?

Roam es ideal para investigación porque:

1. **Mapea el pensamiento no-lineal** - Las ideas raramente son lineales
2. **Conecta evidencias con afirmaciones** - Relaciones explícitas entre conceptos
3. **Evoluciona con tu investigación** - Puedes reorganizar sin perder conexiones
4. **Exporta estructura** - El JSON exportado contiene toda la red de relaciones

---

## Estructura de Investigación en Roam

RoamMap trabaja con una metodología específica de 3 niveles:

### 🎯 QUE - Preguntas de Investigación

**Formato:** `[[QUE]] ¿Pregunta de investigación?`

Las preguntas guían tu investigación. Ejemplo:
- `[[QUE]] ¿Cómo afecta la IA al empleo?`
- `[[QUE]] ¿Qué dice la literatura sobre el cambio climático?`

### 💡 CLM - Claims/Afirmaciones

**Formato:** `[[CLM]] Afirmación o tesis`

Las afirmaciones responden a las preguntas. Ejemplo:
- `[[CLM]] La IA automatiza trabajos repetitivos`
- `[[CLM]] El cambio climático acelera desde 1980`

### 📚 EVD - Evidencias

**Formato:** `[[EVD]] Descripción de la evidencia`

Las evidencias soportan las afirmaciones. Ejemplo:
- `[[EVD]] Estudio McKinsey 2023 sobre automatización`
- `[[EVD]] Datos NASA sobre temperatura global`

---

## Relaciones Entre Nodos

RoamMap reconoce 4 tipos de relaciones:

### 1. `#RespondedBy` - QUE → CLM
**Uso:** Enlaza preguntas con afirmaciones que las responden

```
[[QUE]] ¿Cómo afecta la IA al empleo?
  #RespondedBy
    #[[CLM]] La IA automatiza trabajos repetitivos
    #[[CLM]] La IA crea nuevos tipos de empleo
```

### 2. `#SupportedBy` - CLM → EVD
**Uso:** Enlaza afirmaciones con evidencias que las respaldan

```
[[CLM]] La IA automatiza trabajos repetitivos
  #SupportedBy
    #[[EVD]] Estudio McKinsey 2023
    #[[EVD]] Reporte del World Economic Forum
```

### 3. `#RelatedTo` - CLM ↔ CLM
**Uso:** Enlaza afirmaciones relacionadas entre sí

```
[[CLM]] La IA automatiza trabajos
  #RelatedTo
    #[[CLM]] La automatización genera desempleo estructural
```

### 4. `#Source` - Referencia bibliográfica
**Uso:** Marca la fuente de una evidencia

```
[[EVD]] Estudio McKinsey 2023
  Contenido de la evidencia...
    #Source McKinsey Global Institute (2023). "The Future of Work"
```

---

## Cómo Exportar desde Roam Research

### Paso 1: Abrir el menú de exportación

1. Abre tu base de Roam Research
2. Click en el **menú hamburguesa** (☰) arriba a la derecha
3. Selecciona **"Export All"**

### Paso 2: Elegir formato JSON

1. En el diálogo de exportación, selecciona **"JSON"**
2. Click en **"Export All"**
3. Se descargará un archivo `.zip`

### Paso 3: Descomprimir

1. Descomprime el `.zip`
2. Encontrarás múltiples archivos `.json` (uno por página de Roam)
3. Copia estos `.json` a la carpeta `input/` de RoamMap

### Estructura del JSON Exportado

El JSON de Roam tiene esta estructura:

```json
[
  {
    "uid": "identificador-unico",
    "title": "[[QUE]] ¿Mi pregunta?",
    "children": [
      {
        "uid": "otro-id",
        "string": "#RespondedBy",
        "children": [
          {
            "uid": "ref-id",
            "string": "#[[CLM]] Mi afirmación"
          }
        ]
      }
    ]
  }
]
```

**Campos clave:**
- `uid` - Identificador único del bloque
- `title` - Título de la página (solo en nodos raíz)
- `string` - Contenido de un bloque
- `children` - Bloques anidados bajo este bloque

---

## Flujo de Trabajo Recomendado

### 1. Investigar en Roam
- Crea páginas para cada QUE, CLM, EVD
- Usa `#RespondedBy` y `#SupportedBy` para conectar
- Añade contenido descriptivo bajo cada nodo

### 2. Exportar
- Exporta toda tu base como JSON
- Organiza los JSONs en una carpeta

### 3. Procesar con RoamMap
- Copia la carpeta a `input/nombre_proyecto/`
- Ejecuta RoamMap (GUI o CLI)
- Obtén HTML y Markdown estructurados

### 4. Revisar y Refinar
- Abre el HTML generado
- Verifica que las relaciones sean correctas
- Si falta algo, ajusta en Roam y re-exporta

---

## Ejemplo Visual

### En Roam Research:
```
📄 [[QUE]] ¿Cómo afecta la IA al empleo?
  └─ #RespondedBy
      └─ #[[CLM]] La IA automatiza trabajos repetitivos

📄 [[CLM]] La IA automatiza trabajos repetitivos
  ├─ Descripción: La inteligencia artificial está...
  └─ #SupportedBy
      └─ #[[EVD]] Estudio McKinsey 2023

📄 [[EVD]] Estudio McKinsey 2023
  ├─ McKinsey proyecta que 30% de trabajos...
  └─ #Source McKinsey Global Institute (2023)
```

### Después de RoamMap:
```
📄 proyecto.html (interactivo, colapsable)
📄 proyecto.md (texto plano, portable)
```

---

## Consejos y Mejores Prácticas

### ✅ Buenas Prácticas

1. **Usa etiquetas consistentes** - Siempre `[[QUE]]`, nunca `[QUE]` o `QUE:`
2. **Un concepto por página** - Cada CLM/EVD debe ser su propia página
3. **Relaciones explícitas** - Usa `#RespondedBy` y `#SupportedBy` consistentemente
4. **Fuentes completas** - Cada EVD debe tener su `#Source`

### ❌ Errores Comunes

1. **Olvidar los corchetes dobles** - `QUE` no funciona, debe ser `[[QUE]]`
2. **Usar hashtags incorrectos** - `#respondedBy` no funciona (case-sensitive)
3. **Referencias sin hashtag** - `[[CLM]] Mi claim` no funciona, debe ser `#[[CLM]] Mi claim`
4. **Mezclar nodos** - No pongas CLM dentro de QUE sin `#RespondedBy`

---

## Recursos Adicionales

- **Roam Research:** https://roamresearch.com/
- **Guía oficial de Roam:** https://roamresearch.com/#/app/help
- **Ejemplo funcional:** Ver `ejemplos/tesis_ejemplo/` en este repositorio

---

## Próximos Pasos

Ahora que entiendes Roam y su estructura:

1. 📖 Lee [Guía Rápida](02_GUIA_RAPIDA.md) para procesar tu primer archivo
2. 🏗️ Lee [Arquitectura](03_ARQUITECTURA.md) para entender cómo funciona RoamMap
3. 🛠️ Lee [Desarrollo](04_DESARROLLO.md) si necesitas modificar el código

---

**¿Tienes preguntas?** Revisa el README principal o los ejemplos en `ejemplos/`.

# Arquitectura de RoamMap

Esta guía explica cómo funciona RoamMap internamente y dónde modificar el código para diferentes necesidades.

---

## 📊 Diagrama de Flujo General

```
┌─────────────────┐
│  Archivos JSON  │
│   (Roam Export) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   utils.py      │ ← Validación, detección de tipos
│  get_json_files │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ structure_extractor  │
│  load_nodes_from_    │ ← Carga JSON, detecta QUE/CLM/EVD
│  files()             │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ structure_extractor  │
│  map_relationships() │ ← Mapea #RespondedBy, #SupportedBy
└─────────┬────────────┘
          │
          ├──────────────────┐
          ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ content_         │  │ html_generator   │
│ processor        │  │ generate_        │
│ extract_*()      │  │ minimal_html()   │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  proyecto.md     │  │  proyecto.html   │
│  (Markdown)      │  │  (Interactivo)   │
└──────────────────┘  └──────────────────┘
```

---

## 🏗️ Módulos Principales

### 1. `main.py` (217 líneas)
**Propósito:** Punto de entrada y orquestador principal

**Funciones clave:**
- `setup_directories()` - Configura input/output directories
- `extract_structure()` - Orquesta el procesamiento completo
- `process_folder()` - Procesa una carpeta específica

**Flujo:**
```python
# 1. Setup
base_input_dir, base_output_dir = setup_directories()

# 2. Obtener archivos
json_files = get_json_files(directory)

# 3. Cargar y procesar
all_nodes, questions = load_nodes_from_files(json_files)
map_relationships(all_nodes)

# 4. Generar salida
markdown = generate_document_structure(questions, all_nodes)
html = generate_minimal_html(questions, all_nodes)

# 5. Guardar
save(markdown, html)
```

**Cuándo modificar:**
- Cambiar lógica de directorios (línea 30-85)
- Añadir nuevos formatos de salida (después línea 190)
- Modificar orden de procesamiento (función `process_folder`)

---

### 2. `utils.py` (291 líneas)
**Propósito:** Funciones auxiliares y validaciones

**Funciones clave:**
```python
validate_file_size(file_path: str) -> bool
  # Valida que archivos no excedan 50MB

clean_text(text: str) -> str
  # Limpia [[brackets]], **asterisks**

get_node_type(title: str) -> str
  # Detecta si es QUE, CLM, EVD o UNKNOWN

get_json_files(directory: str) -> List[str]
  # Encuentra todos los .json en una carpeta
```

**Cuándo modificar:**
- Añadir nuevos tipos de nodos (función `get_node_type`)
- Cambiar límites de archivo (constantes en `config.py`)
- Añadir nueva limpieza de texto (función `clean_text`)

---

### 3. `structure_extractor.py` (785 líneas)
**Propósito:** Extracción y mapeo de estructura de Roam

**Funciones clave:**

#### `load_nodes_from_files(file_paths, extract_additional_content)`
**¿Qué hace?**
1. Lee cada archivo JSON
2. Detecta tipo de cada nodo (QUE/CLM/EVD)
3. Crea un diccionario `all_nodes` con todos los nodos
4. Separa las preguntas (QUEs) en una lista

**Salida:**
```python
all_nodes = {
  "uid-001": {
    "uid": "uid-001",
    "type": "QUE",
    "title": "¿Mi pregunta?",
    "related_clms": [],  # Se llena después
    # ... más campos
  },
  # ... más nodos
}

questions = [
  {"uid": "uid-001", "type": "QUE", ...},
  # ... más preguntas
]
```

#### `map_relationships(all_nodes)`
**¿Qué hace?**
1. Recorre todos los nodos
2. Busca marcadores: `#RespondedBy`, `#SupportedBy`, `#RelatedTo`
3. Resuelve referencias entre nodos
4. Llena los campos `related_clms`, `related_evds`, etc.

**Ejemplo:**
```python
# Antes:
clm_node["related_evds"] = []

# Después de map_relationships:
clm_node["related_evds"] = [
  "uid-evd-001",
  "uid-evd-002"
]
```

#### `generate_document_structure(questions, all_nodes, extract_additional_content)`
**¿Qué hace?**
- Genera el documento Markdown final
- Recorre jerárquicamente: QUE → CLM → EVD
- Extrae contenido según el modo configurado

**Cuándo modificar:**
- Añadir nuevos tipos de relaciones (función `map_relationships`)
- Cambiar formato de Markdown (función `generate_document_structure`)
- Modificar detección de nodos (funciones helper)

---

### 4. `content_processor.py` (425 líneas)
**Propósito:** Extracción recursiva de contenido de bloques

**Funciones clave:**

#### `extract_block_content(block, indent_level, skip_metadata, visited_blocks, max_depth)`
**¿Qué hace?**
- Navega recursivamente por bloques anidados
- Extrae el contenido textual
- Previene ciclos infinitos con `visited_blocks`
- Respeta profundidad máxima (50 niveles)

**Protecciones:**
```python
if depth > MAX_RECURSION_DEPTH:
    return ""  # Evita stack overflow

if block_id in visited_blocks:
    return ""  # Evita ciclos infinitos
```

#### `extract_evd_content(node_data, extract_additional_content)`
**¿Qué hace?**
- Extrae contenido de nodos EVD
- Busca la etiqueta `#Source`
- Formatea el contenido con indentación

#### `extract_clm_content(node_data, extract_additional_content)`
**¿Qué hace?**
- Extrae contenido de nodos CLM
- Separa contenido adicional vs contenido bajo relaciones
- Aplica el modo de extracción configurado

**Cuándo modificar:**
- Cambiar límites de recursión (usa `config.MAX_RECURSION_DEPTH`)
- Modificar extracción de contenido adicional (función `extract_clm_content`)
- Añadir nuevos marcadores especiales (como `#Source`)

---

### 5. `html_generator.py` (1,318 líneas) ⚠️
**Propósito:** Generación de HTML interactivo

**Funciones clave:**

#### `generate_minimal_html(questions, all_nodes, title, extract_additional_content)`
**¿Qué hace?**
- Genera documento HTML completo
- Incluye CSS embebido (estilo minimalista)
- Incluye JavaScript embebido (interactividad)
- Renderiza jerarquía QUE → CLM → EVD

**Estructura del HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* CSS minimalista (~200 líneas) */
  </style>
</head>
<body>
  <div class="container">
    <!-- Contenido -->
  </div>
  <script>
    /* JavaScript (~300 líneas) */
    /* Funcionalidad: collapse, copy, export, reorder */
  </script>
</body>
</html>
```

#### `_format_content_for_html(content)`
**¿Qué hace?**
- Escapa contenido HTML (previene XSS)
- Convierte saltos de línea a `<br>`
- Usa `html.escape()` para seguridad

**Cuándo modificar:**
- Cambiar estilos CSS (líneas ~100-300)
- Modificar comportamiento interactivo (JavaScript, líneas ~900-1200)
- Añadir nuevos controles (botones, filtros, etc.)
- Cambiar colores/tipografía (usa constantes de `config.py`)

**⚠️ Nota:** Este es el archivo más grande y complejo. Considera refactorizar si añades muchas features.

---

### 6. `gui.py` (656 líneas)
**Propósito:** Interfaz gráfica con Tkinter

**Funcionalidad:**
- Selección de archivos (explorador de archivos)
- Drag-and-drop (si `tkinterdnd2` está disponible)
- Configuración de opciones (modo de extracción)
- Visualización de logs en tiempo real
- Botones de acción (procesar, abrir resultados)

**Cuándo modificar:**
- Añadir nuevas opciones de configuración (checkboxes, inputs)
- Cambiar diseño de la interfaz (layout, colores)
- Añadir validaciones de input

**Nota:** La GUI usa threading para no bloquear mientras procesa.

---

### 7. `config.py` (291 líneas)
**Propósito:** Configuración centralizada

**Contenido:**
```python
# Directorios
DEFAULT_INPUT_DIR = "input"
DEFAULT_OUTPUT_DIR = "output"
CUSTOM_OUTPUT_DIR = None  # O ruta personalizada

# Límites
MAX_FILE_SIZE_MB = 50
MAX_RECURSION_DEPTH = 50

# Tipos de nodos
class NodeType:
    QUE = "QUE"
    CLM = "CLM"
    EVD = "EVD"

# Relaciones
class RelationshipMarker:
    RESPONDED_BY = "#RespondedBy"
    SUPPORTED_BY = "#SupportedBy"
    # ...

# Mensajes estandarizados
class ErrorMessage:
    FILE_NOT_FOUND = "Archivo no encontrado: {path}"
    # ...

# Configuración HTML
COLOR_PRIMARY = "#1a1a1a"
DEFAULT_FONT = "'SF Pro Display', ..."
```

**Cuándo modificar:**
- Cambiar directorios de entrada/salida
- Ajustar límites de archivo o recursión
- Añadir nuevos tipos de nodos
- Personalizar mensajes de error
- Modificar estilos del HTML

---

### 8. `logger_config.py` (72 líneas)
**Propósito:** Sistema de logging profesional

**Configuración:**
```python
setup_logging(
    log_file='roammap.log',
    log_level=logging.INFO,
    console_output=True
)
```

**Características:**
- Rotación automática de logs (5MB, 3 backups)
- Output simultáneo a consola y archivo
- Formato con timestamps

**Uso:**
```python
from logger_config import get_logger
logger = get_logger(__name__)

logger.info("Mensaje informativo")
logger.warning("Advertencia")
logger.error("Error")
logger.exception("Error con stack trace")
```

---

## 🔄 Flujo de Datos Detallado

### Paso 1: Carga de Archivos
```
JSON files → get_json_files() → validate_file_size()
                                      ↓
                            List[file_paths]
```

### Paso 2: Parseo y Detección
```
file_paths → load_nodes_from_files()
                     ↓
        Para cada archivo JSON:
          1. json.load(file)
          2. Iterar bloques
          3. get_node_type(title)
          4. Crear entrada en all_nodes{}
                     ↓
        (all_nodes{}, questions[])
```

### Paso 3: Mapeo de Relaciones
```
all_nodes → map_relationships()
                     ↓
        Para cada nodo:
          1. Buscar children con "#RespondedBy"
          2. Buscar children con "#SupportedBy"
          3. Resolver referencias (uid → node)
          4. Llenar related_clms[], related_evds[]
                     ↓
        all_nodes{} (con relaciones completas)
```

### Paso 4: Extracción de Contenido
```
node → extract_clm_content() / extract_evd_content()
                     ↓
        1. Navegar children recursivamente
        2. extract_block_content() para cada child
        3. Aplicar modo de extracción
        4. Formatear con indentación
                     ↓
        content_string
```

### Paso 5: Generación de Salida
```
(questions[], all_nodes{}) → generate_document_structure()
                                      ↓
                              Markdown string
                                      ↓
(questions[], all_nodes{}) → generate_minimal_html()
                                      ↓
                              HTML string
```

---

## 🛠️ Dónde Modificar Para...

### Añadir un nuevo tipo de nodo (ej: `[[HYP]]`)

**1. Actualizar `config.py`:**
```python
class NodeType:
    QUE = "QUE"
    CLM = "CLM"
    EVD = "EVD"
    HYP = "HYP"  # ← Nuevo

NODE_MARKERS = {
    NodeType.HYP: "[[HYP]]",  # ← Nuevo
    # ...
}
```

**2. Actualizar `utils.py`:**
```python
def get_node_type(title: Optional[str]) -> str:
    if "[[HYP]]" in title_upper:  # ← Añadir
        return NodeType.HYP
    # ...
```

**3. Actualizar `structure_extractor.py`:**
```python
# Añadir lógica en load_nodes_from_files()
if node_type == NodeType.HYP:
    # Procesamiento específico
```

**4. Actualizar `html_generator.py`:**
```python
# Añadir estilos CSS para .hyp-node
# Añadir lógica de renderizado
```

---

### Cambiar el formato de salida Markdown

**Modificar:** `structure_extractor.py` → función `generate_document_structure()`

**Ejemplo:** Cambiar headers de `##` a `###`
```python
# Línea ~600
content += f"\n## [[QUE]] - {question_title}\n\n"
# Cambiar a:
content += f"\n### [[QUE]] - {question_title}\n\n"
```

---

### Añadir un nuevo tipo de relación (ej: `#ContrastedBy`)

**1. Actualizar `config.py`:**
```python
class RelationshipMarker:
    CONTRASTED_BY = "#ContrastedBy"  # ← Nuevo
```

**2. Actualizar `structure_extractor.py`:**
```python
def map_relationships(all_nodes):
    # Añadir lógica similar a #SupportedBy
    if child_string == RelationshipMarker.CONTRASTED_BY:
        # Mapear contrasts
```

**3. Actualizar `html_generator.py`:**
```python
# Renderizar la nueva relación en el HTML
```

---

### Cambiar estilos del HTML (colores, fuentes)

**Opción 1 (recomendada):** Modificar `config.py`
```python
COLOR_PRIMARY = "#1a1a1a"  # ← Cambiar
PRIMARY_FONT = "'Arial', sans-serif"  # ← Cambiar
```

**Opción 2:** Modificar `html_generator.py` directamente
```python
# Líneas ~100-300 (sección CSS)
```

---

### Cambiar límites de archivo o recursión

**Modificar:** `config.py`
```python
MAX_FILE_SIZE_MB = 100  # Era 50
MAX_RECURSION_DEPTH = 100  # Era 50
```

---

## 🧪 Tests

El proyecto incluye tests unitarios en `tests/`:

```
tests/
├── test_utils.py              # Tests de funciones auxiliares
└── test_content_processor.py  # Tests de extracción de contenido
```

**Ejecutar tests:**
```bash
pytest tests/ -v
```

**Añadir nuevos tests:**
Crea un archivo `test_nuevo_modulo.py` siguiendo la estructura existente.

---

## 📦 Dependencias

RoamMap está diseñado para funcionar **sin dependencias externas** (Python puro).

**Dependencias opcionales:**
- `pytest` - Para ejecutar tests
- `tkinterdnd2` - Para drag-and-drop en GUI (opcional)
- `pyinstaller` - Para generar ejecutable

---

## 🚨 Consideraciones de Seguridad

### 1. Validación de Tamaño de Archivos
**Ubicación:** `utils.py` → `validate_file_size()`
**Protección:** Rechaza archivos > 50MB

### 2. Escape de HTML
**Ubicación:** `html_generator.py` → `_format_content_for_html()`
**Protección:** Usa `html.escape()` para prevenir XSS

### 3. Límite de Recursión
**Ubicación:** `content_processor.py` → `extract_block_content()`
**Protección:** Máximo 50 niveles de profundidad

### 4. Prevención de Ciclos
**Ubicación:** `content_processor.py`
**Protección:** Set `visited_blocks` para evitar loops infinitos

---

## 📈 Métricas del Código

| Módulo | Líneas | Complejidad | Prioridad de Refactor |
|--------|--------|-------------|----------------------|
| `html_generator.py` | 1,318 | Alta | 🔴 Alta |
| `structure_extractor.py` | 785 | Media | 🟡 Media |
| `gui.py` | 656 | Media | 🟡 Media |
| `content_processor.py` | 425 | Media | 🟢 Baja |
| `config.py` | 291 | Baja | 🟢 Baja |
| `utils.py` | 291 | Baja | 🟢 Baja |
| `main.py` | 217 | Baja | 🟢 Baja |
| `logger_config.py` | 72 | Baja | 🟢 Baja |

**Recomendación:** Refactorizar `html_generator.py` dividiendo en múltiples funciones más pequeñas.

---

## 🎓 Próximos Pasos

- 🛠️ Lee [Desarrollo](04_DESARROLLO.md) para guías prácticas de desarrollo
- 📦 Lee [Generar Ejecutable](05_GENERAR_EJECUTABLE.md) para distribución
- 📖 Revisa el código fuente con esta guía a mano

---

**¿Tienes dudas sobre algún módulo?** Revisa el código directamente o consulta los comentarios inline.

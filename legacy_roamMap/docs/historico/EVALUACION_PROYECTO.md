# 📊 Evaluación del Proyecto RoamMap

**Fecha de evaluación:** 2025-11-16
**Versión analizada:** Commit df80bd2

---

## 🎯 Resumen Ejecutivo

RoamMap es un proyecto funcional y bien estructurado que cumple su propósito. Sin embargo, hay **mejoras críticas y recomendaciones** que podrían hacerlo más robusto, mantenible y profesional.

**Calificación general:** 7/10

### Fortalezas ✅
- Funcionalidad completa y operativa
- Sin dependencias externas (Python puro)
- Buena separación en módulos
- Interfaz GUI y CLI
- Documentación README excelente

### Áreas de mejora críticas ⚠️
- Sistema de logging inadecuado
- Falta de validación de entrada
- Código hardcodeado en producción
- Sin pruebas automatizadas
- Manejo de errores genérico

---

## 🔴 PROBLEMAS CRÍTICOS (Alta Prioridad)

### 1. **Carpeta Hardcodeada en Producción**
**Archivo:** `main.py:158`

```python
# ❌ PROBLEMA
extract_structure("cómo se ha estudiado la amistad")
```

**Impacto:** El programa fallará si esta carpeta no existe.

**Solución:**
```python
# ✅ SOLUCIÓN
if len(sys.argv) > 1:
    folder_name = sys.argv[1]
    extract_structure(folder_name)
else:
    # Procesar todas las carpetas disponibles
    extract_structure()
```

---

### 2. **Falta de Validación de Tamaño de Archivos**
**Archivo:** `structure_extractor.py`, `utils.py`

**Problema:** No hay límite de tamaño para archivos JSON. Un archivo de 1GB podría crashear el programa.

**Solución:**
```python
import os

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

def validate_file_size(file_path):
    """Valida que el archivo no exceda el tamaño máximo"""
    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE:
        raise ValueError(f"Archivo {file_path} demasiado grande: {file_size/1024/1024:.2f}MB (máximo {MAX_FILE_SIZE/1024/1024}MB)")
    return True
```

---

### 3. **Sistema de Logging Inadecuado**
**Archivos:** Todos los módulos usan `print()`

**Problema:**
- No hay niveles de log (DEBUG, INFO, WARNING, ERROR)
- No se pueden guardar logs en archivo
- Dificulta debugging en producción

**Solución:**
```python
import logging

# Configurar logging al inicio de main.py
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('roammap.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Usar en lugar de print()
logger.info("Procesando archivo: %s", file_path)
logger.warning("No se encontró '#SupportedBy' en CLM")
logger.error("Error procesando archivo: %s", str(e))
```

---

### 4. **Vulnerabilidad XSS en Generación de HTML**
**Archivo:** `html_generator.py:1256-1267`

**Problema:** El escape de HTML es incompleto y podría permitir inyección de código.

```python
# ❌ PROBLEMA - Escape incompleto
def _format_content_for_html(content):
    formatted = content.replace("<", "&lt;").replace(">", "&gt;")
    formatted = formatted.replace("&lt;br&gt;", "<br>")  # Restaura <br>
```

**Solución:**
```python
import html

def _format_content_for_html(content):
    """Formatea contenido para HTML con escape seguro"""
    # Escapar todo el contenido primero
    safe_content = html.escape(content)
    # Convertir saltos de línea a <br> DESPUÉS del escape
    safe_content = safe_content.replace("\n", "<br>")
    return safe_content
```

---

### 5. **Importación Circular al Final del Archivo**
**Archivo:** `content_processor.py:395`

```python
# ❌ PROBLEMA - Importación al final
from utils import clean_text
```

**Problema:** Indica mal diseño de dependencias.

**Solución:**
```python
# ✅ Mover al inicio del archivo
from utils import clean_text

# O mejor aún, pasar clean_text como parámetro donde se necesite
```

---

## 🟡 MEJORAS IMPORTANTES (Media Prioridad)

### 6. **Falta de Type Hints**
**Impacto en mantenibilidad:** Alto

**Ejemplo actual:**
```python
def extract_structure(input_folder=None, extract_additional_content=False):
    """Función principal..."""
```

**Mejorado:**
```python
from typing import Optional, Dict, List, Tuple

def extract_structure(
    input_folder: Optional[str] = None,
    extract_additional_content: bool = False
) -> Optional[str]:
    """Función principal que extrae la estructura y genera el documento

    Args:
        input_folder: Nombre de la carpeta específica a procesar
        extract_additional_content: Si extraer contenido adicional de CLMs

    Returns:
        HTML generado o None si hubo error
    """
```

---

### 7. **Archivo de Configuración**
**Problema:** Configuraciones dispersas en el código.

**Solución:** Crear `config.py`:
```python
"""Configuración centralizada para RoamMap"""

# Directorios
DEFAULT_INPUT_DIR = "input"
DEFAULT_OUTPUT_DIR = "output"
FALLBACK_DIR = "~/Documents/VisualizadorTesis"

# Límites
MAX_FILE_SIZE_MB = 50
MAX_RECURSION_DEPTH = 50
MAX_JSON_FILES = 100

# Formatos
SUPPORTED_EXTENSIONS = [".json", ".JSO", ".JSO~1"]

# Marcadores de nodos
NODE_TYPES = {
    "QUE": "[[QUE]]",
    "CLM": "[[CLM]]",
    "EVD": "[[EVD]]"
}

# Relaciones
RELATIONSHIP_MARKERS = {
    "RESPONDED_BY": "#RespondedBy",
    "SUPPORTED_BY": "#SupportedBy",
    "RELATED_TO": "#RelatedTo",
    "SOURCE": "#Source"
}

# Logging
LOG_FILE = "roammap.log"
LOG_LEVEL = "INFO"
```

---

### 8. **Validación de Estructura JSON**
**Archivo:** `structure_extractor.py`

**Problema:** No valida la estructura del JSON antes de procesarlo completamente.

**Solución:**
```python
from jsonschema import validate, ValidationError
import json

# Definir schema esperado
ROAM_SCHEMA = {
    "type": ["array", "object"],
    "items": {
        "type": "object",
        "required": ["uid"],
        "properties": {
            "uid": {"type": "string"},
            "title": {"type": "string"},
            "children": {"type": "array"}
        }
    }
}

def validate_json_structure(data):
    """Valida que el JSON cumpla con la estructura esperada de Roam"""
    try:
        validate(instance=data, schema=ROAM_SCHEMA)
        return True
    except ValidationError as e:
        logger.warning(f"JSON no cumple con schema esperado: {e.message}")
        return False
```

---

### 9. **Funciones Muy Largas**
**Problema:** Varias funciones exceden 100 líneas, reduciendo legibilidad.

**Ejemplos:**
- `generate_minimal_html()`: 1,268 líneas ❌
- `generate_document_structure()`: 128 líneas ❌
- `map_relationships()`: Múltiples funciones helper podrían modularizarse

**Solución:** Dividir en funciones más pequeñas y usar composición.

---

### 10. **Manejo de Errores Genérico**
**Problema:** Muchos `except Exception as e` que capturan TODO.

**Ejemplo actual:**
```python
try:
    # código
except Exception as e:
    print(f"Error: {str(e)}")
```

**Mejorado:**
```python
try:
    # código
except FileNotFoundError as e:
    logger.error(f"Archivo no encontrado: {e}")
    raise
except json.JSONDecodeError as e:
    logger.error(f"JSON malformado en {file_path}: {e}")
    continue
except PermissionError as e:
    logger.error(f"Sin permisos para leer {file_path}: {e}")
    continue
except Exception as e:
    logger.exception(f"Error inesperado procesando {file_path}")
    raise
```

---

## 🟢 MEJORAS DESEABLES (Baja Prioridad)

### 11. **Pruebas Automatizadas**
**Impacto:** Alto para mantenimiento a largo plazo

**Solución:** Crear `tests/`:
```
tests/
├── test_utils.py
├── test_structure_extractor.py
├── test_content_processor.py
├── test_html_generator.py
└── fixtures/
    └── sample_roam.json
```

**Ejemplo de test:**
```python
import pytest
from utils import get_node_type, clean_text

def test_get_node_type_que():
    assert get_node_type("[[QUE]] Mi pregunta") == "QUE"

def test_get_node_type_clm():
    assert get_node_type("[[CLM]] - Mi afirmación") == "CLM"

def test_clean_text():
    assert clean_text("[[Test]]") == "Test"
    assert clean_text("**Bold**") == "Bold"
```

---

### 12. **Progress Reporting**
**Problema:** No hay feedback visual para archivos grandes.

**Solución:**
```python
from tqdm import tqdm

def load_nodes_from_files(file_paths, extract_additional_content=False):
    all_nodes = {}
    questions = []

    # Progress bar
    with tqdm(total=len(file_paths), desc="Procesando archivos") as pbar:
        for file_path in file_paths:
            # Procesar archivo
            # ...
            pbar.update(1)
            pbar.set_postfix({"Nodos": len(all_nodes)})

    return all_nodes, questions
```

---

### 13. **Uso de Templates HTML**
**Problema:** HTML generado como string gigante.

**Solución:** Usar Jinja2 o simplemente dividir en templates más pequeños.

```python
from string import Template

# Crear templates separados
QUESTION_TEMPLATE = Template("""
<div id="$q_id" class="node que-node">
    <h2 class="collapsible">
        <span class="node-tag">[[QUE]]</span> - $q_title
        $buttons
    </h2>
    <div class="content">
        $metadata
        $clms
        $direct_evds
    </div>
</div>
""")
```

---

### 14. **CLI con argparse**
**Problema:** Parsing manual de argumentos limitado.

**Solución:**
```python
import argparse

def parse_arguments():
    parser = argparse.ArgumentParser(
        description='RoamMap - Visualizador de estructuras de investigación'
    )
    parser.add_argument(
        'folder',
        nargs='?',
        help='Carpeta específica a procesar (opcional)'
    )
    parser.add_argument(
        '--extract-additional',
        action='store_true',
        help='Extraer contenido adicional de CLMs'
    )
    parser.add_argument(
        '--output-dir',
        default='output',
        help='Directorio de salida (default: output)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Modo verbose con más detalles'
    )

    return parser.parse_args()

if __name__ == "__main__":
    args = parse_arguments()
    extract_structure(args.folder, args.extract_additional)
```

---

### 15. **Caché de Resultados**
**Optimización para re-procesamiento:**

```python
import hashlib
import pickle
from pathlib import Path

def get_file_hash(file_path):
    """Calcula hash MD5 del archivo"""
    with open(file_path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def load_cached_result(cache_key):
    """Carga resultado cacheado si existe"""
    cache_file = Path(f".cache/{cache_key}.pkl")
    if cache_file.exists():
        with open(cache_file, 'rb') as f:
            return pickle.load(f)
    return None

def save_cached_result(cache_key, data):
    """Guarda resultado en caché"""
    Path(".cache").mkdir(exist_ok=True)
    with open(f".cache/{cache_key}.pkl", 'wb') as f:
        pickle.dump(data, f)
```

---

## 📋 PLAN DE MEJORAS SUGERIDO

### Fase 1: Correcciones Críticas (1-2 días)
1. ✅ Eliminar carpeta hardcodeada en main.py
2. ✅ Implementar sistema de logging
3. ✅ Añadir validación de tamaño de archivos
4. ✅ Corregir vulnerabilidad XSS
5. ✅ Resolver importación circular

### Fase 2: Mejoras de Robustez (3-5 días)
6. ✅ Añadir type hints a todas las funciones
7. ✅ Crear archivo de configuración centralizado
8. ✅ Mejorar manejo de errores específico
9. ✅ Añadir validación de estructura JSON

### Fase 3: Mejoras de Calidad (1 semana)
10. ✅ Implementar pruebas unitarias básicas
11. ✅ Refactorizar funciones largas
12. ✅ Mejorar CLI con argparse
13. ✅ Añadir progress reporting

### Fase 4: Optimizaciones (Opcional)
14. ✅ Implementar sistema de caché
15. ✅ Usar templates para HTML
16. ✅ Optimizar procesamiento de archivos grandes

---

## 🔧 DEUDA TÉCNICA IDENTIFICADA

1. **Alta complejidad ciclomática** en `html_generator.py`
2. **Duplicación de código** en procesamiento de nodos
3. **Falta de abstracción** en relaciones entre nodos
4. **Magic numbers** sin constantes nombradas (50, 100, 300, etc.)
5. **Comentarios en español** mezclados con código en inglés (inconsistencia)

---

## 📊 MÉTRICAS DE CALIDAD

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Cobertura de tests | 0% | 70%+ |
| Funciones documentadas | 60% | 100% |
| Type hints | 0% | 100% |
| Líneas por función (promedio) | 45 | <30 |
| Complejidad ciclomática máxima | 20+ | <10 |
| Duplicación de código | ~15% | <5% |

---

## 🎓 RECOMENDACIONES ADICIONALES

### Para Producción
1. **Añadir CI/CD** (GitHub Actions) para tests automáticos
2. **Versionado semántico** (actualmente no hay versiones)
3. **Changelog** para trackear cambios
4. **Contribución guidelines** si se planea open source

### Para Escalabilidad
1. **Procesamiento por lotes** para múltiples carpetas
2. **API REST** para integración con otros sistemas
3. **Export a más formatos** (PDF, DOCX, LaTeX)
4. **Soporte para bases de datos** en lugar de solo archivos

### Para UX
1. **Progress bar** en GUI
2. **Vista previa** antes de exportar
3. **Undo/Redo** en reordenamiento
4. **Búsqueda y filtrado** en HTML generado
5. **Temas** (dark mode, light mode)

---

## 💡 CONCLUSIÓN

RoamMap es un proyecto sólido y funcional, pero tiene **espacio significativo para mejoras**. Las correcciones críticas deben implementarse lo antes posible para evitar problemas en producción.

**Prioridad sugerida:**
1. 🔴 Correcciones críticas (Fase 1) - **INMEDIATO**
2. 🟡 Mejoras de robustez (Fase 2) - **1-2 semanas**
3. 🟢 Mejoras de calidad (Fase 3) - **1-2 meses**
4. ⚪ Optimizaciones (Fase 4) - **Cuando sea necesario**

¿Te gustaría que implemente alguna de estas mejoras específicas?

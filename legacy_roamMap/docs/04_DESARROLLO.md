# Guía de Desarrollo - RoamMap

Esta guía cubre todo lo necesario para desarrollar y extender RoamMap.

---

## 🛠️ Setup del Entorno de Desarrollo

### 1. Clonar y configurar

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/roamMap.git
cd roamMap

# Crear entorno virtual (recomendado)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias de desarrollo
pip install -r requirements.txt
pip install pytest pytest-cov  # Para tests
```

### 2. Estructura del proyecto

```
roamMap/
├── main.py                    # Punto de entrada
├── gui.py                     # Interfaz gráfica
├── structure_extractor.py     # Extracción de estructura
├── html_generator.py          # Generación HTML
├── content_processor.py       # Procesamiento de contenido
├── utils.py                   # Funciones auxiliares
├── config.py                  # Configuración centralizada
├── logger_config.py           # Sistema de logging
├── tests/                     # Tests unitarios
├── docs/                      # Documentación
├── ejemplos/                  # Ejemplos funcionales
└── build/                     # Scripts de construcción
```

### 3. Verificar instalación

```bash
# Verificar que todo funciona
python main.py

# Ejecutar tests
pytest tests/ -v

# Ejecutar GUI
python gui.py
```

---

## 🧪 Ejecutar Tests

### Tests básicos

```bash
# Todos los tests
pytest tests/ -v

# Tests específicos
pytest tests/test_utils.py -v
pytest tests/test_content_processor.py -v

# Con cobertura
pytest tests/ --cov=. --cov-report=html
# Abre htmlcov/index.html para ver reporte
```

### Añadir nuevos tests

**Crear archivo:** `tests/test_nuevo_modulo.py`

```python
"""
Tests unitarios para nuevo_modulo
"""
import sys
from pathlib import Path

# Añadir directorio padre al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from nuevo_modulo import mi_funcion


class TestMiFuncion:
    """Tests para mi_funcion"""

    def test_caso_normal(self):
        """Verifica comportamiento normal"""
        result = mi_funcion("input")
        assert result == "expected_output"

    def test_caso_edge(self):
        """Verifica caso límite"""
        result = mi_funcion("")
        assert result == ""

    def test_caso_error(self):
        """Verifica manejo de errores"""
        with pytest.raises(ValueError):
            mi_funcion(None)
```

**Ejecutar:**
```bash
pytest tests/test_nuevo_modulo.py -v
```

---

## 🔧 Flujo de Trabajo de Desarrollo

### 1. Crear una rama

```bash
git checkout -b feature/mi-nueva-feature
```

### 2. Hacer cambios

- Modifica el código
- Añade tests si es necesario
- Actualiza documentación si es necesario

### 3. Verificar cambios

```bash
# Ejecutar tests
pytest tests/ -v

# Verificar que no se rompió nada
python main.py  # Procesar un ejemplo
python gui.py   # Verificar GUI
```

### 4. Commit y push

```bash
git add .
git commit -m "Descripción clara del cambio"
git push origin feature/mi-nueva-feature
```

### 5. (Opcional) Pull Request

Si trabajas con otros desarrolladores, crea un PR en GitHub.

---

## 📝 Convenciones de Código

### Estilo

**Seguimos PEP 8** (Python Enhancement Proposal 8)

```python
# ✅ Bueno
def my_function(param_one: str, param_two: int) -> str:
    """Docstring claro y conciso"""
    result = process_data(param_one)
    return result

# ❌ Malo
def MyFunction(paramOne,paramTwo):
    result=processData(paramOne)
    return result
```

### Type Hints

**Siempre usa type hints** en funciones nuevas

```python
from typing import List, Dict, Optional, Any

def process_nodes(
    nodes: Dict[str, Dict[str, Any]],
    extract_mode: bool = False
) -> List[str]:
    """
    Procesa nodos y retorna lista de UIDs

    Args:
        nodes: Diccionario de nodos
        extract_mode: Si extraer contenido adicional

    Returns:
        Lista de UIDs procesados
    """
    # ...
```

### Docstrings

**Formato Google Style**

```python
def my_function(param1: str, param2: int) -> bool:
    """Descripción breve de una línea

    Descripción más detallada si es necesario.
    Puede ocupar múltiples líneas.

    Args:
        param1: Descripción del parámetro 1
        param2: Descripción del parámetro 2

    Returns:
        Descripción del valor de retorno

    Raises:
        ValueError: Si param1 está vacío
        TypeError: Si param2 no es entero
    """
    # ...
```

### Nombres

```python
# Variables y funciones: snake_case
my_variable = "value"
def my_function():
    pass

# Clases: PascalCase
class MyClass:
    pass

# Constantes: UPPER_SNAKE_CASE
MAX_SIZE = 100
DEFAULT_VALUE = "default"
```

### Imports

```python
# 1. Librería estándar
import os
import sys
from typing import List, Dict

# 2. Librerías de terceros
import pytest

# 3. Módulos locales
from utils import clean_text
from config import NodeType
```

---

## 🔍 Debugging

### Logging

**Usa el sistema de logging**, no `print()`

```python
from logger_config import get_logger
logger = get_logger(__name__)

# Niveles de log
logger.debug("Información detallada para debugging")
logger.info("Información general")
logger.warning("Advertencia, algo inesperado")
logger.error("Error recuperable")
logger.exception("Error con stack trace")  # Úsalo en except:
```

### Logs en archivo

Los logs se guardan en `roammap.log` con rotación automática.

```bash
# Ver logs en tiempo real
tail -f roammap.log

# Buscar errores
grep ERROR roammap.log

# Últimas 50 líneas
tail -n 50 roammap.log
```

### Debug en VSCode

**Crear:** `.vscode/launch.json`

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: Main",
            "type": "python",
            "request": "launch",
            "program": "${workspaceFolder}/main.py",
            "console": "integratedTerminal",
            "args": ["mi_carpeta"]
        },
        {
            "name": "Python: GUI",
            "type": "python",
            "request": "launch",
            "program": "${workspaceFolder}/gui.py",
            "console": "integratedTerminal"
        }
    ]
}
```

**Uso:** F5 para iniciar debug, breakpoints con F9

---

## 🎯 Tareas Comunes

### Añadir un nuevo tipo de nodo

**Ejemplo:** Añadir `[[HYP]]` (hipótesis)

**1. Actualizar `config.py`:**
```python
class NodeType:
    QUE = "QUE"
    CLM = "CLM"
    EVD = "EVD"
    HYP = "HYP"  # ← Nuevo

NODE_MARKERS = {
    NodeType.HYP: "[[HYP]]",
    # ...
}
```

**2. Actualizar `utils.py`:**
```python
def get_node_type(title: Optional[str]) -> str:
    # ...
    if "[[HYP]]" in title_upper:
        return NodeType.HYP
    # ...
```

**3. Actualizar `structure_extractor.py`:**
```python
def load_nodes_from_files(file_paths, extract_additional_content):
    # ...
    if node_type == NodeType.HYP:
        # Lógica específica para hipótesis
        pass
```

**4. Añadir estilos en `html_generator.py`:**
```python
# En la sección CSS
.hyp-node {
    border-left: 3px solid #9c27b0;  /* Color morado para HYP */
}
```

**5. Añadir tests:**
```python
# En tests/test_utils.py
def test_get_node_type_hyp():
    assert get_node_type("[[HYP]] Mi hipótesis") == NodeType.HYP
```

---

### Cambiar configuración de directorios

**Modificar:** `config.py`

```python
# Para usar directorio personalizado
CUSTOM_OUTPUT_DIR = r"C:\Mi\Ruta\Personalizada"

# Para volver al default
CUSTOM_OUTPUT_DIR = None
```

---

### Modificar formato de salida Markdown

**Modificar:** `structure_extractor.py` → `generate_document_structure()`

```python
def generate_document_structure(questions, all_nodes, extract_additional_content):
    # ...

    # Cambiar formato de QUE
    content += f"\n## 🎯 {question_title}\n\n"  # Añadir emoji

    # Cambiar formato de CLM
    content += f"\n### 💡 {clm_title}\n\n"

    # Cambiar formato de EVD
    content += f"\n#### 📚 {evd_title}\n\n"
```

---

### Añadir nueva opción en la GUI

**Modificar:** `gui.py`

```python
class RoamMapGUI:
    def __init__(self, root):
        # ...

        # Añadir nuevo checkbox
        self.new_option_var = tk.BooleanVar(value=False)
        self.new_option_check = ttk.Checkbutton(
            control_frame,
            text="Mi nueva opción",
            variable=self.new_option_var
        )
        self.new_option_check.pack(pady=5)

    def process_files(self):
        # Usar la nueva opción
        new_option = self.new_option_var.get()
        # Pasar a la función de procesamiento
```

---

### Cambiar estilos del HTML

**Opción 1 (recomendada):** Modificar `config.py`
```python
COLOR_PRIMARY = "#2c3e50"  # Cambiar color principal
PRIMARY_FONT = "'Arial', sans-serif"  # Cambiar fuente
MAX_CONTENT_WIDTH = 1200  # Cambiar ancho máximo
```

**Opción 2:** Modificar CSS directamente en `html_generator.py`
```python
def generate_minimal_html(...):
    css = """
    body {
        font-family: 'Arial', sans-serif;  /* Cambiar fuente */
        background-color: #f5f5f5;  /* Cambiar fondo */
    }

    .que-node {
        border-left: 5px solid #3498db;  /* Cambiar color QUE */
    }
    """
    # ...
```

---

## 🐛 Debugging de Problemas Comunes

### Los nodos no se detectan

**Síntoma:** `Nodos cargados: 0` en los logs

**Causa probable:**
1. Formato incorrecto en JSON: `QUE` en lugar de `[[QUE]]`
2. Campo equivocado: `string` en lugar de `title`

**Solución:**
```python
# Añadir logs en utils.py → get_node_type()
logger.debug(f"Detectando tipo para: {title}")

# Verificar que el JSON tenga el formato correcto
# Inspeccionar los archivos JSON manualmente
```

---

### Las relaciones no se mapean

**Síntoma:** `Relaciones CLM encontradas: 0`

**Causa probable:**
1. Marcadores incorrectos: `#respondedby` en lugar de `#RespondedBy`
2. Referencias sin hashtag: `[[CLM]]` en lugar de `#[[CLM]]`

**Solución:**
```python
# Añadir logs en structure_extractor.py → map_relationships()
logger.debug(f"Buscando relaciones en: {node['uid']}")
logger.debug(f"Children: {node.get('children', [])}")

# Verificar que el JSON tenga las relaciones correctas
```

---

### Archivo muy grande causa error

**Síntoma:** `ValueError: Archivo demasiado grande`

**Solución:**
```python
# Ajustar en config.py
MAX_FILE_SIZE_MB = 100  # Aumentar límite
```

---

### Recursión infinita

**Síntoma:** `RecursionError` o programa colgado

**Causa:** Ciclos en el JSON de Roam (bloque A referencia B, B referencia A)

**Solución:**
Ya está implementada en `content_processor.py`:
```python
def extract_block_content(block, ..., visited_blocks=None):
    if block_id in visited_blocks:
        return ""  # Previene ciclos
```

Si ocurre, verificar que `visited_blocks` se esté pasando correctamente.

---

## 📦 Generar Ejecutable

Ver guía completa en: [docs/05_GENERAR_EJECUTABLE.md](05_GENERAR_EJECUTABLE.md)

**Quick start:**
```bash
# Windows
cd build
build_exe.bat

# Multiplataforma
cd build
python build_exe.py
```

---

## 🔒 Consideraciones de Seguridad

### Al modificar código, asegúrate de:

1. **Validar entrada de usuario**
   - No confiar en nombres de archivo
   - Validar tamaños de archivo
   - Sanitizar paths

2. **Escapar output HTML**
   - Usar `html.escape()` siempre
   - No insertar contenido sin sanitizar

3. **Límites de recursos**
   - Respetar `MAX_RECURSION_DEPTH`
   - Validar tamaño de archivos
   - Prevenir ciclos infinitos

4. **Manejo de errores**
   - Capturar excepciones específicas
   - No exponer stack traces al usuario
   - Loggear errores apropiadamente

---

## 📚 Recursos Útiles

### Python
- **PEP 8:** https://pep8.org/
- **Type hints:** https://docs.python.org/3/library/typing.html
- **Docstrings:** https://google.github.io/styleguide/pyguide.html

### Testing
- **pytest:** https://docs.pytest.org/
- **pytest-cov:** https://pytest-cov.readthedocs.io/

### Tkinter (GUI)
- **Documentación:** https://docs.python.org/3/library/tkinter.html
- **Tutorial:** https://realpython.com/python-gui-tkinter/

### Git
- **Git básico:** https://git-scm.com/book/en/v2
- **Git workflow:** https://www.atlassian.com/git/tutorials/comparing-workflows

---

## 🎓 Checklist para Pull Requests

Antes de hacer un PR, verifica:

- [ ] El código sigue PEP 8
- [ ] Todas las funciones nuevas tienen type hints
- [ ] Todas las funciones tienen docstrings
- [ ] Se añadieron tests para funcionalidad nueva
- [ ] Todos los tests pasan (`pytest tests/ -v`)
- [ ] Se actualizó la documentación si es necesario
- [ ] No hay `print()` statements (usar `logger`)
- [ ] No hay hardcoded paths o valores
- [ ] Se probó en CLI y GUI

---

## 💡 Tips para Desarrollo

### 1. Usa branches para features
```bash
git checkout -b feature/nombre-descriptivo
```

### 2. Commits pequeños y frecuentes
```bash
git commit -m "Añadir validación de tipo HYP"
git commit -m "Añadir tests para tipo HYP"
git commit -m "Actualizar docs con tipo HYP"
```

### 3. Testea mientras desarrollas
```bash
# Terminal 1: desarrollo
vim structure_extractor.py

# Terminal 2: tests en auto-reload
pytest-watch tests/
```

### 4. Usa el ejemplo incluido para testing
```bash
# Procesar el ejemplo mientras desarrollas
python main.py ../ejemplos/tesis_ejemplo/input
```

### 5. Revisa logs frecuentemente
```bash
tail -f roammap.log
```

---

## 🤝 Contribuir al Proyecto

Si quieres contribuir:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Haz tus cambios siguiendo esta guía
4. Asegúrate de que los tests pasen
5. Abre un Pull Request con descripción clara

---

## 📞 Obtener Ayuda

- **Documentación:** Revisa `docs/` para guías detalladas
- **Ejemplos:** Explora `ejemplos/` para casos de uso
- **Issues:** Reporta bugs en GitHub Issues
- **Logs:** Revisa `roammap.log` para detalles de errores

---

**¡Feliz desarrollo! 🚀**

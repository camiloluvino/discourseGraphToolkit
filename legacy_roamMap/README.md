# RoamMap 🗺️

**Visualizador de estructuras de investigación para tesis académicas**

RoamMap convierte exportaciones JSON de [Roam Research](https://roamresearch.com/) en documentos HTML interactivos y Markdown, visualizando la estructura jerárquica de investigación académica organizada en **Preguntas (QUE)**, **Afirmaciones (CLM)** y **Evidencias (EVD)**.

---

## ⚡ Quick Start

### Paso 1: Instalar
```bash
git clone https://github.com/tu-usuario/roamMap.git
cd roamMap
```

### Paso 2: Ejecutar
```bash
# Interfaz gráfica (recomendado)
python gui.py

# O línea de comandos
python main.py nombre_carpeta
```

### Paso 3: Resultado
```
output/tu_proyecto/
├── tu_proyecto.html    # Documento interactivo
└── tu_proyecto.md      # Documento Markdown
```

**¿Primera vez?** Prueba con el ejemplo incluido: `python main.py`

---

## ✨ Características Principales

- 🎯 **Detección automática** de nodos QUE/CLM/EVD
- 🔗 **Mapeo de relaciones** jerárquicas (`#RespondedBy`, `#SupportedBy`)
- 📊 **Dos formatos**: HTML interactivo + Markdown portable
- 🎨 **Interfaz minimalista** con controles (expandir/contraer, copiar, reordenar)
- 🖥️ **GUI intuitiva** con drag-and-drop
- 📦 **Sin dependencias** (Python puro)
- 🔄 **Dos modos de extracción**: estándar o completo

---

## 📚 Documentación Completa

### Para Usuarios

- **[🗺️ Introducción a Roam Research](docs/01_INTRO_ROAM_RESEARCH.md)**
  - Qué es Roam Research
  - Estructura QUE/CLM/EVD
  - Cómo exportar tus datos
  - Relaciones entre nodos

- **[⚡ Guía Rápida](docs/02_GUIA_RAPIDA.md)**
  - Instalación en 3 pasos
  - Primer uso (GUI y CLI)
  - Modos de extracción
  - Solución de problemas

- **[📦 Ejemplo Funcional](ejemplos/tesis_ejemplo/README.md)**
  - Ejemplo completo listo para usar
  - Incluye JSON de prueba
  - Resultados esperados

### Para Desarrolladores

- **[🛠️ DEVELOPER.md](DEVELOPER.md)** - **Empieza aquí si vas a desarrollar**
  - Guía principal para desarrolladores
  - Setup del entorno
  - Tareas comunes (quick reference)

- **[🏗️ Arquitectura](docs/03_ARQUITECTURA.md)**
  - Flujo de datos
  - Módulos principales
  - Dónde modificar para diferentes tareas

- **[🔧 Desarrollo](docs/04_DESARROLLO.md)**
  - Convenciones de código
  - Tests y debugging
  - Flujo de trabajo

- **[📦 Generar Ejecutable](docs/05_GENERAR_EJECUTABLE.md)**
  - Crear .exe para Windows
  - Distribución sin Python

---

## 🚀 Uso Básico

### Interfaz Gráfica (Recomendado)

```bash
python gui.py
```

1. Click en **"Seleccionar Archivos..."** (o arrastra archivos JSON)
2. (Opcional) Configura opciones de extracción
3. Click en **"Procesar Archivos"**
4. Click en **"Abrir Resultados"** cuando termine

### Línea de Comandos

```bash
# Copiar tus JSONs a input/
mkdir -p input/mi_proyecto
cp /ruta/a/tus/*.json input/mi_proyecto/

# Procesar
python main.py mi_proyecto

# Ver resultados
open output/mi_proyecto/mi_proyecto.html
```

---

## 📊 Estructura de Datos

### Tipos de Nodos

| Tipo | Formato | Descripción |
|------|---------|-------------|
| **QUE** | `[[QUE]] ¿Pregunta?` | Preguntas de investigación |
| **CLM** | `[[CLM]] Afirmación` | Claims/Afirmaciones |
| **EVD** | `[[EVD]] Evidencia` | Evidencias que soportan CLMs |

### Relaciones

| Relación | Uso | Descripción |
|----------|-----|-------------|
| `#RespondedBy` | QUE → CLM | Enlaza preguntas con afirmaciones |
| `#SupportedBy` | CLM → EVD | Enlaza afirmaciones con evidencias |
| `#RelatedTo` | CLM ↔ CLM | Enlaza afirmaciones relacionadas |
| `#Source` | EVD | Marca la fuente bibliográfica |

**Ver detalles:** [docs/01_INTRO_ROAM_RESEARCH.md](docs/01_INTRO_ROAM_RESEARCH.md)

---

## 🔄 Modos de Extracción

### 🔹 Modo Estándar (por defecto)
Solo extrae contenido bajo relaciones formales (`#RespondedBy`, `#SupportedBy`, `#RelatedTo`)

**Uso:**
- GUI: Deja el checkbox desmarcado
- CLI: `python main.py carpeta`

### 🔸 Modo Contenido Adicional
Extrae TODO el contenido textual de nodos CLM (incluye descripciones adicionales)

**Uso:**
- GUI: Marca el checkbox ☑️ "Extraer contenido adicional de CLMs"
- CLI: Requiere modificar el código (ver [docs/02_GUIA_RAPIDA.md](docs/02_GUIA_RAPIDA.md))

---

## 📁 Estructura del Proyecto

```
roamMap/
├── core/                      # Lógica del negocio (NUEVO)
│   ├── config.py              # Configuración
│   ├── utils.py               # Utilidades
│   ├── json_loader.py         # Carga de JSON
│   ├── node_processor.py      # Procesamiento de nodos
│   ├── relationship_mapper.py # Mapeo de relaciones
│   ├── markdown_generator.py  # Generación Markdown
│   ├── html_generator.py      # Generación HTML
│   ├── content_processor.py   # Procesamiento de contenido
│   └── logger_config.py       # Logging
│
├── main.py                    # Punto de entrada CLI
├── gui.py                     # Interfaz gráfica
│
├── docs/                      # Documentación completa
│   ├── 01_INTRO_ROAM_RESEARCH.md
│   ├── 02_GUIA_RAPIDA.md
│   ├── 03_ARQUITECTURA.md
│   ├── 04_DESARROLLO.md
│   ├── 05_GENERAR_EJECUTABLE.md
│   └── historico/
│
├── ejemplos/                  # Ejemplos funcionales
│   └── tesis_ejemplo/
│
├── tests/                     # Tests unitarios
└── input/                     # Carpeta de entrada por defecto
```

---

## 🐛 Solución de Problemas

### No se detectan nodos

**Problema:** Los títulos deben usar `[[QUE]]` con dobles corchetes

```json
// ❌ Incorrecto
"title": "QUE: Mi pregunta"

// ✅ Correcto
"title": "[[QUE]] Mi pregunta"
```

### No se encuentran relaciones

**Problema:** Los marcadores deben ser exactos (case-sensitive)

```json
// ❌ Incorrecto
"string": "#respondedby"

// ✅ Correcto
"string": "#RespondedBy"
```

### La GUI no abre

**Problema:** Falta `tkinter`

```bash
# Ubuntu/Debian
sudo apt-get install python3-tk

# Windows/macOS: Reinstala Python desde python.org
```

**Más ayuda:** [docs/02_GUIA_RAPIDA.md#solución-de-problemas](docs/02_GUIA_RAPIDA.md)

---

## 🧪 Ejecutar Tests

```bash
pip install pytest
pytest tests/ -v
```

---

## 🤝 Contribuir

**Eres desarrollador?** Lee [DEVELOPER.md](DEVELOPER.md) para empezar.

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Haz tus cambios y añade tests
4. Commit: `git commit -m 'Descripción clara'`
5. Push: `git push origin feature/nueva-funcionalidad`
6. Abre un Pull Request

**Convenciones de código:** Ver [docs/04_DESARROLLO.md#convenciones-de-código](docs/04_DESARROLLO.md)

---

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) para detalles

---

## 🙏 Agradecimientos

- Desarrollado para facilitar la organización de tesis académicas
- Inspirado en la metodología de investigación estructurada
- Compatible con [Roam Research](https://roamresearch.com/)

---

## 📞 Soporte

- **Documentación:** Consulta [docs/](docs/) para guías detalladas
- **Ejemplos:** Ver [ejemplos/tesis_ejemplo/](ejemplos/tesis_ejemplo/)
- **Issues:** Reporta bugs en GitHub Issues
- **Logs:** Revisa `roammap.log` para detalles de errores

---

## 🎯 Próximos Pasos

1. **Usuarios:** Lee [Guía Rápida](docs/02_GUIA_RAPIDA.md) y prueba el [ejemplo](ejemplos/tesis_ejemplo/README.md)
2. **Desarrolladores:** Lee [DEVELOPER.md](DEVELOPER.md) y [Arquitectura](docs/03_ARQUITECTURA.md)
3. **Distribución:** Lee [Generar Ejecutable](docs/05_GENERAR_EJECUTABLE.md)

---

**¡Feliz investigación! 🎓**

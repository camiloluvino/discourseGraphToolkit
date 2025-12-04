# Guía Rápida - RoamMap

Esta guía te permite procesar tu primer archivo JSON de Roam en **menos de 5 minutos**.

---

## ⚡ Instalación Rápida

### Requisitos
- Python 3.7 o superior
- `tkinter` (incluido en la mayoría de instalaciones de Python)

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/roamMap.git
cd roamMap
```

### Paso 2: (Opcional) Crear entorno virtual
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### Paso 3: Instalar dependencias (opcional)
```bash
pip install -r requirements.txt
```

**Nota:** El proyecto funciona sin dependencias externas. `requirements.txt` solo incluye herramientas opcionales.

---

## 🚀 Primer Uso - Método GUI (Recomendado)

### Paso 1: Ejecutar la interfaz gráfica
```bash
python gui.py
```

### Paso 2: Seleccionar archivos
- Click en **"Seleccionar Archivos..."**
- Navega a tus archivos JSON exportados de Roam
- Selecciona uno o varios `.json`
- O simplemente **arrastra los archivos** a la ventana

### Paso 3: (Opcional) Nombrar el proyecto
- Escribe un nombre en "Nombre de carpeta de salida"
- Si lo dejas vacío, se generará automáticamente

### Paso 4: Configurar extracción
- ☑️ **Marcar** si quieres extraer contenido adicional de CLMs
- ☐ **Desmarcar** para solo extraer relaciones formales (recomendado al inicio)

### Paso 5: Procesar
- Click en **"Procesar Archivos"**
- Espera a que termine (verás los logs en tiempo real)
- Click en **"Abrir Resultados"** cuando termine

---

## 💻 Primer Uso - Método CLI

### Procesar un ejemplo
```bash
# Copia tus JSONs a input/mi_proyecto/
mkdir -p input/mi_proyecto
cp /ruta/a/tus/archivos/*.json input/mi_proyecto/

# Procesa la carpeta
python main.py mi_proyecto
```

### Resultado
```
output/mi_proyecto/
├── mi_proyecto.html    # Documento interactivo
└── mi_proyecto.md      # Documento en Markdown
```

---

## 📁 Estructura de Carpetas

Después del primer uso, tendrás:

```
roamMap/
├── input/                  # Tus archivos JSON de Roam
│   └── mi_proyecto/
│       ├── archivo1.json
│       └── archivo2.json
│
└── output/                 # Resultados generados
    └── mi_proyecto/
        ├── mi_proyecto.html
        └── mi_proyecto.md
```

---

## 🎯 Ejemplo Completo - Paso a Paso

### 1. Preparar un ejemplo
```bash
# Copia el ejemplo incluido
cp -r ejemplos/tesis_ejemplo/input input/ejemplo
```

### 2. Procesar
```bash
# Opción A: GUI
python gui.py
# Selecciona los archivos en input/ejemplo/

# Opción B: CLI
python main.py ejemplo
```

### 3. Ver resultados
```bash
# Abre el HTML generado
open output/ejemplo/ejemplo.html  # macOS
xdg-open output/ejemplo/ejemplo.html  # Linux
start output/ejemplo/ejemplo.html  # Windows
```

---

## 🔍 Qué Esperar en la Salida

### HTML Generado (`proyecto.html`)

**Características:**
- ✅ Navegación jerárquica (QUE → CLM → EVD)
- ✅ Secciones colapsables/expandibles
- ✅ Botón "Copiar" para cada pregunta
- ✅ Botón "Exportar a Markdown"
- ✅ Botones de reordenamiento (↑/↓)
- ✅ Diseño minimalista y responsive
- ✅ Funciona sin conexión (todo embebido)

**Estructura:**
```
📄 Estructura de Investigación
  └─ [[QUE]] - ¿Tu pregunta?
      ├─ Metadatos (QUEs relacionados, CLMs directos)
      ├─ [[CLM]] - Tu afirmación
      │   ├─ Contenido adicional (si activaste la opción)
      │   └─ [[EVD]] - Tu evidencia
      │       ├─ Contenido de la evidencia
      │       └─ #Source Referencia bibliográfica
      └─ ...más CLMs y EVDs
```

### Markdown Generado (`proyecto.md`)

**Características:**
- ✅ Formato portable y simple
- ✅ Importable a otros editores
- ✅ Compatible con control de versiones
- ✅ Jerarquía clara con headers

**Ejemplo:**
```markdown
# Estructura de Investigación

## [[QUE]] - ¿Cómo afecta la IA al empleo?

### [[CLM]] - La IA automatiza trabajos repetitivos

**Evidencias que respaldan esta afirmación:**

#### [[EVD]] - Estudio McKinsey 2023
- McKinsey proyecta que 30% de trabajos...
  - **Fuente:** McKinsey Global Institute (2023)
```

---

## 🔧 Modos de Extracción

RoamMap tiene 2 modos de procesamiento:

### 🔹 Modo Estándar (recomendado para empezar)
**Extrae solo contenido bajo relaciones formales:**
- `#RespondedBy`
- `#SupportedBy`
- `#RelatedTo`
- `#Source`

**Usa este modo si:**
- Tu estructura en Roam es formal
- Solo quieres las relaciones explícitas
- Quieres salida más limpia

**En CLI:**
```bash
python main.py mi_proyecto
```

**En GUI:** Desmarca el checkbox

---

### 🔸 Modo Contenido Adicional
**Extrae TODO el contenido textual de nodos CLM:**
- Contenido bajo relaciones formales
- Texto descriptivo adicional
- Notas y anotaciones

**Usa este modo si:**
- Tus CLMs tienen descripción detallada
- Quieres incluir todo el contexto
- Necesitas el contenido completo

**En CLI:**
```bash
python main.py mi_proyecto --extract-additional
# (Nota: actualmente requiere modificar el código, ver DEVELOPER.md)
```

**En GUI:** Marca el checkbox ☑️

---

## 📊 Resumen de Logs

Durante el procesamiento verás:

```
================================================================================
Procesando carpeta: /ruta/a/input/mi_proyecto
================================================================================
MODO: Extracción estándar (solo relaciones lógicas)

Encontrados 5 archivos para procesar
Nodos cargados: 42
  - QUE: 8
  - CLM: 22
  - EVD: 12

Resumen de relaciones encontradas:
CLM: La IA automatiza trabajos... tiene 3 EVDs relacionados
CLM: La IA crea nuevos empleos... tiene 2 EVDs relacionados
...

Documentos generados:
- Markdown: output/mi_proyecto/mi_proyecto.md
- HTML minimalista: output/mi_proyecto/mi_proyecto.html
```

---

## ⚠️ Solución de Problemas Rápidos

### No se detectan nodos QUE/CLM/EVD
**Problema:** Los títulos no tienen el formato correcto

**Solución:**
```json
// ❌ Incorrecto
"title": "QUE: Mi pregunta"
"title": "[QUE] Mi pregunta"

// ✅ Correcto
"title": "[[QUE]] Mi pregunta"
```

---

### No se encuentran relaciones
**Problema:** Los marcadores de relación no están exactos

**Solución:**
```json
// ❌ Incorrecto
"string": "#respondedby"
"string": "RespondedBy"

// ✅ Correcto
"string": "#RespondedBy"  // Case-sensitive!
```

---

### No hay archivos JSON en input/
**Problema:** Los archivos están en otra ubicación

**Solución:**
```bash
# Verifica que los archivos estén aquí:
ls input/tu_carpeta/
# Debe mostrar archivos .json
```

---

### La GUI no abre
**Problema:** Falta tkinter

**Solución:**
```bash
# Ubuntu/Debian
sudo apt-get install python3-tk

# macOS (debería estar incluido)
# Reinstala Python desde python.org

# Windows (debería estar incluido)
# Reinstala Python marcando "tcl/tk"
```

---

## 🎓 Próximos Pasos

Ahora que procesaste tu primer archivo:

### Para Usuarios
1. 📖 Lee el [README principal](../README.md) para características avanzadas
2. 🎨 Explora el HTML interactivo generado
3. 🔄 Re-procesa con diferentes modos para comparar

### Para Desarrolladores
1. 🏗️ Lee [Arquitectura](03_ARQUITECTURA.md) para entender el flujo
2. 🛠️ Lee [Desarrollo](04_DESARROLLO.md) para modificar el código
3. 📦 Lee [Generar Ejecutable](05_GENERAR_EJECUTABLE.md) para crear .exe

---

## 💡 Tips

- **Nombres automáticos:** Deja el campo de nombre vacío en la GUI para generación automática
- **Múltiples versiones:** El sistema genera `proyecto_1`, `proyecto_2` si ya existe
- **Logs persistentes:** Revisa `roammap.log` si algo falla
- **Re-procesar:** Puedes procesar la misma carpeta múltiples veces

---

**¿Listo para más?** Continúa con [Arquitectura](03_ARQUITECTURA.md) para entender cómo funciona internamente.

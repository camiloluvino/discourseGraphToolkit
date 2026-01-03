# Discourse Graph Toolkit

**Versión:** 1.2.2  
**Autor:** Camilo Luvino

## Descripción

Discourse Graph Toolkit es un plugin para **Roam Research** que facilita la creación, organización y exportación de grafos de discurso académico. Permite estructurar investigaciones usando tres tipos de nodos: **Preguntas (QUE)**, **Afirmaciones (CLM)** y **Evidencias (EVD)**.

El toolkit está diseñado para investigadores y académicos que utilizan Roam Research para desarrollar argumentos estructurados, gestionar literatura y producir documentos exportables.

## Características Principales

### 1. Creación Rápida de Nodos
Convierte cualquier bloque de texto en un nodo estructurado con atajos de teclado:

| Atajo | Tipo de Nodo |
|-------|--------------|
| `Ctrl+Shift+Q` | Pregunta (QUE) |
| `Ctrl+Shift+C` | Afirmación (CLM) |
| `Ctrl+Shift+E` | Evidencia (EVD) |

Cada nodo se crea como una página con la estructura definida en tus templates personalizables.

### 2. Gestión de Proyectos
Organiza tu investigación en proyectos separados:
- Crea y gestiona proyectos desde la pestaña **Proyectos**.
- Asigna nodos automáticamente al proyecto activo.
- Sincroniza proyectos con una página dedicada en Roam.
- Descubre proyectos existentes en el grafo con "Buscar Sugerencias".

### 3. Verificación de Coherencia (Ramas)
Verifica la consistencia de tus ramas de investigación:
- Detecta nodos con `Proyecto Asociado::` diferente al de la pregunta raíz.
- Identifica nodos sin proyecto asignado.
- Propaga el proyecto de la rama a todos los nodos descendientes con un clic.

### 4. Exportación Multi-Formato
Exporta tus grafos de discurso en múltiples formatos:
- **JSON Nativo:** Compatible con el formato de Roam Research.
- **HTML:** Documento interactivo con estilos y navegación.
- **Markdown:** Formato estructurado con bullets e indentación.
- **MD Plano:** Markdown sin bullets, ideal para conversión a otros formatos.
- **EPUB:** Libro electrónico listo para lectores de eBooks (Kindle, Apple Books, Calibre).

### 5. Importación
Restaura copias de seguridad o importa grafos de otros usuarios sin sobrescribir elementos existentes.

## Instalación

### Opción A: Instalación con Actualizaciones Automáticas (Recomendado)

Esta opción carga el plugin desde GitHub Pages. Solo necesitas configurarlo una vez por grafo y recibirás actualizaciones automáticamente.

1. Crea una página en Roam Research (ej. `[[roam/js/discourse-toolkit]]`).
2. Crea un bloque hijo con `{{[[roam/js]]}}`.
3. Dentro, crea un bloque de código JavaScript.
4. Pega el siguiente código:

```javascript
var s = document.createElement('script');
s.src = 'https://camiloluvino.github.io/discourseGraphToolkit/discourse-graph-toolkit.js';
s.type = 'text/javascript';
document.head.appendChild(s);
```

5. Confirma con "Yes, I know what I'm doing".
6. Recarga Roam.

> **Nota:** Cada vez que actualice el plugin en GitHub, todos tus grafos recibirán la nueva versión automáticamente al recargar Roam.

### Opción B: Instalación Manual

Si prefieres tener control total sobre la versión del plugin:

1. Crea una página en Roam Research (ej. `[[roam/js/discourse-toolkit]]`).
2. Crea un bloque hijo con `{{[[roam/js]]}}`.
3. Dentro, crea un bloque de código JavaScript.
4. Copia y pega el contenido completo de `discourse-graph-toolkit.js`.
5. Confirma con "Yes, I know what I'm doing".
6. Recarga Roam.

## Uso Básico

### Abriendo el Toolkit
1. Abre la paleta de comandos (`Ctrl+P`).
2. Busca **"Discourse Graph Toolkit: Abrir"**.

### Pestañas disponibles

| Pestaña | Función |
|---------|---------|
| **Proyectos** | Gestiona proyectos, valida existencia, busca sugerencias |
| **Ramas** | Verifica coherencia de `Proyecto Asociado::` en todas las ramas |
| **Exportar** | Exporta nodos a JSON, HTML, Markdown o EPUB |
| **Importar** | Importa grafos desde archivos JSON |

### Creando Nodos
1. Escribe tu idea en un bloque.
2. Presiona el atajo correspondiente (ej. `Ctrl+Shift+Q`).
3. El bloque se convierte en un enlace a una nueva página estructurada.

### Exportando
1. Abre el Toolkit.
2. Ve a la pestaña **Exportar**.
3. Selecciona proyectos y tipos de nodos.
4. Haz clic en el formato deseado: JSON, HTML, Markdown, MD Plano o EPUB.

## Estructura del Proyecto

```
discourseGraphToolkit/
├── src/
│   ├── config.js              # Configuración y constantes
│   ├── state.js               # Gestión de almacenamiento
│   ├── index.js               # Inicialización
│   ├── api/
│   │   └── roam.js            # Interacción con Roam API
│   ├── core/
│   │   ├── nodes.js           # Creación de nodos
│   │   ├── projects.js        # Gestión de proyectos
│   │   ├── export.js          # Exportación JSON
│   │   ├── import.js          # Importación de datos
│   │   ├── contentProcessor.js    # Procesamiento de contenido
│   │   ├── relationshipMapper.js  # Mapeo de relaciones
│   │   ├── htmlGenerator.js       # Generador HTML
│   │   ├── markdownGenerator.js   # Generador Markdown
│   │   └── epubGenerator.js       # Generador EPUB
│   ├── ui/
│   │   └── modal.js           # Interfaz de usuario (React)
│   └── utils/
│       ├── helpers.js         # Funciones auxiliares
│       └── toast.js           # Notificaciones
├── docs/                      # Documentación técnica
├── ejemplos/                  # Ejemplos de exportación
├── build.ps1                  # Script de build
└── discourse-graph-toolkit.js # Bundle final
```

## Documentación Técnica

- [Arquitectura y Estándares](docs/ARCHITECTURE_AND_STANDARDS.md)
- [Especificación JSON](docs/json_structure_spec.md)

## Desarrollo

El proyecto usa un sistema de build por concatenación. Para generar el bundle:

```powershell
.\build.ps1
```

Para verificar sintaxis:
```powershell
node -c discourse-graph-toolkit.js
```

## Licencia

Uso personal. Proyecto individual para investigación académica.

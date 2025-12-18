# Discourse Graph Toolkit

**Versión:** 1.1.13  
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
- Crea y gestiona proyectos desde la interfaz.
- Asigna nodos automáticamente al proyecto activo.
- Filtra exportaciones por proyecto.

### 3. Exportación Multi-Formato
Exporta tus grafos de discurso en múltiples formatos:
- **JSON Nativo:** Compatible con el formato de Roam Research.
- **HTML:** Documento estructurado con estilos para visualización.
- **Markdown:** Para uso en otras herramientas o publicación.

### 4. Página Índice
Usa una página de Roam como "índice" para controlar el **orden de exportación**:
- Los nodos se exportan en el orden visual de la página índice.
- Ideal para mantener una estructura narrativa en tus documentos.

## Instalación

1. Crea una página en Roam Research (ej. `[[roam/js/discourse-toolkit]]`).
2. Crea un bloque hijo con `{{[[roam/js]]}}`.
3. Dentro, crea un bloque de código JavaScript.
4. Copia y pega el contenido de `discourse-graph-toolkit.js`.
5. Confirma con "Yes, I know what I'm doing".
6. Recarga Roam.

## Uso Básico

### Configuración Inicial
1. Abre la paleta de comandos (`Ctrl+P`).
2. Busca **"Discourse Graph Toolkit: Abrir"**.
3. En la pestaña **General**:
   - Configura el nombre del campo de proyecto (por defecto: `Proyecto Asociado`).
   - Revisa los atajos de teclado.
4. En la pestaña **Proyectos**:
   - Crea tus proyectos de investigación.
   - Selecciona el proyecto por defecto.

### Creando Nodos
1. Escribe tu idea en un bloque.
2. Presiona el atajo correspondiente (ej. `Ctrl+Shift+Q`).
3. El bloque se convierte en un enlace a una nueva página estructurada.

### Exportando
1. Abre el Toolkit.
2. Ve a la pestaña **Exportar**.
3. Selecciona proyectos y tipos de nodos.
4. (Opcional) Especifica una **Página Índice** para controlar el orden.
5. Haz clic en el formato deseado: JSON, HTML o Markdown.

## Estructura del Proyecto

```
discourseGraphToolkit/
├── src/
│   ├── config.js          # Configuración y constantes
│   ├── state.js           # Gestión de almacenamiento
│   ├── api/roam.js        # Interacción con Roam API
│   ├── core/              # Lógica de negocio
│   │   ├── nodes.js       # Creación de nodos
│   │   ├── export.js      # Exportación JSON
│   │   ├── import.js      # Importación de datos
│   │   └── ...            # Procesadores y generadores
│   ├── ui/modal.js        # Interfaz de usuario (React)
│   └── index.js           # Inicialización
├── docs/                  # Documentación técnica
├── ejemplos/              # Ejemplos de exportación
├── build.ps1              # Script de build
└── discourse-graph-toolkit.js  # Bundle final
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

# Discourse Graph Toolkit

**Versión:** 1.5.37  
**Autor:** Camilo Luvino

## Descripción

Discourse Graph Toolkit es un plugin para **Roam Research** que facilita la creación, organización y exportación de grafos de discurso académico. Posee una interfaz minimalista y moderna basada en un sistema de diseño de utilidades CSS, optimizado para la claridad visual. Permite estructurar investigaciones usando cuatro tipos de nodos: **GRI (Grupos de Investigación)**, **Preguntas (QUE)**, **Afirmaciones (CLM)** y **Evidencias (EVD)**.

El toolkit está diseñado para investigadores y académicos que utilizan Roam Research para desarrollar argumentos estructurados, gestionar literatura y producir documentos exportables. Lo que lo hace único es su flexibilidad jerárquica: puedes organizar preguntas dentro de grupos (GRI), o tratar a ambos como puntos de entrada independientes al grafo.

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
- **Auto-descubrimiento:** Al abrir el Toolkit, detecta proyectos no registrados y muestra una alerta para agregarlos con un clic.
- **Ignorar alertas:** Permite descartar permanentemente proyectos de la alerta automática (Lista de Ignorados), con opción de restaurarlos desde la pestaña Proyectos.
- **Match jerárquico:** Al exportar, seleccionar un proyecto padre automáticamente incluye todos sus sub-proyectos (ej. `tesis/marco` incluye `tesis/marco/epistemología`).

### 3. Verificación de Coherencia (Ramas)
Verifica la consistencia de tus ramas de investigación:
- Detecta nodos con `Proyecto Asociado::` diferente al de la pregunta raíz.
- Identifica nodos sin proyecto asignado.
- **Verificación jerárquica inteligente:** Cada nodo debe ser igual o más específico que su padre directo, **salvo en referencias inter-proyectos explícitas**. El sistema detecta automáticamente cuando un nodo pertenece legítimamente a otro proyecto y lo trata como una referencia cruzada válida en lugar de marcarlo como un error de coherencia.
- **Namespaces jerárquicos:** Soporta sub-proyectos como `tesis/marco/metodología`.
- **Exclusión de relaciones horizontales:** Las conexiones vía `#RelatedTo` son ignoradas por el validador de ramas para evitar ruidos de coherencia en enlaces laterales.
- **Vista de árbol jerárquico:** Agrupa las preguntas por namespace de proyecto con indicadores de estado agregados.
- **Propagación inteligente unificada:**
  - `🔄 Propagar` — Botón único que corrige automáticamente todas las inconsistencias de la rama. Aplica el proyecto del QUE a nodos sin proyecto o diferentes, y hereda del padre en caso de generalizaciones.
- **UI Limpia:** Secciones colapsables por tipo de error y detalles técnicos accesibles vía hover (tooltips).

### 4. Exportación Multi-Formato
Exporta tus grafos de discurso en múltiples formatos:
- **JSON Nativo:** Compatible con el formato de Roam Research.
- **HTML:** Documento interactivo con estilos, navegación y reordenamiento.
- **Markdown:** Formato estructurado con bullets e indentación.
- **MD Plano:** Markdown sin bullets, ideal para conversión a otros formatos.
- **Profundidad Recursiva Ilimitada:** Los exportadores de Markdown, HTML y EPUB ahora soportan anidación infinita de afirmaciones (CLM) y evidencias (EVD). Ya no existe un límite fijo de niveles; el sistema recorre toda la rama de discurso respetando las relaciones `#SupportedBy`.
- **EPUB:** Libro electrónico con generador nativo. Cuenta con **Índice Jerárquico Profundo (ToC Interactivo)** y **numeración jerárquica dinámica** para cualquier nivel (ej. `1.2.1.2.1. `), preservando el contexto del discurso en lecturas lineales.
- **HTML:** Documento interactivo con profundidad dinámica. Los niveles superiores a 6 mantienen la jerarquía visual mediante indentación CSS progresiva.
- **Markdown:** Indentación bulleted infinita en exportación estándar y headings jerárquicos `#` dinámicos.

- **Selector de Proyectos Jerárquico:** Los proyectos se muestran en un árbol colapsable. Seleccionar un padre selecciona automáticamente todos los sub-proyectos (selección en cascada).
- **Reordenamiento de Preguntas:** Gestiona el orden de tus preguntas (QUE) desde la pestaña **Panorámica** usando los botones ↑↓. El orden personalizado se aplica automáticamente a todos los formatos de exportación.

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
| **Nodos** | Gestión y búsqueda de nodos huérfanos sin proyecto ni conexiones |
| **Panorámica** | Vista sintética y pulida de todas las ramas del grafo con diseño unificado |
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
│   ├── api/                   # Módulos de Roam API
│   │   ├── roamProjects.js    # Gestión de proyectos en Roam
│   │   ├── roamSearch.js      # Búsquedas y queries
│   │   ├── roamBranchVerification.js    # Verificación de ramas
│   │   └── roamStructureVerification.js # Verificación de estructura
│   ├── core/
│   │   ├── nodes.js           # Creación de nodos
│   │   ├── projects.js        # Gestión de proyectos
│   │   ├── export.js          # Exportación JSON
│   │   ├── import.js          # Importación de datos
│   │   ├── contentProcessor.js    # Procesamiento de contenido
│   │   ├── relationshipMapper.js  # Mapeo de relaciones
│   │   ├── markdownCore.js        # Core de Markdown (compartido)
│   │   ├── markdownGenerator.js   # Generador Markdown
│   │   ├── htmlGenerator.js       # Generador HTML
│   │   └── epubGenerator.js       # Generador EPUB
│   ├── ui/
│   │   ├── modal.js           # Modal principal (React)
│   │   ├── contexts/          # Contextos de dominio (Nav, Projects, Branches, etc.)
│   │   ├── components/        # Componentes reutilizables
│   │   └── tabs/              # Pestañas del modal (Proyectos, Ramas, Nodos, etc.)
│   └── utils/
│       ├── helpers.js         # Funciones auxiliares
│       └── toast.js           # Notificaciones
├── ejemplos/                  # Ejemplos de exportación
├── build.ps1                  # Script de build
└── discourse-graph-toolkit.js # Bundle final
```

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

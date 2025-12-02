# Discourse Graph Toolkit

**Versión:** 1.0.0
**Autor:** [Tu Nombre/Equipo]

## Descripción
Discourse Graph Toolkit es una solución integral para Roam Research que combina la creación ágil de nodos de discurso (Preguntas, Afirmaciones, Evidencias) con potentes capacidades de exportación.

Este plugin unifica las funcionalidades de los anteriores `discourseGraphElemental` y `roamDiscourseSelector`.

## Características Principales

### 1. Creación de Nodos
Transforma cualquier bloque de texto en un nodo estructurado usando atajos de teclado:
- **Ctrl+Shift+Q**: Crea una **Pregunta (QUE)**.
- **Ctrl+Shift+C**: Crea una **Afirmación (CLM)**.
- **Ctrl+Shift+E**: Crea una **Evidencia (EVD)**.

### 2. Templates Personalizables
Define exactamente qué estructura deben tener tus nodos. Puedes configurar plantillas que incluyan metadatos, referencias y atributos personalizados.

### 3. Gestión de Proyectos
Organiza tu investigación en proyectos.
- Asigna nodos a proyectos automáticamente.
- Configura el nombre del campo de enlace (ej. `Proyecto Asociado::` o `Project::`).

### 4. Exportación Nativa
Exporta tus grafos de discurso en formato JSON nativo de Roam, listo para ser importado en otras gráficas o procesado externamente.
- Filtra por Proyecto.
- Filtra por Tipo de Nodo (QUE, CLM, EVD).

## Instalación

1. Crea una página o bloque en Roam Research (ej. `[[roam/js/discourse-toolkit]]`).
2. Crea un bloque hijo con `{{[[roam/js]]}}`.
3. Dentro, crea otro bloque de código JavaScript (`Cmd/Ctrl + Enter` y selecciona JavaScript).
4. Copia y pega el contenido del archivo `discourse-graph-toolkit.js`.
5. Haz clic en el botón "Yes, I know what I'm doing".
6. Recarga Roam.

## Uso

### Configuración Inicial
1. Abre la paleta de comandos (`Ctrl+P` o `Cmd+P`).
2. Busca y selecciona **"Discourse Graph Toolkit: Abrir"**.
3. Ve a la pestaña **General**.
4. Configura el **"Nombre del Campo de Proyecto"** (por defecto: `Proyecto Asociado`). Esto es crucial para que el sistema encuentre tus nodos.
5. (Opcional) Crea algunos proyectos en la pestaña **Proyectos** y selecciona uno por defecto.

### Creando Nodos
1. Escribe tu idea en un bloque.
2. Presiona el atajo correspondiente (ej. `Ctrl+Shift+Q`).
3. El bloque se convertirá en un enlace a una nueva página con la estructura definida en tus templates.

### Exportando
1. Abre el Toolkit (`Ctrl+P` -> Abrir).
2. Ve a la pestaña **Exportar**.
3. Selecciona los proyectos y tipos de nodos que deseas exportar.
4. Haz clic en **Exportar JSON**.

## Migración desde versiones anteriores

Si vienes de usar `discourseGraphElemental` o `roamDiscourseSelector` por separado:
- Este plugin usa nuevas claves de configuración para no interferir con los anteriores.
- Deberás volver a configurar tus templates y lista de proyectos en el nuevo menú.
- Tus nodos existentes **seguirán funcionando** y serán detectados por el exportador siempre que el "Nombre del Campo de Proyecto" coincida.

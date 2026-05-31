# Discourse Graph Toolkit

**Versi├│n:** 1.5.53
**Autor:** Camilo Luvino

## Descripci├│n

Discourse Graph Toolkit es un plugin para **Roam Research** que facilita la creaci├│n, organizaci├│n y exportaci├│n de grafos de discurso acad├®mico. Posee una interfaz minimalista y moderna basada en un sistema de dise├▒o de utilidades CSS, optimizado para la claridad visual. Permite estructurar investigaciones usando cuatro tipos de nodos: **GRI (Grupos de Investigaci├│n)**, **Preguntas (QUE)**, **Afirmaciones (CLM)** y **Evidencias (EVD)**.

El toolkit est├í dise├▒ado para investigadores y acad├®micos que utilizan Roam Research para desarrollar argumentos estructurados, gestionar literatura y producir documentos exportables. Lo que lo hace ├║nico es su flexibilidad jer├írquica: puedes organizar preguntas dentro de grupos (GRI), o tratar a ambos como puntos de entrada independientes al grafo.

## Caracter├¡sticas Principales

### 1. Creaci├│n R├ípida de Nodos
Convierte cualquier bloque de texto en un nodo estructurado con atajos de teclado:

| Atajo | Tipo de Nodo |
|-------|--------------|
| `Ctrl+Shift+Q` | Pregunta (QUE) |
| `Ctrl+Shift+C` | Afirmaci├│n (CLM) |
| `Ctrl+Shift+E` | Evidencia (EVD) |

Cada nodo se crea como una p├ígina con la estructura definida en tus templates personalizables.

### 2. Gesti├│n de Proyectos
Organiza tu investigaci├│n en proyectos separados:
- Crea y gestiona proyectos desde la pesta├▒a **Proyectos**.
- Asigna nodos autom├íticamente al proyecto activo.
- Sincroniza proyectos con una p├ígina dedicada en Roam.
- Descubre proyectos existentes en el grafo con "Buscar Sugerencias".
- **Auto-descubrimiento:** Al abrir el Toolkit, detecta proyectos no registrados y muestra una alerta para agregarlos con un clic.
- **Ignorar alertas:** Permite descartar permanentemente proyectos de la alerta autom├ítica (Lista de Ignorados), con opci├│n de restaurarlos desde la pesta├▒a Proyectos.
- **Match jer├írquico:** Al exportar, seleccionar un proyecto padre autom├íticamente incluye todos sus sub-proyectos (ej. `tesis/marco` incluye `tesis/marco/epistemolog├¡a`).

### 3. Verificaci├│n de Coherencia (Ramas)
Verifica la consistencia de tus ramas de investigaci├│n:
- Detecta nodos con `Proyecto Asociado::` diferente al de la pregunta ra├¡z.
- Identifica nodos sin proyecto asignado.
- **Verificaci├│n jer├írquica inteligente:** Cada nodo debe ser igual o m├ís espec├¡fico que su padre directo, **salvo en referencias inter-proyectos expl├¡citas**. El sistema detecta autom├íticamente cuando un nodo pertenece leg├¡timamente a otro proyecto y lo trata como una referencia cruzada v├ílida en lugar de marcarlo como un error de coherencia.
- **Validaci├│n de P├íginas Contenedoras:** Agrupa las preguntas bajo sus respectivas p├íginas contenedoras (ej. `tesis/cap├¡tulo1/grafoDeDiscurso`) y verifica que el `Proyecto Asociado::` del contenedor sea el mismo (o la ra├¡z) de los nodos que contiene.
- **Namespaces jer├írquicos:** Soporta sub-proyectos como `tesis/marco/metodolog├¡a`.
- **Exclusi├│n de relaciones horizontales:** Las conexiones v├¡a `#RelatedTo` son ignoradas por el validador de ramas para evitar ruidos de coherencia en enlaces laterales.
- **Vista de ├írbol jer├írquico:** Agrupa las preguntas por namespace de proyecto con indicadores de estado agregados.
- **Resumen Interactivo:**
  - **­ƒÅø´©Å Badge de Contenedor:** Muestra el n├║mero de desalineamientos entre preguntas y sus p├íginas maestras. Al hacer clic, abre un popover interactivo que lista las discrepancias y permite navegar directamente a la p├ígina contenedora para su correcci├│n.
  - **ÔÜá´©Å/ÔØî Badges de Rama:** Permiten filtrar el ├írbol o abrir popovers detallados para navegaci├│n r├ípida.
- **Selector Maestro:** Incluye un checkbox "Seleccionar Todos" para habilitar o deshabilitar auditor├¡as masivas de proyectos con un solo clic.
- **Selecci├│n Profunda:** Permite seleccionar ramas y sub-proyectos en cualquier nivel de profundidad (Nivel 2, 3, 4+) para auditor├¡as focalizadas, eliminando la restricci├│n previa de los primeros dos niveles.
- **Propagaci├│n inteligente unificada:**
  - `­ƒöä Propagar` ÔÇö Bot├│n ├║nico que corrige autom├íticamente todas las inconsistencias de la rama. Aplica el proyecto del QUE a nodos sin proyecto o diferentes, y hereda del padre en caso de generalizaciones.
- **UI Limpia:** Secciones colapsables por tipo de error y detalles t├®cnicos accesibles v├¡a hover (tooltips).

### 3.5 Favoritos por Namespace (Ramas y Exportar)
Guarda y recupera configuraciones de selecci├│n r├ípida con nombres generados autom├íticamente:
- **Nombre autom├ítico por namespace:** Al guardar un favorito, el nombre se genera desde el ancestro com├║n de los proyectos seleccionados (ej. `Filosof├¡a/├ëtica`).
- **Sobrescritura autom├ítica:** Si ya existe un favorito con el mismo namespace, se actualiza silenciosamente (sin duplicados).
- **Disponible en pesta├▒as Ramas y Exportar:** Cada pesta├▒a guarda su propio conjunto de favoritos.

### 4. Exportaci├│n Multi-Formato
Exporta tus grafos de discurso en m├║ltiples formatos:
- **JSON Nativo:** Compatible con el formato de Roam Research.
- **HTML:** Documento interactivo con estilos, navegaci├│n y reordenamiento.
- **Markdown:** Formato estructurado con bullets e indentaci├│n.
- **MD Plano:** Markdown sin bullets, ideal para conversi├│n a otros formatos.
- **Profundidad Recursiva Ilimitada:** Los exportadores de Markdown, HTML y EPUB ahora soportan anidaci├│n infinita de afirmaciones (CLM) y evidencias (EVD). Ya no existe un l├¡mite fijo de niveles; el sistema recorre toda la rama de discurso respetando las relaciones `#SupportedBy`.
- **EPUB:** Libro electr├│nico con generador nativo. Cuenta con **├ìndice Jer├írquico Profundo (ToC Interactivo)** y **numeraci├│n jer├írquica din├ímica** para cualquier nivel (ej. `1.2.1.2.1. `), preservando el contexto del discurso en lecturas lineales.
- **Opciones de Formato para Impresi├│n (NUEVO):**
  - **Agrupaci├│n por Namespaces:** Genera autom├íticamente encabezados de secci├│n (`# T├¡tulo`) basados en la jerarqu├¡a de proyectos, omitiendo el proyecto ra├¡z para mayor claridad (ej. de `tesis/marco` extrae `# Marco`).
  - **Ocultar etiquetas de nodo:** Permite eliminar los prefijos `[[QUE]]`, `[[CLM]]`, etc., para obtener un texto m├ís limpio y profesional en documentos finales.
  - **Numeraci├│n Jer├írquica:** A├▒ade numeraci├│n de estilo acad├®mico (1., 1.1., 1.1.1.) a los nodos, facilitando la referencia estructural en el documento impreso.
- **HTML:** Documento interactivo con profundidad din├ímica. Los niveles superiores a 6 mantienen la jerarqu├¡a visual mediante indentaci├│n CSS progresiva.
- **Markdown:** Indentaci├│n bulleted infinita en exportaci├│n est├índar y headings jer├írquicos `#` din├ímicos.

- **Selector de Proyectos Jer├írquico:** Los proyectos se muestran en un ├írbol colapsable. Seleccionar un padre selecciona autom├íticamente todos los sub-proyectos (selecci├│n en cascada).
- **Reordenamiento Centralizado:** Gestiona el orden de tus preguntas (QUE) y sub-proyectos (GRI) directamente desde la pesta├▒a **Panor├ímica** mediante Drag & Drop. El orden personalizado se persiste en `localStorage` y se aplica autom├íticamente a todos los formatos de exportaci├│n (JSON, HTML, Markdown, EPUB).

### 5. Vista Panor├ímica Simplificada (Solo Nodos Ra├¡z)
Vista sint├®tica de todas las ramas del grafo mostrando ├║nicamente los nodos ra├¡z (QUE y GRI) como filas planas:
- **Vista Limpia:** Muestra solo preguntas (QUE) y grupos (GRI) como filas individuales con su badge de tipo y proyecto asociado.
- **Drag & Drop Nativo:** Reordena nodos ra├¡z arrastr├índolos libremente. El orden se persiste instant├íneamente por proyecto/sub-proyecto.
- **Agrupaci├│n Autom├ítica:** Al seleccionar un proyecto padre (ej. `tesis`), los nodos se agrupan en bloques por sub-proyecto inmediato (ej. `tesis/marco`, `tesis/metodo`).
- **Reordenamiento por Bloques:** Los sub-proyectos se pueden arrastrar como unidades completas. El orden entre bloques se guarda en el proyecto padre y rige la estructura de exportaci├│n.
- **Navegaci├│n Fluida:** Cada bloque incluye un bot├│n de navegaci├│n r├ípida (`ÔåÆ`) para profundizar en ese sub-proyecto.
- **Foco Estructural:** Los nodos inferiores (CLM, EVD) ya no se renderizan en esta vista para mantener la claridad en la organizaci├│n de alto nivel.

### 6. Optimizaciones de Rendimiento y Estabilidad (v1.5.42 - v1.5.45)
Se ha realizado una auditor├¡a de calidad integral y refactorizaci├│n del motor interno:
- **Optimizaci├│n Cr├¡tica de Exportaci├│n (v1.5.45):** Se redise├▒├│ la consulta Datalog fundamental (`findPagesWithProject`) para utilizar los ├¡ndices de referencias nativos de Roam (`:block/refs`) en lugar de escaneos de texto completo (`clojure.string/includes?`). Esto reduce dr├ísticamente el tiempo de carga del proceso de exportaci├│n, pasando de segundos/minutos a milisegundos en grafos grandes.
- **Seguridad (SRI):** Se agreg├│ verificaci├│n de integridad hash (SRI) en la carga din├ímica de dependencias (JSZip) para prevenir vulnerabilidades de cadena de suministro (supply-chain).
- **Seguridad (XSS):** Implementaci├│n de una capa estricta de escape HTML en los generadores de exportaci├│n para t├¡tulos de nodos y metadatos, previniendo la inyecci├│n de c├│digo malicioso.
- **Deduplicaci├│n O(1):** El mapeo de relaciones ahora utiliza `Set` internamente en lugar de b├║squedas `Array.includes()`, eliminando cuellos de botella de complejidad O(N┬▓) en grafos con cientos de conexiones.
- **Backtracking Eficiente:** Las funciones de relevancia jer├írquica ahora utilizan un ├║nico `Set` compartido con backtracking, reduciendo el uso de memoria de complejidad exponencial a lineal (evita miles de copias de objetos en grafos profundos).
- **Batching de Dependencias:** El cargador de la Vista Panor├ímica ahora acumula todas las referencias faltantes y las solicita en una sola llamada por nivel, reduciendo dr├ísticamente los round-trips a la API de Roam.
- **Memoizaci├│n de Estad├¡sticas:** Los contadores de la UI se calculan ahora en un solo pase (O(N)) y se memoizan para evitar iteraciones redundantes en cada renderizado.
- **Persistencia de Cache:** Sistema de cache de relevancia basado en `useRef` para evitar invalidaciones innecesarias y mejorar la fluidez de navegaci├│n en la Vista Panor├ímica.

### 7. Importaci├│n
Restaura copias de seguridad o importa grafos de otros usuarios sin sobrescribir elementos existentes.

## Instalaci├│n

### Opci├│n A: Instalaci├│n con Actualizaciones Autom├íticas (Recomendado)

Esta opci├│n carga el plugin desde GitHub Pages. Solo necesitas configurarlo una vez por grafo y recibir├ís actualizaciones autom├íticamente.

1. Crea una p├ígina en Roam Research (ej. `[[roam/js/discourse-toolkit]]`).
2. Crea un bloque hijo con `{{[[roam/js]]}}`.
3. Dentro, crea un bloque de c├│digo JavaScript.
4. Pega el siguiente c├│digo:

```javascript
var s = document.createElement('script');
s.src = 'https://camiloluvino.github.io/discourseGraphToolkit/discourse-graph-toolkit.js';
s.type = 'text/javascript';
document.head.appendChild(s);
```

5. Confirma con "Yes, I know what I'm doing".
6. Recarga Roam.

> **Nota:** Cada vez que actualice el plugin en GitHub, todos tus grafos recibir├ín la nueva versi├│n autom├íticamente al recargar Roam.

### Opci├│n B: Instalaci├│n Manual

Si prefieres tener control total sobre la versi├│n del plugin:

1. Crea una p├ígina en Roam Research (ej. `[[roam/js/discourse-toolkit]]`).
2. Crea un bloque hijo con `{{[[roam/js]]}}`.
3. Dentro, crea un bloque de c├│digo JavaScript.
4. Copia y pega el contenido completo de `discourse-graph-toolkit.js`.
5. Confirma con "Yes, I know what I'm doing".
6. Recarga Roam.

## Uso B├ísico

### Abriendo el Toolkit
1. Abre la paleta de comandos (`Ctrl+P`).
2. Busca **"Discourse Graph Toolkit: Abrir"**.

### Pesta├▒as disponibles

| Pesta├▒a | Funci├│n |
|---------|---------|
| **Proyectos** | Gestiona proyectos, valida existencia, busca sugerencias |
| **Ramas** | Verifica coherencia de `Proyecto Asociado::` en todas las ramas |
| **Nodos** | Gesti├│n y b├║squeda de nodos hu├®rfanos sin proyecto ni conexiones |
| **Panor├ímica** | Vista sint├®tica y pulida de todas las ramas del grafo con dise├▒o unificado |
| **Exportar** | Exporta nodos a JSON, HTML, Markdown o EPUB |
| **Importar** | Importa grafos desde archivos JSON |

### Creando Nodos
1. Escribe tu idea en un bloque.
2. Presiona el atajo correspondiente (ej. `Ctrl+Shift+Q`).
3. El bloque se convierte en un enlace a una nueva p├ígina estructurada.

### Exportando
1. Abre el Toolkit.
2. Ve a la pesta├▒a **Exportar**.
3. Selecciona proyectos y tipos de nodos.
4. Haz clic en el formato deseado: JSON, HTML, Markdown, MD Plano o EPUB.

## Estructura del Proyecto

```
discourseGraphToolkit/
Ôö£ÔöÇÔöÇ src/
Ôöé   Ôö£ÔöÇÔöÇ config.js              # Configuraci├│n y constantes
Ôöé   Ôö£ÔöÇÔöÇ state.js               # Gesti├│n de almacenamiento
Ôöé   Ôö£ÔöÇÔöÇ index.js               # Inicializaci├│n
Ôöé   Ôö£ÔöÇÔöÇ api/                   # M├│dulos de Roam API (por dominio)
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ roamProjects.js    # Gesti├│n de proyectos en Roam
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ roamSearch.js      # B├║squedas y queries
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ roamBranchVerification.js    # Verificaci├│n de ramas
Ôöé   Ôöé   ÔööÔöÇÔöÇ roamStructureVerification.js # Verificaci├│n de estructura
Ôöé   Ôö£ÔöÇÔöÇ core/                  # L├│gica de negocio
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ nodes.js           # Creaci├│n de nodos QUE/CLM/EVD
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ projects.js        # Gesti├│n de proyectos
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ export.js          # Exportaci├│n JSON
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ import.js          # Importaci├│n de datos
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ contentProcessor.js    # Procesamiento de contenido
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ relationshipMapper.js  # Mapeo de relaciones
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ markdownCore.js        # Core de Markdown (compartido)
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ markdownGenerator.js   # Generador Markdown
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ htmlGenerator.js       # Generador HTML (usa htmlEmbeddedScript.js)
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ htmlEmbeddedScript.js  # JavaScript inyectado en HTML exportado
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ epubGenerator.js       # Generador EPUB
Ôöé   Ôöé   ÔööÔöÇÔöÇ html/                  # Generadores auxiliares HTML
Ôöé   Ôöé       Ôö£ÔöÇÔöÇ htmlStyles.js      # Estilos embebidos en el HTML exportado
Ôöé   Ôöé       Ôö£ÔöÇÔöÇ htmlHelpers.js     # Helpers espec├¡ficos de renderizado HTML
Ôöé   Ôöé       ÔööÔöÇÔöÇ htmlNodeRenderers.js # Renderizadores de nodos individuales en HTML
Ôöé   Ôö£ÔöÇÔöÇ ui/                    # Componentes React de interfaz
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ modal.js           # Modal principal (compositor de Providers)
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ ToolkitContext.js  # React Context y hook useToolkit (legacy/wrapper)
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ contexts/          # Contextos de dominio
Ôöé   Ôöé   Ôöé   Ôö£ÔöÇÔöÇ NavContext.js        # Contexto de navegaci├│n de pesta├▒as
Ôöé   Ôöé   Ôöé   Ôö£ÔöÇÔöÇ ProjectsContext.js   # Contexto para gesti├│n de proyectos
Ôöé   Ôöé   Ôöé   Ôö£ÔöÇÔöÇ BranchesContext.js   # Contexto para validaci├│n de ramas
Ôöé   Ôöé   Ôöé   Ôö£ÔöÇÔöÇ ExportContext.js     # Contexto para exportaci├│n de datos
Ôöé   Ôöé   Ôöé   ÔööÔöÇÔöÇ PanoramicContext.js  # Contexto para la vista panor├ímica
Ôöé   Ôöé   Ôö£ÔöÇÔöÇ components/        # Componentes reutilizables
Ôöé   Ôöé   Ôöé   ÔööÔöÇÔöÇ ProjectTreeView.js  # ├ürbol jer├írquico con expand/collapse
Ôöé   Ôöé   ÔööÔöÇÔöÇ tabs/              # Componentes de pesta├▒as individuales
Ôöé   Ôöé       Ôö£ÔöÇÔöÇ ProjectsTab.js   # Gesti├│n de proyectos
Ôöé   Ôöé       Ôö£ÔöÇÔöÇ BranchesTab.js   # Verificaci├│n de ramas
Ôöé   Ôöé       Ôö£ÔöÇÔöÇ NodesTab.js      # Gesti├│n de nodos hu├®rfanos
Ôöé   Ôöé       Ôö£ÔöÇÔöÇ PanoramicTab.js  # Vista panor├ímica
Ôöé   Ôöé       Ôö£ÔöÇÔöÇ ExportTab.js     # Exportaci├│n
Ôöé   Ôöé       ÔööÔöÇÔöÇ ImportTab.js     # Importaci├│n
Ôöé   ÔööÔöÇÔöÇ utils/                 # Helpers y toast notifications
Ôöé       Ôö£ÔöÇÔöÇ helpers.js         # Helpers generales
Ôöé       Ôö£ÔöÇÔöÇ projectTreeUtils.js  # Utilidades de ├írbol de proyectos
Ôöé       ÔööÔöÇÔöÇ toast.js           # Notificaciones de toast
Ôö£ÔöÇÔöÇ ejemplos/                  # Ejemplos de exportaci├│n
Ôö£ÔöÇÔöÇ build.ps1                  # Script de build
ÔööÔöÇÔöÇ discourse-graph-toolkit.js # Bundle final
```

## Desarrollo

El proyecto usa un sistema de build por concatenaci├│n. Para generar el bundle:

```powershell
.\build.ps1
```

Para verificar sintaxis:
```powershell
node -c discourse-graph-toolkit.js
```

## Licencia

Uso personal. Proyecto individual para investigaci├│n acad├®mica.

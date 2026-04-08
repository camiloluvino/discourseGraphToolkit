# Estado del Proyecto — Discourse Graph Toolkit

**Última actualización:** 2026-04-07

## Versión Actual

**v1.5.38**

## Estado de Funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| **Nodos GRI (NUEVO)** | ✅ Estable | Grupos de Investigación con relación `#Contains` |
| Creación de nodos (QUE/CLM/EVD) | ✅ Estable | Atajos Ctrl+Shift+Q/C/E |
| Gestión de proyectos | ✅ Estable | Crear, asignar, sincronizar con Roam |
| Auto-descubrimiento de proyectos | ✅ Estable | Alerta al abrir Toolkit si hay proyectos no registrados |
| Match jerárquico de proyectos | ✅ Estable | Al exportar, proyecto padre incluye sub-proyectos |
| Verificación de coherencia (Ramas) | ✅ Mejorado | Unificación de propagación, soporte para selección masiva y rediseño |
| Gestión de nodos huérfanos | ✅ Mejorado | Pestaña independiente "Nodos" dedicada a la limpieza del grafo |
| **Vista Panorámica** | ✅ Muy Mejorado | Soporta anidación profunda, escaneo de proyectos en todos los niveles y filtrado selectivo de ramas |
| Exportación JSON | ✅ Estable | Formato nativo de Roam |
| Exportación HTML | ✅ Estable | Documento interactivo con soporte GRI y profundidad recursiva |
| Exportación Markdown | ✅ Mejorado | Soporta sub-proyectos con solo CLM/EVD (sin QUE/GRI propio) |
| Exportación EPUB | ✅ Mejorado | ToC profundo dinámico (soporta cualquier nivel jerárquico) |

### v1.5.38 (Abril 2026)
- **Feature: Selector Maestro en Coherencia de Ramas.**
  - **Checkbox "Seleccionar Todos":** Se añadió un control global en la pestaña "Ramas" para marcar o desmarcar todos los proyectos de una vez.
  - **Lógica Jerárquica Reforzada:** El sistema ahora reconoce y selecciona automáticamente todas las rutas intermedias de los proyectos (ej. si existe `tesis/marco/analisis`, el sistema asegura que `tesis` y `tesis/marco` también estén en el set de selección). Esto soluciona bugs visuales donde carpetas automáticas aparecían desmarcadas a pesar de tener hijos seleccionados.
  - **Carga Predeterminada:** Al iniciar el Toolkit, todos los proyectos (incluyendo carpetas raíz y nodos sin proyecto) vienen seleccionados por defecto para facilitar una auditoría inmediata.

### v1.5.37 (Abril 2026)
- **Fix: Prevención de Re-aparición de Proyectos Eliminados.**
  - **Filtrado en Sincronización Inicial:** Se modificó `initializeProjectsSync` para que ignore los proyectos en la "Lista de Ignorados" al realizar la unión con los datos de Roam. Esto evita que proyectos borrados localmente resuciten si la página de Roam aún no se ha actualizado.
  - **Auto-clasificación como Ignorado:** Al eliminar un proyecto (ya sea individualmente o en bloque), el sistema ahora lo agrega automáticamente a la lista de ignorados.
  - **Sincronización Atómica:** Mejora en el flujo de borrado para asegurar que la decisión del usuario prevalezca sobre los datos persistidos en el grafo durante el arranque del plugin.

### v1.5.36 (Abril 2026)
- **Feature: Control de Proyectos No Registrados (Lista de Ignorados).**
  - **Persistencia de Descarte:** Al presionar "X" en la alerta de proyectos no registrados, los proyectos se guardan en una lista de exclusión local (`dismissed_projects`).
  - **Silencio Inteligente:** El auto-descubrimiento ahora filtra los proyectos ignorados, evitando alertas recurrentes por bloques "huérfanos" en el grafo.
  - **Panel de Control:** Nueva sección en la pestaña "Proyectos" para visualizar y restaurar proyectos ignorados.
  - **Sincronización Reforzada:** El merge de proyectos ahora respeta la lista de ignorados, evitando que se re-introduzcan proyectos eliminados si la sincronización con Roam está desfasada.
  - **Limpieza Automática:** Al añadir un proyecto manualmente (o mediante sugerencias), el sistema lo remueve automáticamente de la lista de ignorados.

- **UI/UX: Rediseño y Unificación de Coherencia de Ramas.**
  - **Unificación de Botones:** Se fusionaron "Propagar raíz" y "Heredar de padres" en un único botón inteligente **"🔄 Propagar"**. El sistema ahora determina automáticamente si aplicar el proyecto raíz (para diferencias y omisiones) o el proyecto del padre directo (para generalizaciones).
  - **Rediseño del Panel de Detalles:** Se eliminaron badges redundantes y se implementó un layout horizontal más compacto.
  - **Secciones Colapsables:** Los nodos problemáticos ahora se agrupan en acordeones (`details`) separados por tipo de error ("Diferencias" vs "Sin proyecto"), reduciendo la carga cognitiva.
  - **Tooltips Contextuales:** Se movió la información técnica ("Debería heredar: X | Tiene: Y") a tooltips tipo hover, limpiando la lista visual de nodos.
  - **Refactor de Handlers:** Optimización de la lógica de negocio en `BranchesTab.js` para manejar la propagación atómica de múltiples tipos de inconsistencias.

### v1.5.35 (Marzo 2026)
- **Refactor: Arquitectura de Estado Basada en Dominios (Desacoplamiento Crítico).**
  - **Eliminación del God Object:** Se refactorizó completamente `modal.js` para eliminar 30 `useState` hooks que centralizaban todo el estado del plugin.
  - **Múltiples Contextos de Dominio:** Implementación de 5 nuevos contextos React independientes (`NavContext`, `ProjectsContext`, `BranchesContext`, `ExportContext`, `PanoramicContext`).
  - **Eliminación de Re-renders Masivos:** Las pestañas ahora solo se suscriben a los datos que necesitan. Se eliminaron cientos de re-renders innecesarios en paneles complejos como Panorámica y Ramas.
  - **Estado Local Puro:** Las pestañas de "Nodos" e "Importar" migran a `useState` local, desacoplándose totalmente del ciclo de vida de otros componentes.
  - **Fix: Contaminación de Status:** Se separó el estado `exportStatus` en múltiples estados locales, evitando que el progreso de una pestaña se muestre en otra.
  - **Build Optimizado:** Actualizado el script de ensamblaje para gestionar la inyección de contextos en el orden de dependencia correcto.

### v1.5.34 (Marzo 2026)
- **UI/UX: Corrección de espacio en blanco en Exportar y Nodos.**
  - **Flexbox Optimization:** Se rediseñó la estructura de contenedores de las pestañas "Exportar" y "Nodos" para que ocupen todo el espacio disponible dentro del modal.
  - **Eliminación de Gaps:** Se eliminaron las alturas fijas restrictivas en las listas de proyectos, permitiendo que la interfaz "respire" y se adapte al tamaño de la pantalla del usuario sin dejar grandes áreas vacías.
  - **Modal Fix:** Se corrigió el contenedor central en `Modal.js` para asegurar que las pestañas hereden correctamente el comportamiento flexible del layout principal.

### v1.5.33 (Marzo 2026)
- **Fix: Exportación de sub-proyectos sin nodos QUE/GRI propios.**
  - Cuando un sub-proyecto (ej. `tesis/afectos/definiciones/Ahmed`) contiene solo nodos CLM y EVD, la exportación ahora encuentra automáticamente los nodos QUE/GRI padre que los referencian.
  - **Reverse-Lookup Datalog:** Nueva función `findParentRootNodes` que traza las referencias hacia arriba (CLM → QUE) usando `block.refs` en Roam.
  - **Fallback en Export:** Si `prepareExportData` no encuentra nodos raíz (QUE/GRI) entre las páginas del proyecto, ejecuta el reverse-lookup, carga los padres, reconstruye las relaciones y genera el markdown correctamente.
  - **Preview consistente:** La misma lógica de fallback se aplica en `handlePreview`, mostrando correctamente el conteo de nodos raíz descubiertos.

### v1.5.32 (Marzo 2026)
- **Vista Panorámica: Escaneo de Proyectos y Filtrado de Ramas.**
  - **Detección Profunda:** El filtro de proyectos ahora escanea todos los nodos cargados (CLMs, EVDs, GRIs, QUEs) y no solo los nodos raíz. Esto permite filtrar por proyectos muy específicos que solo aparecen en niveles profundos.
  - **Filtrado Recursivo de Ramas:** Al seleccionar un proyecto, la vista ahora filtra dinámicamente el árbol para mostrar solo las ramas que contienen nodos relevantes a ese proyecto, ocultando el ruido del resto del grafo.
  - **Optimización de UI:** El contador del dropdown refleja ahora el total de nodos encontrados en todos los niveles para cada proyecto.

### v1.5.31 (Marzo 2026)
- **UI/UX: Migración al Design System (dgt-*) en Vista Panorámica.**
  - **Eliminación de Estilos Inline:** Se refactorizó completamente `PanoramicTab.js` para eliminar cientos de líneas de estilos inline, sustituyéndolos por clases utilitarias del sistema de diseño global.
  - **Consistencia Visual:** La Vista Panorámica ahora utiliza la misma paleta de colores, tipografía (Inter/Lora) y espaciado que la pestaña de Ramas, logrando una estética unificada y profesional.
  - **Nuevas Utilidades en styles.js:** Se agregaron clases específicas (`.dgt-panoramic-*`) para manejar la representación jerárquica (líneas de rama, márgenes de árbol) sin depender de hacks de estilo en el componente.
  - **Eliminación de Ruido Visual:** Se quitaron los iconos redundantes (`📌`, `📎`, `📝`, `📂`) y los conectores ASCII (`├─`, `└─`) de los títulos de los nodos.
  - **Identación Estructural:** Nuevas líneas guía sutiles (`border-left`) y márgenes limpios para representar la jerarquía del árbol de forma profesional.
  - **Calma Tipográfica:** Se eliminaron los fondos coloreados invasivos en el texto. Ahora el contenido es gris oscuro/negro neutro sobre fondo blanco, mejorando drásticamente la lectura de textos largos.
  - **Badges de Tipo:** Se unificó el uso de etiquetas de tipo compactas y coloreadas para mantener la semántica visual.
  - **Markdown Bold:** Soporte nativo para visualizar negritas (`**asteriscos**` o `__guiones__`) en los títulos de los nodos.

### v1.5.30 (Marzo 2026)
- **UI/UX: Mejora en Revisión de Nodos (Pestaña Ramas).**
  - **Filtros Rápidos:** Al hacer clic en las insignias de error (`⚠️` o `❌`) en la barra de resumen, el árbol de proyectos se filtra automáticamente para mostrar solo las ramas afectadas.
  - **Auto-expansión:** Al activar un filtro, los proyectos que contienen errores se expanden automáticamente para revelar los nodos problemáticos.
  - **Indicadores en Carpetas:** Los proyectos (carpetas) ahora muestran iconos `⚠️` o `❌` si contienen alguna rama con errores, incluso cuando están contraídos. Esto permite identificar rápidamente qué áreas requieren atención.
  - **Interacción Mejorada:** Se rediseñó el comportamiento de los badges para facilitar la navegación fluida entre el diagnóstico y la corrección.

### v1.5.29 (Marzo 2026)
- **Fix: Carga y Mapeo Recursivo en Panorámica (Deep Nesting).** 
  - Se implementó un algoritmo de búsqueda recursiva en el árbol de bloques para identificar relaciones (`#SupportedBy`, `#RespondedBy`, etc.) incluso cuando están anidadas profundamente dentro de otros bloques en la misma página.
  - Se actualizó el cargador de datos para realizar hasta 5 niveles de peticiones iterativas, asegurando que todos los nodos referenciados en niveles inferiores sean descargados e integrados en el mapa de relaciones.
  - Esto soluciona definitivamente el problema donde la Vista Panorámica se "detenía" en el Nivel 2, permitiendo ahora visualizar ramas completas (Niveles 3, 4, 5+) de forma fluida.

### v1.5.28 (Marzo 2026)
- **Fix: Alineación de Popovers en Pestaña Ramas.** Se corrigió un problema visual donde los popovers de advertencia se cortaban. Ahora se alinean correctamente (`left: 0`).

### v1.5.27 (Marzo 2026)
- **Fix: Carga de Datos Recursiva en Panorámica y Exportación.**
  - Se implementó un bucle de carga iterativa para asegurar que todos los descendientes directos e indirectos (vinculados por `#SupportedBy`, `#RespondedBy`, `#RelatedTo` o `#Contains`) sean traídos de Roam independientemente de su profundidad.
  - Esto soluciona el problema donde los "nietos" o niveles inferiores de una rama no aparecían en la Vista Panorámica ni en los archivos de exportación.
  - Se incluyó un límite de seguridad de profundidad (Nivel 10) para prevenir bucles infinitos en caso de referencias circulares en el grafo.
  - Mejora de los mensajes de estado durante la carga ("Cargando X nodos (nivel Y)...") para dar visibilidad total al proceso de extracción profunda.

### v1.5.26 (Febrero 2026)
- **UI/UX: Anidación Profunda Interactiva en Panorámica.**
  - Implementación de renderizado recursivo N-niveles para todos los tipos de nodos (`GRI`, `QUE`, `CLM`, `EVD`).
  - **Nodos Colapsables:** Cualquier nodo anidado con hijos ahora incluye botones `▼`/`▶` y es expansible de forma independiente.
  - **Navegación Deshabilitada:** Se eliminó la navegación a la página de Roam al hacer clic para favorecer la interactividad de expansión/colapsado dentro de la misma vista.
  - **Mejora Visual:** Alineación horizontal fija mediante fuentes monospace y contenedores flex sin wrap para los conectores del árbol (`├─`, `└─`), asegurando una jerarquía visual limpia.
  - **Expandir Todo:** El botón global ahora expande recursivamente todos los niveles del grafo de manera inteligente.

### v1.5.25 (Febrero 2026)
- **Feature: Soporte para GRI → #Contains → EVD.** Se actualizó el mapper de relaciones para que los nodos de tipo `[[EVD]]` sean reconocidos como contenidos válidos dentro de un `[[GRI]]` mediante la etiqueta `#Contains`. Esto permite una organización jerárquica más profunda, permitiendo que un grupo contenga directamente evidencias o que sub-grupos organizadores las agrupen. Las capas de exportación (Markdown, HTML, EPUB) ya reflejan este cambio automáticamente.

### v1.5.24 (Febrero 2026)
- **Fix: Duplicación en Exportar.** Se implementó una lógica de filtrado de nodos hijos en la pestaña Exportar (similar a la Panorámica). Ahora, el Toolkit detecta si un GRI está contenido en otro grupo seleccionado para omitirlo de la lista raíz y evitar duplicados en el archivo final.
- **Improvement: Respuestas recursivas en Markdown.** Se actualizó `markdownCore.js` para que los nodos `[[QUE]]` exportados como hijos (ej. dentro de un GRI) incluyan correctamente sus respuestas (`CLM` y `EVD`). La función `renderNodeTree` ahora detecta el tipo de nodo y procesa las relaciones específicas de las preguntas.

### v1.5.23 (Febrero 2026)
- **Feature: Soporte GRI en Coherencia de Ramas.** La pestaña "Ramas" ahora procesa tanto nodos `[[QUE]]` como `[[GRI]]` como puntos de origen para la verificación de coherencia. Esto permite que proyectos organizados puramente bajo nodos de Grupo sean visibles y auditables en esta pestaña.
- **UI: Generalización de Etiquetas en Ramas.** Se actualizaron las etiquetas ("X preguntas" → "X ramas") y la lógica de limpieza de títulos para soportar ambos tipos de nodos raíz.
- **UI: Badges de Tipo en Panorámica.** Se agregaron etiquetas visibles (`QUE`, `GRI`, `CLM`) junto al título de los nodos en la Vista Panorámica para una identificación inmediata.
- **Lógica: Jerarquía de Contención Respectuosa.** Los nodos GRI o QUE que ya están contenidos dentro de un nodo GRI (vía `#Contains`) ahora se filtran de la lista raíz principal en la Panorámica.

### v1.5.22 (Febrero 2026)
- **Feature: Nodos GRI y relación #Contains.** Implementación de un nuevo tipo de nodo organizativo (GRI) que permite agrupar otros nodos mediante la etiqueta `#Contains`.
- **Arquitectura: Intercambiabilidad de Nodos Raíz.** Se eliminó el presupuesto de que `QUE` es siempre la raíz. Ahora tanto `GRI` como `QUE` funcionan como puntos de entrada equivalentes en la Vista Panorámica y en todos los formatos de exportación.
- **UI: Soporte Visual para GRI.** En la Panorámica, los GRI se distinguen con un borde púrpura, icono de carpeta (📂) y una visualización indentada de sus contenidos.
- **Exportación:** Soporte transversal para la jerarquía `GRI → QUE → CLM → EVD` en HTML, Markdown y EPUB.

### v1.5.21 (Febrero 2026)
- **Feature: Pestaña Independiente de Nodos.** Se ha extraído la funcionalidad de búsqueda de huérfanos de la pestaña "Ramas" a una nueva pestaña dedicada llamada "Nodos".
- **UI/UX: Rediseño de la Gestión de Huérfanos.** Los resultados de búsqueda ahora se muestran en una lista de tarjetas clara y espaciosa, eliminando el uso de popovers pequeños y mejorando la usabilidad.
- **Refactoring:** Separación de responsabilidades en el código UI (`NodesTab.js`) y simplificación de `BranchesTab.js`.
- **Build:** Actualizado el script de ensamblaje para incluir el nuevo módulo de pestañas.

### v1.5.20 (Febrero 2026)
- **UI/UX: Adaptación Estética Global.** Inyección de diseño minimalista inspirado en Claude (`styles.js`) como CSS global del toolkit. El toolkit utiliza ahora una paleta sobria "off-white", tipografía moderna y variables de diseño unificadas.
- **UI/UX: Mejoras en Popovers (Huérfanos / Sin Proyecto).**
  - Aumentadas dimensiones (ancho máximo) para mejor legibilidad.
  - Implementado truncado de texto inteligente vía CSS (elipsis) eliminando cortes arbitrarios.
  - Limpieza automática de títulos: se remueven prefijos `[[QUE]]` y corchetes `[[ ]]` para una vista más limpia.
  - Añadido soporte nativo para tooltips con el nombre completo al pasar el mouse.
- **UI/UX: Refactor de Pestañas (Ramas y Proyectos).** Eliminación masiva de estilos en línea en favor de clases utilitarias (`.dgt-flex`, `.dgt-card`, etc.). Esto unifica la apariencia de árboles jerárquicos, botones y badges en todo el sistema.
- **Build:** Actualización de compilación de `discourse-graph-toolkit.js` asegurando que todos los componentes utilicen el nuevo sistema de estilos globales.

### v1.5.18 (Febrero 2026)
- **UI/UX: Rediseño de Pestaña Ramas.** Implementado un layout más compacto que elimina el "efecto partido de tenis", acercando los contadores de nodos al título.
- **UI/UX: Limpieza de Jerarquía.** Las rutas de proyectos anidados en el árbol ahora solo muestran el nombre final (`split('/').pop()`), reduciendo drásticamente el ruido visual. La ruta completa es visible mediante `title` (tooltip).
- **UI/UX: Parseo de Markdown.** Los títulos en la pestaña Ramas ahora parsean negritas (`**texto**`), mejorando la legibilidad.
- **UI/UX: Mejoras de Contraste y Semántica.**
  - Botón "Verificar" renombrado a "🔄 Procesar" con icono semántico.
  - Añadidos tooltips descriptivos a todos los badges y botones principales.
  - Implementado *zebra striping* (fondos alternos) en el árbol jerárquico para mejor seguimiento visual de filas.
  - Aumentado el padding vertical para que la información "respire".

### v1.5.17 (Febrero 2026)
- **Fix:** Validación de proyectos ahora excluye namespaces puros (prefijos como `yo y mis temas`) que no se usan directamente como `Proyecto Asociado::`. Solo se validan los proyectos hoja o los que existen explícitamente en el grafo.
- **UX:** Botón "Eliminar No Encontrados" reemplazado por "☑️ Seleccionar No Encontrados" — ahora solo marca los checkboxes de los proyectos no encontrados para que el usuario pueda revisarlos antes de confirmar la eliminación con "Eliminar Seleccionados".

### v1.5.16 (Febrero 2026)
- **UI:** Rediseño completo de la Vista Panorámica. Implementado diseño tipo "tarjetas" (cards) para encapsular cada pregunta y sus ramas, separándolas visualmente del resto.
- **UI:** Reemplazada la antigua visualización de ramas (líneas basadas en texto `├─`, `└─`) por un sistema de indentación limpio y jerárquico que utiliza márgenes y bloques con bordes de color (verde para CLM, naranja para EVD).
- **UI:** Mejorado el Header de la pestaña Panorámica para evitar abarrotamiento (cluttering) de los controles, reubicando los indicadores de nodo y agrupando acciones.
- **UI:** Añadidas viñetas indicativas (`•`) a las opciones indentadas en los selectores jerárquicos de proyectos (Panorámica).

### v1.5.15 (Febrero 2026)
- **UI: Sistema de Temas (THEME).** Implementado `config.THEME.colors` para centralizar la paleta de colores (Primary, Success, Warning, Danger, Neutral) en todas las pestañas.
- **UI: Limpieza Visual.** Eliminados iconos decorativos de pestañas y modales para reducir ruido visual y profesionalizar la interfaz.
- **Fix:** Corregida referencia a variable global del tema que causaba crash en la pestaña Ramas.

### v1.5.14 (Febrero 2026)
- **Feature: Profundidad Recursiva Ilimitada.** Se eliminó el límite fijo de 4-5 niveles en Markdown, HTML y EPUB.
- **Refactor:** `markdownCore.js` ahora usa recursión pura para procesar la cadena CLM→CLM→CLM→...→EVD.
- **Refactor:** `htmlNodeRenderers.js` unificado en una sola función recursiva `renderNode`.
- **Feature:** EPUB soporta dinámicamente cualquier nivel de encabezado (H3+) y lo refleja en el ToC con numeración jerárquica profunda.
- **Tech:** Implementada detección de ciclos circulares y límites de seguridad (10 niveles) en los exportadores.

### v1.5.13 (Febrero 2026)
- **Feature:** Implementación de generación nativa de EPUB (eliminada dependencia externa `jEpub`).
- **Feature:** Índice Jerárquico Profundo (ToC Interactivo) en EPUB. Soporta navegación a Afirmaciones (CLM) y Evidencias (EVD) anidadas.
- **Feature:** Numeración jerárquica automática en EPUB (ej. `1.1.2.`) para retener el contexto del flujo del discurso en e-readers (Kindle, Apple Books).

### v1.5.12 (Febrero 2026)
- **Feature:** Cambio en la nomenclatura de los archivos exportados. Ahora usan el formato `DG_[nombre_proyecto]` utilizando el ancestro común más largo, en lugar de concatenar todas las ramas seleccionadas.

### v1.5.11 (Febrero 2026)
- **Fix:** Corregida la indentación visual en el dropdown de proyectos de la Vista Panorámica (ahora usa espacios de no-quiebre para respetar la jerarquía).

### v1.5.10 (Febrero 2026)
- **Fix:** Corregido bug visual en la pestaña Ramas donde los sub-proyectos con una sola pregunta no mostraban su encabezado de carpeta, causando que sus preguntas parecieran pertenecer a la rama anterior.

### v1.5.9 (Enero 2026)
- **Fix:** Exportación EPUB ya no retiene datos "stale" (rama anterior) al cambiar de proyecto sin actualizar la vista previa.

### v1.5.8 (Enero 2026)
- **Fix:** Corregido bug donde el orden de preguntas de Panorámica no se aplicaba en Export al seleccionar proyectos hijos
- **Tech:** `getProjectKey()` ahora calcula el ancestro común real de proyectos hermanos (no solo verifica si uno es prefijo de otro)

### v1.5.7 (Enero 2026)
- **Feature:** Detección de nodos huérfanos — nuevo botón "👻 Huérfanos" en pestaña Ramas
- **Feature:** Actualización automática de huérfanos — al presionar "Verificar", la lista de huérfanos se refresca si ya se había buscado
- **UI:** Rediseño de pestaña Ramas — header compacto con badges en esquina superior derecha
- **UI:** Eliminada descripción redundante, más espacio vertical para árbol de nodos (28rem)
- **Tech:** Nueva función `findOrphanNodes()` para detectar páginas QUE/CLM/EVD sin proyecto ni referencias

### v1.5.6 (Enero 2026)
- **UI:** Mejoras en pestaña Exportar — botones "Seleccionar todos" reubicados junto a los títulos y estilizados como enlaces.
- **UX:** Selección por defecto — al abrir la pestaña Exportar, todos los tipos (QUE, CLM, EVD) vienen seleccionados.

### v1.5.5 (Enero 2026)
- **UI:** Eliminada opción "Vista Previa" en pestaña Exportar (redundante con Panorámica)
- **Flow:** Flujo de exportación simplificado — selección directa de proyecto/tipo y descarga
- **Docs:** Actualizada referencia de reordenamiento (se realiza exclusivamente en Panorámica)

### v1.5.4 (Enero 2026)
- **Refactor:** Implementado React Context (`ToolkitContext.js`) para compartir estado entre pestañas
- **Tech:** Eliminado prop drilling — ~54 props removidos de `modal.js`
- **Tech:** Todos los tabs ahora usan `useToolkit()` hook para acceder al estado
- **Arquitectura:** modal.js ahora actúa solo como Provider, lógica de estado descentralizada

### v1.5.3 (Enero 2026)
- **Refactor:** Nuevo componente `ProjectTreeView.js` — extrae lógica duplicada de árboles jerárquicos
- **Tech:** Eliminadas ~90 líneas de código duplicado entre `BranchesTab.js` y `ExportTab.js`
- **Tech:** Lógica de expand/collapse ahora centralizada en componente reutilizable
- **Docs:** Actualizado `AI_INSTRUCTIONS.md` con nueva estructura de carpeta `ui/components/`

### v1.5.2 (Enero 2026)
- **UI:** Pestaña Ramas — simplificados indicadores del árbol a solo conteo de preguntas
- **UI:** Pestaña Ramas — textos de discordancia más claros: "Debería heredar:" / "Tiene:"
- **Fix:** Corregido bug en Exportar donde el orden personalizado de Panorámica no se aplicaba al seleccionar todo el proyecto (ahora usa prefijo común como clave)

### v1.5.1 (Enero 2026)
- **Feature:** Selección jerárquica de ramas en Panorámica — el dropdown ahora incluye grupos de prefijos (📁) además de ramas individuales (📄)
- **Feature:** Cache persistente para pestaña Panorámica — datos se restauran automáticamente al reabrir modal
- **UI:** Banner con antigüedad del cache y botón "Refrescar"
- **Fix:** Corregido bug de referencias circulares (`node.data = node`) que impedía serializar cache
- **Tech:** Funciones `savePanoramicCache` y `loadPanoramicCache` con limpieza/restauración de refs circulares
- **UI:** Nuevo layout de dos columnas — controles en esquina superior derecha
- **UI:** Textos de nodos ahora se muestran completos (sin truncar a 50 chars)
- **UI:** Controles más compactos para dar protagonismo a la lista de nodos

### v1.5.0 (Enero 2026)
- **Feature:** Nueva pestaña "Panorámica" — vista sintética de todas las ramas del grafo
- **UI:** Visualización compacta horizontal: QUE → CLM → EVD
- **UI:** Filtrado por proyecto
- **UI:** Estadísticas de nodos (preguntas, afirmaciones, evidencias)
- **UI:** Click en cualquier nodo navega a Roam
- **Fix:** Corregida lógica de botones "Expandir Todo" / "Colapsar Todo"

### v1.4.2 (Enero 2026)
- **Feature:** Vista de árbol jerárquico en pestaña Proyectos — organiza proyectos por namespace
- **UI:** Selección en cascada para eliminar múltiples proyectos
- **UI:** Validación de existencia mostrada en árbol con indicadores ✅/⚠️

### v1.4.1 (Enero 2026)
- **Feature:** Vista de árbol jerárquico en selector de proyectos de pestaña Exportar
- **UI:** Selección en cascada — marcar padre selecciona todos los hijos
- **UI:** Checkbox indeterminado cuando solo algunos hijos están seleccionados
- **UI:** Badge con conteo de proyectos seleccionados por carpeta

### v1.4.0 (Enero 2026)
- **Feature:** Vista de árbol jerárquico en pestaña Ramas — agrupa preguntas por namespace de proyecto
- **UI:** Proyectos colapsables con indicador de estado agregado (✅/🔀/⚠️/❌)
- **UI:** Muestra conteo de preguntas y problemas por proyecto
- **Tech:** Nuevo módulo `projectTreeUtils.js` con lógica de construcción de árbol

### v1.3.2 (Enero 2026)
- **UI:** Botones de propagación separados:
  - `🔄 Propagar raíz` — para nodos sin proyecto o con proyecto diferente
  - `⬆️ Heredar de padres` — para corregir generalizaciones

### v1.3.1 (Enero 2026)
- **Feature:** Verificación jerárquica padre-hijo — cada nodo debe tener proyecto igual o más específico que su padre directo
- **Feature:** Detección de generalización — cuando un hijo tiene proyecto menos específico que su padre
- **UI:** Muestra contexto del padre en errores: `⬆️ Generaliza: proyecto ← padre: proyecto/sub`

### v1.3.0 (Enero 2026)
- **Feature:** Namespaces jerárquicos en verificación de ramas — sub-proyectos como `proyecto/sub/detalle` son coherentes con `proyecto/sub`
- **Feature:** Propagación inteligente — respeta especializaciones existentes al propagar proyectos
- **UI:** Nueva categoría "🔀 Especializados" en pestaña Ramas para distinguir nodos con sub-namespaces

### v1.2.8 (Enero 2026)
- **Feature:** Filtrado de atributos `Proyecto Asociado::` escapados con backticks — evita que ejemplos en conversaciones de chatbot aparezcan como proyectos reales en "Buscar Sugerencias"
- **Docs:** Documentada restricción de Roam sobre triple backticks en `AI_INSTRUCTIONS.md`

### v1.2.7 (Enero 2026)
- **Feature:** Persistencia del orden de preguntas — el orden personalizado de QUEs se guarda por proyecto y se restaura automáticamente al reabrir

### v1.2.6 (Enero 2026)
- **Feature:** Espaciado visual en bloques estructurales EPUB — los bloques `*— texto —*` ahora tienen márgenes adicionales (1.2em) para mejor legibilidad

### v1.2.5 (Enero 2026)
- **Feature:** Prefijos de tipo de nodo en EPUB — los encabezados ahora muestran `[H2][QUE]`, `[H3][CLM]`, `[H4][EVD]` para indicar tanto el nivel jerárquico como el tipo de elemento del discurso

### v1.2.4 (Enero 2026)
- **Feature:** Reordenamiento de preguntas (QUE) en la pestaña Exportar con botones ↑↓
- **Feature:** Match jerárquico de proyectos — seleccionar `proyecto/sub` incluye `proyecto/sub/hijo`
- **Feature:** Auto-descubrimiento de proyectos al abrir el Toolkit con alerta "Agregar todos"
- **Refactoring:** Unificado código de generación Markdown en `markdownCore.js`
- **Mejora:** Eliminadas ~400 líneas de código duplicado entre plugin y HTML
- **Mejora:** `markdownGenerator.js` reducido de 212 a 16 líneas
- **Mejora:** `htmlEmbeddedScript.js` reducido de 628 a 180 líneas

### v1.2.3 (Enero 2026)
- **Feature:** Exportación a EPUB completa directamente desde el navegador (usando JSZip)
- **Feature:** Nueva opción de exportación Markdown Plano (sin bullets)
- **Mejora:** Prefijos de encabezado explícitos ([H2]-[H5]) en EPUB para mejor legibilidad en dispositivos e-ink
- **UI:** Nuevos botones "MD Plano" y "EPUB" en la pestaña Exportar
- **Tech:** Nuevo módulo `epubGenerator.js`

### v1.2.1 (Diciembre 2025)
- **Fix:** Exportación Markdown ahora incluye EVDs de CLMs de soporte (estructura QUE→CLM→CLM(soporte)→EVD)
- Sincronización de lógica entre `markdownGenerator.js` y JS embebido en `htmlGenerator.js`
- Reorganización de estructura del proyecto (carpetas `docs/`, `tests/`, `reference/`)
- Consolidación de documentación

### v1.2.0
- Verificación de coherencia de proyectos en ramas
- Propagación de `Proyecto Asociado::` a nodos descendientes
- Mejoras en UI de la pestaña "Ramas"

### v1.1.x
- Correcciones de formateo de code blocks
- Filtro de MCP tool calls de Claude
- Mejoras en manejo de errores de exportación

## Problemas Conocidos

*Actualmente no hay bugs documentados.*

Si encuentras un problema:
1. Documéntalo aquí con descripción y pasos para reproducir
2. Marca con `⚠️ PENDIENTE` hasta que se resuelva

## Próximos Pasos

*No hay tareas pendientes definidas actualmente.*

---

## Notas para la IA

Al finalizar cada sesión de trabajo:
1. Actualizar la versión si hubo cambios funcionales
2. Agregar entrada al historial reciente
3. Documentar cualquier bug descubierto en "Problemas Conocidos"
4. Actualizar estado de funcionalidades si cambió algo

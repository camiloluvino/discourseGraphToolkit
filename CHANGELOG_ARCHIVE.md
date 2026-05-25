# Historial de Cambios Completo (Archivo) ÔÇö Discourse Graph Toolkit

Este archivo contiene el registro de cambios hist├│rico del plugin. Las versiones recientes se mantienen en `STATUS.md`.

---

### v1.5.46 (Mayo 2026)
- **Feature: Redise├▒o del Flujo de Exportaci├│n (Paso 3).** Se implement├│ un nuevo bot├│n "Generar Orden de Exportaci├│n" en la pesta├▒a Exportar para separar el c├ílculo de nodos de la descarga del archivo. Esto permite al usuario previsualizar y organizar los nodos antes de exportar.
- **Fix: Sincronizaci├│n Cr├¡tica en Exportaci├│n.** Se resolvi├│ una condici├│n de carrera donde el exportador le├¡a un estado "vac├¡o" si se iniciaba la descarga inmediatamente. Ahora `handlePreview` retorna los datos calculados de forma s├¡ncrona a los handlers de exportaci├│n.
- **UX: Visibilidad Permanente del Paso 3.** El contenedor de orden de exportaci├│n ahora es siempre visible, mejorando la descubribilidad de la funci├│n de reordenamiento.
- **Tech:** Unificaci├│n de `getParentProjectKey` en todos los flujos de exportaci├│n y eliminaci├│n de referencias hu├®rfanas a l├│gica de ordenamiento antigua.

### v1.5.45 (Mayo 2026)
- **Performance: Optimizaci├│n Cr├¡tica en Consultas de Exportaci├│n.** Se redise├▒├│ la funci├│n `findPagesWithProject` para utilizar ├¡ndices nativos de Roam (`:block/refs`) en lugar de escaneo de texto completo. Esta mejora elimina el cuello de botella O(N) en la b├║squeda de proyectos, permitiendo que el proceso de exportaci├│n se inicie de forma casi instant├ínea incluso en grafos con cientos de miles de bloques.
- **Tech:** Sincronizaci├│n de versi├│n en el bundle final y limpieza de consultas redundantes en el flujo de exportaci├│n.

### v1.5.44 (Mayo 2026)
- **Feature: Sistema de Favoritos (Perfiles de Selecci├│n R├ípida).** Nueva barra Ô¡É Favoritos en las pesta├▒as **Ramas** y **Exportar** que permite guardar y restaurar configuraciones de selecci├│n con un clic.
  - **Guardar selecci├│n:** Bot├│n "+ Guardar" captura el estado actual de proyectos (y tipos/config en Exportar) en un perfil con nombre personalizado.
  - **Aplicar con un clic:** Cada favorito aparece como un chip ­ƒöû clickeable. Al seleccionarlo, restaura autom├íticamente toda la configuraci├│n guardada.
  - **Edici├│n completa:** Los chips se pueden renombrar (clic en el nombre) y eliminar (Ô£ò). Di├ílogo inline para nombrar nuevos favoritos.
  - **Chip activo:** El favorito que coincide con la selecci├│n actual se resalta en verde, indicando visualmente qu├® perfil est├í activo.
  - **Persistencia aislada:** Los favoritos se almacenan en localStorage con clave aislada por grafo de Roam, independientes entre tabs.
  - **FavoritesService:** Servicio CRUD compartido (`config.js`) con m├®todos `getAll`, `add`, `update`, `remove`, `rename` y manejo seguro de errores.
- **Mejora: Selecci├│n Profunda en Ramas.** Se elimin├│ la restricci├│n que limitaba los checkboxes de selecci├│n a los niveles 0 y 1 en la pesta├▒a **Ramas**. Ahora es posible seleccionar ramas de cualquier nivel de profundidad (Niveles 2, 3, 4+) para realizar verificaciones de coherencia focalizadas en sub-proyectos aninados.

### v1.5.43 (Mayo 2026)
- **Feature: Modo "Esqueleto" en Exportaci├│n.** Nueva opci├│n "Exportar solo esqueleto (solo t├¡tulos y relaciones)" en la pesta├▒a Exportar. Al activarla, los exportadores (HTML, Markdown, MD Plano, EPUB) generan ├║nicamente la estructura jer├írquica del grafo de discurso: t├¡tulos de nodos (`[[QUE]]`, `[[CLM]]`, `[[EVD]]`, `[[GRI]]`) y sus relaciones (`#RespondedBy`, `#SupportedBy`, `#Contains`), omitiendo todo el contenido interno, metadata y mensajes informativos. Ideal para obtener una "vista de rayos X" del grafo.

### v1.5.42 (Mayo 2026)
- **Seguridad: Mitigaci├│n de Vulnerabilidades.**
  - **SRI Hash en CDNs:** Se implement├│ verificaci├│n de integridad (`script.integrity` y `crossOrigin`) para la carga din├ímica de `JSZip` desde CDNJS para prevenir supply-chain attacks.
  - **Mitigaci├│n XSS (Exportaci├│n HTML):** Se a├▒adi├│ una capa estricta de escape HTML (`escapeHtml`) a los t├¡tulos de nodos (QUE, CLM, EVD, GRI) y metadatos de proyectos antes de la inyecci├│n en el DOM generado, evitando inyecci├│n de scripts por nodos maliciosos en Roam.
- **Refactor: Auditor├¡a de Calidad y Optimizaci├│n de Algoritmos.**
  - **Eliminaci├│n de O(N┬▓) en Mapeo:** Se migr├│ la deduplicaci├│n de relaciones a un sistema basado en `Set` temporal en `RelationshipMapper`, eliminando la latencia en grafos densos.
  - **Memoria Optimizada (Backtracking):** Refactor de `isNodeRelevant` and `isRelevantToProject` para usar backtracking sobre un ├║nico `Set`, evitando el crash por recursi├│n y consumo de memoria exponencial.
  - **Batching de Carga:** Optimizaci├│n del loop de carga en Panor├ímica para solicitar todas las dependencias de un nivel en un ├║nico batch.
  - **Single-Pass Counters:** Las estad├¡sticas de la UI ahora se calculan en un solo pase memoizado (O(N)), mejorando la respuesta al hacer drag & drop.
  - **Relevancia Estable:** Nuevo sistema de cache para filtros de proyecto que persiste entre renders.

### v1.5.41 (Abril 2026)
- **Fix: Validaci├│n de Proyectos en ProjectsTab.**
  - **Correcci├│n de Crash Silencioso:** Se corrigi├│ un bug donde el bot├│n "Validar Existencia" fallaba debido a una referencia err├│nea a `setExportStatus`. Ahora utiliza `setProjectsStatus` correctamente.
  - **Indicadores Agregados en Namespaces:** Los nodos padre (carpetas de proyectos) ahora muestran indicadores Ô£à/ÔÜá´©Å basados en el estado de sus hijos, facilitando la identificaci├│n de problemas en grafos grandes.
  - **Feedback Mejorado:** Se a├▒adieron notificaciones (Toasts) y mensajes de estado durante el proceso de validaci├│n.

### v1.5.40 (Abril 2026)
- **Vista Panor├ímica: Agrupaci├│n Jer├írquica por Sub-Proyecto.**
  - **Bloques Draggables:** Cuando el proyecto tiene sub-proyectos, los nodos se agrupan en bloques inteligentes que pueden moverse como unidades, facilitando la organizaci├│n a macro-nivel.
  - **Herencia de Orden:** Los bloques respetan internamente el orden definido en el sub-proyecto correspondiente.
  - **Expansi├│n Inline:** Los bloques funcionan como acordeones para visualizar el contenido sin perder el contexto general.
  - **Navegaci├│n Directa:** Bot├│n para saltar al sub-proyecto y gestionar su orden granular.
  - **Optimizaci├│n de Persistencia:** Nuevo sistema `GROUP_ORDER` para guardar el orden de los bloques sin interferir con el orden individual de los nodos.

### v1.5.39 (Abril 2026)
- **Vista Panor├ímica: Simplificaci├│n de UI y Etiquetas.**
  - **Eliminaci├│n de Redundancia:** Las etiquetas de proyecto en los nodos ahora ocultan el prefijo del proyecto seleccionado. Si el nodo pertenece exactamente al proyecto activo, la etiqueta desaparece, logrando una vista m├ís limpia.
  - **Limpieza de Informaci├│n:** Se elimin├│ el badge de conteo de ramas ("N RAMAS") por considerarse informaci├│n redundante dado el contexto visual, reduciendo el ruido cognitivo.
  - **Bundling:** Generaci├│n de un nuevo build verificado de `discourse-graph-toolkit.js`.

### v1.5.38 (Abril 2026)
- **UI/UX: Redise├▒o del Selector de Proyectos en Vista Panor├ímica.**
  - **Selector Colapsable Custom:** Se reemplaz├│ el `select` nativo por un componente jer├írquico a medida que permite expandir/colapsar carpetas de proyectos.
  - **Navegaci├│n Intuitiva:** Los proyectos se muestran colapsados por defecto, facilitando la b├║squeda en grafos con muchos namespaces.
  - **Correcci├│n de UX en Drag & Drop:** Se ajust├│ el c├ílculo del ├¡ndice al soltar un nodo. Ahora, al arrastrar hacia abajo, el nodo "destino" se desplaza correctamente hacia abajo en lugar de saltar hacia arriba.
  - **Bundling:** Generaci├│n de un nuevo build verificado de `discourse-graph-toolkit.js`.
- **Feature: Selector Maestro en Coherencia de Ramas.**
  - **Checkbox "Seleccionar Todos":** Se a├▒adi├│ un control global en la pesta├▒a "Ramas" para marcar o desmarcar todos los proyectos de una vez.
  - **L├│gica Jer├írquica Reforzada:** El sistema ahora reconoce y selecciona autom├íticamente todas las rutas intermedias de los proyectos (ej. si existe `tesis/marco/analisis`, el sistema asegura que `tesis` y `tesis/marco` tambi├®n est├®n en el set de selecci├│n). Esto soluciona bugs visuales donde carpetas autom├íticas aparec├¡an desmarcadas a pesar de tener hijos seleccionados.
  - **Carga Predeterminada:** Al iniciar el Toolkit, todos los proyectos (incluyendo carpetas ra├¡z y nodos sin proyecto) vienen seleccionados por defecto para facilitar una auditor├¡a inmediata.

### v1.5.37 (Abril 2026)
- **Fix: Prevenci├│n de Re-aparici├│n de Proyectos Eliminados.**
  - **Filtrado en Sincronizaci├│n Inicial:** Se modific├│ `initializeProjectsSync` para que ignore los proyectos en la "Lista de Ignorados" al realizar la uni├│n con los datos de Roam. Esto evita que proyectos borrados localmente resuciten si la p├ígina de Roam a├║n no se ha actualizado.
  - **Auto-clasificaci├│n como Ignorado:** Al eliminar un proyecto (ya sea individualmente o en bloque), el sistema ahora lo agrega autom├íticamente a la lista de ignorados.
  - **Sincronizaci├│n At├│mica:** Mejora en el flujo de borrado para asegurar que la decisi├│n del usuario prevalezca sobre los datos persistidos en el grafo durante el arranque del plugin.

### v1.5.36 (Abril 2026)
- **Feature: Control de Proyectos No Registrados (Lista de Ignorados).**
  - **Persistencia de Descarte:** Al presionar "X" en la alerta de proyectos no registrados, los proyectos se guardan en una lista de exclusi├│n local (`dismissed_projects`).
  - **Silencio Inteligente:** El auto-descubrimiento ahora filtra los proyectos ignorados, evitando alertas recurrentes por bloques "hu├®rfanos" en el grafo.
  - **Panel de Control:** Nueva secci├│n en la pesta├▒a "Proyectos" para visualizar y restaurar proyectos ignorados.
  - **Sincronizaci├│n Reforzada:** El merge de proyectos ahora respeta la lista de ignorados, evitando que se re-introduzcan proyectos eliminados si la sincronizaci├│n con Roam est├í desfasada.
  - **Limpieza Autom├ítica:** Al a├▒adir un proyecto manualmente (o mediante sugerencias), el sistema lo remueve autom├íticamente de la lista de ignorados.
- **UI/UX: Redise├▒o y Unificaci├│n de Coherencia de Ramas.**
  - **Unificaci├│n de Botones:** Se fusionaron "Propagar ra├¡z" y "Heredar de padres" en un ├║nico bot├│n inteligente **"­ƒöä Propagar"**. El sistema ahora determina autom├íticamente si aplicar el proyecto ra├¡z (para diferencias y omisiones) o el proyecto del padre directo (para generalizaciones).
  - **Redise├▒o del Panel de Detalles:** Se eliminaron badges redundantes y se implement├│ un layout horizontal m├ís compacto.
  - **Secciones Colapsables:** Los nodos problem├íticos ahora se agrupan en acordeones (`details`) separados por tipo de error ("Diferencias" vs "Sin proyecto"), reduciendo la carga cognitiva.
  - **Tooltips Contextuales:** Se movi├│ la informaci├│n t├®cnica ("Deber├¡a heredar: X | Tiene: Y") a tooltips tipo hover, limpiando la lista visual de nodos.
  - **Refactor de Handlers:** Optimizaci├│n de la l├│gica de negocio en `BranchesTab.js` para manejar la propagaci├│n at├│mica de m├║ltiples tipos de inconsistencias.

### v1.5.35 (Marzo 2026)
- **Refactor: Arquitectura de Estado Basada en Dominios (Desacoplamiento Cr├¡tico).**
  - **Eliminaci├│n del God Object:** Se refactoriz├│ completamente `modal.js` para eliminar 30 `useState` hooks que centralizaban todo el estado del plugin.
  - **M├║ltiples Contextos de Dominio:** Implementaci├│n de 5 nuevos contextos React independientes (`NavContext`, `ProjectsContext`, `BranchesContext`, `ExportContext`, `PanoramicContext`).
  - **Eliminaci├│n de Re-renders Masivos:** Las pesta├▒as ahora solo se suscriben a los datos que necesitan. Se eliminaron cientos de re-renders innecesarios en paneles complejos como Panor├ímica y Ramas.
  - **Estado Local Puro:** Las pesta├▒as de "Nodos" e "Importar" migran a `useState` local, desacopl├índose totalmente del ciclo de vida de otros componentes.
  - **Fix: Contaminaci├│n de Status:** Se separ├│ el estado `exportStatus` en m├║ltiples estados locales, evitando que el progreso de una pesta├▒a se muestre en otra.
  - **Build Optimizado:** Actualizado el script de ensamblaje para gestionar la inyecci├│n de contextos en el orden de dependencia correcto.

### v1.5.34 (Marzo 2026)
- **UI/UX: Correcci├│n de espacio en blanco en Exportar y Nodos.**
  - **Flexbox Optimization:** Se redise├▒├│ la estructura de contenedores de las pesta├▒as "Exportar" y "Nodos" para que ocupen todo el espacio disponible dentro del modal.
  - **Eliminaci├│n de Gaps:** Se eliminaron las alturas fijas restrictivas en las listas de proyectos, permitiendo que la interfaz "respire" y se adapte al tama├▒o de la pantalla del usuario sin dejar grandes ├íreas vac├¡as.
  - **Modal Fix:** Se corrigi├│ el contenedor central en `Modal.js` para asegurar que las pesta├▒as hereden correctamente el comportamiento flexible del layout principal.

### v1.5.33 (Marzo 2026)
- **Fix: Exportaci├│n de sub-proyectos sin nodos QUE/GRI propios.**
  - Cuando un sub-proyecto (ej. `tesis/afectos/definiciones/Ahmed`) contiene solo nodos CLM y EVD, la exportaci├│n ahora encuentra autom├íticamente los nodos QUE/GRI padre que los referencian.
  - **Reverse-Lookup Datalog:** Nueva funci├│n `findParentRootNodes` que traza las referencias hacia arriba (CLM ÔåÆ QUE) usando `block.refs` en Roam.
  - **Fallback en Export:** Si `prepareExportData` no encuentra nodos ra├¡z (QUE/GRI) entre las p├íginas del proyecto, ejecuta el reverse-lookup, carga los padres, reconstruye las relaciones y genera el markdown correctamente.
  - **Preview consistente:** La misma l├│gica de fallback se aplica en `handlePreview`, mostrando correctamente el conteo de nodos ra├¡z descubiertos.

### v1.5.32 (Marzo 2026)
- **Vista Panor├ímica: Escaneo de Proyectos y Filtrado de Ramas.**
  - **Detecci├│n Profunda:** El filtro de proyectos ahora escanea todos los nodos cargados (CLMs, EVDs, GRIs, QUEs) y no solo los nodos ra├¡z. Esto permite filtrar por proyectos muy espec├¡ficos que solo aparecen en niveles profundos.
  - **Filtrado Recursivo de Ramas:** Al seleccionar un proyecto, la vista ahora filtra din├ímicamente el ├írbol para mostrar solo las ramas que contienen nodos relevantes a ese proyecto, ocultando el ruido del resto del grafo.
  - **Optimizaci├│n de UI:** El contador del dropdown refleja ahora el total de nodos encontrados en todos los niveles para cada proyecto.

### v1.5.31 (Marzo 2026)
- **UI/UX: Migraci├│n al Design System (dgt-*) en Vista Panor├ímica.**
  - **Eliminaci├│n de Estilos Inline:** Se refactoriz├│ completamente `PanoramicTab.js` para eliminar cientos de l├¡neas de estilos inline, sustituy├®ndolos por clases utilitarias del sistema de dise├▒o global.
  - **Consistencia Visual:** La Vista Panor├ímica ahora utiliza la misma paleta de colores, tipograf├¡a (Inter/Lora) y espaciado que la pesta├▒a de Ramas, logrando una est├®tica unificada y profesional.
  - **Nuevas Utilidades en styles.js:** Se agregaron clases espec├¡ficas (`.dgt-panoramic-*`) para manejar la representaci├│n jer├írquica (l├¡neas de rama, m├írgenes de ├írbol) sin depender de hacks de estilo en el componente.
  - **Eliminaci├│n de Ruido Visual:** Se quitaron los iconos redundantes (`­ƒôî`, `­ƒôÄ`, `­ƒôØ`, `­ƒôé`) y los conectores ASCII (`Ôö£ÔöÇ`, `ÔööÔöÇ`) de los t├¡tulos de los nodos.
  - **Identaci├│n Estructural:** Nuevas l├¡neas gu├¡a sutiles (`border-left`) y m├írgenes limpios para representar la jerarqu├¡a del ├írbol de forma profesional.
  - **Calma Tipogr├ífica:** Se eliminaron los fondos coloreados invasivos en el texto. Ahora el contenido es gris oscuro/negro neutro sobre fondo blanco, mejorando dr├ísticamente la lectura de textos largos.
  - **Badges de Tipo:** Se unific├│ el uso de etiquetas de tipo compactas y coloreadas para mantener la sem├íntica visual.
  - **Markdown Bold:** Soporte nativo para visualizar negritas (`**asteriscos**` o `__guiones__`) en los t├¡tulos de los nodos.

### v1.5.30 (Marzo 2026)
- **UI/UX: Mejora en Revisi├│n de Nodos (Pesta├▒a Ramas).**
  - **Filtros R├ípidos:** Al hacer clic en las insignias de error (`ÔÜá´©Å` o `ÔØî`) en la barra de resumen, el ├írbol de proyectos se filtra autom├íticamente para mostrar solo las ramas afectadas.
  - **Auto-expansi├│n:** Al activar un filtro, los proyectos que contienen errores se expanden autom├íticamente para revelar los nodos problem├íticos.
  - **Indicadores en Carpetas:** Los proyectos (carpetas) ahora muestran iconos `ÔÜá´©Å` o `ÔØî` si contienen alguna rama con errores, incluso cuando est├ín contra├¡dos. Esto permite identificar r├ípidamente qu├® ├íreas requieren atenci├│n.
  - **Interacci├│n Mejorada:** Se redise├▒├│ el comportamiento de los badges para facilitar la navegaci├│n fluida entre el diagn├│stico y la correcci├│n.

### v1.5.29 (Marzo 2026)
- **Fix: Carga y Mapeo Recursivo en Panor├ímica (Deep Nesting).**
  - Se implement├│ un algoritmo de b├║squeda recursiva en el ├írbol de bloques para identificar relaciones (`#SupportedBy`, `#RespondedBy`, etc.) incluso cuando est├ín anidadas profundamente dentro de otros bloques en la misma p├ígina.
  - Se actualiz├│ el cargador de datos para realizar hasta 5 niveles de peticiones iterativas, asegurando que todos los nodos referenciados en niveles inferiores sean descargados e integrados en el mapa de relaciones.
  - Esto soluciona definitivamente el problema donde la Vista Panor├ímica se "deten├¡a" en el Nivel 2, permitiendo ahora visualizar ramas completas (Niveles 3, 4, 5+) de forma fluida.

### v1.5.28 (Marzo 2026)
- **Fix: Alineaci├│n de Popovers en Pesta├▒a Ramas.** Se corrigi├│ un problema visual donde los popovers de advertencia se cortaban. Ahora se alinean correctamente (`left: 0`).

### v1.5.27 (Marzo 2026)
- **Fix: Carga de Datos Recursiva en Panor├ímica y Exportaci├│n.**
  - Se implement├│ un bucle de carga iterativa para asegurar que todos los descendientes directos e indirectos (vinculados por `#SupportedBy`, `#RespondedBy`, `#RelatedTo` o `#Contains`) sean tra├¡dos de Roam independientemente de su profundidad.
  - Esto soluciona el problema donde los "nietos" o niveles inferiores de una rama no aparec├¡an en la Vista Panor├ímica ni en los archivos de exportaci├│n.
  - Se incluy├│ un l├¡mite de seguridad de profundidad (Nivel 10) para prevenir bucles infinitos en caso de referencias circulares en el grafo.
  - Mejora de los mensajes de estado durante la carga ("Cargando X nodos (nivel Y)...") para dar visibilidad total al proceso de extracci├│n profunda.

### v1.5.26 (Febrero 2026)
- **UI/UX: Anidaci├│n Profunda Interactiva en Panor├ímica.**
  - Implementaci├│n de renderizado recursivo N-niveles para todos los tipos de nodos (`GRI`, `QUE`, `CLM`, `EVD`).
  - **Nodos Colapsables:** Cualquier nodo anidado con hijos ahora incluye botones `Ôû╝`/`ÔûÂ` y es expansible de forma independiente.
  - **Navegaci├│n Deshabilitada:** Se elimin├│ la navegaci├│n a la p├ígina de Roam al hacer clic para favorecer la interactividad de expansi├│n/colapsado dentro de la misma vista.
  - **Mejora Visual:** Alineaci├│n horizontal fija mediante fuentes monospace y contenedores flex sin wrap para los conectores del ├írbol (`Ôö£ÔöÇ`, `ÔööÔöÇ`), asegurando una jerarqu├¡a visual limpia.
  - **Expandir Todo:** El bot├│n global ahora expande recursivamente todos los niveles del grafo de manera inteligente.

### v1.5.25 (Febrero 2026)
- **Feature: Soporte para GRI ÔåÆ #Contains ÔåÆ EVD.** Se actualiz├│ el mapper de relaciones para que los nodos de tipo `[[EVD]]` sean reconocidos como contenidos v├ílidos dentro de un `[[GRI]]` mediante la etiqueta `#Contains`. Esto permite una organizaci├│n jer├írquica m├ís profunda, permitiendo que un grupo contenga directamente evidencias o que sub-grupos organizadores las agrupen. Las capas de exportaci├│n (Markdown, HTML, EPUB) ya reflejan este cambio autom├íticamente.

### v1.5.24 (Febrero 2026)
- **Fix: Duplicaci├│n en Exportar.** Se implement├│ una l├│gica de filtrado de nodos hijos en la pesta├▒a Exportar (similar a la Panor├ímica). Ahora, el Toolkit detecta si un GRI est├í contenido en otro grupo seleccionado para omitirlo de la lista ra├¡z y evitar duplicados en el archivo final.
- **Improvement: Respuestas recursivas en Markdown.** Se actualiz├│ `markdownCore.js` para que los nodos `[[QUE]]` exportados como hijos (ej. dentro de un GRI) includean correctamente sus respuestas (`CLM` y `EVD`). La funci├│n `renderNodeTree` ahora detecta el tipo de nodo y procesa las relaciones espec├¡ficas de las preguntas.

### v1.5.23 (Febrero 2026)
- **Feature: Soporte GRI en Coherencia de Ramas.** La pesta├▒a "Ramas" ahora procesa tanto nodos `[[QUE]]` como `[[GRI]]` como puntos de origen para la verificaci├│n de coherencia. Esto permite que proyectos organizados puramente bajo nodos de Grupo sean visibles y auditables en esta pesta├▒a.
- **UI: Generalizaci├│n de Etiquetas en Ramas.** Se actualizaron las etiquetas ("X preguntas" ÔåÆ "X ramas") y la l├│gica de limpieza de t├¡tulos para soportar ambos tipos de nodos ra├¡z.
- **UI: Badges de Tipo en Panor├ímica.** Se agregaron etiquetas visibles (`QUE`, `GRI`, `CLM`) junto al t├¡tulo de los nodos en la Vista Panor├ímica para una identificaci├│n inmediata.
- **L├│gica: Jerarqu├¡a de Contenci├│n Respectuosa.** Los nodos GRI o QUE que ya est├ín contenidos dentro de un nodo GRI (v├¡a `#Contains`) ahora se filtran de la lista ra├¡z principal en la Panor├ímica.

### v1.5.22 (Febrero 2026)
- **Feature: Nodos GRI y relaci├│n #Contains.** Implementaci├│n de un nuevo tipo de nodo organizativo (GRI) que permite agrupar otros nodos mediante la etiqueta `#Contains`.
- **Arquitectura: Intercambiabilidad de Nodos Ra├¡z.** Se elimin├│ el presupuesto de que `QUE` es siempre la ra├¡z. Ahora tanto `GRI` como `QUE` funcionan como puntos de entrada equivalentes en la Vista Panor├ímica y en todos los formatos de exportaci├│n.
- **UI: Soporte Visual para GRI.** En la Panor├ímica, los GRI se distinguen con un borde p├║rpura, icono de carpeta (­ƒôé) y una visualizaci├│n indentada de sus contenidos.
- **Exportaci├│n:** Soporte transversal para la jerarqu├¡a `GRI ÔåÆ QUE ÔåÆ CLM ÔåÆ EVD` en HTML, Markdown y EPUB.

### v1.5.21 (Febrero 2026)
- **Feature: Pesta├▒a Independiente de Nodos.** Se ha extra├¡do la funcionalidad de b├║squeda de hu├®rfanos de la pesta├▒a "Ramas" a una nueva pesta├▒a dedicada llamada "Nodos".
- **UI/UX: Redise├▒o de la Gesti├│n de Hu├®rfanos.** Los resultados de b├║squeda ahora se muestran en una lista de tarjetas clara y espaciosa, eliminando el uso de popovers peque├▒os y mejorando la usabilidad.
- **Refactoring:** Separaci├│n de responsabilidades en el c├│digo UI (`NodesTab.js`) y simplificaci├│n de `BranchesTab.js`.
- **Build:** Actualizado el script de ensamblaje para incluir el nuevo m├│dulo de pesta├▒as.

### v1.5.20 (Febrero 2026)
- **UI/UX: Adaptaci├│n Est├®tica Global.** Inyecci├│n de dise├▒o minimalista inspirado en Claude (`styles.js`) como CSS global del toolkit. El toolkit utiliza ahora una paleta sobria "off-white", tipograf├¡a moderna y variables de dise├▒o unificadas.
- **UI/UX: Mejoras en Popovers (Hu├®rfanos / Sin Proyecto).**
  - Aumentadas dimensiones (ancho m├íximo) para mejor legibilidad.
  - Implementado truncado de texto inteligente v├¡a CSS (elipsis) eliminando cortes arbitrarios.
  - Limpieza autom├ítica de t├¡tulos: se remueven prefijos `[[QUE]]` y corchetes `[[ ]]` para una vista m├ís limpia.
  - A├▒adido soporte nativo para tooltips con el nombre completo al pasar el mouse.
- **UI/UX: Refactor de Pesta├▒as (Ramas y Proyectos).** Eliminaci├│n masiva de estilos en l├¡nea en favor de clases utilitarias (`.dgt-flex`, `.dgt-card`, etc.). Esto unifica la apariencia de ├írboles jer├írquicos, botones y badges en todo el sistema.
- **Build:** Actualizaci├│n de compilaci├│n de `discourse-graph-toolkit.js` asegurando que todos los componentes utilicen el nuevo sistema de estilos globales.

### v1.5.18 (Febrero 2026)
- **UI/UX: Redise├▒o de Pesta├▒a Ramas.** Implementado un layout m├ís compacto que elimina el "efecto partido de tenis", acercando los contadores de nodos al t├¡tulo.
- **UI/UX: Limpieza de Jerarqu├¡a.** Las rutas de proyectos anidados en el ├írbol ahora solo muestran el nombre final (`split('/').pop()`), reduciendo dr├ísticamente el ruido visual. La ruta completa es visible mediante `title` (tooltip).
- **UI/UX: Parseo de Markdown.** Los t├¡tulos en la pesta├▒a Ramas ahora parsean negritas (`**texto**`), mejorando la legibilidad.
- **UI/UX: Mejoras de Contraste y Sem├íntica.**
  - Bot├│n "Verificar" renombrado a "­ƒöä Procesar" con icono sem├íntico.
  - A├▒adidos tooltips descriptivos a todos los badges y botones principales.
  - Implementado *zebra striping* (fondos alternos) en el ├írbol jer├írquico para mejor seguimiento visual de filas.
  - Aumentado el padding vertical para que la informaci├│n "respire".

### v1.5.17 (Febrero 2026)
- **Fix:** Validaci├│n de proyectos ahora excluye namespaces puros (prefijos como `yo y mis temas`) que no se usan directamente como `Proyecto Asociado::`. Solo se validan los proyectos hoja o los que existen expl├¡citamente en el grafo.
- **UX:** Bot├│n "Eliminar No Encontrados" reemplazado por "Ôÿæ´©Å Seleccionar No Encontrados" ÔÇö ahora solo marca los checkboxes de los proyectos no encontrados para que el usuario pueda revisarlos antes de confirmar la eliminaci├│n con "Eliminar Seleccionados".

### v1.5.16 (Febrero 2026)
- **UI:** Redise├▒o completa de la Vista Panor├ímica. Implementado dise├▒o tipo "tarjetas" (cards) para encapsular cada pregunta y sus ramas, separ├índolas visualmente del resto.
- **UI:** Reemplazada la antigua visualizaci├│n de ramas (l├¡neas basadas en texto `Ôö£ÔöÇ`, `ÔööÔöÇ`) por un sistema de indentaci├│n limpio y jer├írquico que utiliza m├írgenes y bloques con bordes de color (verde para CLM, naranja para EVD).
- **UI:** Mejorado el Header de la pesta├▒a Panor├ímica para evitar abarrotamiento (cluttering) de los controles, reubicando los indicadores de nodo y agrupando acciones.
- **UI:** A├▒adidas vi├▒etas indicativas (`ÔÇó`) a las opciones indentadas en los selectores jer├írquicos de proyectos (Panor├ímica).

### v1.5.15 (Febrero 2026)
- **UI: Sistema de Temas (THEME).** Implementado `config.THEME.colors` para centralizar la paleta de colores (Primary, Success, Warning, Danger, Neutral) en todas las pesta├▒as.
- **UI: Limpieza Visual.** Eliminados iconos decorativos de pesta├▒as y modales para reducir ruido visual y profesionalizar la interfaz.
- **Fix:** Corregida referencia a variable global del tema que causaba crash en la pesta├▒a Ramas.

### v1.5.14 (Febrero 2026)
- **Feature: Profundidad Recursiva Ilimitada.** Se elimin├│ el l├¡mite fijo de 4-5 niveles en Markdown, HTML y EPUB.
- **Refactor:** `markdownCore.js` ahora usa recursi├│n pura para procesar la cadena CLMÔåÆCLMÔåÆCLMÔåÆ...ÔåÆEVD.
- **Refactor:** `htmlNodeRenderers.js` unificado en una sola funci├│n recursiva `renderNode`.
- **Feature:** EPUB soporta din├ímicamente cualquier nivel de encabezado (H3+) y lo refleja en el ToC con numeraci├│n jer├írquica profunda.
- **Tech:** Implementada detecci├│n de ciclos circulares y l├¡mites de seguridad (10 niveles) en los exportadores.

### v1.5.13 (Febrero 2026)
- **Feature:** Implementaci├│n de generaci├│n nativa de EPUB (eliminada dependencia externa `jEpub`).
- **Feature:** ├ìndice Jer├írquico Profundo (ToC Interactivo) en EPUB. Soporta navegaci├│n a Afirmaciones (CLM) y Evidencias (EVD) anidadas.
- **Feature:** Numeraci├│n jer├írquica autom├ítica en EPUB (ej. `1.1.2.`) para retener el contexto del flujo del discurso en e-readers (Kindle, Apple Books).

### v1.5.12 (Febrero 2026)
- **Feature:** Cambio en la nomenclatura de los archivos exportados. Ahora usan el formato `DG_[nombre_proyecto]` utilizando el ancestro com├║n m├ís largo, en lugar de concatenar todas las ramas seleccionadas.

### v1.5.11 (Febrero 2026)
- **Fix:** Corregida la indentaci├│n visual en el dropdown de proyectos de la Vista Panor├ímica (ahora usa espacios de no-quiebre para respetar la jerarqu├¡a).

### v1.5.10 (Febrero 2026)
- **Fix:** Corregido bug visual en la pesta├▒a Ramas donde los sub-proyectos con una sola pregunta no mostraban su encabezado de carpeta, causando que sus preguntas parecieran pertenecer a la rama anterior.

### v1.5.9 (Enero 2026)
- **Fix:** Exportaci├│n EPUB ya no retiene datos "stale" (rama anterior) al cambiar de proyecto sin actualizar la vista previa.

### v1.5.8 (Enero 2026)
- **Fix:** Corregido bug donde el orden de preguntas de Panor├ímica no se aplicaba en Export al seleccionar proyectos hijos
- **Tech:** `getProjectKey()` ahora calcula el ancestro com├║n real de proyectos hermanos (no solo verifica si uno es prefijo de otro)

### v1.5.7 (Enero 2026)
- **Feature:** Detecci├│n de nodos hu├®rfanos ÔÇö nuevo bot├│n "­ƒæ╗ Hu├®rfanos" en pesta├▒a Ramas
- **Feature:** Actualizaci├│n autom├ítica de hu├®rfanos ÔÇö al presionar "Verificar", la lista de hu├®rfanos se refresca si ya se hab├¡a buscado
- **UI:** Redise├▒o de pesta├▒a Ramas ÔÇö header compacto con badges en esquina superior derecha
- **UI:** Eliminada descripci├│n redundante, m├ís espacio vertical para ├írbol de nodos (28rem)
- **Tech:** Nueva funci├│n `findOrphanNodes()` para detectar p├íginas QUE/CLM/EVD sin proyecto ni referencias

### v1.5.6 (Enero 2026)
- **UI:** Mejoras en pesta├▒a Exportar ÔÇö botones "Seleccionar todos" reubicados junto a los t├¡tulos y estilizados como enlaces.
- **UX:** Selecci├│n por defecto ÔÇö al abrir la pesta├▒a Exportar, todos los tipos (QUE, CLM, EVD) vienen seleccionados.

### v1.5.5 (Enero 2026)
- **UI:** Eliminada opci├│n "Vista Previa" en pesta├▒a Exportar (redundante con Panor├ímica)
- **Flow:** Flujo de exportaci├│n simplificado ÔÇö selecci├│n directa de proyecto/tipo y descarga
- **Docs:** Actualizada referencia de reordenamiento (se realiza exclusivamente en Panor├ímica)

### v1.5.4 (Enero 2026)
- **Refactor:** Implementado React Context (`ToolkitContext.js`) para compartir estado entre pesta├▒as
- **Tech:** Eliminado prop drilling ÔÇö ~54 props removidos de `modal.js`
- **Tech:** Todos los tabs ahora usan `useToolkit()` hook para acceder al estado
- **Arquitectura:** modal.js ahora act├║a solo como Provider, l├│gica de estado descentralizada

### v1.5.3 (Enero 2026)
- **Refactor:** Nuevo componente `ProjectTreeView.js` ÔÇö extrae l├│gica duplicada de ├írboles jer├írquicos
- **Tech:** Eliminadas ~90 l├¡neas de c├│digo duplicado entre `BranchesTab.js` y `ExportTab.js`
- **Tech:** L├│gica de expand/collapse ahora centralizada en componente reutilizable
- **Docs:** Actualizado `AI_INSTRUCTIONS.md` con nueva estructura de carpeta `ui/components/`

### v1.5.2 (Enero 2026)
- **UI:** Pesta├▒a Ramas ÔÇö simplificados indicadores del ├írbol a solo conteo de preguntas
- **UI:** Pesta├▒a Ramas ÔÇö textos de discordancia m├ís claros: "Deber├¡a heredar:" / "Tiene:"
- **Fix:** Corregido bug en Exportar donde el orden personalizado de Panor├ímica no se aplicaba al seleccionar todo el proyecto (ahora usa prefijo com├║n como clave)

### v1.5.1 (Enero 2026)
- **Feature:** Selecci├│n jer├írquica de ramas en Panor├ímica ÔÇö el dropdown ahora incluye grupos de prefijos (­ƒôü) adem├ís de ramas individuales (­ƒôä)
- **Feature:** Cache persistente para pesta├▒a Panor├ímica ÔÇö datos se restauran autom├íticamente al reabrir modal
- **UI:** Banner con antig├╝edad del cache y bot├│n "Refrescar"
- **Fix:** Corregido bug de referencias circulares (`node.data = node`) que imped├¡a serializar cache
- **Tech:** Funciones `savePanoramicCache` y `loadPanoramicCache` con limpieza/restauraci├│n de refs circulares
- **UI:** Nuevo layout de dos columnas ÔÇö controles en esquina superior derecha
- **UI:** Textos de nodos ahora se muestran completos (sin truncar a 50 chars)
- **UI:** Controles m├ís compactos para dar protagonismo a la lista de nodos

### v1.5.0 (Enero 2026)
- **Feature:** Nueva pesta├▒a "Panor├ímica" ÔÇö vista sint├®tica de todas las ramas del grafo
- **UI:** Visualizaci├│n compacta horizontal: QUE ÔåÆ CLM ÔåÆ EVD
- **UI:** Filtrado por proyecto
- **UI:** Estad├¡sticas de nodos (preguntas, afirmaciones, evidencias)
- **UI:** Click en cualquier nodo navega a Roam

### v1.4.2 (Enero 2026)
- **Feature:** Vista de ├írbol jer├írquico en pesta├▒a Proyectos ÔÇö organiza proyectos por namespace
- **UI:** Selecci├│n en cascada para eliminar m├║ltiples proyectos
- **UI:** Validaci├│n de existencia mostrada en ├írbol con indicadores Ô£à/ÔÜá´©Å

### v1.4.1 (Enero 2026)
- **Feature:** Vista de ├írbol jer├írquico en selector de proyectos de pesta├▒a Exportar
- **UI:** Selecci├│n en cascada ÔÇö marcar padre selecciona todos los hijos
- **UI:** Checkbox indeterminado cuando solo algunos hijos est├ín seleccionados
- **UI:** Badge con conteo de proyectos seleccionados por carpeta

### v1.4.0 (Enero 2026)
- **Feature:** Vista de ├írbol jer├írquico en pesta├▒a Ramas ÔÇö agrupa preguntas por namespace de proyecto
- **UI:** Proyectos colapsables con indicador de estado agregado (Ô£à/­ƒöÇ/ÔÜá´©Å/ÔØî)
- **UI:** Muestra conteo de preguntas y problemas por proyecto
- **Tech:** Nuevo m├│dulo `projectTreeUtils.js` con l├│gica de construcci├│n de ├írbol

### v1.3.2 (Enero 2026)
- **UI:** Botones de propagaci├│n separados:
  - `­ƒöä Propagar ra├¡z` ÔÇö para nodos sin proyecto o con proyecto diferente
  - `Ô¼å´©Å Heredar de padres` ÔÇö para corregir generalizaciones

### v1.3.1 (Enero 2026)
- **Feature:** Verificaci├│n jer├írquica padre-hijo ÔÇö cada nodo debe tener proyecto igual o m├ís espec├¡fico que su padre directo
- **Feature:** Detecci├│n de generalizaci├│n ÔÇö cuando un hijo tiene proyecto menos espec├¡fico que su padre
- **UI:** Muestra contexto del padre en errores: `Ô¼å´©Å Generaliza: proyecto ÔåÉ padre: proyecto/sub`

### v1.3.0 (Enero 2026)
- **Feature:** Namespaces jer├írquicos en verificaci├│n de ramas ÔÇö sub-proyectos como `proyecto/sub/detalle` son coherentes con `proyecto/sub`
- **Feature:** Propagaci├│n inteligente ÔÇö respeta especializaciones existentes al propagar proyectos
- **UI:** Nueva categor├¡a "­ƒöÇ Especializados" en pesta├▒a Ramas para distinguir nodos con sub-namespaces

### v1.2.8 (Enero 2026)
- **Feature:** Filtrado de atributos `Proyecto Asociado::` escapados con backticks ÔÇö evita que ejemplos en conversaciones de chatbot aparezcan como proyectos reales en "Buscar Sugerencias"
- **Docs:** Documentada restricci├│n de Roam sobre triple backticks en `AI_INSTRUCTIONS.md`

### v1.2.7 (Enero 2026)
- **Feature:** Persistencia del orden de preguntas ÔÇö el orden personalizado de QUEs se guarda por proyecto y se restaura autom├íticamente al reabrir

### v1.2.6 (Enero 2026)
- **Feature:** Espaciado visual en bloques estructurales EPUB ÔÇö los bloques `*ÔÇö texto ÔÇö*` ahora tienen m├írgenes adicionales (1.2em) para mejor legibilidad

### v1.2.5 (Enero 2026)
- **Feature:** Prefijos de tipo de nodo en EPUB ÔÇö los encabezados ahora muestran `[H2][QUE]`, `[H3][CLM]`, `[H4][EVD]` para indicar tanto el nivel jer├írquico como el tipo de elemento del discurso

### v1.2.4 (Enero 2026)
- **Feature:** Reordenamiento de preguntas (QUE) en la pesta├▒a Exportar con botones ÔåæÔåô
- **Feature:** Match jer├írquico de proyectos ÔÇö seleccionar `proyecto/sub` incluye `proyecto/sub/hijo`
- **Feature:** Auto-descubrimiento de proyectos al abrir el Toolkit con alerta "Agregar todos"
- **Refactoring:** Unificado c├│digo de generaci├│n Markdown en `markdownCore.js`
- **Mejora:** Eliminadas ~400 l├¡neas de c├│digo duplicado entre plugin y HTML
- **Mejora:** `markdownGenerator.js` reducido de 212 a 16 l├¡neas
- **Mejora:** `htmlEmbeddedScript.js` reducido de 628 a 180 l├¡neas

### v1.2.3 (Enero 2026)
- **Feature:** Exportaci├│n a EPUB completa directamente desde el navegador (usando JSZip)
- **Feature:** Nueva opci├│n de exportaci├│n Markdown Plano (sin bullets)
- **Mejora:** Prefijos de encabezado expl├¡citos ([H2]-[H5]) en EPUB para mejor legibilidad en dispositivos e-ink
- **UI:** Nuevos botones "MD Plano" y "EPUB" en la pesta├▒a Exportar
- **Tech:** Nuevo m├│dulo `epubGenerator.js`

### v1.2.1 (Diciembre 2025)
- **Fix:** Exportaci├│n Markdown ahora incluye EVDs de CLMs de soporte (estructura QUEÔåÆCLMÔåÆCLM(soporte)ÔåÆEVD)
- Sincronizaci├│n de l├│gica entre `markdownGenerator.js` y JS embebido en `htmlGenerator.js`
- Reorganizaci├│n de estructura del proyecto (carpetas `docs/`, `tests/`, `reference/`)
- Consolidaci├│n de documentaci├│n

### v1.2.0
- Verificaci├│n de coherencia de proyectos en ramas
- Propagaci├│n de `Proyecto Asociado::` a nodos descendientes
- Mejoras en UI de la pesta├▒a "Ramas"

### v1.1.x
- Correcciones de formateo de code blocks
- Filtro de MCP tool calls de Claude
- Mejoras en manejo de errores de exportaci├│n

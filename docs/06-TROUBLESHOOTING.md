# 🔧 Troubleshooting - Roam Discourse Selector v2.12.0

Guía de solución de problemas comunes y debugging avanzado.

---

## 📋 Contenidos

1. [Problemas de Instalación](#problemas-de-instalación)
2. [Problemas de Exportación](#problemas-de-exportación)
3. [Problemas de UI](#problemas-de-ui)
4. [Problemas de Proyectos](#problemas-de-proyectos)
5. [Debugging Avanzado](#debugging-avanzado)
6. [Preguntas Frecuentes](#preguntas-frecuentes)
7. [Errores Conocidos](#errores-conocidos)

---

## 1. Problemas de Instalación

### El modal no aparece después de instalar

**Síntomas**:
- Pegaste el código en [[roam/js]]
- Recargaste la página (F5)
- Pero al presionar Ctrl+P y escribir "exportar" no aparece el comando

**Diagnóstico**:

1. **Verifica la consola (F12)**:
   ```
   ¿Ves este mensaje en verde?
   ✅ Discourse Selector v2.12.0 cargado exitosamente
   ```

   - **Si SÍ lo ves**: El plugin se cargó correctamente
     - **Solución**: Busca en la paleta de comandos como "exportar" o "discourse"
     - O ejecuta manualmente: `window.roamDiscourseSelector.openModal()`

   - **Si NO lo ves**: El plugin no se cargó
     - **Continúa con paso 2**

2. **Busca errores en rojo en la consola**:

   **Error típico 1**: `Uncaught SyntaxError: Unexpected token`
   - **Causa**: El código no se pegó completamente o se corrompió
   - **Solución**:
     1. Borra TODO el bloque de código en [[roam/js]]
     2. Copia el código de nuevo desde el archivo fuente
     3. Asegúrate de copiar desde `/**` hasta `})();`
     4. Recarga con Ctrl+F5 (recarga forzada)

   **Error típico 2**: `React is not defined`
   - **Causa**: React no está cargando desde CDN
   - **Solución**:
     1. Verifica tu conexión a internet
     2. Verifica que puedas acceder a: https://unpkg.com/react@18.2.0/umd/react.production.min.js
     3. Si estás detrás de un firewall corporativo, puede estar bloqueado
     4. Contacta a IT o usa otra red

   **Error típico 3**: `roamAlphaAPI is not defined`
   - **Causa**: Estás en una página que no es Roam Research
   - **Solución**: Este plugin SOLO funciona en roamresearch.com, no funciona en sitios externos

3. **Verifica el bloque de código en [[roam/js]]**:

   - ¿Tiene resaltado de sintaxis (colores)?
     - **Si NO**: El bloque no es de tipo `javascript`
       - **Solución**: Bórralo y créalo de nuevo escribiendo:
         ```
         ```javascript
         ```
         (tres acentos graves + "javascript" + tres acentos graves)

   - ¿El código está completo?
     - **Verifica**: Primera línea debe ser `/**`
     - **Verifica**: Última línea debe ser `})();`
     - **Verifica**: Debe tener ~2685 líneas
     - Si falta código, copia de nuevo

4. **Verifica que estés usando la versión correcta**:

   - Línea 1 del código debe decir: `v2.12.0`
   - Si dice una versión anterior (v2.11.0, v2.10.5, etc.), descarga la versión actualizada

### El comando aparece pero el modal no se abre

**Síntomas**:
- El comando "Exportar Elementos de Discurso" aparece en Ctrl+P
- Al hacer clic, no pasa nada

**Diagnóstico**:

1. **Verifica la consola (F12)** inmediatamente después de hacer clic:

   **Si ves error**: `Cannot read property 'createElement' of undefined`
   - **Causa**: React no se cargó correctamente
   - **Solución**: Recarga con Ctrl+F5

   **Si ves error**: `Element with id 'discourse-export-modal' already exists`
   - **Causa**: Ya hay un modal abierto (invisible)
   - **Solución**: Ejecuta en consola:
     ```javascript
     const oldModal = document.getElementById('discourse-export-modal');
     if (oldModal) oldModal.remove();
     window.roamDiscourseSelector.openModal();
     ```

2. **Si no hay errores pero no se ve nada**:
   - Puede estar renderizado fuera de la pantalla visible
   - **Solución**: Ejecuta en consola:
     ```javascript
     const modal = document.getElementById('discourse-export-modal');
     if (modal) {
       modal.style.display = 'flex';
       modal.style.zIndex = '9999999';
       console.log('Modal encontrado:', modal);
     } else {
       console.log('Modal NO encontrado');
     }
     ```

### El plugin funcionaba pero dejó de funcionar después de actualizar Roam

**Causa**: Roam Research actualizó su API o estructura

**Solución**:
1. Verifica la consola buscando errores relacionados con `roamAlphaAPI`
2. Reporta el error en el repositorio del proyecto
3. Mientras tanto, revierte a una versión anterior de Roam si es posible

---

## 2. Problemas de Exportación

### "No se encontraron páginas"

**Síntomas**:
- Seleccionaste proyectos y tipos de elementos
- Hiciste clic en Exportar
- Mensaje: `❌ No se encontraron páginas con los filtros seleccionados`

**Diagnóstico**:

1. **Verifica que tus páginas tengan la estructura correcta**:

   **Estructura requerida**:
   ```
   Página: [[EVD]] - Descripción de la evidencia

   Contenido de la página:
   - Proyecto Asociado:: [[nombre del proyecto]]
   - Contenido adicional...
   ```

   **Errores comunes**:
   - ❌ `Proyecto Asociado: [[nombre]]` (un solo `:` en vez de `::`)
   - ❌ `Proyecto Asociado :: [[nombre]]` (espacio antes de `::`)
   - ❌ `[[EVD]]: Descripción` (`:` en vez de `-` en el título)
   - ❌ `Proyecto Asociado:: nombre` (sin `[[ ]]` en el nombre del proyecto)

2. **Verifica el nombre exacto del proyecto**:

   - Ejecuta en consola:
     ```javascript
     window.roamDiscourseSelector.debugAllProjects()
     ```
   - Busca el nombre EXACTO de tu proyecto en la lista
   - Copia y pega ese nombre al agregar proyecto manual

3. **Verifica que el proyecto tiene páginas con los prefijos seleccionados**:

   - Si seleccionaste solo [[QUE]] pero el proyecto solo tiene [[EVD]], no encontrará nada
   - **Solución**: Selecciona todos los tipos (EVD, QUE, CLM) para verificar

4. **Usa la función de debugging**:

   ```javascript
   window.roamDiscourseSelector.debugProjectPages('nombre exacto del proyecto')
   ```

   Esto te mostrará todas las páginas del proyecto. Si la lista está vacía, el proyecto no tiene páginas con la estructura correcta.

### "Exportación demasiado grande para el navegador"

**Mensaje completo**:
```
❌ Exportación demasiado grande para el navegador.
Intenta seleccionar menos páginas o proyectos.
```

**Causa**: localStorage tiene límite de ~5MB. Si el historial o datos temporales exceden este límite, falla.

**Solución**:

1. **Limpiar historial**:
   - Ve a pestaña "Historial"
   - Haz clic en "🗑️ Limpiar Historial"

2. **Exportar menos páginas**:
   - En vez de exportar todos los proyectos, exporta uno a la vez
   - O filtra por tipo de elemento

3. **Limpiar localStorage manualmente**:
   ```javascript
   localStorage.removeItem('roamDiscourseSelector_exportHistory');
   localStorage.removeItem('roamDiscourseSelector_projects');
   ```

4. **Si el problema persiste**:
   - El archivo JSON de exportación es muy grande
   - **Solución alternativa**: Aumentar memoria disponible
     - Cierra otras pestañas del navegador
     - Reinicia el navegador
     - O divide la exportación en múltiples partes

### "La exportación tardó demasiado tiempo"

**Mensaje completo**:
```
❌ La exportación tardó demasiado tiempo. El grafo es muy grande.
Intenta exportar menos páginas a la vez.
```

**Causa**: Timeout en la API de Roam (por defecto 2 minutos)

**Solución**:

1. **Divide la exportación**:
   - En vez de exportar 5 proyectos, exporta 2 a la vez

2. **Exporta solo un tipo de elemento**:
   - Solo [[EVD]], luego solo [[QUE]], etc.

3. **Verifica la carga del sistema**:
   - Cierra otras pestañas/aplicaciones
   - Verifica que Roam no esté sincronizando (espera a que termine)

### Exportación se descarga pero el archivo está vacío o corrupto

**Síntomas**:
- El archivo .json se descarga
- Al abrirlo en editor de texto, está vacío o dice `[]`
- O no se puede abrir

**Diagnóstico**:

1. **Verifica la consola inmediatamente después de exportar**:
   - ¿Hay algún error en rojo?
   - Si hay error en `transformToNativeFormat`, es un problema de transformación

2. **Verifica que las páginas tengan contenido**:
   ```javascript
   window.roamDiscourseSelector.debugProjectPages('nombre del proyecto')
   ```
   - Si las páginas aparecen, pero la exportación está vacía, es un bug

3. **Intenta exportar una sola página**:
   - Crea un proyecto de prueba con solo una página simple
   - Exporta ese proyecto
   - Si funciona, el problema está en alguna página específica con contenido corrupto

4. **Busca caracteres especiales problemáticos**:
   - Algunos caracteres pueden causar problemas en JSON: `\`, `"`, null bytes
   - Revisa manualmente las páginas que exportas

### El archivo JSON se descarga pero no se puede re-importar en Roam

**Síntomas**:
- Exportación exitosa
- Intentas importar el JSON en Roam
- Roam da error o no importa nada

**Causa**: Formato incompatible

**Solución**:

1. **Verifica el formato del JSON**:
   - Abre el archivo en un editor de texto
   - Debe ser un array de objetos:
     ```json
     [
       {
         "title": "[[EVD]] - Título",
         "children": [...],
         "edit-time": 1234567890,
         "create-time": 1234567890
       }
     ]
     ```

2. **Valida el JSON**:
   - Usa un validador online: https://jsonlint.com/
   - Pega el contenido y verifica que es JSON válido

3. **Si el JSON es válido pero Roam no lo importa**:
   - Puede ser que Roam cambió su formato de importación
   - Verifica en la documentación oficial de Roam
   - Reporta el problema en el repositorio del plugin

---

## 3. Problemas de UI

### El modal se ve cortado o fuera de pantalla

**Solución**:

1. **Zoom del navegador**:
   - Presiona `Ctrl+0` (Windows/Linux) o `Cmd+0` (Mac) para resetear zoom

2. **Reposicionar el modal**:
   - Ejecuta en consola:
     ```javascript
     const modal = document.getElementById('discourse-export-modal');
     if (modal) {
       modal.style.display = 'flex';
       modal.style.alignItems = 'center';
       modal.style.justifyContent = 'center';
     }
     ```

3. **Ventana demasiado pequeña**:
   - Maximiza la ventana del navegador
   - O agranda manualmente

### Los checkboxes no se pueden marcar

**Síntomas**:
- Haces clic en checkboxes pero no se marcan
- O se marcan pero inmediatamente se desmarcan

**Causa**: Conflicto de eventos o estado corrupto

**Solución**:

1. **Cierra y reabre el modal**:
   - Presiona `Escape`
   - Abre de nuevo con `Ctrl+P` → "Exportar"

2. **Recarga Roam**:
   - `F5` o `Ctrl+R`

3. **Si persiste**:
   - Verifica la consola por errores
   - Puede ser un conflicto con otro plugin

### El modal no se cierra con Escape

**Solución**:

1. **Verifica que el foco esté en el modal**:
   - Haz clic dentro del modal
   - Luego presiona Escape

2. **Cierra manualmente**:
   - Haz clic en la X en la esquina superior derecha
   - O haz clic fuera del modal (en el overlay oscuro)

3. **Fuerza cierre desde consola**:
   ```javascript
   const modal = document.getElementById('discourse-export-modal');
   if (modal) modal.remove();
   ```

### Las pestañas no cambian al hacer clic

**Solución**:

1. **Verifica que no estés en medio de una exportación**:
   - Si ves "Exportando...", espera a que termine

2. **Recarga el modal**:
   - Cierra con Escape
   - Abre de nuevo

3. **Si persiste**:
   - Ejecuta en consola:
     ```javascript
     window.roamDiscourseSelector.invalidateCache();
     ```

---

## 4. Problemas de Proyectos

### Proyecto no aparece en la lista

**Síntomas**:
- Sabes que tu proyecto existe en Roam
- Pero no aparece en la lista de proyectos del modal

**Diagnóstico**:

1. **Verifica que el proyecto tenga la estructura correcta**:
   - Debe haber al menos una página con "Proyecto Asociado:: [[nombre]]"

2. **Busca el proyecto manualmente**:
   ```javascript
   window.roamDiscourseSelector.debugAllProjects()
   ```
   - Si NO aparece en esta lista, el plugin no lo detecta
   - **Causa probable**: Error en la sintaxis de "Proyecto Asociado::"

3. **Verifica espacios y mayúsculas**:
   - ❌ `Proyecto asociado::` (minúscula en "asociado")
   - ✅ `Proyecto Asociado::`
   - ❌ `ProyectoAsociado::` (sin espacio)

4. **Agrega el proyecto manualmente**:
   - Ve a pestaña "Gestionar Proyectos"
   - Escribe el nombre EXACTO (sin `[[ ]]`)
   - Haz clic en "Agregar Proyecto"

### No puedo eliminar un proyecto

**Síntomas**:
- El botón 🗑️ no aparece junto al proyecto
- O aparece pero no se puede hacer clic

**Causa**: Solo se pueden eliminar proyectos agregados manualmente, no los detectados automáticamente

**Solución**:

1. **Verifica el badge del proyecto**:
   - Si dice "del grafo" → No se puede eliminar (es auto-detectado)
   - Si dice "manual" → Sí se puede eliminar

2. **Para "eliminar" un proyecto del grafo**:
   - No puedes eliminarlo desde el plugin
   - Debes ir a Roam y eliminar/modificar el bloque "Proyecto Asociado::" en las páginas

### "Proyecto no encontrado en el grafo" al verificar

**Síntomas**:
- Agregaste proyecto manualmente
- Al hacer clic en "Verificar Proyectos en Grafo"
- Aparece ❌ rojo junto al proyecto

**Causa**: El nombre del proyecto no coincide exactamente con el nombre en Roam

**Solución**:

1. **Busca el nombre exacto**:
   ```javascript
   window.roamDiscourseSelector.debugAllProjects()
   ```

2. **Compara**:
   - Nombre en lista de proyectos del plugin
   - vs. nombre en la salida de debugAllProjects()

3. **Diferencias comunes**:
   - Espacios extra: `proyecto A` vs `proyecto  A` (dos espacios)
   - Mayúsculas: `Proyecto A` vs `proyecto a`
   - Caracteres especiales: `proyecto/A` vs `proyecto\A`

4. **Elimina el proyecto manual incorrecto**:
   - Haz clic en 🗑️
   - Agrega de nuevo con el nombre correcto (copia y pega desde debugAllProjects)

---

## 5. Debugging Avanzado

### Funciones de Debugging Disponibles

El plugin expone funciones globales para debugging:

#### 1. debugAllProjects()

**Propósito**: Listar todos los proyectos detectados en el grafo

**Uso**:
```javascript
window.roamDiscourseSelector.debugAllProjects()
```

**Output esperado**:
```
📊 TODOS LOS PROYECTOS DETECTADOS EN EL GRAFO (3)
  - artículo/sociabilidad en Simmel
  - tesis/redes sociales Bourdieu
  - libro/Foucault poder
```

**Si no aparece nada**:
- Ninguna página en tu grafo tiene "Proyecto Asociado::"
- O hay un error de sintaxis en todas ellas

#### 2. debugProjectPages(projectName)

**Propósito**: Mostrar todas las páginas de un proyecto específico

**Uso**:
```javascript
window.roamDiscourseSelector.debugProjectPages('artículo/sociabilidad en Simmel')
```

**Output esperado**:
```
📊 PÁGINAS DEL PROYECTO: artículo/sociabilidad en Simmel
┌─────────────────────────────────────────┬──────────┐
│ Título                                  │ UID      │
├─────────────────────────────────────────┼──────────┤
│ [[EVD]] - Simmel define sociabilidad...│ abc123   │
│ [[QUE]] - ¿Cómo se relaciona...        │ xyz789   │
│ [[CLM]] - La sociabilidad es...        │ def456   │
└─────────────────────────────────────────┴──────────┘
```

**Si no aparece nada**:
- El proyecto no tiene páginas con [[EVD]], [[QUE]], o [[CLM]]
- O el nombre del proyecto está mal escrito

#### 3. invalidateCache()

**Propósito**: Forzar recarga de proyectos (útil si acabas de agregar proyectos en Roam)

**Uso**:
```javascript
window.roamDiscourseSelector.invalidateCache()
```

**Output esperado**:
```
🔄 Caché invalidado (nota: no hay caché real, pero puedes cerrar y reabrir el modal)
```

**Cuándo usar**:
- Después de agregar nuevos proyectos en Roam
- Después de modificar nombres de proyectos
- Si la lista de proyectos parece desactualizada

### Inspeccionar localStorage

**Ver proyectos manuales guardados**:
```javascript
const projects = localStorage.getItem('roamDiscourseSelector_projects');
console.log('Proyectos manuales:', JSON.parse(projects));
```

**Ver historial de exportaciones**:
```javascript
const history = localStorage.getItem('roamDiscourseSelector_exportHistory');
console.log('Historial:', JSON.parse(history));
```

**Limpiar todo localStorage del plugin**:
```javascript
localStorage.removeItem('roamDiscourseSelector_projects');
localStorage.removeItem('roamDiscourseSelector_exportHistory');
console.log('✓ localStorage limpiado');
```

### Debugging de Queries Datalog

Si sospechas que las queries Datalog no funcionan:

**Test manual de query**:
```javascript
// Buscar todas las páginas con [[EVD]]
const query = `
  [:find ?uid ?title
   :where
     [?p :node/title ?title]
     [?p :block/uid ?uid]
     [(re-find #"^\\[\\[EVD\\]\\]" ?title)]
  ]
`;

const results = await window.roamAlphaAPI.data.async.q(query);
console.log('Resultados:', results);
```

**Test de pull_many**:
```javascript
// Descargar datos de una página específica
const uid = 'abc123';  // Reemplaza con UID real
const data = await window.roamAlphaAPI.data.async.pull_many(
  '[*]',
  [uid]
);
console.log('Datos de la página:', data);
```

### Monitoring de Performance

**Medir tiempo de exportación**:
```javascript
// La exportación ya incluye métricas
// Busca en consola después de exportar:
// ⏱️ Completado en XXXms
```

**Si es muy lento (>10 segundos)**:
1. Verifica cuántas páginas estás exportando
2. Reduce el número de proyectos/tipos
3. Cierra otras pestañas del navegador

### Capturar errores de la API de Roam

**Wrapper para capturar errores**:
```javascript
// Ejecuta queries con manejo de errores
async function safeQuery(query) {
  try {
    const result = await window.roamAlphaAPI.data.async.q(query);
    console.log('✓ Query exitoso:', result);
    return result;
  } catch (error) {
    console.error('❌ Error en query:', error);
    console.error('Query que falló:', query);
    return null;
  }
}

// Uso
const results = await safeQuery(`[:find ?uid :where [?p :block/uid ?uid]]`);
```

---

## 6. Preguntas Frecuentes

### ¿Puedo usar el plugin en múltiples grafos?

**Sí**, pero cada grafo tiene su propia configuración:
- Los proyectos manuales se guardan en localStorage del navegador
- Si cambias de grafo en la misma sesión del navegador, mantiene los proyectos
- Si accedes desde otro navegador/computadora, no estarán

**Solución**: Los proyectos manuales también se sincronizan con la página [[roam/js/discourse-selector/projects]] en Roam, por lo que si sincronizas el grafo, los proyectos se sincronizan también.

### ¿El historial de exportaciones se sincroniza entre dispositivos?

**No**, el historial se guarda en localStorage, que es específico del navegador.

**Alternativa**: Puedes ver un registro manual en la página [[roam/js/discourse-selector/projects]] si agregas notas manualmente.

### ¿Puedo exportar páginas sin "Proyecto Asociado::"?

**No directamente**, el plugin está diseñado para filtrar por proyectos.

**Alternativa**:
1. Crea un proyecto temporal llamado "sin-proyecto"
2. Agrega manualmente ese proyecto en el modal
3. Agrega "Proyecto Asociado:: [[sin-proyecto]]" a las páginas que quieres exportar
4. Exporta el proyecto "sin-proyecto"

### ¿Puedo cambiar los prefijos [[EVD]], [[QUE]], [[CLM]]?

**No sin modificar el código**.

**Si necesitas otros prefijos**:
1. Abre `roam-js-version.js` en un editor
2. Busca las líneas que definen los prefijos (líneas 204-208 aproximadamente)
3. Modifica el regex: `#"^\\[\\[(EVD|QUE|CLM)\\]\\]"` → agrega tus prefijos
4. Guarda y pega el código modificado en [[roam/js]]

**Ejemplo**: Para agregar [[HIP]] (hipótesis):
```javascript
// Cambiar:
[(re-find #"^\\[\\[(EVD|QUE|CLM)\\]\\]" ?title)]

// Por:
[(re-find #"^\\[\\[(EVD|QUE|CLM|HIP)\\]\\]" ?title)]
```

### ¿Puedo exportar a otros formatos además de JSON?

**Actualmente no**, el plugin solo exporta a JSON nativo de Roam.

**Alternativa**:
1. Exporta el JSON
2. Usa una herramienta externa para convertir a Markdown, CSV, etc.
3. O modifica el código para agregar transformadores adicionales

### ¿El plugin funciona offline?

**Parcialmente**:
- React se carga desde CDN (requiere internet)
- Las queries Datalog funcionan offline
- La exportación funciona offline

**Si no tienes internet**:
- La primera carga del plugin fallará (React no se carga)
- Si ya se cargó previamente y tienes Roam en modo offline, funcionará

### ¿Puedo automatizar exportaciones?

**Sí**, desde la consola:

```javascript
// Ejemplo: Exportar proyecto específico
async function autoExport() {
  // Abrir modal
  window.roamDiscourseSelector.openModal();

  // Esperar 1 segundo a que cargue
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Nota: No hay API programática actualmente
  // Debes hacer clic manualmente en los checkboxes y botón de exportar

  // Alternativa: Modificar el código para exponer función de exportación
}
```

**Mejor solución**: Modificar el código para exponer una función de exportación programática:

```javascript
// Agregar al final de roam-js-version.js (antes del cierre del IIFE)
window.roamDiscourseSelector.exportProjects = async function(projects, types) {
  // ... lógica de exportación
};

// Uso:
await window.roamDiscourseSelector.exportProjects(
  ['artículo/Simmel'],
  ['EVD', 'QUE']
);
```

---

## 7. Errores Conocidos

### Bug: Modal se abre dos veces al hacer doble clic rápido

**Descripción**: Si haces doble clic muy rápido en el comando, se abren dos modales superpuestos

**Workaround**: Haz clic una sola vez y espera

**Fix planeado**: Agregar debounce al comando

### Bug: Nombres de archivo muy largos pueden fallar en Windows

**Descripción**: Windows tiene límite de 255 caracteres en nombres de archivo. Si exportas muchos proyectos, el nombre puede ser demasiado largo.

**Ejemplo de nombre problemático**:
```
roam_export_proyecto1_proyecto2_proyecto3_proyecto4_proyecto5_2025-11-18.json
```

**Workaround**: Exporta menos proyectos a la vez

**Fix planeado**: Truncar nombre de archivo automáticamente

### Bug: Caracteres Unicode especiales pueden causar problemas

**Descripción**: Algunos emojis o caracteres especiales en nombres de proyectos pueden causar problemas en la exportación

**Ejemplo problemático**:
- Proyecto Asociado:: [[📚 Proyecto con emoji]]

**Workaround**: Evita usar emojis en nombres de proyectos, o renómbralos sin emojis antes de exportar

**Fix planeado**: Sanitización mejorada de nombres

---

## 🆘 ¿Nada Funcionó?

Si ninguna de las soluciones anteriores funcionó:

### Paso 1: Recolecta información

1. **Versión del plugin**:
   - Busca en la línea 1 del código: `v2.X.X`

2. **Navegador y versión**:
   - Chrome/Edge: `chrome://version`
   - Firefox: `about:support`

3. **Errores de consola**:
   - Abre F12
   - Copia TODOS los mensajes en rojo

4. **Pasos para reproducir**:
   - ¿Qué hiciste exactamente antes del problema?
   - ¿Puedes reproducirlo consistentemente?

### Paso 2: Reset completo

**Prueba esto como último recurso**:

```javascript
// 1. Limpiar localStorage
localStorage.removeItem('roamDiscourseSelector_projects');
localStorage.removeItem('roamDiscourseSelector_exportHistory');

// 2. Eliminar modal si existe
const modal = document.getElementById('discourse-export-modal');
if (modal) modal.remove();

// 3. Recargar Roam
location.reload();

// 4. Después de recargar, reabre el modal
window.roamDiscourseSelector.openModal();
```

### Paso 3: Reinstalación limpia

1. Ve a [[roam/js]] en Roam
2. Elimina TODO el bloque de código del plugin
3. Recarga Roam (F5)
4. Copia el código de nuevo desde el archivo fuente
5. Pega en un bloque de código nuevo
6. Recarga Roam (F5)

### Paso 4: Reporta el problema

Si después de todo esto sigue sin funcionar, es un bug no documentado.

**Información para reportar**:
- Versión del plugin
- Navegador y versión
- Sistema operativo
- Errores de consola (completos)
- Pasos para reproducir
- Captura de pantalla (si es relevante)

---

**Última actualización**: Noviembre 2025
**Versión**: 2.12.0

**¿Necesitas más ayuda?**
- Consulta [Para Colaboradores](03-PARA-COLABORADORES.md) para modificar el código
- Consulta [Arquitectura del Código](04-ARQUITECTURA-CODIGO.md) para entender cómo funciona

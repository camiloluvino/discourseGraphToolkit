# 📖 Guía de Uso Completa - Roam Discourse Selector v2.12.0

Guía exhaustiva de todas las funcionalidades del plugin.

---

## 📋 Tabla de Contenidos

1. [Estructura Requerida en Roam](#estructura-requerida-en-roam)
2. [Abrir el Plugin](#abrir-el-plugin)
3. [Pestaña: Exportar](#pestaña-exportar)
4. [Pestaña: Gestionar Proyectos](#pestaña-gestionar-proyectos)
5. [Pestaña: Historial](#pestaña-historial)
6. [Funciones de Debugging](#funciones-de-debugging)
7. [Ejemplos Completos](#ejemplos-completos)
8. [Atajos de Teclado](#atajos-de-teclado)

---

## 1. Estructura Requerida en Roam

Para que el plugin funcione, tu grafo de Roam debe seguir esta estructura:

### Páginas de Elementos de Discurso

Tus páginas deben tener títulos que **empiecen** con uno de estos prefijos:

- `[[EVD]] - Descripción...` → Evidencias
- `[[QUE]] - Descripción...` → Preguntas de investigación
- `[[CLM]] - Descripción...` → Claims/Afirmaciones

### Bloque de Proyecto Asociado

Dentro de cada página, debe haber un bloque que especifique el proyecto:

```
Proyecto Asociado:: [[nombre del proyecto]]
```

### Ejemplo Completo

```
Página: [[EVD]] - La investigación de Simmel documenta...

Contenido de la página:
- Proyecto Asociado:: [[artículo/sociabilidad en Simmel]]
- Sección narrativa:: Introducción
- Contenido...
  - Sub-bloque 1
  - Sub-bloque 2
```

---

## 2. Abrir el Plugin

Hay dos formas de abrir el modal:

### Opción A: Paleta de Comandos (Recomendada)
1. Presiona `Ctrl+P` (o `Cmd+P` en Mac)
2. Escribe "exportar"
3. Selecciona "Exportar Elementos de Discurso"
4. Presiona Enter

### Opción B: Desde Consola
1. Abre la consola (F12)
2. Ejecuta: `window.roamDiscourseSelector.openModal()`

---

## 3. Pestaña: Exportar

Esta es la pestaña principal para exportar tus elementos de discurso.

### Paso 1: Seleccionar Proyectos

En la sección "Seleccionar Proyectos para Exportar":

- Verás una lista de **todos los proyectos** detectados en tu grafo
- Marca con ✓ los proyectos que quieres exportar
- Puedes seleccionar **uno o múltiples** proyectos
- Si hay más de 3 proyectos, aparecerá un cuadro de búsqueda

**Búsqueda de proyectos** (si hay >3):
- Escribe en el cuadro "🔍 Buscar proyectos..."
- Los proyectos se filtran en tiempo real

### Paso 2: Seleccionar Elementos de Discurso

Marca los tipos de elementos que quieres exportar:

- ☑ `[[EVD]]` - Evidencias
- ☑ `[[QUE]]` - Preguntas
- ☑ `[[CLM]]` - Claims

Puedes marcar uno, dos o los tres tipos.

### Paso 3: Incluir Referencias (Opcional)

Para cada tipo de elemento, puedes marcar:

- ☑ "Incluir [[EVD]] referenciadas sin proyecto"
- ☑ "Incluir [[QUE]] referenciadas sin proyecto"
- ☑ "Incluir [[CLM]] referenciadas sin proyecto"

**¿Qué hace esto?**
- Busca elementos que estén **referenciados** en las páginas principales
- Aunque esos elementos no tengan "Proyecto Asociado::"
- Útil para incluir evidencias citadas en tus preguntas de investigación

### Paso 4: Vista Previa (Opcional)

Antes de exportar, puedes hacer clic en:

**"👁️ Vista Previa de Páginas"**

Esto te muestra:
- Cuántas páginas se van a exportar
- Los títulos de todas las páginas
- Sin descargar nada

### Paso 5: Exportar

Haz clic en **"📥 Exportar JSON"**

**Progreso durante la exportación:**
1. `🔍 Buscando en proyecto 1/3: "nombre del proyecto"...`
2. `✓ Encontradas 42 páginas en 3 proyecto(s)`
3. `📡 Descargando datos de Roam...`
4. `✓ Datos descargados en 234ms`
5. `🔄 Transformando 42 página(s) al formato nativo...`
6. `✓ Procesadas 15/42 páginas...`
7. `✅ Exportadas 42 página(s) de 3 proyecto(s)`
8. `⏱️ Completado en 456ms`

**Resultado:**
- Se descarga un archivo JSON con nombre: `roam_export_proyecto_2025-11-18.json`
- El **modal permanece abierto** (desde v2.12.0)
- Puedes hacer otra exportación sin cerrar el modal

---

## 4. Pestaña: Gestionar Proyectos

En esta pestaña puedes administrar manualmente tus proyectos.

### Auto-detección vs. Manual

El plugin detecta automáticamente proyectos de dos fuentes:

1. **Proyectos del grafo**: Detectados automáticamente buscando "Proyecto Asociado::" en todas las páginas
2. **Proyectos manuales**: Agregados manualmente (se guardan en localStorage Y en Roam)

### Agregar Proyecto Manualmente

1. En la caja de texto, escribe el nombre del proyecto (sin `[[ ]]`)
2. Haz clic en "➕ Agregar Proyecto"
3. El proyecto se guarda en localStorage Y se sincroniza con la página `[[roam/js/discourse-selector/projects]]` en Roam

**Importante:**
- No uses corchetes `[[ ]]`
- Escribe exactamente igual que en "Proyecto Asociado::"

### Eliminar Proyecto

1. Busca el proyecto en la lista
2. Haz clic en el botón "🗑️" a la derecha
3. Confirma la eliminación

**Nota**: Solo puedes eliminar proyectos agregados manualmente, no los detectados automáticamente.

### Verificar Proyectos en el Grafo

Haz clic en **"✓ Verificar Proyectos en Grafo"**

Esto revisa si cada proyecto existe realmente en tu grafo:
- ✅ Verde = Proyecto encontrado
- ❌ Rojo = Proyecto NO encontrado (puede estar mal escrito)

---

## 5. Pestaña: Historial

**NUEVA en v2.12.0** 🎉

Esta pestaña muestra las **últimas 5 exportaciones** realizadas.

### Información Mostrada

Para cada exportación verás:

**Exportación Exitosa (verde):**
- ✅ Exportación exitosa
- Fecha y hora: `18/11/2025 14:32`
- Proyectos: `artículo/Simmel, tesis/Bourdieu`
- Páginas exportadas: `42 (2345ms)`

**Exportación con Error (rojo):**
- ❌ Error en exportación
- Fecha y hora: `18/11/2025 14:30`
- Proyectos: `libro/Foucault`
- Mensaje de error específico

### Limpiar Historial

Haz clic en **"🗑️ Limpiar Historial"** para borrar todas las entradas.

Se te pedirá confirmación antes de borrar.

**Nota**: El historial se guarda en localStorage, por lo que persiste entre sesiones.

---

## 6. Funciones de Debugging

Abre la consola del navegador (F12) y usa estas funciones:

### `window.roamDiscourseSelector.debugAllProjects()`

Muestra TODOS los proyectos detectados en tu grafo:
```javascript
window.roamDiscourseSelector.debugAllProjects()
```

**Output:**
```
📊 TODOS LOS PROYECTOS DETECTADOS EN EL GRAFO (2)
  - artículo/sociabilidad en Simmel
  - tesis/redes sociales Bourdieu
```

Útil para:
- Ver el nombre EXACTO de tus proyectos
- Copiar y pegar el nombre sin errores

### `window.roamDiscourseSelector.debugProjectPages(nombre)`

Muestra todas las páginas de un proyecto específico:
```javascript
window.roamDiscourseSelector.debugProjectPages('artículo/sociabilidad en Simmel')
```

**Output:**
```
📊 PÁGINAS DEL PROYECTO: artículo/sociabilidad en Simmel
┌─────────────────────────────────────────┬──────────┐
│ Título                                  │ UID      │
├─────────────────────────────────────────┼──────────┤
│ [[EVD]] - Simmel sobre sociabilidad... │ abc123   │
│ [[QUE]] - ¿Cómo define Simmel...       │ xyz789   │
└─────────────────────────────────────────┴──────────┘
```

### `window.roamDiscourseSelector.invalidateCache()`

Limpia el caché de proyectos:
```javascript
window.roamDiscourseSelector.invalidateCache()
```

Útil si:
- Agregaste nuevos proyectos y no aparecen
- Los proyectos no se actualizan

---

## 7. Ejemplos Completos

### Ejemplo 1: Exportar un Solo Proyecto

**Objetivo**: Exportar todas las evidencias del proyecto "artículo/Simmel"

**Pasos**:
1. Abrir modal: `Ctrl+P` → "Exportar"
2. Pestaña "Exportar"
3. Marcar proyecto: ✓ `artículo/sociabilidad en Simmel`
4. Marcar elementos: ✓ `[[EVD]]`
5. Click "📥 Exportar JSON"

**Resultado**:
- Archivo: `roam_export_articulo_sociabilidad_en_simmel_2025-11-18.json`
- Contiene todas las páginas [[EVD]] del proyecto

### Ejemplo 2: Exportar Múltiples Proyectos

**Objetivo**: Exportar evidencias y preguntas de dos proyectos

**Pasos**:
1. Marcar proyectos:
   - ✓ `artículo/Simmel`
   - ✓ `tesis/Bourdieu`
2. Marcar elementos:
   - ✓ `[[EVD]]`
   - ✓ `[[QUE]]`
3. Exportar

**Resultado**:
- Archivo: `roam_export_2_proyectos_2025-11-18.json`
- Contiene páginas de ambos proyectos combinadas

### Ejemplo 3: Incluir Referencias

**Objetivo**: Exportar preguntas Y las evidencias citadas en ellas

**Pasos**:
1. Marcar proyecto: ✓ `artículo/Simmel`
2. Marcar elementos: ✓ `[[QUE]]`
3. Marcar: ✓ "Incluir [[EVD]] referenciadas sin proyecto"
4. Exportar

**Qué hace**:
- Busca todas las [[QUE]] del proyecto
- Dentro de esas páginas, busca referencias a [[EVD]]
- Incluye esas [[EVD]] aunque no tengan "Proyecto Asociado::"

### Ejemplo 4: Workflow Completo

**Objetivo**: Múltiples exportaciones en una sesión

**Pasos**:
1. Exportar evidencias del proyecto A
2. Ver en pestaña "Historial" que se exportó correctamente
3. Volver a pestaña "Exportar" (el modal sigue abierto)
4. Cambiar selección: ahora proyecto B
5. Exportar de nuevo
6. Ver historial actualizado con ambas exportaciones
7. Cerrar modal manualmente

---

## 8. Atajos de Teclado

### En el Modal

- **Escape** → Cierra el modal
- **Enter** → Exporta (solo si estás en pestaña "Exportar" y no en un input)
- **Tab** → Navega entre elementos (focus trap activo)
- **Shift+Tab** → Navega hacia atrás

### General

- **Ctrl+P** → Abrir paleta de comandos
- **F12** → Abrir consola del navegador
- **F5** → Recargar Roam

---

## 💡 Tips y Mejores Prácticas

1. **Usa nombres descriptivos** para tus proyectos:
   - ✅ `artículo/sociabilidad en Simmel`
   - ❌ `proyecto1`

2. **Verifica antes de exportar**:
   - Usa "👁️ Vista Previa" para confirmar qué páginas se exportarán

3. **Aprovecha el historial**:
   - Revisa si una exportación anterior tuvo errores
   - Compara cuántas páginas exportaste en diferentes ocasiones

4. **Mantén el modal abierto**:
   - Desde v2.12.0, el modal no se cierra automáticamente
   - Útil para exportar múltiples configuraciones

5. **Debugging**:
   - Si algo no funciona, usa las funciones de debugging de la consola
   - `debugAllProjects()` te da los nombres exactos

---

## ❓ Preguntas Frecuentes

### ¿Puedo exportar todos los proyectos a la vez?

Sí, marca todos los proyectos en la lista y exporta. Se combinan en un solo archivo.

### ¿El historial se guarda permanentemente?

El historial se guarda en localStorage del navegador. Se mantiene entre sesiones, pero si limpias los datos del navegador, se perderá.

### ¿Puedo re-exportar sin cerrar el modal?

¡Sí! Desde v2.12.0, el modal permanece abierto. Cambia la selección y exporta de nuevo.

### ¿Qué formato tiene el JSON exportado?

Es el formato nativo de Roam Research, 100% compatible para re-importar usando la función de importación de Roam.

---

## ✅ Siguiente Paso

Si necesitas modificar el código o entender cómo funciona internamente:

👉 **[Para Colaboradores](03-PARA-COLABORADORES.md)**

---

**¿Tienes dudas?** Consulta también:
- [Troubleshooting](06-TROUBLESHOOTING.md)
- [README.md](../README.md)

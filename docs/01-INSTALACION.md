# 🚀 Instalación - Roam Discourse Selector v2.12.0

Guía paso a paso para instalar el plugin en Roam Research.

**Tiempo estimado**: 5 minutos

---

## 📋 Antes de Empezar

### Requisitos:
- Tener acceso a un grafo de Roam Research
- El grafo debe tener la página `[[roam/js]]` (Roam la crea automáticamente)
- Navegador web actualizado (Chrome, Firefox, Edge, Safari)

---

## 🔧 Instalación Paso a Paso

### **Paso 1: Copiar el Código del Plugin**

1. Ve al archivo `roam-js-version.js` en este repositorio
2. Abre el archivo en tu editor o en GitHub
3. Selecciona **TODO** el contenido:
   - Windows/Linux: `Ctrl+A`
   - Mac: `Cmd+A`
4. Copia el código:
   - Windows/Linux: `Ctrl+C`
   - Mac: `Cmd+C`

**Nota**: El archivo tiene aproximadamente **2685 líneas**. Asegúrate de copiar todo desde el inicio (`/**`) hasta el final (`})();`).

---

### **Paso 2: Abrir la Página de JavaScript en Roam**

1. Abre tu grafo en **Roam Research**
2. Haz clic en el ícono de **Settings** (⚙️) en la esquina superior derecha
3. En el cuadro de búsqueda, escribe: `[[roam/js]]`
4. Haz clic en la página `[[roam/js]]` para abrirla

---

### **Paso 3: Crear el Bloque de Código**

1. En la página `[[roam/js]]`, haz clic para crear un **nuevo bloque**
2. Escribe exactamente esto (con los acentos graves):
   ```
   ```javascript
   ```
3. Presiona **Enter**
4. Se creará un bloque de código con resaltado de sintaxis

---

### **Paso 4: Pegar el Código**

1. Haz clic **dentro** del bloque de código que acabas de crear
2. **Pega** el código que copiaste en el Paso 1:
   - Windows/Linux: `Ctrl+V`
   - Mac: `Cmd+V`
3. Haz clic **fuera** del bloque de código

**Importante**:
- El bloque debe tener **resaltado de sintaxis** (se verá con colores)
- Si no tiene colores, borra el bloque y repite desde el Paso 3

---

### **Paso 5: Recargar Roam**

1. Recarga la página completa de Roam:
   - Windows/Linux: `F5` o `Ctrl+R`
   - Mac: `Cmd+R`
2. Espera a que Roam cargue completamente

---

### **Paso 6: Verificar la Instalación**

#### Opción A: Usando la Consola del Navegador

1. Abre la consola del navegador:
   - Windows/Linux: `F12` o `Ctrl+Shift+J`
   - Mac: `Cmd+Option+J`
2. Busca este mensaje en verde:
   ```
   ✅ Discourse Selector v2.12.0 cargado exitosamente
   ```

#### Opción B: Probando el Plugin

1. Presiona `Ctrl+P` (o `Cmd+P` en Mac) para abrir la paleta de comandos
2. Escribe "exportar"
3. Deberías ver: **"Exportar Elementos de Discurso"**
4. Selecciónalo y presiona Enter
5. Se abrirá un modal con **3 pestañas**:
   - Exportar
   - Gestionar Proyectos
   - Historial

Si ves el modal con las 3 pestañas, **¡la instalación fue exitosa!** ✅

---

## ❌ Solución de Problemas

### El modal no aparece

**Solución 1**: Verifica el código
- Abre la página `[[roam/js]]`
- Asegúrate de que el bloque de código tenga resaltado de sintaxis
- El código debe empezar con `/**` y terminar con `})();`

**Solución 2**: Limpia la caché
- Presiona `Ctrl+Shift+Delete` (o `Cmd+Shift+Delete`)
- Limpia la caché del navegador
- Recarga con `Ctrl+F5` (recarga forzada)

### Errores en la consola

Si ves errores en rojo en la consola (F12):
1. Copia el mensaje de error completo
2. Verifica que hayas copiado TODO el código
3. Intenta borrar el bloque y pegar de nuevo

### El modal se ve diferente

Si el modal no tiene las 3 pestañas (Exportar, Gestionar, Historial):
- Estás usando una versión antigua del código
- Asegúrate de estar usando `roam-js-version.js` actualizado (v2.12.0)
- Verifica que el código tenga en el encabezado: `v2.12.0`

---

## ✅ Siguiente Paso

Una vez instalado correctamente, continúa con:

👉 **[Guía de Uso](02-GUIA-USO.md)** - Aprende a usar todas las funcionalidades

---

## 🔄 Actualización del Plugin

Si ya tienes una versión anterior instalada y quieres actualizar:

1. Ve a la página `[[roam/js]]` en Roam
2. Encuentra el bloque con el código del plugin antiguo
3. **Borra TODO** el contenido del bloque (deja el bloque vacío)
4. Sigue los pasos de instalación desde el **Paso 1**
5. Recarga la página (F5)

**Nota**: Tus proyectos guardados y el historial de exportaciones se mantienen (están en localStorage).

---

**¿Listo?** ¡Ahora puedes empezar a exportar tus elementos de discurso! 🎉

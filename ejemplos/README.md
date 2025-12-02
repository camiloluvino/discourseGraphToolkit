# 📂 Examples / Ejemplos

Esta carpeta contiene **ejemplos de exportaciones NATIVAS de Roam Research**.

## ⚠️ IMPORTANTE: Estos NO son outputs del plugin

**Todos los archivos JSON en esta carpeta fueron generados usando la función de exportación NATIVA de Roam Research**, no con el plugin Discourse Selector.

### ¿Por qué incluir exports nativos aquí?

Estos archivos sirven como:

1. **🎯 Referencias del formato correcto** - Muestran cómo debe verse un export nativo de Roam
2. **📊 Gold standard** - El plugin intenta replicar este formato usando `roamAlphaAPI.pull()`
3. **🧪 Testing** - Útiles para validar que el plugin genera estructura compatible
4. **📚 Ejemplos reales** - Casos de uso auténticos de análisis de discurso académico
5. **🔍 Comparación** - Permite comparar output del plugin vs export nativo

---

## 📑 Archivos Incluidos

### 1. `ejemploJSONSimmel.json` (216 KB)
**Proyecto:** artículo/sociabilidad en Simmel
**Páginas:** 5 (2 EVD, 2 QUE, 1 CLM)
**Bloques totales:** 476
**Tipo:** Export nativo de Roam Research

✅ **Documentado en:** [README-ejemploJSONSimmel.md](./README-ejemploJSONSimmel.md)

Ejemplo completo con documentación detallada que explica:
- Estructura del JSON nativo
- Campos duplicados (keyword + string)
- Manejo de referencias
- Metadata de usuarios
- Casos de uso

---

### 2. `ejemploJSONSimmelOUTPUTNATIVO.json` (216 KB)
**Proyecto:** artículo/sociabilidad en Simmel
**Tipo:** Export nativo de Roam Research (mismo contenido que el anterior)

⚠️ Archivo duplicado - posiblemente respaldo o versión alternativa del mismo proyecto.

---

### 3. `criticasDefensaTesis.json` (379 KB)
**Proyecto:** defensa proyecto tesis/críticas
**Páginas:** 40 (30 EVD, 8 CLM, 2 QUE)
**Tipo:** Export nativo de Roam Research

**Contenido:** Exportación de críticas y observaciones de evaluadores sobre un proyecto de tesis de investigación académica. Ejemplo más extenso que muestra:
- Mayor volumen de datos (40 páginas)
- Distribución realista de tipos de elementos
- Uso de metadata como `gestión de dato estructurado::`
- Referencias temporales y bloques anidados complejos

**Ejemplo de página:**
```
[[EVD]] - Se plantea falta de claridad sobre cómo las técnicas
propuestas (**análisis de contenido** y cartografía afectiva)
permitirán efectivamente acceder a los repertorios afectivos...
```

---

## 🔍 Características del Formato Nativo de Roam

Todos estos archivos comparten la estructura nativa de Roam:

### Estructura JSON
```json
[
  {
    "title": "[[EVD]] - título de la página",
    ":node/title": "[[EVD]] - título de la página",
    "uid": "abc123xyz",
    ":block/uid": "abc123xyz",
    "edit-time": 1755433568011,
    "create-time": 1755433568009,
    ":create/time": 1755433568009,
    "children": [...],
    "refs": [{"uid": "..."}, ...]
  },
  ...
]
```

### Campos Duplicados
Cada campo aparece en **dos formatos** para máxima compatibilidad:
- **Keyword format**: `:node/title`, `:block/uid`, `:create/time`
- **String format**: `"title"`, `"uid"`, `"create-time"`

### Referencias
Las referencias entre páginas se exportan como:
```json
"refs": [
  {"uid": "m57GtKmKU"}  // Solo UID, no contenido completo
]
```

Esto evita explosión del tamaño del archivo.

---

## 🆚 Diferencia con el Output del Plugin

### Export Nativo (estos archivos)
- ✅ Generado por Roam Research directamente
- ✅ Garantía de estructura 100% correcta
- ✅ Puede incluir campos adicionales internos
- ✅ Formato: Array simple `[{...}, {...}]`

### Export del Plugin v2.2.0
- 🔧 Generado por `window.roamAlphaAPI.pull_many()`
- 🔧 Intenta replicar formato nativo
- 🔧 Incluye wrapper de metadata:
  ```json
  {
    "export-date": "2025-11-17T...",
    "export-format": "roam-native-compatible",
    "version": "v2.2.0",
    "pages": [...]
  }
  ```
- 🔧 Limitaciones de profundidad (máx 10 niveles)
- 🔧 Referencias solo con UID (igual que nativo)

---

## 💡 Cómo Usar Estos Ejemplos

### Para Desarrollo del Plugin
1. **Comparar formatos** - Verificar que el plugin genera estructura compatible
2. **Testing** - Validar que el parsing funciona con estructura real
3. **Referencia de API** - Ver qué campos incluye Roam nativamente

### Para Usuarios del Plugin
1. **Ver ejemplos reales** - Entender casos de uso del análisis de discurso
2. **Verificar formato** - Comparar tus exports con estos ejemplos
3. **Importar de vuelta** - Estos archivos pueden importarse directamente a Roam

### Para Documentación
1. **Gold standard** - Referencia de cómo debe verse un export correcto
2. **Casos de uso** - Ejemplos auténticos de investigación académica
3. **Tamaño esperado** - Referencia de tamaños (5 páginas ≈ 216KB, 40 páginas ≈ 379KB)

---

## 📊 Estadísticas Comparativas

| Archivo | Tamaño | Páginas | EVD | QUE | CLM | Bloques |
|---------|--------|---------|-----|-----|-----|---------|
| ejemploJSONSimmel.json | 216 KB | 5 | 2 | 2 | 1 | 476 |
| criticasDefensaTesis.json | 379 KB | 40 | 30 | 2 | 8 | ~800+ |

**Observaciones:**
- Tamaño promedio: **~9.5KB por página** (cuando hay contenido complejo)
- Las páginas con más bloques anidados ocupan más espacio
- El formato nativo es relativamente compacto (sin espacios/indentación)

---

## 🔗 Archivos Relacionados

- **Plugin principal**: [roam-js-version.js](../roam-js-version.js)
- **README principal**: [README.md](../README.md)
- **CHANGELOG**: [CHANGELOG.md](../CHANGELOG.md)
- **Documentación de instalación**: [INSTALACION.md](../INSTALACION.md)

---

## ⚠️ Recordatorio Final

**TODOS los archivos `.json` en esta carpeta son EXPORTS NATIVOS de Roam Research.**

No son generados por el plugin Discourse Selector, sino que sirven como:
- 🎯 Referencias del formato que el plugin intenta replicar
- 📚 Ejemplos de casos de uso reales
- 🧪 Material de testing y validación

Si quieres ver un ejemplo del output actual del plugin v2.2.0, debes ejecutar el plugin en tu grafo de Roam.

---

**Última actualización:** 2025-11-17
**Versión del plugin:** v2.2.0

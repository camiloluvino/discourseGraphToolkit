# Principios de Arquitectura y Estándares de Colaboración
**Proyecto:** Discourse Graph Toolkit
**Contexto:** Extensión para Roam Research con arquitectura modular concatenada.

Este documento define la "Constitución" del proyecto para garantizar una colaboración fluida entre múltiples instancias de desarrollo (Humanos e IA) y mantener la integridad del código.

---

## 1. Reglas de Integridad (La Fuente de la Verdad)
> [!IMPORTANT]
> **LEER ANTES DE EDITAR:** Violaciones a estas reglas romperán el build o perderán trabajo.

*   **`src/` es Sagrado:** La carpeta `src/` es la ÚNICA fuente de la verdad.
*   **Artifactos de Salida:** El archivo `discourse-graph-toolkit.js` en la raíz es un archivo generado (output). **NUNCA** propongas ediciones directas sobre este archivo. Se sobrescribirá en el próximo build.
*   **Modificaciones Modulares:** Para cualquier feature, fix o refactor, debes identificar y editar el archivo específico dentro de `src/` (ej. `src/ui/modal.js`, `src/api/roam.js`).

> [!CAUTION]
> **FRAGILIDAD CRÍTICA - "Command Palette Desaparecida":**
> Si cometes UN solo error de sintaxis en cualquier lugar del código (especialmente paréntesis faltantes en `src/ui/modal.js` u objetos mal cerrados), **todo el script fallará silenciosamente al cargar**.
> *   **Síntoma:** Los comandos del Toolkit no aparecen en la Command Palette de Roam.
> *   **Causa Común:** Errores de anidación en React (Flex containers mal cerrados) o funciones faltantes concatenadas.
> *   **Prevención OBLIGATORIA:** Antes de notificar al usuario, EJECUTA SIEMPRE `node -c discourse-graph-toolkit.js` después del build. Si hay error de sintaxis, **NO** entregar nada al usuario hasta corregirlo.

## 2. Protocolo de Versionado
Para mantener un historial coherente de liberaciones:

*   **No tocar el header del JS:** No edites manualmente la versión en el comentario del encabezado de `discourse-graph-toolkit.js` ni en `src/index.js`.
*   **Editar `build.ps1`:** La versión maestra vive en la variable `$version` del script `build.ps1` (Línea ~3).
*   **Acción Requerida:** Al finalizar una tarea que modifique código funcional, incrementa la versión en `build.ps1` (ej. de `1.1.13` a `1.1.14`).

## 3. Arquitectura de Software

### 3.1. Abstracción de API (Clean Architecture)
*   **Principio:** Desacoplar la lógica de negocio de la API específica de Roam.
*   **Regla:** Ningún componente de UI (`src/ui/`) o lógica pura (`src/core/`) debe invocar `window.roamAlphaAPI` directamente.
*   **Implementación:** Todas las interacciones con la base de datos o interfaz de Roam deben residir en `src/api/roam.js`. La UI debe llamar a funciones de alto nivel de `DiscourseGraphToolkit` (que delegan a la API).

### 3.2. UX Resiliente y Manejo de Errores
*   **Principio:** El usuario nunca debe quedar en un estado "colgado".
*   **Regla:** Toda acción asíncrona disparada por el usuario (clicks, comandos) debe estar protegida por bloques `try/catch`.
*   **Implementación:**
    *   **Éxito:** Feedback visual claro (Toast success).
    *   **Error:** Capturar la excepción y mostrar un mensaje legible al usuario mediante `DiscourseGraphToolkit.showToast` (o `alert` si es crítico), nunca fallar silenciosamente en consola.

### 3.3. Inmutabilidad de Datos
*   **Principio:** Prevenir efectos secundarios en la base de datos local.
*   **Regla:** Los objetos retornados por `roamAlphaAPI` (como resultados de `pull` o `q`) deben tratarse como **solo lectura**.
*   **Implementación:** Si necesitas modificar un nodo para procesarlo o enviarlo de vuelta, crea una copia nueva del objeto. No mutar el objeto original en memoria.

## 4. Flujo de Trabajo (Workflow)

1.  **Analizar:** Entender qué módulo (`src/...`) es responsable de la lógica a cambiar.
2.  **Editar:** Modificar el archivo en `src/`.
3.  **Build:** Ejecutar (o solicitar ejecutar) `./build.ps1` para generar el nuevo bundle.
4.  **Versionar:** Si el cambio es estable, actualizar `$version` en `build.ps1`.

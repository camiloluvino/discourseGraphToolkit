# Especificación de Comportamiento Esperado: Discourse Graph Toolkit - Exportación

## 1. Definición de Relaciones Lógicas
El plugin debe priorizar y respetar estrictamente las siguientes relaciones semánticas del Discourse Graph:

### A. `#RespondedBy` (Respuesta)
*   **Origen:** `[[QUE]]` (Pregunta).
*   **Destino:** `[[CLM]]` (Afirmación).
*   **Significado:** La Afirmación responde o intenta responder a la Pregunta.
*   **Comportamiento en Exportación:** Las CLMs conectadas mediante `#RespondedBy` deben aparecer como hijos directos de la QUE.

### B. `#SupportedBy` (Soporte)
*   **Origen:** `[[CLM]]` (Afirmación).
*   **Destino:** `[[EVD]]` (Evidencia) o `[[CLM]]` (Otra Afirmación).
*   **Significado:** El nodo destino provee pruebas o razonamiento que sostiene la veracidad de la Afirmación origen.
*   **Comportamiento en Exportación:** Los nodos conectados mediante `#SupportedBy` deben anidarse bajo la CLM a la que soportan.

---

## 2. Escenario Ficticio Estricto

*   **Página:** `[[QUE]] - ¿Cuál es el impacto del sueño en la memoria?`
    *   **Bloque Contexto:** Esta pregunta investiga procesos cognitivos.
    *   **Bloque Relación 1:** `[[CLM]] - El sueño REM favorece la memoria procedimental` `#RespondedBy`
        *   **Contenido:** La consolidación ocurre durante esta fase.
        *   **Bloque Soporte 1.1:** `[[EVD]] - Estudio de Smith et al. (2020)` `#SupportedBy`
            *   *Contenido:* N=50 auditada mostrando mejoras del 20%.
        *   **Bloque Soporte 1.2:** `[[CLM]] - La actividad neuronal se reactiva en REM` `#SupportedBy`
            *   *Contenido:* Replay of patterns.
    *   **Bloque Relación 2:** `[[CLM]] - El sueño ligero no tiene impacto significativo` `#RespondedBy`
        *   **Contenido:** Estudios no muestran correlación.

## 3. Comportamiento Esperado (Selección y Orden)

### A. Selección Jerárquica
El algoritmo de exportación **SIEMPRE** debe seguir la cadena de:
1.  **Select QUE** -> Buscar todos los nodos marcados con `#RespondedBy` (sean hijos directos o referencias).
2.  **For each CLM** -> Buscar todos los nodos marcados con `#SupportedBy`.

### B. Ordenamiento (Sorting)
El orden en el archivo final (HTML/Markdown) debe ser **posicional**:
1.  **QUE** Título y Contenido.
2.  **CLM 1 (`#RespondedBy`)** (La que aparece primero en la página de la QUE).
    *   **EVD 1.1 (`#SupportedBy`)** (Primer soporte listado bajo CLM 1).
    *   **CLM 1.2 (`#SupportedBy`)** (Segundo soporte listado bajo CLM 1).
3.  **CLM 2 (`#RespondedBy`)** (La que aparece después en la página de la QUE).

**Falla Actual a Corregir:**
El plugin parece estar ignorando el orden posicional de los bloques en Roam y quizás solo busca referencies en metadatos desordenados, perdiendo la narrativa lógica construida por el usuario con `#RespondedBy` y `#SupportedBy`.

---

## 4. Escenarios de Configuración

Describimos el output esperado según las combinaciones de opciones en el Modal de Exportación.

### Caso 1: Extracción Total (Extract All QUE/CLM/EVD: ON | Exclude Bitácora: OFF)
*   **Objetivo:** Exportación "bruta" completa para backup o revisión interna exhaustiva.
*   **QUE:** Título + Metadatos + **Todos** los bloques de texto hijos.
*   **CLM:** Título + Metadatos + **Todos** los bloques de texto hijos (incluyendo citas, razonamientos).
*   **EVD:** Título + Metadatos + **Todos** los bloques de contenido (citas bibliográficas, imágenes, PDFs).
*   **Bitácora:** Los bloques anidados bajo `[[bitácora]]` **SE INCLUYEN**. No se realiza filtrado.

### Caso 2: Solo Estructura (Extract All QUE/CLM/EVD: OFF)
*   **Objetivo:** Índice o esqueleto argumental. Ver la lógica sin ruido.
*   **QUE:** **Solo** Título + Metadatos.
*   **CLM:** **Solo** Título + Metadatos.
*   **EVD:** **Solo** Título + Metadatos.
*   **Contenido:** No se muestran textos descriptivos ni bloques hijos que no sean nodos estructurales (otras CLMs/EVDs). El cuerpo del documento son solo los encabezados jerarquizados.

### Caso 3: Exportación Limpia (Extract All QUE/CLM/EVD: ON | Exclude Bitácora: ON)
*   **Objetivo:** Documento final para compartir o publicar.
*   **QUE/CLM/EVD:** Se incluye todo el contenido narrativo (igual que Caso 1).
*   **Filtrado:**
    *   Cualquier bloque que sea hijo (directo o indirecto) de un nodo `[[bitácora]]` o `[[Bitácora]]` es **ELIMINADO**.
    *   Si una rama entera de discusión está bajo bitácora, esa rama desaparece del output final.

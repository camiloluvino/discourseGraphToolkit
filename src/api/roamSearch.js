// ============================================================================
// API: Roam Search - Discourse Pages
// ============================================================================

// --- Lógica de Búsqueda ---
// Match jerárquico: incluye proyecto exacto Y sub-proyectos
// Ej: "tesis/marco" matchea "tesis/marco" y "tesis/marco/posicionamiento"
DiscourseGraphToolkit.findPagesWithProject = async function (projectName) {
    const PM = this.ProjectManager;
    const trimmedProject = projectName.trim();

    const escapedPattern = PM.getEscapedFieldPattern();
    const escapedProject = this.escapeDatalogString(trimmedProject);
    const escapedProjectPrefix = this.escapeDatalogString(trimmedProject + '/');

    // Query con OR: match exacto O sub-proyecto (prefijo/)
    const query = `[
            :find ?page-title ?page-uid
            :where
            [?page :node/title ?page-title]
            [?page :block/uid ?page-uid]
            [?block :block/page ?page]
            [?block :block/string ?string]
            [(clojure.string/includes? ?string "${escapedPattern}")]
            (or
                [(clojure.string/includes? ?string "[[${escapedProject}]]")]
                [(clojure.string/includes? ?string "[[${escapedProjectPrefix}")]
            )
        ]`;

    const results = await window.roamAlphaAPI.data.async.q(query);
    return results.map(r => ({ pageTitle: r[0], pageUid: r[1] }));
};

DiscourseGraphToolkit.queryDiscoursePages = async function (projectName, selectedTypes) {
    const pages = await this.findPagesWithProject(projectName);
    const prefixes = selectedTypes.map(t => `[[${t}]]`);
    return pages.filter(p => prefixes.some(prefix => p.pageTitle.startsWith(prefix)));
};

/**
 * Reverse-lookup: dado un set de UIDs de nodos hijo (CLM/EVD),
 * encuentra los nodos QUE/GRI padre que los referencian vía block refs.
 * @param {Array<string>} childUids - UIDs de nodos CLM/EVD
 * @returns {Promise<Array<{pageTitle: string, pageUid: string}>>}
 */
DiscourseGraphToolkit.findParentRootNodes = async function (childUids) {
    if (!childUids || childUids.length === 0) return [];

    const query = `[:find ?page-title ?page-uid
                    :in $ [?ref-uid ...]
                    :where
                    [?ref-page :block/uid ?ref-uid]
                    [?block :block/refs ?ref-page]
                    [?block :block/page ?page]
                    [?page :node/title ?page-title]
                    [?page :block/uid ?page-uid]
                    (or
                      [(clojure.string/starts-with? ?page-title "[[QUE]]")]
                      [(clojure.string/starts-with? ?page-title "[[GRI]]")])]`;

    try {
        const results = await window.roamAlphaAPI.data.async.q(query, childUids);
        return Array.from(new Map(results.map(r => [r[1], { pageTitle: r[0], pageUid: r[1] }])).values());
    } catch (e) {
        console.warn("Error finding parent root nodes:", e);
        return [];
    }
};

/**
 * Obtiene todas las preguntas (QUE) del grafo
 * @returns {Promise<Array<{pageTitle: string, pageUid: string}>>}
 */
DiscourseGraphToolkit.getAllQuestions = async function () {
    const query = `[:find ?title ?uid 
                   :where 
                   [?page :node/title ?title] 
                   [?page :block/uid ?uid]
                   [(clojure.string/starts-with? ?title "[[QUE]]")]]`;

    const results = await window.roamAlphaAPI.data.async.q(query);
    return results
        .map(r => ({ pageTitle: r[0], pageUid: r[1] }))
        .sort((a, b) => a.pageTitle.localeCompare(b.pageTitle));
};

/**
 * Obtiene todos los nodos raíz (GRI y QUE) del grafo
 * GRI y QUE son intercambiables como nodos de entrada al grafo
 * @returns {Promise<Array<{pageTitle: string, pageUid: string}>>}
 */
DiscourseGraphToolkit.getAllRootNodes = async function () {
    const query = `[:find ?title ?uid 
                   :where 
                   [?page :node/title ?title] 
                   [?page :block/uid ?uid]
                   (or
                     [(clojure.string/starts-with? ?title "[[GRI]]")]
                     [(clojure.string/starts-with? ?title "[[QUE]]")])]`;

    const results = await window.roamAlphaAPI.data.async.q(query);
    return results
        .map(r => ({ pageTitle: r[0], pageUid: r[1] }))
        .sort((a, b) => a.pageTitle.localeCompare(b.pageTitle));
};

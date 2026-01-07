// ============================================================================
// API: Roam Branch Verification
// ============================================================================

/**
 * Obtiene todos los nodos (CLM, EVD) descendientes de una pregunta RECURSIVAMENTE
 * Sigue la cadena completa: QUE -> CLM -> EVD, CLM -> CLM -> EVD, etc.
 * @param {string} questionUid - UID de la página de la pregunta
 * @returns {Promise<Array<{uid: string, title: string, type: string}>>}
 */
DiscourseGraphToolkit.getBranchNodes = async function (questionUid) {
    try {
        const allNodes = new Map(); // uid -> {uid, title, type}
        const visited = new Set();
        const toProcess = [questionUid];

        // Procesar iterativamente para evitar stack overflow en ramas muy profundas
        while (toProcess.length > 0) {
            const currentUid = toProcess.shift();

            if (visited.has(currentUid)) continue;
            visited.add(currentUid);

            // Obtener datos del nodo actual
            const rawData = await window.roamAlphaAPI.data.async.pull(
                this.ROAM_PULL_PATTERN,
                [':block/uid', currentUid]
            );

            if (!rawData) continue;

            // Transformar a formato usable
            const nodeData = this.transformToNativeFormat(rawData, 0, new Set(), true);
            if (!nodeData) continue;

            const nodeType = this.getNodeType(nodeData.title);

            // Si es CLM o EVD, agregarlo a la lista de nodos encontrados
            if (nodeType === 'CLM' || nodeType === 'EVD') {
                allNodes.set(currentUid, {
                    uid: currentUid,
                    title: nodeData.title,
                    type: nodeType
                });
            }

            // Buscar referencias en el contenido del nodo
            const referencedUids = this._extractAllReferencesFromNode(nodeData);

            // Agregar las referencias no visitadas a la cola de procesamiento
            for (const refUid of referencedUids) {
                if (!visited.has(refUid) && !toProcess.includes(refUid)) {
                    toProcess.push(refUid);
                }
            }
        }

        return Array.from(allNodes.values());

    } catch (e) {
        console.error("Error getting branch nodes:", e);
        return [];
    }
};

/**
 * Helper: Extrae TODAS las referencias de nodos discourse del contenido de un nodo
 * Busca en #RespondedBy, #SupportedBy, #RelatedTo
 */
DiscourseGraphToolkit._extractAllReferencesFromNode = function (nodeData) {
    const references = new Set();

    if (!nodeData || !nodeData.children) return references;

    const self = this;

    const processBlock = (block) => {
        if (!block) return;

        const str = block.string || "";

        // Si es un bloque de relación, extraer referencias
        if (str.includes("#RespondedBy") || str.includes("#SupportedBy") || str.includes("#RelatedTo")) {
            // Extraer refs del bloque actual
            self._extractRefsFromBlock(block, references);

            // Extraer refs de los hijos del bloque
            if (block.children) {
                for (const child of block.children) {
                    self._extractRefsFromBlock(child, references);
                    // También procesar sub-hijos (para estructuras más profundas)
                    if (child.children) {
                        for (const subChild of child.children) {
                            self._extractRefsFromBlock(subChild, references);
                        }
                    }
                }
            }
        }
    };

    // Procesar todos los hijos del nodo
    for (const child of nodeData.children) {
        processBlock(child);
    }

    return references;
};

/**
 * Helper: Extrae UIDs de referencias de un bloque
 */
DiscourseGraphToolkit._extractRefsFromBlock = function (block, collectedUids) {
    // Refs directas
    if (block.refs) {
        block.refs.forEach(r => {
            if (r.uid) collectedUids.add(r.uid);
        });
    }
    if (block[':block/refs']) {
        block[':block/refs'].forEach(r => {
            if (r[':block/uid']) collectedUids.add(r[':block/uid']);
        });
    }

    // Buscar referencias en el texto [[...]]
    const str = block.string || "";
    const pattern = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = pattern.exec(str)) !== null) {
        const refContent = match[1];
        // Si parece ser un nodo discourse (CLM, EVD, QUE)
        if (refContent.includes('[[CLM]]') || refContent.includes('[[EVD]]') || refContent.includes('[[QUE]]')) {
            // No podemos obtener el UID desde el texto, pero las refs directas ya lo tienen
        }
    }
};

/**
 * Obtiene el valor del atributo "Proyecto Asociado::" de un nodo
 * @param {string} pageUid - UID de la página
 * @returns {Promise<string|null>} - Nombre del proyecto o null si no existe
 */
DiscourseGraphToolkit.getProjectFromNode = async function (pageUid) {
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();

    const query = `[:find ?string
                   :where 
                   [?page :block/uid "${pageUid}"]
                   [?block :block/page ?page]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

    try {
        const results = await window.roamAlphaAPI.data.async.q(query);
        if (results && results.length > 0) {
            const blockString = results[0][0];
            // Extraer el valor entre [[ ]]
            const regex = PM.getFieldRegex();
            const match = blockString.match(regex);
            return match ? match[1].trim() : null;
        }
        return null;
    } catch (e) {
        console.error("Error getting project from node:", e);
        return null;
    }
};

/**
 * Verifica coherencia de proyectos en una rama
 * @param {string} rootUid - UID del QUE raíz
 * @param {Array<{uid: string, title: string, type: string}>} branchNodes - Nodos de la rama
 * @returns {Promise<{rootProject: string|null, coherent: Array, different: Array, missing: Array}>}
 */
DiscourseGraphToolkit.verifyProjectCoherence = async function (rootUid, branchNodes) {
    const PM = this.ProjectManager;

    // 1. Obtener proyecto del QUE raíz
    const rootProject = await this.getProjectFromNode(rootUid);

    // 2. Obtener proyecto de cada nodo
    const nodeUids = branchNodes.map(n => n.uid);
    const escapedPattern = PM.getEscapedFieldPattern();

    // Query para obtener todos los bloques de Proyecto Asociado de las páginas
    const query = `[:find ?page-uid ?string
                   :in $ [?page-uid ...]
                   :where 
                   [?page :block/uid ?page-uid]
                   [?block :block/page ?page]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

    const coherent = [];
    const different = [];
    const missing = [];

    try {
        const results = await window.roamAlphaAPI.data.async.q(query, nodeUids);

        // Crear mapa de UID -> proyecto
        const projectMap = new Map();
        const regex = PM.getFieldRegex();

        results.forEach(r => {
            const pageUid = r[0];
            const blockString = r[1];
            const match = blockString.match(regex);
            if (match) {
                projectMap.set(pageUid, match[1].trim());
            }
        });

        // 3. Clasificar nodos
        for (const node of branchNodes) {
            const nodeProject = projectMap.get(node.uid);

            if (!nodeProject) {
                missing.push({ ...node, project: null });
            } else if (rootProject && nodeProject === rootProject) {
                coherent.push({ ...node, project: nodeProject });
            } else {
                different.push({ ...node, project: nodeProject });
            }
        }

        return { rootProject, coherent, different, missing };
    } catch (e) {
        console.error("Error verifying project coherence:", e);
        return {
            rootProject,
            coherent: [],
            different: [],
            missing: branchNodes.map(n => ({ ...n, project: null }))
        };
    }
};

/**
 * Propaga el proyecto del QUE raíz a todos los nodos de la rama
 * @param {string} rootUid - UID del QUE raíz
 * @param {string} targetProject - Proyecto a propagar
 * @param {Array<{uid: string}>} nodesToUpdate - Nodos a actualizar
 * @returns {Promise<{success: boolean, updated: number, created: number, errors: Array}>}
 */
DiscourseGraphToolkit.propagateProjectToBranch = async function (rootUid, targetProject, nodesToUpdate) {
    const PM = this.ProjectManager;
    const newValue = PM.buildFieldValue(targetProject);
    const escapedPattern = PM.getEscapedFieldPattern();

    let updated = 0;
    let created = 0;
    const errors = [];

    // PRIMERO: Actualizar el nodo raíz (QUE) para que futuras verificaciones muestren el valor correcto
    try {
        const rootQuery = `[:find ?block-uid ?string
                           :where 
                           [?page :block/uid "${rootUid}"]
                           [?block :block/page ?page]
                           [?block :block/uid ?block-uid]
                           [?block :block/string ?string]
                           [(clojure.string/includes? ?string "${escapedPattern}")]]`;

        const rootResults = await window.roamAlphaAPI.data.async.q(rootQuery);

        if (rootResults && rootResults.length > 0) {
            const blockUid = rootResults[0][0];
            await window.roamAlphaAPI.data.block.update({
                block: { uid: blockUid, string: newValue }
            });
            updated++;
        } else {
            // Crear bloque en el nodo raíz si no existe
            await window.roamAlphaAPI.data.block.create({
                location: { 'parent-uid': rootUid, order: 0 },
                block: { string: newValue }
            });
            created++;
        }
    } catch (e) {
        console.error(`Error updating root node ${rootUid}:`, e);
        errors.push({ uid: rootUid, error: e.message, isRoot: true });
    }

    // SEGUNDO: Actualizar los nodos hijos (CLM/EVD)

    for (const node of nodesToUpdate) {
        try {
            // Buscar si ya tiene un bloque con Proyecto Asociado
            const query = `[:find ?block-uid ?string
                           :where 
                           [?page :block/uid "${node.uid}"]
                           [?block :block/page ?page]
                           [?block :block/uid ?block-uid]
                           [?block :block/string ?string]
                           [(clojure.string/includes? ?string "${escapedPattern}")]]`;

            const results = await window.roamAlphaAPI.data.async.q(query);

            if (results && results.length > 0) {
                // Actualizar el primer bloque encontrado
                const blockUid = results[0][0];
                await window.roamAlphaAPI.data.block.update({
                    block: { uid: blockUid, string: newValue }
                });
                updated++;
            } else {
                // Crear nuevo bloque como primer hijo
                await window.roamAlphaAPI.data.block.create({
                    location: { 'parent-uid': node.uid, order: 0 },
                    block: { string: newValue }
                });
                created++;
            }
        } catch (e) {
            console.error(`Error updating node ${node.uid}:`, e);
            errors.push({ uid: node.uid, error: e.message });
        }
    }

    return { success: errors.length === 0, updated, created, errors };
};

/**
 * Verifica cuáles nodos tienen la propiedad "Proyecto Asociado::" (legacy, mantener compatibilidad)
 * @param {Array<string>} nodeUids - Array de UIDs de páginas a verificar
 * @returns {Promise<{withProject: Array, withoutProject: Array}>}
 */
DiscourseGraphToolkit.verifyProjectAssociation = async function (nodeUids) {
    if (!nodeUids || nodeUids.length === 0) {
        return { withProject: [], withoutProject: [] };
    }

    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();

    // Query para encontrar cuáles páginas tienen un bloque con "Proyecto Asociado::"
    const query = `[:find ?page-uid
                   :in $ [?page-uid ...]
                   :where 
                   [?page :block/uid ?page-uid]
                   [?block :block/page ?page]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

    try {
        const results = await window.roamAlphaAPI.data.async.q(query, nodeUids);
        const withProjectSet = new Set(results.map(r => r[0]));

        const withProject = nodeUids.filter(uid => withProjectSet.has(uid));
        const withoutProject = nodeUids.filter(uid => !withProjectSet.has(uid));

        return { withProject, withoutProject };
    } catch (e) {
        console.error("Error verifying project association:", e);
        return { withProject: [], withoutProject: nodeUids };
    }
};

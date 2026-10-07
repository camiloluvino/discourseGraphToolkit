// ============================================================================
// API: Roam Branch Verification
// ============================================================================

/**
 * Obtiene todos los nodos (CLM, EVD) descendientes de una pregunta RECURSIVAMENTE
 * Sigue la cadena completa: QUE -> CLM -> EVD, CLM -> CLM -> EVD, etc.
 * @param {string} questionUid - UID de la página de la pregunta
 * @returns {Promise<Array<{uid: string, title: string, type: string, parentUid: string}>>}
 */
DiscourseGraphToolkit.getBranchNodes = async function (questionUid) {
    try {
        const allNodes = new Map(); // uid -> {uid, title, type, parentUid}
        const visited = new Set();
        const enqueued = new Set(); // O(1) dedup for pending queue
        // Cola de procesamiento: {uid, parentUid}
        const toProcess = [{ uid: questionUid, parentUid: null }];
        enqueued.add(questionUid);

        // Procesar en rondas por lotes para reducir llamadas API
        while (toProcess.length > 0) {
            // Extraer todo el lote pendiente de una vez
            const batch = toProcess.splice(0, toProcess.length);
            // Filtrar ya visitados
            const pendingBatch = batch.filter(item => !visited.has(item.uid));
            if (pendingBatch.length === 0) continue;

            // Marcar como visitados
            pendingBatch.forEach(item => visited.add(item.uid));

            // Construir EIDs para pull_many
            const eids = pendingBatch.map(item => [':block/uid', item.uid]);

            // Obtener datos de todos los nodos del lote en una sola llamada
            const rawResults = await window.roamAlphaAPI.data.async.pull_many(
                this.ROAM_PULL_PATTERN,
                eids
            );

            if (!rawResults) continue;

            // Procesar cada resultado del lote
            for (let i = 0; i < rawResults.length; i++) {
                const rawData = rawResults[i];
                if (!rawData) continue;

                const currentUid = pendingBatch[i].uid;
                const currentParentUid = pendingBatch[i].parentUid;

                // Transformar a formato usable
                const nodeData = this.transformToNativeFormat(rawData, 0, new Set(), true);
                if (!nodeData) continue;

                const nodeType = this.getNodeType(nodeData.title);

                // Si es CLM, EVD o GRI, agregarlo a la lista de nodos encontrados
                if (nodeType === 'CLM' || nodeType === 'EVD' || nodeType === 'GRI') {
                    allNodes.set(currentUid, {
                        uid: currentUid,
                        title: nodeData.title,
                        type: nodeType,
                        parentUid: currentParentUid || questionUid // Si no tiene padre, es hijo directo del QUE
                    });
                }

                // Buscar referencias en el contenido del nodo
                const referencedUids = this._extractAllReferencesFromNode(nodeData);

                // Agregar las referencias no visitadas a la cola de procesamiento
                // El padre de estas referencias es el nodo actual
                for (const refUid of referencedUids) {
                    if (!visited.has(refUid) && !enqueued.has(refUid)) {
                        enqueued.add(refUid);
                        toProcess.push({ uid: refUid, parentUid: currentUid });
                    }
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
 * Helper: Extrae las referencias jerárquicas de nodos discourse del contenido de un nodo
 * Busca en #RespondedBy, #SupportedBy, #Contains (ignora #RelatedTo)
 */
DiscourseGraphToolkit._extractAllReferencesFromNode = function (nodeData) {
    const references = new Set();

    if (!nodeData || !nodeData.children) return references;

    const self = this;

    const processBlock = (block) => {
        if (!block) return;

        const str = block.string || "";

        // Si es un bloque de relación, extraer referencias (omitimos #RelatedTo por ser relacional/horizontal, no jerárquico)
        if (str.includes("#RespondedBy") || str.includes("#SupportedBy") || str.includes("#Contains")) {
            
            // Función recursiva para extraer referencias de forma segura explorando la rama del bloque
            const extractSafe = (nodeBlock) => {
                if (!nodeBlock) return;
                
                const nodeStr = nodeBlock.string || "";
                // Si encontramos un #RelatedTo anidado explícitamente, abortamos la extracción por ese sub-árbol
                if (nodeStr.includes("#RelatedTo")) return;

                // Extraemos cualquier referencia en la línea actual
                self._extractRefsFromBlock(nodeBlock, references);

                // Continuamos procesando los hijos recursivamente sin limitación de profundidad (o hasta toparnos con #RelatedTo)
                if (nodeBlock.children) {
                    for (const c of nodeBlock.children) {
                        extractSafe(c);
                    }
                }
            };

            // Iniciar la extracción segura desde el bloque relación
            extractSafe(block);
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
};

/**
 * Obtiene el valor del atributo "Proyecto Asociado::" de un nodo
 * @param {string} pageUid - UID de la página
 * @returns {Promise<string|null>} - Nombre del proyecto o null si no existe
 */
DiscourseGraphToolkit.getProjectFromNode = async function (pageUid) {
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();
    const escapedPageUid = this.escapeDatalogString(pageUid);

    const query = `[:find ?string
                   :where 
                    [?page :block/uid "${escapedPageUid}"]
                    [?page :block/children ?block]
                    [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

    try {
        const results = await window.roamAlphaAPI.data.async.q(query);
        if (results && results.length > 0) {
            const blockString = results[0][0];
            const fieldPattern = PM.getFieldPattern();

            // Excluir bloques escapados con backticks
            if (DiscourseGraphToolkit.isEscapedProjectField(blockString, fieldPattern)) {
                return null;
            }

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
 * Verifica si un proyecto es jerárquicamente coherente con el proyecto raíz.
 * Un proyecto es coherente si es exactamente igual o es un sub-namespace (especialización).
 * @param {string} rootProject - Proyecto del nodo raíz
 * @param {string} nodeProject - Proyecto del nodo a verificar
 * @returns {boolean}
 */
DiscourseGraphToolkit.isHierarchicallyCoherent = function (rootProject, nodeProject) {
    if (!rootProject || !nodeProject) return false;

    // Exactamente igual
    if (nodeProject === rootProject) return true;

    // El nodo es sub-namespace del raíz (especialización con /)
    if (nodeProject.startsWith(rootProject + '/')) return true;

    return false;
};

/**
 * Verifica coherencia de proyectos en una rama (verificación jerárquica padre-hijo)
 * Cada nodo debe tener un proyecto igual o más específico que su padre directo.
 * @param {string} rootUid - UID del QUE raíz
 * @param {Array<{uid: string, title: string, type: string, parentUid: string}>} branchNodes - Nodos de la rama
 * @returns {Promise<{rootProject: string|null, coherent: Array, specialized: Array, different: Array, missing: Array}>}
 */
DiscourseGraphToolkit.verifyProjectCoherence = async function (rootUid, branchNodes) {
    const PM = this.ProjectManager;

    // Obtener proyecto de cada nodo (incluyendo raíz y padres) en una sola consulta batch
    const allUids = [...new Set([rootUid, ...branchNodes.map(n => n.uid), ...branchNodes.map(n => n.parentUid)])];
    const escapedPattern = PM.getEscapedFieldPattern();

    // Query para obtener todos los bloques de Proyecto Asociado de las páginas
    const query = `[:find ?page-uid ?string
                   :in $ [?page-uid ...]
                   :where 
                   [?page :block/uid ?page-uid]
                   [?page :block/children ?block]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

    const coherent = [];    // Proyecto exacto al padre
    const specialized = [];  // Sub-namespace del padre (especialización válida)
    const different = [];    // Menos específico o diferente al padre
    const missing = [];
    let rootProject = null;

    try {
        const results = await window.roamAlphaAPI.data.async.q(query, allUids);

        // Crear mapa de UID -> proyecto
        const projectMap = new Map();
        const regex = PM.getFieldRegex();
        const fieldPattern = PM.getFieldPattern();

        results.forEach(r => {
            const pageUid = r[0];
            const blockString = r[1];

            // Excluir bloques escapados con backticks
            if (DiscourseGraphToolkit.isEscapedProjectField(blockString, fieldPattern)) {
                return;
            }

            const match = blockString.match(regex);
            if (match) {
                projectMap.set(pageUid, match[1].trim());
            }
        });

        // Proyecto del QUE raíz obtenido de la misma consulta batch
        rootProject = projectMap.get(rootUid) || null;

        // 3. Clasificar nodos según coherencia con su PADRE directo
        for (const node of branchNodes) {
            const nodeProject = projectMap.get(node.uid);
            const parentProject = projectMap.get(node.parentUid) || rootProject;

            if (!nodeProject) {
                missing.push({ ...node, project: null, parentProject });
            } else if (parentProject && nodeProject === parentProject) {
                // Exactamente igual al padre
                coherent.push({ ...node, project: nodeProject, parentProject });
            } else if (parentProject && nodeProject.startsWith(parentProject + '/')) {
                // Más específico que el padre (especialización válida)
                specialized.push({ ...node, project: nodeProject, parentProject });
            } else if (parentProject && parentProject.startsWith(nodeProject + '/')) {
                // MENOS específico que el padre (generalización - ERROR)
                different.push({ ...node, project: nodeProject, parentProject, reason: 'generalization' });
            } else {
                // Proyecto completamente diferente al padre (error de coherencia)
                // Los nodos bajo #RelatedTo ya están excluidos del recorrido,
                // así que todo nodo aquí es parte jerárquica de la rama.
                different.push({ ...node, project: nodeProject, parentProject, reason: 'cross_project' });
            }
        }

        return { rootProject, coherent, specialized, different, missing };
    } catch (e) {
        console.error("Error verifying project coherence:", e);
        return {
            rootProject,
            coherent: [],
            specialized: [],
            different: [],
            missing: branchNodes.map(n => ({ ...n, project: null, parentProject: null }))
        };
    }
};

/**
 * Calcula, sin escribir nada en Roam, qué proyecto debe recibir cada nodo de una rama.
 *
 * Recorre la rama desde la raíz (cada padre antes que sus hijos) usando el proyecto YA
 * RESUELTO del padre, de modo que el valor nuevo de la raíz y las correcciones de los
 * niveles superiores se transmiten en cascada en una sola pasada.
 *
 * Reglas para cada nodo:
 *  - Si su proyecto es coherente con el del padre (igual o más específico), se conserva.
 *  - Si está en `fixableUids` (estaba incoherente o sin proyecto al verificar), recibe el del padre.
 *  - Si solo heredaba el proyecto anterior de su padre (era idéntico) y el padre cambió, lo sigue.
 *  - En otro caso (p. ej. una especialización que deja de calzar con la raíz nueva) no se toca:
 *    se informa en `pending` para que el usuario lo revise caso a caso.
 *
 * @param {{rootProject: string|null, coherent: Array, specialized: Array, different: Array, missing: Array}} coherence
 *   Resultado de verifyProjectCoherence
 * @param {string} rootUid - UID del nodo raíz (QUE/GRI)
 * @param {string} rootTargetProject - Proyecto que tendrá la raíz tras la propagación
 * @param {Set<string>} fixableUids - Nodos que se deben corregir
 * @returns {{changes: Array<{uid: string, from: string|null, to: string, isRoot?: boolean}>,
 *            pending: Array<{uid: string, title: string, type: string, project: string, parentProject: string}>}}
 */
DiscourseGraphToolkit.planBranchPropagation = function (coherence, rootUid, rootTargetProject, fixableUids) {
    const changes = [];
    const pending = [];
    const oldRootProject = coherence.rootProject || null;

    if (rootTargetProject && rootTargetProject !== oldRootProject) {
        changes.push({ uid: rootUid, from: oldRootProject, to: rootTargetProject, isRoot: true });
    }

    const nodes = [
        ...(coherence.coherent || []),
        ...(coherence.specialized || []),
        ...(coherence.different || []),
        ...(coherence.missing || [])
    ];
    const byUid = new Map(nodes.map(n => [n.uid, n]));

    // Profundidad de cada nodo dentro de la rama, para procesar padres antes que hijos
    const depthOf = (node) => {
        let depth = 0;
        let current = node;
        const seen = new Set();
        while (current && current.parentUid && current.parentUid !== rootUid && !seen.has(current.uid)) {
            seen.add(current.uid);
            current = byUid.get(current.parentUid);
            depth++;
        }
        return depth;
    };
    const ordered = nodes
        .map((node, index) => ({ node, index, depth: depthOf(node) }))
        .sort((a, b) => a.depth - b.depth || a.index - b.index)
        .map(entry => entry.node);

    // Proyecto de cada nodo después de aplicar el plan
    const resolved = new Map([[rootUid, rootTargetProject || oldRootProject]]);

    for (const node of ordered) {
        const current = node.project || null;
        const oldParentProject = node.parentProject || null;
        const parentProject = resolved.has(node.parentUid) ? resolved.get(node.parentUid) : oldParentProject;

        if (!parentProject) {
            resolved.set(node.uid, current);
            continue;
        }

        if (current && this.isHierarchicallyCoherent(parentProject, current)) {
            resolved.set(node.uid, current);
        } else if (fixableUids.has(node.uid) || (current && current === oldParentProject)) {
            changes.push({ uid: node.uid, from: current, to: parentProject });
            resolved.set(node.uid, parentProject);
        } else {
            pending.push({ uid: node.uid, title: node.title, type: node.type, project: current, parentProject });
            resolved.set(node.uid, current);
        }
    }

    return { changes, pending };
};

/**
 * Busca el bloque "Proyecto Asociado::" de primer nivel de una página.
 * @param {string} pageUid
 * @returns {Promise<{uid: string, string: string}|null>}
 */
DiscourseGraphToolkit._findProjectBlock = async function (pageUid) {
    const escapedPattern = this.ProjectManager.getEscapedFieldPattern();
    const escapedPageUid = this.escapeDatalogString(pageUid);
    const query = `[:find ?block-uid ?string
                   :where 
                   [?page :block/uid "${escapedPageUid}"]
                   [?page :block/children ?block]
                   [?block :block/uid ?block-uid]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;
    const results = await window.roamAlphaAPI.data.async.q(query);
    if (!results || results.length === 0) return null;
    return { uid: results[0][0], string: results[0][1] };
};

/**
 * Reemplaza el proyecto dentro del texto de un bloque "Proyecto Asociado::" sin tocar
 * el resto del bloque (notas, etiquetas, texto previo).
 * Si el campo no tiene un enlace [[...]], completa o sustituye el valor inmediato.
 * @param {string} blockString - Texto actual del bloque
 * @param {string} newProject - Proyecto nuevo
 * @returns {string} Texto del bloque con el proyecto reemplazado
 */
DiscourseGraphToolkit._replaceProjectInString = function (blockString, newProject) {
    const PM = this.ProjectManager;
    const fieldName = PM.getFieldName().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const link = '[[' + newProject + ']]';

    const withLink = new RegExp('(' + fieldName + '::\\s*)\\[\\[[^\\]]+\\]\\]');
    if (withLink.test(blockString)) {
        return blockString.replace(withLink, (match, prefix) => prefix + link);
    }

    const bareValue = new RegExp(fieldName + '::[ \\t]*[^\\s]*');
    if (bareValue.test(blockString)) {
        return blockString.replace(bareValue, () => PM.buildFieldValue(newProject));
    }

    return PM.buildFieldValue(newProject);
};

/**
 * Escribe en Roam los cambios calculados por planBranchPropagation.
 * Actualiza el bloque de proyecto existente o lo crea como primer hijo de la página.
 * Un error en un nodo no detiene el resto.
 * @param {Array<{uid: string, to: string}>} changes
 * @returns {Promise<{success: boolean, updated: number, created: number, errors: Array}>}
 */
DiscourseGraphToolkit.applyProjectChanges = async function (changes) {
    const PM = this.ProjectManager;
    let updated = 0;
    let created = 0;
    const errors = [];

    for (const change of changes) {
        try {
            const newValue = PM.buildFieldValue(change.to);
            const projectBlock = await this._findProjectBlock(change.uid);

            if (projectBlock) {
                await window.roamAlphaAPI.data.block.update({
                    block: { uid: projectBlock.uid, string: this._replaceProjectInString(projectBlock.string, change.to) }
                });
                updated++;
            } else {
                await window.roamAlphaAPI.data.block.create({
                    location: { 'parent-uid': change.uid, order: 0 },
                    block: { string: newValue }
                });
                created++;
            }
        } catch (e) {
            console.error(`Error updating node ${change.uid}:`, e);
            errors.push({ uid: change.uid, error: e.message, isRoot: !!change.isRoot });
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
                   [?page :block/children ?block]
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

/**
 * Encuentra nodos discourse (QUE/CLM/EVD) que son páginas pero no están
 * conectados a ningún proyecto ni tienen relaciones con otros nodos del discourse graph.
 * @returns {Promise<Array<{uid: string, title: string, type: string, hasProject: boolean, refCount: number}>>}
 */
DiscourseGraphToolkit.findOrphanNodes = async function () {
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();

    try {
        // 1. Obtener TODAS las páginas QUE/CLM/EVD
        const allNodesQuery = `[:find ?uid ?title
                               :where
                               [?page :node/title ?title]
                               [?page :block/uid ?uid]
                               (or
                                 [(clojure.string/starts-with? ?title "[[GRI]] - ")]
                                 [(clojure.string/starts-with? ?title "[[QUE]] - ")]
                                 [(clojure.string/starts-with? ?title "[[CLM]] - ")]
                                 [(clojure.string/starts-with? ?title "[[EVD]] - ")])]`;

        const allNodes = await window.roamAlphaAPI.data.async.q(allNodesQuery);
        if (!allNodes || allNodes.length === 0) return [];

        // 2. Obtener cuáles tienen Proyecto Asociado
        const allUids = allNodes.map(n => n[0]);
        const projectQuery = `[:find ?page-uid
                              :in $ [?page-uid ...]
                              :where
                              [?page :block/uid ?page-uid]
                              [?page :block/children ?block]
                              [?block :block/string ?string]
                              [(clojure.string/includes? ?string "${escapedPattern}")]]`;

        const withProjectResults = await window.roamAlphaAPI.data.async.q(projectQuery, allUids);
        const withProjectSet = new Set(withProjectResults.map(r => r[0]));

        // 3. Contar cuántas referencias tiene cada página (desde otras páginas discourse)
        const refCountQuery = `[:find ?target-uid (count ?source-page)
                               :where
                               [?target :block/uid ?target-uid]
                               [?target :node/title ?target-title]
                               (or
                                 [(clojure.string/starts-with? ?target-title "[[GRI]] - ")]
                                 [(clojure.string/starts-with? ?target-title "[[QUE]] - ")]
                                 [(clojure.string/starts-with? ?target-title "[[CLM]] - ")]
                                 [(clojure.string/starts-with? ?target-title "[[EVD]] - ")])
                               [?source-block :block/refs ?target]
                               [?source-block :block/page ?source-page]
                               [?source-page :node/title ?source-title]
                               (or
                                 [(clojure.string/starts-with? ?source-title "[[GRI]] - ")]
                                 [(clojure.string/starts-with? ?source-title "[[QUE]] - ")]
                                 [(clojure.string/starts-with? ?source-title "[[CLM]] - ")]
                                 [(clojure.string/starts-with? ?source-title "[[EVD]] - ")])]`;

        const refCounts = await window.roamAlphaAPI.data.async.q(refCountQuery);
        const refCountMap = new Map(refCounts.map(r => [r[0], r[1]]));

        // 4. Filtrar huérfanos: sin proyecto Y sin referencias desde otros nodos discourse
        const orphans = [];
        for (const [uid, title] of allNodes) {
            const hasProject = withProjectSet.has(uid);
            const refCount = refCountMap.get(uid) || 0;

            // Un huérfano es: sin proyecto Y sin referencias entrantes desde otros nodos discourse
            if (!hasProject && refCount === 0) {
                const type = title.startsWith('[[GRI]]') ? 'GRI' :
                    title.startsWith('[[QUE]]') ? 'QUE' :
                        title.startsWith('[[CLM]]') ? 'CLM' : 'EVD';
                orphans.push({
                    uid,
                    title,
                    type,
                    hasProject,
                    refCount
                });
            }
        }

        return orphans;
    } catch (e) {
        console.error("Error finding orphan nodes:", e);
        return [];
    }
};

/**
 * Dado un array de UIDs de QUEs/GRIs, encuentra qué página contenedora
 * (página cuyo título termina en CONTAINER_PAGE_SUFFIX, ej: /grafoDeDiscurso)
 * los referencia en CUALQUIER nivel de anidamiento dentro de la página.
 *
 * Estrategia Datalog: usa :block/page para encontrar, dado un bloque que referencia
 * al nodo, a qué página pertenece. Esto detecta nodos referenciados a cualquier
 * profundidad (ej: GRIs anidados bajo #Contains).
 *
 * @param {Array<string>} queUids - UIDs de las páginas QUE/GRI a buscar
 * @returns {Promise<Map<string, {uid, title, project, containerStatus}>>}
 *   Mapa queUid → info de la página contenedora (primera encontrada por QUE)
 */
DiscourseGraphToolkit.getContainerPagesForNodes = async function (queUids) {
    if (!queUids || queUids.length === 0) return new Map();

    try {
        const containerSuffix = this.CONTAINER_PAGE_SUFFIX; // '/grafoDeDiscurso'
        const escapedContainerSuffix = this.escapeDatalogString(containerSuffix);

        // Query: páginas que terminan en /grafoDeDiscurso que referencian alguno de los QUEs/GRIs
        // a cualquier nivel de anidamiento (usando :block/page)
        const query = `[:find ?container-uid ?container-title ?que-uid
                        :in $ [?que-uid ...]
                        :where
                        [?que-page :block/uid ?que-uid]
                        [?block :block/refs ?que-page]
                        [?block :block/page ?container]
                        [?container :node/title ?container-title]
                        [(clojure.string/ends-with? ?container-title "${escapedContainerSuffix}")]
                        [?container :block/uid ?container-uid]]`;

        const results = await window.roamAlphaAPI.data.async.q(query, queUids);
        if (!results || results.length === 0) return new Map();

        // Tomar la primera coincidencia por QUE (un QUE puede estar en varias páginas)
        const queToContainer = new Map();
        for (const [containerUid, containerTitle, queUid] of results) {
            if (queToContainer.has(queUid)) continue;
            queToContainer.set(queUid, { uid: containerUid, title: containerTitle, project: null });
        }

        // Obtener proyectos de todas las páginas contenedoras en lote
        const containerUids = [...new Set([...queToContainer.values()].map(c => c.uid))];
        if (containerUids.length === 0) return queToContainer;

        const PM = this.ProjectManager;
        const escapedPattern = PM.getEscapedFieldPattern();
        const projectQuery = `[:find ?page-uid ?string
                              :in $ [?page-uid ...]
                              :where
                              [?page :block/uid ?page-uid]
                              [?page :block/children ?block]
                              [?block :block/string ?string]
                              [(clojure.string/includes? ?string "${escapedPattern}")]]`;

        const projectResults = await window.roamAlphaAPI.data.async.q(projectQuery, containerUids);
        const containerProjectMap = new Map();
        const regex = PM.getFieldRegex();
        const fieldPattern = PM.getFieldPattern();

        if (projectResults) {
            for (const [pageUid, blockString] of projectResults) {
                if (this.isEscapedProjectField(blockString, fieldPattern)) continue;
                const match = blockString.match(regex);
                if (match) containerProjectMap.set(pageUid, match[1].trim());
            }
        }

        // Enriquecer con el proyecto de cada página contenedora
        for (const [, containerInfo] of queToContainer) {
            containerInfo.project = containerProjectMap.get(containerInfo.uid) || null;
        }

        return queToContainer;
    } catch (e) {
        console.error('Error getting container pages for nodes:', e);
        return new Map();
    }
};

/**
 * Calcula el containerStatus de una QUE dada la info de su página contenedora.
 * @param {string|null} queProject - Proyecto del QUE (rootProject del cohResult)
 * @param {{uid, title, project}|null} containerInfo - Info de la página contenedora
 * @returns {'coherent'|'mismatched'|'no_project'|'no_container'}
 */
DiscourseGraphToolkit.calcContainerStatus = function (queProject, containerInfo) {
    if (!containerInfo) return 'no_container';
    if (!containerInfo.project) return 'no_project';
    if (!queProject) return 'mismatched';
    // El QUE debe tener el mismo proyecto que la página contenedora
    // o ser un sub-namespace más específico
    if (queProject === containerInfo.project ||
        queProject.startsWith(containerInfo.project + '/')) {
        return 'coherent';
    }
    return 'mismatched';
};

/**
 * Corrige la alineación del proyecto en una página específica (ya sea la QUE o el contenedor).
 * Busca si ya existe un bloque de Proyecto Asociado. Si existe, lo actualiza. Si no, lo crea como primer hijo.
 *
 * @param {string} targetUid - UID de la página a modificar (QUE o contenedor)
 * @param {string} newProject - El nuevo proyecto a asignar
 * @returns {Promise<{success: boolean, action: 'updated'|'created'|'none', error?: string}>}
 */
DiscourseGraphToolkit.fixContainerAlignment = async function (targetUid, newProject) {
    if (!targetUid) {
        return { success: false, action: 'none', error: 'No target UID provided' };
    }

    try {
        const projectBlock = await this._findProjectBlock(targetUid);

        if (projectBlock) {
            await window.roamAlphaAPI.data.block.update({
                block: { uid: projectBlock.uid, string: this._replaceProjectInString(projectBlock.string, newProject) }
            });
            return { success: true, action: 'updated' };
        } else {
            // Crear bloque como primer hijo de la página
            await window.roamAlphaAPI.data.block.create({
                location: { 'parent-uid': targetUid, order: 0 },
                block: { string: this.ProjectManager.buildFieldValue(newProject) }
            });
            return { success: true, action: 'created' };
        }
    } catch (e) {
        console.error(`Error aligning container/QUE project for UID ${targetUid}:`, e);
        return { success: false, action: 'none', error: e.message };
    }
};


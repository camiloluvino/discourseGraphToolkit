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

    // Buscar referencias en el texto [[...]]
    const str = block.string || "";
    const pattern = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = pattern.exec(str)) !== null) {
        const refContent = match[1];
        // Si parece ser un nodo discourse (CLM, EVD, QUE)
        if (refContent.includes('[[CLM]]') || refContent.includes('[[EVD]]') || refContent.includes('[[QUE]]') || refContent.includes('[[GRI]]')) {
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

    // 1. Obtener proyecto del QUE raíz
    const rootProject = await this.getProjectFromNode(rootUid);

    // 2. Obtener proyecto de cada nodo (incluyendo padres)
    const allUids = [...new Set([...branchNodes.map(n => n.uid), ...branchNodes.map(n => n.parentUid)])];
    const escapedPattern = PM.getEscapedFieldPattern();

    // Query para obtener todos los bloques de Proyecto Asociado de las páginas
    const query = `[:find ?page-uid ?string
                   :in $ [?page-uid ...]
                   :where 
                   [?page :block/uid ?page-uid]
                   [?block :block/page ?page]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${escapedPattern}")]]`;

    const coherent = [];    // Proyecto exacto al padre
    const specialized = [];  // Sub-namespace del padre (especialización válida)
    const different = [];    // Menos específico o diferente al padre
    const missing = [];

    try {
        const results = await window.roamAlphaAPI.data.async.q(query, allUids);

        // Crear mapa de UID -> proyecto
        const projectMap = new Map();
        // El QUE raíz tiene su proyecto
        projectMap.set(rootUid, rootProject);

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
    // Respetamos sub-namespaces existentes (especializaciones)
    const regex = PM.getFieldRegex();
    let skipped = 0;

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
                const blockUid = results[0][0];
                const blockString = results[0][1];

                // Extraer el proyecto actual del nodo
                const match = blockString.match(regex);
                const currentProject = match ? match[1].trim() : null;

                // Si ya es coherente (exacto o sub-namespace), respetar la especialización
                if (currentProject && this.isHierarchicallyCoherent(targetProject, currentProject)) {
                    skipped++;
                    continue;
                }

                // Actualizar solo si es incoherente
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
 * Propaga el proyecto del padre directo a cada nodo (para corregir generalizaciones)
 * Cada nodo recibe el proyecto de su parentProject específico.
 * @param {Array<{uid: string, parentProject: string}>} nodesToFix - Nodos con generalización
 * @returns {Promise<{success: boolean, updated: number, errors: Array}>}
 */
DiscourseGraphToolkit.propagateFromParents = async function (nodesToFix) {
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();
    const regex = PM.getFieldRegex();

    let updated = 0;
    const errors = [];

    for (const node of nodesToFix) {
        if (!node.parentProject) continue;

        const newValue = PM.buildFieldValue(node.parentProject);

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
                updated++;
            }
        } catch (e) {
            console.error(`Error updating node ${node.uid}:`, e);
            errors.push({ uid: node.uid, error: e.message });
        }
    }

    return { success: errors.length === 0, updated, errors };
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
                              [?block :block/page ?page]
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
 * los referencia como bloque de PRIMER NIVEL (hijo directo de la página).
 *
 * Estrategia Datalog: usar :block/children desde la página contenedora asegura
 * que solo se devuelven bloques de primer nivel (hijos directos), sin necesidad
 * de filtrar padres en JS.
 *
 * @param {Array<string>} queUids - UIDs de las páginas QUE/GRI a buscar
 * @returns {Promise<Map<string, {uid, title, project, containerStatus}>>}
 *   Mapa queUid → info de la página contenedora (primera encontrada por QUE)
 */
DiscourseGraphToolkit.getContainerPagesForNodes = async function (queUids) {
    if (!queUids || queUids.length === 0) return new Map();

    try {
        const containerSuffix = this.CONTAINER_PAGE_SUFFIX; // '/grafoDeDiscurso'

        // Query: páginas que terminan en /grafoDeDiscurso cuyo :block/children
        // (hijos directos = bloques de primer nivel) referencian alguno de los QUEs
        const query = `[:find ?container-uid ?container-title ?que-uid
                        :in $ [?que-uid ...]
                        :where
                        [?que-page :block/uid ?que-uid]
                        [?container :node/title ?container-title]
                        [?container :block/uid ?container-uid]
                        [(clojure.string/ends-with? ?container-title "${containerSuffix}")]
                        [?container :block/children ?block]
                        [?block :block/refs ?que-page]]`;

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
                              [?block :block/page ?page]
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

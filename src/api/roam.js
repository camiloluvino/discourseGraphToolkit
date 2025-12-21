// ============================================================================
// API: Roam Interactions
// ============================================================================

DiscourseGraphToolkit.findProjectsPage = async function () {
    const results = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${this.ROAM.PROJECTS_PAGE}"] [?page :block/uid ?uid]]`);
    return (results && results.length > 0) ? results[0][0] : null;
};

DiscourseGraphToolkit.loadProjectsFromRoam = async function () {
    const pageUid = await this.findProjectsPage();
    if (!pageUid) return [];
    const query = `[:find ?string :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/string ?string] [?child :block/order ?order] :order (asc ?order)]`;
    const results = await window.roamAlphaAPI.data.async.q(query);
    return results.map(r => r[0].trim()).filter(p => p !== '');
};

DiscourseGraphToolkit.syncProjectsToRoam = async function (projects) {
    try {
        let pageUid = await this.findProjectsPage();
        if (!pageUid) {
            pageUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.page.create({ page: { title: this.ROAM.PROJECTS_PAGE, uid: pageUid } });
        }

        const existingQuery = `[:find ?uid ?string :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/uid ?uid] [?child :block/string ?string]]`;
        const existingResults = await window.roamAlphaAPI.data.async.q(existingQuery);
        const existingBlocks = new Map(existingResults.map(r => [r[1].trim(), r[0]]));

        // Eliminar obsoletos
        for (const [blockText, blockUid] of existingBlocks.entries()) {
            if (!projects.includes(blockText)) await window.roamAlphaAPI.data.block.delete({ block: { uid: blockUid } });
        }

        // Agregar nuevos
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            if (!existingBlocks.has(project)) {
                await window.roamAlphaAPI.data.block.create({ location: { 'parent-uid': pageUid, order: i }, block: { string: project } });
            }
        }
        return { success: true };
    } catch (e) {
        console.error("Error syncing projects:", e);
        return { success: false, error: e.message };
    }
};

DiscourseGraphToolkit.initializeProjectsSync = async function (retry = 0) {
    if (!window.roamAlphaAPI) return;

    try {
        const local = this.getProjects();
        let roam = await this.loadProjectsFromRoam();

        // RETRY LOGIC: Si Roam devuelve vacío, puede ser por carga lenta. Reintentar.
        if (roam.length === 0 && retry < 5) {
            console.log(`Roam projects empty, retrying sync... (${retry + 1}/5)`);
            await new Promise(r => setTimeout(r, 1000));
            return this.initializeProjectsSync(retry + 1);
        }

        // Si Roam falla (devuelve vacío pero no debería), no sobrescribimos local si local tiene datos
        if (roam.length === 0 && local.length > 0) {
            // Intentar verificar si la página existe
            const pageUid = await this.findProjectsPage();
            if (pageUid) {
                // La página existe pero está vacía, o la query falló. 
                // Asumimos que debemos sincronizar local -> roam
                console.log("Roam projects empty, syncing local to roam.");
            }
        }

        const merged = [...new Set([...local, ...roam])].sort();

        if (merged.length > 0) {
            this.saveProjects(merged);
            await this.syncProjectsToRoam(merged);
            console.log(`Proyectos sincronizados: ${merged.length}`);
        }
    } catch (e) {
        console.error("Error initializing projects sync:", e);
        if (retry < 3) {
            setTimeout(() => this.initializeProjectsSync(retry + 1), 2000);
        }
    }
};

DiscourseGraphToolkit.validateProjectsInGraph = async function (projectNames) {
    const query = `[:find ?string :where [?block :block/string ?string] [(clojure.string/includes? ?string "Proyecto Asociado::")]]`;
    const results = await window.roamAlphaAPI.data.async.q(query);
    const inGraph = new Set();
    results.forEach(r => {
        const match = r[0].match(/Proyecto Asociado::\s*\[\[([^\]]+)\]\]/);
        if (match) inGraph.add(match[1].trim());
    });

    const validation = {};
    projectNames.forEach(name => validation[name] = inGraph.has(name));
    return validation;
};

DiscourseGraphToolkit.discoverProjectsInGraph = async function () {
    const config = this.getConfig();
    const fieldName = config.projectFieldName || "Proyecto Asociado";

    // Query para encontrar todos los bloques con la propiedad de proyecto
    const query = `[:find ?string :where [?block :block/string ?string] [(clojure.string/includes? ?string "${fieldName}::")]]`;
    const results = await window.roamAlphaAPI.data.async.q(query);

    const discovered = new Set();
    const regex = new RegExp(`${fieldName}::\\s*\\[\\[([^\\]]+)\\]\\]`);

    results.forEach(r => {
        const match = r[0].match(regex);
        if (match && match[1]) {
            discovered.add(match[1].trim());
        }
    });

    return Array.from(discovered).sort();
};

// --- Lógica de Búsqueda ---
DiscourseGraphToolkit.findPagesWithProject = async function (projectName) {
    const config = this.getConfig();
    const fieldName = config.projectFieldName || "Proyecto Asociado";
    const trimmedProject = projectName.trim();

    const query = `[
            :find ?page-title ?page-uid
            :where
            [?page :node/title ?page-title]
            [?page :block/uid ?page-uid]
            [?block :block/page ?page]
            [?block :block/string ?string]
            [(clojure.string/includes? ?string "${fieldName}::")]
            [(clojure.string/includes? ?string "[[${trimmedProject}]]")]
        ]`;

    const results = await window.roamAlphaAPI.data.async.q(query);
    return results.map(r => ({ pageTitle: r[0], pageUid: r[1] }));
};

DiscourseGraphToolkit.queryDiscoursePages = async function (projectName, selectedTypes) {
    const pages = await this.findPagesWithProject(projectName);
    const prefixes = selectedTypes.map(t => `[[${t}]]`);
    return pages.filter(p => prefixes.some(prefix => p.pageTitle.startsWith(prefix)));
};

DiscourseGraphToolkit.findReferencedDiscoursePages = async function (pageUids, selectedTypes) {
    if (!pageUids || pageUids.length === 0) return [];

    const prefixes = selectedTypes.map(t => this.TYPES[t].prefix); // "QUE", "CLM"
    const query = `[:find ?string :in $ [?page-uid ...] :where [?page :block/uid ?page-uid] [?block :block/page ?page] [?block :block/string ?string]]`;

    const results = await window.roamAlphaAPI.data.async.q(query, pageUids);
    const referencedTitles = new Set();

    results.forEach(r => {
        const str = r[0];
        prefixes.forEach(prefix => {
            const target = `[[[[${prefix}]]`; // Busca [[[[QUE]]
            if (str.includes(target)) {
                // Extracción simple de brackets balanceados (simplificada)
                const regex = new RegExp(`\\[\\[\\[\\[${prefix}\\]\\] - (.*?)\\]\\]`, 'g');
                let match;
                while ((match = regex.exec(str)) !== null) {
                    referencedTitles.add(`[[${prefix}]] - ${match[1]}`);
                }
            }
        });
    });

    if (referencedTitles.size === 0) return [];

    const titleArray = Array.from(referencedTitles);
    const pageQuery = `[:find ?title ?uid :in $ [?title ...] :where [?page :node/title ?title] [?page :block/uid ?uid]]`;
    const pageResults = await window.roamAlphaAPI.data.async.q(pageQuery, titleArray);

    return pageResults.map(r => ({ pageTitle: r[0], pageUid: r[1] }));
};

// ============================================================================
// API: Verificación de Proyecto Asociado
// ============================================================================

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
 * Verifica cuáles nodos tienen la propiedad "Proyecto Asociado::"
 * @param {Array<string>} nodeUids - Array de UIDs de páginas a verificar
 * @returns {Promise<{withProject: Array, withoutProject: Array}>}
 */
DiscourseGraphToolkit.verifyProjectAssociation = async function (nodeUids) {
    if (!nodeUids || nodeUids.length === 0) {
        return { withProject: [], withoutProject: [] };
    }

    const config = this.getConfig();
    const fieldName = config.projectFieldName || "Proyecto Asociado";

    // Query para encontrar cuáles páginas tienen un bloque con "Proyecto Asociado::"
    const query = `[:find ?page-uid
                   :in $ [?page-uid ...]
                   :where 
                   [?page :block/uid ?page-uid]
                   [?block :block/page ?page]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${fieldName}::")]]`;

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



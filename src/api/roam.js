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

DiscourseGraphToolkit.getIdsFromIndexPage = async function (pageTitle, selectedTypes) {
    if (!pageTitle) return [];

    const pageRes = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${pageTitle}"] [?page :block/uid ?uid]]`);
    if (!pageRes || pageRes.length === 0) return [];
    const pageUid = pageRes[0][0];

    const pullPattern = `[
        :block/uid 
        :block/string 
        :block/order 
        {:block/refs [:node/title :block/uid]} 
        {:block/children ...}
    ]`;

    const result = await window.roamAlphaAPI.data.async.pull(pullPattern, [`:block/uid`, pageUid]);

    if (!result || !result[':block/children']) return [];

    const orderedPages = [];
    const targetPrefixes = selectedTypes.map(t => (this.TYPES && this.TYPES[t] ? this.TYPES[t].prefix : `[[${t}]]`));

    const traverse = (blocks) => {
        if (!blocks) return;
        blocks.sort((a, b) => (a[':block/order'] || 0) - (b[':block/order'] || 0));

        for (const block of blocks) {
            if (block[':block/refs']) {
                const refs = block[':block/refs'];
                refs.forEach(ref => {
                    const title = ref[':node/title'];
                    const uid = ref[':block/uid'];
                    if (title && targetPrefixes.some(prefix => title.startsWith(prefix))) {
                        orderedPages.push({ pageTitle: title, pageUid: uid });
                    }
                });
            }
            if (block[':block/children']) traverse(block[':block/children']);
        }
    };

    traverse(result[':block/children']);
    return orderedPages;
};



// ============================================================================
// API: Roam Projects Management
// ============================================================================

DiscourseGraphToolkit.findProjectsPage = async function () {
    const escapedTitle = this.escapeDatalogString(this.ROAM.PROJECTS_PAGE);
    const results = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${escapedTitle}"] [?page :block/uid ?uid]]`);
    return (results && results.length > 0) ? results[0][0] : null;
};

DiscourseGraphToolkit.loadProjectsFromRoam = async function () {
    try {
        const pageUid = await this.findProjectsPage();
        if (!pageUid) return [];
        const query = `[:find ?string :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/string ?string] [?child :block/order ?order] :order (asc ?order)]`;
        const results = await window.roamAlphaAPI.data.async.q(query);
        return results.map(r => r[0].trim()).filter(p => p !== '');
    } catch (e) {
        console.error("Error loading projects from Roam:", e);
        return []; // Fallback seguro: retornar array vacío
    }
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
    const PM = this.ProjectManager;
    const escapedPattern = PM.getEscapedFieldPattern();
    const query = `[:find ?string :where [?block :block/string ?string] [(clojure.string/includes? ?string "${escapedPattern}")]]`;
    const results = await window.roamAlphaAPI.data.async.q(query);
    const inGraph = new Set();
    const regex = PM.getFieldRegex();
    results.forEach(r => {
        const match = r[0].match(regex);
        if (match) inGraph.add(match[1].trim());
    });

    const validation = {};
    projectNames.forEach(name => validation[name] = inGraph.has(name));
    return validation;
};

DiscourseGraphToolkit.discoverProjectsInGraph = async function () {
    const PM = this.ProjectManager;

    // Query para encontrar todos los bloques con la propiedad de proyecto
    const escapedPattern = PM.getEscapedFieldPattern();
    const query = `[:find ?string :where [?block :block/string ?string] [(clojure.string/includes? ?string "${escapedPattern}")]]`;
    const results = await window.roamAlphaAPI.data.async.q(query);

    const discovered = new Set();
    const regex = PM.getFieldRegex();

    results.forEach(r => {
        const match = r[0].match(regex);
        if (match && match[1]) {
            discovered.add(match[1].trim());
        }
    });

    return Array.from(discovered).sort();
};

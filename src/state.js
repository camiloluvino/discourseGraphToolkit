// ============================================================================
// GESTIÓN DE ALMACENAMIENTO (STORAGE)
// ============================================================================

// --- Configuración General ---
DiscourseGraphToolkit.getConfig = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.CONFIG));
    if (stored) {
        try {
            return { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) };
        } catch (e) { console.error("Error parsing config", e); }
    }
    return { ...this.DEFAULT_CONFIG };
};

DiscourseGraphToolkit.saveConfig = function (config) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.CONFIG), JSON.stringify(config));
};

// --- Templates ---
DiscourseGraphToolkit.getTemplates = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.TEMPLATES));
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.warn("Error parsing templates", e); }
    }
    return { ...this.DEFAULT_TEMPLATES };
};

DiscourseGraphToolkit.saveTemplates = function (templates) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.TEMPLATES), JSON.stringify(templates));
};

// --- Persistencia en Roam (Config + Templates) ---
DiscourseGraphToolkit.saveConfigToRoam = async function (config, templates) {
    try {
        const escapedTitle = this.escapeDatalogString(this.ROAM.CONFIG_PAGE);
        let pageUid = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${escapedTitle}"] [?page :block/uid ?uid]]`);
        if (!pageUid || pageUid.length === 0) {
            pageUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.page.create({ page: { title: this.ROAM.CONFIG_PAGE, uid: pageUid } });
        } else {
            pageUid = pageUid[0][0];
        }

        // Guardar como un bloque JSON
        const data = JSON.stringify({ config, templates });

        // Limpiar hijos anteriores
        const children = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :block/uid "${pageUid}"] [?child :block/parents ?page] [?child :block/uid ?uid]]`);
        for (let child of children) {
            await window.roamAlphaAPI.data.block.delete({ block: { uid: child[0] } });
        }

        await window.roamAlphaAPI.data.block.create({
            location: { "parent-uid": pageUid, order: 0 },
            block: { string: data }
        });
        console.log("Configuración guardada en Roam.");
        return true;
    } catch (e) {
        console.error("Error guardando config en Roam:", e);
        return false;
    }
};

DiscourseGraphToolkit.loadConfigFromRoam = async function () {
    try {
        const escapedTitle = this.escapeDatalogString(this.ROAM.CONFIG_PAGE);
        const results = await window.roamAlphaAPI.data.async.q(`[:find ?string :where [?page :node/title "${escapedTitle}"] [?child :block/parents ?page] [?child :block/string ?string]]`);
        if (results && results.length > 0) {
            const data = JSON.parse(results[0][0]);
            if (data.config) this.saveConfig(data.config);
            if (data.templates) this.saveTemplates(data.templates);
            return data;
        }
    } catch (e) {
        console.error("Error cargando config de Roam:", e);
    }
    return null;
};

// --- Proyectos (Gestión Robusta con Sincronización) ---
DiscourseGraphToolkit.getProjects = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.PROJECTS));
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing projects", e); }
    }
    return [];
};

DiscourseGraphToolkit.saveProjects = function (projects) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.PROJECTS), JSON.stringify(projects));
};

// --- Proyectos Excluidos (Dismissed) ---
DiscourseGraphToolkit.getDismissedProjects = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.DISMISSED_PROJECTS));
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing dismissed projects", e); }
    }
    return [];
};

DiscourseGraphToolkit.saveDismissedProjects = function (dismissed) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.DISMISSED_PROJECTS), JSON.stringify(dismissed));
};

DiscourseGraphToolkit.addToDismissedProjects = function (projectNames) {
    const current = this.getDismissedProjects();
    const merged = [...new Set([...current, ...projectNames])].sort();
    this.saveDismissedProjects(merged);
};

DiscourseGraphToolkit.removeFromDismissedProjects = function (projectName) {
    const current = this.getDismissedProjects();
    const updated = current.filter(p => p !== projectName);
    this.saveDismissedProjects(updated);
};

DiscourseGraphToolkit.clearDismissedProjects = function () {
    this.saveDismissedProjects([]);
};

// --- Historial de Nodos ---
DiscourseGraphToolkit.getNodeHistory = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.HISTORY_NODES));
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing node history", e); }
    }
    return [];
};

DiscourseGraphToolkit.addToNodeHistory = function (type, title, project) {
    let history = this.getNodeHistory();
    history.unshift({
        type, title, project,
        timestamp: new Date().toISOString(),
        pageTitle: `[[${type}]] - ${title}`
    });
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem(this.getStorageKey(this.STORAGE.HISTORY_NODES), JSON.stringify(history));
};

// --- Backup & Restore Config ---
DiscourseGraphToolkit.exportConfig = function () {
    const config = {
        version: this.VERSION,
        timestamp: new Date().toISOString(),
        config: this.getConfig(),
        templates: this.getTemplates(),
        projects: this.getProjects()
    };
    this.downloadJSON(config, `discourse-toolkit-config-${new Date().toISOString().split('T')[0]}.json`);
};

DiscourseGraphToolkit.importConfig = function (fileContent) {
    try {
        const data = JSON.parse(fileContent);
        if (data.config) this.saveConfig(data.config);
        if (data.templates) this.saveTemplates(data.templates);
        if (data.projects) {
            this.saveProjects(data.projects);
            this.syncProjectsToRoam(data.projects);
        }
        return true;
    } catch (e) {
        console.error("Error importing config:", e);
        return false;
    }
};

// --- Migration to Graph-Specific Storage ---
DiscourseGraphToolkit.migrateStorageToGraphSpecific = function () {
    const migrationKey = `discourseGraphToolkit_migrated_${this.getGraphName()}`;
    if (localStorage.getItem(migrationKey)) return; // Already migrated

    // Migrate each storage type from old global key to new graph-specific key
    Object.values(this.STORAGE).forEach(oldKey => {
        const data = localStorage.getItem(oldKey);
        if (data) {
            const newKey = this.getStorageKey(oldKey);
            // Only migrate if new key doesn't exist (don't overwrite)
            if (!localStorage.getItem(newKey)) {
                localStorage.setItem(newKey, data);
                console.log(`[DiscourseGraphToolkit] Migrated ${oldKey} → ${newKey}`);
            }
        }
    });

    localStorage.setItem(migrationKey, 'true');
    console.log(`[DiscourseGraphToolkit] Storage migration complete for graph: ${this.getGraphName()}`);
};

// --- Cache de Verificación de Ramas ---
DiscourseGraphToolkit.getVerificationCache = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.VERIFICATION_CACHE));
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) { console.warn("Error parsing verification cache", e); }
    }
    return null;
};

DiscourseGraphToolkit.saveVerificationCache = function (results, status) {
    const data = {
        results,
        status,
        timestamp: Date.now()
    };
    localStorage.setItem(this.getStorageKey(this.STORAGE.VERIFICATION_CACHE), JSON.stringify(data));
};

DiscourseGraphToolkit.clearVerificationCache = function () {
    localStorage.removeItem(this.getStorageKey(this.STORAGE.VERIFICATION_CACHE));
};

// --- Persistencia del Orden de Preguntas ---
DiscourseGraphToolkit.saveQuestionOrder = function (projectKey, order) {
    if (!projectKey) return; // No guardar si no hay proyecto
    const allOrders = this.loadAllQuestionOrders();
    allOrders[projectKey] = order.map(q => q.uid); // Solo guardamos UIDs
    localStorage.setItem(
        this.getStorageKey(this.STORAGE.QUESTION_ORDER),
        JSON.stringify(allOrders)
    );
};

DiscourseGraphToolkit.loadAllQuestionOrders = function () {
    const stored = localStorage.getItem(
        this.getStorageKey(this.STORAGE.QUESTION_ORDER)
    );
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing question orders", e); }
    }
    return {};
};

DiscourseGraphToolkit.loadQuestionOrder = function (projectKey) {
    if (!projectKey) return null;
    const allOrders = this.loadAllQuestionOrders();
    return allOrders[projectKey] || null;
};

// --- Persistencia del Orden de Grupos de Sub-Proyectos ---
DiscourseGraphToolkit.saveGroupOrder = function (projectKey, groupKeys) {
    if (!projectKey) return;
    const allGroupOrders = this.loadAllGroupOrders();
    allGroupOrders[projectKey] = groupKeys;
    localStorage.setItem(
        this.getStorageKey(this.STORAGE.GROUP_ORDER),
        JSON.stringify(allGroupOrders)
    );
};

DiscourseGraphToolkit.loadAllGroupOrders = function () {
    const stored = localStorage.getItem(
        this.getStorageKey(this.STORAGE.GROUP_ORDER)
    );
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { console.error("Error parsing group orders", e); }
    }
    return {};
};

DiscourseGraphToolkit.loadGroupOrder = function (projectKey) {
    if (!projectKey) return null;
    const allGroupOrders = this.loadAllGroupOrders();
    return allGroupOrders[projectKey] || null;
};

// --- Cache de Vista Panorámica ---
DiscourseGraphToolkit.savePanoramicCache = function (panoramicData) {
    // Limitar tamaño del cache para evitar exceder localStorage
    const maxNodes = this.FILES.MAX_PANORAMIC_CACHE_NODES || 500;
    const nodeEntries = Object.entries(panoramicData.allNodes);
    const limitedNodes = nodeEntries.length > maxNodes
        ? Object.fromEntries(nodeEntries.slice(0, maxNodes))
        : panoramicData.allNodes;

    // Crear copia limpia sin referencias circulares (node.data = node)
    const cleanData = {
        questions: panoramicData.questions.map(({ data, ...q }) => q),
        allNodes: Object.fromEntries(
            Object.entries(limitedNodes).map(([uid, node]) => {
                const { data, ...clean } = node;
                return [uid, clean];
            })
        )
    };

    const cachePayload = { panoramicData: cleanData, timestamp: Date.now() };
    try {
        localStorage.setItem(
            this.getStorageKey(this.STORAGE.PANORAMIC_CACHE),
            JSON.stringify(cachePayload)
        );
    } catch (e) {
        console.warn("Panoramic cache save failed:", e);
    }
};

DiscourseGraphToolkit.loadPanoramicCache = function () {
    const stored = localStorage.getItem(
        this.getStorageKey(this.STORAGE.PANORAMIC_CACHE)
    );
    if (!stored) return null;
    try {
        const cached = JSON.parse(stored);
        // Restaurar node.data = node para compatibilidad con exportación
        if (cached.panoramicData?.allNodes) {
            for (const node of Object.values(cached.panoramicData.allNodes)) {
                node.data = node;
            }
        }
        return cached;
    } catch (e) {
        console.warn("Error parsing panoramic cache, clearing corrupted data:", e);
        localStorage.removeItem(this.getStorageKey(this.STORAGE.PANORAMIC_CACHE));
        return null;
    }
};

DiscourseGraphToolkit.clearPanoramicCache = function () {
    localStorage.removeItem(
        this.getStorageKey(this.STORAGE.PANORAMIC_CACHE)
    );
};

// --- Cache de Vista Panorámica (Estado Expandido) ---
DiscourseGraphToolkit.savePanoramicExpandedQuestions = function (expandedQuestions) {
    try {
        localStorage.setItem(
            this.getStorageKey(this.STORAGE.PANORAMIC_EXPANDED),
            JSON.stringify(expandedQuestions)
        );
    } catch (e) {
        console.warn("Panoramic expanded cache save failed:", e);
    }
};

DiscourseGraphToolkit.loadPanoramicExpandedQuestions = function () {
    const stored = localStorage.getItem(
        this.getStorageKey(this.STORAGE.PANORAMIC_EXPANDED)
    );
    if (!stored) return {};
    try {
        return JSON.parse(stored);
    } catch (e) {
        console.warn("Error parsing panoramic expanded cache, clearing corrupted data:", e);
        localStorage.removeItem(this.getStorageKey(this.STORAGE.PANORAMIC_EXPANDED));
        return {};
    }
};

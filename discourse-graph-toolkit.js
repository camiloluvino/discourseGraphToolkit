/**
 * DISCOURSE GRAPH TOOLKIT v1.2.1
 * Bundled build: 2025-12-24 17:35:50
 */

(function () {
    'use strict';

    var DiscourseGraphToolkit = DiscourseGraphToolkit || {};
    DiscourseGraphToolkit.VERSION = "1.2.1";

// --- MODULE: src/config.js ---
// ============================================================================
// 1. CONFIGURACIÓN Y CONSTANTES
// ============================================================================

window.DiscourseGraphToolkit = window.DiscourseGraphToolkit || {};
// DiscourseGraphToolkit.VERSION = "1.1.1"; // Managed by build script

// Claves de LocalStorage
DiscourseGraphToolkit.STORAGE = {
    CONFIG: "discourseGraphToolkit_config",
    TEMPLATES: "discourseGraphToolkit_templates",
    PROJECTS: "discourseGraphToolkit_projects",
    HISTORY_NODES: "discourseGraphToolkit_history_nodes",
    HISTORY_EXPORT: "discourseGraphToolkit_history_export"
};

// Get current graph name from Roam API or URL
DiscourseGraphToolkit.getGraphName = function () {
    // Method 1: Try Roam API (available in newer versions)
    if (window.roamAlphaAPI?.graph?.name) {
        return window.roamAlphaAPI.graph.name;
    }
    // Method 2: Extract from URL (always works)
    // URL format: https://roamresearch.com/#/app/GRAPH_NAME/...
    const match = window.location.hash.match(/#\/app\/([^\/]+)/);
    return match ? match[1] : 'default';
};

// Generate storage key with graph prefix for isolation
DiscourseGraphToolkit.getStorageKey = function (baseKey) {
    const graphName = this.getGraphName();
    return `${baseKey}_${graphName}`;
};

// Constantes de Roam
DiscourseGraphToolkit.ROAM = {
    PROJECTS_PAGE: "roam/js/discourse-graph/projects",
    CONFIG_PAGE: "roam/js/discourse-graph/config"
};

// Configuración de Archivos y Exportación
DiscourseGraphToolkit.FILES = {
    BYTES_PER_MB: 1024 * 1024,
    MAX_SIZE_MB: 10,
    MAX_DEPTH: 10
};

// Tipos de Nodos
DiscourseGraphToolkit.TYPES = {
    QUE: { prefix: "QUE", label: "Pregunta", color: "#2196F3" },
    CLM: { prefix: "CLM", label: "Afirmación", color: "#4CAF50" },
    EVD: { prefix: "EVD", label: "Evidencia", color: "#FF9800" }
};

// Configuración por defecto
DiscourseGraphToolkit.DEFAULT_CONFIG = {
    defaultProject: "",
    projectFieldName: "Proyecto Asociado"
};

// Pull pattern para exportación robusta (Recursión manual limitada a MAX_DEPTH)
DiscourseGraphToolkit.ROAM_PULL_PATTERN = `[
    :block/uid :node/title :edit/time :create/time :block/string :block/order
    {:block/refs [:block/uid :node/title]}
    {:create/user [:user/display-name :user/uid]}
    {:edit/user [:user/display-name :user/uid]}
    {:block/children [
      :block/uid :block/string :block/order :edit/time :create/time
      {:block/refs [:block/uid :node/title]}
      {:block/children [
        :block/uid :block/string :block/order
        {:block/refs [:block/uid :node/title]}
        {:block/children [
          :block/uid :block/string :block/order
          {:block/refs [:block/uid :node/title]}
          {:block/children [
            :block/uid :block/string :block/order
            {:block/refs [:block/uid :node/title]}
            {:block/children [
               :block/uid :block/string :block/order
               {:block/refs [:block/uid :node/title]}
               {:block/children [
                   :block/uid :block/string :block/order
                   {:block/refs [:block/uid :node/title]}
                   {:block/children [
                       :block/uid :block/string :block/order
                       {:block/refs [:block/uid :node/title]}
                       {:block/children [
                           :block/uid :block/string :block/order
                           {:block/refs [:block/uid :node/title]}
                           {:block/children [
                               :block/uid :block/string :block/order
                               {:block/refs [:block/uid :node/title]}
                           ]}
                       ]}
                   ]}
               ]}
            ]}
          ]}
        ]}
      ]}
    ]}
  ]`;

// Templates por defecto (usando el nombre de campo dinámico en la lógica, aquí es texto)
DiscourseGraphToolkit.DEFAULT_TEMPLATES = {
    "QUE": `Proyecto Asociado:: {PROYECTO}
#RespondedBy
    -`,
    "CLM": `Proyecto Asociado:: {PROYECTO}
#SupportedBy
    -`,
    "EVD": `Proyecto Asociado:: {PROYECTO}`
};




// --- MODULE: src/utils/helpers.js ---
// ============================================================================
// UTILS: Helpers
// ============================================================================

DiscourseGraphToolkit.sanitizeFilename = function (name) {
    if (!name || typeof name !== 'string') return 'export';
    return name
        .replace(/\.\./g, '').replace(/\.\//g, '').replace(/\\/g, '') // Path traversal
        .replace(/[\/\\]/g, '-') // Separadores
        .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Control chars
        .replace(/[<>:"|?*]/g, '') // Invalid chars
        .replace(/\s+/g, '_')
        .trim().toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .substring(0, 50) || 'export';
};

DiscourseGraphToolkit.downloadJSON = function (data, filename) {
    let jsonStr;
    try {
        jsonStr = JSON.stringify(data, null, 2);
    } catch (e) {
        console.warn("JSON muy grande para format, intentando minificado...");
        try { jsonStr = JSON.stringify(data); }
        catch (e2) { throw new Error("Archivo demasiado grande para exportar."); }
    }

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

DiscourseGraphToolkit.countBlocks = function (pageData) {
    if (!pageData) return 0;
    let count = 1;
    const children = pageData[':block/children'] || pageData['children'];
    if (children && Array.isArray(children)) {
        for (const child of children) count += this.countBlocks(child);
    }
    return count;
};

DiscourseGraphToolkit.convertTimestamp = function (timestamp) {
    return timestamp || Date.now();
};

DiscourseGraphToolkit.cleanText = function (text) {
    if (!text || typeof text !== 'string') return "";
    // Eliminar marcadores de Roam Research
    text = text.replace(/\[\[/g, "").replace(/\]\]/g, "");
    // Eliminar marcadores de formato Markdown
    text = text.replace(/\*\*/g, "");
    return text.trim();
};

DiscourseGraphToolkit.downloadFile = function (filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

DiscourseGraphToolkit.getNodeType = function (title) {
    if (!title) return null;
    if (title.includes('[[QUE]]')) return 'QUE';
    if (title.includes('[[CLM]]')) return 'CLM';
    if (title.includes('[[EVD]]')) return 'EVD';
    return null;
};




// --- MODULE: src/utils/toast.js ---
// ============================================================================
// UTILS: Toast Notifications
// ============================================================================

DiscourseGraphToolkit.showToast = function (message, type = 'success') {
    const toastContainer = document.createElement('div');
    toastContainer.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10001; font-size: 14px; font-weight: 500; animation: slideIn 0.3s ease-out;
        `;
    toastContainer.textContent = message;
    document.body.appendChild(toastContainer);
    setTimeout(() => {
        toastContainer.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toastContainer), 300);
    }, 3000);
};




// --- MODULE: src/state.js ---
// ============================================================================
// 2. GESTIÓN DE ALMACENAMIENTO (STORAGE)
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
        try { return JSON.parse(stored); } catch (e) { }
    }
    return { ...this.DEFAULT_TEMPLATES };
};

DiscourseGraphToolkit.saveTemplates = function (templates) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.TEMPLATES), JSON.stringify(templates));
};

// --- Persistencia en Roam (Config + Templates) ---
DiscourseGraphToolkit.saveConfigToRoam = async function (config, templates) {
    try {
        let pageUid = await window.roamAlphaAPI.data.async.q(`[:find ?uid :where [?page :node/title "${this.ROAM.CONFIG_PAGE}"] [?page :block/uid ?uid]]`);
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
        const results = await window.roamAlphaAPI.data.async.q(`[:find ?string :where [?page :node/title "${this.ROAM.CONFIG_PAGE}"] [?child :block/parents ?page] [?child :block/string ?string]]`);
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
    return stored ? JSON.parse(stored) : [];
};

DiscourseGraphToolkit.saveProjects = function (projects) {
    localStorage.setItem(this.getStorageKey(this.STORAGE.PROJECTS), JSON.stringify(projects));
};

// --- Historial de Nodos ---
DiscourseGraphToolkit.getNodeHistory = function () {
    const stored = localStorage.getItem(this.getStorageKey(this.STORAGE.HISTORY_NODES));
    return stored ? JSON.parse(stored) : [];
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




// --- MODULE: src/api/roam.js ---
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
 * Obtiene el valor del atributo "Proyecto Asociado::" de un nodo
 * @param {string} pageUid - UID de la página
 * @returns {Promise<string|null>} - Nombre del proyecto o null si no existe
 */
DiscourseGraphToolkit.getProjectFromNode = async function (pageUid) {
    const config = this.getConfig();
    const fieldName = config.projectFieldName || "Proyecto Asociado";

    const query = `[:find ?string
                   :where 
                   [?page :block/uid "${pageUid}"]
                   [?block :block/page ?page]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${fieldName}::")]]`;

    try {
        const results = await window.roamAlphaAPI.data.async.q(query);
        if (results && results.length > 0) {
            const blockString = results[0][0];
            // Extraer el valor entre [[ ]]
            const regex = new RegExp(`${fieldName}::\\s*\\[\\[([^\\]]+)\\]\\]`);
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
    const config = this.getConfig();
    const fieldName = config.projectFieldName || "Proyecto Asociado";

    // 1. Obtener proyecto del QUE raíz
    const rootProject = await this.getProjectFromNode(rootUid);

    // 2. Obtener proyecto de cada nodo
    const nodeUids = branchNodes.map(n => n.uid);

    // Query para obtener todos los bloques de Proyecto Asociado de las páginas
    const query = `[:find ?page-uid ?string
                   :in $ [?page-uid ...]
                   :where 
                   [?page :block/uid ?page-uid]
                   [?block :block/page ?page]
                   [?block :block/string ?string]
                   [(clojure.string/includes? ?string "${fieldName}::")]]`;

    const coherent = [];
    const different = [];
    const missing = [];

    try {
        const results = await window.roamAlphaAPI.data.async.q(query, nodeUids);

        // Crear mapa de UID -> proyecto
        const projectMap = new Map();
        const regex = new RegExp(`${fieldName}::\\s*\\[\\[([^\\]]+)\\]\\]`);

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
    const config = this.getConfig();
    const fieldName = config.projectFieldName || "Proyecto Asociado";
    const newValue = `${fieldName}:: [[${targetProject}]]`;

    let updated = 0;
    let created = 0;
    const errors = [];

    for (const node of nodesToUpdate) {
        try {
            // Buscar si ya tiene un bloque con Proyecto Asociado
            const query = `[:find ?block-uid ?string
                           :where 
                           [?page :block/uid "${node.uid}"]
                           [?block :block/page ?page]
                           [?block :block/uid ?block-uid]
                           [?block :block/string ?string]
                           [(clojure.string/includes? ?string "${fieldName}::")]]`;

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

// ============================================================================
// API: Verificación de Estructura del Grafo
// ============================================================================

/**
 * Verifica la estructura de un nodo individual
 * @param {object} nodeData - Datos del nodo (ya transformados)
 * @param {string} nodeType - Tipo del nodo (QUE, CLM, EVD)
 * @returns {{ valid: boolean, issues: string[] }}
 */
DiscourseGraphToolkit.verifyNodeStructure = function (nodeData, nodeType) {
    const issues = [];

    if (!nodeData || !nodeData.children) {
        return { valid: true, issues: [] };
    }

    const children = nodeData.children || [];

    if (nodeType === 'QUE') {
        // Verificar que QUE use #RespondedBy (no #SupportedBy directamente)
        let hasRespondedBy = false;
        let hasSupportedByDirect = false;

        for (const child of children) {
            const str = child.string || "";
            if (str.includes("#RespondedBy")) {
                hasRespondedBy = true;
            }
            if (str.includes("#SupportedBy")) {
                hasSupportedByDirect = true;
            }
        }

        // Si tiene #SupportedBy pero no #RespondedBy, es un problema
        if (hasSupportedByDirect && !hasRespondedBy) {
            issues.push("Usa #SupportedBy en lugar de #RespondedBy. Las respuestas no se exportarán correctamente.");
        }

        // Si no tiene ninguno de los dos, también es un problema
        if (!hasRespondedBy && !hasSupportedByDirect) {
            // Verificar si tiene CLMs/EVDs como hijos directos sin marcador
            const hasDiscourseRefs = children.some(child => {
                const str = child.string || "";
                return str.includes("[[CLM]]") || str.includes("[[EVD]]");
            });

            if (hasDiscourseRefs) {
                issues.push("Tiene referencias a CLM/EVD pero sin marcador #RespondedBy. Las respuestas podrían no exportarse.");
            }
        }
    }

    return {
        valid: issues.length === 0,
        issues
    };
};

/**
 * Verifica la estructura completa de una rama (QUE y sus descendientes)
 * @param {string} questionUid - UID de la pregunta a verificar
 * @returns {Promise<{ structureIssues: Array<{uid, title, type, issues}>, isExportable: boolean }>}
 */
DiscourseGraphToolkit.verifyBranchStructure = async function (questionUid) {
    try {
        const structureIssues = [];

        // 1. Obtener datos del QUE
        const rawData = await window.roamAlphaAPI.data.async.pull(
            this.ROAM_PULL_PATTERN,
            [':block/uid', questionUid]
        );

        if (!rawData) {
            return { structureIssues: [], isExportable: true };
        }

        const nodeData = this.transformToNativeFormat(rawData, 0, new Set(), true);
        if (!nodeData) {
            return { structureIssues: [], isExportable: true };
        }

        // 2. Verificar estructura del QUE
        const queVerification = this.verifyNodeStructure(nodeData, 'QUE');
        if (!queVerification.valid) {
            structureIssues.push({
                uid: questionUid,
                title: nodeData.title,
                type: 'QUE',
                issues: queVerification.issues
            });
        }

        // 3. Determinar si es exportable (si tiene problemas críticos, no lo es)
        const isExportable = structureIssues.length === 0;

        return { structureIssues, isExportable };

    } catch (e) {
        console.error("Error verifying branch structure:", e);
        return { structureIssues: [], isExportable: true };
    }
};

/**
 * Corrige la estructura de un QUE: cambia #SupportedBy a #RespondedBy
 * @param {string} questionUid - UID de la pregunta a corregir
 * @returns {Promise<{ success: boolean, fixed: number }>}
 */
DiscourseGraphToolkit.fixQueStructure = async function (questionUid) {
    try {
        // Buscar bloques hijos que tengan #SupportedBy
        const query = `[:find ?block-uid ?string
                       :where 
                       [?page :block/uid "${questionUid}"]
                       [?block :block/parents ?page]
                       [?block :block/uid ?block-uid]
                       [?block :block/string ?string]
                       [(clojure.string/includes? ?string "#SupportedBy")]]`;

        const results = await window.roamAlphaAPI.data.async.q(query);

        let fixed = 0;
        for (const [blockUid, blockString] of results) {
            // Reemplazar #SupportedBy con #RespondedBy
            const newString = blockString.replace(/#SupportedBy/g, "#RespondedBy");

            await window.roamAlphaAPI.data.block.update({
                block: { uid: blockUid, string: newString }
            });
            fixed++;
        }

        return { success: true, fixed };

    } catch (e) {
        console.error("Error fixing QUE structure:", e);
        return { success: false, fixed: 0 };
    }
};




// --- MODULE: src/core/nodes.js ---
// ============================================================================
// 3. LÓGICA DE CREACIÓN DE NODOS (CORE)
// ============================================================================

DiscourseGraphToolkit.parseTemplate = function (templateText) {
    const lines = templateText.split('\n');
    const result = [];
    const stack = [{ children: result, indent: -1 }];

    for (let line of lines) {
        const indent = line.search(/\S/);
        const text = line.trim();
        if (text === '' || indent === -1) continue;

        const level = Math.floor(indent / 4);
        const item = { text, children: [] };

        while (stack.length > 1 && stack[stack.length - 1].indent >= level) {
            stack.pop();
        }
        stack[stack.length - 1].children.push(item);
        stack.push({ children: item.children, indent: level });
    }
    return result;
};

DiscourseGraphToolkit.createTemplateBlocks = async function (parentUid, templateItems, startOrder = 0, proyecto = "") {
    try {
        for (let i = 0; i < templateItems.length; i++) {
            let item = templateItems[i];
            let processedText = item.text.replace(/{PROYECTO}/g, proyecto);

            let blockUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.block.create({
                "location": { "parent-uid": parentUid, "order": startOrder + i },
                "block": { "uid": blockUid, "string": processedText }
            });

            if (item.children && item.children.length > 0) {
                await this.createTemplateBlocks(blockUid, item.children, 0, proyecto);
            }
        }
    } catch (e) {
        console.error("Error creating template blocks:", e);
        throw e; // Re-throw to be caught by caller
    }
};

DiscourseGraphToolkit.convertBlockToNode = async function (typePrefix) {
    let pageUid = null;
    let pageWasCreated = false;
    let blockUid = null;
    let originalBlockContent = null;

    try {
        let focusedBlock = window.roamAlphaAPI.ui.getFocusedBlock();
        if (!focusedBlock) {
            this.showToast("No hay bloque enfocado", "error");
            return;
        }
        blockUid = focusedBlock["block-uid"];
        let blockData = window.roamAlphaAPI.data.pull("[:block/string]", `[:block/uid "${blockUid}"]`);
        if (!blockData) return;

        originalBlockContent = blockData[":block/string"] || "";
        if (originalBlockContent.trim() === "") {
            this.showToast("El bloque está vacío", "error");
            return;
        }
        if (originalBlockContent.startsWith(`[[${typePrefix}]]`)) {
            this.showToast("El bloque ya fue transformado", "info");
            return;
        }

        // Configuración actual
        const config = this.getConfig();
        const proyecto = config.defaultProject;
        const templates = this.getTemplates();
        const templateText = templates[typePrefix];
        const templateItems = this.parseTemplate(templateText);

        // Crear página
        let newPageTitle = `[[${typePrefix}]] - ${originalBlockContent}`;
        let newBlockString = `[[${newPageTitle}]]`;

        // Verificar existencia
        let safeTitle = newPageTitle.replace(/"/g, '\\"');
        let existing = window.roamAlphaAPI.q(`[:find ?uid :where [?page :node/title "${safeTitle}"] [?page :block/uid ?uid]]`);

        if (existing && existing.length > 0) {
            pageUid = existing[0][0];
            this.showToast(`Nodo ${typePrefix} ya existe, vinculando...`, "info");
        } else {
            pageUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.page.create({
                "page": { "title": newPageTitle, "uid": pageUid }
            });
            pageWasCreated = true;
            await this.createTemplateBlocks(pageUid, templateItems, 0, proyecto);
        }

        this.addToNodeHistory(typePrefix, originalBlockContent, proyecto);

        await window.roamAlphaAPI.data.block.update({
            "block": { "uid": blockUid, "string": newBlockString }
        });

        this.showToast(`✓ Nodo ${typePrefix} creado`, "success");

        setTimeout(() => {
            window.roamAlphaAPI.ui.mainWindow.openBlock({ block: { uid: blockUid } });
        }, 100);

    } catch (error) {
        console.error("Error creando nodo:", error);
        this.showToast("Error: " + error.message, "error");
        // Rollback simple
        if (pageWasCreated && pageUid) {
            window.roamAlphaAPI.data.page.delete({ "page": { "uid": pageUid } });
        }
        if (blockUid && originalBlockContent) {
            window.roamAlphaAPI.data.block.update({ "block": { "uid": blockUid, "string": originalBlockContent } });
        }
    }
};




// --- MODULE: src/core/projects.js ---
// This file is intentionally left empty as project logic is handled in api/roam.js and state.js
// It is kept for future expansion of core project business logic if needed.




// --- MODULE: src/core/export.js ---

// ============================================================================
// 4. LÓGICA DE EXPORTACIÓN (CORE ROBUSTO)
// ============================================================================


DiscourseGraphToolkit.transformToNativeFormat = function (pullData, depth = 0, visited = new Set(), includeContent = true) {
    if (!pullData) return null;
    if (depth > this.FILES.MAX_DEPTH) return { 'uid': pullData[':block/uid'], '_truncated': true };

    const uid = pullData[':block/uid'];
    if (uid && visited.has(uid)) return { 'uid': uid, '_circular_ref': true };

    const newVisited = new Set(visited);
    if (uid) newVisited.add(uid);

    const transformed = {};
    // FIX: Check for undefined to allow empty strings
    if (pullData[':block/string'] !== undefined) transformed['string'] = pullData[':block/string'];
    if (pullData[':block/uid']) transformed['uid'] = pullData[':block/uid'];
    if (pullData[':node/title']) transformed['title'] = pullData[':node/title'];
    if (pullData[':edit/time']) transformed['edit-time'] = this.convertTimestamp(pullData[':edit/time']);
    if (pullData[':create/time']) transformed['create-time'] = this.convertTimestamp(pullData[':create/time']);
    if (pullData[':block/order'] !== undefined) transformed['order'] = pullData[':block/order'];

    if (pullData[':block/refs'] && Array.isArray(pullData[':block/refs'])) {
        transformed[':block/refs'] = pullData[':block/refs'].map(ref =>
            (typeof ref === 'object' && ref[':block/uid']) ? { ':block/uid': ref[':block/uid'] } : ref
        );
        transformed['refs'] = pullData[':block/refs'].map(ref =>
            (typeof ref === 'object' && ref[':block/uid']) ? { uid: ref[':block/uid'] } : ref
        );
    }

    if (pullData[':create/user']) transformed[':create/user'] = { ':user/uid': pullData[':create/user'][':user/uid'] };
    if (pullData[':edit/user']) transformed[':edit/user'] = { ':user/uid': pullData[':edit/user'][':user/uid'] };

    // Solo procesar hijos si includeContent es true O si es el nivel raíz (depth 0 es la página, sus hijos son los bloques)
    // Pero espera, si depth 0 es la página, sus hijos son el contenido.
    // Si includeContent es false, queremos la página (título, uid) pero NO sus hijos.
    if (includeContent && pullData[':block/children'] && Array.isArray(pullData[':block/children'])) {
        // SORTING FIX: Ensure children are processed in visual order
        const sortedChildren = [...pullData[':block/children']].sort((a, b) => {
            const orderA = a[':block/order'] !== undefined ? a[':block/order'] : 9999;
            const orderB = b[':block/order'] !== undefined ? b[':block/order'] : 9999;
            return orderA - orderB;
        });

        transformed['children'] = sortedChildren.map(child =>
            this.transformToNativeFormat(child, depth + 1, newVisited, includeContent)
        );
    }
    return transformed;
};

// --- Lógica de Exportación Nativa Robusta ---
DiscourseGraphToolkit.exportPagesNative = async function (pageUids, filename, onProgress, includeContent = true, download = true) {
    const report = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };
    report(`Iniciando exportación de ${pageUids.length} páginas (Incluir contenido: ${includeContent})...`);

    const eids = pageUids.map(uid => [':block/uid', uid]);

    try {
        // Si no incluimos contenido, el patrón de pull podría ser más simple, pero usaremos el mismo y filtraremos en transform
        // Esto es menos eficiente en red pero más simple en código.
        // Opcional: Usar un patrón diferente si includeContent es false.
        const pattern = includeContent ? this.ROAM_PULL_PATTERN : `[:block/uid :node/title :edit/time :create/time :block/string]`;

        const rawData = await window.roamAlphaAPI.data.async.pull_many(pattern, eids);

        const exportData = rawData
            .filter(d => d !== null)
            .map((d, i) => {
                if ((i + 1) % 5 === 0) report(`Procesando ${i + 1}/${rawData.length}...`);
                return this.transformToNativeFormat(d, 0, new Set(), includeContent);
            });

        if (download) {
            this.downloadJSON(exportData, filename);
        }

        return { count: exportData.length, data: exportData };
    } catch (e) {
        console.error("Error exportando:", e);
        throw e;
    }
};




// --- MODULE: src/core/import.js ---
// ============================================================================
// 6. LÓGICA DE IMPORTACIÓN (CORE)
// ============================================================================

DiscourseGraphToolkit.importGraph = async function (jsonContent, onProgress) {
    console.log("🚀 STARTING IMPORT - VERSION 1.1.1 (FIXED)");
    const report = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };

    report(`Leyendo archivo (${jsonContent.length} bytes)...`);

    let data;
    try {
        data = JSON.parse(jsonContent);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        throw new Error("El archivo no es un JSON válido: " + e.message);
    }

    if (!Array.isArray(data)) {
        throw new Error("El formato del JSON no es válido (debe ser un array de páginas).");
    }

    console.log("Import Data Length:", data.length);
    if (data.length === 0) {
        throw new Error("El archivo JSON contiene un array vacío (0 ítems).");
    }

    report(`Iniciando importación de ${data.length} ítems...`);
    let createdPages = 0;
    let skippedPages = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
        const pageData = data[i];
        // Normalizar claves (Soporte para exportaciones antiguas o raw)
        const title = pageData.title || pageData[':node/title'] || pageData[':title'];
        const uid = pageData.uid || pageData[':block/uid'] || pageData[':uid'];
        const children = pageData.children || pageData[':block/children'] || pageData['children'];

        if (!title) {
            console.warn("Item sin título saltado:", pageData);
            skippedPages++;
            continue;
        }

        report(`Procesando página ${i + 1}/${data.length}: ${title}`);

        try {
            await DiscourseGraphToolkit.importPage({ ...pageData, title, uid, children });
            createdPages++;
        } catch (e) {
            console.error(`Error importando página ${title}:`, e);
            errors.push(`${title}: ${e.message}`);
            report(`❌ Error en página ${title}: ${e.message}`);
        }
    }

    // 3. Log en Daily Note
    if (createdPages > 0) {
        const importedTitles = data.map(p => p.title || p[':node/title'] || p[':title']).filter(t => t);
        await DiscourseGraphToolkit.logImportToDailyNote(importedTitles);
    }

    return { pages: createdPages, skipped: skippedPages, errors: errors };
};

DiscourseGraphToolkit.logImportToDailyNote = async function (importedTitles) {
    if (!importedTitles || importedTitles.length === 0) return;

    const today = new Date();
    const dailyNoteUid = window.roamAlphaAPI.util.dateToPageUid(today);
    const dailyNoteTitle = window.roamAlphaAPI.util.dateToPageTitle(today);

    // 1. Asegurar que la Daily Note existe
    let page = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", dailyNoteTitle]);
    if (!page) {
        await window.roamAlphaAPI.data.page.create({ "page": { "title": dailyNoteTitle, "uid": dailyNoteUid } });
    }

    // 2. Crear bloque padre #import
    const importBlockUid = window.roamAlphaAPI.util.generateUID();
    const timestamp = today.toLocaleTimeString();
    await window.roamAlphaAPI.data.block.create({
        "location": { "parent-uid": dailyNoteUid, "order": "last" },
        "block": { "uid": importBlockUid, "string": `#import (${timestamp})` }
    });

    // 3. Crear hijos con los títulos
    for (let i = 0; i < importedTitles.length; i++) {
        const title = importedTitles[i];
        await window.roamAlphaAPI.data.block.create({
            "location": { "parent-uid": importBlockUid, "order": i },
            "block": { "string": `[[${title}]]` }
        });
    }
};

DiscourseGraphToolkit.importPage = async function (pageData) {
    if (!pageData.title) return;

    // 1. Verificar si la página existe usando PULL (más robusto que Q)
    let pageUid = pageData.uid;
    // pull devuelve null si no encuentra la entidad
    let existingPage = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", pageData.title]);

    if (existingPage && existingPage[':block/uid']) {
        // La página existe, usamos su UID real
        pageUid = existingPage[':block/uid'];
    } else {
        // La página no existe, la creamos
        if (!pageUid) pageUid = window.roamAlphaAPI.util.generateUID();

        try {
            await window.roamAlphaAPI.data.page.create({
                "page": { "title": pageData.title, "uid": pageUid }
            });
        } catch (e) {
            console.warn(`Falló creación de página "${pageData.title}", intentando recuperar UID...`, e);
            // Si falla, intentamos ver si existe ahora (race condition?)
            let retry = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", pageData.title]);
            if (retry && retry[':block/uid']) {
                pageUid = retry[':block/uid'];
            } else {
                throw e;
            }
        }
    }

    // 2. Importar hijos (Bloques)
    if (pageData.children && pageData.children.length > 0) {
        await DiscourseGraphToolkit.importChildren(pageUid, pageData.children);
    }
};

DiscourseGraphToolkit.importChildren = async function (parentUid, children) {
    // Ordenar por 'order' si existe, para mantener la estructura
    const sortedChildren = children.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Optimización: Importar hijos en paralelo usando Promise.all
    // Roam API maneja el ordenamiento mediante la propiedad 'order', por lo que es seguro lanzarlos juntos.
    const promises = sortedChildren.map((child, i) =>
        DiscourseGraphToolkit.importBlock(parentUid, child, i)
    );

    await Promise.all(promises);
};

DiscourseGraphToolkit.importBlock = async function (parentUid, blockData, order) {
    // Normalizar claves de bloque
    const blockUid = blockData.uid || blockData[':block/uid'] || blockData[':uid'] || window.roamAlphaAPI.util.generateUID();
    const content = blockData.string || blockData[':block/string'] || blockData[':string'] || "";
    const children = blockData.children || blockData[':block/children'] || blockData['children'];

    // Verificar si el bloque ya existe (por UID) usando PULL
    let exists = false;
    if (blockData.uid || blockData[':block/uid']) {
        const check = window.roamAlphaAPI.data.pull("[:block/uid]", [":block/uid", blockUid]);
        exists = (check && check[':block/uid']);
    }

    if (!exists) {
        // Crear bloque
        await window.roamAlphaAPI.data.block.create({
            "location": { "parent-uid": parentUid, "order": order },
            "block": { "uid": blockUid, "string": content }
        });
    } else {
        // El bloque existe.
        // ESTRATEGIA: NO SOBRESCRIBIR contenido.
    }

    // Recursión para hijos del bloque
    if (children && children.length > 0) {
        await DiscourseGraphToolkit.importChildren(blockUid, children);
    }
};




// --- MODULE: src/core/contentProcessor.js ---
// ============================================================================
// CORE: Content Processor
// Ported from roamMap/core/content_processor.py
// ============================================================================

DiscourseGraphToolkit.ContentProcessor = {
    MAX_RECURSION_DEPTH: 20,

    extractBlockContent: function (block, indentLevel = 0, skipMetadata = true, visitedBlocks = null, maxDepth = this.MAX_RECURSION_DEPTH, excludeBitacora = true) {
        let content = "";

        if (!visitedBlocks) visitedBlocks = new Set();

        if (indentLevel > maxDepth) {
            console.warn(`⚠ Profundidad máxima alcanzada (${maxDepth}), deteniendo recursión`);
            return content;
        }

        try {
            if (!block || typeof block !== 'object') return content;

            const blockUid = block.uid || block[':block/uid'] || "";
            const blockString = block.string || block[':block/string'] || "";

            // Identificador simple para JS (UID es suficiente en Roam)
            const blockIdentifier = blockUid;

            if (blockIdentifier && visitedBlocks.has(blockIdentifier)) {
                // console.warn(`⚠ Ciclo detectado en bloque: ${blockString.substring(0, 30)}..., saltando`);
                return content;
            }

            if (blockIdentifier) visitedBlocks.add(blockIdentifier);

            // Excluir bloque de bitácora y sus hijos SI la opción está activada
            if (excludeBitacora && blockString.toLowerCase().includes('[[bitácora]]')) {
                return "";
            }

            // Lógica de metadatos
            const structuralMarkers = ["#SupportedBy", "#RespondedBy", "#RelatedTo"];
            const isStructural = structuralMarkers.includes(blockString);

            if (skipMetadata && (!blockString || isStructural)) {
                // Pass
            } else {
                if (blockString) {
                    const indent = "  ".repeat(indentLevel);
                    content += `${indent}- ${blockString}\n`;
                }
            }

            const children = block.children || block[':block/children'] || [];
            if (Array.isArray(children)) {
                for (const child of children) {
                    const childContent = this.extractBlockContent(child, indentLevel + 1, skipMetadata, visitedBlocks, maxDepth, excludeBitacora);
                    if (childContent) content += childContent;
                }
            }

            if (blockIdentifier) visitedBlocks.delete(blockIdentifier);

        } catch (e) {
            console.warn(`⚠ Error extrayendo contenido de bloque: ${e}`);
        }

        return content;
    },

    extractNodeContent: function (nodeData, extractAdditionalContent = false, nodeType = "EVD", excludeBitacora = true) {
        let detailedContent = "";

        try {
            if (!nodeData) return detailedContent;

            const children = nodeData.children || nodeData[':block/children'] || [];
            if (Array.isArray(children) && children.length > 0) {
                for (const child of children) {
                    const childString = child.string || child[':block/string'] || "";
                    const structuralMetadata = ["#SupportedBy", "#RespondedBy", "#RelatedTo"];
                    const isStructuralMetadata = structuralMetadata.some(meta => childString.startsWith(meta));

                    // FIX: Always exclude structural metadata blocks from text content to avoid duplicates,
                    // as these relationships are rendered structurally (e.g. headers/sub-sections).
                    if (!isStructuralMetadata) {
                        // Normal content block
                        if (childString) {
                            const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora);
                            if (childContent) detailedContent += childContent;
                        } else {
                            // Empty block with children (e.g. indentation wrapper) -> recurse?
                            // extractBlockContent handles recursion.
                            const childContent = this.extractBlockContent(child, 0, false, null, this.MAX_RECURSION_DEPTH, excludeBitacora);
                            if (childContent) detailedContent += childContent;
                        }
                    } else if (childString === "#RelatedTo" && (child.children || child[':block/children'])) {
                        // Only for RelatedTo, we might want to peek inside if it contains non-structural text?
                        // But usually RelatedTo contains links. If we treat it as structural, we skip it.
                        // Given the user instruction "only appear once", skipping structural blocks is safer.
                    }
                }
            }

            if (!detailedContent) {
                // Fallback: contenido directo o título
                const mainString = nodeData.string || nodeData[':block/string'] || "";
                if (mainString) {
                    detailedContent += `- ${mainString}\n`;
                } else {
                    const title = nodeData.title || nodeData[':node/title'] || "";
                    if (title) {
                        const prefix = `[[${nodeType}]] - `;
                        const cleanTitle = title.replace(prefix, "").trim();
                        if (cleanTitle) detailedContent += `- ${cleanTitle}\n`;
                    }
                }
            }

        } catch (e) {
            console.error(`❌ Error extrayendo contenido ${nodeType}: ${e}`);
        }

        return detailedContent;
    }
};




// --- MODULE: src/core/relationshipMapper.js ---
// ============================================================================
// CORE: Relationship Mapper
// Ported from roamMap/core/relationship_mapper.py
// ============================================================================

DiscourseGraphToolkit.RelationshipMapper = {
    mapRelationships: function (allNodes) {
        console.log("Mapeando relaciones entre nodos...");

        // Paso 1: Crear mapas de búsqueda
        const { clmTitleMap, evdTitleMap } = this._createTitleMaps(allNodes);

        // Paso 2: Mapear QUE -> CLM/EVD (respuestas directas)
        this._mapQueRelationships(allNodes, clmTitleMap, evdTitleMap);

        // Paso 3: Mapear CLM -> EVD/CLM (estructura estándar y relaciones laterales)
        this._mapClmRelationships(allNodes, evdTitleMap, clmTitleMap);

        // Paso 4: Mapear relaciones CLM-CLM y CLM-EVD vía #RelatedTo
        this._mapClmRelatedToRelationships(allNodes, clmTitleMap, evdTitleMap);
    },

    _createTitleMaps: function (allNodes) {
        const clmTitleMap = {};
        const evdTitleMap = {};

        for (const uid in allNodes) {
            const node = allNodes[uid];
            try {
                if (node.type === "CLM") {
                    this._addToTitleMap(clmTitleMap, node, uid, "[[CLM]] - ");
                } else if (node.type === "EVD") {
                    this._addToTitleMap(evdTitleMap, node, uid, "[[EVD]] - ");
                }
            } catch (e) {
                console.warn(`⚠ Error creando mapa para nodo ${uid}: ${e}`);
            }
        }

        console.log(`Mapas creados: ${Object.keys(clmTitleMap).length} CLMs, ${Object.keys(evdTitleMap).length} EVDs`);
        return { clmTitleMap, evdTitleMap };
    },

    _addToTitleMap: function (titleMap, node, uid, prefix) {
        const title = node.title || "";
        if (!title) return;

        // Guardar tanto el título completo como una versión limpia
        titleMap[title] = uid;
        const cleanTitle = DiscourseGraphToolkit.cleanText(title.replace(prefix, ""));
        titleMap[cleanTitle] = uid;
    },

    _mapQueRelationships: function (allNodes, clmTitleMap, evdTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "QUE") continue;

            if (!node.related_clms) node.related_clms = [];
            if (!node.direct_evds) node.direct_evds = [];

            try {
                const data = node.data;
                const children = data.children || []; // Sorted by export.js

                for (const child of children) {
                    const str = child.string || "";
                    if (str.includes("#RespondedBy")) {
                        // Case 1: The block ITSELF is the response (e.g. "[[CLM]] - Title #RespondedBy")
                        this._extractRelationshipsFromBlock(child, node, uid, allNodes, clmTitleMap, evdTitleMap, "related_clms", "direct_evds");

                        // Case 2: The block is a header/container (e.g. "#RespondedBy" -> children are responses)
                        if (child.children && child.children.length > 0) {
                            for (const subChild of child.children) {
                                this._extractRelationshipsFromBlock(subChild, node, uid, allNodes, clmTitleMap, evdTitleMap, "related_clms", "direct_evds");
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`❌ Error mapeando relaciones para QUE ${uid}: ${e}`);
            }
        }
    },

    // Helper genérico para extraer relaciones de un bloque (refs o texto)
    _extractRelationshipsFromBlock: function (block, node, sourceUid, allNodes, clmTitleMap, evdTitleMap, clmTargetField, evdTargetField) {
        try {
            const responseText = block.string || "";

            // A. Relaciones por Referencias (Direct UID refs)
            const refsToCheck = [];
            if (block.refs) refsToCheck.push(...block.refs);
            if (block[':block/refs']) {
                for (const ref of block[':block/refs']) {
                    if (ref[':block/uid']) refsToCheck.push({ uid: ref[':block/uid'] });
                }
            }

            for (const ref of refsToCheck) {
                const refUid = ref.uid || "";
                if (allNodes[refUid]) {
                    if (allNodes[refUid].type === "CLM") {
                        if (!node[clmTargetField].includes(refUid)) {
                            node[clmTargetField].push(refUid);
                        }
                    } else if (allNodes[refUid].type === "EVD") {
                        if (node[evdTargetField] && !node[evdTargetField].includes(refUid)) {
                            node[evdTargetField].push(refUid);
                        }
                    }
                }
            }

            // B. Relaciones por Texto ([[WikiLinks]])
            this._findEmbeddedRelationships(responseText, node, sourceUid, clmTitleMap, evdTitleMap, clmTargetField, evdTargetField);

        } catch (e) {
            console.warn(`⚠ Error processing block relationships: ${e}`);
        }
    },

    _findEmbeddedRelationships: function (responseText, node, uid, clmTitleMap, evdTitleMap, clmField, evdField) {
        try {
            // Extraer todas las referencias [[...]] del texto
            const pattern = /\[\[([^\]]+)\]\]/g;
            const references = [];
            let match;
            while ((match = pattern.exec(responseText)) !== null) {
                references.push(match[1]); // match[1] es el contenido dentro de los corchetes
            }

            if (references.length === 0) return;

            // Buscar CLMs
            if (references.some(ref => ref.includes('CLM'))) {
                for (const ref of references) {
                    if (clmTitleMap[ref]) {
                        const clmUid = clmTitleMap[ref];
                        if (!node[clmField].includes(clmUid) && clmUid !== uid) {
                            node[clmField].push(clmUid);
                        }
                    } else if (ref.includes('CLM')) {
                        // Búsqueda parcial
                        for (const titleFragment in clmTitleMap) {
                            if (ref.includes(titleFragment)) {
                                const clmUid = clmTitleMap[titleFragment];
                                if (!node[clmField].includes(clmUid) && clmUid !== uid) {
                                    node[clmField].push(clmUid);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Buscar EVDs
            if (references.some(ref => ref.includes('EVD'))) {
                for (const ref of references) {
                    if (evdTitleMap[ref]) {
                        const evdUid = evdTitleMap[ref];
                        if (!node[evdField].includes(evdUid)) {
                            node[evdField].push(evdUid);
                        }
                    } else if (ref.includes('EVD')) {
                        // Búsqueda parcial
                        for (const titleFragment in evdTitleMap) {
                            if (ref.includes(titleFragment)) {
                                const evdUid = evdTitleMap[titleFragment];
                                if (!node[evdField].includes(evdUid)) {
                                    node[evdField].push(evdUid);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

        } catch (e) {
            console.warn(`⚠ Error buscando relaciones incrustadas: ${e}`);
        }
    },

    _mapClmRelationships: function (allNodes, evdTitleMap, clmTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "CLM") continue;

            if (!node.related_evds) node.related_evds = [];
            if (!node.connected_clms) node.connected_clms = [];
            if (!node.supporting_clms) node.supporting_clms = [];

            try {
                const data = node.data;
                const children = data.children || []; // Sorted

                for (const child of children) {
                    const str = child.string || "";
                    if (str.includes("#SupportedBy")) {
                        // Case 1: Direct #SupportedBy on the node line
                        this._extractRelationshipsFromBlock(child, node, uid, allNodes, clmTitleMap, evdTitleMap, "supporting_clms", "related_evds");

                        // Case 2: Container #SupportedBy
                        if (child.children && child.children.length > 0) {
                            for (const subChild of child.children) {
                                this._extractRelationshipsFromBlock(subChild, node, uid, allNodes, clmTitleMap, evdTitleMap, "supporting_clms", "related_evds");
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`❌ Error mapeando relaciones para CLM ${uid}: ${e}`);
            }
        }
    },

    // _processSupportedByChildren removed as it is replaced by generic helper logic above

    _mapClmRelatedToRelationships: function (allNodes, clmTitleMap, evdTitleMap) {
        for (const uid in allNodes) {
            const node = allNodes[uid];
            if (node.type !== "CLM") continue;

            try {
                const data = node.data;
                const children = data.children || [];
                for (const child of children) {
                    const str = child.string || "";
                    if (str.includes("#RelatedTo")) {
                        this._processRelatedToChildren(child, node, uid, allNodes, clmTitleMap, evdTitleMap);
                    }
                }
            } catch (e) {
                console.error(`❌ Error mapeando relaciones #RelatedTo para CLM ${uid}: ${e}`);
            }
        }
    },

    _processRelatedToChildren: function (parentChild, node, uid, allNodes, clmTitleMap, evdTitleMap) {
        const children = parentChild.children || [];
        for (const relatedItem of children) {
            try {
                const refsToCheck = [];
                if (relatedItem.refs) refsToCheck.push(...relatedItem.refs);
                if (relatedItem[':block/refs']) {
                    for (const ref of relatedItem[':block/refs']) {
                        if (ref[':block/uid']) refsToCheck.push({ uid: ref[':block/uid'] });
                    }
                }

                for (const ref of refsToCheck) {
                    const refUid = ref.uid || "";
                    if (allNodes[refUid] && refUid !== uid) {
                        const referencedNode = allNodes[refUid];
                        if (referencedNode.type === "CLM") {
                            if (!node.connected_clms.includes(refUid)) {
                                node.connected_clms.push(refUid);
                            }
                        } else if (referencedNode.type === "EVD") {
                            if (!node.related_evds.includes(refUid)) {
                                node.related_evds.push(refUid);
                            }
                        }
                    }
                }

                const relatedText = relatedItem.string || "";
                this._findEmbeddedRelationships(relatedText, node, uid, clmTitleMap, evdTitleMap, "connected_clms", "related_evds");

            } catch (e) {
                console.warn(`⚠ Error procesando item #RelatedTo en CLM ${uid}: ${e}`);
            }
        }
    },

    collectDependencies: function (nodes) {
        const dependencies = new Set();

        for (const node of nodes) {
            try {
                const data = node.data;
                const children = data.children || [];

                // QUE -> #RespondedBy
                if (node.type === "QUE") {
                    for (const child of children) {
                        if ((child.string || "").includes("#RespondedBy")) {
                            this._collectRefsFromBlock(child, dependencies);
                        }
                    }
                }
                // CLM -> #SupportedBy / #RelatedTo
                else if (node.type === "CLM") {
                    for (const child of children) {
                        const str = child.string || "";
                        if (str.includes("#SupportedBy") || str.includes("#RelatedTo")) {
                            this._collectRefsFromBlock(child, dependencies);
                        }
                    }
                }
            } catch (e) {
                console.warn(`Error collecting dependencies for ${node.uid}:`, e);
            }
        }
        return dependencies;
    },

    _collectRefsFromBlock: function (block, dependencies) {
        const children = block.children || [];
        for (const child of children) {
            // Direct refs
            if (child.refs) child.refs.forEach(r => dependencies.add(r.uid));
            if (child[':block/refs']) {
                child[':block/refs'].forEach(r => {
                    if (r[':block/uid']) dependencies.add(r[':block/uid']);
                });
            }
            // Embedded refs [[UID]] - we can't easily parse UID from text unless we have a map.
            // But usually structural links use block refs or page refs which show up in metadata.
            // For now, rely on explicit refs.
        }
    }
};




// --- MODULE: src/core/htmlGenerator.js ---
// ============================================================================
// CORE: HTML Generator
// Ported from roamMap/core/html_generator.py
// ============================================================================

DiscourseGraphToolkit.HtmlGenerator = {
    generateHtml: function (questions, allNodes, title = "Mapa de Discurso", contentConfig = true, excludeBitacora = true) {
        // Compatibilidad legacy
        let config = contentConfig;
        if (typeof contentConfig === 'boolean') {
            config = { QUE: contentConfig, CLM: contentConfig, EVD: contentConfig };
        }

        const css = this._getCSS();
        const js = this._getJS();

        let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${css}
</head>
<body>
    <h1>${title}</h1>
    
    <div class="controls">
        <button id="expandAll" class="btn">Expandir Todo</button>
        <button id="collapseAll" class="btn">Contraer Todo</button>
        <button id="copyAll" class="btn btn-copy">Copiar Texto</button>
        <button id="exportMarkdown" class="btn btn-export">Exportar Markdown</button>
    </div>
`;

        for (let i = 0; i < questions.length; i++) {
            try {
                const question = questions[i];
                const qId = `q${i}`;
                const qTitle = DiscourseGraphToolkit.cleanText(question.title.replace("[[QUE]] - ", ""));

                html += `<div id="${qId}" class="node que-node">`;
                html += `<h2 class="collapsible">`;
                html += `<span class="node-tag">[[QUE]]</span> - ${qTitle}`;
                html += `<button class="btn-copy-individual" onclick="copyIndividualQuestion('${qId}')">Copiar</button>`;
                html += `<button class="btn-export-md" onclick="exportQuestionMarkdown(${i})" title="Exportar Markdown">MD</button>`;
                html += `<button class="btn-reorder btn-reorder-up" onclick="moveQuestionUp('${qId}')" title="Mover hacia arriba">↑</button>`;
                html += `<button class="btn-reorder btn-reorder-down" onclick="moveQuestionDown('${qId}')" title="Mover hacia abajo">↓</button>`;
                html += `</h2>`;
                html += `<div class="content">`;

                // Metadata
                const metadata = question.project_metadata || {};
                html += this._generateMetadataHtml(metadata);

                // --- Contenido QUE ---
                const queContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(question, config.QUE, "QUE", excludeBitacora);
                if (queContent) {
                    html += `<div class="node content-node" style="margin-bottom: 10px;">`;
                    html += `<p>${this._formatContentForHtml(queContent)}</p>`;
                    html += `</div>`;
                }
                // ---------------------

                const hasClms = question.related_clms && question.related_clms.length > 0;
                const hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;

                if (!hasClms && !hasDirectEvds) {
                    html += '<p class="error-message">No se encontraron respuestas relacionadas con esta pregunta.</p>';
                    html += '</div></div>';
                    continue;
                }

                // CLMs
                if (question.related_clms) {
                    for (let j = 0; j < question.related_clms.length; j++) {
                        const clmUid = question.related_clms[j];
                        if (allNodes[clmUid]) {
                            const clm = allNodes[clmUid];
                            const clmId = `q${i}_c${j}`;
                            const clmTitle = DiscourseGraphToolkit.cleanText(clm.title.replace("[[CLM]] - ", ""));

                            html += `<div id="${clmId}" class="node clm-node">`;
                            html += `<h3 class="collapsible">`;
                            html += `<span class="node-tag">[[CLM]]</span> - ${clmTitle}`;
                            html += `<button class="btn-copy-individual" onclick="copyIndividualCLM('${clmId}')">Copiar</button>`;
                            html += `</h3>`;
                            html += `<div class="content">`;

                            html += this._generateMetadataHtml(clm.project_metadata || {});

                            // --- NUEVO: Contenido del CLM ---
                            const clmContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(clm.data, config.CLM, "CLM", excludeBitacora);
                            if (clmContent) {
                                html += `<div class="node content-node" style="margin-bottom: 10px;">`;
                                html += `<p>${this._formatContentForHtml(clmContent)}</p>`;
                                html += `</div>`;
                            }
                            // --------------------------------

                            // Supporting CLMs
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                html += '<div class="supporting-clms">';
                                // html += '<div class="connected-clm-title" style="color: #005a9e;"><strong>CLMs de soporte (SupportedBy):</strong></div>';

                                for (let suppIdx = 0; suppIdx < clm.supporting_clms.length; suppIdx++) {
                                    const suppUid = clm.supporting_clms[suppIdx];
                                    if (allNodes[suppUid]) {
                                        const suppClm = allNodes[suppUid];
                                        const suppTitle = DiscourseGraphToolkit.cleanText(suppClm.title.replace("[[CLM]] - ", ""));

                                        html += `<div class="supporting-clm-item">`;
                                        html += `<h5 class="collapsible"><span class="node-tag">[[CLM]]</span> - ${suppTitle}</h5>`;
                                        html += `<div class="content">`;
                                        html += this._generateMetadataHtml(suppClm.project_metadata || {}, true);

                                        // --- NUEVO: Contenido CLM Soporte ---
                                        const suppContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(suppClm.data, config.CLM, "CLM", excludeBitacora);
                                        if (suppContent) {
                                            html += `<div style="margin-left: 10px; font-size: 11px; margin-bottom: 8px; color: #333;">`;
                                            html += `<p>${this._formatContentForHtml(suppContent)}</p>`;
                                            html += `</div>`;
                                        }
                                        // ------------------------------------

                                        // Evidencias de soporte
                                        if (suppClm.related_evds && suppClm.related_evds.length > 0) {
                                            // html += '<div style="margin-left: 15px;"><strong>Evidencias:</strong></div>';
                                            for (const evdUid of suppClm.related_evds) {
                                                if (allNodes[evdUid]) {
                                                    const evd = allNodes[evdUid];
                                                    const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                                                    html += `<div class="node" style="margin-left: 20px; border-left: 1px solid #e0e0e0;">`;
                                                    html += `<h6 class="collapsible" style="font-size: 11px; margin: 8px 0 4px 0;"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h6>`;
                                                    html += `<div class="content">`;
                                                    const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
                                                    if (detailedContent) {
                                                        html += '<div style="margin-left: 15px; font-size: 11px; color: #555;">';
                                                        html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                                        html += '</div>';
                                                    }
                                                    html += `</div></div>`;
                                                }
                                            }
                                        }
                                        html += `</div></div>`;
                                    }
                                }
                                html += '</div>';
                            }


                            // EVDs
                            if (clm.related_evds && clm.related_evds.length > 0) {
                                // html += '<div style="margin-top: 15px;"><strong>Evidencias que respaldan esta afirmación:</strong></div>';
                                for (let k = 0; k < clm.related_evds.length; k++) {
                                    const evdUid = clm.related_evds[k];
                                    if (allNodes[evdUid]) {
                                        const evd = allNodes[evdUid];
                                        const evdId = `q${i}_c${j}_e${k}`;
                                        const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));

                                        html += `<div id="${evdId}" class="node evd-node">`;
                                        html += `<h4 class="collapsible"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h4>`;
                                        html += `<div class="content">`;
                                        html += this._generateMetadataHtml(evd.project_metadata || {});

                                        const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
                                        if (detailedContent) {
                                            html += '<div class="node content-node">';
                                            // html += '<p><strong>Contenido detallado:</strong></p>';
                                            html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                            html += '</div>';
                                        }
                                        html += `</div></div>`;
                                    }
                                }
                            } else if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                                html += '<p class="error-message">No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.</p>';
                            }

                            html += `</div></div>`;
                        }
                    }
                }

                // Direct EVDs
                if (question.direct_evds) {
                    for (let j = 0; j < question.direct_evds.length; j++) {
                        const evdUid = question.direct_evds[j];
                        if (allNodes[evdUid]) {
                            const evd = allNodes[evdUid];
                            const evdId = `q${i}_de${j}`;
                            const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));

                            html += `<div id="${evdId}" class="node direct-evd-node">`;
                            html += `<h3 class="collapsible"><span class="node-tag">[[EVD]]</span> - ${evdTitle}</h3>`;
                            html += `<div class="content">`;
                            html += this._generateMetadataHtml(evd.project_metadata || {});

                            const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
                            if (detailedContent) {
                                html += '<div class="node direct-content-node">';
                                // html += '<p><strong>Contenido detallado:</strong></p>';
                                html += `<p>${this._formatContentForHtml(detailedContent)}</p>`;
                                html += '</div>';
                            }
                            html += `</div></div>`;
                        }
                    }
                }

                html += `</div></div>`;

            } catch (e) {
                console.error(`Error procesando pregunta ${i}: ${e}`);
                html += `<div class="error-message">Error procesando pregunta: ${e}</div>`;
            }
        }

        // Helper para copiar estructura de bloques sin referencias circulares
        const cleanBlockData = (block, depth = 0) => {
            if (!block || typeof block !== 'object' || depth > 25) return null;

            const clean = {};

            // Copiar solo propiedades seguras
            if (block.string !== undefined) clean.string = block.string;
            if (block[':block/string'] !== undefined) clean.string = block[':block/string'];
            if (block.uid !== undefined) clean.uid = block.uid;
            if (block[':block/uid'] !== undefined) clean.uid = block[':block/uid'];
            if (block.title !== undefined) clean.title = block.title;
            if (block[':node/title'] !== undefined) clean.title = block[':node/title'];

            // Copiar children recursivamente
            const children = block.children || block[':block/children'];
            if (Array.isArray(children) && children.length > 0) {
                clean.children = children.map(child => cleanBlockData(child, depth + 1)).filter(c => c !== null);
            }

            return clean;
        };

        // Preparar datos para embeber en el HTML (para que exportToMarkdown use los mismos datos)
        const embeddedData = {
            questions: questions.map(q => ({
                title: q.title,
                uid: q.uid,
                project_metadata: q.project_metadata,
                related_clms: q.related_clms,
                direct_evds: q.direct_evds,
                data: cleanBlockData(q.data || q)
            })),
            allNodes: Object.fromEntries(
                Object.entries(allNodes).map(([uid, node]) => [uid, {
                    title: node.title,
                    uid: node.uid,
                    type: node.type,
                    project_metadata: node.project_metadata,
                    related_evds: node.related_evds,
                    supporting_clms: node.supporting_clms,
                    data: cleanBlockData(node.data || node)
                }])
            ),
            config: config,
            excludeBitacora: excludeBitacora
        };

        html += `
    <script id="embedded-data" type="application/json">${JSON.stringify(embeddedData)}</script>
    ${js}
</body>
</html>`;
        return html;
    },

    _generateMetadataHtml: function (metadata, small = false) {
        if (!metadata || Object.keys(metadata).length === 0) return "";

        const proyecto = metadata.proyecto_asociado;
        const seccion = metadata.seccion_tesis;

        if (!proyecto && !seccion) return "";

        let html = '<div class="project-metadata"';
        if (small) html += ' style="font-size: 10px; padding: 6px 8px; margin: 6px 0 8px 0;"';
        html += '>';

        if (proyecto) html += `<div class="metadata-item"><span class="metadata-label">Proyecto Asociado:</span><span class="metadata-value">${proyecto}</span></div>`;
        if (seccion) html += `<div class="metadata-item"><span class="metadata-label">Sección Narrativa:</span><span class="metadata-value">${seccion}</span></div>`;

        html += '</div>';
        return html;
    },

    _formatContentForHtml: function (content) {
        if (!content) return "";
        // Simple escape and newline to br
        return content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\n/g, "<br>");
    },

    _getCSS: function () {
        return `
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
        h1 { font-size: 24px; font-weight: 300; margin: 0 0 30px 0; padding-bottom: 8px; border-bottom: 1px solid #e8e8e8; }
        h2 { font-size: 16px; font-weight: 500; margin: 20px 0 10px 0; position: relative; }
        h3 { font-size: 14px; font-weight: 500; margin: 15px 0 8px 0; }
        h4 { font-size: 13px; font-weight: 500; margin: 12px 0 6px 0; }
        h5 { font-size: 12px; font-weight: 500; margin: 10px 0 5px 0; color: #555; }
        h6 { font-size: 11px; font-weight: 500; margin: 8px 0 4px 0; color: #666; }
        .node { margin-bottom: 8px; padding-left: 12px; }
        .que-node { border-left: 2px solid #000; margin-bottom: 15px; }
        .clm-node { margin-left: 20px; border-left: 1px solid #d0d0d0; }
        .evd-node { margin-left: 40px; border-left: 1px solid #e0e0e0; }
        .direct-evd-node { margin-left: 20px; border-left: 1px solid #c8c8c8; background-color: #fafafa; border-radius: 3px; padding: 8px 12px; }
        .content-node, .direct-content-node { margin-left: 60px; border-left: 1px solid #f0f0f0; font-size: 12px; color: #4a4a4a; }
        .project-metadata { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 8px 12px; margin: 8px 0 12px 0; font-size: 11px; color: #6c757d; }
        .supporting-clms { margin-left: 40px; background-color: #f0f7ff; border-left: 2px solid #007acc; border-radius: 3px; padding: 8px 12px; margin-bottom: 10px; }
        .connected-clm-item, .supporting-clm-item { margin-left: 10px; border-left: 1px solid #d8d8d8; padding: 6px 8px; margin-bottom: 8px; background-color: #fff; border-radius: 2px; }
        .collapsible { cursor: pointer; position: relative; padding-right: 25px; user-select: none; }
        .collapsible::after { content: '+'; position: absolute; right: 8px; top: 0; font-size: 14px; color: #888; }
        .active::after { content: '−'; }
        .content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; padding-right: 15px; }
        .show-content { max-height: none; overflow: visible; }
        .controls { position: sticky; top: 10px; background: rgba(255,255,255,0.95); padding: 12px 0; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; z-index: 100; }
        .btn { background: #fff; border: 1px solid #e0e0e0; padding: 6px 12px; margin-right: 8px; cursor: pointer; border-radius: 4px; }
        .btn:hover { background-color: #f8f8f8; }
        .btn-copy { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
        .btn-export { background: #007acc; color: #fff; border-color: #007acc; }
        .btn-copy-individual, .btn-reorder { background: #f5f5f5; border: 1px solid #e0e0e0; padding: 2px 6px; margin-left: 8px; cursor: pointer; font-size: 10px; border-radius: 3px; }
        .btn-export-md { background: #4CAF50; color: white; border: 1px solid #4CAF50; padding: 2px 6px; margin-left: 4px; cursor: pointer; font-size: 10px; border-radius: 3px; }
        .btn-export-md:hover { background: #45a049; }
        .node-tag { font-weight: 600; font-family: monospace; font-size: 11px; }
        .error-message { color: #777; font-style: italic; background-color: #f8f8f8; padding: 8px; }
        .copy-success { position: fixed; top: 20px; right: 20px; background: #1a1a1a; color: #fff; padding: 8px 16px; border-radius: 4px; opacity: 0; transition: opacity 0.3s; }
        .copy-success.show { opacity: 1; }
    </style>`;
    },

    _getJS: function () {
        return `
    <script>
        // --- Orden persistido ---
        var ORDER_KEY = 'discourseGraph_questionOrder';
        
        function saveOrder() {
            var order = [];
            document.querySelectorAll('.que-node').forEach(function(el) {
                order.push(el.id);
            });
            localStorage.setItem(ORDER_KEY, JSON.stringify(order));
            showCopySuccess('Orden guardado');
        }
        
        function loadOrder() {
            var saved = localStorage.getItem(ORDER_KEY);
            if (!saved) return;
            try {
                var order = JSON.parse(saved);
                var container = document.querySelector('.que-node').parentNode;
                order.forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) container.appendChild(el);
                });
            } catch(e) { console.warn('Error loading order:', e); }
        }
        
        function resetOrder() {
            localStorage.removeItem(ORDER_KEY);
            location.reload();
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Cargar orden guardado
            loadOrder();
            
            var coll = document.getElementsByClassName("collapsible");
            for (var i = 0; i < coll.length; i++) {
                coll[i].addEventListener("click", function(e) {
                    if (e.target.tagName === 'BUTTON') return;
                    this.classList.toggle("active");
                    var content = this.nextElementSibling;
                    if (content.classList.contains("show-content")) {
                        content.classList.remove("show-content");
                        content.style.maxHeight = "0";
                    } else {
                        content.classList.add("show-content");
                        content.style.maxHeight = content.scrollHeight + "px";
                        setTimeout(function() { if (content.classList.contains("show-content")) content.style.maxHeight = "none"; }, 300);
                    }
                });
            }
            
            document.getElementById('expandAll').addEventListener('click', function() {
                document.querySelectorAll('.content').forEach(function(c) { c.classList.add('show-content'); c.style.maxHeight = "none"; });
                document.querySelectorAll('.collapsible').forEach(function(c) { c.classList.add('active'); });
            });
            
            document.getElementById('collapseAll').addEventListener('click', function() {
                document.querySelectorAll('.content').forEach(function(c) { c.classList.remove('show-content'); c.style.maxHeight = "0"; });
                document.querySelectorAll('.collapsible').forEach(function(c) { c.classList.remove('active'); });
            });

            document.getElementById('copyAll').addEventListener('click', function() {
                var text = document.body.innerText;
                copyToClipboard(text);
            });
            
            document.getElementById('exportMarkdown').addEventListener('click', function() {
                exportToMarkdown();
            });
        });

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(function() {
                showCopySuccess();
            }, function(err) {
                console.error('Async: Could not copy text: ', err);
            });
        }

        function showCopySuccess(msg) {
            var div = document.createElement('div');
            div.className = 'copy-success show';
            div.textContent = msg || 'Copiado!';
            document.body.appendChild(div);
            setTimeout(function() { document.body.removeChild(div); }, 2000);
        }
        
        function exportToMarkdown() {
            // Cargar datos embebidos
            var dataEl = document.getElementById('embedded-data');
            if (!dataEl) {
                alert('Error: No se encontraron datos embebidos para exportar.');
                return;
            }
            var data = JSON.parse(dataEl.textContent);
            var originalQuestions = data.questions;
            var allNodes = data.allNodes;
            var config = data.config;
            var excludeBitacora = data.excludeBitacora;
            
            // Reordenar questions según el orden actual del DOM
            var domOrder = [];
            document.querySelectorAll('.que-node').forEach(function(el) {
                // El ID es "q0", "q1", etc. - extraer el índice
                var idx = parseInt(el.id.replace('q', ''), 10);
                if (!isNaN(idx) && originalQuestions[idx]) {
                    domOrder.push(originalQuestions[idx]);
                }
            });
            // Usar el orden del DOM si está disponible, sino el original
            var questions = domOrder.length > 0 ? domOrder : originalQuestions;
            
            // --- ContentProcessor replicado ---
            function extractBlockContent(block, indentLevel, skipMetadata, visitedBlocks, maxDepth) {
                var content = '';
                if (!visitedBlocks) visitedBlocks = {};
                if (indentLevel > maxDepth) return content;
                if (!block || typeof block !== 'object') return content;
                
                var blockUid = block.uid || '';
                var blockString = block.string || '';
                
                if (blockUid && visitedBlocks[blockUid]) return content;
                if (blockUid) visitedBlocks[blockUid] = true;
                
                // Excluir bitácora
                if (excludeBitacora && blockString.toLowerCase().indexOf('[[bitácora]]') !== -1) {
                    return '';
                }
                
                var structuralMarkers = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                var isStructural = structuralMarkers.indexOf(blockString) !== -1;
                
                if (skipMetadata && (!blockString || isStructural)) {
                    // Pass
                } else {
                    if (blockString) {
                        var indent = '';
                        for (var i = 0; i < indentLevel; i++) indent += '  ';
                        content += indent + '- ' + blockString + '\\n';
                    }
                }
                
                var children = block.children || [];
                for (var i = 0; i < children.length; i++) {
                    var childContent = extractBlockContent(children[i], indentLevel + 1, skipMetadata, visitedBlocks, maxDepth);
                    if (childContent) content += childContent;
                }
                
                if (blockUid) delete visitedBlocks[blockUid];
                return content;
            }
            
            function extractNodeContent(nodeData, extractAdditionalContent, nodeType) {
                var detailedContent = '';
                if (!nodeData) return detailedContent;
                
                var children = nodeData.children || [];
                if (children.length > 0) {
                    for (var i = 0; i < children.length; i++) {
                        var child = children[i];
                        var childString = child.string || '';
                        var structuralMetadata = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                        var isStructuralMetadata = false;
                        for (var j = 0; j < structuralMetadata.length; j++) {
                            if (childString.indexOf(structuralMetadata[j]) === 0) {
                                isStructuralMetadata = true;
                                break;
                            }
                        }
                        
                        if (!isStructuralMetadata) {
                            var childContent = extractBlockContent(child, 0, false, null, 20);
                            if (childContent) detailedContent += childContent;
                        }
                    }
                }
                
                if (!detailedContent) {
                    var mainString = nodeData.string || '';
                    if (mainString) {
                        detailedContent += '- ' + mainString + '\\n';
                    } else {
                        var title = nodeData.title || '';
                        if (title) {
                            var prefix = '[[' + nodeType + ']] - ';
                            var cleanTitle = title.replace(prefix, '').trim();
                            if (cleanTitle) detailedContent += '- ' + cleanTitle + '\\n';
                        }
                    }
                }
                
                return detailedContent;
            }
            
            function cleanText(text) {
                return text.replace(/\\s+/g, ' ').trim();
            }
            
            // --- MarkdownGenerator replicado exactamente ---
            var result = '# Estructura de Investigación\\n\\n';
            
            for (var q = 0; q < questions.length; q++) {
                var question = questions[q];
                var qTitle = cleanText((question.title || '').replace('[[QUE]] - ', ''));
                result += '## [[QUE]] - ' + qTitle + '\\n\\n';
                
                // Metadata
                var metadata = question.project_metadata || {};
                if (metadata.proyecto_asociado || metadata.seccion_tesis) {
                    result += '**Información del proyecto:**\\n';
                    if (metadata.proyecto_asociado) result += '- Proyecto Asociado: ' + metadata.proyecto_asociado + '\\n';
                    if (metadata.seccion_tesis) result += '- Sección Narrativa: ' + metadata.seccion_tesis + '\\n';
                    result += '\\n';
                }
                
                // Contenido QUE
                if (config.QUE) {
                    var queContent = extractNodeContent(question.data || question, true, 'QUE');
                    if (queContent) result += queContent + '\\n';
                }
                
                var hasClms = question.related_clms && question.related_clms.length > 0;
                var hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;
                
                if (!hasClms && !hasDirectEvds) {
                    result += '*No se encontraron respuestas relacionadas con esta pregunta.*\\n\\n';
                    continue;
                }
                
                // CLMs
                if (question.related_clms) {
                    for (var c = 0; c < question.related_clms.length; c++) {
                        var clmUid = question.related_clms[c];
                        if (allNodes[clmUid]) {
                            var clm = allNodes[clmUid];
                            var clmTitle = cleanText((clm.title || '').replace('[[CLM]] - ', ''));
                            result += '### [[CLM]] - ' + clmTitle + '\\n\\n';
                            
                            var clmMetadata = clm.project_metadata || {};
                            if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                                result += '**Información del proyecto:**\\n';
                                if (clmMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\\n';
                                if (clmMetadata.seccion_tesis) result += '- Sección Narrativa: ' + clmMetadata.seccion_tesis + '\\n';
                                result += '\\n\\n';
                            }
                            
                            // Contenido CLM
                            if (config.CLM) {
                                var clmContent = extractNodeContent(clm.data, true, 'CLM');
                                if (clmContent) result += clmContent + '\\n';
                            }
                            
                            // Supporting CLMs
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                for (var s = 0; s < clm.supporting_clms.length; s++) {
                                    var suppUid = clm.supporting_clms[s];
                                    if (allNodes[suppUid]) {
                                        var suppClm = allNodes[suppUid];
                                        var suppTitle = cleanText((suppClm.title || '').replace('[[CLM]] - ', ''));
                                        result += '#### [[CLM]] - ' + suppTitle + '\\n';
                                        
                                        if (config.CLM) {
                                            var suppContent = extractNodeContent(suppClm.data, true, 'CLM');
                                            if (suppContent) result += '\\n' + suppContent + '\\n';
                                        }
                                    }
                                }
                                result += '\\n';
                            }
                            
                            // EVDs
                            if (!clm.related_evds || clm.related_evds.length === 0) {
                                if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                                    result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\\n\\n';
                                }
                            } else {
                                for (var e = 0; e < clm.related_evds.length; e++) {
                                    var evdUid = clm.related_evds[e];
                                    if (allNodes[evdUid]) {
                                        var evd = allNodes[evdUid];
                                        var evdTitle = cleanText((evd.title || '').replace('[[EVD]] - ', ''));
                                        result += '#### [[EVD]] - ' + evdTitle + '\\n\\n';
                                        
                                        var evdMetadata = evd.project_metadata || {};
                                        if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                            result += '**Información del proyecto:**\\n';
                                            if (evdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\\n';
                                            if (evdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + evdMetadata.seccion_tesis + '\\n';
                                            result += '\\n';
                                        }
                                        
                                        if (config.EVD) {
                                            var evdContent = extractNodeContent(evd.data, true, 'EVD');
                                            if (evdContent) {
                                                result += evdContent + '\\n';
                                            } else {
                                                result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Direct EVDs
                if (question.direct_evds) {
                    for (var d = 0; d < question.direct_evds.length; d++) {
                        var devdUid = question.direct_evds[d];
                        if (allNodes[devdUid]) {
                            var devd = allNodes[devdUid];
                            var devdTitle = cleanText((devd.title || '').replace('[[EVD]] - ', ''));
                            result += '### [[EVD]] - ' + devdTitle + '\\n\\n';
                            
                            var devdMetadata = devd.project_metadata || {};
                            if (devdMetadata.proyecto_asociado || devdMetadata.seccion_tesis) {
                                result += '**Información del proyecto:**\\n';
                                if (devdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\\n';
                                if (devdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + devdMetadata.seccion_tesis + '\\n';
                                result += '\\n';
                            }
                            
                            if (config.EVD) {
                                var devdContent = extractNodeContent(devd.data, true, 'EVD');
                                if (devdContent) {
                                    result += devdContent + '\\n';
                                } else {
                                    result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                                }
                            }
                        }
                    }
                }
            }
            
            // Descargar archivo con el mismo nombre que el HTML
            var fileName = (document.title || 'mapa_discurso').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\\s+/g, '_') + '.md';
            var blob = new Blob([result], {type: 'text/markdown'});
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
            showCopySuccess('Markdown exportado');
        }
        
        function copyIndividualQuestion(id) { copyToClipboard(document.getElementById(id).innerText); }
        function copyIndividualCLM(id) { copyToClipboard(document.getElementById(id).innerText); }
        
        function exportQuestionMarkdown(questionIndex) {
            var dataEl = document.getElementById('embedded-data');
            if (!dataEl) { alert('Error: No se encontraron datos embebidos.'); return; }
            var data = JSON.parse(dataEl.textContent);
            var allNodes = data.allNodes;
            var config = data.config;
            var excludeBitacora = data.excludeBitacora;
            var question = data.questions[questionIndex];
            if (!question) { alert('Error: Pregunta no encontrada.'); return; }
            
            function extractBlockContent(block, indentLevel, skipMetadata, visitedBlocks, maxDepth) {
                var content = '';
                if (!visitedBlocks) visitedBlocks = {};
                if (indentLevel > maxDepth) return content;
                if (!block || typeof block !== 'object') return content;
                var blockUid = block.uid || '';
                var blockString = block.string || '';
                if (blockUid && visitedBlocks[blockUid]) return content;
                if (blockUid) visitedBlocks[blockUid] = true;
                if (excludeBitacora && blockString.toLowerCase().indexOf('[[bitácora]]') !== -1) return '';
                var structuralMarkers = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                var isStructural = structuralMarkers.indexOf(blockString) !== -1;
                if (skipMetadata && (!blockString || isStructural)) { } else {
                    if (blockString) {
                        var indent = '';
                        for (var i = 0; i < indentLevel; i++) indent += '  ';
                        content += indent + '- ' + blockString + '\\n';
                    }
                }
                var children = block.children || [];
                for (var i = 0; i < children.length; i++) {
                    var childContent = extractBlockContent(children[i], indentLevel + 1, skipMetadata, visitedBlocks, maxDepth);
                    if (childContent) content += childContent;
                }
                if (blockUid) delete visitedBlocks[blockUid];
                return content;
            }
            function extractNodeContent(nodeData, extractAdditionalContent, nodeType) {
                var detailedContent = '';
                if (!nodeData) return detailedContent;
                var children = nodeData.children || [];
                if (children.length > 0) {
                    for (var i = 0; i < children.length; i++) {
                        var child = children[i];
                        var childString = child.string || '';
                        var structuralMetadata = ['#SupportedBy', '#RespondedBy', '#RelatedTo'];
                        var isStructuralMetadata = false;
                        for (var j = 0; j < structuralMetadata.length; j++) {
                            if (childString.indexOf(structuralMetadata[j]) === 0) { isStructuralMetadata = true; break; }
                        }
                        if (!isStructuralMetadata) {
                            var childContent = extractBlockContent(child, 0, false, null, 20);
                            if (childContent) detailedContent += childContent;
                        }
                    }
                }
                if (!detailedContent) {
                    var mainString = nodeData.string || '';
                    if (mainString) { detailedContent += '- ' + mainString + '\\n'; }
                    else {
                        var title = nodeData.title || '';
                        if (title) {
                            var prefix = '[[' + nodeType + ']] - ';
                            var cleanTitle = title.replace(prefix, '').trim();
                            if (cleanTitle) detailedContent += '- ' + cleanTitle + '\\n';
                        }
                    }
                }
                return detailedContent;
            }
            function cleanText(text) { return text.replace(/\\s+/g, ' ').trim(); }
            
            var result = '';
            var qTitle = cleanText((question.title || '').replace('[[QUE]] - ', ''));
            result += '## [[QUE]] - ' + qTitle + '\\n\\n';
            var metadata = question.project_metadata || {};
            if (metadata.proyecto_asociado || metadata.seccion_tesis) {
                result += '**Información del proyecto:**\\n';
                if (metadata.proyecto_asociado) result += '- Proyecto Asociado: ' + metadata.proyecto_asociado + '\\n';
                if (metadata.seccion_tesis) result += '- Sección Narrativa: ' + metadata.seccion_tesis + '\\n';
                result += '\\n';
            }
            if (config.QUE) {
                var queContent = extractNodeContent(question.data || question, true, 'QUE');
                if (queContent) result += queContent + '\\n';
            }
            var hasClms = question.related_clms && question.related_clms.length > 0;
            var hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;
            if (!hasClms && !hasDirectEvds) {
                result += '*No se encontraron respuestas relacionadas con esta pregunta.*\\n\\n';
            } else {
                if (question.related_clms) {
                    for (var c = 0; c < question.related_clms.length; c++) {
                        var clmUid = question.related_clms[c];
                        if (allNodes[clmUid]) {
                            var clm = allNodes[clmUid];
                            var clmTitle = cleanText((clm.title || '').replace('[[CLM]] - ', ''));
                            result += '### [[CLM]] - ' + clmTitle + '\\n\\n';
                            var clmMetadata = clm.project_metadata || {};
                            if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                                result += '**Información del proyecto:**\\n';
                                if (clmMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + clmMetadata.proyecto_asociado + '\\n';
                                if (clmMetadata.seccion_tesis) result += '- Sección Narrativa: ' + clmMetadata.seccion_tesis + '\\n';
                                result += '\\n\\n';
                            }
                            if (config.CLM) {
                                var clmContent = extractNodeContent(clm.data, true, 'CLM');
                                if (clmContent) result += clmContent + '\\n';
                            }
                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                for (var s = 0; s < clm.supporting_clms.length; s++) {
                                    var suppUid = clm.supporting_clms[s];
                                    if (allNodes[suppUid]) {
                                        var suppClm = allNodes[suppUid];
                                        var suppTitle = cleanText((suppClm.title || '').replace('[[CLM]] - ', ''));
                                        result += '#### [[CLM]] - ' + suppTitle + '\\n';
                                        if (config.CLM) {
                                            var suppContent = extractNodeContent(suppClm.data, true, 'CLM');
                                            if (suppContent) result += '\\n' + suppContent + '\\n';
                                        }
                                    }
                                }
                                result += '\\n';
                            }
                            if (!clm.related_evds || clm.related_evds.length === 0) {
                                if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                                    result += '*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM).*\\n\\n';
                                }
                            } else {
                                for (var e = 0; e < clm.related_evds.length; e++) {
                                    var evdUid = clm.related_evds[e];
                                    if (allNodes[evdUid]) {
                                        var evd = allNodes[evdUid];
                                        var evdTitle = cleanText((evd.title || '').replace('[[EVD]] - ', ''));
                                        result += '#### [[EVD]] - ' + evdTitle + '\\n\\n';
                                        var evdMetadata = evd.project_metadata || {};
                                        if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                            result += '**Información del proyecto:**\\n';
                                            if (evdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + evdMetadata.proyecto_asociado + '\\n';
                                            if (evdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + evdMetadata.seccion_tesis + '\\n';
                                            result += '\\n';
                                        }
                                        if (config.EVD) {
                                            var evdContent = extractNodeContent(evd.data, true, 'EVD');
                                            if (evdContent) result += evdContent + '\\n';
                                            else result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (question.direct_evds) {
                    for (var d = 0; d < question.direct_evds.length; d++) {
                        var devdUid = question.direct_evds[d];
                        if (allNodes[devdUid]) {
                            var devd = allNodes[devdUid];
                            var devdTitle = cleanText((devd.title || '').replace('[[EVD]] - ', ''));
                            result += '### [[EVD]] - ' + devdTitle + '\\n\\n';
                            var devdMetadata = devd.project_metadata || {};
                            if (devdMetadata.proyecto_asociado || devdMetadata.seccion_tesis) {
                                result += '**Información del proyecto:**\\n';
                                if (devdMetadata.proyecto_asociado) result += '- Proyecto Asociado: ' + devdMetadata.proyecto_asociado + '\\n';
                                if (devdMetadata.seccion_tesis) result += '- Sección Narrativa: ' + devdMetadata.seccion_tesis + '\\n';
                                result += '\\n';
                            }
                            if (config.EVD) {
                                var devdContent = extractNodeContent(devd.data, true, 'EVD');
                                if (devdContent) result += devdContent + '\\n';
                                else result += '*No se encontró contenido detallado para esta evidencia.*\\n\\n';
                            }
                        }
                    }
                }
            }
            var fileName = 'QUE_' + qTitle.substring(0, 40).replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\\s+/g, '_') + '.md';
            var blob = new Blob([result], {type: 'text/markdown'});
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
            showCopySuccess('Markdown exportado: ' + qTitle.substring(0, 20) + '...');
        }
        
        function moveQuestionUp(id) { 
            var el = document.getElementById(id);
            if (el.previousElementSibling && el.previousElementSibling.classList.contains('que-node')) {
                el.parentNode.insertBefore(el, el.previousElementSibling);
                saveOrder();
            }
        }
        function moveQuestionDown(id) {
            var el = document.getElementById(id);
            if (el.nextElementSibling && el.nextElementSibling.classList.contains('que-node')) {
                el.parentNode.insertBefore(el.nextElementSibling, el);
                saveOrder();
            }
        }
    </script>`;
    }
};


// --- MODULE: src/core/markdownGenerator.js ---
// ============================================================================
// CORE: Markdown Generator
// Ported from roamMap/core/markdown_generator.py
// ============================================================================

DiscourseGraphToolkit.MarkdownGenerator = {
    generateMarkdown: function (questions, allNodes, contentConfig = true, excludeBitacora = true) {
        // Compatibilidad hacia atrás: si contentConfig es booleano (bool legacy), lo convertimos a objeto
        let config = contentConfig;
        if (typeof contentConfig === 'boolean') {
            config = { QUE: contentConfig, CLM: contentConfig, EVD: contentConfig };
        }

        let result = "# Estructura de Investigación\n\n";

        for (const question of questions) {
            try {
                const qTitle = DiscourseGraphToolkit.cleanText(question.title.replace("[[QUE]] - ", ""));
                result += `## [[QUE]] - ${qTitle}\n\n`;

                // Metadata
                const metadata = question.project_metadata || {};
                if (metadata.proyecto_asociado || metadata.seccion_tesis) {
                    result += "**Información del proyecto:**\n";
                    if (metadata.proyecto_asociado) result += `- Proyecto Asociado: ${metadata.proyecto_asociado}\n`;
                    if (metadata.seccion_tesis) result += `- Sección Narrativa: ${metadata.seccion_tesis}\n`;
                    result += "\n";
                }

                // --- Contenido de la Pregunta ---
                // Se extrae si QUE está habilitado
                const queContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(question, config.QUE, "QUE", excludeBitacora);
                if (queContent) {
                    result += queContent + "\n";
                }
                // --------------------------------

                const hasClms = question.related_clms && question.related_clms.length > 0;
                const hasDirectEvds = question.direct_evds && question.direct_evds.length > 0;

                if (!hasClms && !hasDirectEvds) {
                    result += `*No se encontraron respuestas relacionadas con esta pregunta.*\n\n`;
                    continue;
                }

                // CLMs
                if (question.related_clms) {
                    for (const clmUid of question.related_clms) {
                        if (allNodes[clmUid]) {
                            const clm = allNodes[clmUid];
                            const clmTitle = DiscourseGraphToolkit.cleanText(clm.title.replace("[[CLM]] - ", ""));
                            result += `### [[CLM]] - ${clmTitle}\n\n`;

                            const clmMetadata = clm.project_metadata || {};
                            if (clmMetadata.proyecto_asociado || clmMetadata.seccion_tesis) {
                                result += "**Información del proyecto:**\n";
                                if (clmMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${clmMetadata.proyecto_asociado}\n`;
                                if (clmMetadata.seccion_tesis) result += `- Sección Narrativa: ${clmMetadata.seccion_tesis}\n`;
                                result += "\n";
                                result += "\n";
                            }

                            // --- NUEVO: Contenido del CLM ---
                            // Se extrae si CLM está habilitado
                            const clmContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(clm.data, config.CLM, "CLM", excludeBitacora);
                            if (clmContent) {
                                result += clmContent + "\n";
                            }
                            // --------------------------------

                            if (clm.supporting_clms && clm.supporting_clms.length > 0) {
                                for (const suppUid of clm.supporting_clms) {
                                    if (allNodes[suppUid]) {
                                        const suppClm = allNodes[suppUid];
                                        const suppTitle = DiscourseGraphToolkit.cleanText(suppClm.title.replace("[[CLM]] - ", ""));
                                        result += `#### [[CLM]] - ${suppTitle}\n`;

                                        // --- NUEVO: Contenido del CLM de Soporte ---
                                        const suppContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(suppClm.data, config.CLM, "CLM", excludeBitacora);
                                        if (suppContent) {
                                            result += "\n" + suppContent + "\n";
                                        }
                                        // -------------------------------------------
                                    }
                                }
                                result += "\n";
                            }

                            // EVDs
                            if (!clm.related_evds || clm.related_evds.length === 0) {
                                if (!clm.supporting_clms || clm.supporting_clms.length === 0) {
                                    result += `*No se encontraron evidencias (EVD) o afirmaciones relacionadas (CLM) con esta afirmación.*\n\n`;
                                }
                            } else {
                                for (const evdUid of clm.related_evds) {
                                    if (allNodes[evdUid]) {
                                        const evd = allNodes[evdUid];
                                        const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                                        result += `#### [[EVD]] - ${evdTitle}\n\n`;

                                        const evdMetadata = evd.project_metadata || {};
                                        if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                            result += "**Información del proyecto:**\n";
                                            if (evdMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n`;
                                            if (evdMetadata.seccion_tesis) result += `- Sección Narrativa: ${evdMetadata.seccion_tesis}\n`;
                                            result += "\n";
                                        }

                                        const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
                                        if (detailedContent) {
                                            result += detailedContent + "\n";
                                        } else {
                                            result += "*No se encontró contenido detallado para esta evidencia.*\n\n";
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Direct EVDs
                if (question.direct_evds) {
                    for (const evdUid of question.direct_evds) {
                        if (allNodes[evdUid]) {
                            const evd = allNodes[evdUid];
                            const evdTitle = DiscourseGraphToolkit.cleanText(evd.title.replace("[[EVD]] - ", ""));
                            result += `### [[EVD]] - ${evdTitle}\n\n`;

                            const evdMetadata = evd.project_metadata || {};
                            if (evdMetadata.proyecto_asociado || evdMetadata.seccion_tesis) {
                                result += "**Información del proyecto:**\n";
                                if (evdMetadata.proyecto_asociado) result += `- Proyecto Asociado: ${evdMetadata.proyecto_asociado}\n`;
                                if (evdMetadata.seccion_tesis) result += `- Sección Narrativa: ${evdMetadata.seccion_tesis}\n`;
                                result += "\n";
                            }

                            const detailedContent = DiscourseGraphToolkit.ContentProcessor.extractNodeContent(evd.data, config.EVD, "EVD", excludeBitacora);
                            if (detailedContent) {
                                result += detailedContent + "\n";
                            } else {
                                result += "*No se encontró contenido detallado para esta evidencia.*\n\n";
                            }
                        }
                    }
                }

            } catch (e) {
                result += `*Error procesando pregunta: ${e}*\n\n`;
            }
        }

        return result;
    }
};


// --- MODULE: src/ui/modal.js ---
// ============================================================================
// 5. INTERFAZ DE USUARIO (REACT)
// ============================================================================

DiscourseGraphToolkit.ToolkitModal = function ({ onClose }) {
    const React = window.React;
    const [activeTab, setActiveTab] = React.useState('general');
    const [config, setConfig] = React.useState(DiscourseGraphToolkit.getConfig());
    const [templates, setTemplates] = React.useState(DiscourseGraphToolkit.getTemplates());
    const [projects, setProjects] = React.useState([]);
    const [newProject, setNewProject] = React.useState('');

    // Estados de Exportación
    const [selectedProjects, setSelectedProjects] = React.useState({});
    const [selectedTypes, setSelectedTypes] = React.useState({ QUE: false, CLM: false, EVD: false });
    const [includeReferenced, setIncludeReferenced] = React.useState(false);
    // Configuración granular inicial (todo true por defecto o ajustar según preferencia)
    const [contentConfig, setContentConfig] = React.useState({ QUE: true, CLM: true, EVD: true });
    const [excludeBitacora, setExcludeBitacora] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState('');
    const [previewPages, setPreviewPages] = React.useState([]);
    const [validation, setValidation] = React.useState({});
    const [suggestions, setSuggestions] = React.useState([]);
    const [isScanning, setIsScanning] = React.useState(false);
    const [selectedProjectsForDelete, setSelectedProjectsForDelete] = React.useState({});

    // Estados para la pestaña Verificar
    const [availableQuestions, setAvailableQuestions] = React.useState([]);
    const [selectedQuestion, setSelectedQuestion] = React.useState(null);
    const [verificationResult, setVerificationResult] = React.useState(null);
    const [structureResult, setStructureResult] = React.useState(null);
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [verifyStatus, setVerifyStatus] = React.useState('');
    // Estados para coherencia de proyectos
    const [coherenceResult, setCoherenceResult] = React.useState(null);
    const [isPropagating, setIsPropagating] = React.useState(false);

    // Init
    React.useEffect(() => {
        const loadData = async () => {
            // Asegurar que tenemos lo último de Roam al abrir
            await DiscourseGraphToolkit.initializeProjectsSync();

            setConfig(DiscourseGraphToolkit.getConfig());
            setTemplates(DiscourseGraphToolkit.getTemplates());
            setProjects(DiscourseGraphToolkit.getProjects());

            // Cargar validación inicial
            const projs = DiscourseGraphToolkit.getProjects();
            if (projs.length > 0) {
                const val = await DiscourseGraphToolkit.validateProjectsInGraph(projs);
                setValidation(val);
            }
        };
        loadData();
    }, []);

    // --- Handlers Config ---
    const handleSaveConfig = async () => {
        try {
            DiscourseGraphToolkit.saveConfig(config);
            DiscourseGraphToolkit.saveTemplates(templates);
            DiscourseGraphToolkit.saveProjects(projects);

            const syncResult = await DiscourseGraphToolkit.syncProjectsToRoam(projects);
            const saveResult = await DiscourseGraphToolkit.saveConfigToRoam(config, templates);

            if (syncResult && syncResult.success !== false && saveResult) {
                DiscourseGraphToolkit.showToast('Configuración guardada y sincronizada en Roam.', 'success');
            } else {
                console.warn("Sync result:", syncResult, "Save result:", saveResult);
                DiscourseGraphToolkit.showToast('Guardado localmente, pero hubo advertencias al sincronizar con Roam.', 'warning');
            }
        } catch (e) {
            console.error("Error saving config:", e);
            DiscourseGraphToolkit.showToast('Error al guardar configuración: ' + e.message, 'error');
        }
    };

    const handleExportConfig = () => {
        DiscourseGraphToolkit.exportConfig();
        DiscourseGraphToolkit.showToast('Configuración exportada.', 'success');
    };

    const handleImportConfig = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (DiscourseGraphToolkit.importConfig(event.target.result)) {
                        setConfig(DiscourseGraphToolkit.getConfig());
                        setTemplates(DiscourseGraphToolkit.getTemplates());
                        setProjects(DiscourseGraphToolkit.getProjects());
                        DiscourseGraphToolkit.showToast('Configuración importada correctamente.', 'success');
                    } else {
                        DiscourseGraphToolkit.showToast('Error al importar configuración.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    // --- Handlers Proyectos ---
    const handleAddProject = async () => {
        if (newProject && !projects.includes(newProject)) {
            const updated = [...projects, newProject].sort();
            setProjects(updated);
            setNewProject('');
            DiscourseGraphToolkit.saveProjects(updated);
            await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        }
    };

    const handleRemoveProject = async (p) => {
        // Sin confirmación, borrado directo
        const updated = projects.filter(x => x !== p);
        setProjects(updated);
        DiscourseGraphToolkit.saveProjects(updated);
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const handleBulkDeleteProjects = async () => {
        const toDelete = Object.keys(selectedProjectsForDelete).filter(k => selectedProjectsForDelete[k]);
        if (toDelete.length === 0) return;

        const updated = projects.filter(p => !selectedProjectsForDelete[p]);
        setProjects(updated);
        setSelectedProjectsForDelete({}); // Reset selection
        DiscourseGraphToolkit.saveProjects(updated);
        await DiscourseGraphToolkit.syncProjectsToRoam(updated);
    };

    const toggleSelectAllProjects = () => {
        const allSelected = projects.every(p => selectedProjectsForDelete[p]);
        const newSelection = {};
        projects.forEach(p => newSelection[p] = !allSelected);
        setSelectedProjectsForDelete(newSelection);
    };

    const handleValidate = async () => {
        setExportStatus("Validando proyectos...");
        const val = await DiscourseGraphToolkit.validateProjectsInGraph(projects);
        setValidation(val);
        setExportStatus("Validación completada.");
    };

    const handleScanProjects = async () => {
        setIsScanning(true);
        try {
            const found = await DiscourseGraphToolkit.discoverProjectsInGraph();
            const newSuggestions = found.filter(p => !projects.includes(p));
            setSuggestions(newSuggestions);
            if (newSuggestions.length === 0) {
                DiscourseGraphToolkit.showToast("No se encontraron nuevos proyectos.", "info");
            } else {
                DiscourseGraphToolkit.showToast(`Se encontraron ${newSuggestions.length} proyectos nuevos.`, "success");
            }
        } catch (e) {
            console.error(e);
            DiscourseGraphToolkit.showToast("Error al buscar proyectos.", "error");
        } finally {
            setIsScanning(false);
        }
    };

    const handleForceSync = async () => {
        setExportStatus("Sincronizando...");
        try {
            await DiscourseGraphToolkit.initializeProjectsSync();
            setProjects(DiscourseGraphToolkit.getProjects());
            DiscourseGraphToolkit.showToast("Sincronización completada.", "success");
        } catch (e) {
            DiscourseGraphToolkit.showToast("Error en sincronización.", "error");
        } finally {
            setExportStatus("");
        }
    };

    const handleAddSuggestion = async (proj) => {
        if (!projects.includes(proj)) {
            const updated = [...projects, proj].sort();
            setProjects(updated);
            setSuggestions(suggestions.filter(s => s !== proj));
            DiscourseGraphToolkit.saveProjects(updated);
            await DiscourseGraphToolkit.syncProjectsToRoam(updated);
        }
    };

    // --- Handlers Exportación ---
    const handlePreview = async () => {
        try {
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const tTypes = Object.keys(selectedTypes).filter(k => selectedTypes[k]);

            if (pNames.length === 0 || tTypes.length === 0) {
                alert("Selecciona proyecto y tipo.");
                return;
            }

            setExportStatus("Buscando páginas...");
            let allPages = [];
            for (let p of pNames) {
                const pages = await DiscourseGraphToolkit.queryDiscoursePages(p, tTypes);
                allPages = allPages.concat(pages);
            }

            // Deduplicar
            let uniquePages = Array.from(new Map(allPages.map(item => [item.pageUid, item])).values());

            if (includeReferenced) {
                setExportStatus("Buscando referencias...");
                const referenced = await DiscourseGraphToolkit.findReferencedDiscoursePages(uniquePages.map(p => p.pageUid), tTypes);
                uniquePages = Array.from(new Map([...uniquePages, ...referenced].map(item => [item.pageUid, item])).values());
            }

            setPreviewPages(uniquePages);
            setExportStatus(`Encontradas ${uniquePages.length} páginas.`);
            return uniquePages;
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
            return [];
        }
    };

    const handleExport = async () => {
        let pagesToExport = previewPages;
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const filename = `roam_export_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.json`;
            const anyContent = Object.values(contentConfig).some(x => x);

            // Nota: Para JSON nativo, la granularidad no se aplica tanto en la transformación, 
            // ya que exportPagesNative devuelve la estructura cruda de Roam.
            // Si includeContent es true, descarga el árbol. El filtrado fino ocurre en los generadores (MD/HTML).
            // Aquí pasamos anyContent para decidir si traemos children o no.
            await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), anyContent);

            setExportStatus(`✅ Exportación completada: ${pagesToExport.length} páginas.`);
            // History Removed
            // DiscourseGraphToolkit.addToExportHistory({...});
            // setHistory(DiscourseGraphToolkit.getExportHistory());
        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportHtml = async () => {
        let pagesToExport = previewPages;
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const filename = `roam_map_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.html`;

            setExportStatus("Obteniendo datos...");
            const anyContent = Object.values(contentConfig).some(x => x);
            // Obtener datos sin descargar JSON
            const result = await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), anyContent, false);

            setExportStatus("Procesando relaciones...");
            // Convertir array a mapa por UID para el mapper y NORMALIZAR
            const allNodes = {};
            result.data.forEach(node => {
                if (node.uid) {
                    // Normalización crítica para RelationshipMapper y ContentProcessor
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node; // El nodo mismo contiene los hijos
                    allNodes[node.uid] = node;
                }
            });

            // --- NUEVO: Buscar y cargar dependencias faltantes (CLMs/EVDs referenciados) ---
            setExportStatus("Analizando dependencias...");
            const dependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
            const missingUids = [...dependencies].filter(uid => !allNodes[uid]);

            if (missingUids.length > 0) {
                setExportStatus(`Cargando ${missingUids.length} nodos relacionados...`);
                // Fetch missing nodes
                const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, anyContent, false);
                extraData.data.forEach(node => {
                    if (node.uid) {
                        node.type = DiscourseGraphToolkit.getNodeType(node.title);
                        node.data = node;
                        allNodes[node.uid] = node;
                    }
                });
            }
            // -------------------------------------------------------------------------------

            // Mapear relaciones
            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            // Filtrar preguntas para el reporte
            const questions = result.data.filter(node => {
                const type = DiscourseGraphToolkit.getNodeType(node.title);
                return type === 'QUE';
            });

            setExportStatus("Generando HTML...");
            const htmlContent = DiscourseGraphToolkit.HtmlGenerator.generateHtml(questions, allNodes, `Mapa de Discurso: ${pNames.join(', ')}`, contentConfig, excludeBitacora);

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename, htmlContent, 'text/html');

            setExportStatus(`✅ Exportación HTML completada.`);
            // History Removed

        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportMarkdown = async () => {
        let pagesToExport = previewPages;
        if (pagesToExport.length === 0) {
            pagesToExport = await handlePreview();
            if (!pagesToExport || pagesToExport.length === 0) return;
        }

        setIsExporting(true);
        try {
            const uids = pagesToExport.map(p => p.pageUid);
            const pNames = Object.keys(selectedProjects).filter(k => selectedProjects[k]);
            const filename = `roam_map_${DiscourseGraphToolkit.sanitizeFilename(pNames.join('_'))}.md`;

            setExportStatus("Obteniendo datos...");
            const anyContent = Object.values(contentConfig).some(x => x);
            const result = await DiscourseGraphToolkit.exportPagesNative(uids, filename, (msg) => setExportStatus(msg), anyContent, false);

            setExportStatus("Procesando relaciones...");
            const allNodes = {};
            result.data.forEach(node => {
                if (node.uid) {
                    node.type = DiscourseGraphToolkit.getNodeType(node.title);
                    node.data = node;
                    allNodes[node.uid] = node;
                }
            });

            // --- NUEVO: Buscar y cargar dependencias faltantes ---
            setExportStatus("Analizando dependencias...");
            const dependencies = DiscourseGraphToolkit.RelationshipMapper.collectDependencies(Object.values(allNodes));
            const missingUids = [...dependencies].filter(uid => !allNodes[uid]);

            if (missingUids.length > 0) {
                setExportStatus(`Cargando ${missingUids.length} nodos relacionados...`);
                const extraData = await DiscourseGraphToolkit.exportPagesNative(missingUids, null, null, anyContent, false);
                extraData.data.forEach(node => {
                    if (node.uid) {
                        node.type = DiscourseGraphToolkit.getNodeType(node.title);
                        node.data = node;
                        allNodes[node.uid] = node;
                    }
                });
            }
            // -------------------------------------------------------------------------------

            DiscourseGraphToolkit.RelationshipMapper.mapRelationships(allNodes);

            const questions = result.data.filter(node => {
                const type = DiscourseGraphToolkit.getNodeType(node.title);
                return type === 'QUE';
            });

            setExportStatus("Generando Markdown...");
            const mdContent = DiscourseGraphToolkit.MarkdownGenerator.generateMarkdown(questions, allNodes, contentConfig, excludeBitacora);

            setExportStatus("Descargando...");
            DiscourseGraphToolkit.downloadFile(filename, mdContent, 'text/markdown');

            setExportStatus(`✅ Exportación Markdown completada.`);
            // History Removed

        } catch (e) {
            console.error(e);
            setExportStatus("❌ Error: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    // --- Handlers Verificación ---
    const handleLoadQuestions = async () => {
        setVerifyStatus("Cargando preguntas...");
        try {
            const questions = await DiscourseGraphToolkit.getAllQuestions();
            setAvailableQuestions(questions);
            setVerifyStatus(`${questions.length} preguntas encontradas.`);
        } catch (e) {
            console.error(e);
            setVerifyStatus("❌ Error al cargar preguntas: " + e.message);
        }
    };

    const handleVerifyBranch = async () => {
        if (!selectedQuestion) {
            setVerifyStatus("Selecciona una pregunta primero.");
            return;
        }

        setIsVerifying(true);
        setVerificationResult(null);
        setStructureResult(null);
        setCoherenceResult(null);
        setVerifyStatus("Analizando rama...");

        try {
            // 0. Verificar estructura del QUE primero
            setVerifyStatus("Verificando estructura...");
            const structResult = await DiscourseGraphToolkit.verifyBranchStructure(selectedQuestion.pageUid);
            setStructureResult(structResult);

            // 1. Obtener todos los nodos de la rama
            setVerifyStatus("Obteniendo nodos de la rama...");
            const branchNodes = await DiscourseGraphToolkit.getBranchNodes(selectedQuestion.pageUid);

            if (branchNodes.length === 0) {
                if (structResult.structureIssues.length > 0) {
                    setVerifyStatus("⚠️ Problemas de estructura detectados (ver abajo).");
                } else {
                    setVerifyStatus("No se encontraron nodos en esta rama.");
                }
                setVerificationResult({ withProject: [], withoutProject: [], nodes: {} });
                return;
            }

            // 2. Verificar coherencia de proyectos (NUEVO)
            setVerifyStatus(`Verificando coherencia en ${branchNodes.length} nodos...`);
            const cohResult = await DiscourseGraphToolkit.verifyProjectCoherence(selectedQuestion.pageUid, branchNodes);
            setCoherenceResult(cohResult);

            // 3. Crear mapa de nodos para mostrar información (legacy compatibility)
            const nodesMap = {};
            branchNodes.forEach(n => { nodesMap[n.uid] = n; });

            // Mantener compatibilidad con la estructura anterior
            setVerificationResult({
                withProject: [...cohResult.coherent.map(n => n.uid), ...cohResult.different.map(n => n.uid)],
                withoutProject: cohResult.missing.map(n => n.uid),
                nodes: nodesMap
            });

            // 4. Generar mensaje de estado final
            let statusParts = [];
            if (structResult.structureIssues.length > 0) {
                statusParts.push(`🔧 ${structResult.structureIssues.length} problema(s) de estructura`);
            }
            if (cohResult.different.length > 0) {
                statusParts.push(`⚠️ ${cohResult.different.length} nodo(s) con proyecto diferente`);
            }
            if (cohResult.missing.length > 0) {
                statusParts.push(`❌ ${cohResult.missing.length} nodo(s) sin proyecto`);
            }

            if (statusParts.length === 0) {
                setVerifyStatus(`✅ Todos los ${branchNodes.length} nodos son coherentes con el proyecto de la rama.`);
            } else {
                setVerifyStatus(statusParts.join(' | '));
            }

        } catch (e) {
            console.error(e);
            setVerifyStatus("❌ Error: " + e.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePropagateProject = async () => {
        if (!selectedQuestion || !coherenceResult || !coherenceResult.rootProject) {
            setVerifyStatus("❌ No hay proyecto de rama para propagar.");
            return;
        }

        const nodesToUpdate = [...coherenceResult.different, ...coherenceResult.missing];
        if (nodesToUpdate.length === 0) {
            setVerifyStatus("✅ No hay nodos que actualizar.");
            return;
        }

        setIsPropagating(true);
        setVerifyStatus(`⏳ Propagando proyecto a ${nodesToUpdate.length} nodos...`);

        try {
            const result = await DiscourseGraphToolkit.propagateProjectToBranch(
                selectedQuestion.pageUid,
                coherenceResult.rootProject,
                nodesToUpdate
            );

            if (result.success) {
                setVerifyStatus(`✅ Propagación completada: ${result.updated} actualizados, ${result.created} creados.`);
                // Re-verificar automáticamente
                setTimeout(() => handleVerifyBranch(), 500);
            } else {
                setVerifyStatus(`⚠️ Propagación con errores: ${result.errors.length} error(es).`);
            }
        } catch (e) {
            console.error(e);
            setVerifyStatus("❌ Error: " + e.message);
        } finally {
            setIsPropagating(false);
        }
    };

    const handleFixStructure = async (uid) => {
        setVerifyStatus("Corrigiendo estructura...");
        try {
            const result = await DiscourseGraphToolkit.fixQueStructure(uid);
            if (result.success && result.fixed > 0) {
                setVerifyStatus(`✅ Estructura corregida: ${result.fixed} bloque(s) actualizado(s). Verificando de nuevo...`);
                // Re-verificar después de corregir
                setTimeout(() => handleVerifyBranch(), 500);
            } else if (result.success && result.fixed === 0) {
                setVerifyStatus("No se encontraron bloques para corregir.");
            } else {
                setVerifyStatus("❌ Error al corregir estructura.");
            }
        } catch (e) {
            console.error(e);
            setVerifyStatus("❌ Error: " + e.message);
        }
    };

    const handleNavigateToPage = (uid) => {
        try {
            window.roamAlphaAPI.ui.mainWindow.openPage({ page: { uid: uid } });
        } catch (e) {
            console.error("Error navigating to page:", e);
            // Fallback: abrir en nueva pestaña
            window.open(`https://roamresearch.com/#/app/${DiscourseGraphToolkit.getGraphName()}/page/${uid}`, '_blank');
        }
    };

    // Cargar preguntas al entrar a la pestaña verificar
    React.useEffect(() => {
        if (activeTab === 'verificar' && availableQuestions.length === 0) {
            handleLoadQuestions();
        }
    }, [activeTab]);

    // --- Render Helpers ---
    const tabStyle = (id) => ({
        padding: '10px 20px', cursor: 'pointer', borderBottom: activeTab === id ? '2px solid #2196F3' : 'none',
        fontWeight: activeTab === id ? 'bold' : 'normal', color: activeTab === id ? '#2196F3' : '#666'
    });

    return React.createElement('div', {
        style: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }
    },
        React.createElement('div', {
            style: {
                backgroundColor: 'white', width: '90%', maxWidth: '1100px', height: '85vh', borderRadius: '8px',
                display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                fontSize: '14px'
            }
        },
            // Header
            React.createElement('div', { style: { padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' } },
                React.createElement('h2', { style: { margin: 0 } }, `Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION}`),
                React.createElement('button', { onClick: onClose, style: { border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' } }, '✕')
            ),
            // Tabs
            React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #eee' } },
                ['general', 'proyectos', 'exportar', 'importar', 'verificar'].map(t =>
                    React.createElement('div', { key: t, onClick: () => setActiveTab(t), style: tabStyle(t) }, t.charAt(0).toUpperCase() + t.slice(1))
                )
            ),
            // Content
            React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '20px 20px 50px 20px', minHeight: 0 } },
                activeTab === 'general' && React.createElement('div', null,
                    React.createElement('h3', null, 'Configuración General'),
                    React.createElement('label', { style: { display: 'block', marginBottom: '10px' } },
                        'Nombre del Campo de Proyecto:',
                        React.createElement('input', {
                            type: 'text', value: config.projectFieldName,
                            onChange: e => setConfig({ ...config, projectFieldName: e.target.value }),
                            style: { display: 'block', width: '100%', padding: '8px', marginTop: '5px' }
                        })
                    ),
                    React.createElement('label', { style: { display: 'block', marginBottom: '10px' } },
                        'Proyecto por Defecto:',
                        React.createElement('select', {
                            value: config.defaultProject,
                            onChange: e => setConfig({ ...config, defaultProject: e.target.value }),
                            style: { display: 'block', width: '100%', padding: '8px', marginTop: '5px' }
                        },
                            React.createElement('option', { value: "" }, "-- Seleccionar --"),
                            projects.map(p => React.createElement('option', { key: p, value: p }, p))
                        )
                    ),
                    React.createElement('button', { onClick: handleSaveConfig, style: { padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', marginTop: '20px' } }, 'Guardar Todo'),

                    React.createElement('div', { style: { marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' } },
                        React.createElement('h4', null, 'Backup & Restore'),
                        React.createElement('div', { style: { display: 'flex', gap: '10px' } },
                            React.createElement('button', { onClick: handleExportConfig, style: { padding: '8px 16px', border: '1px solid #2196F3', color: '#2196F3', background: 'white', borderRadius: '4px' } }, '↓ Exportar Config'),
                            React.createElement('button', { onClick: handleImportConfig, style: { padding: '8px 16px', border: '1px solid #2196F3', color: '#2196F3', background: 'white', borderRadius: '4px' } }, '↑ Importar Config')
                        )
                    ),

                    React.createElement('div', { style: { marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' } },
                        React.createElement('h4', null, 'Atajos de Teclado'),
                        React.createElement('ul', { style: { listStyle: 'none', padding: 0 } },
                            React.createElement('li', { style: { marginBottom: '5px' } }, React.createElement('strong', null, 'Ctrl + Shift + Q'), ': Crear Pregunta (QUE)'),
                            React.createElement('li', { style: { marginBottom: '5px' } }, React.createElement('strong', null, 'Ctrl + Shift + C'), ': Crear Afirmación (CLM)'),
                            React.createElement('li', { style: { marginBottom: '5px' } }, React.createElement('strong', null, 'Ctrl + Shift + E'), ': Crear Evidencia (EVD)')
                        )
                    )
                ),

                // Removed 'nodos' block
                // Removed 'relaciones' block

                activeTab === 'proyectos' && React.createElement('div', null,
                    React.createElement('h3', null, 'Gestión de Proyectos'),
                    React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } },
                        React.createElement('input', {
                            type: 'text', placeholder: 'Nuevo proyecto...',
                            value: newProject, onChange: e => setNewProject(e.target.value),
                            style: { flex: 1, padding: '8px' }
                        }),
                        React.createElement('button', { onClick: handleAddProject, style: { padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' } }, 'Agregar')
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '10px' } },
                        React.createElement('button', { onClick: handleValidate, style: { padding: '5px 10px', cursor: 'pointer' } }, "Validar Existencia"),
                        React.createElement('button', { onClick: handleScanProjects, style: { padding: '5px 10px', cursor: 'pointer', backgroundColor: '#fff3e0', border: '1px solid #ff9800', color: '#e65100' } }, isScanning ? "Buscando..." : "🔍 Buscar Sugerencias"),
                        React.createElement('button', { onClick: handleForceSync, style: { padding: '5px 10px', cursor: 'pointer', marginLeft: 'auto' } }, "🔄 Sincronizar")
                    ),

                    suggestions.length > 0 && React.createElement('div', { style: { marginBottom: '20px', padding: '10px', border: '1px solid #ff9800', backgroundColor: '#fff3e0', borderRadius: '4px' } },
                        React.createElement('strong', { style: { display: 'block', marginBottom: '5px', color: '#e65100' } }, `Sugerencias encontradas (${suggestions.length}):`),
                        React.createElement('div', { style: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', backgroundColor: 'white' } },
                            suggestions.map(s =>
                                React.createElement('div', { key: s, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' } },
                                    React.createElement('span', null, s),
                                    React.createElement('button', { onClick: () => handleAddSuggestion(s), style: { fontSize: '12px', padding: '4px 8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' } }, '+ Añadir')
                                )
                            )
                        )
                    ),

                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' } },
                        React.createElement('label', null,
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: projects.length > 0 && projects.every(p => selectedProjectsForDelete[p]),
                                onChange: toggleSelectAllProjects,
                                style: { marginRight: '5px' }
                            }),
                            'Seleccionar Todo'
                        ),
                        React.createElement('button', {
                            onClick: handleBulkDeleteProjects,
                            disabled: !Object.values(selectedProjectsForDelete).some(v => v),
                            style: {
                                padding: '5px 10px',
                                backgroundColor: Object.values(selectedProjectsForDelete).some(v => v) ? '#f44336' : '#ccc',
                                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                            }
                        }, 'Eliminar Seleccionados')
                    ),

                    React.createElement('ul', { style: { listStyle: 'none', padding: 0, maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee' } },
                        projects.map(p =>
                            React.createElement('li', { key: p, style: { padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                React.createElement('label', { style: { display: 'flex', alignItems: 'center', flex: 1 } },
                                    React.createElement('input', {
                                        type: 'checkbox',
                                        checked: !!selectedProjectsForDelete[p],
                                        onChange: (e) => setSelectedProjectsForDelete({ ...selectedProjectsForDelete, [p]: e.target.checked }),
                                        style: { marginRight: '10px' }
                                    }),
                                    React.createElement('span', null,
                                        p,
                                        validation[p] !== undefined ? (validation[p] ? " ✅" : " ⚠️ (No encontrado)") : ""
                                    )
                                ),
                                React.createElement('button', { onClick: () => handleRemoveProject(p), style: { color: 'red', border: 'none', background: 'none', cursor: 'pointer' } }, 'X')
                            )
                        )
                    )
                ),

                activeTab === 'exportar' && React.createElement('div', null,
                    React.createElement('h3', { style: { marginTop: 0, marginBottom: '20px' } }, 'Exportar Grafos'),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' } },
                        React.createElement('div', { style: { flex: 1 } },
                            React.createElement('h4', { style: { marginTop: 0 } }, '1. Proyectos'),
                            React.createElement('div', { style: { height: '280px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' } },
                                projects.length === 0 ? 'No hay proyectos.' : projects.map(p =>
                                    React.createElement('div', { key: p },
                                        React.createElement('label', null,
                                            React.createElement('input', {
                                                type: 'checkbox',
                                                checked: selectedProjects[p] || false,
                                                onChange: e => setSelectedProjects({ ...selectedProjects, [p]: e.target.checked })
                                            }),
                                            ' ' + p
                                        )
                                    )
                                )
                            )
                        ),
                        React.createElement('div', { style: { flex: 1 } },
                            React.createElement('h4', { style: { marginTop: 0 } }, '2. Tipos'),
                            ['QUE', 'CLM', 'EVD'].map(t =>
                                React.createElement('div', { key: t },
                                    React.createElement('label', null,
                                        React.createElement('input', {
                                            type: 'checkbox',
                                            checked: selectedTypes[t],
                                            onChange: e => setSelectedTypes({ ...selectedTypes, [t]: e.target.checked })
                                        }),
                                        ` ${t}`
                                    )
                                )
                            ),

                            React.createElement('div', { style: { marginTop: '10px' } },
                                React.createElement('label', null,
                                    React.createElement('input', {
                                        type: 'checkbox',
                                        checked: includeReferenced,
                                        onChange: e => setIncludeReferenced(e.target.checked)
                                    }),
                                    ' Incluir nodos referenciados'
                                )
                            ),
                            React.createElement('div', { style: { marginTop: '10px' } },
                                React.createElement('strong', { style: { display: 'block', marginBottom: '5px', fontSize: '12px' } }, 'Extraer Todo el Contenido:'),
                                ['QUE', 'CLM', 'EVD'].map(type =>
                                    React.createElement('div', { key: type, style: { marginLeft: '10px' } },
                                        React.createElement('label', null,
                                            React.createElement('input', {
                                                type: 'checkbox',
                                                checked: contentConfig[type],
                                                onChange: e => setContentConfig({ ...contentConfig, [type]: e.target.checked })
                                            }),
                                            ` ${DiscourseGraphToolkit.TYPES[type].label} (${type})`
                                        )
                                    )
                                ),
                                React.createElement('div', { style: { marginTop: '10px' } },
                                    React.createElement('label', null,
                                        React.createElement('input', {
                                            type: 'checkbox',
                                            checked: excludeBitacora,
                                            onChange: e => setExcludeBitacora(e.target.checked)
                                        }),
                                        ' Excluir contenido de [[bitácora]]'
                                    )
                                )
                            )
                        )
                    ),
                    React.createElement('div', { style: { marginTop: '20px' } },
                        React.createElement('button', { onClick: handlePreview, style: { marginRight: '10px', padding: '10px' } }, "Vista Previa"),
                        React.createElement('button', {
                            onClick: handleExport,
                            disabled: isExporting,
                            style: { padding: '10px 20px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' }
                        }, 'Exportar JSON'),
                        React.createElement('button', {
                            onClick: handleExportHtml,
                            disabled: isExporting,
                            style: { padding: '10px 20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }
                        }, 'Exportar HTML'),
                        React.createElement('button', {
                            onClick: handleExportMarkdown,
                            disabled: isExporting,
                            style: { padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }
                        }, 'Exportar Markdown')
                    ),
                    exportStatus && React.createElement('div', { style: { marginTop: '10px', fontWeight: 'bold' } }, exportStatus),
                    previewPages.length > 0 && React.createElement('div', { style: { marginTop: '15px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' } },
                        React.createElement('h4', null, `Vista Previa (${previewPages.length})`),
                        React.createElement('ul', { style: { paddingLeft: '20px' } },
                            previewPages.map(p => React.createElement('li', { key: p.pageUid }, p.pageTitle))
                        )
                    )
                ),

                activeTab === 'importar' && React.createElement('div', null,
                    React.createElement('h3', null, 'Importar Grafos'),
                    React.createElement('p', { style: { color: '#666' } }, 'Restaura copias de seguridad o importa grafos de otros usuarios. Los elementos existentes no se sobrescribirán.'),

                    React.createElement('div', { style: { marginTop: '20px', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' } },
                        React.createElement('input', {
                            type: 'file',
                            accept: '.json',
                            id: 'import-file-input',
                            style: { display: 'none' },
                            onChange: (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                        setExportStatus("Importando...");
                                        try {
                                            const result = await DiscourseGraphToolkit.importGraph(event.target.result, (msg) => setExportStatus(msg));

                                            let statusMsg = `✅ Importación finalizada. Páginas: ${result.pages}. Saltados: ${result.skipped}.`;
                                            if (result.errors && result.errors.length > 0) {
                                                statusMsg += `\n❌ Errores (${result.errors.length}):\n` + result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? '\n...' : '');
                                                DiscourseGraphToolkit.showToast(`Importación con ${result.errors.length} errores.`, 'warning');
                                            } else {
                                                DiscourseGraphToolkit.showToast(`Importación exitosa: ${result.pages} páginas.`, 'success');
                                            }
                                            setExportStatus(statusMsg);

                                        } catch (err) {
                                            console.error(err);
                                            setExportStatus(`❌ Error fatal: ${err.message}`);
                                            DiscourseGraphToolkit.showToast("Error en importación.", "error");
                                        }
                                    };
                                    reader.readAsText(file);
                                }
                            }
                        }),
                        React.createElement('label', {
                            htmlFor: 'import-file-input',
                            style: {
                                display: 'inline-block', padding: '10px 20px', backgroundColor: '#2196F3', color: 'white',
                                borderRadius: '4px', cursor: 'pointer', fontSize: '16px'
                            }
                        }, 'Seleccionar Archivo JSON')
                    ),
                    exportStatus && React.createElement('div', { style: { marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontFamily: 'monospace' } }, exportStatus)
                ),

                activeTab === 'verificar' && React.createElement('div', null,
                    React.createElement('h3', { style: { marginTop: 0, marginBottom: '10px' } }, '🔍 Verificar Proyecto Asociado'),
                    React.createElement('p', { style: { color: '#666', marginBottom: '20px' } },
                        'Verifica que todos los nodos de una rama tengan la propiedad "Proyecto Asociado::".'),

                    // Selector de pregunta
                    React.createElement('div', { style: { marginBottom: '15px' } },
                        React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } },
                            'Selecciona una pregunta:'),
                        React.createElement('select', {
                            value: selectedQuestion ? selectedQuestion.pageUid : '',
                            onChange: (e) => {
                                const q = availableQuestions.find(q => q.pageUid === e.target.value);
                                setSelectedQuestion(q || null);
                                setVerificationResult(null);
                                setCoherenceResult(null);
                            },
                            style: { width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }
                        },
                            React.createElement('option', { value: '' }, '-- Seleccionar pregunta --'),
                            availableQuestions.map(q =>
                                React.createElement('option', { key: q.pageUid, value: q.pageUid },
                                    q.pageTitle.replace('[[QUE]] - ', '').substring(0, 100) + (q.pageTitle.length > 100 ? '...' : '')
                                )
                            )
                        )
                    ),

                    // Botones de acción
                    React.createElement('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } },
                        React.createElement('button', {
                            onClick: handleVerifyBranch,
                            disabled: isVerifying || !selectedQuestion,
                            style: {
                                padding: '10px 20px',
                                backgroundColor: selectedQuestion ? '#2196F3' : '#ccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: selectedQuestion ? 'pointer' : 'not-allowed',
                                fontSize: '14px'
                            }
                        }, isVerifying ? '⏳ Verificando...' : '🔍 Verificar Rama'),
                        React.createElement('button', {
                            onClick: handleLoadQuestions,
                            style: {
                                padding: '10px 20px',
                                backgroundColor: 'white',
                                color: '#666',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }
                        }, '🔄 Refrescar Preguntas')
                    ),

                    // Status
                    verifyStatus && React.createElement('div', {
                        style: {
                            marginBottom: '15px',
                            padding: '10px',
                            backgroundColor: verifyStatus.includes('✅') ? '#e8f5e9' :
                                verifyStatus.includes('⚠️') ? '#fff3e0' :
                                    verifyStatus.includes('❌') ? '#ffebee' : '#f5f5f5',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                        }
                    }, verifyStatus),

                    // Cabecera: Proyecto de la Rama (NUEVO)
                    coherenceResult && React.createElement('div', {
                        style: {
                            marginBottom: '15px',
                            padding: '12px 15px',
                            backgroundColor: coherenceResult.rootProject ? '#e3f2fd' : '#ffebee',
                            borderRadius: '4px',
                            border: coherenceResult.rootProject ? '1px solid #2196F3' : '1px solid #f44336',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }
                    },
                        React.createElement('div', null,
                            React.createElement('span', { style: { fontWeight: 'bold', marginRight: '10px' } }, '📁 Proyecto de la Rama:'),
                            React.createElement('span', {
                                style: {
                                    padding: '4px 10px',
                                    backgroundColor: coherenceResult.rootProject ? '#bbdefb' : '#ffcdd2',
                                    borderRadius: '4px',
                                    fontWeight: 'bold'
                                }
                            }, coherenceResult.rootProject || '❌ Sin proyecto')
                        ),
                        (coherenceResult.different.length > 0 || coherenceResult.missing.length > 0) && coherenceResult.rootProject &&
                        React.createElement('button', {
                            onClick: handlePropagateProject,
                            disabled: isPropagating,
                            style: {
                                padding: '8px 16px',
                                backgroundColor: isPropagating ? '#ccc' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isPropagating ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }
                        }, isPropagating ? '⏳ Propagando...' : `🔄 Propagar a ${coherenceResult.different.length + coherenceResult.missing.length} nodos`)
                    ),

                    // Problemas de Estructura (NUEVO)
                    structureResult && structureResult.structureIssues.length > 0 && React.createElement('div', {
                        style: {
                            marginBottom: '15px',
                            border: '2px solid #f44336',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }
                    },
                        React.createElement('div', {
                            style: {
                                padding: '10px',
                                backgroundColor: '#ffebee',
                                fontWeight: 'bold',
                                borderBottom: '1px solid #f44336',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }
                        },
                            React.createElement('span', null, `🔧 Problemas de Estructura (${structureResult.structureIssues.length})`),
                            React.createElement('span', {
                                style: {
                                    fontSize: '11px',
                                    color: '#c62828',
                                    fontWeight: 'normal'
                                }
                            }, '⚠️ Afecta la exportación')
                        ),
                        React.createElement('div', { style: { maxHeight: '200px', overflowY: 'auto' } },
                            structureResult.structureIssues.map((issue, idx) =>
                                React.createElement('div', {
                                    key: idx,
                                    style: {
                                        padding: '10px',
                                        borderBottom: '1px solid #eee',
                                        backgroundColor: 'white'
                                    }
                                },
                                    React.createElement('div', {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '8px'
                                        }
                                    },
                                        React.createElement('span', null,
                                            React.createElement('span', {
                                                style: {
                                                    display: 'inline-block',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    marginRight: '8px',
                                                    backgroundColor: '#e3f2fd',
                                                    color: '#1565c0'
                                                }
                                            }, issue.type),
                                            (issue.title || '').replace(/\[\[(QUE|CLM|EVD)\]\] - /, '').substring(0, 60) + ((issue.title || '').length > 60 ? '...' : '')
                                        ),
                                        React.createElement('button', {
                                            onClick: () => handleFixStructure(issue.uid),
                                            style: {
                                                padding: '4px 12px',
                                                backgroundColor: '#4CAF50',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                whiteSpace: 'nowrap'
                                            }
                                        }, '🔧 Corregir')
                                    ),
                                    issue.issues.map((problemText, pIdx) =>
                                        React.createElement('div', {
                                            key: pIdx,
                                            style: {
                                                fontSize: '12px',
                                                color: '#c62828',
                                                marginLeft: '10px',
                                                paddingLeft: '10px',
                                                borderLeft: '2px solid #ffcdd2'
                                            }
                                        }, `❌ ${problemText}`)
                                    )
                                )
                            )
                        )
                    ),

                    // Resultados basados en coherencia
                    coherenceResult && React.createElement('div', null,
                        // Nodos con proyecto diferente (⚠️ naranja)
                        coherenceResult.different.length > 0 && React.createElement('div', {
                            style: {
                                marginBottom: '15px',
                                border: '1px solid #ff9800',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    padding: '10px',
                                    backgroundColor: '#fff3e0',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid #ff9800'
                                }
                            }, `⚠️ Nodos con Proyecto Diferente (${coherenceResult.different.length})`),
                            React.createElement('div', { style: { maxHeight: '250px', overflowY: 'auto' } },
                                coherenceResult.different.map(node =>
                                    React.createElement('div', {
                                        key: node.uid,
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 10px',
                                            borderBottom: '1px solid #eee',
                                            backgroundColor: 'white'
                                        }
                                    },
                                        React.createElement('div', { style: { flex: 1 } },
                                            React.createElement('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '4px' } },
                                                React.createElement('span', {
                                                    style: {
                                                        display: 'inline-block',
                                                        padding: '2px 6px',
                                                        borderRadius: '3px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        marginRight: '8px',
                                                        backgroundColor: node.type === 'CLM' ? '#e8f5e9' : '#fff3e0',
                                                        color: node.type === 'CLM' ? '#2e7d32' : '#e65100'
                                                    }
                                                }, node.type),
                                                React.createElement('span', null, (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '').substring(0, 60))
                                            ),
                                            React.createElement('div', { style: { fontSize: '11px', color: '#666', marginLeft: '10px' } },
                                                `Tiene: `,
                                                React.createElement('span', { style: { color: '#e65100', fontWeight: 'bold' } }, node.project || '?'),
                                                ` → Debería: `,
                                                React.createElement('span', { style: { color: '#1565c0', fontWeight: 'bold' } }, coherenceResult.rootProject)
                                            )
                                        ),
                                        React.createElement('button', {
                                            onClick: () => handleNavigateToPage(node.uid),
                                            style: {
                                                padding: '4px 10px',
                                                backgroundColor: '#2196F3',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }
                                        }, '→ Ir')
                                    )
                                )
                            )
                        ),

                        // Nodos sin proyecto (❌ rojo)
                        coherenceResult.missing.length > 0 && React.createElement('div', {
                            style: {
                                marginBottom: '15px',
                                border: '1px solid #f44336',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    padding: '10px',
                                    backgroundColor: '#ffebee',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid #f44336'
                                }
                            }, `❌ Nodos sin Proyecto (${coherenceResult.missing.length})`),
                            React.createElement('div', { style: { maxHeight: '200px', overflowY: 'auto' } },
                                coherenceResult.missing.map(node =>
                                    React.createElement('div', {
                                        key: node.uid,
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 10px',
                                            borderBottom: '1px solid #eee',
                                            backgroundColor: 'white'
                                        }
                                    },
                                        React.createElement('span', { style: { flex: 1 } },
                                            React.createElement('span', {
                                                style: {
                                                    display: 'inline-block',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    marginRight: '8px',
                                                    backgroundColor: node.type === 'CLM' ? '#e8f5e9' : '#fff3e0',
                                                    color: node.type === 'CLM' ? '#2e7d32' : '#e65100'
                                                }
                                            }, node.type),
                                            (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '').substring(0, 60)
                                        ),
                                        React.createElement('button', {
                                            onClick: () => handleNavigateToPage(node.uid),
                                            style: {
                                                padding: '4px 10px',
                                                backgroundColor: '#2196F3',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }
                                        }, '→ Ir')
                                    )
                                )
                            )
                        ),

                        // Nodos coherentes (✅ verde) - colapsados
                        coherenceResult.coherent.length > 0 && React.createElement('div', {
                            style: {
                                border: '1px solid #4CAF50',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    padding: '10px',
                                    backgroundColor: '#e8f5e9',
                                    fontWeight: 'bold',
                                    borderBottom: '1px solid #4CAF50',
                                    cursor: 'pointer'
                                },
                                onClick: (e) => {
                                    const content = e.target.nextSibling;
                                    if (content) {
                                        content.style.display = content.style.display === 'none' ? 'block' : 'none';
                                    }
                                }
                            }, `✅ Nodos Coherentes (${coherenceResult.coherent.length}) - Click para expandir`),
                            React.createElement('div', { style: { maxHeight: '200px', overflowY: 'auto', display: 'none' } },
                                coherenceResult.coherent.map(node =>
                                    React.createElement('div', {
                                        key: node.uid,
                                        style: {
                                            padding: '6px 10px',
                                            borderBottom: '1px solid #eee',
                                            backgroundColor: 'white',
                                            fontSize: '13px',
                                            color: '#666'
                                        }
                                    },
                                        React.createElement('span', {
                                            style: {
                                                display: 'inline-block',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                marginRight: '8px',
                                                backgroundColor: node.type === 'CLM' ? '#e8f5e9' : '#fff3e0',
                                                color: node.type === 'CLM' ? '#2e7d32' : '#e65100'
                                            }
                                        }, node.type),
                                        (node.title || '').replace(/\[\[(CLM|EVD)\]\] - /, '').substring(0, 60)
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
    );
};

DiscourseGraphToolkit.openModal = function () {
    // Guardar el elemento activo actual para restaurarlo después
    const previousActiveElement = document.activeElement;

    // Cerrar modal anterior si existe
    const existing = document.getElementById('discourse-graph-toolkit-modal');
    if (existing) {
        ReactDOM.unmountComponentAtNode(existing);
        existing.remove();
    }

    const div = document.createElement('div');
    div.id = 'discourse-graph-toolkit-modal';
    document.body.appendChild(div);

    const close = () => {
        try {
            ReactDOM.unmountComponentAtNode(div);
            if (div.parentNode) div.parentNode.removeChild(div);

            // Restaurar foco (Estrategia Robusta)
            setTimeout(() => {
                if (previousActiveElement && document.body.contains(previousActiveElement)) {
                    previousActiveElement.focus();
                } else {
                    // Fallback: Intentar enfocar el área principal de Roam
                    const article = document.querySelector('.roam-article') ||
                        document.querySelector('.rm-article-wrapper') ||
                        document.querySelector('.roam-body-main');

                    if (article) {
                        article.focus();
                        // Simular click para reactivar listeners de Roam
                        article.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                        article.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                        article.click();
                    } else {
                        window.focus();
                    }
                }
            }, 100);
        } catch (e) {
            console.error("Error closing modal:", e);
        }
    };

    ReactDOM.render(React.createElement(this.ToolkitModal, { onClose: close }), div);
};




// --- MODULE: src/index.js ---
// ============================================================================
// 6. INICIALIZACIÓN
// ============================================================================

if (window.roamAlphaAPI) {
    // Run storage migration to graph-specific keys (one-time)
    DiscourseGraphToolkit.migrateStorageToGraphSpecific();

    // Inicializar sincronización con un pequeño retraso para asegurar que Roam esté listo
    setTimeout(() => {
        DiscourseGraphToolkit.initializeProjectsSync();
    }, 5000);

    // Cargar config desde Roam si existe
    setTimeout(() => {
        DiscourseGraphToolkit.loadConfigFromRoam().then(data => {
            if (data) console.log("Configuración cargada desde Roam.");
        });
    }, 5500);

    // Registrar Comandos
    // Lista de comandos registrados (para cleanup en recargas)
    DiscourseGraphToolkit._registeredCommands = [
        'Discourse Graph Toolkit: Abrir',
        'Discourse Graph: Crear Pregunta (QUE)',
        'Discourse Graph: Crear Afirmación (CLM)',
        'Discourse Graph: Crear Evidencia (EVD)'
    ];

    // Limpiar comandos previos si existen (para manejar recargas del script)
    DiscourseGraphToolkit._registeredCommands.forEach(label => {
        try {
            window.roamAlphaAPI.ui.commandPalette.removeCommand({ label });
        } catch (e) { /* Ignorar - el comando no existía */ }
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph Toolkit: Abrir',
        callback: () => DiscourseGraphToolkit.openModal()
    });


    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Pregunta (QUE)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("QUE"),
        "default-hotkey": "ctrl-shift-q"
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Afirmación (CLM)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("CLM"),
        "default-hotkey": "ctrl-shift-c"
    });

    window.roamAlphaAPI.ui.commandPalette.addCommand({
        label: 'Discourse Graph: Crear Evidencia (EVD)',
        callback: () => DiscourseGraphToolkit.convertBlockToNode("EVD"),
        "default-hotkey": "ctrl-shift-e"
    });

    console.log(`✅ Discourse Graph Toolkit v${DiscourseGraphToolkit.VERSION} cargado.`);
} else {
    console.error("Roam Alpha API no disponible.");
}


})();
